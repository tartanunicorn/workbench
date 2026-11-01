-- Database checks, run in CI after every migration has been applied to an empty database (the baseline brings the sample data).
-- Each check raises an error when it fails, and everything rolls back, so the database is left as it was.
\set ON_ERROR_STOP on
begin;

create function pg_temp.expect(what text, got bigint, want bigint) returns void language plpgsql as $$
begin
  if got is distinct from want then raise exception '%: expected %, got %', what, want, got; end if;
  raise notice 'ok: % = %', what, got;
end $$;

-- The rules sort the sample runs into the same review tiers as the original tracker
select pg_temp.expect('Nov 2026 returns',  (select count(*) from return_board where run_id = 'RUN-2026-11'), 964);
select pg_temp.expect('Nov 2026 tier A',   (select count(*) from return_board where run_id = 'RUN-2026-11' and tier = 'A'), 400);
select pg_temp.expect('Nov 2026 tier B',   (select count(*) from return_board where run_id = 'RUN-2026-11' and tier = 'B'), 564);
select pg_temp.expect('Oct 2026 returns',  (select count(*) from return_board where run_id = 'RUN-2026-10'), 777);
select pg_temp.expect('Oct 2026 tier A',   (select count(*) from return_board where run_id = 'RUN-2026-10' and tier = 'A'), 114);

-- Issues are tasks, and the old tables are gone
select pg_temp.expect('issue tasks',       (select count(*) from tasks where kind = 'Issue'), 18);
select pg_temp.expect('old issue tables',  (select count(*) from pg_tables where schemaname = 'public' and tablename in ('issues', 'issue_links')), 0);

-- Returns are tasks: the returns table is gone, every return is a task of kind Return with its fields in details
select pg_temp.expect('returns table',     (select count(*) from pg_tables where schemaname = 'public' and tablename = 'returns'), 0);
select pg_temp.expect('return tasks',      (select count(*) from tasks where kind = 'Return' and deleted_at is null), 1741);

-- details are checked against the kind's fields
create function pg_temp.rejects(stmt text) returns bigint language plpgsql as $$
begin
  execute stmt;
  return 0;
exception when others then
  raise notice 'rejected as it should be: %', sqlerrm;
  return 1;
end $$;
select pg_temp.expect('unknown field rejected',  pg_temp.rejects($$update tasks set details = details || '{"colour": "red"}' where task_id = (select min(task_id) from tasks where kind = 'Return')$$), 1);
select pg_temp.expect('wrong type rejected',     pg_temp.rejects($$update tasks set details = details || '{"calculated": "lots"}' where task_id = (select min(task_id) from tasks where kind = 'Return')$$), 1);
select pg_temp.expect('bad option rejected',     pg_temp.rejects($$update tasks set details = details || '{"stage": "10 Done"}' where task_id = (select min(task_id) from tasks where kind = 'Return')$$), 1);
select pg_temp.expect('missing field rejected',  pg_temp.rejects($$update tasks set details = details - 'period_end' where task_id = (select min(task_id) from tasks where kind = 'Return')$$), 1);
select pg_temp.expect('details on a plain task rejected', pg_temp.rejects($$update tasks set details = '{"calculated": 1}' where task_id = (select min(task_id) from tasks where kind = 'Issue')$$), 1);

-- Entering amounts re-checks the rules: a large gap on an open tier B return makes it tier A
savepoint amounts;
create temp table pick on commit drop as
  select return_id from return_board where run_id = 'RUN-2026-11' and tier = 'B' and stage_n < 6 order by return_id limit 1;
select set_return_amounts((select return_id from pick), 100000, 1);
select pg_temp.expect('large gap makes tier A', (select count(*) from return_board where return_id = (select return_id from pick) and tier = 'A'), 1);
rollback to savepoint amounts;

-- Kicking off the next run builds a return task, with its tasks, for every registration due
savepoint kickoff;
select pg_temp.expect('Dec 2026 returns kicked off', (select (kick_off_and_evaluate() ->> 'returns')::bigint), 777);
select pg_temp.expect('Dec 2026 return tasks',       (select count(*) from return_board where run_id = 'RUN-2026-12'), 777);
select pg_temp.expect('Dec 2026 tier A',             (select count(*) from return_board where run_id = 'RUN-2026-12' and tier = 'A'), 89);
rollback to savepoint kickoff;

-- Closing every open issue takes the returns they affect out of tier A
savepoint issues;
update tasks set status = 'Done', waiting_on = null where kind = 'Issue' and status not in ('Done', 'Skipped');
select pg_temp.expect('Nov 2026 tier A with no open issues', (select count(*) from return_board where run_id = 'RUN-2026-11' and tier = 'A'), 372);
rollback to savepoint issues;
select pg_temp.expect('Nov 2026 tier A after reopening', (select count(*) from return_board where run_id = 'RUN-2026-11' and tier = 'A'), 400);

-- Registering customers: a new one is registered and gets a setup task, an existing registration and an unknown id are skipped
insert into customers (name) values ('CI check customer');
create temp table reg on commit drop as
  select register_customers('RT-001', jsonb_build_array(
    jsonb_build_object('customer_id', (select customer_id from customers where name = 'CI check customer'), 'active_from', '2026-12-01'),
    jsonb_build_object('customer_id', 'C001', 'active_from', '2026-12-01'),
    jsonb_build_object('customer_id', 'NOPE'))) as r;
select pg_temp.expect('customers registered', (select jsonb_array_length(r -> 'created') from reg), 1);
select pg_temp.expect('customers skipped',    (select jsonb_array_length(r -> 'skipped') from reg), 2);
select pg_temp.expect('setup tasks added',    (select (r ->> 'tasks')::bigint from reg), 1);

rollback;
