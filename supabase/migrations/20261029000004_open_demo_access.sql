-- Demo mode: no sign-in. Anyone with the app's address can read and write every table.
-- To lock it again, drop these policies; the members-only policies are still in place underneath.
do $$
declare t text;
begin
  foreach t in array array['settings','owners','countries','regions','customers','runs','return_types','return_type_rules','registrations',
                           'returns','return_events','issues','issue_links','balances_notices','tasks','task_relations','ownerships','holidays'] loop
    execute format('create policy %I on public.%I for all to anon, authenticated using (true) with check (true)', t || '_open_demo', t);
  end loop;
end $$;
