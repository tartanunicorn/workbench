-- Sphere filing run: the 18 lists from the prototype workbook as Postgres tables.
-- Ids stay the readable text ids the workbook uses (RET-0001, TSK-00001), so the seed and the app carry over unchanged.
-- Every table has created_at, updated_at and deleted_at: nothing is hard-deleted.

create table settings (
  key text primary key,
  value text,
  notes text
);

create table owners (
  owner_id text primary key,
  name text not null,
  type text not null check (type in ('Internal','External','Bot')),
  team_or_company text,
  role_note text,
  capacity_per_run int,
  active boolean not null default true
);

create table countries (
  country_code text primary key check (country_code ~ '^[A-Z]{2}$'),
  name text not null,
  is_union boolean not null default false,
  currency text,
  notes text
);

create table regions (
  region_code text primary key,
  country_code text not null references countries,
  parent_region text references regions,
  name text not null,
  level text,
  notes text
);

create table customers (
  customer_id text primary key,
  name text not null,
  org_id text,
  tier text,
  status text not null default 'Active' check (status in ('Active','Hold','Offboarding','Closed')),
  release_owner text references owners,
  customer_approver text references owners,
  historical_scope text,
  internal_review boolean not null default false,
  notes text
);

create table runs (
  run_id text primary key,
  run_month date not null unique,
  period_start date not null,
  period_end date not null,
  status text not null default 'Open' check (status in ('Planned','Open','Closed')),
  notes text,
  check (period_end >= period_start)
);

create table return_types (
  return_type_id text primary key,
  name text not null,
  country_code text not null references countries,
  region_code text references regions,
  tax_type text not null check (tax_type in ('Sales','Use','Vendor use','Lease transaction','VAT','GST','PST')),
  frequency text not null check (frequency in ('Weekly','Semi-monthly','Monthly','Quarterly','Part-quarterly','Semi-annual','Annual')),
  workflow text not null check (workflow in ('Standard','WARP','Prepayment','Historical')),
  active boolean not null default true,
  notes text
);

-- One row per rule change. For a period, each field takes the latest row on or before the period end.
create table return_type_rules (
  rule_id text primary key,
  return_type_id text not null references return_types,
  field text not null check (field in ('due_rule','due_value','roll_forward','automation','default_preparer','default_reviewer')),
  value text,
  valid_from date not null,
  notes text,
  unique (return_type_id, field, valid_from),
  check (field <> 'due_rule' or value in ('Day of next month','Days after period end')),
  check (field <> 'automation' or value in ('Manual','WARP partial','WARP end to end'))
);

create table registrations (
  registration_id text primary key,
  customer_id text not null references customers,
  return_type_id text not null references return_types,
  account_source text,
  account_ref text,
  active_from date not null,
  active_to date,
  frequency_source text,
  verified_by text references owners,
  last_portal_check date,
  notes text,
  check (active_to is null or active_to >= active_from)
);

create table returns (
  return_id text primary key,
  registration_id text not null references registrations,
  run_id text not null references runs,
  period_start date not null,
  period_end date not null,
  kind text not null default 'Regular' check (kind in ('Regular','Historical','Amendment','Prepayment')),
  stage text not null default '1 Not started' check (stage in ('1 Not started','2 Data synced','3 Generated','4 In review','5 Ready to release','6 Released','7 Customer approved','8 Submitted','9 Confirmed / paid')),
  state text not null default 'Open' check (state in ('Open','Blocked','On hold','Done','Not required')),
  calculated numeric(14,2),
  collected numeric(14,2),
  due numeric(14,2),
  statutory_due date,
  released_on date,
  approved_on date,
  submitted_on date,
  confirmation_no text,
  reason text,
  notes text,
  unique (registration_id, period_start, kind),
  check (period_end >= period_start),
  check (state not in ('On hold','Not required') or reason is not null)
);

create table return_events (
  event_id text primary key,
  return_id text not null references returns,
  at timestamptz not null default now(),
  from_stage text, to_stage text, from_state text, to_state text,
  actor text references owners,
  source text check (source in ('Person','WARP','Import','Agent')),
  note text
);

create table issues (
  issue_id text primary key,
  category text,
  severity text check (severity in ('S1','S2','S3')),
  status text not null default 'Open' check (status in ('Open','Waiting on customer','Waiting on eng','Resolved','Won''t fix')),
  opened_on date,
  due_by date,
  description text,
  detected_by text,
  resolution text,
  systemic_fix boolean,
  source text,
  source_ref text
);

create table issue_links (
  link_id bigint generated always as identity primary key,
  issue_id text not null references issues,
  return_id text references returns,
  registration_id text references registrations,
  customer_id text references customers,
  check (num_nonnulls(return_id, registration_id, customer_id) = 1)
);

create table balances_notices (
  notice_id text primary key,
  customer_id text references customers,
  place text,
  kind text check (kind in ('Notice','Balance due','Credit','Reversed payment')),
  period text,
  amount numeric(14,2),
  received_on date,
  respond_by date,
  status text default 'Open' check (status in ('Open','In progress','Closed')),
  owner_id text references owners,
  issue_id text references issues
);

create table tasks (
  task_id text primary key,
  title text not null,
  kind text not null check (kind in ('Run','Return','Return step','Pre-run check','Milestone','Chase','Notice response','Follow-up','Other')),
  return_filter text,
  run_id text references runs,
  template_id text references tasks,
  return_type_id text references return_types,
  return_id text references returns,
  issue_id text references issues,
  customer_id text references customers,
  notice_id text references balances_notices,
  anchor text check (anchor in ('BD','CD','DUE')),
  "offset" int,
  completes_stage int check (completes_stage between 1 and 9),
  applies_to_tier text check (applies_to_tier in ('All','A')),
  owner_role text check (owner_role in ('Preparer','Reviewer','Release owner')),
  due_date date,
  status text check (status in ('Template','Not started','In progress','Done','Skipped')),
  done_on date,
  notes text,
  check (num_nonnulls(return_id, issue_id, customer_id, notice_id) <= 1),
  check (return_id is null or kind = 'Return'),
  check (kind <> 'Return' or (return_id is not null and run_id is not null)),
  check (kind <> 'Run' or run_id is not null),
  check (return_type_id is null or (run_id is null and completes_stage is not null and owner_role is not null)),
  check (run_id is not null or (anchor is not null and "offset" is not null) or kind in ('Run','Return')),
  check (run_id is null or status is distinct from 'Template')
);
create unique index tasks_one_header_per_return on tasks (return_id) where kind = 'Return';
create unique index tasks_one_header_per_run on tasks (run_id) where kind = 'Run';

create table task_relations (
  relation_id text primary key,
  from_task_id text not null references tasks,
  to_task_id text not null references tasks,
  relation_type text not null check (relation_type in ('Subtask of','Blocks','Duplicates','Relates to')),
  notes text,
  check (from_task_id <> to_task_id),
  unique (from_task_id, to_task_id, relation_type)
);
create unique index task_relations_one_parent on task_relations (from_task_id) where relation_type = 'Subtask of';

create table ownerships (
  ownership_id bigint generated always as identity primary key,
  owner_id text not null references owners,
  role text not null check (role in ('Preparer','Reviewer','Release owner','Customer approver','Run owner','Escalation','Issue owner','Waiting on','Task owner')),
  return_id text references returns,
  run_id text references runs,
  issue_id text references issues,
  task_id text references tasks,
  from_date date,
  to_date date,
  check (num_nonnulls(return_id, run_id, issue_id, task_id) = 1),
  check (to_date is null or from_date is null or to_date >= from_date)
);

create table holidays (
  date date not null,
  calendar text not null,
  primary key (date, calendar)
);

-- created / updated / soft-delete stamps on every table, and foreign-key indexes
do $$
declare t text;
begin
  foreach t in array array['settings','owners','countries','regions','customers','runs','return_types','return_type_rules','registrations',
                           'returns','return_events','issues','issue_links','balances_notices','tasks','task_relations','ownerships','holidays'] loop
    execute format('alter table %I add column created_at timestamptz not null default now(),
                                  add column updated_at timestamptz not null default now(),
                                  add column deleted_at timestamptz', t);
  end loop;
end $$;

create function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

do $$
declare t text;
begin
  foreach t in array array['settings','owners','countries','regions','customers','runs','return_types','return_type_rules','registrations',
                           'returns','return_events','issues','issue_links','balances_notices','tasks','task_relations','ownerships','holidays'] loop
    execute format('create trigger %I before update on %I for each row execute function touch_updated_at()', t || '_touch', t);
  end loop;
end $$;

create index on returns (run_id);
create index on returns (registration_id);
create index on return_events (return_id);
create index on tasks (run_id);
create index on tasks (template_id);
create index on task_relations (to_task_id);
create index on ownerships (return_id);
create index on ownerships (task_id);
create index on registrations (customer_id);
create index on return_type_rules (return_type_id);
