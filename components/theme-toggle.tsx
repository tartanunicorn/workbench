"use client";
import { useEffect, useState } from "react";

type Mode = "system" | "light" | "dark";
const KEY = "workbench-theme";

function apply(mode: Mode) {
  if (mode === "system") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", mode);
}

// Runs before the page paints so a chosen theme never flashes the other one
export const themeScript = `try{var m=localStorage.getItem("${KEY}");if(m==="light"||m==="dark")document.documentElement.setAttribute("data-theme",m)}catch(e){}`;

export function ThemeToggle() {
  const [mode, setMode] = useState<Mode>("system");
  useEffect(() => {
    try { const m = localStorage.getItem(KEY); if (m === "light" || m === "dark") setMode(m); } catch {}
  }, []);
  const choose = (m: Mode) => {
    setMode(m);
    apply(m);
    try { if (m === "system") localStorage.removeItem(KEY); else localStorage.setItem(KEY, m); } catch {}
  };
  return (
    <div role="radiogroup" aria-label="Theme" className="flex rounded border border-line text-xs">
      {(["light", "dark", "system"] as const).map((m) => (
        <button key={m} role="radio" aria-checked={mode === m} onClick={() => choose(m)}
          className={`px-2 py-1 capitalize ${mode === m ? "bg-ink text-bg" : "text-muted hover:text-ink"}`}>
          {m}
        </button>
      ))}
    </div>
  );
}
