"use client";
import { useMemo } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import type { Scope } from "@/lib/grid";
import { Badge } from "@/components/ui";
import { DATE, DataGrid, NUMBER, TEXT } from "./data-grid";
import { BadgeCell, linkCell } from "./cells";

const YESNO: Partial<ColDef> = { filter: false, valueFormatter: (p) => (p.value === true ? "Yes" : p.value === false ? "No" : "") };

function CountCell(tone: "warn" | "bad") {
  return function Count(p: ICellRendererParams) {
    if (!p.value) return <span className="text-muted-foreground">0</span>;
    return <Badge tone={tone}>{p.value}</Badge>;
  };
}

export function CustomersGrid() {
  const columns = useMemo<ColDef[]>(() => [
    { field: "name", headerName: "Customer", flex: 2, minWidth: 200, pinned: "left", ...TEXT, cellRenderer: linkCell((d) => `/customers/${d.customer_id}`) },
    { field: "customer_id", headerName: "ID", width: 110, ...TEXT, cellClass: "font-mono" },
    { field: "status", headerName: "Status", width: 130, ...TEXT },
    { field: "tier", headerName: "Customer tier", width: 140, ...TEXT },
    { field: "registrations", headerName: "Registrations", width: 140, ...NUMBER },
    { field: "setup_open", headerName: "Setup tasks open", width: 160, ...NUMBER, cellRenderer: CountCell("warn") },
    { field: "open_issues", headerName: "Open issues", width: 130, ...NUMBER, cellRenderer: CountCell("bad") },
    { field: "release_owner", headerName: "Release owner", width: 170, ...TEXT },
    { field: "customer_approver", headerName: "Customer approver", width: 190, ...TEXT },
    { field: "internal_review", headerName: "Internal review", width: 140, ...YESNO },
    { field: "org_id", headerName: "Org ID", width: 130, ...TEXT, hide: true },
  ], []);
  return <DataGrid grid="customers" columns={columns} noun={["customer", "customers"]} />;
}

export function RegistrationTypesGrid() {
  const columns = useMemo<ColDef[]>(() => [
    { field: "name", headerName: "Registration type", flex: 2, minWidth: 220, pinned: "left", ...TEXT, cellRenderer: linkCell((d) => `/registration-types/${d.registration_type_id}`) },
    { field: "place_code", headerName: "Place", width: 100, ...TEXT },
    { field: "tax_type", headerName: "Tax type", width: 120, ...TEXT },
    { field: "frequency", headerName: "Frequency", width: 130, ...TEXT },
    { field: "workflow", headerName: "Workflow", width: 120, ...TEXT },
    { field: "customers", headerName: "Customers", width: 120, ...NUMBER },
    { field: "template_tasks", headerName: "Tasks per return", width: 150, ...NUMBER },
    { field: "due_rule", headerName: "Due", width: 190, ...TEXT, valueFormatter: (p) => (p.data ? `${p.value ?? ""}${p.data.due_value ? ` (${p.data.due_value})` : ""}` : "") },
    { field: "automation", headerName: "Automation", width: 150, ...TEXT },
    { field: "default_preparer", headerName: "Default preparer", width: 170, ...TEXT },
    { field: "default_reviewer", headerName: "Default reviewer", width: 170, ...TEXT },
    { field: "registration_type_id", headerName: "ID", width: 100, ...TEXT, cellClass: "font-mono", hide: true },
  ], []);
  return <DataGrid grid="registrationTypes" columns={columns} noun={["registration type", "registration types"]} />;
}

// One grid for registrations, used on a customer (which types they're registered to) and on a type (which customers)
export function RegistrationsGrid({ scope, by, height }: { scope: Scope[]; by: "customer" | "type"; height?: string }) {
  const columns = useMemo<ColDef[]>(() => [
    by === "type"
      ? { field: "customer_name", headerName: "Customer", flex: 2, minWidth: 180, ...TEXT, cellRenderer: linkCell((d) => `/customers/${d.customer_id}`) }
      : { field: "type_name", headerName: "Registration type", flex: 2, minWidth: 200, ...TEXT, cellRenderer: linkCell((d) => `/registration-types/${d.registration_type_id}`) },
    { field: "state", headerName: "State", width: 130, ...TEXT, cellRenderer: BadgeCell },
    { field: "active_from", headerName: "From", width: 150, ...DATE },
    { field: "active_to", headerName: "To", width: 150, ...DATE },
    { field: "account_ref", headerName: "Account", width: 140, ...TEXT },
    { field: "setup_open", headerName: "Setup tasks open", width: 160, ...NUMBER, cellRenderer: CountCell("warn") },
    { field: "last_portal_check", headerName: "Portal checked", width: 150, ...DATE },
    { field: "verified_by", headerName: "Verified by", width: 150, ...TEXT },
    { field: "registration_id", headerName: "ID", width: 120, ...TEXT, cellClass: "font-mono" },
  ], [by]);
  return <DataGrid grid="registrations" columns={columns} scope={scope} height={height} noun={["registration", "registrations"]} />;
}
