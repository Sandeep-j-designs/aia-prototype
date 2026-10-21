import type { TallyVoucherPaymentType } from "@/types/pages/inbox/banking";

/**
 * Banking's AI: matching a bank line to the invoices or bills it settles,
 * and the rules an accountant turns repeated coding into.
 *
 * camelCase, shaped as the API returns them. Mocks in
 * config/pages/inbox/mock-bank-matches.ts and mock-bank-rules.ts.
 */

/** An unpaid sales invoice (money in) or purchase bill (money out). */
export type OpenDocument = {
  id: string;
  company: string;
  kind: "invoice" | "bill";
  /** The number printed on the document: "SPW/26-27/118". */
  number: string;
  /** The customer or vendor, spelled as its Tally ledger is. */
  party: string;
  /** ISO date. */
  date: string;
  taxable: number;
  gst: number;
  total: number;
  /** What is still unpaid after earlier receipts or payments. */
  outstanding: number;
  /** An earlier part-payment, for the explanation ("₹1,18,000 received 18 Aug"). */
  paid?: { amount: number; date: string }[];
};

/** How a bank line relates to the documents it settles. */
export type MatchKind =
  /** Pays one document, or the balance of one, exactly. */
  | "exact"
  /** Pays one document less TDS deducted at source. */
  | "tds"
  /** One line settles several documents. */
  | "multi"
  /** Pays part of one document; the rest stays open. */
  | "partial"
  /** No number or amount to go on: the party's oldest open bill. */
  | "oldest-open";

export type MatchedDocument = {
  docId: string;
  number: string;
  /** What this bank line pays against the document. */
  applied: number;
  /** Left open on the document after this line. */
  balance: number;
};

/** One line of the working: "Invoice total ₹5,90,000". */
export type MatchStep = {
  label: string;
  amount: number;
  /** How the line reads against the one above: less, equals. */
  op?: "less" | "equals";
};

/** A voucher the match will draft, Tally-style. */
export type DraftVoucher = {
  type: "Receipt" | "Payment" | "Journal";
  debit: string;
  credit: string;
  amount: number;
  /** "Against SPW/26-27/118", "TDS 194C deducted by Tata Motors Ltd". */
  note: string;
};

/** What the AI proposes for one bank line. */
export type MatchSuggestion = {
  bankLineUuid: string;
  kind: MatchKind;
  party: string;
  paymentType: TallyVoucherPaymentType;
  documents: MatchedDocument[];
  /** The one line under the narration: "₹10,000 short = 2% TDS (194C)". */
  headline: string;
  /** Why, in evidence, never a percentage of confidence. */
  evidence: string;
  steps: MatchStep[];
  vouchers: DraftVoucher[];
  tds?: { section: string; rate: string; base: number; amount: number };
};

/** What a bank rule does to a matching line. */
export type BankRuleAction =
  | { kind: "categorise"; type: TallyVoucherPaymentType; ledger: string }
  | { kind: "link-oldest-open"; party: string };

/** A rule the accountant accepted: narration contains X, then do Y. */
export type BankRule = {
  id: string;
  company: string;
  /** Matched case-insensitively against the narration. */
  contains: string;
  action: BankRuleAction;
  /** Lines it has coded. */
  hits: number;
  createdBy: string;
  /** ISO. */
  createdAt: string;
  on: boolean;
};

/** A rule the AI proposes from repeated manual work. */
export type BankRuleSuggestion = {
  id: string;
  company: string;
  contains: string;
  action: BankRuleAction;
  /** "You've put 3 BESCOM debits in Electricity Charges." */
  evidence: string;
  /** How many manual repeats it was drawn from. */
  repeats: number;
  status: "pending" | "created" | "dismissed";
  /** Just raised by an edit on screen: shown inline on the account. */
  fresh?: boolean;
  /** The bank ledger the repeats were on, for the inline prompt. */
  bankAccountUuid?: string;
};
