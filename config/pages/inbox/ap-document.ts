import type { InboxItem } from "@/types/pages/inbox";
import { gstinFor, partyNamed } from "./mock-parties";

/**
 * What the inbox hands the AP sheet.
 *
 * The AP prototype's extraction takes a document, not a filled-in voucher: a
 * supplier as printed, an invoice number, a date, and lines carrying what the
 * supplier wrote. It matches the vendor itself, proposes the masters the book
 * is missing, infers the codes, and works out GST and TDS. So the inbox hands
 * over the *document* and lets that pipeline run, rather than pre-deciding any
 * of it — which is the whole reason for embedding the sheet instead of
 * rebuilding it.
 *
 * The shape here is the AP file's `SAMPLE`. Anything omitted falls back to that
 * object's own value on the other side.
 *
 * DEV: replace with the extraction payload from GET /api/inbox/:id/document.
 * The field names are already the ones the AP sheet reads.
 */

export type ApDocumentLine = {
  /** What the supplier printed for this line. */
  text: string;
  /** The code the supplier printed, if any. Ours is inferred, not assumed. */
  hsn: string;
  gst: number;
  /** Item lines carry a quantity and a rate; ledger lines carry an amount. */
  route: "item" | "ledger";
  qty?: number;
  rate?: number;
  unit?: string;
  amount?: number;
  disc?: number;
  discType?: "pct" | "flat";
  cc?: string;
  /** Left empty when the document names nothing our book already holds. */
  item?: string;
  ledger?: string;
};

export type ApDocument = {
  fileName: string;
  branch: string;
  voucherType: string;
  supplier: {
    name: string;
    gstin: string;
    pan: string;
    address: string;
    /** Payment terms in days, as the document states them. */
    credit: number;
  };
  supplierInvoiceNo: string;
  billDate: string;
  dueDate: string;
  narration: string;
  lines: ApDocumentLine[];
};

const MONTHS: Record<string, string> = {
  jan: "01",
  feb: "02",
  mar: "03",
  apr: "04",
  may: "05",
  jun: "06",
  jul: "07",
  aug: "08",
  sep: "09",
  oct: "10",
  nov: "11",
  dec: "12",
};

/** "12 May 2026" → "2026-05-12". The mock carries display dates; the sheet needs ISO. */
const toIso = (value: string): string => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const match = String(value || "")
    .trim()
    .match(/^(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(\d{4})$/);
  if (!match) return "";
  const [, day, month, year] = match;
  const monthNo = MONTHS[month.toLowerCase()];
  return monthNo ? `${year}-${monthNo}-${day.padStart(2, "0")}` : "";
};

/**
 * The GST rate the document charged, read back off the tax figures rather than
 * assumed. A document that states CGST and SGST was an intra-state supply; the
 * sheet works the split out for itself once it knows the rate.
 */
const rateFrom = (item: InboxItem): number => {
  const bill = item.bill;
  if (!bill?.subTotal) return 18;
  const taxes = bill.taxes;
  const total = (taxes.cgst ?? 0) + (taxes.sgst ?? 0) + (taxes.igst ?? 0);
  if (!total) return 0;
  const raw = (total / bill.subTotal) * 100;
  /* Snap to a real slab — the mock's own sub-total and line sum disagree on
     some items, and a rate of 17.95% is an artefact of that, not a rate any
     supplier charged. */
  return [0, 0.25, 3, 5, 12, 18, 28].reduce((best, slab) =>
    Math.abs(slab - raw) < Math.abs(best - raw) ? slab : best
  );
};

/** The tenant's own branch on these documents. */
const OUR_STATE_CODE = "29"; // Karnataka — matches br-ka in the AP book

/**
 * The supplier as the document prints them.
 *
 * `file-preview` draws this header and the AP sheet reads it, so it lives in
 * one place — the two disagreeing would put a GSTIN on the facsimile that the
 * sheet never saw.
 *
 * The state code follows the document's own tax split rather than being fixed:
 * a document stating CGST and SGST was an intra-state supply, so its supplier
 * is registered in our state. The preview previously hardcoded a Maharashtra
 * GSTIN onto a bill showing CGST and SGST, which is a contradiction — a bill
 * from Maharashtra to Karnataka charges IGST.
 */
export const printedSupplier = (item: InboxItem) => {
  const known = partyNamed(item.vendor);
  const taxes = item.bill?.taxes;
  const intra = Boolean(taxes?.cgst != null || taxes?.sgst != null);
  const pan = known?.gstin.slice(2, 12) ?? "AAJCS7210K";
  return {
    name: item.vendor ?? "",
    gstin: known?.gstin ?? gstinFor(intra ? OUR_STATE_CODE : "27", pan),
    pan,
    address: known?.address ?? "Address as printed on the document",
    cin: known?.cin ?? "",
    /* The facsimile prints "Payment due within N days" off this. The AP
       prototype's own sample supplier carries no credit term, so standalone it
       renders "undefined" — worth fixing there; passing it here at least keeps
       the embedded document honest. */
    credit: 30,
  };
};

export const apDocumentFor = (item: InboxItem): ApDocument | null => {
  const bill = item.bill;
  if (!bill) return null;

  const gst = rateFrom(item);
  const supplier = printedSupplier(item);

  return {
    fileName: item.file.name,
    branch: "br-ka",
    voucherType: item.voucherType?.toLowerCase().includes("debit")
      ? "debit-note"
      : "purchase",

    /*
      The supplier as the document printed them — the same header the facsimile
      draws. The sheet matches this against the book itself; when nothing
      matches it proposes a vendor master built from these very fields, which is
      what the GSTIN is doing here: it carries the state code, the PAN, and
      through the PAN's fourth character the deductee type, so a bill from a
      party the book has never seen is still fully priceable.
    */
    supplier: {
      name: supplier.name,
      gstin: supplier.gstin,
      pan: supplier.pan,
      address: supplier.address,
      credit: supplier.credit,
    },

    supplierInvoiceNo: bill.supplierInvoiceNo,
    billDate: toIso(bill.billDate),
    dueDate: toIso(bill.dueDate),
    narration: item.source.subject ? `From email — ${item.source.subject}` : "",

    /*
      Every extracted line goes over as a ledger line: it carries a description
      and an amount and no quantity or rate, which is what a ledger line is.
      Putting them in the item table would state a quantity the document never
      printed.

      The ledger is deliberately left empty. The inbox's own ledger names are
      not the AP book's, and handing over a name the book does not hold would
      pre-empt the prediction — leaving it blank is what lets the sheet read the
      description, propose a ledger, and say why.
    */
    lines: bill.items.map((line) => ({
      text: line.desc,
      hsn: "",
      amount: line.amount,
      gst,
      cc: "",
      route: "ledger" as const,
      ledger: "",
    })),
  };
};
