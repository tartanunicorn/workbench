-- Only people on the members list can read or write; everyone else, signed in or not, gets nothing.
-- Add someone: insert into members (email) values ('name@company.com');
create table members (
  email text primary key check (email = lower(email)),
  added_at timestamptz not null default now()
);
alter table members enable row level security;

create function is_member() returns boolean language sql stable security definer set search_path from current as $$
  select exists (select 1 from members m where m.email = lower(auth.jwt() ->> 'email'))
$$;
revoke execute on function is_member() from public;
grant execute on function is_member() to authenticated;

create policy members_read on members for select to authenticated using (is_member());

do $$
declare t text;
begin
  foreach t in array array['settings','owners','countries','regions','customers','runs','return_types','return_type_rules','registrations',
                           'returns','return_events','issues','issue_links','balances_notices','tasks','task_relations','ownerships','holidays'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I on %I for all to authenticated using (is_member()) with check (is_member())', t || '_members', t);
  end loop;
end $$;
