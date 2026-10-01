import React, { useEffect, useMemo, useState } from "react";
import { parseISO } from "date-fns";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ListFilter,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TableHead } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DateRangePanel from "@/components/common/date-filter/panel";
import { FY_PRESETS } from "@/components/common/date-filter";
import { cn } from "@/lib/utils";
import {
  GSTR2B_MATCH_TYPE_LABELS,
  GSTR2B_MATCH_TYPE_TONE,
  type Gstr2bMatchTypeValueType,
} from "@/config/pages/inbox/gst";
import { AmountFields } from "@/components/inbox/v2/banking/table-parts";
import type { SortDir } from "@/components/inbox/v2/banking/table-parts";
import { AmountText, CountPill, Pill, T } from "@/components/inbox/v2/ui";
import { isoDay } from "@/utils/pages/inbox/gst";

/**
 * GST reconciliation's table vocabulary.
 *
 * The grid is the Purchases register's (bill-register.tsx and Banking's
 * table-parts): the same hairlines, the same 40px accent header, 20px sort
 * and funnel buttons, the same pager. What is added here is what the GST
 * tables need and the register never did — a group row over sub-columns, a
 * cell that stacks a 2B line over a PR line, and production's filter
 * popovers, which hold a draft until Apply.
 */

/** Two header rows: the hairline sits under each, the top edge only once. */
export const GROUPED_HEADER_CLASS =
  "sticky top-0 z-20 bg-accent [&_tr]:shadow-none [&_th]:border-b [&_th]:border-neutral-gray [&_tr:first-child_th]:border-t";

/** A match type, as a chip in the designer-approved tone. */
export const MatchStatusPill = ({
  matchType,
  className,
}: {
  matchType: string;
  className?: string;
}) => (
  <Pill
    tone={GSTR2B_MATCH_TYPE_TONE[matchType as Gstr2bMatchTypeValueType]}
    className={cn("whitespace-nowrap", className)}
  >
    {GSTR2B_MATCH_TYPE_LABELS[matchType as Gstr2bMatchTypeValueType]}
  </Pill>
);

/** A rupee figure in a numeric column. */
export const Money = ({
  value,
  className,
}: {
  value: number;
  className?: string;
}) => (
  <span className={cn("block truncate text-right tabular-nums", className)}>
    <AmountText value={value} />
  </span>
);

/** A count in a numeric column. */
export const Count = ({
  value,
  className,
}: {
  value: number;
  className?: string;
}) => (
  <span className={cn("block text-right tabular-nums", className)}>
    {value}
  </span>
);

/** A group label over its sub-columns. */
export const GroupHead = ({
  label,
  colSpan = 1,
  rowSpan,
  align = "center",
  className,
}: {
  label: string;
  colSpan?: number;
  rowSpan?: number;
  align?: "left" | "center";
  className?: string;
}) => (
  <TableHead
    colSpan={colSpan}
    rowSpan={rowSpan}
    className={cn(
      "h-9 whitespace-nowrap px-3 py-0 align-middle",
      T.head,
      "font-semibold text-foreground",
      align === "center" ? "text-center" : "text-left",
      className
    )}
  >
    {label}
  </TableHead>
);

type HeadCellProps = {
  label: string;
  align?: "left" | "center" | "right";
  width?: number;
  rowSpan?: number;
  /** Omit for an unsortable column. */
  sort?: SortDir | "none";
  onSort?: () => void;
  /** The funnel's popover body; `close` shuts the popover after Apply. */
  filter?: (close: () => void) => React.ReactNode;
  filterActive?: boolean;
  className?: string;
  /** For a pinned column: its offset from the edge. */
  style?: React.CSSProperties;
};

/**
 * A column header: label, 20px sort and funnel buttons — Banking's HeaderCell
 * without the resize handle, since these tables size by content.
 */
export const HeadCell = ({
  label,
  align = "left",
  width,
  rowSpan,
  sort,
  onSort,
  filter,
  filterActive,
  className,
  style,
}: HeadCellProps) => {
  const [open, setOpen] = useState(false);
  return (
    <TableHead
      rowSpan={rowSpan}
      aria-sort={
        !sort
          ? undefined
          : sort === "none"
            ? "none"
            : sort === "asc"
              ? "ascending"
              : "descending"
      }
      style={{ ...(width ? { width, minWidth: width } : {}), ...style }}
      className={cn(
        "relative h-10 whitespace-nowrap px-3 py-0 align-middle",
        T.head,
        className
      )}
    >
      <div
        className={cn(
          "flex h-4 min-w-0 items-center gap-1",
          align === "right" && "justify-end",
          align === "center" && "justify-center"
        )}
      >
        <span className="truncate" title={label}>
          {label}
        </span>
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
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                data-filter-trigger={label}
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
              {filter(() => setOpen(false))}
            </PopoverContent>
          </Popover>
        )}
      </div>
    </TableHead>
  );
};

/** One table body cell holding a 2B line over a PR line. */
export const TwoLine = ({
  top,
  bottom,
  align = "left",
  className,
}: {
  top: React.ReactNode;
  bottom: React.ReactNode;
  align?: "left" | "center" | "right";
  className?: string;
}) => {
  const line = cn(
    "flex h-7 min-w-0 items-center px-3",
    align === "right" && "justify-end",
    align === "center" && "justify-center",
    className
  );
  return (
    <div className="flex flex-col">
      <div className={line}>{top}</div>
      <div className={cn(line, "border-t border-neutral-gray")}>{bottom}</div>
    </div>
  );
};

/* ------------------------------------------------------------- filters */

/**
 * Production's FilterPopover shell: a titled head, the body, and a
 * Clear / Apply foot. Nothing reaches the table until Apply.
 */
const FilterShell = ({
  title,
  subtitle,
  children,
  onClear,
  clearLabel = "Clear",
  onApply,
  applyDisabled,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onClear: () => void;
  clearLabel?: string;
  onApply: () => void;
  applyDisabled?: boolean;
}) => (
  <div className="flex w-[320px] flex-col">
    <div className="border-b border-neutral-gray px-4 pb-3 pt-4">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {subtitle ? <p className={cn(T.sub, "mt-0.5")}>{subtitle}</p> : null}
    </div>
    <div className="px-4 py-3">{children}</div>
    <div className="flex items-center justify-between gap-3 border-t border-neutral-gray px-4 py-3">
      <Button variant="secondary" className="flex-1" onClick={onClear}>
        {clearLabel}
      </Button>
      <Button className="flex-1" disabled={applyDisabled} onClick={onApply}>
        Apply
      </Button>
    </div>
  </div>
);

export type FilterOption = { value: string; label: string };

/** A searchable multi-select with a draft — production's MultiSelectFilterPopover. */
export const MultiSelectFilter = ({
  title,
  subtitle,
  searchPlaceholder,
  options,
  value,
  onApply,
  close,
}: {
  title: string;
  subtitle?: string;
  searchPlaceholder: string;
  options: FilterOption[];
  value: string[];
  onApply: (next: string[]) => void;
  close: () => void;
}) => {
  const [draft, setDraft] = useState<string[]>(value);
  const [query, setQuery] = useState("");
  useEffect(() => setDraft(value), [value]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? options.filter((o) => o.label.toLowerCase().includes(q))
      : options;
  }, [options, query]);
  const unchanged =
    draft.length === value.length && draft.every((v) => value.includes(v));

  return (
    <FilterShell
      title={title}
      subtitle={subtitle}
      clearLabel={draft.length ? "Clear" : "Cancel"}
      onClear={() => {
        setDraft([]);
        onApply([]);
        close();
      }}
      applyDisabled={unchanged}
      onApply={() => {
        onApply(draft);
        close();
      }}
    >
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary-foreground" />
        <Input
          aria-label={searchPlaceholder}
          placeholder={searchPlaceholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-8 pl-8"
        />
      </div>
      <div className="mt-3 flex max-h-[220px] flex-col gap-1 overflow-y-auto">
        {visible.length ? (
          visible.map((o) => (
            <Label
              key={o.value}
              className="flex h-8 flex-none cursor-pointer items-center gap-2.5 rounded-md px-1 text-sm font-normal text-foreground hover:bg-section"
            >
              <Checkbox
                checked={draft.includes(o.value)}
                onCheckedChange={() =>
                  setDraft((d) =>
                    d.includes(o.value)
                      ? d.filter((v) => v !== o.value)
                      : [...d, o.value]
                  )
                }
              />
              <span className="flex-1 truncate">{o.label}</span>
            </Label>
          ))
        ) : (
          <p className="px-1 py-2 text-sm text-secondary-foreground">
            No results found.
          </p>
        )}
      </div>
    </FilterShell>
  );
};

/** Min / max, as the register's AmountFields, with a draft and Apply. */
export const AmountRangeFilter = ({
  title,
  subtitle,
  from,
  to,
  onApply,
  close,
}: {
  title: string;
  subtitle?: string;
  from?: string;
  to?: string;
  onApply: (from?: string, to?: string) => void;
  close: () => void;
}) => {
  const [min, setMin] = useState(from ?? "");
  const [max, setMax] = useState(to ?? "");
  const invalid = !!min && !!max && Number(max) < Number(min);
  return (
    <FilterShell
      title={title}
      subtitle={subtitle}
      onClear={() => {
        setMin("");
        setMax("");
        onApply(undefined, undefined);
        close();
      }}
      applyDisabled={invalid}
      onApply={() => {
        onApply(min || undefined, max || undefined);
        close();
      }}
    >
      <AmountFields
        min={min}
        max={max}
        onChange={(key, value) =>
          key === "min" ? setMin(value) : setMax(value)
        }
      />
      {invalid ? (
        <p className="mt-2 text-xs text-destructive-foreground">
          Maximum must be more than minimum.
        </p>
      ) : null}
    </FilterShell>
  );
};

/** Invoice Date: the Inbox's own date range panel, which has its own Apply. */
export const DateRangeFilter = ({
  from,
  to,
  onApply,
  close,
}: {
  from?: string;
  to?: string;
  onApply: (from?: string, to?: string) => void;
  close: () => void;
}) => (
  <DateRangePanel
    value={{
      from: from ? parseISO(from) : undefined,
      to: to ? parseISO(to) : undefined,
    }}
    onApply={(next) => {
      onApply(
        next.from ? isoDay(next.from) : undefined,
        next.to ? isoDay(next.to) : undefined
      );
      close();
    }}
    presets={FY_PRESETS}
    presetsLabel="Date range"
    today={new Date()}
  />
);

/* ----------------------------------------------------------------- tabs */

/**
 * The register's underline tabs. The count is optional here: Summary View
 * is one row per status, and a count beside it would say nothing.
 */
export const ResultTabs = ({
  tabs,
  value,
  onChange,
}: {
  tabs: { id: string; label: string; count?: number }[];
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
          {entry.count !== undefined ? (
            <CountPill>{entry.count}</CountPill>
          ) : null}
        </TabsTrigger>
      ))}
    </TabsList>
  </Tabs>
);
