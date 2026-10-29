import Link from "next/link";
import { cn } from "@/lib/utils";
import { Badge as KitBadge } from "@/components/ui-kit/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui-kit/card";

export type Tone = "good" | "warn" | "bad" | "info" | "plain";

const TONES: Record<Tone, string> = {
  good: "bg-good-bg text-good",
  warn: "bg-warn-bg text-warn",
  bad: "bg-bad-bg text-bad",
  info: "bg-info-bg text-info",
  plain: "bg-muted text-muted-foreground",
};

export function Badge({ tone = "plain", children, title }: { tone?: Tone; children: React.ReactNode; title?: string }) {
  return <KitBadge title={title} className={cn("rounded-md", TONES[tone])}>{children}</KitBadge>;
}

// A return's flag or a task's due flag, in the colour that says how worried to be
export function flagTone(flag: string | null | undefined): Tone {
  switch (flag) {
    case "Missed deadline": case "Late release": case "Filed late": case "Overdue": case "Blocked, no issue": return "bad";
    case "Submit at risk": case "Behind plan": case "Blocked": case "Due today": case "Due soon": case "can't tell": return "warn";
    case "Done": case "On track": case "met": case "Active": return "good";
    case "Period open": case "In progress": case "Waiting": case "Starts later": return "info";
    default: return "plain";
  }
}

export function PageHead({ title, sub, children }: { title: string; sub?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {sub ? <div className="mt-0.5 text-muted-foreground">{sub}</div> : null}
      </div>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  );
}

export function Panel({ title, action, children, className = "" }: { title?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <Card className={cn("min-w-0 gap-0 overflow-hidden py-0", className)}>
      {title ? (
        <CardHeader className="flex items-center justify-between gap-2 border-b px-4 py-3 [.border-b]:pb-3">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {action}
        </CardHeader>
      ) : null}
      {children}
    </Card>
  );
}

export function TableBox({ children }: { children: React.ReactNode }) {
  return <Card className="h-fit gap-0 overflow-hidden py-0">{children}</Card>;
}

export function Stat({ label, value, href, tone }: { label: string; value: React.ReactNode; href?: string; tone?: Tone }) {
  const color = tone ? { good: "text-good", warn: "text-warn", bad: "text-bad", info: "text-info", plain: "" }[tone] : "";
  const body = (
    <Card className={cn("gap-1 px-4 py-3", href && "transition-colors hover:border-ring")}>
      <div className="text-xs tracking-wide text-muted-foreground uppercase">{label}</div>
      <div className={cn("num text-2xl font-semibold", color)}>{value}</div>
    </Card>
  );
  return href ? <Link href={href} className="block">{body}</Link> : body;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="px-4 py-8 text-center text-muted-foreground">{children}</div>;
}

// A row of links that look like tabs: the run, the view. The choice lives in the URL.
export function Segments({ items, className }: { items: { key: string; label: React.ReactNode; href: string; on: boolean }[]; className?: string }) {
  return (
    <div className={cn("inline-flex w-fit flex-wrap items-center rounded-lg bg-muted p-[3px] text-sm text-muted-foreground", className)}>
      {items.map((i) => (
        <Link key={i.key} href={i.href} aria-current={i.on ? "page" : undefined}
          className={cn("rounded-md px-3 py-1 font-medium transition-colors hover:text-foreground",
            i.on && "bg-background text-foreground shadow-sm dark:bg-input/30")}>
          {i.label}
        </Link>
      ))}
    </div>
  );
}
