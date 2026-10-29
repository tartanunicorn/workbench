"use client";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui-kit/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui-kit/dialog";

// A "New …" or "Edit …" form in a dialog. It closes once the form is sent; the action redirects or refreshes the page.
export function FormDialog({ label, title, description, children, variant = "default", wide }: {
  label: string; title?: string; description?: string; children: React.ReactNode;
  variant?: "default" | "outline"; wide?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant={variant} size="sm">{label}</Button></DialogTrigger>
      <DialogContent className={wide ? "sm:max-w-2xl" : undefined}
        onSubmit={(e) => { if (!e.defaultPrevented) setTimeout(() => setOpen(false), 0); }}>
        <DialogHeader>
          <DialogTitle>{title ?? label}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

// The form's submit button; shows that it's working while the action runs
export function Submit({ children, size = "default", variant = "default" }: { children: React.ReactNode; size?: "default" | "sm" | "xs"; variant?: "default" | "outline" }) {
  const { pending } = useFormStatus();
  return <Button type="submit" size={size} variant={variant} disabled={pending}>{pending ? "Saving…" : children}</Button>;
}
