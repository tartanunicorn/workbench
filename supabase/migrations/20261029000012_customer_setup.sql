-- Setting customers up. Set up a registration type once, then register customers to it: each registration is a
-- customer's account for that type from a start date. Anything still to collect becomes an Onboarding task for the customer.

-- ---------- ids for new rows ----------
create sequence customer_seq; create sequence registration_seq; create sequence registration_type_seq;
select setval('customer_seq',          greatest(1, coalesce((select max(substring(customer_id from 2)::int) from customers where customer_id ~ '^C\d+$'), 0)));
select setval('registration_seq',      greatest(1, coalesce((select max(substring(registration_id from 5)::int) from registrations where registration_id ~ '^REG-\d+$'), 0)));
select setval('registration_type_seq', greatest(1, coalesce((select max(substring(registration_type_id from 4)::int) from registration_types where registration_type_id ~ '^RT-\d+$'), 0)));
alter table customers          alter column customer_id          set default 'C' || lpad(nextval('customer_seq')::text, 3, '0');
alter table registrations      alter column registration_id      set default 'REG-' || lpad(nextval('registration_seq')::text, 4, '0');
alter table registration_types alter column registration_type_id set default 'RT-' || lpad(nextval('registration_type_seq')::text, 3, '0');

-- ---------- onboarding tasks belong to a customer, not a run ----------
alter table tasks drop constraint tasks_kind_check;
alter table tasks add constraint tasks_kind_check check (kind in
  ('Run', 'Return', 'Return step', 'Issue', 'Onboarding', 'Pre-run check', 'Milestone', 'Chase', 'Notice response', 'Follow-up', 'Other'));
alter table tasks drop constraint tasks_check5;
alter table tasks add constraint tasks_check5 check (run_id is not null or (anchor is not null and "offset" is not null)
  or kind in ('Run', 'Return', 'Issue', 'Onboarding'));
alter table tasks add column registration_id text references registrations;
create index on tasks (customer_id);
create index on tasks (registration_id);

create or replace view task_board with (security_invoker = on) as
select t.task_id, t.title, t.kind, t.status, t.due_date, t.done_on, t.notes, t.run_id, t.template_id, t.anchor, t."offset",
  t.completes_stage, t.applies_to_tier, t.owner_role, t.return_filter, t.customer_id, t.notice_id,
  t.category, t.priority, t.description, t.raised_on, t.raised_by, t.waiting_on, t.resolution, t.source, t.source_ref,
  p.task_id as parent_id, p.kind as parent_kind, p.title as parent_title,
  coalesce(t.return_id, p.return_id) as return_id,
  coalesce(
    owner_of(null, t.task_id, 'Task owner'),
    case when t.owner_role = 'Preparer' and t.title ilike '%WARP%' then 'WARP' end,
    case when t.owner_role is not null then owner_of(coalesce(t.return_id, p.return_id), null, t.owner_role) end
  ) as owner_id,
  case
    when t.status in ('Done', 'Skipped') then t.status
    when t.due_date is null then 'No due date'
    when t.due_date < as_of() then 'Overdue'
    when t.due_date = as_of() then 'Due today'
    when t.due_date - as_of() <= 2 then 'Due soon'
    else 'Upcoming'
  end as due_flag,
  array(select b.from_task_id from task_relations b join tasks bt on bt.task_id = b.from_task_id
        where b.to_task_id = t.task_id and b.relation_type = 'Blocks' and b.deleted_at is null and bt.status not in ('Done', 'Skipped')) as blocked_by,
  t.registration_id
from tasks t
left join task_relations pr on pr.from_task_id = t.task_id and pr.relation_type = 'Subtask of' and pr.deleted_at is null
left join tasks p on p.task_id = pr.to_task_id
where t.deleted_at is null and (t.run_id is not null or t.kind in ('Issue', 'Onboarding'));

-- the task grid shows the customer for customer tasks, and onboarding tasks hang off their customer
create or replace view task_grid with (security_invoker = on) as
select tb.task_id, tb.title, tb.notes, tb.status, tb.due_date, tb.due_flag, tb.done_on, tb.run_id, tb.return_id, tb.kind,
  case tb.kind when 'Return step' then 'Return task' else tb.kind end as kind_label,
  tb.parent_id, coalesce(tb.parent_title, cu.name) as parent_title, tb.owner_id, o.name as owner_name, tb.owner_role,
  coalesce(array_to_string(tb.blocked_by, ', '), '') as blocked_by, cardinality(tb.blocked_by) > 0 as is_blocked,
  tb.completes_stage,
  tb.category, tb.priority, tb.description, tb.raised_on, tb.raised_by, tb.waiting_on, tb.resolution, tb.source_ref,
  tb.customer_id, cu.name as customer_name,
  coalesce((select string_agg(h.return_id, ', ' order by h.return_id) from task_relations x join tasks h on h.task_id = x.to_task_id
            where x.from_task_id = tb.task_id and x.relation_type = 'Affects' and x.deleted_at is null and h.return_id is not null), '') as affects,
  (select count(*) from task_relations x where x.from_task_id = tb.task_id and x.relation_type = 'Affects' and x.deleted_at is null)::int as returns_affected,
  tb.registration_id
from task_board tb
left join owners o on o.owner_id = tb.owner_id
left join customers cu on cu.customer_id = tb.customer_id;

-- ---------- register customers to a registration type ----------
-- p_rows: [{"customer_id": "C001", "account_ref": "****1234", "active_from": "2026-12-01"}, ...]
-- A customer already registered to the type over an overlapping period is skipped and named in the answer.
-- A registration without an account number gets an Onboarding task to collect it.
create function register_customers(p_type text, p_rows jsonb) returns jsonb language plpgsql set search_path = public as $$
declare
  r jsonb; v_from date; v_to date; v_reg text; v_type registration_types; v_cust customers;
  created jsonb := '[]'; skipped jsonb := '[]'; n_tasks int := 0;
begin
  select * into v_type from registration_types where registration_type_id = p_type and deleted_at is null;
  if v_type.registration_type_id is null then raise exception 'No registration type %', p_type; end if;

  for r in select * from jsonb_array_elements(p_rows) loop
    select * into v_cust from customers where customer_id = r->>'customer_id' and deleted_at is null;
    if v_cust.customer_id is null then
      skipped := skipped || jsonb_build_object('customer_id', r->>'customer_id', 'why', 'no such customer');
      continue;
    end if;
    v_from := coalesce(nullif(r->>'active_from', '')::date, date_trunc('month', as_of())::date);
    v_to := nullif(r->>'active_to', '')::date;
    if exists (select 1 from registrations g where g.customer_id = v_cust.customer_id and g.registration_type_id = p_type and g.deleted_at is null
               and daterange(g.active_from, g.active_to, '[]') && daterange(v_from, v_to, '[]')) then
      skipped := skipped || jsonb_build_object('customer_id', v_cust.customer_id, 'name', v_cust.name, 'why', 'already registered for these dates');
      continue;
    end if;

    insert into registrations (customer_id, registration_type_id, account_source, account_ref, active_from, active_to, frequency_source)
    values (v_cust.customer_id, p_type, nullif(r->>'account_source', ''), nullif(r->>'account_ref', ''), v_from, v_to, 'Setup')
    returning registration_id into v_reg;
    created := created || jsonb_build_object('registration_id', v_reg, 'customer_id', v_cust.customer_id, 'name', v_cust.name);

    if nullif(r->>'account_ref', '') is null then
      insert into tasks (title, kind, status, customer_id, registration_id, due_date, owner_role)
      values ('Collect portal login: ' || v_type.name, 'Onboarding', 'Not started', v_cust.customer_id, v_reg,
              greatest(as_of(), v_from - 7), null);
      n_tasks := n_tasks + 1;
    end if;
  end loop;
  return jsonb_build_object('created', created, 'skipped', skipped, 'tasks', n_tasks);
end $$;
grant execute on function register_customers(text, jsonb) to anon, authenticated;

-- end a registration (a customer stops filing, or moves to another frequency); its past returns keep what was true then
create function end_registration(p_registration text, p_last_day date) returns void language plpgsql set search_path = public as $$
begin
  update registrations set active_to = p_last_day where registration_id = p_registration and deleted_at is null and active_from <= p_last_day;
  if not found then raise exception 'Registration % does not start before %', p_registration, p_last_day; end if;
end $$;
grant execute on function end_registration(text, date) to anon, authenticated;

-- copy one registration type's tasks onto another, so a new type starts with a working template
create function copy_template(p_from text, p_to text) returns int language plpgsql set search_path = public as $$
declare n int;
begin
  insert into tasks (title, kind, registration_type_id, anchor, "offset", completes_stage, applies_to_tier, owner_role, status, notes)
  select title, kind, p_to, anchor, "offset", completes_stage, applies_to_tier, owner_role, 'Template', notes
  from tasks where registration_type_id = p_from and status = 'Template' and deleted_at is null
    and not exists (select 1 from tasks t2 where t2.registration_type_id = p_to and t2.status = 'Template' and t2.deleted_at is null and t2.title = tasks.title);
  get diagnostics n = row_count;
  return n;
end $$;
grant execute on function copy_template(text, text) to anon, authenticated;

-- ---------- the setup grids ----------
create view registration_type_grid with (security_invoker = on) as
select t.registration_type_id, t.name, t.country_code, t.region_code, coalesce(t.region_code, t.country_code) as place_code,
  t.tax_type, t.frequency, t.workflow, t.active, t.notes,
  type_rule(t.registration_type_id, 'due_rule', as_of()) as due_rule,
  type_rule(t.registration_type_id, 'due_value', as_of()) as due_value,
  type_rule(t.registration_type_id, 'automation', as_of()) as automation,
  pp.name as default_preparer, rv.name as default_reviewer,
  (select count(*) from registrations g where g.registration_type_id = t.registration_type_id and g.deleted_at is null
     and g.active_from <= as_of() and (g.active_to is null or g.active_to >= as_of()))::int as customers,
  (select count(*) from tasks k where k.registration_type_id = t.registration_type_id and k.status = 'Template' and k.deleted_at is null)::int as template_tasks
from registration_types t
left join owners pp on pp.owner_id = type_rule(t.registration_type_id, 'default_preparer', as_of())
left join owners rv on rv.owner_id = type_rule(t.registration_type_id, 'default_reviewer', as_of())
where t.deleted_at is null;

create view registration_grid with (security_invoker = on) as
select g.registration_id, g.customer_id, cu.name as customer_name, g.registration_type_id, t.name as type_name,
  coalesce(t.region_code, t.country_code) as place_code, t.tax_type, t.frequency,
  g.account_source, g.account_ref, g.active_from, g.active_to,
  (g.active_from <= as_of() and (g.active_to is null or g.active_to >= as_of())) as is_active,
  case when g.active_from > as_of() then 'Starts later' when g.active_to < as_of() then 'Ended' else 'Active' end as state,
  vb.name as verified_by, g.last_portal_check, g.notes,
  (select count(*) from tasks k where k.registration_id = g.registration_id and k.kind = 'Onboarding' and k.deleted_at is null and k.status not in ('Done', 'Skipped'))::int as setup_open
from registrations g
join customers cu on cu.customer_id = g.customer_id
join registration_types t on t.registration_type_id = g.registration_type_id
left join owners vb on vb.owner_id = g.verified_by
where g.deleted_at is null;

create view customer_grid with (security_invoker = on) as
select c.customer_id, c.name, c.org_id, c.tier, c.status, c.internal_review, c.historical_scope, c.notes,
  ro.name as release_owner, ca.name as customer_approver,
  (select count(*) from registrations g where g.customer_id = c.customer_id and g.deleted_at is null
     and g.active_from <= as_of() and (g.active_to is null or g.active_to >= as_of()))::int as registrations,
  (select count(*) from tasks k where k.customer_id = c.customer_id and k.kind = 'Onboarding' and k.deleted_at is null and k.status not in ('Done', 'Skipped'))::int as setup_open,
  (select count(*) from tasks k where k.customer_id = c.customer_id and k.kind = 'Issue' and k.deleted_at is null and k.status not in ('Done', 'Skipped'))::int as open_issues
from customers c
left join owners ro on ro.owner_id = c.release_owner
left join owners ca on ca.owner_id = c.customer_approver
where c.deleted_at is null;
