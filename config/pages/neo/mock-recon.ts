/**
 * Nandhini Deluxe, JP Nagar — September 2026, for three-way reconciliation
 * (20 Oct 2026). Everything is generated from one seeded day-end per day so
 * every total ties: POS sales → settlement reports → the HDFC statement.
 *
 * The brief's traps are placed on purpose, each named where it is set:
 * a ₹0.01 round-off, sales at month-end not yet paid, a wrong-outlet card
 * report, a tax-inclusive "Sales" column, a broken Swiggy summary, ₹10 that
 * nobody explains, MDR on a zero-MDR rail, a commission rate that moved,
 * an unknown payer, a related-party transfer that is not a contra, an
 * own-account transfer that is, a day already booked bill-wise, a second
 * copy of the statement, and a file that isn't a report at all.
 *
 * DEV: in production these are the uploaded reports and the synced books;
 * none of this file ships.
 */

export const NANDHINI_ID = "nandhini";

export type ReconChannel =
  "card" | "upi" | "cash" | "zomato" | "swiggy" | "ownly";

export const CHANNELS: {
  id: ReconChannel;
  label: string;
  /** Under section 9(5) the platform, not the restaurant, pays the GST. */
  platform: boolean;
}[] = [
  { id: "card", label: "Card", platform: false },
  { id: "upi", label: "UPI", platform: false },
  { id: "cash", label: "Cash", platform: false },
  { id: "zomato", label: "Zomato", platform: true },
  { id: "swiggy", label: "Swiggy", platform: true },
  { id: "ownly", label: "Ownly", platform: true },
];

export const RECEIVABLE: Record<ReconChannel, string> = {
  card: "HDFC Card Receivable – JP Nagar",
  upi: "HDFC UPI Receivable – JP Nagar",
  cash: "Cash",
  zomato: "Zomato Receivable",
  swiggy: "Swiggy Receivable",
  ownly: "Ownly Receivable",
};

export const HDFC_LEDGER = "HDFC Current A/c - 0418";
export const ICICI_LEDGER = "ICICI Current A/c - 4105";
export const TID_JP = "96201256";
export const TID_KORA = "96201257";
export const UPI_MID = "7710452";

/* -------------------------------------------------------------- helpers */

/** Paise in, rupees out, rounded the way the reports round. */
const r2 = (n: number) => Math.round(n * 100) / 100;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (date: string, n: number) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return iso(d);
};
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
/** "8 Sep": the books' short date, the same in every browser's locale. */
export const dayLabel = (date: string) =>
  `${Number(date.slice(8, 10))} ${MONTHS[Number(date.slice(5, 7)) - 1]}`;

/** mulberry32: the same September every load. */
const rng = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const rand = rng(51425);
const between = (lo: number, hi: number) => Math.round(lo + rand() * (hi - lo));

/* ------------------------------------------------------------ POS sales */

export type PosDay = {
  date: string;
  /** What each channel sold. Card, UPI and cash include 5% GST. */
  sales: Record<ReconChannel, number>;
  /** GST inside the card, UPI and cash figures. */
  gst: number;
};

const DAYS = Array.from({ length: 49 }, (_, i) => addDays("2026-08-31", i)); // 31 Aug … 18 Oct

const POS_ALL: PosDay[] = DAYS.map((date) => {
  const weekend = [0, 6].includes(new Date(`${date}T00:00:00Z`).getUTCDay());
  const lift = weekend ? 1.25 : 1;
  const sales: Record<ReconChannel, number> = {
    card: Math.round(between(24000, 36000) * lift),
    upi: Math.round(between(14000, 22000) * lift),
    cash: Math.round(between(8000, 14000) * lift),
    zomato: Math.round(between(70000, 95000) * lift),
    swiggy: Math.round(between(38000, 55000) * lift),
    ownly: Math.round(between(4000, 8000) * lift),
  };
  if (date === "2026-09-08") sales.card = 30384;
  const inclusive = sales.card + sales.upi + sales.cash;
  return { date, sales, gst: r2(inclusive - inclusive / 1.05) };
});

export { POS_ALL };
/** The day-end report uploaded for September (31 Aug is August's books). */
export const POS_SEP = POS_ALL.filter((d) => d.date.startsWith("2026-09"));
export const POS_AUG_31 = POS_ALL[0];
/** October so far: the second run, 1–15 Oct. */
export const POS_OCT = POS_ALL.filter(
  (d) => d.date >= "2026-10-01" && d.date <= "2026-10-15"
);
/** A day's sales on a channel, whichever month it fell in. */
export const saleOn = (date: string, ch: ReconChannel) =>
  POS_ALL.find((d) => d.date === date)?.sales[ch] ?? 0;

/* ---------------------------------------------------- card and UPI (HDFC) */

export type DailySettlement = {
  channel: "card" | "upi";
  /** The day of the sales it settles. */
  saleDate: string;
  /** The day the money reaches the bank: T+1. */
  payDate: string;
  gross: number;
  mdr: number;
  gstOnMdr: number;
  net: number;
  terminal: string;
};

const card: DailySettlement[] = POS_ALL.map((d) => {
  const gross = d.sales.card;
  const mdr = r2(gross * 0.018);
  const gstOnMdr = r2(mdr * 0.18);
  return {
    channel: "card",
    saleDate: d.date,
    payDate: addDays(d.date, 1),
    gross,
    mdr,
    gstOnMdr,
    net: r2(gross - mdr - gstOnMdr),
    terminal: TID_JP,
  };
});

const upi: DailySettlement[] = POS_ALL.map((d) => {
  const gross = d.sales.upi;
  // AMT-06 trap: HDFC charged 0.3% MDR on 17 Sep UPI, a zero-MDR rail.
  const mdr = d.date === "2026-09-17" ? r2(gross * 0.003) : 0;
  const gstOnMdr = r2(mdr * 0.18);
  return {
    channel: "upi",
    saleDate: d.date,
    payDate: addDays(d.date, 1),
    gross,
    mdr,
    gstOnMdr,
    net: r2(gross - mdr - gstOnMdr),
    terminal: UPI_MID,
  };
});

export const CARD_SETTLEMENTS = card;
export const UPI_SETTLEMENTS = upi;

/**
 * IDN-03 trap: Koramangala's card report, uploaded by mistake. Its 12 Sep
 * net equals JP Nagar's 12 Sep card credit to the paisa.
 */
export const KORAMANGALA_CARD: DailySettlement[] = [
  "2026-09-11",
  "2026-09-12",
  "2026-09-13",
].map((date, i) => {
  const jp = card.find((c) => c.saleDate === date)!;
  const gross = i === 1 ? jp.gross : between(18000, 26000);
  const mdr = r2(gross * 0.018);
  const gstOnMdr = r2(mdr * 0.18);
  return {
    channel: "card",
    saleDate: date,
    payDate: addDays(date, 1),
    gross,
    mdr,
    gstOnMdr,
    net: r2(gross - mdr - gstOnMdr),
    terminal: TID_KORA,
  };
});

/* --------------------------------------------- weekly platform payouts */

export type Deduction = {
  kind: "commission" | "ads" | "gst-on-fees" | "tds" | "other" | "refund";
  label: string;
  /** Negative takes away, positive adds back. */
  amount: number;
};

export type Payout = {
  id: string;
  provider: "zomato" | "swiggy" | "ownly";
  /** Monday … Sunday of the sales it pays for. */
  from: string;
  to: string;
  payDate: string;
  gross: number;
  deductions: Deduction[];
  net: number;
  /** What the bank actually received (the traps live in the gap). */
  bank: number;
  utr?: string;
  /** The commission rate this payout charged. */
  rate?: number;
  /** DOC-05: the report's own summary, when it disagrees with its rows. */
  summaryGross?: number;
};

const weeks = [0, 1, 2, 3, 4, 5, 6].map((w) => ({
  from: addDays("2026-08-31", w * 7),
  to: addDays("2026-08-31", w * 7 + 6),
}));
const salesIn = (ch: ReconChannel, from: string, to: string) =>
  POS_ALL.filter((d) => d.date >= from && d.date <= to).reduce(
    (s, d) => s + d.sales[ch],
    0
  );

const ADS = [12000, 9500, 15000, 11000, 10500, 9800, 12500];
const REFUNDS = [1240.5, 0, 860, 0, 0, 540, 0];

/** Zomato (Eternal Ltd) pays each Mon–Sun week on the Wednesday after. */
export const ZOMATO_PAYOUTS: Payout[] = weeks.map((w, i) => {
  const gross = salesIn("zomato", w.from, w.to);
  // AMT-06 trap: the fourth week's commission is 22%, not the usual 18%.
  const rate = i === 3 ? 0.22 : 0.18;
  const fee = r2(gross * rate);
  const ads = ADS[i];
  const gst = r2((fee + ads) * 0.18);
  const tds = r2(gross * 0.001);
  const other = i === 0 ? 130 : 0;
  const refund = REFUNDS[i];
  const net = r2(gross - fee - ads - gst - tds - other + refund);
  const deductions: Deduction[] = [
    { kind: "commission", label: "Service fee", amount: -fee },
    { kind: "ads", label: "Ads", amount: -ads },
    { kind: "gst-on-fees", label: "GST on fees (18%)", amount: -gst },
    { kind: "tds", label: "TDS u/s 194-O (0.1%)", amount: -tds },
    ...(other
      ? [
          {
            kind: "other" as const,
            label: "Packaging recovery",
            amount: -other,
          },
        ]
      : []),
    ...(refund
      ? [
          {
            kind: "refund" as const,
            label: "Cancellation refund",
            amount: refund,
          },
        ]
      : []),
  ];
  return {
    id: `ZMT-W${36 + i}`,
    provider: "zomato",
    from: w.from,
    to: w.to,
    payDate: addDays(w.to, 3),
    gross,
    deductions,
    net,
    // AMT-03 trap: the first week arrives ₹0.01 short.
    bank: i === 0 ? r2(net - 0.01) : net,
    utr: `UTIBN${26090 + i * 7}${String(51425 + i).padStart(6, "0")}`,
    rate,
  };
});

/** Swiggy (Bundl Technologies) pays on the Thursday after; no UTR printed. */
export const SWIGGY_PAYOUTS: Payout[] = weeks.map((w, i) => {
  const gross = salesIn("swiggy", w.from, w.to);
  const fee = r2(gross * 0.2);
  const gst = r2(fee * 0.18);
  const tds = r2(gross * 0.001);
  const net = r2(gross - fee - gst - tds);
  return {
    id: `SWG-${w.from.slice(5).replace("-", "")}`,
    provider: "swiggy",
    from: w.from,
    to: w.to,
    payDate: addDays(w.to, 4),
    gross,
    deductions: [
      { kind: "commission", label: "Commission (20%)", amount: -fee },
      { kind: "gst-on-fees", label: "GST on commission (18%)", amount: -gst },
      { kind: "tds", label: "TDS u/s 194-O (0.1%)", amount: -tds },
    ],
    net,
    // SUS trap: the third week lands ₹10.00 short with no line to explain it.
    bank: i === 2 ? r2(net - 10) : net,
    rate: 0.2,
    // DOC-05 trap: the second week's summary sheet is ₹130 above its rows.
    summaryGross: i === 1 ? gross + 130 : undefined,
  };
});

/**
 * Ownly pays the Monday after each week, zero commission, as "CTRLX
 * Technologies" — a name nobody at the restaurant would recognise. No
 * report is uploaded for it.
 */
export const OWNLY_PAYOUTS: Payout[] = weeks.map((w) => {
  const gross = salesIn("ownly", w.from, w.to);
  return {
    id: `OWN-${w.from.slice(5).replace("-", "")}`,
    provider: "ownly",
    from: w.from,
    to: w.to,
    payDate: addDays(w.to, 1),
    gross,
    deductions: [],
    net: gross,
    bank: gross,
  };
});

/* -------------------------------------------------------- the statement */

export type StatementRow = {
  key: string;
  date: string;
  narration: string;
  amount: number;
  side: "D" | "C";
};

const stmt: StatementRow[] = [];
const push = (
  date: string,
  narration: string,
  amount: number,
  side: "D" | "C"
) =>
  date <= "2026-10-15" &&
  stmt.push({
    key: `r${stmt.length + 1}`,
    date,
    narration,
    amount: r2(amount),
    side,
  });

card.forEach((c) =>
  push(
    c.payDate,
    `NEFT CR HDFC MERCH STL TID ${c.terminal} ${dayLabel(c.saleDate).toUpperCase()}`,
    c.net,
    "C"
  )
);
upi.forEach((u) =>
  push(
    u.payDate,
    `UPI STL HDFC MID ${UPI_MID} ${u.saleDate.replace(/-/g, "")}`,
    u.net,
    "C"
  )
);
ZOMATO_PAYOUTS.forEach((p) =>
  push(p.payDate, `NEFT CR ${p.utr} ETERNAL LIMITED`, p.bank, "C")
);
SWIGGY_PAYOUTS.forEach((p) =>
  push(p.payDate, "NEFT CR BUNDL TECHNOLOGIES PVT LTD", p.bank, "C")
);
OWNLY_PAYOUTS.forEach((p) =>
  push(p.payDate, "NEFT CR CTRLX TECHNOLOGIES PVT LTD", p.bank, "C")
);

/** Cash goes to the bank Mondays and Thursdays, in hundreds; the rest is float. */
export const CASH_DEPOSITS: {
  date: string;
  amount: number;
  from: string;
  to: string;
}[] = [];
{
  const days = POS_ALL.filter((d) => d.date >= "2026-09-01");
  let since = days[0].date;
  let held = 0;
  days.forEach((d, i) => {
    held += d.sales.cash;
    const dow = new Date(`${d.date}T00:00:00Z`).getUTCDay();
    if ((dow === 1 || dow === 4) && i > 0) {
      const amount = Math.floor(held / 100) * 100;
      CASH_DEPOSITS.push({ date: d.date, amount, from: since, to: d.date });
      held -= amount;
      since = addDays(d.date, 1);
    }
  });
}
CASH_DEPOSITS.forEach((c) =>
  push(c.date, "CASH DEP JP NAGAR BRANCH", c.amount, "C")
);

/** Bank debits, each with what history says it is (when it says anything). */
export const DEBITS: { date: string; narration: string; amount: number }[] = [
  {
    date: "2026-09-01",
    narration: "NEFT DR SRI LAKSHMI PROPERTIES RENT SEP",
    amount: 185000,
  },
  { date: "2026-09-05", narration: "BESCOM BILLPAY 7710045821", amount: 48620 },
  { date: "2026-09-07", narration: "UPI DR HOPCOMS VEG SUPPLY", amount: 32480 },
  {
    date: "2026-09-10",
    narration: "NEFT DR AKSHAYAKALPA DAIRY",
    amount: 41300,
  },
  { date: "2026-09-14", narration: "UPI DR HOPCOMS VEG SUPPLY", amount: 29950 },
  {
    date: "2026-09-15",
    narration: "GST PMT CPIN 26092900012345",
    amount: 62450,
  },
  // IDN-04 trap: a sister concern, not the company's own account.
  {
    date: "2026-09-18",
    narration: "NEFT DR NANDHINI FOODS LLP",
    amount: 75000,
  },
  { date: "2026-09-20", narration: "HP GAS AGENCY LPG 19KG", amount: 18900 },
  { date: "2026-09-21", narration: "UPI DR HOPCOMS VEG SUPPLY", amount: 34110 },
  // Contra: the company's own ICICI account, confirmed in setup.
  {
    date: "2026-09-25",
    narration: "IMPS TO ICICI XX4105 OWN AC",
    amount: 200000,
  },
  // S6 trap: nothing in history explains this one.
  { date: "2026-09-26", narration: "POS 4521XXXX AMAZON PAY", amount: 2349 },
  { date: "2026-09-28", narration: "UPI DR HOPCOMS VEG SUPPLY", amount: 31260 },
  { date: "2026-09-30", narration: "SALARY BULK NEFT 28 EMP", amount: 342000 },
  { date: "2026-09-30", narration: "SMS ALERT CHARGES", amount: 59 },
  /* October so far (the second run). The Amazon Pay and LLP lines return,
     so what was learned in September shows. */
  {
    date: "2026-10-01",
    narration: "NEFT DR SRI LAKSHMI PROPERTIES RENT OCT",
    amount: 185000,
  },
  { date: "2026-10-05", narration: "UPI DR HOPCOMS VEG SUPPLY", amount: 30840 },
  { date: "2026-10-06", narration: "BESCOM BILLPAY 7710045821", amount: 46910 },
  { date: "2026-10-08", narration: "POS 4521XXXX AMAZON PAY", amount: 1875 },
  { date: "2026-10-09", narration: "HP GAS AGENCY LPG 19KG", amount: 18900 },
  {
    date: "2026-10-10",
    narration: "NEFT DR AKSHAYAKALPA DAIRY",
    amount: 39650,
  },
  {
    date: "2026-10-11",
    narration: "NEFT DR NANDHINI FOODS LLP",
    amount: 50000,
  },
  { date: "2026-10-12", narration: "UPI DR HOPCOMS VEG SUPPLY", amount: 33120 },
];
DEBITS.forEach((d) => push(d.date, d.narration, d.amount, "D"));

stmt.sort((a, b) => a.date.localeCompare(b.date) || a.key.localeCompare(b.key));
/** Every row HDFC ·0418 printed, 1 Sep – 15 Oct. */
export const STATEMENT_ALL = stmt;
/** The September statement, in Banking from the start. */
export const STATEMENT_ROWS = stmt.filter((r) => r.date <= "2026-09-30");
/** Rows of a statement covering these dates. */
export const statementBetween = (from: string, to: string) =>
  stmt.filter((r) => r.date >= from && r.date <= to);

/* --------------------------------------------------- what the books hold */

/**
 * DUP-04 trap: the accountant entered 8 Sep's card sales bill by bill, so
 * no daily card voucher may be made for that day.
 */
export const BOOKED_BILLWISE = [
  { date: "2026-09-08", channel: "card" as const, bills: 23 },
];

/** Receivables open on 31 Aug, from the books: August's last sales. */
export const OPENING_RECEIVABLES = CHANNELS.filter((c) => c.id !== "cash").map(
  (c) => ({
    channel: c.id,
    ref: `31-Aug ${c.label.toLowerCase()}`,
    amount: POS_AUG_31.sales[c.id],
  })
);

/* ------------------------------------------------------------ the files */

export type ReconFile = {
  name: string;
  /** What the file actually is, as the reader would identify it. */
  kind:
    | "pos"
    | "card-mpr"
    | "upi-payout"
    | "zomato"
    | "swiggy"
    | "statement"
    | "not-a-report";
  outlet?: "jp_nagar" | "koramangala";
  size: string;
  /** The days a report covers, when they aren't September's. */
  from?: string;
  to?: string;
};

export const RECON_SAMPLE_FILES: ReconFile[] = [
  {
    name: "petpooja-dayend-jpnagar-sep26.xlsx",
    kind: "pos",
    outlet: "jp_nagar",
    size: "84 KB",
  },
  {
    name: "hdfc-mpr-tid96201256-sep26.xlsx",
    kind: "card-mpr",
    outlet: "jp_nagar",
    size: "212 KB",
  },
  {
    name: "hdfc-mpr-tid96201257-sep26.xlsx",
    kind: "card-mpr",
    outlet: "koramangala",
    size: "64 KB",
  },
  {
    name: "hdfc-upi-mid7710452-sep26.csv",
    kind: "upi-payout",
    outlet: "jp_nagar",
    size: "38 KB",
  },
  {
    name: "zomato-res51425-w36-w39.xlsx",
    kind: "zomato",
    outlet: "jp_nagar",
    size: "156 KB",
  },
  {
    name: "swiggy-jpnagar-sep26.xlsx",
    kind: "swiggy",
    outlet: "jp_nagar",
    size: "98 KB",
  },
  { name: "hdfc-0418-stmt-sep26.pdf", kind: "statement", size: "310 KB" },
  { name: "milk-receipt-12sep.jpg", kind: "not-a-report", size: "1.2 MB" },
];

/** The statement that closes September: what arrived 1–7 Oct. */
export const CLOSE_STATEMENT: ReconFile = {
  name: "hdfc-0418-stmt-1-7oct26.pdf",
  kind: "statement",
  size: "61 KB",
  from: "2026-10-01",
  to: "2026-10-07",
};

/** October's reports, 1–15 Oct: the same formats as September's. */
export const RECON_OCT_FILES: ReconFile[] = [
  {
    name: "petpooja-dayend-jpnagar-1-15oct26.xlsx",
    kind: "pos",
    outlet: "jp_nagar",
    size: "46 KB",
    from: "2026-10-01",
    to: "2026-10-15",
  },
  {
    name: "hdfc-mpr-tid96201256-1-15oct26.xlsx",
    kind: "card-mpr",
    outlet: "jp_nagar",
    size: "108 KB",
    from: "2026-10-01",
    to: "2026-10-15",
  },
  {
    name: "hdfc-upi-mid7710452-1-15oct26.csv",
    kind: "upi-payout",
    outlet: "jp_nagar",
    size: "21 KB",
    from: "2026-10-01",
    to: "2026-10-15",
  },
  {
    name: "zomato-res51425-w40-w41.xlsx",
    kind: "zomato",
    outlet: "jp_nagar",
    size: "79 KB",
    from: "2026-09-28",
    to: "2026-10-11",
  },
  {
    name: "swiggy-jpnagar-1-15oct26.xlsx",
    kind: "swiggy",
    outlet: "jp_nagar",
    size: "52 KB",
    from: "2026-09-21",
    to: "2026-10-11",
  },
  {
    name: "hdfc-0418-stmt-1-15oct26.pdf",
    kind: "statement",
    size: "118 KB",
    from: "2026-10-01",
    to: "2026-10-15",
  },
];

export const reconFileNamed = (name: string) =>
  [...RECON_SAMPLE_FILES, CLOSE_STATEMENT, ...RECON_OCT_FILES].find(
    (f) => f.name === name
  );

/* ---------------------------------------------- history, for the policy */

export type HistoryPattern = {
  id: string;
  family: string;
  /** The policy it fills, said plainly. */
  value: string;
  support: number;
  consistency: number;
  examples: string[];
  /** Breaks a tax or integrity rule: never copied (ENT-03). */
  breaks?: string;
  /** Asked whatever the evidence: a company fact the books can't prove. */
  confirm?: string;
};

/** Read from Jun–Aug 2026 vouchers in Nandhini's Tally. */
export const HISTORY_PATTERNS: HistoryPattern[] = [
  {
    id: "sales.granularity",
    family: "Sales posting",
    value: "One Sales voucher per day per payment type",
    support: 92,
    consistency: 1,
    examples: ["SV/JPN/0814/C", "SV/JPN/0814/U", "SV/JPN/0815/Z"],
  },
  {
    id: "sales.basis.card",
    family: "Gross or net",
    value: "Card and UPI sales at gross; MDR booked in the receipt",
    support: 184,
    consistency: 0.98,
    examples: ["RV/JPN/0815/C", "RV/JPN/0816/U"],
  },
  {
    id: "sales.basis.platform",
    family: "Gross or net",
    value: "Zomato and Swiggy sales booked at the payout (net)",
    support: 26,
    consistency: 1,
    examples: ["SV/JPN/0819/Z", "SV/JPN/0826/S"],
    breaks:
      "Sales must be booked at gross (ENT-03). Booking the payout hides ₹3–4 lakh a month of commission and ads, and the TDS credit under 194-O.",
  },
  {
    id: "channel_map",
    family: "Debtor per channel",
    value:
      "HDFC Card Receivable – JP Nagar, HDFC UPI Receivable – JP Nagar, Zomato Receivable, Swiggy Receivable",
    support: 210,
    consistency: 0.97,
    examples: ["RV/JPN/0815/C", "RV/JPN/0819/Z"],
  },
  {
    id: "channel_map.ownly",
    family: "Debtor per channel",
    value: "Ownly: no receipts in history. Template default, Ownly Receivable",
    support: 0,
    consistency: 0,
    examples: [],
  },
  {
    id: "charge_map.mdr",
    family: "Charge treatment",
    value: "MDR to MDR Charges, GST on MDR to Input CGST / SGST",
    support: 61,
    consistency: 0.97,
    examples: ["RV/JPN/0812/C", "RV/JPN/0813/C"],
  },
  {
    id: "receipt.allocation",
    family: "Bill allocation",
    value: "Agst Ref by sales date (oldest first on the rest)",
    support: 40,
    consistency: 0.7,
    examples: ["RV/JPN/0819/Z", "RV/JPN/0826/S"],
  },
  {
    id: "bank_rules",
    family: "Bank narration → ledger",
    value:
      "Rent → Rent, BESCOM → Electricity, HOPCOMS → Hopcoms (creditor), AKSHAYAKALPA → Akshayakalpa Dairy (creditor), GST PMT → GST Payable, HP GAS → Gas & Fuel, SALARY → Salaries, SMS → Bank Charges",
    support: 54,
    consistency: 0.96,
    examples: ["PV/JPN/0801/01", "PV/JPN/0805/02"],
  },
  {
    id: "terminals",
    family: "Terminals and outlets",
    value: `TID ${TID_JP} → JP Nagar, TID ${TID_KORA} → Koramangala`,
    support: 120,
    consistency: 1,
    examples: ["RV/JPN/0815/C", "RV/KRM/0815/C"],
  },
  {
    id: "contra_rules",
    family: "Contra and cash",
    value: `Cash deposits → Contra from Cash; transfers to ICICI ·4105 → Contra`,
    support: 30,
    consistency: 0.93,
    examples: ["CV/JPN/0804/01", "CV/JPN/0825/01"],
    confirm:
      "ICICI ·4105 must be confirmed as the company's own account before any transfer to it is booked as a contra (IDN-02).",
  },
  {
    id: "entity.cost_centres",
    family: "Cost centres",
    value: "Not enabled in Tally",
    support: 0,
    consistency: 1,
    examples: [],
  },
];
