-- Database checks, run in CI after every migration and the seed have loaded and the rules have been checked once.
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
