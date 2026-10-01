import {
  BANK_ACCOUNT_LABEL,
  EXPENSE_LEDGERS,
  INCOME_LEDGERS,
} from "@/config/pages/inbox/conversions";
import { formatInr } from "@/utils/pages/inbox";
import type { InboxItem } from "@/types/pages/inbox";
import type {
  ConversionRequest,
  ConversionSpec,
} from "@/types/pages/inbox/conversion";

/**
 * Builds the ConversionSpec for any of the seven conversion edges.
 *
 * Ported from `describeConversion` in js/conversion-panel.jsx. Pure — it takes
 * an item and a request and returns what the panel should render, so it is
 * trivially testable and holds no React.
 *
 * One change from the original: draft voucher numbers were
 * `Math.floor(Math.random() * 99 + 50)`, which produced a different number on
 * every render and on the server vs the client. They are derived from the item
 * id here so the panel is stable.
 *
 * DEV: the real voucher number comes from the server on POST. Treat every
 *      `status: "locked"` value here as a preview, not a reservation.
 */

/** Stable small integer from a string — replaces the original Math.random(). */
const idSeed = (id: string, min: number, span: number): number => {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return min + (hash % span);
};

/**
 * Reuses the list's formatter rather than keeping a second one. The original
 * had two — `fmtINR` and `fmtINRplain` — and the plain variant dropped trailing
 * zeros, so a bill total rendered as "₹76,425.2" in the conversion panel and
 * "₹76,425.20" in the list. Amounts never lose a paisa in an accounting
 * product; one formatter is the fix.
 */
const inr = (value: number | null | undefined): string =>
  formatInr(value ?? null);

const gstinFrom = (gstReg: string | undefined): string =>
  gstReg?.split("·")[1]?.trim() ?? "—";

const fallbackSpec = (): ConversionSpec => ({
  title: "Convert",
  subtitle: "—",
  consequenceChips: [],
  freeformBanner: null,
  mapping: [],
  preflight: {
    duplicate: { ok: true, message: "—" },
    gstPeriod: { ok: true, message: "—" },
    blastRadius: "—",
  },
  ctaLabel: "Convert",
});

/* ------------------------------------------------------------------ Bill */

const billToJv = (item: InboxItem): ConversionSpec => {
  const bill = item.bill;
  if (!bill) return fallbackSpec();

  const drLines = bill.items
    .map((line) => `${line.ledger}: ${inr(line.amount)}`)
    .join(" / ");

  return {
    title: `Converting Bill — ${bill.supplierInvoiceNo || item.id} → Journal Voucher`,
    subtitle: `From ${item.vendor}`,
    consequenceChips: ["Voucher class → Journal"],
    freeformBanner: null,
    mapping: [
      {
        key: "date",
        sourceLabel: "Bill Date",
        sourceValue: bill.billDate,
        targetLabel: "Voucher Date",
        status: "mapped",
        value: bill.billDate,
      },
      {
        key: "vno",
        sourceLabel: "Supplier Inv. No",
        sourceValue: bill.supplierInvoiceNo,
        targetLabel: "Voucher No",
        status: "locked",
        value: `JV/26-27/${String(idSeed(item.id, 50, 99)).padStart(4, "0")}`,
      },
      {
        key: "dr",
        sourceLabel: "Bill items",
        sourceValue: bill.items.map((line) => line.desc).join(", "),
        targetLabel: "Dr lines",
        status: "mapped",
        value: drLines,
      },
      {
        key: "cr",
        sourceLabel: "Bill total",
        sourceValue: inr(bill.grandTotal),
        targetLabel: "Cr line",
        status: "mapped",
        value: `Vendor — ${item.vendor}: ${inr(bill.grandTotal)}`,
      },
      {
        key: "narration",
        sourceLabel: "Description",
        sourceValue: "Auto-drafted",
        targetLabel: "Narration",
        status: "locked",
        value: `Conversion of bill ${bill.supplierInvoiceNo || "—"} from ${item.vendor}`,
      },
    ],
    preflight: {
      duplicate: {
        ok: true,
        message: "No matching content hash in posted records.",
      },
      gstPeriod: {
        ok: true,
        message: `Bill date ${bill.billDate} — current period (May FY26).`,
      },
      blastRadius:
        "A new Journal Voucher will be posted. The original bill draft is destroyed and the inbox item moves to Done.",
    },
    ctaLabel: "Convert & Post as Journal Voucher",
  };
};

const billToInvoice = (item: InboxItem): ConversionSpec => {
  const bill = item.bill;
  if (!bill) return fallbackSpec();

  const gstin = gstinFrom(bill.gstReg);
  const outputTax = (bill.taxes.cgst ?? 0) + (bill.taxes.sgst ?? 0);

  return {
    title: `Converting Bill — ${bill.supplierInvoiceNo || item.id} → Sales Invoice`,
    subtitle: `From ${item.vendor}`,
    // The three flips that make this the dangerous edge: the party changes
    // side, the tax changes direction, and the ledger changes sign.
    consequenceChips: [
      "Vendor → Customer",
      "Input GST → Output GST",
      "Expense → Income",
    ],
    freeformBanner: null,
    mapping: [
      {
        key: "date",
        sourceLabel: "Bill Date",
        sourceValue: bill.billDate,
        targetLabel: "Invoice Date",
        status: "mapped",
        value: bill.billDate,
      },
      {
        key: "ino",
        sourceLabel: "Supplier Inv. No",
        sourceValue: bill.supplierInvoiceNo,
        targetLabel: "Invoice No",
        status: "locked",
        value: `SOR/26-27/${String(idSeed(item.id, 100, 99) + 335).padStart(4, "0")}`,
      },
      {
        key: "party",
        sourceLabel: "Vendor",
        sourceValue: `${item.vendor} · ${gstin}`,
        targetLabel: "Customer",
        status: "needs",
        control: "party-flip",
        partyType: "Customer",
        partyName: item.vendor,
        partyGstin: gstin,
        suggestedLedger: "Sales Income — Services",
      },
      {
        key: "ledger",
        sourceLabel: bill.items[0]?.ledger || "Expense ledger",
        sourceValue: "Expense side",
        targetLabel: "Income ledger",
        status: "needs",
        control: "ledger-flip",
        ledgerSide: "Income",
        ledgerOptions: INCOME_LEDGERS,
      },
      {
        key: "tax",
        sourceLabel: "Input GST (CGST/SGST)",
        sourceValue: inr(outputTax),
        targetLabel: "Output GST (CGST/SGST)",
        status: "locked",
        value: "Flipped to output side, same rates",
      },
      {
        key: "items",
        sourceLabel: "Bill items",
        sourceValue: bill.items.map((line) => line.desc).join(", "),
        targetLabel: "Invoice line items",
        status: "mapped",
        value: "Carried over as-is",
      },
      {
        key: "total",
        sourceLabel: "Grand Total",
        sourceValue: inr(bill.grandTotal),
        targetLabel: "Invoice Total",
        status: "mapped",
        value: inr(bill.grandTotal),
      },
    ],
    preflight: {
      duplicate: {
        ok: true,
        message: "No matching invoice content hash in posted records.",
      },
      gstPeriod: {
        ok: true,
        message:
          "Bill date in current period; safe to invoice the converted side.",
      },
      blastRadius:
        "A new Sales Invoice will be posted in the current period. The original bill is marked superseded and a reversal entry is posted automatically.",
    },
    ctaLabel: `Convert & Post as Sales Invoice (with reversal of ${bill.voucherNo})`,
  };
};

/* -------------------------------------------------------------------- JV */

const jvToTyped = (
  item: InboxItem,
  target: "Bill" | "Invoice"
): ConversionSpec => {
  const jv = item.jv;
  if (!jv) return fallbackSpec();

  // The original hardcoded this; a real classifier extracts it from the
  // narration. DEV: comes back on the item as an extracted party candidate.
  const partyHint = "Annapoorna Wholesale";
  const label = target === "Bill" ? "Bill" : "Sales Invoice";
  const jvDate = "31 Aug 2026";

  return {
    title: `Converting Journal Voucher — ${item.id} → ${label}`,
    subtitle: `Narration: ${jv.narration.slice(0, 80)}${jv.narration.length > 80 ? "…" : ""}`,
    consequenceChips:
      target === "Bill"
        ? [
            "Journal lines → Bill structure",
            "Receivable → Vendor (payable side)",
            "Date narration → Bill date + Due date",
          ]
        : [
            "Journal lines → Invoice structure",
            "Receivable → Customer",
            "Narration party → Invoiced party",
          ],
    freeformBanner: `A Journal is freeform. A ${label} needs structured fields the Journal doesn't carry. You'll fill some of these in below.`,
    mapping: [
      {
        key: "date",
        sourceLabel: "JV Date",
        sourceValue: jvDate,
        targetLabel: `${label} Date`,
        status: "mapped",
        value: jvDate,
      },
      {
        key: "party",
        sourceLabel: "Narration party",
        sourceValue: partyHint,
        targetLabel: target === "Bill" ? "Vendor" : "Customer",
        status: "needs",
        control: "party-flip",
        partyType: target === "Bill" ? "Vendor" : "Customer",
        partyName: partyHint,
        partyGstin: "29AAFFA8764Y1Z3",
        suggestedLedger:
          target === "Bill"
            ? "Pass-through Expense"
            : "Sales Income — Pass-through",
      },
      {
        key: "total",
        sourceLabel: "JV total",
        sourceValue: inr(item.amount),
        targetLabel: `${label} Total`,
        status: "mapped",
        value: inr(item.amount),
      },
    ],
    lineBuilder: {
      target: label,
      suggestedLedger:
        target === "Bill" ? "Warehouse Rent" : "Sales Income — Services",
      suggestedRate: String(item.amount ?? 0),
    },
    preflight: {
      duplicate: {
        ok: true,
        message: "No matching content hash in posted records.",
      },
      // The one genuinely blocking-adjacent case in the set: converting across
      // a filed period changes tax direction after the return went out.
      gstPeriod: {
        ok: false,
        message:
          "JV date 31 Mar 2026 falls in a filed period (Mar FY26). This conversion would change tax direction — would create a GSTR-1 amendment.",
        action: "Post as current-period amendment (GSTR-1A) instead",
      },
      blastRadius: `A new ${label} will be posted in the current period. The original JV is marked superseded — a reversal entry is posted automatically.`,
    },
    ctaLabel: `Create ${label} from this Journal (with reversal of ${item.id})`,
  };
};

/* -------------------------------------------------------------- AR rows */

const arRowToJv = (item: InboxItem, rowIndex: number): ConversionSpec => {
  const row = item.ar?.rows[rowIndex];
  if (!row || !item.ar) return fallbackSpec();

  const others = (item.ar.rowCount - 1).toLocaleString("en-IN");

  return {
    // +2 because the sheet has a header row and spreadsheets are 1-indexed —
    // this is the row number the accountant sees in Excel.
    title: `Converting Invoice row ${rowIndex + 2} — ${row.invoiceNo} → Journal Voucher`,
    subtitle: `From ${row.customer}`,
    consequenceChips: ["Voucher class → Journal"],
    freeformBanner: null,
    mapping: [
      {
        key: "date",
        sourceLabel: "Invoice Date",
        sourceValue: row.invoiceDate,
        targetLabel: "Voucher Date",
        status: "mapped",
        value: row.invoiceDate,
      },
      {
        key: "vno",
        sourceLabel: "Invoice No",
        sourceValue: row.invoiceNo,
        targetLabel: "Voucher No",
        status: "locked",
        value: `JV/26-27/${String(idSeed(`${item.id}-${rowIndex}`, 50, 99)).padStart(4, "0")}`,
      },
      {
        key: "dr",
        sourceLabel: "Customer",
        sourceValue: row.customer,
        targetLabel: "Dr line",
        status: "mapped",
        value: `Customer — ${row.customer}: ${inr(row.amount)}`,
      },
      {
        key: "cr",
        sourceLabel: "Sales ledger",
        sourceValue: row.ledger,
        targetLabel: "Cr line",
        status: "mapped",
        value: `${row.ledger}: ${inr(row.amount)}`,
      },
    ],
    preflight: {
      duplicate: {
        ok: true,
        message: "No matching content hash in posted records.",
      },
      gstPeriod: {
        ok: true,
        message: "Current-period row; safe to journalise.",
      },
      blastRadius: `Only this row converts; the other ${others} rows continue in the AR validation grid.`,
    },
    ctaLabel: "Convert & Post as Journal Voucher",
  };
};

const arRowToBill = (item: InboxItem, rowIndex: number): ConversionSpec => {
  const row = item.ar?.rows[rowIndex];
  if (!row || !item.ar) return fallbackSpec();

  const others = (item.ar.rowCount - 1).toLocaleString("en-IN");

  return {
    title: `Converting Invoice row ${rowIndex + 2} — ${row.invoiceNo} → Bill (Purchase)`,
    subtitle: `From ${row.customer}`,
    consequenceChips: [
      "Customer → Vendor",
      "Output GST → Input GST",
      "Income → Expense",
    ],
    freeformBanner: null,
    mapping: [
      {
        key: "date",
        sourceLabel: "Invoice Date",
        sourceValue: row.invoiceDate,
        targetLabel: "Bill Date",
        status: "mapped",
        value: row.invoiceDate,
      },
      {
        key: "vno",
        sourceLabel: "Invoice No",
        sourceValue: row.invoiceNo,
        targetLabel: "Supplier Invoice No",
        status: "mapped",
        value: row.invoiceNo,
      },
      {
        key: "party",
        sourceLabel: "Customer",
        sourceValue: row.customer,
        targetLabel: "Vendor",
        status: "needs",
        control: "party-flip",
        partyType: "Vendor",
        partyName: row.customer,
        partyGstin: row.gstin || "—",
        suggestedLedger: "Pass-through Expense",
      },
      {
        key: "ledger",
        sourceLabel: "Sales ledger",
        sourceValue: row.ledger,
        targetLabel: "Expense ledger",
        status: "needs",
        control: "ledger-flip",
        ledgerSide: "Expense",
        ledgerOptions: EXPENSE_LEDGERS,
      },
      {
        key: "total",
        sourceLabel: "Total",
        sourceValue: inr(row.amount),
        targetLabel: "Bill Total",
        status: "mapped",
        value: inr(row.amount),
      },
    ],
    preflight: {
      duplicate: {
        ok: true,
        message: "No matching bill content hash in posted records.",
      },
      gstPeriod: {
        ok: true,
        message: "Current period — safe to bill the converted side.",
      },
      blastRadius: `Only this row converts; the other ${others} rows continue in the AR grid.`,
    },
    ctaLabel: "Convert & Post as Bill (with reversal of this row)",
  };
};

/* --------------------------------------------------------- Banking rows */

const bankingRowToJv = (
  item: InboxItem,
  request: ConversionRequest
): ConversionSpec => {
  const txn = request.txn;
  if (!txn || !item.banking) return fallbackSpec();

  const others = item.banking.txnCount - 1;

  return {
    title: `Converting Bank transaction — ${txn.narration} → Journal Voucher`,
    subtitle: `${txn.date} · ${BANK_ACCOUNT_LABEL}`,
    consequenceChips: ["Voucher class → Journal", "Banking → General Ledger"],
    freeformBanner: null,
    mapping: [
      {
        key: "date",
        sourceLabel: "Txn Date",
        sourceValue: txn.date,
        targetLabel: "Voucher Date",
        status: "mapped",
        value: txn.date,
      },
      {
        key: "vno",
        sourceLabel: "Bank ref",
        sourceValue: "—",
        targetLabel: "Voucher No",
        status: "locked",
        value: `JV/26-27/${String(idSeed(`${item.id}-${txn.date}`, 50, 99)).padStart(4, "0")}`,
      },
      {
        key: "dr",
        sourceLabel: "Debit",
        sourceValue: txn.dr ? inr(txn.dr) : "—",
        targetLabel: "Dr line",
        status: "mapped",
        value: txn.dr ? `Bank Charges: ${inr(txn.dr)}` : "—",
      },
      {
        key: "cr",
        sourceLabel: "Credit",
        sourceValue: txn.cr ? inr(txn.cr) : "—",
        targetLabel: "Cr line",
        status: "mapped",
        value: txn.cr
          ? `Interest Received: ${inr(txn.cr)}`
          : `HDFC Bank — ${BANK_ACCOUNT_LABEL}`,
      },
      {
        key: "narr",
        sourceLabel: "Narration",
        sourceValue: txn.narration,
        targetLabel: "Narration",
        status: "locked",
        value: txn.narration,
      },
    ],
    preflight: {
      duplicate: {
        ok: true,
        message: "No matching content hash in posted records.",
      },
      gstPeriod: {
        ok: true,
        message: "Current period — banking JVs don't affect GST returns.",
      },
      blastRadius: `This transaction is moved from the reconciliation queue to a JV draft. The other ${others} transactions are unaffected.`,
    },
    ctaLabel: "Convert & Post as Journal Voucher",
  };
};

/* ----------------------------------------------------------------- entry */

export const describeConversion = (
  item: InboxItem,
  request: ConversionRequest
): ConversionSpec => {
  const { source, target } = request;

  if (source === "bill") {
    if (target === "JV") return billToJv(item);
    if (target === "Invoice") return billToInvoice(item);
  }

  if (source === "jv" && (target === "Bill" || target === "Invoice")) {
    return jvToTyped(item, target);
  }

  if (source === "ar-row" && request.rowIndex != null) {
    if (target === "JV") return arRowToJv(item, request.rowIndex);
    if (target === "Bill") return arRowToBill(item, request.rowIndex);
  }

  if (source === "banking-row") return bankingRowToJv(item, request);

  return fallbackSpec();
};

/** Every `needs` row must be resolved, and no preflight check may hard-block. */
export const isConversionBlocked = (
  spec: ConversionSpec,
  resolved: Record<string, unknown>
): boolean => {
  const unresolved = spec.mapping.filter(
    (row) => row.status === "needs" && !resolved[row.key]
  );
  if (unresolved.length > 0) return true;
  if (spec.preflight.duplicate.blocking) return true;

  // A JV → typed conversion cannot post without at least one line item.
  if (spec.lineBuilder) {
    const lines = resolved.__lines;
    if (!Array.isArray(lines) || lines.length === 0) return true;
  }

  return false;
};

export const countUnresolved = (
  spec: ConversionSpec,
  resolved: Record<string, unknown>
): number =>
  spec.mapping.filter((row) => row.status === "needs" && !resolved[row.key])
    .length;
