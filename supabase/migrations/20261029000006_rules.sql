-- Rules as data. Behaviour is Workbench's (evaluate a condition, include or leave out a step, set the tier, raise a flag);
-- the vocabulary is the company's: what "large gap" or "new registration" means lives in rows here, not in code.
-- Every evaluation is met, not met or can't tell, with its evidence, and a return keeps its results. Nothing is silent.

create sequence rule_id_seq;
create table rules (
  rule_id text primary key default 'RUL-' || lpad(nextval('rule_id_seq')::text, 3, '0'),
  kind text not null check (kind in ('Condition', 'Tier A', 'Include step', 'Leave out step', 'Flag')),
  name text not null,
  -- Condition: {"measure": m, "op": "=|!=|>|>=|<|<=|in", "value": v} | {"any": [..]} | {"all": [..]} | {"not": e} | {"condition": "RUL-001"}
  expression jsonb,
  condition_id text references rules,          -- what an effect rule depends on
  return_type_id text references return_types, -- an effect for one return type only; empty = every type
  step_title text,                             -- the checklist step a step rule acts on
  message text,                                -- the flag's words, or why the step is in or out
  source text,                                 -- where the definition comes from: a setting, a standard, "company convention"
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  check ((kind = 'Condition') = (expression is not null)),
  check (kind = 'Condition' or condition_id is not null),
  check (kind not in ('Include step', 'Leave out step') or step_title is not null)
);
create trigger rules_touch before update on rules for each row execute function touch_updated_at();

create table rule_results (
  return_id text not null references returns,
  rule_id text not null references rules,
  result text not null check (result in ('met', 'not met', 'can''t tell')),
  evidence jsonb not null default '[]',
  evaluated_at timestamptz not null default now(),
  pinned boolean not null default false,   -- frozen once the return is released, so a released return never changes meaning
  primary key (return_id, rule_id)
);
create index on rule_results (rule_id);

alter table rules enable row level security;
alter table rule_results enable row level security;
create policy rules_open_demo on rules for all to anon, authenticated using (true) with check (true);
create policy rule_results_open_demo on rule_results for all to anon, authenticated using (true) with check (true);

-- ---------- the facts a condition can read about a return ----------
-- The measures are Workbench's; what counts as "large" is the company's (in rules).
create function return_facts(p_return text) returns jsonb language sql stable set search_path = public as $$
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
    'open_issues', (select count(*) from issue_links l join issues i on i.issue_id = l.issue_id
                    where l.return_id = r.return_id and l.deleted_at is null and i.status not in ('Resolved', 'Won''t fix')),
    'stage', split_part(r.stage, ' ', 1)::int,
    'state', r.state)
  from returns r
  join registrations g on g.registration_id = r.registration_id
  join return_types t on t.return_type_id = g.return_type_id
  join customers cu on cu.customer_id = g.customer_id
  where r.return_id = p_return
$$;

-- ---------- the one evaluator ----------
create function eval_expr(e jsonb, f jsonb, depth int default 0, out result text, out evidence jsonb)
language plpgsql stable set search_path = public as $$
declare x jsonb; sub record; results text[] := '{}'; ev jsonb := '[]'; m text; op text; v jsonb; want jsonb; ok boolean;
begin
  if depth > 10 then result := 'can''t tell'; evidence := jsonb_build_array(jsonb_build_object('error', 'conditions refer to each other in a loop')); return; end if;

  if e ? 'condition' then
    select * into sub from eval_expr((select expression from rules where rule_id = e->>'condition' and kind = 'Condition'), f, depth + 1);
    result := coalesce(sub.result, 'can''t tell');
    evidence := jsonb_build_array(jsonb_build_object('condition', e->>'condition',
      'name', (select name from rules where rule_id = e->>'condition'), 'result', result, 'evidence', sub.evidence));
    return;
  end if;

  if e ? 'not' then
    select * into sub from eval_expr(e->'not', f, depth + 1);
    result := case sub.result when 'met' then 'not met' when 'not met' then 'met' else 'can''t tell' end;
    evidence := sub.evidence; return;
  end if;

  if e ? 'any' or e ? 'all' then
    for x in select * from jsonb_array_elements(coalesce(e->'any', e->'all')) loop
      select * into sub from eval_expr(x, f, depth + 1);
      results := results || sub.result; ev := ev || coalesce(sub.evidence, '[]');
    end loop;
    if e ? 'any' then
      result := case when 'met' = any(results) then 'met' when 'can''t tell' = any(results) then 'can''t tell' else 'not met' end;
    else
      result := case when 'not met' = any(results) then 'not met' when 'can''t tell' = any(results) then 'can''t tell' else 'met' end;
    end if;
    evidence := ev; return;
  end if;

  -- a single comparison against one measure
  m := e->>'measure'; op := coalesce(e->>'op', '='); want := e->'value'; v := f->m;
  if v is null or jsonb_typeof(v) = 'null' then
    result := 'can''t tell';
    evidence := jsonb_build_array(jsonb_build_object('measure', m, 'op', op, 'value', want, 'actual', null, 'result', result, 'why', m || ' is not known yet'));
    return;
  end if;
  if op = 'in' then
    ok := want @> jsonb_build_array(v);
  elsif jsonb_typeof(v) = 'number' and jsonb_typeof(want) = 'number' then
    ok := case op when '=' then v::numeric = want::numeric when '!=' then v::numeric <> want::numeric
                  when '>' then v::numeric > want::numeric when '>=' then v::numeric >= want::numeric
                  when '<' then v::numeric < want::numeric when '<=' then v::numeric <= want::numeric end;
  else
    ok := case op when '=' then v #>> '{}' = want #>> '{}' when '!=' then v #>> '{}' <> want #>> '{}' end;
  end if;
  result := case when ok then 'met' when ok is null then 'can''t tell' else 'not met' end;
  evidence := jsonb_build_array(jsonb_build_object('measure', m, 'op', op, 'value', want, 'actual', v, 'result', result));
end $$;

-- ---------- evaluate a return: record every effect rule's result, then apply step rules ----------
-- Pinned results (released returns) are left alone. Leave out beats Include. A step a rule leaves out is Skipped with the reason;
-- a step it brings back (or that becomes can't tell) goes back to Not started. Steps a person has done are never touched.
create function evaluate_return(p_return text) returns void language plpgsql set search_path = public as $$
declare f jsonb; rl record; ev record; v_type text; v_head text; st record; v_in text; v_out text; v_note text;
begin
  if exists (select 1 from rule_results where return_id = p_return and pinned) then return; end if;
  f := return_facts(p_return);
  select g.return_type_id into v_type from returns r join registrations g on g.registration_id = r.registration_id where r.return_id = p_return;

  for rl in select * from rules where kind <> 'Condition' and active and deleted_at is null and (return_type_id is null or return_type_id = v_type) loop
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
end $$;

create function evaluate_run(p_run text) returns int language plpgsql set search_path = public as $$
declare r record; n int := 0;
begin
  for r in select return_id from returns where run_id = p_run and deleted_at is null loop perform evaluate_return(r.return_id); n := n + 1; end loop;
  return n;
end $$;

-- Re-evaluate when the facts change; pin at release
create function returns_reevaluate() returns trigger language plpgsql set search_path = public as $$
begin
  if split_part(new.stage, ' ', 1)::int >= 6 then
    update rule_results set pinned = true where return_id = new.return_id and not pinned;
  else
    perform evaluate_return(new.return_id);
  end if;
  return new;
end $$;
create trigger returns_reevaluate after update of calculated, collected, kind, state, stage on returns
for each row execute function returns_reevaluate();

create function issue_links_reevaluate() returns trigger language plpgsql set search_path = public as $$
begin
  if coalesce(new.return_id, old.return_id) is not null then perform evaluate_return(coalesce(new.return_id, old.return_id)); end if;
  return null;
end $$;
create trigger issue_links_reevaluate after insert or update on issue_links for each row execute function issue_links_reevaluate();

create function issues_reevaluate() returns trigger language plpgsql set search_path = public as $$
declare l record;
begin
  for l in select distinct return_id from issue_links where issue_id = new.issue_id and return_id is not null loop perform evaluate_return(l.return_id); end loop;
  return null;
end $$;
create trigger issues_reevaluate after update of status on issues for each row execute function issues_reevaluate();

-- ---------- Sphere's starting vocabulary and rules (thresholds were Settings before) ----------
insert into rules (rule_id, kind, name, expression, source, notes) values
  ('RUL-001', 'Condition', 'Large gap', '{"measure":"gap_abs","op":">","value":1000}', 'Company convention (was review_gap_amount)', 'Collected vs calculated differ by more than 1,000'),
  ('RUL-002', 'Condition', 'Gap over 5%', '{"measure":"gap_pct","op":">","value":0.05}', 'Company convention (was review_gap_pct)', 'Collected vs calculated differ by more than 5% of calculated'),
  ('RUL-003', 'Condition', 'New registration', '{"measure":"days_registered","op":"<=","value":60}', 'Company convention (was new_registration_days)', 'Registration started within 60 days of period end'),
  ('RUL-004', 'Condition', 'Prepayment workflow', '{"measure":"workflow","op":"=","value":"Prepayment"}', 'Return type', null),
  ('RUL-005', 'Condition', 'Customer needs internal review', '{"measure":"internal_review","op":"=","value":true}', 'Customer setting', null),
  ('RUL-006', 'Condition', 'Open issue linked', '{"measure":"open_issues","op":">","value":0}', 'Issues', null),
  ('RUL-007', 'Condition', 'Not a regular return', '{"measure":"kind","op":"!=","value":"Regular"}', 'Return kind', 'Historical, amendment or prepayment'),
  ('RUL-008', 'Condition', 'Needs second review',
     '{"any":[{"condition":"RUL-001"},{"condition":"RUL-002"},{"condition":"RUL-003"},{"condition":"RUL-004"},{"condition":"RUL-005"},{"condition":"RUL-006"},{"condition":"RUL-007"}]}',
     'Risk-based review', 'Any one of the tier A reasons'),
  ('RUL-009', 'Condition', 'Gap needs explaining', '{"any":[{"condition":"RUL-001"},{"condition":"RUL-002"}]}', 'Company convention', null);
insert into rules (rule_id, kind, name, condition_id, step_title, message, source) values
  ('RUL-010', 'Tier A', 'Large gap', 'RUL-001', null, null, 'Risk-based review'),
  ('RUL-011', 'Tier A', 'Gap over 5%', 'RUL-002', null, null, 'Risk-based review'),
  ('RUL-012', 'Tier A', 'New registration', 'RUL-003', null, null, 'Risk-based review'),
  ('RUL-013', 'Tier A', 'Prepayment return type', 'RUL-004', null, null, 'Risk-based review'),
  ('RUL-014', 'Tier A', 'Customer needs internal review', 'RUL-005', null, null, 'Risk-based review'),
  ('RUL-015', 'Tier A', 'Open issue linked', 'RUL-006', null, null, 'Risk-based review'),
  ('RUL-016', 'Tier A', 'Not a regular return', 'RUL-007', null, null, 'Risk-based review'),
  ('RUL-017', 'Include step', 'Second review only when needed', 'RUL-008', 'Second review', 'Tier A returns get a second review', 'Risk-based review'),
  ('RUL-018', 'Flag', 'Explain the variance in the release note', 'RUL-009', null, 'Collected and calculated differ: explain why in the note to the customer', 'Company convention');
select setval('rule_id_seq', 100);

-- the thresholds now live in rules
update settings set deleted_at = now(), notes = coalesce(notes, '') || ' (moved to rules)'
where key in ('review_gap_amount', 'review_gap_pct', 'new_registration_days') and deleted_at is null;

-- ---------- the return board: one row per return with its tier and flags from the rules, owners and checklist progress ----------
create view return_rules with (security_invoker = on) as
select rr.return_id, rr.rule_id, ru.kind, ru.name, ru.message, ru.step_title, rr.result, rr.evidence, rr.evaluated_at, rr.pinned
from rule_results rr join rules ru on ru.rule_id = rr.rule_id
where rr.pinned or (ru.active and ru.deleted_at is null);

create view return_board with (security_invoker = on) as
with base as (
  select r.*, c.release_by, c.submit_by, c.expected_stage, c.as_of, c.run_month,
    g.customer_id, g.return_type_id, g.active_from, g.account_ref,
    t.name as type_name, t.country_code, t.region_code, coalesce(t.region_code, t.country_code) as place_code, t.tax_type, t.frequency, t.workflow,
    cu.name as customer_name,
    coalesce(r.statutory_due, statutory_due_for(g.return_type_id, c.run_month, r.period_end)) as authority_due,
    split_part(r.stage, ' ', 1)::int as stage_n,
    coalesce(r.collected, 0) - coalesce(r.calculated, 0) as gap,
    (select count(*) from issue_links l join issues i on i.issue_id = l.issue_id
      where l.return_id = r.return_id and l.deleted_at is null and i.deleted_at is null and i.status not in ('Resolved', 'Won''t fix'))::int as open_issues,
    h.task_id as header_task_id,
    array(select ru.name from rule_results rr join rules ru on ru.rule_id = rr.rule_id where rr.return_id = r.return_id and ru.kind = 'Tier A' and rr.result = 'met' and (rr.pinned or (ru.active and ru.deleted_at is null)) order by ru.rule_id) as tier_reasons,
    array(select ru.name from rule_results rr join rules ru on ru.rule_id = rr.rule_id where rr.return_id = r.return_id and ru.kind = 'Tier A' and rr.result = 'can''t tell' and (rr.pinned or (ru.active and ru.deleted_at is null)) order by ru.rule_id) as tier_unknowns,
    array(select coalesce(ru.message, ru.name) from rule_results rr join rules ru on ru.rule_id = rr.rule_id where rr.return_id = r.return_id and ru.kind = 'Flag' and rr.result = 'met' and (rr.pinned or (ru.active and ru.deleted_at is null)) order by ru.rule_id) as rule_flags
  from returns r
  join run_calendar c on c.run_id = r.run_id
  join registrations g on g.registration_id = r.registration_id
  join return_types t on t.return_type_id = g.return_type_id
  join customers cu on cu.customer_id = g.customer_id
  left join tasks h on h.return_id = r.return_id and h.kind = 'Return' and h.deleted_at is null
  where r.deleted_at is null
), d as (select b.*, coalesce(least(b.authority_due, b.submit_by), b.submit_by) as due_by from base b)
select t.return_id, t.registration_id, t.run_id, t.period_start, t.period_end, t.kind, t.stage, t.stage_n, t.state,
  t.calculated, t.collected, t.gap, t.authority_due, t.due_by as submit_due, t.release_by,
  t.released_on, t.approved_on, t.submitted_on, t.confirmation_no, t.reason, t.notes,
  t.customer_id, t.customer_name, t.return_type_id, t.type_name, t.place_code, t.tax_type, t.frequency, t.workflow, t.account_ref,
  t.open_issues, t.tier_reasons,
  case when cardinality(t.tier_reasons) > 0 then 'A' when cardinality(t.tier_unknowns) > 0 then '?' else 'B' end as tier,
  t.tier_unknowns, t.rule_flags,
  case
    when t.state = 'Not required' then 'N/A'
    when t.state = 'On hold' then 'On hold'
    when t.state = 'Blocked' then case when t.open_issues > 0 then 'Blocked' else 'Blocked, no issue' end
    when t.stage_n >= 8 then case when t.submitted_on > t.due_by then 'Filed late' else 'Done' end
    when t.as_of > t.due_by then 'Missed deadline'
    when t.stage_n < 6 and t.as_of > t.release_by then 'Late release'
    when t.due_by - t.as_of <= coalesce(setting('at_risk_days')::int, 3) then 'Submit at risk'
    when t.period_end >= t.as_of and t.stage_n < 6 then 'Period open'
    when t.stage_n < t.expected_stage then 'Behind plan'
    else 'On track'
  end as flag,
  owner_of(t.return_id, null, 'Preparer') as preparer,
  owner_of(t.return_id, null, 'Reviewer') as reviewer,
  owner_of(t.return_id, null, 'Release owner') as release_owner,
  owner_of(t.return_id, null, 'Customer approver') as customer_approver,
  t.header_task_id,
  (select count(*) from task_relations x join tasks s on s.task_id = x.from_task_id
    where x.to_task_id = t.header_task_id and x.relation_type = 'Subtask of' and x.deleted_at is null and s.deleted_at is null and s.status <> 'Skipped')::int as steps_total,
  (select count(*) from task_relations x join tasks s on s.task_id = x.from_task_id
    where x.to_task_id = t.header_task_id and x.relation_type = 'Subtask of' and x.deleted_at is null and s.deleted_at is null and s.status = 'Done')::int as steps_done
from d t;

-- kick-off now creates every template step and lets the rules decide which stay in
create or replace function kick_off_and_evaluate() returns jsonb language plpgsql set search_path = public as $$
declare res jsonb;
begin
  res := kick_off_next_run();
  perform evaluate_run(res->>'run_id');
  return res;
end $$;
grant execute on function kick_off_and_evaluate(), evaluate_return(text), evaluate_run(text) to anon, authenticated;

-- results for the runs already in the database; released returns are pinned as they stand
do $$
declare rn record;
begin
  for rn in select run_id from runs where deleted_at is null loop perform evaluate_run(rn.run_id); end loop;
  update rule_results rr set pinned = true from returns r where r.return_id = rr.return_id and split_part(r.stage, ' ', 1)::int >= 6;
end $$;
