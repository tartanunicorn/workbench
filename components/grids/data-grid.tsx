"use client";
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import {
  AllCommunityModule, ModuleRegistry, themeQuartz,
  type ColDef, type GridApi, type GridReadyEvent, type IDatasource, type IGetRowsParams,
} from "ag-grid-community";
import { FilterXIcon, SearchIcon } from "lucide-react";
import { Button } from "@/components/ui-kit/button";
import { Input } from "@/components/ui-kit/input";
import { GRIDS, type FilterModel, type GridName, type Scope } from "@/lib/grid";

ModuleRegistry.registerModules([AllCommunityModule]);

// The grid takes its colours from the page's tokens, so it follows light and dark with everything else
const theme = themeQuartz.withParams({
  backgroundColor: "var(--card)",
  foregroundColor: "var(--foreground)",
  textColor: "var(--foreground)",
  subtleTextColor: "var(--muted-foreground)",
  borderColor: "var(--border)",
  chromeBackgroundColor: "var(--muted)",
  headerBackgroundColor: "color-mix(in oklab, var(--muted) 50%, var(--card))",
  headerTextColor: "var(--muted-foreground)",
  rowHoverColor: "color-mix(in oklab, var(--muted) 50%, transparent)",
  selectedRowBackgroundColor: "var(--muted)",
  accentColor: "var(--primary)",
  inputBackgroundColor: "transparent",
  inputBorder: { color: "var(--input)" },
  inputFocusBorder: { color: "var(--ring)" },
  menuBackgroundColor: "var(--popover)",
  menuTextColor: "var(--popover-foreground)",
  menuBorder: { color: "var(--border)" },
  browserColorScheme: "inherit",
  fontFamily: "inherit",
  fontSize: 13,
  headerFontSize: 12,
  headerFontWeight: 500,
  rowHeight: 38,
  headerHeight: 36,
  spacing: 6,
  wrapperBorderRadius: 10,
  borderRadius: 6,
});

export const TEXT: Partial<ColDef> = { filter: "agTextColumnFilter", filterParams: { buttons: ["reset"], debounceMs: 300, maxNumConditions: 2 } };
export const NUMBER: Partial<ColDef> = { filter: "agNumberColumnFilter", filterParams: { buttons: ["reset"], debounceMs: 300, maxNumConditions: 2 }, type: "rightAligned", cellClass: "num" };
export const DATE: Partial<ColDef> = {
  filter: "agDateColumnFilter", filterParams: { buttons: ["reset"], maxNumConditions: 2 }, cellClass: "num",
  valueFormatter: (p) => fmtDay(p.value),
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function fmtDay(v: unknown): string {
  if (typeof v !== "string" || v.length < 10) return "";
  const [y, m, d] = v.slice(0, 10).split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export type GridHandle = { api: GridApi | null; setFilter: (field: string, value: string | null) => void; refresh: () => void };

type Props = {
  grid: GridName;
  columns: ColDef[];
  scope?: Scope[];
  initialFilter?: FilterModel;
  height?: string;
  toolbar?: React.ReactNode;
  noun: [string, string];
  onFilterChange?: (model: FilterModel) => void;
};

// A grid over one database view: filters, sorting and paging all happen in the database, 100 rows at a time
export const DataGrid = forwardRef<GridHandle, Props>(function DataGrid(
  { grid, columns, scope, initialFilter, height = "calc(100vh - 260px)", toolbar, noun, onFilterChange }, ref) {
  const api = useRef<GridApi | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const qRef = useRef("");

  const datasource = useMemo<IDatasource>(() => ({
    getRows: async (p: IGetRowsParams) => {
      try {
        const res = await fetch("/api/grid", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ grid, startRow: p.startRow, endRow: p.endRow, sortModel: p.sortModel, filterModel: p.filterModel, scope, q: qRef.current }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? res.statusText);
        setError(null);
        setTotal(body.total);
        p.successCallback(body.rows, body.total ?? undefined);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        p.failCallback();
      }
    },
  }), [grid, scope]);

  const onReady = useCallback((e: GridReadyEvent) => {
    api.current = e.api;
    if (initialFilter) e.api.setFilterModel(initialFilter);
    e.api.setGridOption("datasource", datasource);
  }, [datasource, initialFilter]);

  useImperativeHandle(ref, () => ({
    get api() { return api.current; },
    setFilter: (field, value) => {
      const a = api.current; if (!a) return;
      const model = { ...a.getFilterModel() };
      if (value === null) delete model[field];
      else model[field] = { filterType: "text", type: "equals", filter: value };
      a.setFilterModel(model);
    },
    refresh: () => api.current?.refreshInfiniteCache(),
  }), []);

  const search = (v: string) => {
    setQ(v);
    qRef.current = v;
    api.current?.purgeInfiniteCache();
  };

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => search(e.target.value)} placeholder="Search" aria-label="Search" className="h-8 w-64 pl-8" />
        </div>
        {toolbar}
        <Button variant="outline" size="sm" onClick={() => api.current?.setFilterModel(null)}><FilterXIcon />Clear filters</Button>
        <span className="num ml-auto text-sm text-muted-foreground">
          {total === null ? "" : `${total.toLocaleString()} ${total === 1 ? noun[0] : noun[1]}`}
        </span>
      </div>
      {error ? <div className="rounded-md border border-bad bg-bad-bg px-3 py-2 text-sm text-bad">Couldn&apos;t load: {error}</div> : null}
      <div style={{ height }} className="min-h-80">
        <AgGridReact
          theme={theme}
          columnDefs={columns}
          defaultColDef={{ sortable: true, resizable: true, floatingFilter: true, suppressHeaderMenuButton: true, minWidth: 90 }}
          rowModelType="infinite"
          cacheBlockSize={100}
          maxBlocksInCache={30}
          getRowId={(p) => String(p.data[GRIDS[grid].key])}
          onGridReady={onReady}
          onFilterChanged={(e) => onFilterChange?.(e.api.getFilterModel() as FilterModel)}
          tooltipShowDelay={300}
          enableCellTextSelection
          ensureDomOrder
        />
      </div>
    </div>
  );
});
