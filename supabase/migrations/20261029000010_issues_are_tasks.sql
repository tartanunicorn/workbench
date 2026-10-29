-- Issues are tasks. An issue is a task of kind 'Issue'. What it affects is an 'Affects' relation from the issue to a
-- return's task, or the task's customer. Its owner is the task's owner. The issues and issue_links tables go.

-- ---------- views and functions that read issues come down first, and go back up at the end ----------
drop view issue_grid;
drop view return_grid;
drop view run_summary;
drop view return_board;
drop view task_grid;
drop view task_summary;
drop view task_board;
drop function issues_reevaluate() cascade;
drop function issue_links_reevaluate() cascade;

-- ---------- what an issue knew, every task can now carry ----------
alter table tasks
  add column category text,
  add column priority text check (priority in ('P1', 'P2', 'P3')),
  add column description text,
  add column raised_on date,
  add column raised_by text,
  add column waiting_on text,
  add column resolution text,
  add column systemic_fix boolean,
  add column source text,
  add column source_ref text;

alter table tasks drop constraint tasks_kind_check;
alter table tasks add constraint tasks_kind_check check (kind in
  ('Run', 'Return', 'Return step', 'Issue', 'Pre-run check', 'Milestone', 'Chase', 'Notice response', 'Follow-up', 'Other'));
-- Waiting: the task can't move until someone else acts; waiting_on says who
alter table tasks drop constraint tasks_status_check;
alter table tasks add constraint tasks_status_check check (status in ('Template', 'Not started', 'In progress', 'Waiting', 'Done', 'Skipped'));
alter table tasks add constraint tasks_waiting_check check (status is distinct from 'Waiting' or waiting_on is not null);
alter table tasks drop constraint tasks_check5;
alter table tasks add constraint tasks_check5 check (run_id is not null or (anchor is not null and "offset" is not null) or kind in ('Run', 'Return', 'Issue'));

alter table task_relations drop constraint task_relations_relation_type_check;
alter table task_relations add constraint task_relations_relation_type_check check (relation_type in ('Subtask of', 'Blocks', 'Affects', 'Duplicates', 'Relates to'));

-- ---------- move every issue into tasks ----------
create temporary table issue_map as
select i.issue_id, 'TSK-' || lpad(nextval('task_seq')::text, 5, '0') as task_id from issues i;

insert into tasks (task_id, title, kind, run_id, customer_id, status, waiting_on, due_date, done_on, category, priority, description,
                   raised_on, raised_by, resolution, systemic_fix, source, source_ref, notes, created_at, updated_at, deleted_at)
select m.task_id,
  left(coalesce(nullif(split_part(i.description, '. ', 1), ''), i.category, 'Issue'), 120),
  'Issue',
  coalesce((select r.run_id from runs r where r.deleted_at is null and r.run_month <= coalesce(i.opened_on, current_date) order by r.run_month desc limit 1),
           (select r.run_id from runs r where r.status = 'Open' order by r.run_month desc limit 1)),
  (select l.customer_id from issue_links l where l.issue_id = i.issue_id and l.customer_id is not null and l.deleted_at is null order by l.link_id limit 1),
  case i.status when 'Resolved' then 'Done' when 'Won''t fix' then 'Skipped'
                when 'Waiting on customer' then 'Waiting' when 'Waiting on eng' then 'Waiting' else 'In progress' end,
  case i.status when 'Waiting on customer' then 'Customer' when 'Waiting on eng' then 'Engineering' end,
  i.due_by,
  case when i.status = 'Resolved' then coalesce(i.due_by, i.opened_on) end,
  i.category,
  case i.severity when 'S1' then 'P1' when 'S2' then 'P2' when 'S3' then 'P3' end,
  i.description, i.opened_on, i.detected_by, i.resolution, i.systemic_fix, i.source, i.source_ref,
  'Was ' || i.issue_id,
  i.created_at, i.updated_at, i.deleted_at
from issues i join issue_map m on m.issue_id = i.issue_id;

-- an issue affects a return through the return's own task
insert into task_relations (from_task_id, to_task_id, relation_type, notes)
select m.task_id, h.task_id, 'Affects', null
from issue_links l
join issue_map m on m.issue_id = l.issue_id
join tasks h on h.return_id = l.return_id and h.kind = 'Return' and h.deleted_at is null
where l.return_id is not null and l.deleted_at is null;

-- follow-ups raised for an issue now point at it
insert into task_relations (from_task_id, to_task_id, relation_type)
select t.task_id, m.task_id, 'Relates to' from tasks t join issue_map m on m.issue_id = t.issue_id;

-- an issue's owner owns its task
update ownerships o set task_id = m.task_id, issue_id = null, role = case o.role when 'Issue owner' then 'Task owner' else o.role end
from issue_map m where o.issue_id = m.issue_id;

-- ---------- the issue columns and tables go ----------
alter table tasks drop column issue_id;
alter table tasks add constraint tasks_check check (num_nonnulls(return_id, customer_id, notice_id) <= 1);
alter table ownerships drop column issue_id;
alter table ownerships add constraint ownerships_check check (num_nonnulls(return_id, run_id, task_id) = 1);
alter table ownerships drop constraint ownerships_role_check;
alter table ownerships add constraint ownerships_role_check check (role in
  ('Preparer', 'Reviewer', 'Release owner', 'Customer approver', 'Run owner', 'Escalation', 'Waiting on', 'Task owner'));
alter table balances_notices drop column issue_id;
alter table balances_notices add column task_id text references tasks;
drop table issue_links;
drop table issues;
drop sequence issue_seq;
create index if not exists task_relations_affects on task_relations (to_task_id) where relation_type = 'Affects';
create index if not exists tasks_kind on tasks (kind);

-- ---------- open issues on a return: Issue tasks that affect it and aren't done ----------
create function open_issues(p_return text) returns int language sql stable set search_path = public as $$
  select count(*)::int
  from task_relations x
  join tasks i on i.task_id = x.from_task_id
  join tasks h on h.task_id = x.to_task_id
  where h.return_id = p_return and h.kind = 'Return' and x.relation_type = 'Affects' and x.deleted_at is null
    and i.kind = 'Issue' and i.deleted_at is null and i.status not in ('Done', 'Skipped')
$$;

create or replace function return_facts(p_return text) returns jsonb language sql stable set search_path = public as $$
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
  join return_types t on t.return_type_id = g.return_type_id
  join customers cu on cu.customer_id = g.customer_id
  where r.return_id = p_return
$$;

-- re-check a return's rules when an issue that affects it opens, closes or is linked
create function issue_task_reevaluate() returns trigger language plpgsql set search_path = public as $$
declare rn record;
begin
  if new.kind = 'Issue' then
    for rn in select distinct h.return_id from task_relations x join tasks h on h.task_id = x.to_task_id
              where x.from_task_id = new.task_id and x.relation_type = 'Affects' and h.return_id is not null loop
      perform evaluate_return(rn.return_id);
    end loop;
  end if;
  return null;
end $$;
create trigger tasks_issue_reevaluate after update of status, deleted_at on tasks for each row execute function issue_task_reevaluate();

create function affects_reevaluate() returns trigger language plpgsql set search_path = public as $$
declare v_return text;
begin
  if new.relation_type = 'Affects' then
    select return_id into v_return from tasks where task_id = new.to_task_id;
    if v_return is not null then perform evaluate_return(v_return); end if;
  end if;
  return null;
end $$;
create trigger task_relations_affects_reevaluate after insert or update on task_relations for each row execute function affects_reevaluate();

-- ---------- the views, back up ----------
create view task_board with (security_invoker = on) as
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
        where b.to_task_id = t.task_id and b.relation_type = 'Blocks' and b.deleted_at is null and bt.status not in ('Done', 'Skipped')) as blocked_by
from tasks t
left join task_relations pr on pr.from_task_id = t.task_id and pr.relation_type = 'Subtask of' and pr.deleted_at is null
left join tasks p on p.task_id = pr.to_task_id
where t.deleted_at is null and (t.run_id is not null or t.kind = 'Issue');

create view task_summary with (security_invoker = on) as
select run_id, kind, status, due_flag, owner_id, count(*)::int as tasks
from task_board
group by run_id, kind, status, due_flag, owner_id;

create view task_grid with (security_invoker = on) as
select tb.task_id, tb.title, tb.notes, tb.status, tb.due_date, tb.due_flag, tb.done_on, tb.run_id, tb.return_id, tb.kind,
  case tb.kind when 'Return step' then 'Return task' else tb.kind end as kind_label,
  tb.parent_id, tb.parent_title, tb.owner_id, o.name as owner_name, tb.owner_role,
  coalesce(array_to_string(tb.blocked_by, ', '), '') as blocked_by, cardinality(tb.blocked_by) > 0 as is_blocked,
  tb.completes_stage,
  tb.category, tb.priority, tb.description, tb.raised_on, tb.raised_by, tb.waiting_on, tb.resolution, tb.source_ref,
  tb.customer_id, cu.name as customer_name,
  coalesce((select string_agg(h.return_id, ', ' order by h.return_id) from task_relations x join tasks h on h.task_id = x.to_task_id
            where x.from_task_id = tb.task_id and x.relation_type = 'Affects' and x.deleted_at is null and h.return_id is not null), '') as affects,
  (select count(*) from task_relations x where x.from_task_id = tb.task_id and x.relation_type = 'Affects' and x.deleted_at is null)::int as returns_affected
from task_board tb
left join owners o on o.owner_id = tb.owner_id
left join customers cu on cu.customer_id = tb.customer_id;

create view return_board with (security_invoker = on) as
with base as (
  select r.*, c.release_by, c.submit_by, c.expected_stage, c.as_of, c.run_month,
    g.customer_id, g.return_type_id, g.active_from, g.account_ref,
    t.name as type_name, t.country_code, t.region_code, coalesce(t.region_code, t.country_code) as place_code, t.tax_type, t.frequency, t.workflow,
    cu.name as customer_name,
    coalesce(r.statutory_due, statutory_due_for(g.return_type_id, c.run_month, r.period_end)) as authority_due,
    split_part(r.stage, ' ', 1)::int as stage_n,
    coalesce(r.collected, 0) - coalesce(r.calculated, 0) as gap,
    open_issues(r.return_id) as open_issues,
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

create view run_summary with (security_invoker = on) as
select run_id, flag, tier, stage_n, stage, count(*)::int as returns,
  sum(steps_total)::int as steps_total, sum(steps_done)::int as steps_done
from return_board
group by run_id, flag, tier, stage_n, stage;

create view return_grid with (security_invoker = on) as
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
