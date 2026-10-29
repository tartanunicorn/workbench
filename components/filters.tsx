"use client";
// Filters are a plain GET form: the URL is the state, and changing a select applies it straight away.

export function Filters({ children }: { children: React.ReactNode }) {
  return (
    <form method="get" className="mb-3 flex flex-wrap items-center gap-2"
      onChange={(e) => { if ((e.target as HTMLElement).tagName === "SELECT") e.currentTarget.requestSubmit(); }}>
      {children}
      <button className="btn" type="submit">Apply</button>
    </form>
  );
}

export function Select({ name, value, options, all, allValue = "" }: {
  name: string; value: string | undefined; all: string; allValue?: string;
  options: readonly (string | readonly [string, string])[];
}) {
  return (
    <select name={name} defaultValue={value ?? allValue} className="field" aria-label={all}>
      <option value={allValue}>{all}</option>
      {options.map((o) => {
        const [v, label] = typeof o === "string" ? [o, o] : o;
        return <option key={v} value={v}>{label}</option>;
      })}
    </select>
  );
}

export function SearchBox({ value, placeholder }: { value: string | undefined; placeholder: string }) {
  return <input name="q" defaultValue={value ?? ""} placeholder={placeholder} className="field w-56" />;
}
