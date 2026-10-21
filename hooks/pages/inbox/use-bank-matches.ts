import { useMemo, useSyncExternalStore } from "react";
import { MOCK_OPEN_DOCUMENTS } from "@/config/pages/inbox/mock-bank-matches";
import { gstRegistrationsOf } from "@/config/pages/inbox/mock-banking";
import { bankingActions } from "@/hooks/pages/inbox/use-banking";
import { logActivity } from "@/hooks/pages/inbox/use-activity";
import type {
  DraftVoucher,
  MatchKind,
  MatchStep,
  MatchSuggestion,
  OpenDocument,
} from "@/types/pages/inbox/bank-automation";
import type { BankTransaction } from "@/types/pages/inbox/banking";
import { normalise } from "@/utils/pages/inbox/bank-text";

/**
 * Bank matching: which unpaid invoices or bills a bank line settles, worked
 * out from the narration and the amount, and explained in evidence.
 *
 * The engine (`suggestMatch`) is what the server will run; the screens only
 * draw its answer. It looks, in order, for document numbers named in the
 * narration, then the party's name; then for an amount that pays one
 * document, several, one less TDS, or part of one.
 *
 * Module-level per company, like Banking: the open documents' balances move
 * as matches are accepted, and undo puts them back.
 *
 * DEV: GET /api/bank/transactions/:bankLineUuid/match-suggestions returns a
 * MatchSuggestion; accepting is POST /api/transactions/v1/transaction-link/
 * {receipt|payment}-voucher with the bill allocations, plus a journal for
 * TDS (POST /api/journal-voucher). Dismiss is
 * POST /api/bank/transactions/:bankLineUuid/match-suggestions/dismiss.
 */

type MatchState = {
  docs: OpenDocument[];
  /** Lines whose suggestion was dismissed: no mark, no panel. */
  dismissed: string[];
  /** Documents picked by hand with "Choose another", per line. */
  chosen: Record<string, string[]>;
};

const stores = new Map<string, MatchState>();
const listeners = new Set<() => void>();

const read = (company: string): MatchState => {
  let state = stores.get(company);
  if (!state) {
    state = {
      // DEV: replace with the open receivables and payables for the company.
      docs: structuredClone(
        MOCK_OPEN_DOCUMENTS.filter((d) => d.company === company)
      ),
      dismissed: [],
      chosen: {},
    };
    stores.set(company, state);
  }
  return state;
};
const write = (company: string, next: Partial<MatchState>) => {
  stores.set(company, { ...read(company), ...next });
  listeners.forEach((l) => l());
};
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/* ------------------------------------------------------------- the engine */

const PARTY_NOISE = new Set([
  "LTD",
  "LIMITED",
  "PVT",
  "PRIVATE",
  "CO",
  "THE",
  "GROUP",
  "AND",
  "&",
]);

/** Whether the narration names the party, spaced or run together. */
const namesParty = (narration: string, party: string) => {
  const words = normalise(party)
    .split(" ")
    .filter((w) => !PARTY_NOISE.has(w));
  if (!words.length) return false;
  const spaced = ` ${normalise(narration)} `;
  if (words.every((w) => spaced.includes(` ${w} `))) return true;
  // UPI narrations run the name together: "PUNEPRECISION".
  const compact = words.join("");
  return spaced
    .split(" ")
    .some((token) => token.length >= 8 && compact.startsWith(token));
};

/** Rupees as the accountant writes them: ₹5,90,000, paise only when there are any. */
export const rupees = (n: number) =>
  `₹${n.toLocaleString("en-IN", {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

/**
 * TDS a customer may have deducted before paying us, by section and rate,
 * most likely first for a manufacturer's receivables. 194C at 2% is a
 * contractor that is a firm or company; 194Q is the buyer's TDS on goods.
 */
const TDS_RATES = [
  { section: "194C", rate: 0.02, label: "2%" },
  { section: "194C", rate: 0.01, label: "1%" },
  { section: "194J", rate: 0.1, label: "10%" },
  { section: "194J", rate: 0.02, label: "2%" },
  { section: "194Q", rate: 0.001, label: "0.1%" },
];

const near = (a: number, b: number) => Math.abs(a - b) < 0.5;

/** Two to four documents whose balances add up to the amount, oldest first. */
const subsetSumming = (docs: OpenDocument[], amount: number) => {
  const pool = docs.slice(0, 8);
  for (let size = 2; size <= Math.min(4, pool.length); size++) {
    const pick = (
      start: number,
      left: number,
      acc: OpenDocument[]
    ): OpenDocument[] | null => {
      if (!left)
        return near(
          acc.reduce((s, d) => s + d.outstanding, 0),
          amount
        )
          ? acc
          : null;
      for (let i = start; i < pool.length; i++) {
        const found = pick(i + 1, left - 1, [...acc, pool[i]]);
        if (found) return found;
      }
      return null;
    };
    const found = pick(0, size, []);
    if (found) return found;
  }
  return null;
};

/**
 * What one bank line settles, or null when nothing fits well enough to say.
 * `chosenIds` are documents the accountant picked by hand.
 */
export const suggestMatch = (
  txn: BankTransaction,
  docs: OpenDocument[],
  chosenIds?: string[]
): MatchSuggestion | null => {
  const side = txn.crDr === "credit" ? "invoice" : "bill";
  const amount = Number(txn.transactionAmountLc);
  const pool = docs
    .filter((d) => d.kind === side && d.outstanding > 0.5)
    .sort((a, b) => a.date.localeCompare(b.date));
  const narration = ` ${normalise(txn.description)} `;

  let picked: OpenDocument[] = [];
  let evidence = "";
  let oldestOf = 0;
  if (chosenIds?.length) {
    picked = pool.filter((d) => chosenIds.includes(d.id));
    evidence = "Chosen by you";
  } else {
    const byNumber = pool.filter((d) =>
      narration.includes(` ${normalise(d.number)} `)
    );
    if (byNumber.length) {
      picked = byNumber;
      evidence = `${byNumber.map((d) => d.number).join(" and ")} ${byNumber.length > 1 ? "are" : "is"} named in the narration`;
    } else {
      const ofParty = pool.filter((d) => namesParty(txn.description, d.party));
      if (!ofParty.length) return null;
      const party = ofParty[0].party;
      const exact = ofParty.find((d) => near(d.outstanding, amount));
      const several = exact ? null : subsetSumming(ofParty, amount);
      if (exact) {
        picked = [exact];
        oldestOf =
          exact === ofParty[0] && ofParty.length > 1 ? ofParty.length : 0;
        evidence = oldestOf
          ? `No bill number in the narration. ${party} has ${ofParty.length} open ${side}s; this pays the oldest, ${exact.number}, to the rupee`
          : `${party} is named in the narration, and ${exact.number} is open for exactly this amount`;
      } else if (several) {
        picked = several;
        evidence = `No ${side} number in the narration. ${party} has ${several.length} open ${side}s that add up to exactly ${rupees(amount)}`;
      } else if (amount < ofParty[0].outstanding) {
        picked = [ofParty[0]];
        evidence = `${party} is named in the narration; ${ofParty[0].number} is their oldest open ${side}`;
      } else return null;
    }
  }
  if (!picked.length) return null;

  const party = picked[0].party;
  const due = picked.reduce((s, d) => s + d.outstanding, 0);
  const numbers = picked.map((d) => d.number);
  const paymentType = side === "invoice" ? "receipt" : "payment";
  const doc = picked[0];
  const docWord = side === "invoice" ? "Invoice" : "Bill";

  let kind: MatchKind;
  let tds: MatchSuggestion["tds"];
  if (near(amount, due))
    kind = picked.length > 1 ? "multi" : oldestOf ? "oldest-open" : "exact";
  else if (amount < due && picked.length === 1) {
    const gap = due - amount;
    const rate =
      side === "invoice"
        ? TDS_RATES.find((r) => near(gap, Math.round(r.rate * doc.taxable)))
        : undefined;
    if (rate) {
      kind = "tds";
      tds = {
        section: rate.section,
        rate: rate.label,
        base: doc.taxable,
        amount: gap,
      };
    } else kind = "partial";
  } else return null;

  const steps: MatchStep[] = [];
  if (kind === "multi") {
    picked.forEach((d) =>
      steps.push({
        label: `${d.number} · ${shortDate(d.date)}`,
        amount: d.outstanding,
      })
    );
    steps.push({ label: "Together", amount: due, op: "equals" });
    steps.push({
      label: `${txn.crDr === "credit" ? "Received" : "Paid"} ${shortDate(txn.transactionDate)}`,
      amount,
    });
  } else {
    steps.push({ label: `${docWord} total`, amount: doc.total });
    doc.paid?.forEach((p) =>
      steps.push({
        label: `${side === "invoice" ? "Received" : "Paid"} ${shortDate(p.date)}`,
        amount: p.amount,
        op: "less",
      })
    );
    if (doc.paid?.length)
      steps.push({
        label: "Balance due",
        amount: doc.outstanding,
        op: "equals",
      });
    steps.push({
      label: `${txn.crDr === "credit" ? "Received" : "Paid"} ${shortDate(txn.transactionDate)}`,
      amount,
      op: "less",
    });
    if (kind === "tds" && tds) {
      steps.push({ label: "Short", amount: tds.amount, op: "equals" });
      steps.push({
        label: `${tds.rate} TDS on taxable ${rupees(tds.base)} (${tds.section})`,
        amount: tds.amount,
        op: "equals",
      });
    } else if (kind === "partial") {
      steps.push({ label: "Stays open", amount: due - amount, op: "equals" });
    } else {
      steps.push({ label: "Left to pay", amount: 0, op: "equals" });
    }
  }

  const against = `Against ${numbers.join(", ")}`;
  const vouchers: DraftVoucher[] = [
    paymentType === "receipt"
      ? {
          type: "Receipt",
          debit: txn.bankAccountName,
          credit: party,
          amount,
          note: against,
        }
      : {
          type: "Payment",
          debit: party,
          credit: txn.bankAccountName,
          amount,
          note: against,
        },
  ];
  if (tds)
    vouchers.push({
      type: "Journal",
      debit: "TDS Receivable",
      credit: party,
      amount: tds.amount,
      note: `TDS ${tds.section} deducted by ${party} on ${doc.number}`,
    });

  const headline =
    kind === "tds" && tds
      ? `${doc.number} · ${rupees(tds.amount)} short = ${tds.rate} TDS (${tds.section})`
      : kind === "multi"
        ? `${numbers.join(" + ")} · both in full`
        : kind === "partial"
          ? `${doc.number} · part payment, ${rupees(due - amount)} stays open`
          : kind === "oldest-open"
            ? `Oldest open bill from ${party} · ${doc.number}`
            : doc.paid?.length
              ? `${doc.number} · settles the balance`
              : `${doc.number} · settles in full`;

  return {
    bankLineUuid: txn.bankLineUuid,
    kind,
    party,
    paymentType,
    documents: picked.map((d) => {
      // TDS settles the invoice too: the receipt and the journal together.
      const applied = kind === "partial" ? amount : d.outstanding;
      return {
        docId: d.id,
        number: d.number,
        applied,
        balance: Math.max(0, d.outstanding - applied),
      };
    }),
    headline,
    evidence,
    steps,
    vouchers,
    tds,
  };
};

/* ------------------------------------------------------------------ hook */

/** Lines a suggestion is offered on: untouched by review, not dismissed. */
const offerable = (txn: BankTransaction, state: MatchState) =>
  !txn.accoutingReady &&
  txn.thirdPartySyncStatus === "not_synced" &&
  !txn.matchedDocuments?.length &&
  !state.dismissed.includes(txn.bankLineUuid);

export const useBankMatches = (
  company: string,
  transactions: BankTransaction[]
) => useBankMatchesInternal(company, transactions);
export const getOpenDocuments = (company: string) => read(company).docs;
export const useOpenDocuments = (company: string) =>
  useSyncExternalStore(
    subscribe,
    () => read(company),
    () => read(company)
  ).docs;
const useBankMatchesInternal = (
  company: string,
  transactions: BankTransaction[]
) => {
  const state = useSyncExternalStore(
    subscribe,
    () => read(company),
    () => read(company)
  );
  const suggestions = useMemo(() => {
    const map = new Map<string, MatchSuggestion>();
    transactions.forEach((txn) => {
      if (!offerable(txn, state)) return;
      const s = suggestMatch(txn, state.docs, state.chosen[txn.bankLineUuid]);
      if (s) map.set(txn.bankLineUuid, s);
    });
    return map;
  }, [transactions, state]);
  return { suggestions, docs: state.docs };
};

/** The open documents a line could be matched to by hand. */
export const candidatesFor = (txn: BankTransaction, docs: OpenDocument[]) =>
  docs
    .filter(
      (d) =>
        d.kind === (txn.crDr === "credit" ? "invoice" : "bill") &&
        d.outstanding > 0.5
    )
    .sort((a, b) => a.date.localeCompare(b.date));

export const bankMatchActions = {
  /** Match by hand: the suggestion is rebuilt on these documents. */
  choose: (company: string, uuid: string, docIds: string[]) =>
    write(company, {
      chosen: { ...read(company).chosen, [uuid]: docIds },
      dismissed: read(company).dismissed.filter((id) => id !== uuid),
    }),

  dismiss: (company: string, txn: BankTransaction, user: string) => {
    write(company, {
      dismissed: [...read(company).dismissed, txn.bankLineUuid],
    });
    logActivity({
      company,
      actor: { kind: "person", name: user },
      kind: "override",
      module: "Banking",
      action: "Dismissed a match suggestion",
      subject: `${txn.bankAccountName} · ${txn.description}`,
      ref: { kind: "transaction", id: txn.bankLineUuid },
    });
  },

  /**
   * Accept: the line becomes a Receipt or Payment against the documents,
   * TDS gets its journal, the balances move, and the line is Accounting
   * Ready. Logged as the AI's suggestion and the person's acceptance; the
   * acceptance can be undone until the line syncs.
   */
  accept: (
    company: string,
    txn: BankTransaction,
    s: MatchSuggestion,
    user: string
  ) => {
    const before: Partial<BankTransaction> = {
      paymentType: txn.paymentType,
      ledgersNameList: txn.ledgersNameList,
      ledgersUuidList: txn.ledgersUuidList,
      categorisedBy: txn.categorisedBy,
      accoutingReady: txn.accoutingReady,
      matchedDocuments: txn.matchedDocuments,
      matchNote: txn.matchNote,
      companyGstLabel: txn.companyGstLabel,
      companyGstUuid: txn.companyGstUuid,
    };
    // An untouched line has no GST registration yet: the company's own.
    const gst = txn.companyGstUuid ? undefined : gstRegistrationsOf(company)[0];
    const docsBefore = read(company).docs;
    const note = s.tds
      ? `${s.documents[0].number} · TDS ${rupees(s.tds.amount)} (${s.tds.section})`
      : s.kind === "partial"
        ? `${s.documents[0].number} · ${rupees(s.documents[0].balance)} still open`
        : s.documents.map((d) => d.number).join(" + ");
    bankingActions.updateTransaction(company, txn.bankLineUuid, {
      paymentType: s.paymentType,
      ledgersNameList: [s.party],
      ledgersUuidList: [`led-${s.party}`],
      categorisedBy: "user",
      accoutingReady: true,
      matchedDocuments: s.documents.map((d) => d.number),
      matchNote: note,
      ...(gst ? { companyGstLabel: gst.label, companyGstUuid: gst.uuid } : {}),
    });
    write(company, {
      docs: docsBefore.map((d) => {
        const hit = s.documents.find((m) => m.docId === d.id);
        return hit ? { ...d, outstanding: hit.balance } : d;
      }),
    });
    const subject = `${txn.bankAccountName} · ${txn.description}`;
    logActivity({
      company,
      actor: { kind: "ai", name: "Neo · Bank matching" },
      kind: "matched",
      module: "Banking",
      action: "Suggested a match",
      subject,
      ref: { kind: "transaction", id: txn.bankLineUuid },
      reason: `${s.headline}. ${s.evidence}`,
    });
    logActivity(
      {
        company,
        actor: { kind: "person", name: user },
        kind: "matched",
        module: "Banking",
        action: "Accepted the match",
        subject,
        ref: { kind: "transaction", id: txn.bankLineUuid },
        reason: s.vouchers
          .map((v) => `${v.type} ${rupees(v.amount)}`)
          .join(" and "),
        undoable: true,
      },
      () => {
        bankingActions.updateTransaction(company, txn.bankLineUuid, before);
        write(company, { docs: docsBefore });
      }
    );
  },
};
