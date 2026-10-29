import Link from "next/link";
import { PAGE_SIZE, withParams, type Search } from "@/lib/params";

export type Tone = "good" | "warn" | "bad" | "info" | "plain";

const TONES: Record<Tone, string> = {
  good: "bg-good-bg text-good",
  warn: "bg-warn-bg text-warn",
  bad: "bg-bad-bg text-bad",
  info: "bg-info-bg text-info",
  plain: "bg-soft text-muted",
};

export function Badge({ tone = "plain", children, title }: { tone?: Tone; children: React.ReactNode; title?: string }) {
  return <span title={title} className={`inline-block whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-medium ${TONES[tone]}`}>{children}</span>;
}

// A return's flag or a task's due flag, in the colour that says how worried to be
export function flagTone(flag: string | null | undefined): Tone {
  switch (flag) {
    case "Missed deadline": case "Late release": case "Filed late": case "Overdue": case "Blocked, no issue": return "bad";
    case "Submit at risk": case "Behind plan": case "Blocked": case "Due today": case "Due soon": case "can't tell": return "warn";
    case "Done": case "On track": case "met": return "good";
    case "Period open": case "In progress": return "info";
    default: return "plain";
  }
}

export function PageHead({ title, sub, children }: { title: string; sub?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {sub ? <div className="mt-0.5 text-muted">{sub}</div> : null}
      </div>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  );
}

export function Panel({ title, children, className = "" }: { title?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`min-w-0 rounded-lg border border-line bg-panel ${className}`}>
      {title ? <h2 className="border-b border-line px-4 py-2.5 text-sm font-medium">{title}</h2> : null}
      {children}
    </section>
  );
}

export function TableBox({ children }: { children: React.ReactNode }) {
  return <div className="overflow-x-auto rounded-lg border border-line bg-panel">{children}</div>;
}

export function Stat({ label, value, href, tone }: { label: string; value: React.ReactNode; href?: string; tone?: Tone }) {
  const color = tone ? { good: "text-good", warn: "text-warn", bad: "text-bad", info: "text-info", plain: "" }[tone] : "";
  const body = (
    <>
      <div className="text-xs tracking-wide text-muted uppercase">{label}</div>
      <div className={`num mt-1 text-2xl font-semibold ${color}`}>{value}</div>
    </>
  );
  const cls = "block rounded-lg border border-line bg-panel px-4 py-3";
  return href ? <Link href={href} className={`${cls} hover:border-accent`}>{body}</Link> : <div className={cls}>{body}</div>;
}

export function Pager({ path, sp, page, total }: { path: string; sp: Search; page: number; total: number }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const first = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const last = Math.min(total, page * PAGE_SIZE);
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-muted">
      <span className="num">{total === 0 ? "Nothing matches" : `${first.toLocaleString()}–${last.toLocaleString()} of ${total.toLocaleString()}`}</span>
      <span className="flex gap-2">
        {page > 1 ? <Link className="btn" href={withParams(path, sp, { page: page - 1 })}>Previous</Link> : null}
        {page < pages ? <Link className="btn" href={withParams(path, sp, { page: page + 1 })}>Next</Link> : null}
      </span>
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="px-4 py-8 text-center text-muted">{children}</div>;
}
