import { measureLabel, opLabel, show, type EvidenceNode } from "@/lib/evidence";
import { Badge, flagTone } from "./ui";

export function Evidence({ nodes, depth = 0 }: { nodes: EvidenceNode[]; depth?: number }) {
  if (!nodes.length) return null;
  return (
    <ul className={depth ? "mt-1 ml-4 space-y-1 border-l border-border pl-3" : "space-y-1"}>
      {nodes.map((n, i) => (
        <li key={i} className="text-sm">
          {n.type === "condition" ? (
            <>
              <span className="font-medium">{n.name}</span> <Badge tone={resultTone(n.result)}>{n.result}</Badge>
              <Evidence nodes={n.children} depth={depth + 1} />
            </>
          ) : n.type === "fact" ? (
            <span className="text-muted-foreground">
              {measureLabel(n.measure)} {opLabel(n.op)} {show(n.value, n.measure)}: <span className="text-foreground">{n.why ?? `it is ${show(n.actual, n.measure)}`}</span>
            </span>
          ) : <span className="text-bad">{n.message}</span>}
        </li>
      ))}
    </ul>
  );
}

export function resultTone(result: string | null | undefined) {
  return result === "not met" ? "plain" : flagTone(result);
}
