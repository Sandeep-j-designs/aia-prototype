import type { PrintedLine } from "@/types/pages/inbox";

/**
 * Goods or services — which table an extracted line belongs in.
 *
 * A thing with a physical existence (a Dell desktop, a tin of oil) is an ITEM
 * line: it carries an item master, a quantity and a rate, and posts to the
 * voucher's purchase or sales ledger. A service (support, AMC, freight) is a
 * LEDGER line: a description, an amount and a ledger of its own.
 *
 * Built on the engines' own test (`supplyFor` / `SERVICE_WORDS` in
 * public/{ap,ar}/index.html):
 *   1. a printed code that is a 6-digit SAC (99xxxx) is a service;
 *   2. service wording is a service even under an HSN — suppliers print the
 *      goods' code against the freight line too;
 *   3. electricity (HSN 2716) is goods on paper but nobody stocks it, so it
 *      is a ledger line, like the demand charges printed beside it;
 *   4. any other printed code is an HSN, which is goods;
 *   5. with no code, a printed quantity or rate makes it goods;
 *   6. otherwise a ledger line — a bare description and amount is how a
 *      service or a charge is printed, not how stock is.
 *
 * DEV: production's extraction returns the route per line; this stands in
 * for it on the mock documents.
 */
const SERVICE_WORDS =
  /\b(amc|maintenance|repair|service|services|support|warranty|prosupport|fee|fees|charges|rent|rental|subscription|licence|license|installation|commission|consultancy|consulting|audit|training|courier|postage|freight|cartage|housekeep|cleaning|security|advertis|legal|professional|contract|labour|labor|energy|electricity)\b/i;

export type LineRoute = "item" | "ledger";

export const routeOfLine = (desc: string, line: PrintedLine): LineRoute => {
  const code = String(line.hsn || "").trim();
  if (/^99\d{4}$/.test(code)) return "ledger";
  if (SERVICE_WORDS.test(desc)) return "ledger";
  if (code.startsWith("2716")) return "ledger";
  if (code) return "item";
  return line.qty || line.rate ? "item" : "ledger";
};

/**
 * The quantity and rate an item line goes over with. A goods line that printed
 * only an amount is still one of something, so it arrives as 1 × amount rather
 * than with a blank quantity the sheet would flag.
 */
export const itemFigures = (amount: number, line: PrintedLine) => {
  const qty = line.qty || 1;
  return { qty, rate: line.rate || amount / qty, unit: line.unit || "" };
};
