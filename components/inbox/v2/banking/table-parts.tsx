import React from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Columns3,
  ListFilter,
  Slash,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TableHead } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { ColumnSizes } from "@/components/inbox/v2/table-sizing";
import { useColumnResize } from "@/hooks/pages/inbox/use-column-resize";
import { CountPill, PageButton, T } from "@/components/inbox/v2/ui";

/**
 * The Purchases register's table vocabulary (bill-register.tsx), lifted so
 * the three Banking tables draw the same header, pager, tabs and empty state
 * without each carrying a copy.
 */

export type SortDir = "asc" | "desc";
export type SortState<K extends string> = { key: K; dir: SortDir } | null;

/** Descending first, then ascending, then off — as the Inbox does. */
export const nextSort = <K extends string>(
  current: SortState<K>,
  key: K
): SortState<K> =>
  current?.key !== key
    ? { key, dir: "desc" }
    : current.dir === "desc"
      ? { key, dir: "asc" }
      : null;

export const sortRows = <T, K extends string>(
  rows: T[],
  sort: SortState<K>,
  value: Partial<Record<K, (row: T) => string | number>>
) => {
  const read = sort && value[sort.key];
  if (!sort || !read) return rows;
  const sign = sort.dir === "asc" ? 1 : -1;
  return rows.slice().sort((a, b) => {
    const x = read(a);
    const y = read(b);
    return (
      sign *
      (typeof x === "number" && typeof y === "number"
        ? x - y
        : String(x).localeCompare(String(y), "en-IN", { numeric: true }))
    );
  });
};

export const day = (value?: string) =>
  value && !Number.isNaN(Date.parse(value))
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

/** The grid's table classes: fixed layout, hairlines between every cell. */
export const TABLE_CLASS =
  "table-fixed border-separate border-spacing-0 [&_td]:border-b [&_td]:border-r [&_td]:border-neutral-gray [&_td:last-child]:border-r-0 [&_th]:border-r [&_th]:border-neutral-gray [&_th:last-child]:border-r-0";
export const HEADER_CLASS =
  "sticky top-0 z-10 bg-accent [&_tr]:shadow-none [&_th]:border-b [&_th]:border-t [&_th]:border-neutral-gray";

type HeaderCellProps = {
  columnKey: string;
  label: string;
  sizes: ColumnSizes;
  resize: ReturnType<typeof useColumnResize>;
  /** Extra width drawn on top of the sized width (see SR_NO_EXTRA). */
  extraWidth?: number;
  align?: "left" | "right";
  /** Omit for an unsortable column. */
  sort?: SortDir | "none";
  onSort?: () => void;
  /** The funnel's popover body. Omit for an unfilterable column. */
  filter?: React.ReactNode;
  filterActive?: boolean;
  /** Fixed columns draw no resize handle. */
  resizable?: boolean;
};

/** A column header: label, 20px sort and filter buttons, resize handle. */
export const HeaderCell = ({
  columnKey,
  label,
  sizes,
  resize,
  extraWidth = 0,
  align = "left",
  sort,
  onSort,
  filter,
  filterActive,
  resizable = true,
}: HeaderCellProps) => {
  const width = resize.colWidth(columnKey);
  const size = sizes[columnKey];
  return (
    <TableHead
      aria-sort={
        !sort
          ? undefined
          : sort === "none"
            ? "none"
            : sort === "asc"
              ? "ascending"
              : "descending"
      }
      style={{ width: width + extraWidth }}
      className={cn(
        "relative h-10 whitespace-nowrap px-3 py-0 align-middle",
        T.head
      )}
    >
      <div
        className={cn(
          "flex h-4 min-w-0 items-center gap-1",
          align === "right" && "justify-end"
        )}
      >
        {label ? (
          <span className="truncate" title={label}>
            {label}
          </span>
        ) : null}
        {sort && (
          <button
            type="button"
            onClick={onSort}
            aria-label={`Sort by ${label}`}
            className="grid h-5 w-5 flex-none place-items-center rounded-md hover:bg-muted"
          >
            {sort === "asc" ? (
              <ArrowUp className="h-3 w-3 text-primary" />
            ) : sort === "desc" ? (
              <ArrowDown className="h-3 w-3 text-primary" />
            ) : (
              <ArrowUpDown className="h-3 w-3 text-secondary-foreground" />
            )}
          </button>
        )}
        {filter && (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                data-filter-trigger={columnKey}
                aria-label={`Filter ${label}`}
                className={cn(
                  "grid h-5 w-5 flex-none place-items-center rounded-md hover:bg-muted",
                  filterActive ? "text-primary" : "text-secondary-foreground"
                )}
              >
                <ListFilter className="h-3 w-3" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="w-auto overflow-hidden p-0"
            >
              {filter}
            </PopoverContent>
          </Popover>
        )}
      </div>
      {resizable && (
        // Over the cell's right border. Double-click or Enter puts the
        // column back to its default width.
        <span
          role="separator"
          aria-orientation="vertical"
          aria-label={`Resize ${label || columnKey}`}
          tabIndex={0}
          aria-valuemin={size.min}
          aria-valuemax={size.max}
          aria-valuenow={width}
          aria-valuetext={`${width} pixels`}
          title={`${width} px · Drag or use arrow keys to resize. Double-click or Enter to reset.`}
          onPointerDown={(e) => resize.startResize(columnKey, e)}
          onDoubleClick={() => {
            if (resize.isManual) resize.resizeColumn(columnKey, size.preferred);
          }}
          onKeyDown={(e) => {
            const step = e.shiftKey ? 40 : 10;
            const next =
              e.key === "ArrowRight"
                ? width + step
                : e.key === "ArrowLeft"
                  ? width - step
                  : e.key === "Home"
                    ? size.min
                    : e.key === "End"
                      ? size.max
                      : e.key === "Enter"
                        ? size.preferred
                        : null;
            if (next !== null) {
              e.preventDefault();
              e.stopPropagation();
              resize.resizeColumn(columnKey, next);
            }
          }}
          className="group absolute -right-[5px] top-0 z-20 flex h-full w-[10px] cursor-col-resize touch-none items-stretch justify-center focus-visible:outline-none"
        >
          <span
            className={cn(
              "w-[2px] transition-colors group-hover:bg-primary group-focus-visible:bg-primary",
              resize.resizing === columnKey ? "bg-primary" : "bg-transparent"
            )}
          />
        </span>
      )}
    </TableHead>
  );
};

/** The register's search field: 198px, with the "/" hint while empty. */
export const SearchBox = ({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
}) => (
  <div className="relative w-full sm:w-[198px]">
    <Input
      aria-label={label}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn("h-9 pr-9", T.cell, "text-foreground")}
    />
    {!value && (
      <span
        aria-hidden
        className="pointer-events-none absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md bg-section"
      >
        <Slash className="h-3 w-3 text-secondary-foreground" />
      </span>
    )}
  </div>
);

/** The register's Columns chip. Choosing columns is not built here. */
export const ColumnsButton = ({ onClick }: { onClick: () => void }) => (
  <button
    type="button"
    aria-label="Customize columns"
    onClick={onClick}
    className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1 text-label-3 font-medium text-foreground transition-[border-color,background-color] duration-150 ease-in-out hover:border-[hsl(var(--palette-neutral-300-hsl))] hover:bg-neutral-gray focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
  >
    <Columns3 className="size-3.5" aria-hidden />
    Columns
  </button>
);

/** Underline tabs with a count chip, as the register draws them. */
export const UnderlineTabs = ({
  tabs,
  value,
  onChange,
}: {
  tabs: { id: string; label: string; count: number }[];
  value: string;
  onChange: (id: string) => void;
}) => (
  <Tabs
    value={value}
    onValueChange={onChange}
    className="mx-6 shrink-0 overflow-x-auto border-b border-neutral-gray"
  >
    <TabsList className="h-auto gap-2 rounded-none bg-transparent p-0">
      {tabs.map((entry) => (
        <TabsTrigger
          key={entry.id}
          value={entry.id}
          className="gap-2 rounded-none border-b-2 border-transparent px-2.5 py-3 text-sm text-secondary-foreground shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-primary data-[state=active]:shadow-none"
        >
          {entry.label}
          <CountPill>{entry.count}</CountPill>
        </TabsTrigger>
      ))}
    </TabsList>
  </Tabs>
);

/** The register's inline empty state, under the header row. */
export const EmptyBlock = ({
  title,
  body,
}: {
  title: string;
  body?: string;
}) => (
  <div className="sticky left-0 px-6 py-16 text-center">
    <h2 className="text-lg font-semibold">{title}</h2>
    {body ? <p className={cn(T.value, "mt-2")}>{body}</p> : null}
  </div>
);

export const PAGE_SIZES = [10, 25, 50, 100];

/** The register's pager: rows per page, then first/prev · a - b of n · next/last. */
export const Pager = ({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) => {
  const lastPage = Math.max(0, Math.ceil(total / pageSize) - 1);
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-neutral-gray bg-background px-6 py-1.5">
      <div className="flex items-center gap-2">
        <span className={cn(T.cell, "text-foreground")}>Rows per page:</span>
        <Select
          value={String(pageSize)}
          onValueChange={(value) => {
            onPageSizeChange(Number(value));
            onPageChange(0);
          }}
        >
          <SelectTrigger
            aria-label="Rows per page"
            className={cn(
              "h-auto w-[72px] rounded-md border-border px-2 py-1",
              T.cell,
              "text-foreground"
            )}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZES.map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-0 sm:gap-1">
        <PageButton
          label="First page"
          disabled={page === 0}
          onClick={() => onPageChange(0)}
        >
          <ChevronsLeft />
        </PageButton>
        <PageButton
          label="Previous page"
          disabled={page === 0}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft />
        </PageButton>
        <span className={cn(T.cell, "px-2 tabular-nums text-foreground")}>
          {total
            ? `${page * pageSize + 1} - ${Math.min((page + 1) * pageSize, total)} of ${total}`
            : "0 of 0"}
        </span>
        <PageButton
          label="Next page"
          disabled={page >= lastPage}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight />
        </PageButton>
        <PageButton
          label="Last page"
          disabled={page >= lastPage}
          onClick={() => onPageChange(lastPage)}
        >
          <ChevronsRight />
        </PageButton>
      </div>
    </div>
  );
};

/** The register's amount range, for a column funnel or the filter panel. */
export const AmountFields = ({
  min,
  max,
  onChange,
}: {
  min: string;
  max: string;
  onChange: (key: "min" | "max", value: string) => void;
}) => (
  <div className="flex flex-col gap-4">
    {(
      [
        ["min", "Minimum amount", min],
        ["max", "Maximum amount", max],
      ] as const
    ).map(([key, label, value]) => (
      <label key={key} className="block">
        <span className={cn(T.label, "mb-1 block")}>{label}</span>
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(key, e.target.value)}
        />
      </label>
    ))}
  </div>
);

/** The body cell's inner box: one row height, content centred vertically. */
export const CellBox = ({ children }: { children: React.ReactNode }) => (
  <div className="flex h-[44px] min-w-0 flex-col justify-center overflow-hidden [&>.inline-flex]:self-start">
    {children}
  </div>
);
