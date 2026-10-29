"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  ["/tasks", "Tasks"],
  ["/runs", "Runs"],
  ["/returns", "Returns"],
  ["/issues", "Issues"],
  ["/customers", "Customers"],
  ["/registration-types", "Registration types"],
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
            className={`rounded-md px-2.5 py-1 transition-colors ${on ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
