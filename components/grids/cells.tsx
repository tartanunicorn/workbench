"use client";
import Link from "next/link";
import type { ICellRendererParams } from "ag-grid-community";
import { Badge, flagTone, type Tone } from "@/components/ui";

// Cells shared by the grids: a badge in the colour of its meaning, and links to the thing a row belongs to
export function BadgeCell(p: ICellRendererParams) {
  if (!p.value) return null;
  return <Badge tone={flagTone(p.value)}>{p.value}</Badge>;
}

export function TierCell(p: ICellRendererParams) {
  if (!p.value) return null;
  const tone: Tone = p.value === "A" ? "warn" : p.value === "?" ? "info" : "plain";
  const why = p.value === "A" ? p.data?.tier_reasons : p.value === "?" ? `Can't tell yet: ${p.data?.tier_unknowns}` : "No tier A reason applies";
  return <Badge tone={tone} title={why}>{p.value}</Badge>;
}

export function linkCell(href: (data: Record<string, unknown>) => string | null) {
  return function LinkCell(p: ICellRendererParams) {
    if (!p.data || p.value == null) return null;
    const h = href(p.data);
    return h ? <Link href={h} className="underline decoration-border underline-offset-2 hover:decoration-foreground">{p.value}</Link> : <>{p.value}</>;
  };
}

export function PriorityCell(p: ICellRendererParams) {
  if (!p.value) return null;
  return <Badge tone={p.value === "P1" ? "bad" : p.value === "P2" ? "warn" : "plain"}>{p.value}</Badge>;
}

// The returns an issue affects, each a link
export function AffectsCell(p: ICellRendererParams) {
  if (!p.value) return null;
  return (
    <span className="flex gap-2 overflow-hidden">
      {String(p.value).split(", ").map((id) => (
        <Link key={id} href={`/returns/${id}`} className="font-mono text-xs underline decoration-border underline-offset-2 hover:decoration-foreground">{id}</Link>
      ))}
    </span>
  );
}
