-- What the grids show: one row per thing with names instead of ids, so every column can be filtered and sorted in the database.
-- One vocabulary: everything a person does is a task. A return's tasks hang off its return task.
create view task_grid with (security_invoker = on) as
select tb.task_id, tb.title, tb.notes, tb.status, tb.due_date, tb.due_flag, tb.done_on, tb.run_id, tb.return_id, tb.kind,
  case tb.kind when 'Return step' then 'Return task' when 'Return' then 'Return' when 'Run' then 'Run' else tb.kind end as kind_label,
  tb.parent_id, tb.parent_title, tb.owner_id, o.name as owner_name, tb.owner_role,
  coalesce(array_to_string(tb.blocked_by, ', '), '') as blocked_by, cardinality(tb.blocked_by) > 0 as is_blocked,
  tb.completes_stage
from task_board tb
left join owners o on o.owner_id = tb.owner_id;

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

create view issue_grid with (security_invoker = on) as
select i.issue_id, i.category, i.severity, i.status, i.opened_on, i.due_by, i.description, i.resolution, i.detected_by,
  (select count(*) from issue_links l where l.issue_id = i.issue_id and l.deleted_at is null and l.return_id is not null)::int as returns_affected,
  coalesce((select string_agg(coalesce(l.return_id, l.registration_id, l.customer_id), ', ' order by l.link_id)
    from issue_links l where l.issue_id = i.issue_id and l.deleted_at is null), '') as affects
from issues i
where i.deleted_at is null;
