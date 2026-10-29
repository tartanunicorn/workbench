// Plain form pieces in the workbench's look. Forms post to server actions, so they work before any script loads.

export function Field({ label, children, hint, wide }: { label: string; children: React.ReactNode; hint?: string; wide?: boolean }) {
  return (
    <label className={`flex min-w-0 flex-col gap-1 text-sm ${wide ? "sm:col-span-2" : ""}`}>
      <span className="text-muted">{label}</span>
      {children}
      {hint ? <span className="text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

export function Choice({ name, options, value, empty, required }: {
  name: string; options: readonly (string | readonly [string, string])[]; value?: string | null; empty?: string; required?: boolean;
}) {
  return (
    <select name={name} defaultValue={value ?? ""} required={required} className="field">
      {empty !== undefined ? <option value="">{empty}</option> : null}
      {options.map((o) => { const [v, l] = typeof o === "string" ? [o, o] : o; return <option key={v} value={v}>{l}</option>; })}
    </select>
  );
}

// A form that stays folded until someone needs it
export function Fold({ title, children, open }: { title: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details open={open} className="group rounded border border-line bg-panel">
      <summary className="cursor-pointer list-none px-4 py-2.5 text-sm font-medium select-none">
        <span className="inline-block w-4 text-muted group-open:rotate-90">›</span>{title}
      </summary>
      <div className="border-t border-line px-4 py-3">{children}</div>
    </details>
  );
}
