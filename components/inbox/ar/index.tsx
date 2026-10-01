import React, { useState } from "react";
import { Settings } from "lucide-react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { EditedMark } from "@/components/inbox/v2/ui";
import Preview from "@/components/inbox/v2/preview";
import {
  arTotals,
  blankArItem,
  blankArLedger,
  blankArSheet,
  arRowId,
  companyOf,
  setArSheet,
  type Form,
  type Item,
} from "@/components/inbox/v2/store";
import {
  AR_ADDITIONAL_SECTIONS,
  AR_FIELD_SECTIONS,
  type ArInvoiceState,
  type ArItemRow,
  type ArLedgerRow,
  type ArTaxRow,
} from "@/types/pages/inbox/ar-invoice";
import HeaderCard from "./header-card";
import ItemDetails from "./item-details";
import { Ledgers, Taxes } from "./ledgers-and-taxes";
import { AdditionalDetails, InvoiceTotals } from "./totals";
import FieldConfiguration from "./field-configuration";

/**
 * The sales invoice review surface. Figma node 12759:94644.
 *
 * A port of the "Add New Invoice" page into the Inbox, minus the page's own
 * chrome: it owns a title and a Discard / Allocate Invoice pair, and here the
 * Inbox header already holds Delete and Approve & Next — the same two
 * decisions under the names this queue gives them.
 *
 * The one structural change is the document. That page has no source file to
 * show; an Inbox item always does, so the invoice sits in a resizable split
 * beside it — the same arrangement the AP bills sheet uses, and the reason AR
 * takes the full width rather than the 40/60 the journal gets.
 *
 * DEV: on transplant this directory moves as-is. `setArSheet` in the store is
 * the seam — it is what re-projects these tables onto the Inbox's `form`.
 */

type Props = {
  item: Item;
  attempted: boolean;
  readOnly?: boolean;
  onEdit: (patch: Partial<Form>) => void;
};

const SalesInvoice = ({ item, attempted, readOnly, onEdit }: Props) => {
  const [configOpen, setConfigOpen] = useState(false);
  const [itemSelection, setItemSelection] = useState<string[]>([]);
  const [ledgerSelection, setLedgerSelection] = useState<string[]>([]);

  const form = readOnly ? item.snapshot || item.form : item.form;
  const sheet =
    (readOnly ? item.arSnapshot || item.arSheet : item.arSheet) ??
    blankArSheet();
  const branches = companyOf(item.company)?.branches ?? [];
  const totals = arTotals(sheet);

  /** Every write goes through the store, which re-derives `form.lines`. */
  const write = (patch: Partial<ArInvoiceState>, field?: string) =>
    setArSheet(item.id, { ...sheet, ...patch }, field);

  /*
    A voucher cannot post without an income ledger for its stock lines, and the
    frame marks that picker required. Shown on attempt rather than on sight —
    the same rule the journal uses, for the same reason.
  */
  const ledgerError =
    attempted &&
    !readOnly &&
    !sheet.salesLedger &&
    sheet.items.some((r) => r.amount);

  /** Generic row helpers, shared by all three tables. */
  const rowOps = <T extends { id: string }>(
    key: "items" | "ledgers" | "taxes",
    rows: T[],
    blank: () => T
  ) => ({
    onRow: (id: string, patch: Partial<T>) =>
      write(
        {
          [key]: rows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        } as Partial<ArInvoiceState>,
        key
      ),
    onAdd: () =>
      write({ [key]: [...rows, blank()] } as Partial<ArInvoiceState>),
    onDuplicate: (id: string) => {
      const at = rows.findIndex((r) => r.id === id);
      if (at < 0) return;
      const copy = { ...rows[at], id: arRowId() };
      write(
        {
          [key]: [...rows.slice(0, at + 1), copy, ...rows.slice(at + 1)],
        } as Partial<ArInvoiceState>,
        key
      );
    },
    /** The last row empties rather than goes; a table with none is unusable. */
    onRemove: (id: string) =>
      write(
        {
          [key]:
            rows.length <= 1
              ? rows.map((r) => (r.id === id ? blank() : r))
              : rows.filter((r) => r.id !== id),
        } as Partial<ArInvoiceState>,
        key
      ),
  });

  const items = rowOps<ArItemRow>("items", sheet.items, blankArItem);
  const ledgers = rowOps<ArLedgerRow>("ledgers", sheet.ledgers, blankArLedger);
  const taxes = rowOps<ArTaxRow>("taxes", sheet.taxes, () => ({
    id: arRowId(),
    ledger: "",
    costCentre: "",
    amount: 0,
  }));

  /**
   * How many Additional Details groups have been answered.
   *
   * The four groups the bar counts are Field Configuration sections, so a
   * group is "filled" when something in it has been switched on — not when
   * some unrelated field on the form happens to carry a value. Those sections
   * have no fields drawn in the design yet, so the count sits at 4 of 4 to be
   * filled, which is what the frame shows.
   */
  const filledSections = AR_ADDITIONAL_SECTIONS.filter((name) => {
    const section = AR_FIELD_SECTIONS.find((s) => s.label === name);
    return section?.fields.some((f) => sheet.fields[f.id]);
  }).length;

  const form_ = (
    <div className="flex min-w-0 flex-col gap-6 p-5">
      {/*
        Entry mode reads as navigation, not as a switch: the two modes are two
        views of the same invoice, and a segmented control framed them as a
        setting you flip. Underlined tabs on a full-width hairline — the same
        treatment the Inbox list tabs use and the AP sheet now uses, so the
        three surfaces agree on what a mode looks like.
      */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-gray">
        <Tabs
          value={sheet.mode}
          onValueChange={(v) => write({ mode: v as ArInvoiceState["mode"] })}
        >
          <TabsList className="h-auto gap-2 rounded-none bg-transparent p-0">
            {[
              { value: "item", label: "Item Mode" },
              { value: "accounting", label: "Accounting Mode" },
            ].map((t) => (
              <TabsTrigger
                key={t.value}
                value={t.value}
                disabled={readOnly}
                // -1px so the active rule lands ON the hairline above, not
                // stacked a pixel over it.
                className="-mb-px rounded-none border-b-2 border-transparent px-2.5 py-3 text-sm text-secondary-foreground shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-primary data-[state=active]:shadow-none"
              >
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        {readOnly ? null : (
          <div className="flex items-center gap-4 pb-2">
            <Separator orientation="vertical" className="h-6 bg-neutral-gray" />
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-foreground"
              onClick={() => setConfigOpen(true)}
            >
              <Settings className="h-5 w-5 text-secondary-foreground" />
              Field Configuration
            </Button>
          </div>
        )}
      </div>

      <HeaderCard
        form={form}
        branches={branches}
        edited={readOnly ? [] : item.edited}
        customerMissing={item.original.invoice?.customerMissing}
        readOnly={readOnly}
        onChange={onEdit}
      />

      {readOnly ? null : (
        <AdditionalDetails
          filled={filledSections}
          onAdd={() => setConfigOpen(true)}
        />
      )}

      {/*
        Item Mode bills stock; Accounting Mode bills ledgers. The frames give
        Item Details to the first and the Ledgers table is common to both, so
        switching mode drops the stock table rather than rearranging the page.
      */}
      {sheet.mode === "item" ? (
        <ItemDetails
          rows={sheet.items}
          salesLedger={sheet.salesLedger}
          selected={itemSelection}
          readOnly={readOnly}
          ledgerError={ledgerError}
          onSalesLedger={(v) => write({ salesLedger: v }, "salesLedger")}
          onSelect={setItemSelection}
          {...items}
        />
      ) : null}

      <Ledgers
        rows={sheet.ledgers}
        selected={ledgerSelection}
        readOnly={readOnly}
        onSelect={setLedgerSelection}
        {...ledgers}
      />

      <Taxes rows={sheet.taxes} readOnly={readOnly} {...taxes} />

      <InvoiceTotals
        narration={form.narration}
        narrationEnabled={!!sheet.fields.narration || !!form.narration}
        subTotal={totals.subTotal}
        discount={totals.discount}
        tax={totals.tax}
        grandTotal={totals.grandTotal}
        readOnly={readOnly}
        onNarration={(v) => onEdit({ narration: v })}
        mark={
          !readOnly && item.edited.includes("narration") ? <EditedMark /> : null
        }
      />

      <FieldConfiguration
        open={configOpen}
        value={sheet.fields}
        onClose={() => setConfigOpen(false)}
        onSave={(fields) => {
          write({ fields }, "fields");
          setConfigOpen(false);
        }}
      />
    </div>
  );

  return (
    <ResizablePanelGroup direction="horizontal" className="min-h-0 flex-1">
      <ResizablePanel defaultSize={32} minSize={18} className="min-w-0">
        <Preview item={item} />
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={68} minSize={40} className="min-w-0">
        <div className="h-full overflow-auto">{form_}</div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
};

export default SalesInvoice;
