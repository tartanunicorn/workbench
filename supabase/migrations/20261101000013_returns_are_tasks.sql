-- Returns become tasks. A return was a row in returns plus a header task of kind Return; now the task is the return.
-- The filing's own fields (period, return kind, stage, amounts, milestone dates) live in tasks.details, checked
-- against the fields its kind declares in task_kinds. registration_id stays a real column, as the filing's key.
-- A new kind of operation is a row in task_kinds, not a new table.

-- 1. Kinds of task as data, with the fields each one keeps in details

create table task_kinds (
  kind       text primary key,
  label      text not null,
  fields     jsonb not null default '{}',
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create trigger task_kinds_touch before update on task_kinds for each row execute function touch_updated_at();
alter table task_kinds enable row level security;
create policy task_kinds_open_demo on task_kinds to anon, authenticated using (true) with check (true);
create policy task_kinds_members on task_kinds to authenticated using (private.is_member()) with check (private.is_member());

insert into task_kinds (kind, label, fields, notes) values
  ('Run', 'Run', '{}', 'A month''s filing run. Its dates follow the runs row'),
  ('Return', 'Return', '{
     "return_ref":      {"type": "text", "label": "Old return ID"},
     "period_start":    {"type": "date", "label": "Period start", "required": true},
     "period_end":      {"type": "date", "label": "Period end", "required": true},
     "return_kind":     {"type": "text", "label": "Return kind", "required": true, "values": ["Regular", "Historical", "Amendment", "Prepayment"]},
     "stage":           {"type": "text", "label": "Stage", "required": true, "values": ["1 Not started", "2 Data synced", "3 Generated", "4 In review", "5 Ready to release", "6 Released", "7 Customer approved", "8 Submitted", "9 Confirmed / paid"]},
     "state":           {"type": "text", "label": "Status", "required": true, "values": ["Open", "Blocked", "On hold", "Done", "Not required"]},
     "calculated":      {"type": "number", "label": "Calculated"},
     "collected":       {"type": "number", "label": "Collected"},
     "due":             {"type": "number", "label": "Amount due"},
     "statutory_due":   {"type": "date", "label": "Authority due"},
     "released_on":     {"type": "date", "label": "Released"},
     "approved_on":     {"type": "date", "label": "Customer approved"},
     "submitted_on":    {"type": "date", "label": "Submitted"},
     "confirmation_no": {"type": "text", "label": "Confirmation number"},
     "reason":          {"type": "text", "label": "Why on hold or not required"}
   }', 'One filing for one registration and period. Its tasks hang off it'),
  ('Return step', 'Return task', '{}', 'A task that completes a return, from its registration type''s template'),
  ('Issue', 'Issue', '{}', 'A problem that blocks returns or puts them at risk'),
  ('Onboarding', 'Onboarding', '{}', 'Setting up a customer''s registration'),
  ('Pre-run check', 'Pre-run check', '{}', null),
  ('Milestone', 'Milestone', '{}', null),
  ('Chase', 'Chase', '{}', null),
  ('Notice response', 'Notice response', '{}', null),
  ('Follow-up', 'Follow-up', '{}', null),
  ('Other', 'Other', '{}', null);

alter table tasks add column details jsonb not null default '{}';
alter table tasks drop constraint tasks_kind_check;
alter table tasks add constraint tasks_kind_fkey foreign key (kind) references task_kinds (kind);

-- Every key in details must be a field of the task's kind, of the right type; required fields must be there
create function check_task_details() returns trigger language plpgsql set search_path = public as $$
declare spec jsonb; k text; v jsonb; f jsonb;
begin
  select fields into spec from task_kinds where kind = new.kind;
  if spec is null then return new; end if;
  for k, v in select * from jsonb_each(new.details) loop
    f := spec -> k;
    if f is null then raise exception 'A % task has no field "%"', new.kind, k; end if;
    if jsonb_typeof(v) = 'null' then raise exception 'Leave field "%" out rather than setting it to null', k; end if;
    case f ->> 'type'
      when 'text' then
        if jsonb_typeof(v) <> 'string' then raise exception 'Field "%" must be text', k; end if;
      when 'number' then
        if jsonb_typeof(v) <> 'number' then raise exception 'Field "%" must be a number', k; end if;
      when 'boolean' then
        if jsonb_typeof(v) <> 'boolean' then raise exception 'Field "%" must be true or false', k; end if;
      when 'date' then
        if jsonb_typeof(v) <> 'string' or v #>> '{}' !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Field "%" must be a date like 2026-11-30', k; end if;
        perform (v #>> '{}')::date;
      else raise exception 'Task kind % gives field "%" an unknown type', new.kind, k;
    end case;
    if f ? 'values' and not (f -> 'values') @> jsonb_build_array(v) then
      raise exception 'Field "%" must be one of %', k, f -> 'values';
    end if;
  end loop;
  for k in select key from jsonb_each(spec) where (value ->> 'required')::boolean loop
    if not new.details ? k then raise exception 'A % task needs field "%"', new.kind, k; end if;
  end loop;
  return new;
end $$;

-- 2. Take down what reads the returns table

drop view run_summary, return_grid, return_board, rule_summary, return_rules, task_summary, task_grid, task_board;
drop trigger returns_reevaluate on returns;
drop function returns_reevaluate();
drop function owner_of(text, text, text);

-- 3. Move each return onto its header task, and repoint everything that hung off the return

update tasks h set
  registration_id = r.registration_id,
  notes = r.notes,
  details = jsonb_strip_nulls(jsonb_build_object(
    'return_ref', r.return_id, 'period_start', r.period_start, 'period_end', r.period_end, 'return_kind', r.kind,
    'stage', r.stage, 'state', r.state, 'calculated', r.calculated, 'collected', r.collected, 'due', r.due,
    'statutory_due', r.statutory_due, 'released_on', r.released_on, 'approved_on', r.approved_on,
    'submitted_on', r.submitted_on, 'confirmation_no', r.confirmation_no, 'reason', r.reason))
from returns r
where h.return_id = r.return_id and h.kind = 'Return';

-- rule results belong to the return's task
alter table rule_results add column task_id text references tasks (task_id);
update rule_results rr set task_id = h.task_id from tasks h where h.return_id = rr.return_id and h.kind = 'Return';
alter table rule_results drop constraint rule_results_pkey;
alter table rule_results drop column return_id;
alter table rule_results alter column task_id set not null;
alter table rule_results add primary key (task_id, rule_id);

-- a return's owners (preparer, reviewer, ...) are owners of its task
update ownerships o set task_id = h.task_id, return_id = null from tasks h where h.return_id = o.return_id and h.kind = 'Return';
alter table ownerships drop constraint ownerships_check;
alter table ownerships drop column return_id;
alter table ownerships add constraint ownerships_check check (num_nonnulls(run_id, task_id) = 1);

-- a return's stage history is its task's history
alter table return_events rename to task_events;
alter table task_events rename constraint return_events_pkey to task_events_pkey;
alter table task_events rename constraint return_events_actor_fkey to task_events_actor_fkey;
alter table task_events rename constraint return_events_source_check to task_events_source_check;
alter trigger return_events_touch on task_events rename to task_events_touch;
alter policy return_events_open_demo on task_events rename to task_events_open_demo;
alter policy return_events_members on task_events rename to task_events_members;
alter table task_events add column task_id text references tasks (task_id);
update task_events e set task_id = h.task_id from tasks h where h.return_id = e.return_id and h.kind = 'Return';
alter table task_events drop column return_id;
alter table task_events alter column task_id set not null;
create index task_events_task_id_idx on task_events (task_id);

-- the task no longer points at a return: it is one
drop index tasks_one_header_per_return;
alter table tasks drop constraint tasks_check, drop constraint tasks_check1, drop constraint tasks_check2;
alter table tasks drop column return_id;
drop table returns;
drop sequence return_seq;

alter table tasks add constraint tasks_check check (num_nonnulls(customer_id, notice_id) <= 1);
alter table tasks add constraint tasks_return_check check (kind <> 'Return' or (run_id is not null and registration_id is not null));
alter table tasks add constraint tasks_return_period_check check (kind <> 'Return' or (details ->> 'period_end')::date >= (details ->> 'period_start')::date);
alter table tasks add constraint tasks_return_reason_check check (kind <> 'Return' or details ->> 'state' not in ('On hold', 'Not required') or details ? 'reason');
create unique index tasks_one_return_per_period on tasks (registration_id, (details ->> 'period_start'), (details ->> 'return_kind'))
  where kind = 'Return' and deleted_at is null;

create trigger tasks_check_details before insert or update of kind, details on tasks for each row execute function check_task_details();
-- the moved returns must already fit their kind
update tasks set details = details where kind = 'Return';

-- 4. The logic, reading the Return task

create function owner_of(p_task text, p_role text) returns text language sql stable set search_path = public as $$
  select owner_id from ownerships o
  where o.task_id = p_task and o.role = p_role and o.deleted_at is null
    and (o.from_date is null or o.from_date <= as_of()) and (o.to_date is null or o.to_date >= as_of())
  order by o.from_date desc nulls last limit 1
$$;

create or replace function open_issues(p_return text) returns integer language sql stable set search_path = public as $$
  select count(*)::int
  from task_relations x
  join tasks i on i.task_id = x.from_task_id
  where x.to_task_id = p_return and x.relation_type = 'Affects' and x.deleted_at is null
    and i.kind = 'Issue' and i.deleted_at is null and i.status not in ('Done', 'Skipped')
$$;

create or replace function return_facts(p_return text) returns jsonb language sql stable set search_path = public as $$
  select jsonb_build_object(
    'kind', r.details ->> 'return_kind',
    'calculated', (r.details ->> 'calculated')::numeric,
    'collected', (r.details ->> 'collected')::numeric,
    'gap_abs', abs((r.details ->> 'collected')::numeric - (r.details ->> 'calculated')::numeric),
    'gap_pct', case when (r.details ->> 'calculated')::numeric <> 0
                    then round(abs((r.details ->> 'collected')::numeric - (r.details ->> 'calculated')::numeric) / abs((r.details ->> 'calculated')::numeric), 4) end,
    'days_registered', (r.details ->> 'period_end')::date - g.active_from,
    'workflow', t.workflow,
    'tax_type', t.tax_type,
    'frequency', t.frequency,
    'place', coalesce(t.region_code, t.country_code),
    'internal_review', cu.internal_review,
    'customer_status', cu.status,
    'open_issues', open_issues(r.task_id),
    'stage', split_part(r.details ->> 'stage', ' ', 1)::int,
    'state', r.details ->> 'state')
  from tasks r
  join registrations g on g.registration_id = r.registration_id
  join registration_types t on t.registration_type_id = g.registration_type_id
  join customers cu on cu.customer_id = g.customer_id
  where r.task_id = p_return and r.kind = 'Return'
$$;

create or replace function evaluate_return(p_return text) returns void language plpgsql set search_path = public as $$
declare f jsonb; rl record; ev record; v_type text; st record; v_in text; v_out text; v_note text;
begin
  if exists (select 1 from rule_results where task_id = p_return and pinned) then return; end if;
  f := return_facts(p_return);
  select g.registration_type_id into v_type from tasks r join registrations g on g.registration_id = r.registration_id where r.task_id = p_return;

  for rl in select * from rules where kind <> 'Condition' and active and deleted_at is null and (registration_type_id is null or registration_type_id = v_type) loop
    select * into ev from eval_expr(jsonb_build_object('condition', rl.condition_id), f);
    insert into rule_results (task_id, rule_id, result, evidence, evaluated_at)
      values (p_return, rl.rule_id, ev.result, ev.evidence, now())
      on conflict (task_id, rule_id) do update set result = excluded.result, evidence = excluded.evidence, evaluated_at = excluded.evaluated_at;
  end loop;
  -- results of rules since retired stay as history; everything that reads results only counts live rules
  for st in select t.* from task_relations x join tasks t on t.task_id = x.from_task_id
            where x.to_task_id = p_return and x.relation_type = 'Subtask of' and x.deleted_at is null and t.status in ('Not started', 'Skipped') loop
    -- the strongest result among rules for this step: Leave out met wins; then Include not met; can't tell keeps it in
    select string_agg(ru.name, '; ') filter (where rr.result = 'met' and ru.kind = 'Leave out step'),
           string_agg(ru.name, '; ') filter (where rr.result = 'not met' and ru.kind = 'Include step')
      into v_out, v_in
    from rule_results rr join rules ru on ru.rule_id = rr.rule_id
    where rr.task_id = p_return and ru.kind in ('Include step', 'Leave out step') and ru.step_title = st.title
      and (rr.pinned or (ru.active and ru.deleted_at is null));
    if v_out is not null or v_in is not null then
      v_note := 'Left out by rule: ' || coalesce(v_out, v_in);
      if st.status <> 'Skipped' or st.notes is distinct from v_note then update tasks set status = 'Skipped', notes = v_note where task_id = st.task_id; end if;
    elsif st.status = 'Skipped' and st.notes like 'Left out by rule:%' then
      update tasks set status = 'Not started', notes = null where task_id = st.task_id;
    end if;
  end loop;
end $$;

create or replace function evaluate_run(p_run text) returns integer language plpgsql set search_path = public as $$
declare r record; n int := 0;
begin
  for r in select task_id from tasks where run_id = p_run and kind = 'Return' and deleted_at is null loop perform evaluate_return(r.task_id); n := n + 1; end loop;
  return n;
end $$;

-- When a return's amounts, kind, stage or status change: released returns keep their results, others are checked again
create function return_reevaluate() returns trigger language plpgsql set search_path = public as $$
begin
  if split_part(new.details ->> 'stage', ' ', 1)::int >= 6 then
    update rule_results set pinned = true where task_id = new.task_id and not pinned;
  else
    perform evaluate_return(new.task_id);
  end if;
  return new;
end $$;
create trigger tasks_return_reevaluate after update of details on tasks for each row
  when (new.kind = 'Return' and (
    old.details -> 'calculated' is distinct from new.details -> 'calculated' or old.details -> 'collected' is distinct from new.details -> 'collected'
    or old.details -> 'return_kind' is distinct from new.details -> 'return_kind' or old.details -> 'stage' is distinct from new.details -> 'stage'
    or old.details -> 'state' is distinct from new.details -> 'state'))
  execute function return_reevaluate();

create or replace function affects_reevaluate() returns trigger language plpgsql set search_path = public as $$
begin
  if new.relation_type = 'Affects' and exists (select 1 from tasks where task_id = new.to_task_id and kind = 'Return') then
    perform evaluate_return(new.to_task_id);
  end if;
  return null;
end $$;

create or replace function issue_task_reevaluate() returns trigger language plpgsql set search_path = public as $$
declare rn record;
begin
  if new.kind = 'Issue' then
    for rn in select distinct h.task_id from task_relations x join tasks h on h.task_id = x.to_task_id
              where x.from_task_id = new.task_id and x.relation_type = 'Affects' and h.kind = 'Return' loop
      perform evaluate_return(rn.task_id);
    end loop;
  end if;
  return null;
end $$;

-- A return's stage follows its finished tasks, and its milestone dates are set as it passes them
create or replace function stage_from_steps() returns trigger language plpgsql set search_path = public as $$
declare v_return text; v_stage int; v_new text; d jsonb; v_state text;
begin
  select p.task_id, p.details into v_return, d from task_relations x join tasks p on p.task_id = x.to_task_id
  where x.from_task_id = new.task_id and x.relation_type = 'Subtask of' and x.deleted_at is null and p.kind = 'Return';
  if v_return is null then return new; end if;

  with g as (
    select t.completes_stage as k, bool_and(t.status in ('Done', 'Skipped')) as done
    from task_relations x join tasks t on t.task_id = x.from_task_id
    where x.to_task_id = v_return and x.relation_type = 'Subtask of' and x.deleted_at is null and t.deleted_at is null and t.completes_stage is not null
    group by t.completes_stage
  ), o as (select k, bool_and(done) over (order by k) as all_done from g)
  select coalesce(max(k) filter (where all_done), 1) into v_stage from o;

  v_new := (array['1 Not started','2 Data synced','3 Generated','4 In review','5 Ready to release','6 Released','7 Customer approved','8 Submitted','9 Confirmed / paid'])[greatest(v_stage, 1)];
  if v_new is distinct from d ->> 'stage' then
    v_state := case when v_stage = 9 and d ->> 'state' = 'Open' then 'Done' else d ->> 'state' end;
    insert into task_events (task_id, at, from_stage, to_stage, from_state, to_state, actor, source, note)
    values (v_return, now(), d ->> 'stage', v_new, d ->> 'state', v_state, null, 'Person', 'Checklist: ' || new.title);
    update tasks set details = details
      || jsonb_build_object('stage', v_new, 'state', v_state)
      || case when v_stage >= 6 and not details ? 'released_on'  then jsonb_build_object('released_on', as_of())  else '{}' end
      || case when v_stage >= 7 and not details ? 'approved_on'  then jsonb_build_object('approved_on', as_of())  else '{}' end
      || case when v_stage >= 8 and not details ? 'submitted_on' then jsonb_build_object('submitted_on', as_of()) else '{}' end
    where task_id = v_return;
  end if;
  return new;
end $$;

-- Amounts from the return page. A blank amount takes the field out.
create function set_return_amounts(p_return text, p_calculated numeric default null, p_collected numeric default null) returns void language plpgsql set search_path = public as $$
begin
  update tasks set details = (details - 'calculated' - 'collected')
    || jsonb_strip_nulls(jsonb_build_object('calculated', p_calculated, 'collected', p_collected))
  where task_id = p_return and kind = 'Return' and deleted_at is null;
  if not found then raise exception 'No return %', p_return; end if;
end $$;

create or replace function kick_off_next_run() returns jsonb language plpgsql set search_path = public as $$
declare
  v_last runs; v_rm date; v_pm date; v_run text; v_head text; v_id text; v_ret text;
  v_cd19 date; v_stat date; v_sub date; v_today date := as_of();
  n_ret int := 0; n_steps int := 0; n_tasks int := 0;
  tp record; g record; p record; tt registration_types; cu customers;
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

  for tp in select * from tasks where run_id is null and registration_type_id is null and status = 'Template' and deleted_at is null order by task_id loop
    insert into tasks (title, kind, return_filter, run_id, template_id, anchor, "offset", due_date, status)
      values (tp.title, tp.kind, tp.return_filter, v_run, tp.task_id, tp.anchor, tp."offset", anchor_date(tp.anchor, tp."offset", v_rm), 'Not started')
      returning task_id into v_id;
    insert into task_relations (from_task_id, to_task_id, relation_type) values (v_id, v_head, 'Subtask of');
    insert into ownerships (owner_id, role, task_id, from_date)
      select owner_id, 'Task owner', v_id, v_today from ownerships where task_id = tp.task_id and role = 'Task owner' and deleted_at is null limit 1;
    n_tasks := n_tasks + 1;
  end loop;

  for g in select r.* from registrations r join registration_types t on t.registration_type_id = r.registration_type_id and t.active and t.deleted_at is null
           where r.deleted_at is null order by r.registration_id loop
    select * into tt from registration_types where registration_type_id = g.registration_type_id;
    select * into cu from customers where customer_id = g.customer_id;
    for p in select * from periods_for(tt.frequency, v_pm) loop
      continue when g.active_from > p.period_end or (g.active_to is not null and g.active_to < p.period_start);
      continue when exists (select 1 from tasks r where r.kind = 'Return' and r.registration_id = g.registration_id and r.deleted_at is null
                            and r.details ->> 'period_start' = p.period_start::text and r.details ->> 'return_kind' = 'Regular');
      v_stat := statutory_due_for(g.registration_type_id, v_rm, p.period_end);
      v_sub := coalesce(least(v_stat, v_cd19), v_cd19);
      insert into tasks (title, kind, run_id, registration_id, status, details)
        values (tt.name || ' · ' || to_char(p.period_end, 'Mon YYYY'), 'Return', v_run, g.registration_id, null,
                jsonb_strip_nulls(jsonb_build_object('period_start', p.period_start, 'period_end', p.period_end, 'return_kind', 'Regular',
                                                     'stage', '1 Not started', 'state', 'Open', 'statutory_due', v_stat)))
        returning task_id into v_ret;
      insert into ownerships (owner_id, role, task_id, from_date)
        select o, r, v_ret, v_today from (values
          (type_rule(g.registration_type_id, 'default_preparer', p.period_end), 'Preparer'),
          (type_rule(g.registration_type_id, 'default_reviewer', p.period_end), 'Reviewer'),
          (cu.release_owner, 'Release owner'),
          (cu.customer_approver, 'Customer approver')) v(o, r)
        where o is not null;
      insert into task_relations (from_task_id, to_task_id, relation_type) values (v_ret, v_head, 'Subtask of');
      for tp in select * from tasks where registration_type_id = g.registration_type_id and run_id is null and deleted_at is null order by completes_stage, task_id loop
        insert into tasks (title, kind, run_id, template_id, anchor, "offset", completes_stage, applies_to_tier, owner_role, due_date, status)
          values (tp.title, 'Return step', v_run, tp.task_id, tp.anchor, tp."offset", tp.completes_stage, tp.applies_to_tier, tp.owner_role,
                  anchor_date(tp.anchor, tp."offset", v_rm, v_sub), 'Not started')
          returning task_id into v_id;
        insert into task_relations (from_task_id, to_task_id, relation_type) values (v_id, v_ret, 'Subtask of');
        n_steps := n_steps + 1;
      end loop;
      n_ret := n_ret + 1;
    end loop;
  end loop;

  return jsonb_build_object('run_id', v_run, 'returns', n_ret, 'steps', n_steps, 'run_tasks', n_tasks);
end $$;

create or replace function next_run_preview() returns jsonb language plpgsql stable set search_path = public as $$
declare v_last date; v_rm date; v_pm date; v_n int;
begin
  select max(run_month) into v_last from runs where deleted_at is null;
  v_rm := (v_last + interval '1 month')::date; v_pm := (v_rm - interval '1 month')::date;
  select count(*) into v_n
  from registrations g join registration_types t on t.registration_type_id = g.registration_type_id and t.active and t.deleted_at is null
  cross join lateral periods_for(t.frequency, v_pm) p
  where g.deleted_at is null and g.active_from <= p.period_end and (g.active_to is null or g.active_to >= p.period_start)
    and not exists (select 1 from tasks r where r.kind = 'Return' and r.registration_id = g.registration_id and r.deleted_at is null
                    and r.details ->> 'period_start' = p.period_start::text and r.details ->> 'return_kind' = 'Regular');
  return jsonb_build_object('run_id', 'RUN-' || to_char(v_rm, 'YYYY-MM'), 'run_month', v_rm, 'returns', v_n,
                            'exists', exists (select 1 from runs where run_id = 'RUN-' || to_char(v_rm, 'YYYY-MM')));
end $$;

grant execute on function owner_of(text, text), set_return_amounts(text, numeric, numeric) to anon, authenticated;

-- 5. The views, with the same columns as before. A return's ID is now its task's ID.

create view return_board as
with base as (
  select r.task_id as return_id,
    r.registration_id,
    r.run_id,
    (r.details ->> 'period_start')::date as period_start,
    (r.details ->> 'period_end')::date as period_end,
    r.details ->> 'return_kind' as kind,
    r.details ->> 'stage' as stage,
    r.details ->> 'state' as state,
    (r.details ->> 'calculated')::numeric as calculated,
    (r.details ->> 'collected')::numeric as collected,
    (r.details ->> 'released_on')::date as released_on,
    (r.details ->> 'approved_on')::date as approved_on,
    (r.details ->> 'submitted_on')::date as submitted_on,
    r.details ->> 'confirmation_no' as confirmation_no,
    r.details ->> 'reason' as reason,
    r.notes,
    r.details,
    c.release_by, c.submit_by, c.expected_stage, c.as_of, c.run_month,
    g.customer_id,
    g.registration_type_id,
    g.account_ref,
    t.name as type_name,
    coalesce(t.region_code, t.country_code) as place_code,
    t.tax_type, t.frequency, t.workflow,
    cu.name as customer_name,
    coalesce((r.details ->> 'statutory_due')::date, statutory_due_for(g.registration_type_id, c.run_month, (r.details ->> 'period_end')::date)) as authority_due,
    split_part(r.details ->> 'stage', ' ', 1)::int as stage_n,
    open_issues(r.task_id) as open_issues,
    array(select ru.name from rule_results rr join rules ru on ru.rule_id = rr.rule_id
          where rr.task_id = r.task_id and ru.kind = 'Tier A' and rr.result = 'met' and (rr.pinned or (ru.active and ru.deleted_at is null)) order by ru.rule_id) as tier_reasons,
    array(select ru.name from rule_results rr join rules ru on ru.rule_id = rr.rule_id
          where rr.task_id = r.task_id and ru.kind = 'Tier A' and rr.result = 'can''t tell' and (rr.pinned or (ru.active and ru.deleted_at is null)) order by ru.rule_id) as tier_unknowns,
    array(select coalesce(ru.message, ru.name) from rule_results rr join rules ru on ru.rule_id = rr.rule_id
          where rr.task_id = r.task_id and ru.kind = 'Flag' and rr.result = 'met' and (rr.pinned or (ru.active and ru.deleted_at is null)) order by ru.rule_id) as rule_flags
  from tasks r
  join run_calendar c on c.run_id = r.run_id
  join registrations g on g.registration_id = r.registration_id
  join registration_types t on t.registration_type_id = g.registration_type_id
  join customers cu on cu.customer_id = g.customer_id
  where r.kind = 'Return' and r.deleted_at is null
), d as (
  select b.*, coalesce(b.collected, 0) - coalesce(b.calculated, 0) as gap, coalesce(least(b.authority_due, b.submit_by), b.submit_by) as due_by from base b
)
select return_id, registration_id, run_id, period_start, period_end, kind, stage, stage_n, state, calculated, collected, gap,
  authority_due, due_by as submit_due, release_by, released_on, approved_on, submitted_on, confirmation_no, reason, notes,
  customer_id, customer_name, registration_type_id, type_name, place_code, tax_type, frequency, workflow, account_ref, open_issues,
  tier_reasons,
  case when cardinality(tier_reasons) > 0 then 'A' when cardinality(tier_unknowns) > 0 then '?' else 'B' end as tier,
  tier_unknowns, rule_flags,
  case
    when state = 'Not required' then 'N/A'
    when state = 'On hold' then 'On hold'
    when state = 'Blocked' then case when open_issues > 0 then 'Blocked' else 'Blocked, no issue' end
    when stage_n >= 8 then case when submitted_on > due_by then 'Filed late' else 'Done' end
    when as_of > due_by then 'Missed deadline'
    when stage_n < 6 and as_of > release_by then 'Late release'
    when due_by - as_of <= coalesce(setting('at_risk_days')::int, 3) then 'Submit at risk'
    when period_end >= as_of and stage_n < 6 then 'Period open'
    when stage_n < expected_stage then 'Behind plan'
    else 'On track'
  end as flag,
  owner_of(return_id, 'Preparer') as preparer,
  owner_of(return_id, 'Reviewer') as reviewer,
  owner_of(return_id, 'Release owner') as release_owner,
  owner_of(return_id, 'Customer approver') as customer_approver,
  return_id as header_task_id,
  (select count(*) from task_relations x join tasks s on s.task_id = x.from_task_id
   where x.to_task_id = d.return_id and x.relation_type = 'Subtask of' and x.deleted_at is null and s.deleted_at is null and s.status <> 'Skipped')::int as steps_total,
  (select count(*) from task_relations x join tasks s on s.task_id = x.from_task_id
   where x.to_task_id = d.return_id and x.relation_type = 'Subtask of' and x.deleted_at is null and s.deleted_at is null and s.status = 'Done')::int as steps_done,
  details
from d;

create view return_grid as
select rb.return_id, rb.run_id, rb.customer_name, rb.type_name, rb.place_code, rb.tax_type, rb.frequency, rb.kind,
  rb.period_start, rb.period_end, rb.stage, rb.stage_n, rb.state, rb.tier,
  coalesce(array_to_string(rb.tier_reasons, ', '), '') as tier_reasons,
  coalesce(array_to_string(rb.tier_unknowns, ', '), '') as tier_unknowns,
  coalesce(array_to_string(rb.rule_flags, ' · '), '') as rule_flags,
  rb.flag, rb.open_issues, rb.steps_done as tasks_done, rb.steps_total as tasks_total,
  rb.release_by, rb.submit_due, rb.calculated, rb.collected, rb.gap,
  rb.preparer, p.name as preparer_name, rb.reviewer, v.name as reviewer_name
from return_board rb
left join owners p on p.owner_id = rb.preparer
left join owners v on v.owner_id = rb.reviewer;

create view return_rules as
select rr.task_id as return_id, rr.rule_id, ru.kind, ru.name, ru.message, ru.step_title, rr.result, rr.evidence, rr.evaluated_at, rr.pinned
from rule_results rr join rules ru on ru.rule_id = rr.rule_id
where rr.pinned or (ru.active and ru.deleted_at is null);

create view rule_summary as
select r.run_id, rr.rule_id, rr.result, count(*)::int as returns
from rule_results rr join tasks r on r.task_id = rr.task_id
where r.deleted_at is null
group by r.run_id, rr.rule_id, rr.result;

create view run_summary as
select run_id, flag, tier, stage_n, stage, count(*)::int as returns, sum(steps_total)::int as steps_total, sum(steps_done)::int as steps_done
from return_board
group by run_id, flag, tier, stage_n, stage;

create view task_board as
select t.task_id, t.title, t.kind, t.status, t.due_date, t.done_on, t.notes, t.run_id, t.template_id, t.anchor, t."offset",
  t.completes_stage, t.applies_to_tier, t.owner_role, t.return_filter, t.customer_id, t.notice_id, t.category, t.priority,
  t.description, t.raised_on, t.raised_by, t.waiting_on, t.resolution, t.source, t.source_ref,
  p.task_id as parent_id, p.kind as parent_kind, p.title as parent_title,
  case when t.kind = 'Return' then t.task_id when p.kind = 'Return' then p.task_id end as return_id,
  coalesce(owner_of(t.task_id, 'Task owner'),
    case when t.owner_role = 'Preparer' and t.title ilike '%WARP%' then 'WARP' end,
    case when t.owner_role is not null and p.kind = 'Return' then owner_of(p.task_id, t.owner_role) end) as owner_id,
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
  t.registration_id,
  t.details
from tasks t
left join task_relations pr on pr.from_task_id = t.task_id and pr.relation_type = 'Subtask of' and pr.deleted_at is null
left join tasks p on p.task_id = pr.to_task_id
where t.deleted_at is null and (t.run_id is not null or t.kind in ('Issue', 'Onboarding'));

create view task_grid as
select tb.task_id, tb.title, tb.notes, tb.status, tb.due_date, tb.due_flag, tb.done_on, tb.run_id, tb.return_id, tb.kind,
  coalesce(k.label, tb.kind) as kind_label,
  tb.parent_id, coalesce(tb.parent_title, cu.name) as parent_title,
  tb.owner_id, o.name as owner_name, tb.owner_role,
  coalesce(array_to_string(tb.blocked_by, ', '), '') as blocked_by,
  cardinality(tb.blocked_by) > 0 as is_blocked,
  tb.completes_stage, tb.category, tb.priority, tb.description, tb.raised_on, tb.raised_by, tb.waiting_on, tb.resolution, tb.source_ref,
  tb.customer_id, cu.name as customer_name,
  coalesce((select string_agg(h.task_id, ', ' order by h.task_id) from task_relations x join tasks h on h.task_id = x.to_task_id
            where x.from_task_id = tb.task_id and x.relation_type = 'Affects' and x.deleted_at is null and h.kind = 'Return'), '') as affects,
  (select count(*) from task_relations x where x.from_task_id = tb.task_id and x.relation_type = 'Affects' and x.deleted_at is null)::int as returns_affected,
  tb.registration_id
from task_board tb
left join task_kinds k on k.kind = tb.kind
left join owners o on o.owner_id = tb.owner_id
left join customers cu on cu.customer_id = tb.customer_id;

create view task_summary as
select run_id, kind, status, due_flag, owner_id, count(*)::int as tasks
from task_board
group by run_id, kind, status, due_flag, owner_id;
