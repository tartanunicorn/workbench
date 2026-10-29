import { setTaskStatus } from "@/app/tasks/actions";

// One button for the next sensible move, and a way back. Forms work without JavaScript.
export function TaskStatus({ id, status, blocked }: { id: string; status: string | null; blocked: boolean }) {
  const moves: [string, string][] =
    status === "Not started" ? [["In progress", "Start"], ["Done", "Done"]]
    : status === "In progress" ? [["Done", "Done"], ["Not started", "Undo"]]
    : status === "Done" || status === "Skipped" ? [["Not started", "Reopen"]]
    : [];
  return (
    <form action={setTaskStatus} className="flex gap-1">
      <input type="hidden" name="task_id" value={id} />
      {moves.map(([to, label]) => (
        <button key={to} name="status" value={to} disabled={to === "Done" && blocked}
          title={to === "Done" && blocked ? "Finish the blocking task first" : undefined}
          className={`btn px-2 py-0.5 text-xs ${to === "Done" ? "btn-primary" : ""} disabled:cursor-not-allowed disabled:opacity-40`}>
          {label}
        </button>
      ))}
    </form>
  );
}
