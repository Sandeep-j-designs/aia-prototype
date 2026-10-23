import {
  CARD_SETTLEMENTS,
  SWIGGY_PAYOUTS,
  STATEMENT_ALL,
  UPI_SETTLEMENTS,
  ZOMATO_PAYOUTS,
  RECEIVABLE,
  dayLabel,
  type Payout,
} from "@/config/pages/neo/mock-recon";
import type { ReconPeriodId, SourceKind } from "@/types/pages/neo/recon";

/**
 * The files a reconciliation run reads (AiA 2.0 PRD, aligned 21 Oct 2026):
 * the HDFC ·0418 statement, the card, UPI, Zomato and Swiggy settlement
 * reports, and the books' settlement receipts from the Tally integration.
 * CSV only (A4); rows are raw strings, as uploaded, and the engine parses
 * them (R3). Generated from the same seeded September as Banking, so the
 * statement here is the statement there.
 *
 * The PRD's validation scenarios are placed on purpose, each named where
 * it is set: exact three-way matches, fee-adjusted batches, an absent
 * reference, a ₹0.01 and a ₹10 difference under zero tolerance, receipts
 * not yet in the books (two sources only), a payout due after the period,
 * a books entry at gross, two rejected rows, a duplicate upload and an
 * unsupported PDF.
 *
 * DEV: in production these are uploads and connector snapshots; none of
 * this file ships.
 */

export type MockSourceFile = {
  name: string;
  /** What the file is; "unsupported" files are rejected on sight. */
  kind: SourceKind | "unsupported";
  provider: string;
  via: string;
  size: string;
  /** Same content, same hash: how a second upload is caught (US-02). */
  hash: string;
  rows: Record<string, string>[];
};

const money = (n: number) => n.toFixed(2);
const inPeriod = (d: string, from: string, to: string) => d >= from && d <= to;
const ddmm = (d: string) => d.slice(8, 10) + d.slice(5, 7);

/* ------------------------------------------------- shared references */

const cardRef = (payDate: string, tid: string) => `MSTL${ddmm(payDate)}${tid}`;
const upiRef = (saleDate: string) => `USTL${saleDate.replace(/-/g, "")}`;

/** The reference the bank printed in its Reference column, when it did. */
const bankRefFor = (date: string, narration: string, amount: number) => {
  if (narration.startsWith("NEFT CR HDFC MERCH STL")) {
    const c = CARD_SETTLEMENTS.find(
      (x) => x.payDate === date && x.net === amount
    );
    return c ? cardRef(c.payDate, c.terminal) : "";
  }
  if (narration.startsWith("UPI STL HDFC")) {
    const u = UPI_SETTLEMENTS.find(
      (x) => x.payDate === date && x.net === amount
    );
    return u ? upiRef(u.saleDate) : "";
  }
  // Zomato's UTR is printed; Swiggy and Ownly credits carry none.
  const utr = narration.match(/NEFT CR (\S+) ETERNAL/)?.[1];
  return utr || "";
};

/* ---------------------------------------------------------- the bank */

const bankRows = (from: string, to: string) =>
  STATEMENT_ALL.filter((r) => inPeriod(r.date, from, to)).map((r) => ({
    "Txn ID": `HDFC0418-${r.date.replace(/-/g, "")}-${r.key}`,
    "Txn Date": r.date,
    Narration: r.narration,
    Reference: bankRefFor(r.date, r.narration, r.amount),
    Debit: r.side === "D" ? money(r.amount) : "",
    Credit: r.side === "C" ? money(r.amount) : "",
    Currency: "INR",
  }));

/* ---------------------------------------------------- the settlements */

/**
 * Settlements in a report: the ones whose money is due in the period, and
 * — a cross-period case (R7) — the one sale-period payout due after it.
 */
const cardRows = (from: string, to: string) =>
  CARD_SETTLEMENTS.filter((c) =>
    inPeriod(c.saleDate, addDaysISO(from, -1), addDaysISO(to, -1))
  ).map((c) => ({
    "Settlement ID": cardRef(c.payDate, c.terminal),
    "Batch ID": "",
    "Sale Date": c.saleDate,
    "Expected Credit": c.payDate,
    Gross: money(c.gross),
    Fees: money(c.mdr),
    "Tax on Fees": money(c.gstOnMdr),
    TDS: "0.00",
    Refunds: "0.00",
    Net: money(c.net),
    Currency: "INR",
    "Bank Reference": cardRef(c.payDate, c.terminal),
    Provider: "HDFC card · TID 96201256",
  }));

const upiRows = (from: string, to: string) =>
  UPI_SETTLEMENTS.filter((u) =>
    inPeriod(u.saleDate, addDaysISO(from, -1), addDaysISO(to, -1))
  ).map((u) => ({
    "Settlement ID": upiRef(u.saleDate),
    "Batch ID": "",
    "Sale Date": u.saleDate,
    "Expected Credit": u.payDate,
    Gross: money(u.gross),
    Fees: money(u.mdr),
    "Tax on Fees": money(u.gstOnMdr),
    TDS: "0.00",
    Refunds: "0.00",
    Net: money(u.net),
    Currency: "INR",
    "Bank Reference": upiRef(u.saleDate),
    Provider: "HDFC UPI · MID 7710452",
  }));

const sum = (p: Payout, kinds: string[]) =>
  -p.deductions
    .filter((d) => kinds.includes(d.kind))
    .reduce((s, d) => s + d.amount, 0);

/** A weekly payout is a declared batch of a week's orders (R5). */
const payoutRows = (payouts: Payout[], from: string, to: string) =>
  payouts
    .filter((p) => p.to >= from && p.from <= to)
    .map((p) => ({
      "Settlement ID": p.id,
      "Batch ID": `${p.id} · ${dayLabel(p.from)}–${dayLabel(p.to)}`,
      "Sale Date": p.from,
      "Expected Credit": p.payDate,
      Gross: money(p.gross),
      Fees: money(sum(p, ["commission", "ads", "other"])),
      "Tax on Fees": money(sum(p, ["gst-on-fees"])),
      TDS: money(sum(p, ["tds"])),
      Refunds: money(
        p.deductions
          .filter((d) => d.kind === "refund")
          .reduce((s, d) => s + d.amount, 0)
      ),
      Net: money(p.net),
      Currency: "INR",
      // Zomato prints the UTR; Swiggy's report has none to print.
      "Bank Reference": p.utr || "",
      Provider:
        p.provider === "zomato" ? "Zomato (Eternal Ltd)" : "Swiggy (Bundl)",
    }));

/* ----------------------------------------------------------- the books */

type BooksTrap = {
  /** Card receipts the accountant hasn't booked yet: two sources only. */
  unbookedCard: string[];
  /** A payout booked at gross, not net: an amount difference. */
  grossZomato?: string;
  /** Rows the export got wrong: rejected with reasons (US-03). */
  broken: boolean;
};

const TRAPS: Record<ReconPeriodId, BooksTrap> = {
  sep: {
    unbookedCard: ["2026-09-26", "2026-09-27", "2026-09-28"],
    grossZomato: "ZMT-W37",
    broken: true,
  },
  oct: { unbookedCard: [], broken: false },
};

const booksRows = (
  period: ReconPeriodId,
  from: string,
  to: string,
  fixed = false
) => {
  const trap = TRAPS[period];
  const rows: Record<string, string>[] = [];
  let n = 4100 + (period === "oct" ? 300 : 0);
  const entry = (
    date: string,
    ledger: string,
    amount: number,
    ref: string,
    narration: string
  ) => {
    n += 1;
    rows.push({
      "Voucher No": `RCT/${n}`,
      GUID: `tally-${period}-${n}`,
      Date: date,
      Ledger: ledger,
      Amount: money(amount),
      Currency: "INR",
      Ref: ref,
      Narration: narration,
    });
  };
  CARD_SETTLEMENTS.filter(
    (c) =>
      inPeriod(c.payDate, from, to) && !trap.unbookedCard.includes(c.saleDate)
  ).forEach((c) =>
    entry(
      c.payDate,
      RECEIVABLE.card,
      c.net,
      cardRef(c.payDate, c.terminal),
      `Card settlement ${dayLabel(c.saleDate)}`
    )
  );
  UPI_SETTLEMENTS.filter((u) => inPeriod(u.payDate, from, to)).forEach((u) =>
    entry(
      u.payDate,
      RECEIVABLE.upi,
      u.net,
      upiRef(u.saleDate),
      `UPI settlement ${dayLabel(u.saleDate)}`
    )
  );
  ZOMATO_PAYOUTS.filter((p) => inPeriod(p.payDate, from, to)).forEach((p) =>
    entry(
      p.payDate,
      RECEIVABLE.zomato,
      p.id === trap.grossZomato ? p.gross : p.net,
      p.id,
      `Zomato payout ${dayLabel(p.from)}–${dayLabel(p.to)}`
    )
  );
  SWIGGY_PAYOUTS.filter((p) => inPeriod(p.payDate, from, to)).forEach((p) =>
    entry(
      p.payDate,
      RECEIVABLE.swiggy,
      p.net,
      p.id,
      `Swiggy payout ${dayLabel(p.from)}–${dayLabel(p.to)}`
    )
  );
  if (trap.broken && !fixed) {
    // Two rows the export got wrong: no GUID, and a date in another format.
    const a = rows.find((r) => r.Narration === "Card settlement 8 Sep");
    if (a) a.GUID = "";
    const b = rows.find((r) => r.Narration === "UPI settlement 9 Sep");
    if (b) b.Date = "09/10/2026";
  }
  return rows.sort((a, b) => a.Date.localeCompare(b.Date));
};

/* ------------------------------------------------------------- files */

export const RECON_PERIODS: Record<
  ReconPeriodId,
  { from: string; to: string; label: string; short: string }
> = {
  sep: {
    from: "2026-09-01",
    to: "2026-09-30",
    label: "September 2026",
    short: "September",
  },
  oct: {
    from: "2026-10-01",
    to: "2026-10-15",
    label: "1–15 October 2026",
    short: "1–15 October",
  },
};

const hashOf = (name: string, rows: Record<string, string>[]) =>
  `sha256:${(
    rows.reduce(
      (h, r) =>
        Object.values(r)
          .join("|")
          .split("")
          .reduce((x, c) => (x * 31 + c.charCodeAt(0)) >>> 0, h),
      7
    ) ^ rows.length
  )
    .toString(16)
    .padStart(8, "0")}${name.length.toString(16)}`;

const file = (
  name: string,
  kind: MockSourceFile["kind"],
  provider: string,
  rows: Record<string, string>[],
  via = "Upload"
): MockSourceFile => ({
  name,
  kind,
  provider,
  via,
  size: `${Math.max(1, Math.round((JSON.stringify(rows).length * 0.6) / 1024))} KB`,
  hash: hashOf(kind, rows),
  rows,
});

const filesFor = (period: ReconPeriodId): MockSourceFile[] => {
  const { from, to } = RECON_PERIODS[period];
  const tag = period === "sep" ? "sep26" : "1-15oct26";
  const bank = file(
    `hdfc-0418-statement-${tag}.csv`,
    "bank",
    "HDFC Current A/c ·0418",
    bankRows(from, to)
  );
  return [
    bank,
    file(
      `hdfc-card-settlements-tid96201256-${tag}.csv`,
      "settlement",
      "HDFC card",
      cardRows(from, to)
    ),
    file(
      `hdfc-upi-settlements-mid7710452-${tag}.csv`,
      "settlement",
      "HDFC UPI",
      upiRows(from, to)
    ),
    file(
      `zomato-payouts-res51425-${tag}.csv`,
      "settlement",
      "Zomato",
      payoutRows(ZOMATO_PAYOUTS, from, to)
    ),
    file(
      `swiggy-payouts-jpnagar-${tag}.csv`,
      "settlement",
      "Swiggy",
      payoutRows(SWIGGY_PAYOUTS, from, to)
    ),
    file(
      `tally-settlement-receipts-${tag}.csv`,
      "books",
      "Tally · Nandhini Deluxe",
      booksRows(period, from, to),
      "AiA 1.0 Tally integration"
    ),
    ...(period === "sep"
      ? [
          // The same statement attached twice (US-02): rows aren't counted twice.
          { ...bank, name: `hdfc-0418-statement-${tag} (1).csv` },
          // A PDF statement: not a supported input in this release (A4).
          file(
            `hdfc-0418-statement-${tag}.pdf`,
            "unsupported",
            "HDFC Current A/c ·0418",
            []
          ),
        ]
      : []),
  ];
};

/** The sample a run reads when nothing is attached. */
export const RECON_SAMPLE: Record<ReconPeriodId, MockSourceFile[]> = {
  sep: filesFor("sep"),
  oct: filesFor("oct"),
};

/**
 * What an upload shows as, whatever was picked (21 Oct 2026): Nandhini's
 * six September sources — the bank statement, four settlement reports and
 * the Tally receipts. The prototype reads only its own files.
 *
 * DEV: delete; attachments are what the user uploaded.
 */
export const UPLOAD_STANDINS = RECON_SAMPLE.sep.slice(0, 6);

/** The books export re-run after its two bad rows were fixed (US-03). */
export const BOOKS_CORRECTED = file(
  "tally-settlement-receipts-sep26-corrected.csv",
  "books",
  "Tally · Nandhini Deluxe",
  booksRows("sep", RECON_PERIODS.sep.from, RECON_PERIODS.sep.to, true),
  "AiA 1.0 Tally integration"
);

export const sampleFile = (name: string) =>
  [...RECON_SAMPLE.sep, ...RECON_SAMPLE.oct, BOOKS_CORRECTED].find(
    (f) => f.name === name
  );

function addDaysISO(date: string, n: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
