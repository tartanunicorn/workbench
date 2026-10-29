"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  ["/tasks", "Tasks"],
  ["/runs", "Runs"],
  ["/returns", "Returns"],
  ["/issues", "Issues"],
  ["/rules", "Rules"],
] as const;

export function Nav() {
  const path = usePathname();
  return (
    <nav className="flex flex-wrap gap-1">
      {LINKS.map(([href, label]) => {
        const on = path === href || path.startsWith(`${href}/`);
        return (
          <Link key={href} href={href}
            className={`rounded-md px-2.5 py-1 ${on ? "bg-soft font-medium text-ink" : "text-muted hover:text-ink"}`}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
