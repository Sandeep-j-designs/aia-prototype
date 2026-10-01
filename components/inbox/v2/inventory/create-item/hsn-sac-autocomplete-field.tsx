import React, { useMemo, useState } from "react";
import { Check, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { Option } from "@/types/pages/inbox/inventory";
import { T } from "@/components/inbox/v2/ui";

type Props = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  disabled?: boolean;
  invalid?: boolean;
  placeholder?: string;
};

/** "151219 - Sunflower…" → "Sunflower…" (production's renderHsnSacOption) */
const descriptionOf = (option: Option) => {
  const prefix = `${option.value} - `;
  return option.label.startsWith(prefix)
    ? option.label.slice(prefix.length)
    : option.label;
};

/** production's HighlightedText: the matched run in the brand ink. */
const Highlighted = ({ text, query }: { text: string; query: string }) => {
  const q = query.trim().toLowerCase();
  const at = q ? text.toLowerCase().indexOf(q) : -1;
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <span className="font-semibold text-primary">
        {text.slice(at, at + q.length)}
      </span>
      {text.slice(at + q.length)}
    </>
  );
};

/**
 * production's create-item/hsn-sac-autocomplete-field.tsx: type a 2, 4, 6 or
 * 8 digit code, or pick one from the company's HSN/SAC list — searchable by
 * code or description. Custom input is digits only, eight at most.
 *
 * DEV: production pages the list from
 *      GET /api/accounting-masters/hsn-sac?cursor=…&search=…
 *      (fetchPaginatedHsnSacOptionsForLedger); here it is filtered locally.
 */
const HsnSacAutocompleteField = ({
  id,
  value,
  onChange,
  options,
  disabled = false,
  invalid,
  placeholder = "Select or type 2, 4, 6, or 8 digit HSN/SAC",
}: Props) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [active, setActive] = useState(0);
  // Typed digits narrow the list to codes that start with them; a value that
  // was picked, or loaded with the item, shows the whole list on reopen.
  const [typed, setTyped] = useState(false);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return options.filter(
      (option) =>
        (!typed || !value || option.value.startsWith(value)) &&
        (!term ||
          option.value.includes(term) ||
          descriptionOf(option).toLowerCase().includes(term))
    );
  }, [options, value, typed, search]);

  const choose = (option: Option) => {
    onChange(option.value);
    setSearch("");
    setTyped(false);
    setOpen(false);
  };

  return (
    <Popover open={open && !disabled} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div className="relative">
          <Input
            id={id}
            role="combobox"
            aria-expanded={open}
            aria-invalid={invalid || undefined}
            placeholder={placeholder}
            disabled={disabled}
            value={value}
            inputMode="numeric"
            className={cn("pr-8", invalid && "border-destructive-foreground")}
            onFocus={() => setOpen(true)}
            onClick={() => setOpen(true)}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "").slice(0, 8);
              onChange(digits);
              setTyped(true);
              setActive(0);
              setOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setOpen(true);
                setActive((i) => Math.min(i + 1, visible.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter" && open && visible[active]) {
                e.preventDefault();
                choose(visible[active]);
              } else if (e.key === "Escape") {
                setOpen(false);
              }
            }}
          />
          {value && !disabled ? (
            <button
              type="button"
              aria-label="Clear HSN/SAC"
              onClick={() => onChange("")}
              className="absolute right-2 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded-md text-secondary-foreground hover:text-primary"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] min-w-[360px] p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => {
          // Clicks back in the input keep the list open.
          if ((e.target as HTMLElement)?.id === id) e.preventDefault();
        }}
      >
        <div className="relative border-b border-neutral-gray p-2">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary-foreground" />
          <Input
            aria-label="Search HSN/SAC"
            placeholder="Search by code or description"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setActive(0);
            }}
            className="h-8 pl-8"
          />
        </div>
        <div role="listbox" className="max-h-[260px] overflow-y-auto p-1">
          {visible.length ? (
            visible.map((option, index) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={option.value === value}
                onMouseEnter={() => setActive(index)}
                onClick={() => choose(option)}
                className={cn(
                  "flex w-full items-start gap-4 rounded-sm px-2 py-1.5 text-left text-sm text-foreground",
                  index === active && "bg-accent"
                )}
              >
                <span className="w-14 flex-none tabular-nums">
                  <Highlighted text={option.value} query={search || value} />
                </span>
                <span className="min-w-0 flex-1 whitespace-normal text-secondary-foreground">
                  <Highlighted text={descriptionOf(option)} query={search} />
                </span>
                <Check
                  className={cn(
                    "mt-0.5 h-4 w-4 flex-none text-primary",
                    option.value === value ? "visible" : "invisible"
                  )}
                />
              </button>
            ))
          ) : (
            <p className={cn(T.value, "px-2 py-2")}>
              {value
                ? `No match in your list. ${value} will be used as typed.`
                : "No HSN/SAC found."}
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default HsnSacAutocompleteField;
