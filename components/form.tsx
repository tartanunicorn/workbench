// Form pieces built on shadcn/ui. Forms post to server actions, so they work before any script loads.
import { cn } from "@/lib/utils";
import { NativeSelect, NativeSelectOption } from "@/components/ui-kit/native-select";
import { Checkbox } from "@/components/ui-kit/checkbox";

export { Input } from "@/components/ui-kit/input";
export { Textarea } from "@/components/ui-kit/textarea";
export { FormDialog, Submit } from "@/components/form-dialog";

export function Field({ label, children, hint, wide }: { label: string; children: React.ReactNode; hint?: string; wide?: boolean }) {
  return (
    <label className={cn("flex min-w-0 flex-col gap-1.5 text-sm", wide && "sm:col-span-2")}>
      <span className="font-medium leading-none">{label}</span>
      {children}
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

export function Choice({ name, options, value, empty, required, size }: {
  name: string; options: readonly (string | readonly [string, string])[]; value?: string | null; empty?: string; required?: boolean; size?: "sm" | "default";
}) {
  return (
    <div className="[&>[data-slot=native-select-wrapper]]:w-full">
      <NativeSelect name={name} defaultValue={value ?? ""} required={required} size={size}>
        {empty !== undefined ? <NativeSelectOption value="">{empty}</NativeSelectOption> : null}
        {options.map((o) => { const [v, l] = typeof o === "string" ? [o, o] : o; return <NativeSelectOption key={v} value={v}>{l}</NativeSelectOption>; })}
      </NativeSelect>
    </div>
  );
}

// A checkbox with its label. Inside a form it posts "on" when ticked, like a native one.
export function Check({ name, label, defaultChecked, className }: { name: string; label: string; defaultChecked?: boolean; className?: string }) {
  return (
    <label className={cn("flex items-center gap-2 text-sm", className)}>
      <Checkbox name={name} defaultChecked={defaultChecked} /> {label}
    </label>
  );
}
