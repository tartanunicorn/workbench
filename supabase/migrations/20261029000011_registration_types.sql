-- One name: what customers are registered to is a registration type (it was a return type). A registration type is a
-- place, tax type and frequency, with dated rules and the tasks every return of the type gets. Tables, columns and the
-- functions that read them follow the new name.

alter table return_types rename to registration_types;
alter table return_type_rules rename to registration_type_rules;
alter table registration_types rename column return_type_id to registration_type_id;
alter table registration_type_rules rename column return_type_id to registration_type_id;
alter table registrations rename column return_type_id to registration_type_id;
alter table tasks rename column return_type_id to registration_type_id;
alter table rules rename column return_type_id to registration_type_id;
alter view return_board rename column return_type_id to registration_type_id;

alter policy return_types_open_demo on registration_types rename to registration_types_open_demo;
alter policy return_types_members on registration_types rename to registration_types_members;
alter policy return_type_rules_open_demo on registration_type_rules rename to registration_type_rules_open_demo;
alter policy return_type_rules_members on registration_type_rules rename to registration_type_rules_members;
alter trigger return_types_touch on registration_types rename to registration_types_touch;
alter trigger return_type_rules_touch on registration_type_rules rename to registration_type_rules_touch;

-- the functions that named the old tables, restated with the new names
create or replace function public.evaluate_return(p_return text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare f jsonb; rl record; ev record; v_type text; v_head text; st record; v_in text; v_out text; v_note text;
begin
  if exists (select 1 from rule_results where return_id = p_return and pinned) then return; end if;
  f := return_facts(p_return);
  select g.registration_type_id into v_type from returns r join registrations g on g.registration_id = r.registration_id where r.return_id = p_return;

  for rl in select * from rules where kind <> 'Condition' and active and deleted_at is null and (registration_type_id is null or registration_type_id = v_type) loop
    select * into ev from eval_expr(jsonb_build_object('condition', rl.condition_id), f);
    insert into rule_results (return_id, rule_id, result, evidence, evaluated_at)
      values (p_return, rl.rule_id, ev.result, ev.evidence, now())
      on conflict (return_id, rule_id) do update set result = excluded.result, evidence = excluded.evidence, evaluated_at = excluded.evaluated_at;
  end loop;
  -- results of rules since retired stay as history; everything that reads results only counts live rules
  select task_id into v_head from tasks where return_id = p_return and kind = 'Return' and deleted_at is null;
  for st in select t.* from task_relations x join tasks t on t.task_id = x.from_task_id
            where x.to_task_id = v_head and x.relation_type = 'Subtask of' and x.deleted_at is null and t.status in ('Not started', 'Skipped') loop
    -- the strongest result among rules for this step: Leave out met wins; then Include not met; can't tell keeps it in
    select string_agg(ru.name, '; ') filter (where rr.result = 'met' and ru.kind = 'Leave out step'),
           string_agg(ru.name, '; ') filter (where rr.result = 'not met' and ru.kind = 'Include step')
      into v_out, v_in
    from rule_results rr join rules ru on ru.rule_id = rr.rule_id
    where rr.return_id = p_return and ru.kind in ('Include step', 'Leave out step') and ru.step_title = st.title
      and (rr.pinned or (ru.active and ru.deleted_at is null));
    if v_out is not null or v_in is not null then
      v_note := 'Left out by rule: ' || coalesce(v_out, v_in);
      if st.status <> 'Skipped' or st.notes is distinct from v_note then update tasks set status = 'Skipped', notes = v_note where task_id = st.task_id; end if;
    elsif st.status = 'Skipped' and st.notes like 'Left out by rule:%' then
      update tasks set status = 'Not started', notes = null where task_id = st.task_id;
    end if;
  end loop;
end $function$
;
create or replace function public.kick_off_next_run()
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_last runs; v_rm date; v_pm date; v_run text; v_head text; v_id text; v_ret text; v_rhead text;
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
      continue when exists (select 1 from returns r where r.registration_id = g.registration_id and r.period_start = p.period_start and r.kind = 'Regular');
      v_stat := statutory_due_for(g.registration_type_id, v_rm, p.period_end);
      v_sub := coalesce(least(v_stat, v_cd19), v_cd19);
      insert into returns (registration_id, run_id, period_start, period_end, kind, stage, state, statutory_due)
        values (g.registration_id, v_run, p.period_start, p.period_end, 'Regular', '1 Not started', 'Open', v_stat)
        returning return_id into v_ret;
      insert into ownerships (owner_id, role, return_id, from_date)
        select o, r, v_ret, v_today from (values
          (type_rule(g.registration_type_id, 'default_preparer', p.period_end), 'Preparer'),
          (type_rule(g.registration_type_id, 'default_reviewer', p.period_end), 'Reviewer'),
          (cu.release_owner, 'Release owner'),
          (cu.customer_approver, 'Customer approver')) v(o, r)
        where o is not null;
      insert into tasks (title, kind, run_id, return_id, status, notes)
        values (tt.name || ' · ' || to_char(p.period_end, 'Mon YYYY'), 'Return', v_run, v_ret, null, 'Header: status and dates follow the Returns row')
        returning task_id into v_rhead;
      insert into task_relations (from_task_id, to_task_id, relation_type) values (v_rhead, v_head, 'Subtask of');
      for tp in select * from tasks where registration_type_id = g.registration_type_id and run_id is null and deleted_at is null order by completes_stage, task_id loop
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
end $function$
;
create or replace function public.next_run_preview()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
declare v_last date; v_rm date; v_pm date; v_n int;
begin
  select max(run_month) into v_last from runs where deleted_at is null;
  v_rm := (v_last + interval '1 month')::date; v_pm := (v_rm - interval '1 month')::date;
  select count(*) into v_n
  from registrations g join registration_types t on t.registration_type_id = g.registration_type_id and t.active and t.deleted_at is null
  cross join lateral periods_for(t.frequency, v_pm) p
  where g.deleted_at is null and g.active_from <= p.period_end and (g.active_to is null or g.active_to >= p.period_start)
    and not exists (select 1 from returns r where r.registration_id = g.registration_id and r.period_start = p.period_start and r.kind = 'Regular');
  return jsonb_build_object('run_id', 'RUN-' || to_char(v_rm, 'YYYY-MM'), 'run_month', v_rm, 'returns', v_n,
                            'exists', exists (select 1 from runs where run_id = 'RUN-' || to_char(v_rm, 'YYYY-MM')));
end $function$
;
create or replace function public.return_facts(p_return text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select jsonb_build_object(
    'kind', r.kind,
    'calculated', r.calculated,
    'collected', r.collected,
    'gap_abs', case when r.calculated is not null and r.collected is not null then abs(r.collected - r.calculated) end,
    'gap_pct', case when r.calculated is not null and r.collected is not null and r.calculated <> 0 then round(abs(r.collected - r.calculated) / abs(r.calculated), 4) end,
    'days_registered', r.period_end - g.active_from,
    'workflow', t.workflow,
    'tax_type', t.tax_type,
    'frequency', t.frequency,
    'place', coalesce(t.region_code, t.country_code),
    'internal_review', cu.internal_review,
    'customer_status', cu.status,
    'open_issues', open_issues(r.return_id),
    'stage', split_part(r.stage, ' ', 1)::int,
    'state', r.state)
  from returns r
  join registrations g on g.registration_id = r.registration_id
  join registration_types t on t.registration_type_id = g.registration_type_id
  join customers cu on cu.customer_id = g.customer_id
  where r.return_id = p_return
$function$
;
create or replace function public.type_rule(p_type text, p_field text, p_on date)
 RETURNS text
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select value from registration_type_rules
  where registration_type_id = p_type and field = p_field and valid_from <= p_on and deleted_at is null
  order by valid_from desc limit 1
$function$
;
