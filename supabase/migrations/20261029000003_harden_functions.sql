-- Keep helper functions out of the API: is_member moves to a private schema the API doesn't expose.
create schema if not exists private;
grant usage on schema private to authenticated;

create function private.is_member() returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.members m where m.email = lower(auth.jwt() ->> 'email'))
$$;
revoke execute on function private.is_member() from public, anon;
grant execute on function private.is_member() to authenticated;

do $$
declare t text;
begin
  foreach t in array array['settings','owners','countries','regions','customers','runs','return_types','return_type_rules','registrations',
                           'returns','return_events','issues','issue_links','balances_notices','tasks','task_relations','ownerships','holidays'] loop
    execute format('alter policy %I on public.%I using (private.is_member()) with check (private.is_member())', t || '_members', t);
  end loop;
end $$;
alter policy members_read on public.members using (private.is_member());
drop function public.is_member();

alter function public.touch_updated_at() set search_path = '';
