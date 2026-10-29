// One name for each thing, everywhere. If a screen needs a word for something, it comes from here.
//
// Run      a month's filing run (Nov 2026 run)
// Return   one filing for one registration and period
// Task     anything someone has to do; a return's tasks hang off it, and a run's tasks off the run
// Issue    a problem that blocks or puts returns at risk
// Rule     a check the workbench runs on every return: met, not met or can't tell
// Stage    how far a return has got (1 Not started … 9 Confirmed / paid); it follows the return's tasks
// Status   whether a task or a return is moving (a task: Not started, In progress, Done, Skipped)
// Health   how a return stands against its deadlines (On track, Behind plan, Late release, …)
// Timing   how a task stands against its due date (Overdue, Due today, Due soon, Upcoming)
// Review tier  A gets a second review, B doesn't, ? means a rule can't tell yet

export const TASK_KIND: Record<string, string> = {
  "Return step": "Return task",
  Return: "Return",
  Run: "Run",
};
export const taskKind = (k: string | null | undefined) => (k ? TASK_KIND[k] ?? k : "");

export const RULE_KIND: Record<string, string> = {
  Condition: "Definition",
  "Tier A": "Set review tier A",
  "Include step": "Include a task",
  "Leave out step": "Leave out a task",
  Flag: "Add a note",
};
export const ruleKind = (k: string | null | undefined) => (k ? RULE_KIND[k] ?? k : "");

export const RESULT = ["met", "not met", "can't tell"] as const;
