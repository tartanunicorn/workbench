-- Signed-in people can read and write everything; anyone else gets nothing.
-- Tighten per role (preparer, reviewer, viewer) once roles are agreed.
do $$
declare t text;
begin
  foreach t in array array['settings','owners','countries','regions','customers','runs','return_types','return_type_rules','registrations',
                           'returns','return_events','issues','issue_links','balances_notices','tasks','task_relations','ownerships','holidays'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I on %I for all to authenticated using (true) with check (true)', t || '_signed_in', t);
  end loop;
end $$;
