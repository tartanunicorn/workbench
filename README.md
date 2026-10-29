# Workbench

Live: https://workbench-sandy-nu.vercel.app

An operations workbench for the monthly tax filing run, built around tasks. Every run and every return is a task, and the tasks that complete a return hang off it. The logic lives in Postgres (Supabase); the app is Next.js and only shows and changes what each screen needs.

## Principles

- **Tasks first.** The home screen is the task list: everything the team has to do, soonest first, with every column filterable and sortable in the database. The run and view live in the URL, so a view is a link you can send.
- **Logic in the database.** Business days, due dates, kick-off, stage changes and the rules are Postgres functions, views and triggers. The app never re-implements them, so any client (a script, an MCP server, another app) gets the same answers.
- **Rules as data.** Workbench owns the behaviour (check a condition, set the tier, include or leave out a task, add a note). The company owns the vocabulary: what a "large gap" or a "new registration" means is a row in `rules`, tuned on the Rules screen.
- **Nothing is silent.** Every rule check comes out *met*, *not met* or *can't tell*, with its evidence, and a return keeps its results. Once a return is released its results are frozen.
- **Nothing is deleted.** Every table has `deleted_at`.

## Words

One name for each thing, on every screen (`lib/words.ts`):

| Word | Means |
|---|---|
| Run | A month's filing run, such as the Nov 2026 run |
| Registration type | What customers are registered to: a place, tax type and frequency (US-TX Sales · Monthly), with dated rules and the tasks every return of the type gets |
| Registration | A customer registered to a registration type from a start date, with their account number |
| Return | One filing for one registration and period |
| Task | Anything someone has to do. A return's tasks hang off the return; a run's tasks hang off the run |
| Issue | A task of kind Issue: a problem that blocks returns or puts them at risk. It *affects* the returns it touches |
| Priority | P1 (most urgent) to P3 |
| Rule | A check run on every return. It comes out met, not met or can't tell |
| Stage | How far a return has got, from 1 Not started to 9 Confirmed / paid. It follows the return's tasks |
| Status | Whether a task or return is moving. A task is Not started, In progress, Waiting (on someone named), Done or Skipped |
| Health | How a return stands against its deadlines: On track, Behind plan, Late release and so on |
| Timing | How a task stands against its due date: Overdue, Due today, Due soon, Upcoming |
| Review tier | A gets a second review, B doesn't, ? means a rule can't tell yet |

## What's here

| Path | What it is |
|---|---|
| `app/` | Next.js App Router screens: Tasks, Runs (with kick-off), a run's dashboard, Returns, a return with its tasks and the rules' reasons, Issues, Customers, Registration types (with registering customers), Rules |
| `components/grids/`, `app/api/grid` | AG Grid over database views: column filters, sorting and paging run in Postgres, 100 rows at a time |
| `components/ui-kit/` | [shadcn/ui](https://ui.shadcn.com) components (new-york, neutral); add more with `npx shadcn add <name>` |
| `components/`, `lib/` | Workbench's own pieces built on them, the Supabase client, URL filters, formatting, and the evidence reader |
| `lib/database.types.ts` | Types generated from the database (regenerate after a schema change) |
| `supabase/migrations/` | The baseline (001: production on 29 Oct 2026, schema and sample data), then each change: functions out of the API (003), issues folded into tasks (010), registration types (011) and customer setup (012) |
| `scripts/`, `data/` | How the sample was built from the original tracker export |
| `tests/` | Unit tests (`npm test`) |

## The model in one paragraph

**Registration types** say what is filed (place, tax type, frequency, workflow). Their rules (due day, automation, default owners) are **registration type rules**, dated rows that stack field by field. A **registration** links a customer to a registration type from a start date; registering a customer without an account number adds an Onboarding task to collect their portal login. **Kick off** creates a **run**, a **return** for every registration with a period ending that month, the return's **ownerships**, a header **task** for the run and each return, and each return's tasks with due dates. Then the **rules** are checked for every return: they set the tier, leave out tasks a return doesn't need (a tier B return skips the second review), and raise flags. **Task relations** link tasks: *Subtask of* builds the tree (task → return → run), *Blocks* stops a task until another is done, and *Affects* ties an issue to a return. A return's stage follows its finished tasks. **Issues** are tasks too: an issue *affects* returns (a task relation to each return's task) or belongs to a customer, and an open issue makes a return tier A.

## Set up

1. **Database.** Create a Supabase project and run `supabase db push` (see Database changes). The baseline migration brings the sample data: the closed Oct 2026 run and the open Nov 2026 run, customers anonymised.
2. **Config.** Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (the demo project's values are the defaults in `lib/db.ts`).
3. **Run.** `npm install`, then `npm run dev`. `npm test` runs the unit tests and `npm run build` the production build.
4. **Deploy.** Vercel builds `main` automatically, and the Deploy database workflow migrates production.

## Database changes

Every change to the database is a migration file in `supabase/migrations/`, and nobody changes production by hand. The first, `20261029000001_baseline.sql`, is production as it was on 29 Oct 2026, schema and sample data together (checked table by table against production); everything after it is a tracked change.

1. **Write a migration.** Add the next numbered file, such as `20261029000013_what_it_does.sql`. Never edit a migration that has reached main; add another one instead.
2. **Open a pull request.** The Check workflow starts an empty Postgres, applies every migration and runs `tests/db/checks.sql` (tier counts, issues as tasks, registering customers). It also regenerates `lib/database.types.ts` and fails if the committed types don't match; the generated file is attached to the run as `database-types`. The App job typechecks and runs the unit tests.
3. **Merge to main.** The Deploy database workflow links the production project and runs `supabase db push`, which applies only the migrations production doesn't have yet. It runs in the `production` environment, so it can require an approval.

Secrets, set in GitHub under Settings → Secrets and variables → Actions (or on the `production` environment): `SUPABASE_ACCESS_TOKEN` (a personal access token from supabase.com/dashboard/account/tokens), `SUPABASE_DB_PASSWORD` (the database password) and `SUPABASE_PROJECT_ID`.

Locally, `supabase db start` (needs Docker) builds the same database the check uses.

## Access

Right now it's in **demo mode**: no sign-in, and anyone with the address can read and write (the `*_open_demo` policies). To lock it down, add people to `members`, turn on Supabase Auth, and drop the `*_open_demo` policies; then only members can read or write.
