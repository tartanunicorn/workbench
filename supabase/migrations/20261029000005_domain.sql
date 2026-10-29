-- The filing run's logic lives here, so the app, scripts and MCP tools all get the same answers.
-- Calendar, return type rules at a date, the return and task boards, kick-off, and stage following the checklist.

-- ---------- ids: new rows get the next readable id ----------
create sequence return_seq; create sequence task_seq; create sequence relation_seq; create sequence event_seq; create sequence issue_seq; create sequence rule_seq;
select setval('return_seq',   greatest(1, coalesce((select max(substring(return_id from 5)::int) from returns), 0)));
select setval('task_seq',     greatest(1, coalesce((select max(substring(task_id from 5)::int) from tasks), 0)));
select setval('relation_seq', greatest(1, coalesce((select max(substring(relation_id from 5)::int) from task_relations), 0)));
select setval('event_seq',    greatest(1, coalesce((select max(substring(event_id from 4)::int) from return_events), 0)));
select setval('issue_seq',    greatest(1, coalesce((select max(substring(issue_id from 5)::int) from issues), 0)));
select setval('rule_seq',     greatest(1, coalesce((select max(substring(rule_id from 5)::int) from return_type_rules), 0)));
alter table returns           alter column return_id   set default 'RET-' || lpad(nextval('return_seq')::text, 4, '0');
alter table tasks             alter column task_id     set default 'TSK-' || lpad(nextval('task_seq')::text, 5, '0');
alter table task_relations    alter column relation_id set default 'REL-' || lpad(nextval('relation_seq')::text, 6, '0');
alter table return_events     alter column event_id    set default 'EV-'  || lpad(nextval('event_seq')::text, 5, '0');
alter table issues            alter column issue_id    set default 'ISS-' || lpad(nextval('issue_seq')::text, 3, '0');
alter table return_type_rules alter column rule_id     set default 'RTR-' || lpad(nextval('rule_seq')::text, 5, '0');

-- ---------- settings and calendar ----------
create function setting(p_key text) returns text language sql stable set search_path = public as $$
  select nullif(value, '') from settings where key = p_key and deleted_at is null
$$;

-- "Today" for the run: the as_of_date setting when set (demo), otherwise the real date
create function as_of() returns date language sql stable set search_path = public as $$
  select coalesce(setting('as_of_date')::date, current_date)
$$;

create function is_business_day(d date) returns boolean language sql stable set search_path = public as $$
  select extract(isodow from d) < 6 and not exists (select 1 from holidays h where h.date = d and h.deleted_at is null)
$$;

-- BDn of a month: n > 0 counts forward from the 1st; n <= 0 counts back from the day before (BD0 = last business day before the month)
create function business_day(p_month date, p_n int) returns date language plpgsql stable set search_path = public as $$
declare d date; c int := 0;
begin
  if p_n > 0 then
    d := date_trunc('month', p_month)::date;
    loop if is_business_day(d) then c := c + 1; if c = p_n then return d; end if; end if; d := d + 1; end loop;
  else
    d := date_trunc('month', p_month)::date - 1;
    loop if is_business_day(d) then c := c + 1; if c = 1 - p_n then return d; end if; end if; d := d - 1; end loop;
  end if;
end $$;

create function business_days_between(a date, b date) returns int language sql stable set search_path = public as $$
  select count(*)::int from generate_series(a, b, interval '1 day') g(d) where is_business_day(g.d::date)
$$;

-- A task template's due date in a run: BD or CD of the run month; DUE counts from the return's submit due
create function anchor_date(p_anchor text, p_offset int, p_run_month date, p_submit_due date default null) returns date
language sql stable set search_path = public as $$
  select case p_anchor
    when 'CD'  then make_date(extract(year from p_run_month)::int, extract(month from p_run_month)::int, p_offset)
    when 'BD'  then business_day(p_run_month, p_offset)
    when 'DUE' then p_submit_due + p_offset
  end
$$;

-- ---------- return type rules at a date: the latest row on or before it, field by field ----------
create function type_rule(p_type text, p_field text, p_on date) returns text language sql stable set search_path = public as $$
  select value from return_type_rules
  where return_type_id = p_type and field = p_field and valid_from <= p_on and deleted_at is null
  order by valid_from desc limit 1
$$;

create function statutory_due_for(p_type text, p_run_month date, p_period_end date) returns date language sql stable set search_path = public as $$
  select case
    when type_rule(p_type, 'due_value', p_period_end) is null then null
    when type_rule(p_type, 'due_rule', p_period_end) = 'Days after period end' then p_period_end + type_rule(p_type, 'due_value', p_period_end)::int
    else make_date(extract(year from p_run_month)::int, extract(month from p_run_month)::int, type_rule(p_type, 'due_value', p_period_end)::int)
  end
$$;

-- The owner in a role on a return or task, as of today
create function owner_of(p_return text, p_task text, p_role text) returns text language sql stable set search_path = public as $$
  select owner_id from ownerships o
  where o.role = p_role and o.deleted_at is null
    and ((p_return is not null and o.return_id = p_return) or (p_task is not null and o.task_id = p_task))
    and (o.from_date is null or o.from_date <= as_of()) and (o.to_date is null or o.to_date >= as_of())
  order by o.from_date desc nulls last limit 1
$$;

-- ---------- runs: the calendar of each run ----------
create view run_calendar with (security_invoker = on) as
select r.run_id, r.run_month, r.period_start, r.period_end, r.status,
  as_of() as as_of,
  business_day(r.run_month, 1) as bd1,
  business_day(r.run_month, coalesce(setting('release_business_day')::int, 5)) as release_by,
  make_date(extract(year from r.run_month)::int, extract(month from r.run_month)::int, coalesce(setting('submit_calendar_day')::int, 19)) as submit_by,
  least(6, 1 + case when as_of() > r.run_month then business_days_between(r.run_month, as_of() - 1) else 0 end) as expected_stage
from runs r where r.deleted_at is null;

-- (the return board is defined with the rules, in the next migration)

-- ---------- the task board: every task with its parent, return, owner and due flag ----------
create view task_board with (security_invoker = on) as
select t.task_id, t.title, t.kind, t.status, t.due_date, t.done_on, t.notes, t.run_id, t.template_id, t.anchor, t."offset",
  t.completes_stage, t.applies_to_tier, t.owner_role, t.return_filter, t.issue_id, t.customer_id, t.notice_id,
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
        where b.to_task_id = t.task_id and b.relation_type = 'Blocks' and b.deleted_at is null and bt.status not in ('Done', 'Skipped')) as blocked_by
from tasks t
left join task_relations pr on pr.from_task_id = t.task_id and pr.relation_type = 'Subtask of' and pr.deleted_at is null
left join tasks p on p.task_id = pr.to_task_id
where t.deleted_at is null and t.run_id is not null;

-- ---------- stage follows the checklist ----------
-- A return's stage is the furthest completes_stage whose steps are all done or skipped. Ticking a step moves it, logs an event,
-- and stamps released, approved and submitted dates.
create function stage_from_steps() returns trigger language plpgsql set search_path = public as $$
declare v_head text; v_return text; v_stage int; v_new text; r returns;
begin
  select p.task_id, p.return_id into v_head, v_return from task_relations x join tasks p on p.task_id = x.to_task_id
  where x.from_task_id = new.task_id and x.relation_type = 'Subtask of' and x.deleted_at is null and p.kind = 'Return';
  if v_return is null then return new; end if;

  with g as (
    select t.completes_stage as k, bool_and(t.status in ('Done', 'Skipped')) as done
    from task_relations x join tasks t on t.task_id = x.from_task_id
    where x.to_task_id = v_head and x.relation_type = 'Subtask of' and x.deleted_at is null and t.deleted_at is null and t.completes_stage is not null
    group by t.completes_stage
  ), o as (select k, bool_and(done) over (order by k) as all_done from g)
  select coalesce(max(k) filter (where all_done), 1) into v_stage from o;

  select * into r from returns where return_id = v_return;
  v_new := (array['1 Not started','2 Data synced','3 Generated','4 In review','5 Ready to release','6 Released','7 Customer approved','8 Submitted','9 Confirmed / paid'])[greatest(v_stage, 1)];
  if v_new is distinct from r.stage then
    insert into return_events (return_id, at, from_stage, to_stage, from_state, to_state, actor, source, note)
    values (v_return, now(), r.stage, v_new, r.state, case when v_stage = 9 and r.state = 'Open' then 'Done' else r.state end,
            null, 'Person', 'Checklist: ' || new.title);
    update returns set stage = v_new,
      released_on  = case when v_stage >= 6 then coalesce(released_on, as_of()) else released_on end,
      approved_on  = case when v_stage >= 7 then coalesce(approved_on, as_of()) else approved_on end,
      submitted_on = case when v_stage >= 8 then coalesce(submitted_on, as_of()) else submitted_on end,
      state = case when v_stage = 9 and state = 'Open' then 'Done' else state end
    where return_id = v_return;
  end if;
  return new;
end $$;

create trigger tasks_stage_from_steps after update of status on tasks
for each row when (new.kind = 'Return step' and old.status is distinct from new.status)
execute function stage_from_steps();

-- done_on follows status
create function task_done_on() returns trigger language plpgsql set search_path = public as $$
begin
  if new.status = 'Done' and old.status is distinct from 'Done' then new.done_on := coalesce(new.done_on, as_of()); end if;
  if new.status <> 'Done' then new.done_on := null; end if;
  return new;
end $$;
create trigger tasks_done_on before update of status on tasks for each row execute function task_done_on();

-- ---------- kick-off ----------
-- The periods a frequency files for when the run covers period month p_month
create function periods_for(p_frequency text, p_month date) returns table (period_start date, period_end date)
language sql immutable as $$
  with m as (select date_trunc('month', p_month)::date as s, (date_trunc('month', p_month) + interval '1 month - 1 day')::date as e,
                    extract(month from p_month)::int as mo)
  select ps, pe from m, lateral (
    select m.s, (m.s + 14) where p_frequency = 'Semi-monthly'
    union all select m.s + 15, m.e where p_frequency = 'Semi-monthly'
    union all select (d::date - 6), d::date from generate_series(m.s, m.e, interval '1 day') d where p_frequency = 'Weekly' and extract(isodow from d) = 6
    union all select (m.s - interval '2 months')::date, m.e where p_frequency = 'Quarterly' and m.mo % 3 = 0
    union all select (m.s - interval '5 months')::date, m.e where p_frequency = 'Semi-annual' and m.mo % 6 = 0
    union all select make_date(extract(year from m.s)::int, 1, 1), m.e where p_frequency = 'Annual' and m.mo = 12
    union all select m.s, m.e where p_frequency in ('Monthly', 'Part-quarterly')
  ) x(ps, pe)
$$;

-- What kicking off the next run would create, without creating it
create function next_run_preview() returns jsonb language plpgsql stable set search_path = public as $$
declare v_last date; v_rm date; v_pm date; v_n int;
begin
  select max(run_month) into v_last from runs where deleted_at is null;
  v_rm := (v_last + interval '1 month')::date; v_pm := (v_rm - interval '1 month')::date;
  select count(*) into v_n
  from registrations g join return_types t on t.return_type_id = g.return_type_id and t.active and t.deleted_at is null
  cross join lateral periods_for(t.frequency, v_pm) p
  where g.deleted_at is null and g.active_from <= p.period_end and (g.active_to is null or g.active_to >= p.period_start)
    and not exists (select 1 from returns r where r.registration_id = g.registration_id and r.period_start = p.period_start and r.kind = 'Regular');
  return jsonb_build_object('run_id', 'RUN-' || to_char(v_rm, 'YYYY-MM'), 'run_month', v_rm, 'returns', v_n,
                            'exists', exists (select 1 from runs where run_id = 'RUN-' || to_char(v_rm, 'YYYY-MM')));
end $$;

-- Creates the next run: the run, its header task and run tasks, then for every registration with a period ending that month
-- a return with its owners, header task and dated checklist. Rules are read at each period end.
create function kick_off_next_run() returns jsonb language plpgsql set search_path = public as $$
declare
  v_last runs; v_rm date; v_pm date; v_run text; v_head text; v_id text; v_ret text; v_rhead text;
  v_cd19 date; v_stat date; v_sub date; v_today date := as_of();
  n_ret int := 0; n_steps int := 0; n_tasks int := 0;
  tp record; g record; p record; tt return_types; cu customers;
begin
  select * into v_last from runs where deleted_at is null order by run_month desc limit 1;
  v_rm := (v_last.run_month + interval '1 month')::date; v_pm := (v_rm - interval '1 month')::date;
  v_run := 'RUN-' || to_char(v_rm, 'YYYY-MM');
  if exists (select 1 from runs where run_id = v_run) then raise exception 'Run % already exists', v_run; end if;
  v_cd19 := make_date(extract(year from v_rm)::int, extract(month from v_rm)::int, coalesce(setting('submit_calendar_day')::int, 19));

  insert into runs (run_id, run_month, period_start, period_end, status, notes) values (v_run, v_rm, v_pm, v_rm - 1, 'Open', 'Kicked off');
  insert into ownerships (owner_id, role, run_id, from_date)
    select owner_id, 'Run owner', v_run, v_today from ownerships where run_id = v_last.run_id and role = 'Run owner' and deleted_at is null limit 1;
  insert into tasks (title, kind, run_id, status, notes) values (to_char(v_rm, 'Mon YYYY') || ' filing run', 'Run', v_run, null, 'Header: status and dates follow the Runs row')
    returning task_id into v_head;

  for tp in select * from tasks where run_id is null and return_type_id is null and status = 'Template' and deleted_at is null order by task_id loop
    insert into tasks (title, kind, return_filter, run_id, template_id, anchor, "offset", due_date, status)
      values (tp.title, tp.kind, tp.return_filter, v_run, tp.task_id, tp.anchor, tp."offset", anchor_date(tp.anchor, tp."offset", v_rm), 'Not started')
      returning task_id into v_id;
    insert into task_relations (from_task_id, to_task_id, relation_type) values (v_id, v_head, 'Subtask of');
    insert into ownerships (owner_id, role, task_id, from_date)
      select owner_id, 'Task owner', v_id, v_today from ownerships where task_id = tp.task_id and role = 'Task owner' and deleted_at is null limit 1;
    n_tasks := n_tasks + 1;
  end loop;

  for g in select r.* from registrations r join return_types t on t.return_type_id = r.return_type_id and t.active and t.deleted_at is null
           where r.deleted_at is null order by r.registration_id loop
    select * into tt from return_types where return_type_id = g.return_type_id;
    select * into cu from customers where customer_id = g.customer_id;
    for p in select * from periods_for(tt.frequency, v_pm) loop
      continue when g.active_from > p.period_end or (g.active_to is not null and g.active_to < p.period_start);
      continue when exists (select 1 from returns r where r.registration_id = g.registration_id and r.period_start = p.period_start and r.kind = 'Regular');
      v_stat := statutory_due_for(g.return_type_id, v_rm, p.period_end);
      v_sub := coalesce(least(v_stat, v_cd19), v_cd19);
      insert into returns (registration_id, run_id, period_start, period_end, kind, stage, state, statutory_due)
        values (g.registration_id, v_run, p.period_start, p.period_end, 'Regular', '1 Not started', 'Open', v_stat)
        returning return_id into v_ret;
      insert into ownerships (owner_id, role, return_id, from_date)
        select o, r, v_ret, v_today from (values
          (type_rule(g.return_type_id, 'default_preparer', p.period_end), 'Preparer'),
          (type_rule(g.return_type_id, 'default_reviewer', p.period_end), 'Reviewer'),
          (cu.release_owner, 'Release owner'),
          (cu.customer_approver, 'Customer approver')) v(o, r)
        where o is not null;
      insert into tasks (title, kind, run_id, return_id, status, notes)
        values (tt.name || ' · ' || to_char(p.period_end, 'Mon YYYY'), 'Return', v_run, v_ret, null, 'Header: status and dates follow the Returns row')
        returning task_id into v_rhead;
      insert into task_relations (from_task_id, to_task_id, relation_type) values (v_rhead, v_head, 'Subtask of');
      for tp in select * from tasks where return_type_id = g.return_type_id and run_id is null and deleted_at is null order by completes_stage, task_id loop
        insert into tasks (title, kind, run_id, template_id, anchor, "offset", completes_stage, applies_to_tier, owner_role, due_date, status)
          values (tp.title, 'Return step', v_run, tp.task_id, tp.anchor, tp."offset", tp.completes_stage, tp.applies_to_tier, tp.owner_role,
                  anchor_date(tp.anchor, tp."offset", v_rm, v_sub), 'Not started')
          returning task_id into v_id;
        insert into task_relations (from_task_id, to_task_id, relation_type) values (v_id, v_rhead, 'Subtask of');
        n_steps := n_steps + 1;
      end loop;
      n_ret := n_ret + 1;
    end loop;
  end loop;

  return jsonb_build_object('run_id', v_run, 'returns', n_ret, 'steps', n_steps, 'run_tasks', n_tasks);
end $$;

grant execute on function kick_off_next_run(), next_run_preview() to anon, authenticated;
