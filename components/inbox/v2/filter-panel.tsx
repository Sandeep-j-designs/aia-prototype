import React, { useMemo, useState } from "react";
import { ChevronRight, Search } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import FilterChip from "@/components/common/filter-chip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * The filter surface, built to the Figma frame (node 24441:60922).
 *
 * Two panes: the categories you can filter on down the left, and the chosen
 * category's values on the right behind a search box. Values are checkboxes,
 * so every category is multi-select — that is the substantive change from the
 * single-value dropdowns this replaces. An accountant chasing a month-end
 * usually wants "email OR whatsapp", not one of them.
 *
 * Geometry from the frame: 212px left pane, 36px rows on an 8px rhythm,
 * 32px search field, 16px pane padding.
 */

export type FilterOption = { value: string; label: string; count?: number };

export type FilterCategory = {
  id: string;
  label: string;
  /** Checkbox list. Omit when supplying `custom`. */
  options?: FilterOption[];
  selected?: string[];
  onChange?: (next: string[]) => void;
  /** For ranges — dates, amounts — which are not a list of values. */
  custom?: React.ReactNode;
  /** How many constraints this category currently contributes. */
  activeCount?: number;
};

export const FilterPanel = ({
  categories,
  className,
}: {
  categories: FilterCategory[];
  className?: string;
}) => {
  const [activeId, setActiveId] = useState(categories[0]?.id);
  const [query, setQuery] = useState("");
  const active = categories.find((c) => c.id === activeId) ?? categories[0];

  const visible = useMemo(() => {
    if (!active?.options) return [];
    const q = query.trim().toLowerCase();
    return q
      ? active.options.filter((o) => o.label.toLowerCase().includes(q))
      : active.options;
  }, [active, query]);

  const toggle = (value: string) => {
    if (!active?.onChange) return;
    const current = active.selected ?? [];
    active.onChange(
      current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value]
    );
  };

  return (
    <div className={cn("flex h-[419px] w-[567px] overflow-hidden", className)}>
      <div className="flex w-[212px] flex-none flex-col gap-2 overflow-y-auto border-r border-neutral-gray p-3">
        {categories.map((c) => {
          const isActive = c.id === active?.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setActiveId(c.id);
                setQuery("");
              }}
              className={cn(
                "flex h-9 flex-none items-center gap-2 rounded-md px-3 text-sm",
                isActive
                  ? "bg-accent font-semibold text-primary"
                  : "text-secondary-foreground hover:bg-section"
              )}
            >
              <span className="flex-1 truncate text-left">{c.label}</span>
              {c.activeCount ? (
                <span className="grid h-5 min-w-5 flex-none place-items-center rounded-full bg-primary px-1.5 text-[10px] font-semibold tabular-nums text-primary-foreground">
                  {c.activeCount}
                </span>
              ) : null}
              {isActive ? <ChevronRight className="h-4 w-4 flex-none" /> : null}
            </button>
          );
        })}
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-4">
        {active?.custom ? (
          <div className="min-h-0 flex-1 overflow-y-auto">{active.custom}</div>
        ) : (
          <>
            <div className="relative flex-none">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary-foreground" />
              <Input
                aria-label={`Search ${active?.label ?? "options"}`}
                placeholder="Search..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-8 pl-8"
              />
            </div>
            <div className="mt-4 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
              {visible.length ? (
                visible.map((o) => (
                  <Label
                    key={o.value}
                    className="flex h-9 flex-none cursor-pointer items-center gap-2.5 rounded-md px-1 text-sm font-normal text-foreground hover:bg-section"
                  >
                    <Checkbox
                      checked={(active?.selected ?? []).includes(o.value)}
                      onCheckedChange={() => toggle(o.value)}
                    />
                    <span className="flex-1 truncate">{o.label}</span>
                    {o.count !== undefined ? (
                      <span className="flex-none text-xs tabular-nums text-secondary-foreground">
                        {o.count}
                      </span>
                    ) : null}
                  </Label>
                ))
              ) : (
                <p className="px-1 py-2 text-sm text-secondary-foreground">
                  No matches.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

/**
 * The single-category version behind a column header's funnel icon — the right
 * pane on its own, scoped to that column.
 */
export const ColumnFilter = ({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: FilterOption[];
  selected: string[];
  onChange: (next: string[]) => void;
}) => {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const visible = q
    ? options.filter((o) => o.label.toLowerCase().includes(q))
    : options;

  return (
    <div className="flex w-[280px] flex-col p-3">
      <div className="relative flex-none">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary-foreground" />
        <Input
          aria-label={`Search ${label}`}
          placeholder="Search..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-8 pl-8"
        />
      </div>
      <div className="mt-3 flex max-h-[260px] flex-col gap-1 overflow-y-auto">
        {visible.length ? (
          visible.map((o) => (
            <Label
              key={o.value}
              className="flex h-8 flex-none cursor-pointer items-center gap-2.5 rounded-md px-1 text-sm font-normal text-foreground hover:bg-section"
            >
              <Checkbox
                checked={selected.includes(o.value)}
                onCheckedChange={() =>
                  onChange(
                    selected.includes(o.value)
                      ? selected.filter((v) => v !== o.value)
                      : [...selected, o.value]
                  )
                }
              />
              <span className="flex-1 truncate">{o.label}</span>
            </Label>
          ))
        ) : (
          <p className="px-1 py-2 text-sm text-secondary-foreground">
            No matches.
          </p>
        )}
      </div>
      {selected.length ? (
        <button
          type="button"
          onClick={() => onChange([])}
          className="mt-2 flex-none rounded-md px-1 py-1 text-left text-xs font-semibold text-primary hover:underline"
        >
          Clear {label} filter
        </button>
      ) : null}
    </div>
  );
};

/**
 * One column's filter, promoted onto the bar (Figma 716:15029).
 *
 * The trigger is a Bloocks FilterChip, the same as the Received date chip
 * beside it. The body is `ColumnFilter` — the same searchable multi-select the
 * column-header funnel opens — rather than a second list written to look like
 * it, so "Source" means one thing wherever it is answered.
 *
 * The chip says what is applied because it is the only place an applied quick
 * filter shows: a dropdown that silently filters the grid is worse than a wide
 * one.
 */
export const QuickFilter = ({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: FilterOption[];
  selected: string[];
  onChange: (next: string[]) => void;
}) => (
  <Popover>
    <PopoverTrigger asChild>
      {/* A Bloocks FilterChip: it names what is applied ("Source:
          WhatsApp", or a count for several) and its × clears in place. */}
      <FilterChip
        label={label}
        selectionType="multiple"
        value={selected.map(
          (value) => options.find((o) => o.value === value)?.label ?? value
        )}
        onClearButtonClick={() => onChange([])}
      />
    </PopoverTrigger>
    <PopoverContent align="start" className="w-auto p-0">
      <ColumnFilter
        label={label}
        options={options}
        selected={selected}
        onChange={onChange}
      />
    </PopoverContent>
  </Popover>
);
