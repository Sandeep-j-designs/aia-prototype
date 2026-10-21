import type { SourceRegion } from "@/types/pages/inbox";

/**
 * Which part of the source document a review-form field was read from.
 *
 * The three review forms are built three ways — the AP and AR sheets are
 * vanilla engines injected into this document, the journal is React — so this
 * reads the focused element rather than asking each form to report itself:
 *
 *   - anything inside `[data-source="<key>"]` names its region outright (the
 *     journal, and any React form that wants to opt in);
 *   - an engine header field is a `[data-bind]` control, mapped below;
 *   - an engine line cell is a `[data-f]` control inside `tr.cr-tr`, which
 *     points at that line on the document.
 *
 * The answer is a list of region keys, best first. A document prints what it
 * prints: a supplier's state may only be readable off their GSTIN, a corporate
 * invoice may not print an HSN per line. The viewer takes the first key the
 * document actually has, and highlights nothing when it has none — a ledger or
 * a voucher number is our own decision, not something read off the page.
 */

export type SourceTarget = {
  /** Region keys, best first. `line.N` keys use the form's line index. */
  keys: string[];
  /** The form field, named as the form names it, for the highlight's tag. */
  label: string;
  /** Form line index, when the field belongs to a line. */
  line?: number;
  /**
   * The line's description as the form holds it. The document's lines are
   * matched by this before position, so a line the reviewer reordered or
   * inserted above still finds its own source.
   */
  lineText?: string;
};

type Form = "ap" | "ar" | "jv";

const party = { ap: "seller", ar: "buyer" } as const;
const us = { ap: "buyer", ar: "seller" } as const;

/** Engine header fields → where the document prints them. */
const BINDS: Record<
  string,
  (form: "ap" | "ar") => { keys: string[]; label: string } | null
> = {
  vendor: () => ({ keys: ["seller.name"], label: "Vendor" }),
  customer: () => ({ keys: ["buyer.name"], label: "Customer" }),
  gstin: (f) => ({ keys: [`${party[f]}.gstin`], label: "GSTIN" }),
  billingAddress: (f) => ({
    keys: [`${party[f]}.address`],
    label: "Billing address",
  }),
  gstTreatment: (f) => ({
    keys: [`${party[f]}.gstin`],
    label: "GST treatment",
  }),
  sourceState: () => ({
    keys: ["seller.state", "seller.gstin", "seller.address"],
    label: "Source of supply",
  }),
  destState: () => ({
    keys: ["doc.placeOfSupply", "buyer.state", "buyer.gstin"],
    label: "Destination of supply",
  }),
  supplierInvoiceNo: () => ({
    keys: ["doc.number"],
    label: "Supplier invoice no.",
  }),
  // On a sales invoice our voucher number is the invoice's own number.
  voucherNo: (f) =>
    f === "ar" ? { keys: ["doc.number"], label: "Invoice no." } : null,
  billDate: () => ({ keys: ["doc.date"], label: "Bill date" }),
  invoiceDate: () => ({ keys: ["doc.date"], label: "Invoice date" }),
  dueDate: () => ({ keys: ["doc.dueDate"], label: "Due date" }),
  customerPoNo: () => ({ keys: ["doc.poNo"], label: "Customer PO no." }),
  // Our GST registration is the one the document was addressed to or from.
  branch: (f) => ({
    keys: [`${us[f]}.gstin`, `${us[f]}.name`],
    label: "GST registration",
  }),
};

/** Engine line cells → the cell on the document's line. */
const CELLS: Record<string, { cell?: string; label: string }> = {
  description: { cell: "desc", label: "Description" },
  item: { cell: "desc", label: "Item" },
  hsn: { cell: "hsn", label: "HSN/SAC" },
  qty: { cell: "qty", label: "Quantity" },
  rate: { cell: "rate", label: "Rate" },
  amount: { cell: "amount", label: "Amount" },
  discount: { label: "Discount" },
  ledger: { label: "Ledger" },
  godown: { label: "Godown" },
  costCentre: { label: "Cost centre" },
};

const lineKeys = (n: number, cell?: string) =>
  cell ? [`line.${n}.${cell}`, `line.${n}`] : [`line.${n}`];

const formOf = (el: Element): Form | null =>
  el.closest(".jv-form")
    ? "jv"
    : el.closest(".ar-sheet")
      ? "ar"
      : el.closest(".ap-sheet")
        ? "ap"
        : null;

export const sourceTargetOf = (el: Element | null): SourceTarget | null => {
  if (!el) return null;
  const form = formOf(el);
  if (!form) return null;

  const tagged = el.closest<HTMLElement>("[data-source]");
  if (tagged) {
    const key = tagged.dataset.source || "";
    const row = el.closest<HTMLElement>("[data-source-line]");
    const line = row ? Number(row.dataset.sourceLine) : undefined;
    const cell = /^line\.\d+\.(.+)$/.exec(key)?.[1];
    return {
      keys: line != null ? lineKeys(line, cell) : [key],
      label: tagged.dataset.sourceLabel || key,
      line,
    };
  }
  if (form === "jv") return null;

  const tr = el.closest<HTMLElement>("tr.cr-tr");
  if (tr) {
    const rows = Array.from(
      tr.parentElement?.querySelectorAll(":scope > tr.cr-tr") || []
    );
    const line = rows.indexOf(tr);
    const control = el.closest<HTMLElement>("[data-f]");
    const f =
      control?.dataset.f ||
      (el.closest("[data-cr-item]") ? "item" : "") ||
      (el.closest(".cr-amt") ? "amount" : "");
    const meta = CELLS[f] || { label: "Line" };
    const text =
      tr.querySelector<HTMLInputElement>('[data-f="description"]')?.value || "";
    return {
      keys: lineKeys(line, meta.cell),
      label: `Line ${line + 1} · ${meta.label}`,
      line,
      lineText: text,
    };
  }

  // A header field: the control itself, or the one in the field it sits in.
  const bound =
    el.closest<HTMLElement>("[data-bind]") ||
    el
      .closest<HTMLElement>(".field, .control, .cr-row")
      ?.querySelector<HTMLElement>("[data-bind]");
  const bind = bound?.dataset.bind;
  return (bind && BINDS[bind]?.(form)) || null;
};

/**
 * The form's line index → the document's. By description first (the form
 * holds the extracted text until someone edits it), then by position.
 */
export const documentLine = (
  target: SourceTarget,
  printed: string[]
): number | undefined => {
  if (target.line == null) return undefined;
  const text = target.lineText?.trim().toLowerCase();
  const byText = text
    ? printed.findIndex((p) => p.trim().toLowerCase() === text)
    : -1;
  if (byText >= 0) return byText;
  return target.line < printed.length ? target.line : undefined;
};

/** The first of the target's keys the document has, with its region. */
export const regionFor = (
  target: SourceTarget,
  regions: Record<string, SourceRegion>,
  printed: string[]
): { key: string; region: SourceRegion; row?: SourceRegion } | null => {
  const line = documentLine(target, printed);
  if (target.line != null && line == null) return null;
  const keys = target.keys.map((k) =>
    line != null ? k.replace(/^line\.\d+/, `line.${line}`) : k
  );
  const key = keys.find((k) => regions[k]);
  if (!key) return null;
  const row = line != null ? regions[`line.${line}`] : undefined;
  return {
    key,
    region: regions[key],
    row: row && row !== regions[key] ? row : undefined,
  };
};
