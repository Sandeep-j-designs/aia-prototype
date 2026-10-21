import React, { useEffect, useMemo, useState } from "react";
import { Check, FileText, Search } from "@/components/icons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { companyOf, useStore } from "@/components/inbox/v2/store";
import { day, money } from "@/utils/pages/neo";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** What is picked already, ticked when the picker opens. */
  value: string[];
  onPick: (ids: string[]) => void;
};

const FILTERS = [
  { id: "all", label: "All" },
  { id: "review", label: "Needs review" },
  { id: "approved", label: "Approved" },
] as const;
type Filter = (typeof FILTERS)[number]["id"];

const ROUTE = { AP: "Purchase", AR: "Sales", JV: "Journal" } as const;

/**
 * + › Pick from Inbox: the company's documents, searchable, to tick and hand
 * to Neo. What is picked becomes "this" for the next request — the same as
 * ticking rows in the Inbox — so "move these to Freight Inward" or "chase
 * these vendors" works from Neo's page too.
 */
const InboxPicker = ({ open, onOpenChange, value, onPick }: Props) => {
  const state = useStore();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [ticked, setTicked] = useState<string[]>(value);
  useEffect(() => {
    if (open) {
      setTicked(value);
      setQuery("");
    }
  }, [open, value]);

  const docs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.items
      .filter(
        (x) =>
          x.company === state.company &&
          !x.priorVoucher &&
          !x.created &&
          x.status !== "Deleted"
      )
      .filter((x) =>
        filter === "review"
          ? ["Needs Review", "Duplicate"].includes(x.status)
          : filter === "approved"
            ? x.status === "Approved"
            : true
      )
      .filter(
        (x) =>
          !q ||
          [x.file.name, x.form.party, x.form.invoiceNo, x.id].some((v) =>
            v?.toLowerCase().includes(q)
          )
      );
  }, [state.items, state.company, query, filter]);

  const toggle = (id: string) =>
    setTicked((t) => (t.includes(id) ? t.filter((x) => x !== id) : [...t, id]));
  const allShown = docs.length > 0 && docs.every((x) => ticked.includes(x.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(640px,90dvh)] max-w-[640px] flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-pi-line px-5 pb-4 pt-5 text-left">
          <DialogTitle>Pick from Inbox</DialogTitle>
          <DialogDescription>
            {companyOf(state.company)?.name}. Neo works on the documents you
            tick.
          </DialogDescription>
          <div className="flex flex-wrap items-center gap-2 pt-3">
            <label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-sm border border-pi-line-2 bg-background px-2.5 focus-within:border-primary">
              <Search className="h-4 w-4 flex-none text-pi-body" />
              <span className="sr-only">Search documents</span>
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Vendor, file or invoice no."
                className="min-w-0 flex-1 bg-transparent text-[14px] text-pi-ink placeholder:text-pi-faint focus-visible:outline-none"
              />
            </label>
            <div className="flex rounded-md bg-pi-fill p-0.5">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={filter === f.id}
                  onClick={() => setFilter(f.id)}
                  className={cn(
                    "h-8 rounded-sm px-2.5 text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border",
                    filter === f.id
                      ? "bg-background font-medium text-pi-ink shadow-contact"
                      : "text-pi-body hover:text-pi-ink"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </DialogHeader>

        <div className="flex h-9 flex-none items-center gap-3 border-b border-pi-line bg-pi-head-bg px-5 text-[12px] text-pi-body">
          <button
            type="button"
            role="checkbox"
            aria-checked={allShown}
            aria-label="Tick all shown"
            disabled={!docs.length}
            onClick={() =>
              setTicked((t) =>
                allShown
                  ? t.filter((id) => !docs.some((x) => x.id === id))
                  : [...new Set([...t, ...docs.map((x) => x.id)])]
              )
            }
            className={cn(
              "grid h-4 w-4 flex-none place-items-center rounded-xs border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border",
              allShown
                ? "border-primary bg-primary text-primary-foreground"
                : "border-pi-line-2 bg-background"
            )}
          >
            {allShown && <Check className="h-3 w-3" />}
          </button>
          <span className="flex-1">
            {docs.length} document{docs.length === 1 ? "" : "s"}
          </span>
          <span>Amount</span>
        </div>

        <ul className="min-h-0 flex-1 overflow-y-auto" role="listbox" aria-multiselectable>
          {docs.length === 0 && (
            <li className="px-5 py-10 text-center text-[13px] text-pi-body">
              No documents match.
            </li>
          )}
          {docs.map((x) => {
            const on = ticked.includes(x.id);
            return (
              <li key={x.id} className="border-b border-pi-line last:border-b-0">
                <button
                  type="button"
                  role="option"
                  aria-selected={on}
                  onClick={() => toggle(x.id)}
                  className={cn(
                    "flex w-full items-center gap-3 px-5 py-2.5 text-left transition-colors focus-visible:bg-pi-fill focus-visible:outline-none",
                    on ? "bg-pi-brand-tint" : "hover:bg-pi-row-hover"
                  )}
                >
                  <span
                    className={cn(
                      "grid h-4 w-4 flex-none place-items-center rounded-xs border",
                      on
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-pi-line-2 bg-background"
                    )}
                  >
                    {on && <Check className="h-3 w-3" />}
                  </span>
                  <FileText className="h-4 w-4 flex-none text-pi-body" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-pi-ink">
                      {x.form.party || x.file.name}
                    </span>
                    <span className="block truncate text-body-4 text-pi-body">
                      {[
                        ROUTE[x.route],
                        x.form.invoiceNo || x.file.name,
                        x.form.date && day(x.form.date),
                        x.status,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  <span className="text-[13px] font-medium tabular-nums text-pi-ink">
                    {x.amount ? money(x.amount) : "—"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <footer className="flex flex-none items-center justify-between gap-3 border-t border-pi-line bg-background px-5 py-3">
          <span className="text-[13px] text-pi-body">
            {ticked.length ? `${ticked.length} ticked` : "Nothing ticked"}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-9 rounded-sm border border-pi-line-2 bg-background px-3.5 text-[13px] font-medium text-pi-ink shadow-contact hover:bg-pi-fill focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!ticked.length && !value.length}
              onClick={() => {
                onPick(ticked);
                onOpenChange(false);
              }}
              className="h-9 rounded-sm border border-pi-btn-primary-edge bg-pi-btn-fill px-3.5 text-[13px] font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
            >
              {ticked.length
                ? `Use ${ticked.length} document${ticked.length === 1 ? "" : "s"}`
                : "Clear"}
            </button>
          </div>
        </footer>
      </DialogContent>
    </Dialog>
  );
};

export default InboxPicker;
