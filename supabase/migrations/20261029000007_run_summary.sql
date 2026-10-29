-- Counts for the run page, grouped in the database so a run of any size is one small answer.
create view run_summary with (security_invoker = on) as
select run_id, flag, tier, stage_n, stage, count(*)::int as returns,
  sum(steps_total)::int as steps_total, sum(steps_done)::int as steps_done
from return_board
group by run_id, flag, tier, stage_n, stage;

create view task_summary with (security_invoker = on) as
select run_id, kind, status, due_flag, owner_id, count(*)::int as tasks
from task_board
group by run_id, kind, status, due_flag, owner_id;
