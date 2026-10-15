import React, { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  ADDITIONAL_LABELS,
  AR_ADDITIONAL_GROUPS,
  fieldConfigDefaults,
  isLive,
  type AdditionalGroupId,
  type FieldConfig,
} from "@/config/pages/inbox/additional-fields";
import { cn } from "@/lib/utils";
import {
  columnSelections,
  type FieldMappings,
} from "@/utils/pages/inbox/sales-upload";

/**
 * Field Configuration, from the Map Fields page — the same setting the sales
 * invoice's own Field Configuration edits, laid out the same way: the groups
 * down the left, each group's master switch and its fields on the right.
 *
 * It commits on Save and not before. Every switch edits a draft; Cancel, Esc
 * and the X throw it away. Save stays down until the draft differs from what
 * is in force.
 */

type Props = {
  open: boolean;
  config: FieldConfig;
  /** The open batch's mapping — what a switch would take a column away from. */
  mappings: FieldMappings;
  onClose: () => void;
  onSave: (config: FieldConfig) => void;
};

const clone = (c: FieldConfig): FieldConfig => JSON.parse(JSON.stringify(c));
const same = (a: FieldConfig, b: FieldConfig) =>
  JSON.stringify(a) === JSON.stringify(b);

const FieldConfigDialog = ({
  open,
  config,
  mappings,
  onClose,
  onSave,
}: Props) => {
  const [draft, setDraft] = useState<FieldConfig>(() => clone(config));
  const [tab, setTab] = useState<AdditionalGroupId>(AR_ADDITIONAL_GROUPS[0].id);

  // Each opening starts from what is in force, not from a draft left behind.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setDraft(clone(config));
  }

  const columnOf = Object.fromEntries(
    Object.entries(columnSelections(mappings)).map(([column, key]) => [
      key,
      column,
    ])
  ) as Record<string, string>;

  /* A conditional field switched off while its trigger stays mapped would
     retire the rule instead of meeting it — invoices would arrive with an
     order number and no date, and nothing would say so. Switching both off
     is fine: the pair leaves together. The sheet refuses the same thing. */
  const clashes = AR_ADDITIONAL_GROUPS.flatMap((g) => g.fields)
    .filter(
      (f) =>
        f.req &&
        !!columnOf[f.req] &&
        isLive(draft, f.req) &&
        !isLive(draft, f.key)
    )
    .map((f) => ({ field: f.label, trigger: ADDITIONAL_LABELS[f.req!] }));

  /* Columns this draft would hand back to unmapped. Allowed — it is what
     switching a field off means — but said before it happens. */
  const dropped = Object.keys(columnOf).filter(
    (key) =>
      key in ADDITIONAL_LABELS && isLive(config, key) && !isLive(draft, key)
  );

  const count = (id: AdditionalGroupId) => {
    const g = AR_ADDITIONAL_GROUPS.find((x) => x.id === id)!;
    const c = draft[id];
    return c.on
      ? `${g.fields.filter((f) => c.fields[f.id] !== false).length}/${g.fields.length}`
      : "Off";
  };

  const group = AR_ADDITIONAL_GROUPS.find((g) => g.id === tab)!;
  const c = draft[group.id];
  const set = (change: (next: FieldConfig) => void) =>
    setDraft((current) => {
      const next = clone(current);
      change(next);
      return next;
    });

  /* The footer line: a clash blocks Save, so it wins over the softer note. */
  const footNote =
    clashes.length > 0
      ? {
          tone: "danger" as const,
          text:
            clashes.length === 1
              ? `${clashes[0].field} is required while ${clashes[0].trigger} is mapped. Unmap that column first, or leave this field on.`
              : `${clashes.length} fields are required by columns already mapped. Unmap those columns first, or leave the fields on.`,
        }
      : dropped.length > 0
        ? {
            tone: "warning" as const,
            text:
              dropped.length === 1
                ? `“${columnOf[dropped[0]]}” will go back to unmapped.`
                : `${dropped.length} mapped columns will go back to unmapped.`,
          }
        : null;

  /*
    The sales invoice's own Field Configuration (public/ar/index.html, #fc-dialog
    and its .fcd / .fcrow rules), rebuilt on the app's tokens: a ruled header
    and footer, the groups as a plain rail with the selected one tinted, the
    group's switch on a tinted band, the fields as hairline-ruled rows, Reset
    to Default in red. One deliberate difference: the body is a fixed height
    with the field list scrolling under the band, where the sheet's dialog
    grows and shrinks with the group.
  */
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="flex max-h-[86vh] w-[94vw] max-w-[880px] flex-col gap-0 overflow-hidden rounded-md border-neutral-gray p-0 shadow-[0_4px_12px_rgba(0,0,0,.09)] [&>button]:hidden">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1.5 border-b border-neutral-gray px-7 pb-5 pt-6">
          <DialogTitle className="text-xl font-semibold leading-7 text-foreground">
            Field Configuration
          </DialogTitle>
          <DialogClose
            aria-label="Close without saving"
            className="col-start-2 row-span-2 row-start-1 self-start rounded-md text-secondary-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-6" aria-hidden />
          </DialogClose>
          <DialogDescription className="col-start-1 text-xs leading-[18px] text-secondary-foreground">
            Configure optional voucher fields. The same setting applies on the
            invoice.
          </DialogDescription>
        </div>

        <div className="grid h-[min(480px,calc(86vh-190px))] min-h-0 grid-cols-[216px_minmax(0,1fr)]">
          <div
            role="tablist"
            aria-orientation="vertical"
            aria-label="Field groups"
            className="flex min-h-0 flex-col gap-1 overflow-y-auto border-r border-neutral-gray px-4 py-5"
          >
            {AR_ADDITIONAL_GROUPS.map((g) => {
              const selected = g.id === tab;
              return (
                <button
                  key={g.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setTab(g.id)}
                  className={cn(
                    "flex flex-none items-center justify-between gap-2 rounded-md px-3.5 py-2.5 text-left text-sm font-semibold leading-5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                    selected
                      ? "bg-accent text-primary"
                      : "text-secondary-foreground hover:bg-section"
                  )}
                >
                  <span className="truncate">{g.label}</span>
                  <span className="flex-none text-[11px] font-semibold tabular-nums opacity-70">
                    {count(g.id)}
                  </span>
                </button>
              );
            })}
          </div>

          <div
            role="tabpanel"
            aria-label={group.label}
            className="flex min-h-0 flex-col px-6 pb-5 pt-4"
          >
            <label className="mb-1 flex flex-none items-center gap-4 rounded-md bg-accent px-4 py-[13px]">
              <span className="min-w-0 flex-1 text-sm font-bold leading-5 text-foreground">
                {group.label}
              </span>
              <Switch
                checked={c.on}
                aria-label={`Show ${group.label} on the invoice`}
                // Off, the track would vanish into the band it sits on.
                className="data-[state=unchecked]:bg-primary/25"
                onCheckedChange={(checked) =>
                  set((next) => {
                    next[group.id].on = checked;
                  })
                }
              />
            </label>
            <ul className="min-h-0 flex-1 overflow-y-auto">
              {group.fields.map((f) => {
                const column = columnOf[f.key];
                const note = [
                  column && `Mapped to “${column}”`,
                  f.systemOnly
                    ? "Issued by the IRP — entered on the invoice, never imported."
                    : f.req &&
                      `Mandatory when ${ADDITIONAL_LABELS[f.req]} is filled.`,
                  f.note,
                ]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <li
                    key={f.key}
                    className={cn(
                      "flex flex-none items-center gap-4 border-t border-neutral-gray px-4 py-[13px] first:border-t-0",
                      !c.on && "opacity-40"
                    )}
                  >
                    <span className="min-w-0 flex-1 text-sm leading-5 text-foreground">
                      {f.label}
                      {note && (
                        <span className="mt-[3px] block text-xs leading-[17px] text-secondary-foreground">
                          {note}
                        </span>
                      )}
                    </span>
                    <Switch
                      checked={c.fields[f.id] !== false}
                      disabled={!c.on}
                      aria-label={f.label}
                      onCheckedChange={(checked) =>
                        set((next) => {
                          next[group.id].fields[f.id] = checked;
                        })
                      }
                    />
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <div className="flex items-center gap-2.5 border-t border-neutral-gray px-7 pb-5 pt-4">
          <button
            type="button"
            onClick={() => setDraft(fieldConfigDefaults())}
            className="flex-none text-sm font-semibold leading-5 text-destructive-foreground hover:underline"
          >
            Reset to Default
          </button>
          <span className="min-w-0 flex-1">
            {footNote && (
              <span
                role={footNote.tone === "danger" ? "alert" : undefined}
                className={cn(
                  "ml-5 block max-w-[44ch] rounded-md border px-3 py-1.5 text-xs font-semibold leading-[17px]",
                  footNote.tone === "danger"
                    ? "border-destructive-foreground/20 bg-destructive text-destructive-foreground"
                    : "border-warning-border bg-warning text-warning-foreground"
                )}
              >
                {footNote.text}
              </span>
            )}
          </span>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={same(draft, config) || clashes.length > 0}
            onClick={() => onSave(draft)}
          >
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FieldConfigDialog;
