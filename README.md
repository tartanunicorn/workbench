# Workbench

Live: https://workbench-sandy-nu.vercel.app

An operations workbench for the monthly tax filing run, built around tasks. Every run and every return is a task, and the steps that complete a return hang off it. The data lives in Supabase (Postgres) and the app is one static page.

## What's here

| Path | What it is |
|---|---|
| `app/index.html` | The app: run dashboard, returns, customers, owners, tasks, issues, and an editable data view of every table |
| `app/config.js` | The Supabase URL and publishable key the browser uses |
| `supabase/migrations/` | The schema (18 tables with keys, checks and soft-delete stamps), then the access rules |
| `app/seed/*.json` | The sample data, one file per table. An empty database loads these automatically the first time the app opens |
| `supabase/seed.sql` | The same sample data as SQL, if you'd rather load it in the SQL editor |
| `data/sample_db.xlsx` | Where the sample came from: the closed Oct 2026 run and the open Nov 2026 run, with customers anonymised |
| `scripts/make_sample_db.py` | Builds the sample workbook from the original tracker export |
| `scripts/make_seed.py` | Sample workbook → `seed.sql` |
| `vercel.json` | Serves `app/` as a static site |

## The model in one paragraph

**Return types** say what is filed (place, tax type, frequency, workflow). Their rules (due day, automation, default owners) are **return type rules**, dated rows that stack field by field. A **registration** links a customer to a return type for a date range. **Kick off next run** creates a **run**, a **return** for every registration with a period ending that month, the return's **ownerships**, a header **task** for the run and each return, and each return's checklist steps copied from its type's templates with due dates. **Task relations** link tasks: *Subtask of* builds the tree (step → return → run), and *Blocks* stops a step until another task is done. A return's stage follows its ticked steps. **Issues** link to returns, registrations or customers. Nothing is deleted: every table has `deleted_at`.

## Set up

1. **Database.** Create a Supabase project. Run the files in `supabase/migrations/` in order in the SQL editor, or run `supabase db push`.
2. **Config.** Put the project URL and publishable key into `app/config.js`.
3. **Deploy.** Import the repo into Vercel. There is no build step: `vercel.json` serves `app/`.

The first time the app opens on an empty database it loads the sample data itself (about 40,000 rows, under a minute).

Locally: `cd app && python3 -m http.server 8000`.

## Access

Right now it's in **demo mode**: no sign-in, and anyone with the address can read and write (`open_demo` policies, `requireSignIn: false`). To lock it down:
1. Add people: `insert into members (email) values ('you@company.com');`
2. In Authentication → URL configuration, set the Site URL to the app's address and add `<address>/**` to Redirect URLs.
3. Drop the `*_open_demo` policies, and set `requireSignIn: true` in `app/config.js`.

Then only members can read or write.

## How saving works

The app loads every table when it opens and works in memory, so the run dashboard and checks are instant. **Save** writes only rows that changed or are new, in foreign-key order, in batches of 500. The database enforces the rules the spreadsheet couldn't, for example:
- a return is unique on registration, period and kind
- an ownership or issue link points at exactly one thing
- a task has at most one parent, and each run and each return has exactly one header task

The app's Data tab also runs the same checks on every load and lists anything that breaks them.
