"use client";
import { useEffect, useState } from "react";
import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { Button } from "@/components/ui-kit/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui-kit/dropdown-menu";

export type Mode = "system" | "light" | "dark";
const KEY = "workbench-theme";
const dark = () => window.matchMedia("(prefers-color-scheme: dark)").matches;

function apply(mode: Mode) {
  document.documentElement.classList.toggle("dark", mode === "dark" || (mode === "system" && dark()));
}

export function readMode(): Mode {
  try { const m = localStorage.getItem(KEY); if (m === "light" || m === "dark") return m; } catch {}
  return "system";
}

// Runs before the page paints so a chosen theme never flashes the other one
export const themeScript = `try{var m=localStorage.getItem("${KEY}");if(m==="dark"||(m!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`;

export function ThemeToggle() {
  const [mode, setMode] = useState<Mode>("system");
  useEffect(() => {
    setMode(readMode());
    // "System" follows the computer when it switches between light and dark
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const follow = () => { if (readMode() === "system") apply("system"); };
    mq.addEventListener("change", follow);
    return () => mq.removeEventListener("change", follow);
  }, []);
  const choose = (m: Mode) => {
    setMode(m);
    apply(m);
    try { if (m === "system") localStorage.removeItem(KEY); else localStorage.setItem(KEY, m); } catch {}
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Theme">
          <SunIcon className="dark:hidden" /><MoonIcon className="hidden dark:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={mode} onValueChange={(v) => choose(v as Mode)}>
          <DropdownMenuRadioItem value="light"><SunIcon />Light</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark"><MoonIcon />Dark</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system"><MonitorIcon />System</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
