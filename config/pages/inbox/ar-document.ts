import type { ArRow, InboxItem } from "@/types/pages/inbox";
import type { ApDocument } from "./ap-document";

/**
 * What the inbox hands the AR sheet, for one row of an upload batch.
 *
 * The difference from AP is not in this file's shape — it is the same document
 * the sheet reads either way — but in where the values come from and what is
 * missing. An AP bill is *read off* a supplier's paper, so the extraction has
 * an opinion about every line. An AR row came out of the customer's own
 * spreadsheet: it carries a customer, a number, a date, a state, a ledger and
 * an amount, and nothing else. There is no source document behind it, so there
 * is no printed HSN and no supplier classification to reconcile against.
 *
 * That is the whole of "AR is the same as AP with a little context change":
 * one line, no printed codes, and the party is who we billed.
 *
 * DEV: replace with GET /api/inbox/:id/rows/:index/document.
 */

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

/**
 * The grid writes dates as DD/MM/YYYY — a spreadsheet's own format, which is
 * what these rows were pasted from. "12 May 2026" is also accepted so a row
 * hand-written in the mock still resolves.
 */
const toIso = (value: string): string => {
  const raw = String(value || "").trim();

  const numeric = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (numeric) {
    const [, day, month, year] = numeric;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const written = raw.match(/^(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(\d{4})$/);
  if (written) {
    const [, day, month, year] = written;
    const monthNo = MONTHS[month.toLowerCase()];
    if (monthNo) return `${year}-${monthNo}-${day.padStart(2, "0")}`;
  }

  return "";
};

/** "Sales 18%" → 18. The voucher type column is where the batch states its rate. */
const rateFrom = (row: ArRow): number => {
  const match = String(row.voucherType || "").match(/(\d+(?:\.\d+)?)\s*%/);
  return match ? Number(match[1]) : 18;
};

/**
 * Our own branch. On a sale we are the source of supply, so this is the end the
 * sheet already knows — the row's `state` is the other end.
 */
const OUR_BRANCH = "br-ka";

export const arDocumentFor = (
  item: InboxItem,
  index: number
): ApDocument | null => {
  const row = item.ar?.rows[index];
  if (!row) return null;

  const gst = rateFrom(row);

  return {
    fileName: item.file.name,
    branch: OUR_BRANCH,
    voucherType: "sales",

    /*
      The customer as the batch names them. A GSTIN of "—" is the row's own
      finding, not an omission — it is one of the validation issues the grid
      flags — so it goes over empty and the sheet treats the party as
      unregistered, which is what a customer with no GSTIN is.
    */
    supplier: {
      name: row.customer,
      gstin: row.gstin && row.gstin !== "—" ? row.gstin : "",
      pan: row.gstin && row.gstin !== "—" ? row.gstin.slice(2, 12) : "",
      address: "",
      /* The batch states no payment term per row, so the book's own default
         for the customer stands. 30 keeps the facsimile's sentence whole. */
      credit: 30,
    },

    supplierInvoiceNo: row.invoiceNo,
    billDate: toIso(row.invoiceDate),
    dueDate: "",
    narration: `Row ${index + 2} of ${item.ar?.sheetName ?? "the upload"}`,

    /*
      One line, carrying what the row states. No `hsn`: the row has no printed
      code because there is no supplier document behind it — we raised this
      invoice. The sheet infers a code from the description as it always does,
      and the absence of a printed one to disagree with is exactly why the AR
      sheet never raises the consent prompt that AP does.
    */
    lines: [
      {
        text: `${row.customer} — ${row.invoiceNo}`,
        hsn: "",
        amount: row.amount,
        gst,
        cc: "",
        route: "ledger" as const,
        ledger: "",
      },
    ],
  };
};

/**
 * Where the row says the supply landed. The grid holds a two-letter state code;
 * the sheet's destination state is the same code, so it goes over as-is and the
 * sheet resolves it against its own state master.
 */
export const arPlaceOfSupply = (item: InboxItem, index: number): string =>
  item.ar?.rows[index]?.state ?? "";
