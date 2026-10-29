# Workbench

An operations workbench for the monthly tax filing run, built around tasks. Every run and every return is a task, and the steps that complete a return hang off it. The data lives in Supabase (Postgres) and the app is one static page.

## What's here

| Path | What it is |
|---|---|
| `app/index.html` | The app: run dashboard, returns, customers, owners, tasks, issues, and an editable data view of every table |
| `app/config.js` | The Supabase URL and publishable key the browser uses |
| `supabase/migrations/` | The schema (18 tables with keys, checks and soft-delete stamps), then the access rules |
| `supabase/seed.sql` | The sample data as SQL, generated from `data/sample_db.xlsx` |
| `data/sample_db.xlsx` | The sample workbook: the closed Oct 2026 run and the open Nov 2026 run, with customers anonymised |
| `scripts/make_sample_db.py` | Builds the sample workbook from the original tracker export |
| `scripts/make_seed.py` | Workbook → `seed.sql` |
| `vercel.json` | Serves `app/` as a static site |

## The model in one paragraph

**Return types** say what is filed (place, tax type, frequency, workflow). Their rules (due day, automation, default owners) are **return type rules**, dated rows that stack field by field. A **registration** links a customer to a return type for a date range. **Kick off next run** creates a **run**, a **return** for every registration with a period ending that month, the return's **ownerships**, a header **task** for the run and each return, and each return's checklist steps copied from its type's templates with due dates. **Task relations** link tasks: *Subtask of* builds the tree (step → return → run), and *Blocks* stops a step until another task is done. A return's stage follows its ticked steps. **Issues** link to returns, registrations or customers. Nothing is deleted: every table has `deleted_at`.

## Set up

1. **Database.** Create a Supabase project. Run the files in `supabase/migrations/` in order in the SQL editor, or run `supabase db push`.
2. **Members.** Only emails in the `members` table can read or write: `insert into members (email) values ('you@company.com');`
3. **Sign-in.** In Authentication → URL configuration, set the Site URL to the app's address (the Vercel URL, or `http://localhost:8000` locally). Add the same address to Redirect URLs.
4. **Config.** Put the project URL and publishable (anon) key into `app/config.js`.
5. **Data.** Either run `supabase/seed.sql` in the SQL editor, or open the app on the empty database, choose `data/sample_db.xlsx` and press Save.
6. **Deploy.** Import the repo into Vercel. There is no build step: `vercel.json` serves `app/`.

Locally: `cd app && python3 -m http.server 8000`.

## How saving works

The app loads every table when it opens and works in memory, so the run dashboard and checks are instant. **Save** writes only rows that changed or are new, in foreign-key order, in batches of 500. The database enforces the rules the spreadsheet couldn't, for example:
- a return is unique on registration, period and kind
- an ownership or issue link points at exactly one thing
- a task has at most one parent, and each run and each return has exactly one header task

The app's Data tab also runs the same checks on every load and lists anything that breaks them.
