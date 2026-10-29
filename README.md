# Workbench

Live: https://workbench-sandy-nu.vercel.app

An operations workbench for the monthly tax filing run, built around tasks. Every run and every return is a task, and the steps that complete a return hang off it. The logic lives in Postgres (Supabase); the app is Next.js and only shows and changes what each screen needs.

## Principles

- **Tasks first.** The home screen is the task list: everything the team has to do, soonest first, filterable by run, owner, kind and due date. Filters live in the URL, so every view is a link you can send.
- **Logic in the database.** Business days, due dates, kick-off, stage changes and the rules are Postgres functions, views and triggers. The app never re-implements them, so any client (a script, an MCP server, another app) gets the same answers.
- **Rules as data.** Workbench owns the behaviour (check a condition, set the tier, include or leave out a step, raise a flag). The company owns the vocabulary: what a "large gap" or a "new registration" means is a row in `rules`, tuned on the Rules screen.
- **Nothing is silent.** Every rule check comes out *met*, *not met* or *can't tell*, with its evidence, and a return keeps its results. Once a return is released its results are frozen.
- **Nothing is deleted.** Every table has `deleted_at`.

## What's here

| Path | What it is |
|---|---|
| `app/` | Next.js App Router screens: Tasks, Runs (with kick-off), a run's dashboard, Returns, a return with its checklist and the rules' reasons, Issues, Rules |
| `components/`, `lib/` | Shared UI, the Supabase client, URL filters, formatting, and the evidence reader |
| `lib/database.types.ts` | Types generated from the database (regenerate after a schema change) |
| `supabase/migrations/` | Schema, access, demo access, the domain logic (005), rules as data (006), and the summary views (007, 008) |
| `supabase/seed.sql` | Sample data: the closed Oct 2026 run and the open Nov 2026 run, customers anonymised |
| `scripts/`, `data/` | How the sample was built from the original tracker export |
| `tests/` | Unit tests (`npm test`) |

## The model in one paragraph

**Return types** say what is filed (place, tax type, frequency, workflow). Their rules (due day, automation, default owners) are **return type rules**, dated rows that stack field by field. A **registration** links a customer to a return type for a date range. **Kick off** creates a **run**, a **return** for every registration with a period ending that month, the return's **ownerships**, a header **task** for the run and each return, and each return's checklist steps with due dates. Then the **rules** are checked for every return: they set the tier, leave out steps a return doesn't need (a tier B return skips the second review), and raise flags. **Task relations** link tasks: *Subtask of* builds the tree (step → return → run), and *Blocks* stops a step until another is done. A return's stage follows its ticked steps. **Issues** link to returns, registrations or customers, and an open issue makes a return tier A.

## Set up

1. **Database.** Create a Supabase project and run `supabase/migrations/` in order (or `supabase db push`), then `supabase/seed.sql`. Because the seed loads after the rules, check them once: `select evaluate_run(run_id) from runs;`
2. **Config.** Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (the demo project's values are the defaults in `lib/db.ts`).
3. **Run.** `npm install`, then `npm run dev`. `npm test` runs the unit tests and `npm run build` the production build.
4. **Deploy.** Vercel builds `main` automatically.

## Access

Right now it's in **demo mode**: no sign-in, and anyone with the address can read and write (the `*_open_demo` policies). To lock it down, add people to `members`, turn on Supabase Auth, and drop the `*_open_demo` policies; then only members can read or write.
