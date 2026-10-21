import { useSyncExternalStore } from "react";
import {
  actor,
  getState,
  itemFromMock,
  neoCreate,
  neoDiscard,
  type Item,
} from "@/components/inbox/v2/store";
import {
  bankingActions,
  getBankingState,
} from "@/hooks/pages/inbox/use-banking";
import { logActivity } from "@/hooks/pages/inbox/use-activity";
import { savePolicies } from "@/hooks/pages/inbox/use-client-policy";
import { NANDHINI_HDFC_ID } from "@/config/pages/inbox/mock-banking";
import {
  BOOKED_BILLWISE,
  CARD_SETTLEMENTS,
  CASH_DEPOSITS,
  CHANNELS,
  DEBITS,
  HDFC_LEDGER,
  HISTORY_PATTERNS,
  ICICI_LEDGER,
  OWNLY_PAYOUTS,
  POS_ALL,
  RECEIVABLE,
  SWIGGY_PAYOUTS,
  TID_JP,
  TID_KORA,
  UPI_MID,
  UPI_SETTLEMENTS,
  ZOMATO_PAYOUTS,
  dayLabel,
  reconFileNamed,
  saleOn,
  statementBetween,
  type Deduction,
  type Payout,
  type ReconChannel,
  type StatementRow,
} from "@/config/pages/neo/mock-recon";
import type { InboxItem } from "@/types/pages/inbox";
import type {
  BankLine,
  CloseEvidence,
  LearnedRule,
  PayoutRow,
  PolicyRow,
  ReconDoc,
  ReconPeriodId,
  ReconPolicy,
  ReconQuestion,
  ReconRun,
  ReconVoucher,
  RuleHit,
  SalesCell,
  SuspenseLine,
  VoucherLine,
} from "@/types/pages/neo/recon";

/**
 * Three-way reconciliation for Neo (20 Oct 2026). The brief's split holds
 * here: this file is the "engineer" part — arithmetic, matching, allocation,
 * templates, state — and the PM rules it applies are cited by ID on
 * everything it produces. Neo's words (the tasks) only describe its results.
 *
 * Phase one (drafts): Sales, Receipt, Payment and Contra; nothing posted.
 * Sales drafts land in the Sales book's Needs Review; bank-led vouchers land
 * on their Banking lines, typed and explained, not marked ready.
 * Phase three (close): the next statement is read for evidence that what
 * was open got paid; suspense is resolved or carried; the period closes.
 * Phase four (learning): answers become scoped rules (LRN-02/03/06) and
 * report formats are remembered (DOC-06), so the next run asks less.
 */

const r2 = (n: number) => Math.round(n * 100) / 100;
export const inr = (n: number) =>
  n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/* --------------------------------------------------------------- periods */

export type ReconPeriod = {
  id: ReconPeriodId;
  label: string;
  short: string;
  from: string;
  to: string;
};

export const PERIODS: Record<ReconPeriodId, ReconPeriod> = {
  sep: {
    id: "sep",
    label: "September 2026",
    short: "September",
    from: "2026-09-01",
    to: "2026-09-30",
  },
  oct: {
    id: "oct",
    label: "1–15 October 2026",
    short: "1–15 October",
    from: "2026-10-01",
    to: "2026-10-15",
  },
};

const inP = (d: string, p: { from: string; to: string }) =>
  d >= p.from && d <= p.to;
const addDays = (date: string, n: number) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/* ---------------------------------------------------------------- store */

type State = {
  policies: ReconPolicy[];
  runs: ReconRun[];
  rules: LearnedRule[];
};
let state: State = { policies: [], runs: [], rules: [] };
const listeners = new Set<() => void>();
const set = (next: State) => {
  state = next;
  listeners.forEach((f) => f());
};
const subscribe = (f: () => void) => {
  listeners.add(f);
  return () => listeners.delete(f);
};
const snapshot = () => state;
export const useRecon = () =>
  useSyncExternalStore(subscribe, snapshot, snapshot);
export const getRun = (id: string) => state.runs.find((r) => r.id === id);
export const policyOf = (company: string) =>
  state.policies.find((p) => p.company === company);
export const rulesOf = (company: string) =>
  state.rules.filter((r) => r.company === company);
/** The latest drafted run for a period, the one a close or a sequel reads. */
export const latestRun = (company: string, period: ReconPeriodId) =>
  [...state.runs]
    .reverse()
    .find(
      (r) =>
        r.company === company &&
        r.periodId === period &&
        (r.stage === "created" || r.stage === "register")
    );
const patchRun = (id: string, p: Partial<ReconRun>) =>
  set({
    ...state,
    runs: state.runs.map((r) => (r.id === id ? { ...r, ...p } : r)),
  });

/* --------------------------------------------------------------- policy */

/** LRN-01: what the evidence in history earns each pattern. */
export const draftPolicy = (company: string): ReconPolicy => {
  const rows: PolicyRow[] = HISTORY_PATTERNS.map((p) => {
    const evidence = p.support
      ? `${p.support} vouchers, ${Math.round(p.consistency * 100)}% consistent${p.examples.length ? ` · e.g. ${p.examples.slice(0, 2).join(", ")}` : ""}`
      : "No history";
    const state: PolicyRow["state"] = p.breaks
      ? "not-copied"
      : p.confirm
        ? "asked"
        : !p.support
          ? "assumed"
          : p.support >= 10 && p.consistency >= 0.9
            ? "prefilled"
            : "asked";
    return { id: p.id, family: p.family, value: p.value, state, evidence };
  });
  rows.push({
    id: "gst.9-5",
    family: "GST on platform orders",
    value:
      "Section 9(5): Zomato, Swiggy and Ownly pay the GST on food orders; no output GST on those sales",
    state: "assumed",
    evidence: "Proposed, pending CA confirmation (D5)",
  });
  const policy: ReconPolicy = {
    company,
    version: (policyOf(company)?.version || 0) + 1,
    effectiveFrom: "2026-09-01",
    status: "draft",
    rows,
  };
  set({
    ...state,
    policies: [...state.policies.filter((p) => p.company !== company), policy],
  });
  return policy;
};

export const answerPolicy = (
  company: string,
  rowId: string,
  answer: string
) => {
  const p = policyOf(company);
  if (!p) return;
  set({
    ...state,
    policies: state.policies.map((x) =>
      x.company === company
        ? {
            ...x,
            rows: x.rows.map((r) => (r.id === rowId ? { ...r, answer } : r)),
          }
        : x
    ),
  });
};

export const approvePolicy = (company: string) => {
  const p = policyOf(company);
  if (!p) return;
  set({
    ...state,
    policies: state.policies.map((x) =>
      x.company === company ? { ...x, status: "approved" } : x
    ),
  });
  // The rules a client policy can hold, in its words (company overlay).
  savePolicies(company, [
    {
      id: `recon-gross-${company}`,
      company,
      text: `Platform sales are booked at gross from ${dayLabel(p.effectiveFrom)} 2026; commission, ads, GST on fees and TDS 194-O go to their own ledgers`,
      condition: { description: "zomato|swiggy|ownly" },
      action: { ledger: "Sales — Local (GST)" },
      active: true,
    },
    {
      id: `recon-terminals-${company}`,
      company,
      text: `Card terminal ${TID_JP} is JP Nagar; ${TID_KORA} is Koramangala`,
      condition: { description: "TID" },
      action: { ledger: RECEIVABLE.card },
      active: true,
    },
  ]);
  logActivity({
    company,
    actor: { kind: "person", name: actor },
    kind: "rule",
    module: "Automation",
    action: `Approved reconciliation policy v${p.version}`,
    subject: `${p.rows.length} sections, effective ${dayLabel(p.effectiveFrom)} 2026`,
    reason: "Drafted by Neo from Jun–Aug vouchers; gaps answered in the chat",
  });
};

/* ------------------------------------------------------- learned rules */

const TAX_LEDGER = /GST|TDS|TCS/;

/** The rule that covers a payer, a narration or a format, if any. */
const ruleFor = (company: string, kind: LearnedRule["kind"], text: string) =>
  rulesOf(company).find(
    (r) =>
      r.kind === kind &&
      r.state !== "retired" &&
      text.toUpperCase().includes(r.match.toUpperCase())
  );
const ruleApplies = (r?: LearnedRule) => r?.state === "active";

/**
 * LRN-03: an answer is for this item unless the person says "from now
 * on" or "always". "Always" is explicit: active at once — unless it books
 * to a tax ledger, which waits for one approval. "From now on" on a
 * correction starts as a shadow that needs three matching confirmations.
 */
export const learn = (
  company: string,
  rule: Omit<
    LearnedRule,
    | "id"
    | "company"
    | "state"
    | "confirmations"
    | "contradictions"
    | "tax"
    | "createdAt"
    | "usedIn"
    | "needed"
  > & { always: boolean }
) => {
  const tax = !!rule.ledger && TAX_LEDGER.test(rule.ledger);
  const existing = ruleFor(company, rule.kind, rule.match);
  if (existing) return confirmRule(existing.id, true);
  const next: LearnedRule = {
    id: `LR-${rulesOf(company).length + 1}`,
    company,
    kind: rule.kind,
    match: rule.match,
    does: rule.does,
    ledger: rule.ledger,
    source: rule.source,
    state: tax ? "proposed" : rule.always ? "active" : "shadow",
    confirmations: 1,
    needed: rule.always ? 1 : 3,
    contradictions: 0,
    tax,
    createdAt: new Date().toISOString(),
    usedIn: [],
  };
  set({ ...state, rules: [...state.rules, next] });
  logActivity({
    company,
    actor: { kind: "person", name: actor },
    kind: "rule",
    module: "Automation",
    action:
      next.state === "active" ? "Taught Neo a rule" : "Started a shadow rule",
    subject: `${next.match} → ${next.does}`,
    reason: rule.source,
  });
  return next;
};

/** A matching answer counts towards a shadow; a different one against it. */
export const confirmRule = (id: string, agrees: boolean) => {
  const r = state.rules.find((x) => x.id === id);
  if (!r) return r;
  const confirmations = agrees ? r.confirmations + 1 : r.confirmations;
  const contradictions = agrees ? 0 : r.contradictions + 1;
  const next: LearnedRule = {
    ...r,
    confirmations,
    contradictions,
    state:
      contradictions >= 2
        ? "review"
        : r.tax
          ? r.state
          : confirmations >= r.needed
            ? "active"
            : r.state,
  };
  set({ ...state, rules: state.rules.map((x) => (x.id === id ? next : x)) });
  return next;
};

/** A tax-ledger rule's one explicit approval (LRN-02). */
export const approveRule = (id: string) =>
  set({
    ...state,
    rules: state.rules.map((x) =>
      x.id === id ? { ...x, state: "active" } : x
    ),
  });

/* -------------------------------------------------------------- reading */

const hit = (
  rule: string,
  severity: RuleHit["severity"],
  text: string
): RuleHit => ({ rule, severity, text });

const FORMAT: Record<string, string> = {
  pos: "Petpooja day-end",
  "card-mpr": "HDFC card MPR",
  "upi-payout": "HDFC UPI payout file",
  zomato: "Zomato settlement",
  swiggy: "Swiggy settlement",
};

const readDocs = (
  files: string[],
  company: string,
  p: ReconPeriod
): ReconDoc[] =>
  files.map((name) => {
    const f = reconFileNamed(name);
    const base = { file: name, hits: [] as RuleHit[] };
    if (!f)
      return {
        ...base,
        purpose: "Unknown",
        provider: "—",
        outlet: "—",
        period: "—",
        detail: "—",
        rows: 0,
        status: "rejected",
        hits: [
          hit(
            "DOC-01",
            "hard",
            "This prototype reads its sample reports only."
          ),
        ],
      };
    const span =
      f.from && f.to
        ? `${dayLabel(f.from)}–${dayLabel(f.to)}`
        : p.id === "sep"
          ? "1–30 Sep"
          : "";
    // DOC-06: a format seen and confirmed before skips the model.
    const known = FORMAT[f.kind] && ruleFor(company, "format", FORMAT[f.kind]);
    const remembered = known
      ? [
          hit(
            "DOC-06",
            "default",
            `Same ${FORMAT[f.kind]} format as ${known.source.replace(/^.*?(September)/, "$1")}: column mapping reused, nothing re-read.`
          ),
        ]
      : [];
    switch (f.kind) {
      case "pos":
        return {
          ...base,
          purpose: "POS day-end",
          provider: "Petpooja",
          outlet: "JP Nagar",
          period: span,
          detail: "Day-channel totals",
          rows: POS_ALL.filter((d) => inP(d.date, p)).length,
          status: "read",
          hits: [
            ...(known
              ? [
                  ...remembered,
                  hit(
                    "DOC-03",
                    "hard",
                    `"Sales" is tax-inclusive, as you confirmed for this format. Not asked again.`
                  ),
                ]
              : [
                  hit(
                    "DOC-03",
                    "hard",
                    '"Sales" read as tax-inclusive: Collections equal Sales on every day. Asked before any sales voucher.'
                  ),
                ]),
            hit(
              "DOC-04",
              "hard",
              "Day totals support daily vouchers only; they can't close individual bills."
            ),
          ],
        };
      case "card-mpr":
        return f.outlet === "koramangala"
          ? {
              ...base,
              purpose: "Card settlement (MPR)",
              provider: "HDFC",
              outlet: "Koramangala",
              period: "11–13 Sep",
              detail: "Settlement per terminal-day",
              rows: 3,
              status: "blocked",
              hits: [
                hit(
                  "IDN-03",
                  "hard",
                  `TID ${TID_KORA} is mapped to Koramangala, and this run is JP Nagar. Its 12 Sep net equals a JP Nagar credit to the paisa; the match is refused all the same. Suspense isn't allowed (SUS-01).`
                ),
              ],
            }
          : {
              ...base,
              purpose: "Card settlement (MPR)",
              provider: "HDFC",
              outlet: "JP Nagar",
              period: span || "31 Aug–30 Sep",
              detail: "Settlement per terminal-day",
              rows: CARD_SETTLEMENTS.filter((c) => inP(c.payDate, p)).length,
              status: "read",
              hits: remembered,
            };
      case "upi-payout":
        return {
          ...base,
          purpose: "UPI payout",
          provider: "HDFC",
          outlet: "JP Nagar",
          period: span || "31 Aug–30 Sep",
          detail: "Payout per day",
          rows: UPI_SETTLEMENTS.filter((c) => inP(c.payDate, p)).length,
          status: "read",
          hits: remembered,
        };
      case "zomato":
        return {
          ...base,
          purpose: "Platform settlement",
          provider: "Zomato (Eternal Ltd)",
          outlet: "JP Nagar · res 51425",
          period: span || "Weeks 36–39",
          detail: "Payout per week, orders by day",
          rows: ZOMATO_PAYOUTS.filter((x) => inP(x.payDate, p)).length,
          status: "read",
          hits: remembered,
        };
      case "swiggy":
        return {
          ...base,
          purpose: "Platform settlement",
          provider: "Swiggy (Bundl Technologies)",
          outlet: "JP Nagar",
          period: span || "31 Aug–27 Sep",
          detail: "Payout per week, orders by day",
          rows: SWIGGY_PAYOUTS.filter((x) => inP(x.payDate, p)).length,
          status: "read",
          hits: [
            ...remembered,
            ...(p.id === "sep"
              ? [
                  hit(
                    "DOC-05",
                    "soft",
                    "The 7–13 Sep summary sheet says ₹130 more than its order rows add up to. The rows are used; the summary is flagged."
                  ),
                ]
              : []),
          ],
        };
      case "statement": {
        const from = f.from || p.from;
        const to = f.to || p.to;
        const rows = statementBetween(from, to);
        // DUP-01 by stable row identity; DUP-03: a shared range isn't a duplicate.
        const res = bankingActions.importStatement(
          company,
          NANDHINI_HDFC_ID,
          f.from ? name : "HDFC_CA_0418_Sep2026.pdf",
          from,
          to,
          rows
        );
        return {
          ...base,
          purpose: "Bank statement",
          provider: "HDFC",
          outlet: "Current A/c ·0418",
          period: `${dayLabel(from)}–${dayLabel(to)}`,
          detail: "Bank row",
          rows: rows.length,
          status: res.fresh ? "read" : "duplicate",
          hits: res.fresh
            ? res.duplicate
              ? [
                  hit(
                    "DUP-03",
                    "default",
                    `${res.duplicate} rows (to ${dayLabel(rows.filter((r) => r.date <= "2026-10-07").slice(-1)[0]?.date || from)}) are already in Banking from an earlier statement; a shared date range isn't a duplicate, the rows are. ${res.fresh} new rows added.`
                  ),
                ]
              : [
                  hit(
                    "DUP-01",
                    "default",
                    `${res.fresh} rows added to Banking.`
                  ),
                ]
            : [
                hit(
                  "DUP-01",
                  "hard",
                  `Same ${rows.length} rows as the statement already in Banking. Nothing new; Banking's lines are used.`
                ),
              ],
        };
      }
      default:
        return {
          ...base,
          purpose: "Not a report",
          provider: "—",
          outlet: "—",
          period: "—",
          detail: "—",
          rows: 0,
          status: "rejected",
          hits: [
            hit(
              "DOC-01",
              "hard",
              "A single retail purchase (a milk receipt). Recon needs a POS day-end, a settlement report or a bank statement."
            ),
          ],
        };
    }
  });

/* ------------------------------------------------------------- questions */

/**
 * What only the accountant can answer, for this period, minus what the
 * company has already taught Neo. ASK-01: never ask what's known.
 */
const questionsFor = (company: string, p: ReconPeriod): ReconQuestion[] => {
  const rows = statementBetween(p.from, p.to);
  const qs: ReconQuestion[] = [];
  if (!ruleApplies(ruleFor(company, "format", FORMAT.pos)))
    qs.push({
      id: "pos-inclusive",
      text: 'Is POS "Sales" tax-inclusive?',
      detail:
        "Collections equal Sales on every day, so I've read it as including 5% GST. Sales vouchers wait for this answer; nothing else does.",
      rule: "DOC-03",
      settled: "collections equal Sales on every day",
      options: [
        {
          id: "inclusive",
          label: "Yes, tax-inclusive",
          hint: "Suggested: collections tie",
        },
        { id: "exclusive", label: "No, GST is on top" },
      ],
      answer: "inclusive",
    });
  const ctrlx = rows.filter((r) => /CTRLX/.test(r.narration));
  if (ctrlx.length && !ruleApplies(ruleFor(company, "payer", "CTRLX")))
    qs.push({
      id: "ctrlx",
      text: `"NEFT CR CTRLX TECHNOLOGIES" came in ${ctrlx.length} times. Who is it?`,
      detail:
        "Mondays, no report in this upload names it. Each credit equals the previous week's Ownly sales in your POS to the rupee.",
      rule: "IDN-05",
      settled: "each credit equals last week's Ownly sales",
      options: [
        {
          id: "ownly-always",
          label: "Ownly payouts, always",
          hint: "Suggested: amounts match Ownly sales",
        },
        { id: "ownly-once", label: "Ownly, this run only" },
        { id: "unknown", label: "Don't know: keep in suspense" },
      ],
      answer: "ownly-always",
    });
  const llp = DEBITS.find(
    (d) => inP(d.date, p) && /NANDHINI FOODS LLP/.test(d.narration)
  );
  if (llp && !ruleApplies(ruleFor(company, "narration", "NANDHINI FOODS LLP")))
    qs.push({
      id: "llp",
      text: `₹${inr(llp.amount)} to Nandhini Foods LLP on ${dayLabel(llp.date)}: what is it?`,
      detail:
        "Not a contra: the LLP is a separate entity, however similar the name. History has no payment to it.",
      rule: "IDN-04",
      options: [
        {
          id: "loan",
          label: "A loan to the LLP, this time",
          hint: "Loans & Advances",
        },
        { id: "loan-always", label: "A loan, and every transfer to the LLP" },
        {
          id: "supplies",
          label: "Payment for supplies",
          hint: "Against the LLP as a creditor",
        },
        { id: "suspense", label: "Not sure: suspense" },
      ],
      answer: "loan",
    });
  const short = SWIGGY_PAYOUTS.find(
    (x) => inP(x.payDate, p) && x.bank !== x.net && Math.abs(x.net - x.bank) > 1
  );
  if (short)
    qs.push({
      id: "swiggy-short",
      text: `Swiggy's ${dayLabel(short.from)}–${dayLabel(short.to)} payout is ₹${inr(r2(short.net - short.bank))} short of its report.`,
      detail:
        "Report net and the bank credit differ by more than the ₹1 round-off limit, and no deduction line explains it.",
      rule: "SUS-02",
      options: [
        {
          id: "suspense",
          label: "Suspense, and I'll ask Swiggy",
          hint: "Owner: you · reason recorded",
        },
        { id: "hold", label: "Hold this payout until I hear back" },
      ],
      answer: "suspense",
    });
  const amazon = DEBITS.find(
    (d) => inP(d.date, p) && /AMAZON PAY/.test(d.narration)
  );
  if (amazon) {
    const r = ruleFor(company, "narration", "AMAZON PAY");
    if (r?.state === "shadow")
      qs.push({
        id: "amazon",
        confirms: r.id,
        text: `"AMAZON PAY" ₹${inr(amazon.amount)} on ${dayLabel(amazon.date)}: ${r.ledger} again?`,
        detail: `Your rule from ${r.source.replace(/^.*?, /, "")} is a shadow: ${r.confirmations} of ${r.needed} confirmations. Confirming counts towards it; at ${r.needed} it applies without asking (LRN-02).`,
        rule: "LRN-02",
        settled: `your rule, ${r.confirmations} of ${r.needed} confirmations`,
        options: [
          {
            id: "confirm",
            label: `Yes, ${r.ledger}`,
            hint: `Suggested: your rule, ${r.confirmations} of ${r.needed}`,
          },
          { id: "suspense", label: "Not this time: suspense" },
        ],
        answer: "confirm",
      });
    else if (!ruleApplies(r))
      qs.push({
        id: "amazon",
        text: `"POS 4521XXXX AMAZON PAY" ₹${inr(amazon.amount)} on ${dayLabel(amazon.date)}: what is it?`,
        detail: "No bank rule and no similar payment in history.",
        rule: "SUS-01",
        options: [
          {
            id: "suspense",
            label: "Suspense for now",
            hint: "Suggested: no rule or history to go on",
          },
          { id: "office", label: "Office expenses, this time" },
          { id: "office-always", label: "Office expenses, from now on" },
          { id: "repairs", label: "Repairs & maintenance" },
        ],
        answer: "suspense",
      });
  }
  return qs;
};

/* ---------------------------------------------------------------- engine */

const DEDUCTION_LEDGER: Record<Deduction["kind"], (p: string) => string> = {
  commission: (p) => `${p} Commission`,
  ads: () => "Marketing – Platform Ads",
  "gst-on-fees": () => "Input CGST / SGST",
  tds: () => "TDS Receivable – 194-O",
  other: () => "Platform Other Charges",
  refund: (p) => `${p} Cancellation Refunds`,
};

const splitGst = (ledger: string, amount: number): VoucherLine[] =>
  ledger === "Input CGST / SGST"
    ? [
        { ledger: "Input CGST", dr: r2(amount / 2) },
        { ledger: "Input SGST", dr: r2(amount - r2(amount / 2)) },
      ]
    : [{ ledger, dr: amount }];

const refOf = (date: string, ch: ReconChannel) =>
  `${dayLabel(date)} ${CHANNELS.find((c) => c.id === ch)!.label.toLowerCase()}`;

const daysIn = (from: string, to: string) => {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
};

type Ctx = {
  company: string;
  p: ReconPeriod;
  answers: Record<string, string>;
  questions: ReconQuestion[];
};

const answerOf = (c: Ctx, id: ReconQuestion["id"]) =>
  c.answers[id] ?? c.questions.find((q) => q.id === id)?.answer;

/** Every proof, match, classification and voucher for the period. */
const compute = (c: Ctx) => {
  const { p, company } = c;
  const rows = statementBetween(p.from, p.to);
  const payouts: PayoutRow[] = [];
  const vouchers: ReconVoucher[] = [];
  const bank: BankLine[] = [];
  const skipped: ReconRun["skipped"] = [];
  const learned = new Set<string>();
  const used = new Set<string>();
  const rowFor = (
    date: string,
    amount: number,
    side: "C" | "D",
    text: RegExp
  ) =>
    rows.find(
      (r) =>
        r.date === date &&
        r.side === side &&
        !used.has(r.key) &&
        Math.abs(r.amount - amount) < 0.005 &&
        text.test(r.narration)
    );

  /* Leg B first (MAT-01): every payout to its bank credit. */
  [...CARD_SETTLEMENTS, ...UPI_SETTLEMENTS]
    .filter(
      (s) => inP(s.payDate, p) || (inP(s.saleDate, p) && s.payDate > p.to)
    )
    .forEach((s) => {
      const label = `${s.channel === "card" ? "Card" : "UPI"} · ${dayLabel(s.saleDate)}`;
      const deductions: Deduction[] = s.mdr
        ? [
            { kind: "commission", label: "MDR", amount: -s.mdr },
            {
              kind: "gst-on-fees",
              label: "GST on MDR (18%)",
              amount: -s.gstOnMdr,
            },
          ]
        : [];
      const base = {
        id: `${s.channel}-${s.saleDate}`,
        provider: s.channel,
        label,
        from: s.saleDate,
        to: s.saleDate,
        payDate: s.payDate,
        gross: s.gross,
        deductions,
        net: s.net,
      };
      if (s.payDate > p.to) {
        payouts.push({
          ...base,
          status: "open",
          hits: [
            hit(
              "MAT-06",
              "default",
              `Settles ${dayLabel(s.payDate)}, after the statement ends: an open receivable, not a shortfall.`
            ),
          ],
        });
        return;
      }
      const row = rowFor(
        s.payDate,
        s.net,
        "C",
        s.channel === "card"
          ? new RegExp(`TID ${s.terminal}`)
          : new RegExp(`MID ${UPI_MID}`)
      );
      if (!row) return;
      used.add(row.key);
      const hits: RuleHit[] = [];
      if (s.channel === "upi" && s.mdr)
        hits.push(
          hit(
            "AMT-06",
            "soft",
            `MDR of ₹${inr(s.mdr)} charged on UPI, a zero-MDR rail. Booked as charged; worth raising with HDFC.`
          )
        );
      payouts.push({
        ...base,
        bank: row.amount,
        bankKey: row.key,
        key: s.channel === "card" ? "TID + net + T+1" : "MID + net + T+1",
        status: "matched",
        hits,
      });
      const billwise = BOOKED_BILLWISE.some(
        (b) => b.date === s.saleDate && b.channel === s.channel
      );
      vouchers.push({
        id: `RV-${s.channel}-${s.saleDate}`,
        type: "Receipt",
        date: s.payDate,
        title: `${label} settlement`,
        lines: [
          { ledger: HDFC_LEDGER, dr: s.net },
          ...(s.mdr ? [{ ledger: "MDR Charges", dr: s.mdr }] : []),
          ...(s.gstOnMdr ? splitGst("Input CGST / SGST", s.gstOnMdr) : []),
          {
            ledger: RECEIVABLE[s.channel],
            cr: s.gross,
            ref: billwise
              ? "On account"
              : `Agst Ref ${refOf(s.saleDate, s.channel)}`,
          },
        ],
        narration: `HDFC ${s.channel === "card" ? `card TID ${s.terminal}` : "UPI"} settlement for ${dayLabel(s.saleDate)}; JP Nagar`,
        status: "ready",
        hits: [
          hit(
            "MAT-02",
            "default",
            `Tied by ${s.channel === "card" ? `TID ${s.terminal}` : `MID ${UPI_MID}`} in the narration, the exact net and the T+1 window: one candidate.`
          ),
          hit(
            "AMT-01",
            "hard",
            `Gross ₹${inr(s.gross)}${s.mdr ? ` − MDR ₹${inr(s.mdr)} − GST ₹${inr(s.gstOnMdr)}` : ""} = ₹${inr(s.net)} = bank.`
          ),
          ...(billwise
            ? [
                hit(
                  "ALC-04",
                  "default",
                  `${dayLabel(s.saleDate)} card sales were booked bill by bill; a day total can't close those bills (DOC-04), so the receipt goes on account.`
                ),
              ]
            : [
                hit(
                  "ALC-01",
                  "hard",
                  `Closes ${refOf(s.saleDate, s.channel)} only${s.saleDate < p.from ? `, raised in ${dayLabel(s.saleDate).split(" ")[1]}` : ""}.`
                ),
              ]),
          ...hits,
        ],
        channel: s.channel,
        bankKey: row.key,
      });
    });

  const ctrlxRule = ruleFor(company, "payer", "CTRLX");
  const platform = (list: Payout[], name: string) =>
    list
      .filter(
        (x) =>
          inP(x.payDate, p) ||
          (x.payDate > p.to && x.to >= p.from && x.from <= p.to)
      )
      .forEach((x) => {
        const label = `${name} · ${dayLabel(x.from)}–${dayLabel(x.to)}`;
        const days = daysIn(x.from, x.to);
        const base = {
          id: x.id,
          provider: x.provider,
          label,
          from: x.from,
          to: x.to,
          payDate: x.payDate,
          gross: x.gross,
          deductions: x.deductions,
          net: x.net,
        };
        if (x.payDate > p.to) {
          payouts.push({
            ...base,
            status: "open",
            hits: [
              hit(
                "MAT-06",
                "default",
                `Expected ${dayLabel(x.payDate)}, after the statement ends: open receivable.`
              ),
            ],
          });
          return;
        }
        const row = rows.find(
          (r) =>
            r.side === "C" &&
            !used.has(r.key) &&
            (x.utr
              ? r.narration.includes(x.utr)
              : x.provider === "swiggy"
                ? /BUNDL/.test(r.narration) && r.date === x.payDate
                : /CTRLX/.test(r.narration) && r.date === x.payDate)
        );
        if (!row) return;
        used.add(row.key);
        const diff = r2(row.amount - x.net);
        const hits: RuleHit[] = [];
        const key = x.utr ? "UTR" : "Payer + amount + expected day";
        if (!x.utr && x.provider === "swiggy")
          hits.push(
            hit(
              "MAT-07",
              "soft",
              "No UTR in Swiggy's report; Bundl Technologies, the expected Thursday and the amount leave one credit."
            )
          );
        if (x.provider === "zomato" && x.rate && x.rate > 0.19)
          hits.push(
            hit(
              "AMT-06",
              "soft",
              `Commission ${Math.round(x.rate * 100)}% this week; history is 18%. Booked as charged; worth checking the contract.`
            )
          );
        if (x.summaryGross && p.id === "sep")
          hits.push(
            hit(
              "DOC-05",
              "soft",
              `Summary sheet says gross ₹${inr(x.summaryGross)}; the order rows add up to ₹${inr(x.gross)}. Rows used.`
            )
          );
        const ownly = x.provider === "ownly";
        const payer = ownly
          ? ruleApplies(ctrlxRule)
            ? "rule"
            : answerOf(c, "ctrlx") === "unknown"
              ? "unknown"
              : "answer"
          : "report";
        if (ownly && payer === "rule") {
          learned.add(ctrlxRule!.id);
          hits.push(
            hit(
              "LRN-02",
              "default",
              `"CTRLX Technologies" is Ownly, your rule ${ctrlxRule!.id}; not asked again.`
            )
          );
        }

        let status: PayoutRow["status"] = "matched";
        const extra: VoucherLine[] = [];
        let vStatus: ReconVoucher["status"] = "ready";
        if (payer === "unknown") status = "unknown-payer";
        else if (diff && Math.abs(diff) <= 1) {
          status = "round-off";
          extra.push({ ledger: "Round Off", dr: -diff });
          hits.push(
            hit(
              "AMT-03",
              "default",
              `₹${inr(Math.abs(diff))} difference, within ₹1: round-off.`
            )
          );
        } else if (diff) {
          if (answerOf(c, "swiggy-short") === "hold") {
            payouts.push({
              ...base,
              bank: row.amount,
              bankKey: row.key,
              key,
              status: "open",
              hits: [
                hit(
                  "ASK-04",
                  "hard",
                  `Held at your answer: ₹${inr(Math.abs(diff))} unexplained. Nothing drafted for this payout; the rest went ahead.`
                ),
              ],
            });
            used.delete(row.key);
            skipped.push({
              what: `${label} payout`,
              amount: row.amount,
              hit: hit(
                "ASK-04",
                "hard",
                "Held until Swiggy explains the difference"
              ),
            });
            return;
          }
          status = "suspense";
          vStatus = "suspense";
          extra.push({ ledger: "Suspense A/c", dr: -diff });
          hits.push(
            hit(
              "SUS-02",
              "hard",
              `₹${inr(Math.abs(diff))} unexplained. Suspense line · owner: you · reason: "${name} payout short of report" · age from ${dayLabel(x.payDate)}.`
            )
          );
        }
        payouts.push({
          ...base,
          bank: row.amount,
          bankKey: row.key,
          key,
          status,
          hits,
        });

        if (status === "unknown-payer") {
          vouchers.push({
            id: `RV-${x.id}`,
            type: "Receipt",
            date: x.payDate,
            title: `CTRLX Technologies · ${dayLabel(x.payDate)}`,
            lines: [
              { ledger: HDFC_LEDGER, dr: row.amount },
              { ledger: "Suspense A/c", cr: row.amount },
            ],
            narration: "Credit from CTRLX Technologies; payer not identified",
            status: "suspense",
            hits: [
              hit(
                "SUS-02",
                "hard",
                "Payer unknown at your answer: suspense line, owner you, until it's identified."
              ),
            ],
            bankKey: row.key,
          });
          return;
        }
        vouchers.push({
          id: `RV-${x.id}`,
          type: "Receipt",
          date: x.payDate,
          title: `${label} payout`,
          lines: [
            { ledger: HDFC_LEDGER, dr: row.amount },
            ...x.deductions
              .filter((d) => d.amount < 0)
              .flatMap((d) =>
                splitGst(DEDUCTION_LEDGER[d.kind](name), -d.amount)
              ),
            ...extra,
            ...days.map((d) => ({
              ledger: RECEIVABLE[x.provider],
              cr: saleOn(d, x.provider),
              ref: `Agst Ref ${refOf(d, x.provider)}`,
            })),
            ...x.deductions
              .filter((d) => d.amount > 0)
              .map((d) => ({
                ledger: DEDUCTION_LEDGER[d.kind](name),
                cr: d.amount,
              })),
          ],
          narration: `${name} settlement ${x.utr || x.id} for ${dayLabel(x.from)}–${dayLabel(x.to)}; JP Nagar`,
          status: vStatus,
          hits: [
            hit(
              "MAT-02",
              "default",
              key === "UTR"
                ? `Tied by UTR ${x.utr}.`
                : `Tied by ${key.toLowerCase()}.`
            ),
            hit(
              "AMT-01",
              "hard",
              `Gross ₹${inr(x.gross)} ${x.deductions.map((d) => `${d.amount < 0 ? "−" : "+"} ${d.label} ₹${inr(Math.abs(d.amount))}`).join(" ")} = net ₹${inr(x.net)}; bank ₹${inr(row.amount)}.`
            ),
            ...(x.deductions.length
              ? [
                  hit(
                    "AMT-02",
                    "hard",
                    "Each deduction to its own ledger; GST on fees split into CGST and SGST, TDS to 194-O receivable."
                  ),
                ]
              : []),
            hit(
              "MAT-05",
              "hard",
              `One payout closes ${days.length} days; each allocation equals that day's sales${x.from < p.from ? `, ${days.filter((d) => d < p.from).length} of them from last period` : ""}.`
            ),
            ...hits,
          ],
          channel: x.provider,
          bankKey: row.key,
        });
      });
  platform(ZOMATO_PAYOUTS, "Zomato");
  platform(SWIGGY_PAYOUTS, "Swiggy");
  platform(OWNLY_PAYOUTS, "Ownly");

  /* Contras: cash deposits (the own-account transfer is below). */
  CASH_DEPOSITS.filter((d) => inP(d.date, p)).forEach((d) => {
    const row = rowFor(d.date, d.amount, "C", /CASH DEP/);
    if (!row) return;
    used.add(row.key);
    bank.push({
      key: row.key,
      date: row.date,
      narration: row.narration,
      amount: row.amount,
      side: "C",
      voucher: "Contra",
      ledger: "Cash",
      source: "history",
      note: `Cash sales ${dayLabel(d.from)}–${dayLabel(d.to)}, deposited in hundreds`,
      hits: [hit("ENT-02", "hard", "Cash deposit → Contra, Cash to bank.")],
    });
    vouchers.push({
      id: `CV-${row.key}`,
      type: "Contra",
      date: d.date,
      title: `Cash deposit · ${dayLabel(d.date)}`,
      lines: [
        { ledger: HDFC_LEDGER, dr: d.amount },
        { ledger: "Cash", cr: d.amount },
      ],
      narration: `Cash deposited at JP Nagar branch; sales ${dayLabel(d.from)}–${dayLabel(d.to)}`,
      status: "ready",
      hits: [hit("ENT-02", "hard", "Cash deposit → Contra.")],
      bankKey: row.key,
    });
  });

  /* Payments and the rest of the debits (S6: rules, learned, then answers). */
  const HISTORY: [RegExp, string][] = [
    [/RENT/, "Rent"],
    [/BESCOM/, "Electricity"],
    [/HOPCOMS/, "Hopcoms (creditor)"],
    [/AKSHAYAKALPA/, "Akshayakalpa Dairy (creditor)"],
    [/GST PMT/, "GST Payable"],
    [/HP GAS/, "Gas & Fuel"],
    [/SALARY/, "Salaries"],
    [/SMS/, "Bank Charges"],
  ];
  DEBITS.filter((d) => inP(d.date, p)).forEach((d) => {
    const row = rows.find(
      (r) =>
        r.date === d.date &&
        r.side === "D" &&
        r.narration === d.narration &&
        Math.abs(r.amount - d.amount) < 0.005
    );
    if (!row) return;
    used.add(row.key);
    const fromHistory = HISTORY.find(([re]) => re.test(d.narration));
    const taught = ruleFor(company, "narration", d.narration);
    let voucher: BankLine["voucher"] = "Payment";
    let ledger = fromHistory?.[1] || "";
    let source: BankLine["source"] = fromHistory ? "history" : "answer";
    let note = fromHistory ? "Bank rule from history" : "";
    const hits: RuleHit[] = [];
    let status: ReconVoucher["status"] = "ready";
    if (/ICICI XX4105/.test(d.narration)) {
      voucher = "Contra";
      ledger = ICICI_LEDGER;
      source = "history";
      note = "Own account, confirmed in your policy";
      hits.push(
        hit(
          "IDN-04",
          "hard",
          "ICICI ·4105 is a confirmed account of the same company: contra."
        ),
        hit(
          "DUP-06",
          "hard",
          "Made once, even when ICICI's statement shows it too."
        )
      );
    } else if (taught && ruleApplies(taught) && taught.ledger) {
      ledger = taught.ledger;
      source = "learned";
      note = `Your rule ${taught.id}`;
      learned.add(taught.id);
      hits.push(
        hit(
          "LRN-02",
          "default",
          `"${taught.match}" → ${taught.ledger}, your rule ${taught.id} (${taught.source}). Not asked.`
        )
      );
    } else if (/NANDHINI FOODS LLP/.test(d.narration)) {
      const a = answerOf(c, "llp");
      ledger =
        a === "loan" || a === "loan-always"
          ? "Loan to Nandhini Foods LLP"
          : a === "supplies"
            ? "Nandhini Foods LLP (creditor)"
            : "Suspense A/c";
      source = a === "suspense" ? "suspense" : "answer";
      note = a === "suspense" ? "Not identified: suspense" : "Your answer";
      if (a === "suspense") status = "suspense";
      hits.push(
        hit(
          "IDN-04",
          "hard",
          "A similar name is not the same entity: not a contra."
        )
      );
    } else if (/AMAZON/.test(d.narration)) {
      const a = answerOf(c, "amazon");
      ledger =
        a === "confirm" && taught?.ledger
          ? taught.ledger
          : a === "office" || a === "office-always"
            ? "Office Expenses"
            : a === "repairs"
              ? "Repairs & Maintenance"
              : "Suspense A/c";
      source =
        ledger === "Suspense A/c"
          ? "suspense"
          : a === "confirm"
            ? "learned"
            : "answer";
      note =
        ledger === "Suspense A/c"
          ? "No rule, no history: suspense with a flag"
          : a === "confirm"
            ? `Your shadow rule ${taught?.id}, confirmed`
            : "Your answer";
      if (ledger === "Suspense A/c") status = "suspense";
      hits.push(
        a === "confirm"
          ? hit(
              "LRN-02",
              "default",
              `Shadow rule ${taught?.id} confirmed: ${(taught?.confirmations || 0) + 1} of ${taught?.needed}.`
            )
          : hit(
              "SUS-01",
              "hard",
              "Below the evidence bar, Neo doesn't pick a ledger; suspense resolves classification only."
            )
      );
    } else if (fromHistory) {
      hits.push(
        hit(
          "S6",
          "default",
          `"${d.narration.split(" ").slice(0, 3).join(" ")}" went to ${fromHistory[1]} in history.`
        )
      );
    }
    bank.push({
      key: row.key,
      date: row.date,
      narration: row.narration,
      amount: row.amount,
      side: "D",
      voucher,
      ledger,
      source,
      note,
      hits,
    });
    vouchers.push({
      id: `${voucher === "Contra" ? "CV" : "PV"}-${row.key}`,
      type: voucher,
      date: row.date,
      title: `${d.narration.replace(/^(NEFT DR|UPI DR|IMPS TO|POS \d+X+)\s*/, "").slice(0, 34)} · ${dayLabel(row.date)}`,
      lines:
        voucher === "Contra"
          ? [
              { ledger, dr: row.amount },
              { ledger: HDFC_LEDGER, cr: row.amount },
            ]
          : [
              {
                ledger,
                dr: row.amount,
                ref: /creditor/.test(ledger) ? "On account" : undefined,
              },
              { ledger: HDFC_LEDGER, cr: row.amount },
            ],
      narration: d.narration,
      status,
      hits,
      bankKey: row.key,
    });
  });

  /* Bank lines tied to payouts, listed too, so coverage counts every row. */
  rows
    .filter((r) => used.has(r.key) && !bank.some((b) => b.key === r.key))
    .forEach((r) => {
      const v = vouchers.find((x) => x.bankKey === r.key);
      bank.push({
        key: r.key,
        date: r.date,
        narration: r.narration,
        amount: r.amount,
        side: r.side,
        voucher: "Receipt",
        ledger:
          v?.lines.find((l) => l.cr && l.ledger !== HDFC_LEDGER)?.ledger ||
          "Suspense A/c",
        source: v?.lines.some((l) => l.cr && l.ledger === "Suspense A/c")
          ? "suspense"
          : learned.size && /CTRLX/.test(r.narration) && ruleApplies(ctrlxRule)
            ? "learned"
            : "payout",
        note: v ? v.title : "",
        hits: [],
      });
    });

  /* Leg A (MAT-04): every POS day-channel to the payout that paid it. */
  const sales: SalesCell[] = [];
  const posDays = POS_ALL.filter((d) => inP(d.date, p));
  posDays.forEach((d) =>
    CHANNELS.forEach((ch) => {
      const amount = d.sales[ch.id];
      if (
        BOOKED_BILLWISE.some((b) => b.date === d.date && b.channel === ch.id)
      ) {
        sales.push({ date: d.date, channel: ch.id, amount, state: "booked" });
        return;
      }
      if (ch.id === "cash") {
        const dep = CASH_DEPOSITS.find(
          (x) => d.date >= x.from && d.date <= x.to && inP(x.date, p)
        );
        sales.push({
          date: d.date,
          channel: ch.id,
          amount,
          state: dep ? "settled" : "open",
          payout: dep ? `Deposit ${dayLabel(dep.date)}` : undefined,
        });
        return;
      }
      const po = payouts.find(
        (x) => x.provider === ch.id && d.date >= x.from && d.date <= x.to
      );
      sales.push({
        date: d.date,
        channel: ch.id,
        amount,
        state: po && po.status !== "open" ? "settled" : "open",
        payout: po?.label,
      });
    })
  );

  /* Sales vouchers (ENT-02, ENT-03 gross, ENT-04 9(5)), unless booked. */
  const formatRule = ruleFor(company, "format", FORMAT.pos);
  const inclusive =
    ruleApplies(formatRule) || answerOf(c, "pos-inclusive") !== "exclusive";
  posDays.forEach((d) =>
    CHANNELS.forEach((ch) => {
      const amount = d.sales[ch.id];
      if (
        BOOKED_BILLWISE.some((b) => b.date === d.date && b.channel === ch.id)
      ) {
        skipped.push({
          what: `${ch.label} sales · ${dayLabel(d.date)}`,
          amount,
          hit: hit(
            "DUP-04",
            "hard",
            "Already in your books bill by bill (23 invoices). No daily voucher for this day and channel."
          ),
        });
        return;
      }
      const taxable = ch.platform ? amount : r2(amount / 1.05);
      const gst = r2(amount - taxable);
      const cgst = r2(gst / 2);
      vouchers.push({
        id: `SV-${ch.id}-${d.date}`,
        type: "Sales",
        date: d.date,
        title: `${ch.label} sales · ${dayLabel(d.date)}`,
        lines: [
          {
            ledger: RECEIVABLE[ch.id],
            dr: amount,
            ref:
              ch.id === "cash" ? undefined : `New Ref ${refOf(d.date, ch.id)}`,
          },
          { ledger: "Sales — Local (GST)", cr: taxable },
          ...(gst
            ? [
                { ledger: "Output CGST", cr: cgst },
                { ledger: "Output SGST", cr: r2(gst - cgst) },
              ]
            : []),
        ],
        narration: `${ch.label} sales for ${dayLabel(d.date)}; JP Nagar`,
        status: inclusive ? "ready" : "needs-input",
        hits: [
          hit(
            "ENT-02",
            "hard",
            `POS ${ch.label.toLowerCase()} sales not already booked → Sales, Dr ${RECEIVABLE[ch.id]}.`
          ),
          ...(ch.platform
            ? [
                hit(
                  "ENT-03",
                  "hard",
                  "At gross, from the policy cut-off (1 Sep)."
                ),
                hit(
                  "ENT-04",
                  "hard",
                  "Section 9(5): no output GST from the restaurant on platform orders (proposed, pending CA)."
                ),
              ]
            : [
                hit(
                  "DOC-03",
                  "hard",
                  `Tax-inclusive ${ruleApplies(formatRule) ? `by your format rule ${formatRule!.id}` : "at your answer"}: ₹${inr(amount)} = taxable ₹${inr(taxable)} + GST ₹${inr(gst)}.`
                ),
              ]),
        ],
        channel: ch.id,
      });
    })
  );

  /* What's still open on the last day (MAT-06), for the next step (S9). */
  const open = CHANNELS.flatMap((ch) => {
    const cells = sales.filter(
      (x) => x.channel === ch.id && x.state === "open"
    );
    if (!cells.length) return [];
    const from = cells[0].date;
    const to = cells[cells.length - 1].date;
    return [
      {
        what: `${ch.label} ${from === to ? dayLabel(from) : `${dayLabel(from)}–${dayLabel(to)}`}`,
        amount: r2(cells.reduce((t, x) => t + x.amount, 0)),
        due:
          ch.id === "card" || ch.id === "upi"
            ? "T+1"
            : ch.id === "cash"
              ? "next deposit"
              : "weekly",
      },
    ];
  });

  /* The suspense schedule's new lines (SUS-02, SUS-04). */
  const suspense: SuspenseLine[] = vouchers
    .filter((v) => v.status === "suspense")
    .map((v) => ({
      id: `SUS-${v.id}`,
      voucherId: v.id,
      bankKey: v.bankKey || "",
      what: v.title,
      amount:
        v.lines.find((l) => l.ledger === "Suspense A/c")?.dr ||
        v.lines.find((l) => l.ledger === "Suspense A/c")?.cr ||
        0,
      reason:
        v.type === "Payment"
          ? "No bank rule or history to classify it"
          : v.lines.some((l) => l.cr && l.ledger === "Suspense A/c")
            ? "Payer not identified"
            : "Short of its report; no deduction line explains it",
      owner: actor,
      since: v.date,
      state: "open",
    }));

  vouchers.sort(
    (a, b) => a.date.localeCompare(b.date) || a.type.localeCompare(b.type)
  );
  return {
    payouts,
    sales,
    bank: bank.sort((a, b) => a.date.localeCompare(b.date)),
    vouchers,
    skipped,
    open,
    suspense,
    learned: [...learned],
  };
};

/* ------------------------------------------------------------- run ops */

let seq = 0;
const blockedOf = (docs: ReconDoc[]) =>
  docs
    .filter((d) => d.status === "blocked")
    .map((d) => ({ what: d.file, hit: d.hits[0] }));

export const startRun = (
  company: string,
  files: string[],
  periodId: ReconPeriodId = "sep"
): ReconRun => {
  seq += 1;
  const p = PERIODS[periodId];
  const docs = readDocs(files, company, p);
  const questions = questionsFor(company, p);
  const answers: Record<string, string> = {};
  const computed = compute({ company, p, answers, questions });
  // Format rules the reading leaned on count as used, like any other rule.
  const formats = rulesOf(company)
    .filter(
      (r) =>
        r.kind === "format" &&
        docs.some((d) =>
          d.hits.some((h) => h.rule === "DOC-06" && h.text.includes(r.match))
        )
    )
    .map((r) => r.id);
  const run: ReconRun = {
    id: `RCN-${p.to.slice(5).replace("-", "")}-${String(seq).padStart(2, "0")}`,
    company,
    outlet: "JP Nagar",
    period: p.label,
    periodId,
    from: p.from,
    to: p.to,
    files,
    stage: "questions",
    docs,
    questions,
    answers,
    ...computed,
    learned: [...formats, ...computed.learned],
    skipped: [...blockedOf(docs), ...computed.skipped],
    createdItemIds: [],
    createdBankKeys: [],
  };
  set({ ...state, runs: [...state.runs, run] });
  return run;
};

export const answerRun = (id: string, qid: string, answer: string) => {
  const run = getRun(id);
  if (!run) return;
  const answers = { ...run.answers, [qid]: answer };
  const computed = compute({
    company: run.company,
    p: PERIODS[run.periodId],
    answers,
    questions: run.questions,
  });
  patchRun(id, {
    answers,
    questions: run.questions.map((q) => (q.id === qid ? { ...q, answer } : q)),
    ...computed,
    learned: [
      ...new Set([
        ...run.learned.filter((x) =>
          rulesOf(run.company).some((r) => r.id === x && r.kind === "format")
        ),
        ...computed.learned,
      ]),
    ],
    skipped: [...blockedOf(run.docs), ...computed.skipped],
  });
};

export const showRunRegister = (id: string) =>
  patchRun(id, { stage: "register" });

/**
 * LRN-04: learn only from what the accountant signed off. Called at the
 * sign-off, so an abandoned run teaches nothing.
 */
const learnFromRun = (run: ReconRun) => {
  const src = `your answer, ${run.period} run`;
  const a = (id: ReconQuestion["id"]) =>
    run.questions.find((q) => q.id === id)?.answer;
  // DOC-06: every format read and confirmed is remembered for this company.
  run.docs
    .filter((d) => d.status === "read")
    .forEach((d) => {
      const kind = reconFileNamed(d.file)?.kind;
      const label = kind && FORMAT[kind];
      if (!label || ruleFor(run.company, "format", label)) return;
      learn(run.company, {
        kind: "format",
        match: label,
        does:
          kind === "pos"
            ? `Columns mapped; "Sales" is tax-inclusive${a("pos-inclusive") === "exclusive" ? " — no, GST on top" : ""}`
            : "Columns mapped; no re-reading",
        source: `${run.period} run`,
        always: true,
      });
    });
  if (a("ctrlx") === "ownly-always")
    learn(run.company, {
      kind: "payer",
      match: "CTRLX",
      does: "Ownly payouts",
      ledger: RECEIVABLE.ownly,
      source: src,
      always: true,
    });
  if (a("llp") === "loan-always")
    learn(run.company, {
      kind: "narration",
      match: "NANDHINI FOODS LLP",
      does: "Loan to the LLP",
      ledger: "Loan to Nandhini Foods LLP",
      source: src,
      always: true,
    });
  if (a("amazon") === "office-always")
    learn(run.company, {
      kind: "narration",
      match: "AMAZON PAY",
      does: "Office expenses",
      ledger: "Office Expenses",
      source: src,
      always: false,
    });
  const q = run.questions.find((x) => x.id === "amazon" && x.confirms);
  if (q) confirmRule(q.confirms!, q.answer === "confirm");
  run.learned.forEach((id) =>
    set({
      ...state,
      rules: state.rules.map((r) =>
        r.id === id ? { ...r, usedIn: [...new Set([...r.usedIn, run.id])] } : r
      ),
    })
  );
};

/** Sign-off: the drafts, and nothing posted. */
export const createReconDrafts = (id: string) => {
  const run = getRun(id);
  if (!run || run.stage !== "register")
    return { sales: 0, bank: 0, before: new Map() };
  const company = run.company;
  const ready = run.vouchers.filter((v) => v.status !== "needs-input");

  // Sales → the Sales book's Needs Review, one draft per day and channel.
  const created: Item[] = [];
  ready
    .filter((v) => v.type === "Sales")
    .forEach((v, n) => {
      const taxable = v.lines.find((l) => l.ledger.startsWith("Sales"))!.cr!;
      const cgst = v.lines.find((l) => l.ledger === "Output CGST")?.cr || 0;
      const sgst = v.lines.find((l) => l.ledger === "Output SGST")?.cr || 0;
      const amount = v.lines[0].dr!;
      const code = {
        card: "CD",
        upi: "UP",
        cash: "CA",
        zomato: "ZO",
        swiggy: "SW",
        ownly: "OW",
      }[v.channel!];
      const no = `SV/JPN/${v.date.slice(5).replace("-", "")}/${code}`;
      const day = new Date(`${v.date}T00:00:00Z`).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      });
      const doc: InboxItem = {
        id: `${v.id}-${run.id}`,
        file: { name: `POS day-end · ${v.title}`, size: "—", ext: "xlsx" },
        source: {
          channel: "upload",
          sender: "Neo · Reconciliation",
          subject: `${run.id} · ${v.title}`,
        },
        customer: v.lines[0].ledger,
        voucherType: "Sales",
        route: "AR",
        ai: {
          confidence: null,
          rationale: v.hits.map((h) => `${h.rule}: ${h.text}`).join(" "),
        },
        amount,
        receivedAt: new Date().toISOString(),
        status: "needs-review",
        neo: { voucherDate: v.date },
        invoice: {
          voucherNo: no,
          invoiceNo: no,
          invoiceDate: day,
          dueDate: day,
          gstReg: "JP Nagar",
          costCentre: null,
          customer: v.lines[0].ledger,
          flagged: [],
          items: [
            {
              desc: v.narration,
              ledger: "Sales — Local (GST)",
              amount: taxable,
              hsn: "996331",
            },
          ],
          taxes: { cgst, sgst },
          subTotal: taxable,
          grandTotal: amount,
        },
      };
      const base = itemFromMock(doc, 900 + n);
      created.push(
        neoCreate(
          {
            ...base,
            company,
            reason: `Prepared by Neo in reconciliation ${run.id}. ${v.hits.map((h) => h.rule).join(" · ")}`,
            batch: {
              id: run.id,
              instruction: `Reconcile ${run.period}, ${run.outlet}`,
            },
          },
          run.id
        )
      );
    });

  // Bank-led vouchers → their Banking lines, typed and explained, not ready.
  const keys: string[] = [];
  const before = new Map<
    string,
    ReturnType<typeof getBankingState>["transactions"][number]
  >();
  ready
    .filter((v) => v.bankKey)
    .forEach((v) => {
      const txn = txnFor(company, v.bankKey!);
      if (!txn) return;
      before.set(txn.bankLineUuid, txn);
      keys.push(v.bankKey!);
      codeLine(company, run, v, txn.bankLineUuid);
    });

  patchRun(id, {
    stage: "created",
    createdItemIds: created.map((x) => x.id),
    createdBankKeys: keys,
  });
  learnFromRun(getRun(id)!);
  logActivity(
    {
      company,
      actor: { kind: "ai", name: "Neo · Reconciliation" },
      kind: "predicted",
      module: "Banking",
      action: `Reconciled ${run.period}, ${run.outlet}`,
      subject: `${created.length} sales drafts · ${keys.length} bank lines coded`,
      reason: `Run ${run.id}; nothing posted or marked ready`,
      undoable: true,
    },
    () => undoRecon(id, before)
  );
  return { sales: created.length, bank: keys.length, before };
};

const txnFor = (company: string, bankKey: string) => {
  const row = statementBetween("2026-09-01", "2026-10-15").find(
    (r) => r.key === bankKey
  ) as StatementRow | undefined;
  if (!row) return undefined;
  return getBankingState(company).transactions.find(
    (t) =>
      t.transactionDate === row.date &&
      t.description === row.narration &&
      Math.abs(Number(t.transactionAmountLc) - row.amount) < 0.005
  );
};

/** One bank line, coded from its voucher, its status first (plan, Phase 3). */
const codeLine = (
  company: string,
  run: ReconRun,
  v: ReconVoucher,
  uuid: string
) => {
  // The party first (what Banking's Ledger column shows), then charges.
  const counter = v.lines
    .filter((l) => l.ledger !== HDFC_LEDGER)
    .sort((a, b) => {
      const main = (l: VoucherLine) =>
        v.type === "Receipt" ? (l.cr ? 0 : 1) : l.dr ? 0 : 1;
      return main(a) - main(b) || (b.cr || b.dr || 0) - (a.cr || a.dr || 0);
    });
  const status = v.status === "suspense" ? "To suspense" : "Ready for review";
  bankingActions.updateTransaction(company, uuid, {
    paymentType:
      v.type === "Receipt"
        ? "receipt"
        : v.type === "Payment"
          ? "payment"
          : "contra",
    ledgersNameList: [...new Set(counter.map((l) => l.ledger))],
    ledgersUuidList: [...new Set(counter.map((l) => `led-${l.ledger}`))],
    categorisedBy: "ai",
    accoutingReady: false,
    matchedDocuments: counter
      .filter((l) => l.ref?.startsWith("Agst"))
      .map((l) => l.ref!.replace("Agst Ref ", "")),
    matchNote: `${status} · ${v.title} · ${run.id} · ${v.hits.map((h) => h.rule).join(" · ")}`,
    remarks: `Neo · Reconciliation ${run.id}: ${v.hits[0]?.text || ""}`,
    companyGstLabel: "Karnataka - 29AADCN5532H1ZD",
    companyGstUuid: "gst-ka-29-nandhini",
  });
};

export const undoRecon = (
  id: string,
  before?: Map<
    string,
    ReturnType<typeof getBankingState>["transactions"][number]
  >
) => {
  const run = getRun(id);
  if (!run) return { reversed: [] as string[], skipped: [] as string[] };
  const drafts = getState().items.filter((x) =>
    run.createdItemIds.includes(x.id)
  );
  const result = neoDiscard(drafts, run.id);
  before?.forEach((txn, uuid) => {
    const now = getBankingState(run.company).transactions.find(
      (t) => t.bankLineUuid === uuid
    );
    // A line someone has since marked ready or synced is theirs now.
    if (now && !now.accoutingReady && now.thirdPartySyncStatus === "not_synced")
      bankingActions.updateTransaction(run.company, uuid, txn);
  });
  patchRun(id, { stage: "undone" });
  return result;
};

/* ----------------------------------------------------------------- close */

/**
 * Phase 3: read the next statement for the close. Each receivable open at
 * period end is either paid in it (collected), expected after it (not due:
 * carried, MAT-06), or expected inside it and missing (overdue: chase).
 */
export const readCloseStatement = (id: string, fileName: string) => {
  const run = getRun(id);
  const f = reconFileNamed(fileName);
  if (!run || !f?.from || !f.to) return;
  const rows = statementBetween(f.from, f.to);
  const res = bankingActions.importStatement(
    run.company,
    NANDHINI_HDFC_ID,
    fileName,
    f.from,
    f.to,
    rows
  );
  const winEnd = f.to;
  const evidence: CloseEvidence[] = [];
  const credit = (date: string, re: RegExp, amount?: number) =>
    rows.find(
      (r) =>
        r.side === "C" &&
        r.date === date &&
        re.test(r.narration) &&
        (amount === undefined || Math.abs(r.amount - amount) < 0.005)
    );
  CHANNELS.forEach((ch) => {
    const cells = run.sales.filter(
      (s) => s.channel === ch.id && s.state === "open"
    );
    if (!cells.length) return;
    const groups: {
      payDate: string;
      days: SalesCell[];
      amount?: number;
      re: RegExp;
    }[] = [];
    cells.forEach((cell) => {
      let payDate = "";
      let amount: number | undefined;
      let re = /./;
      if (ch.id === "card" || ch.id === "upi") {
        const s = (ch.id === "card" ? CARD_SETTLEMENTS : UPI_SETTLEMENTS).find(
          (x) => x.saleDate === cell.date
        )!;
        payDate = s.payDate;
        amount = s.net;
        re = ch.id === "card" ? /MERCH STL/ : /UPI STL/;
      } else if (ch.id === "cash") {
        const d = CASH_DEPOSITS.find(
          (x) => cell.date >= x.from && cell.date <= x.to
        );
        payDate = d?.date || "";
        amount = d?.amount;
        re = /CASH DEP/;
      } else {
        const list =
          ch.id === "zomato"
            ? ZOMATO_PAYOUTS
            : ch.id === "swiggy"
              ? SWIGGY_PAYOUTS
              : OWNLY_PAYOUTS;
        const x = list.find((y) => cell.date >= y.from && cell.date <= y.to);
        payDate = x?.payDate || "";
        amount = x?.bank;
        re =
          ch.id === "zomato"
            ? /ETERNAL/
            : ch.id === "swiggy"
              ? /BUNDL/
              : /CTRLX/;
      }
      const g = groups.find((x) => x.payDate === payDate);
      if (g) g.days.push(cell);
      else groups.push({ payDate, days: [cell], amount, re });
    });
    groups.forEach((g) => {
      const from = g.days[0].date;
      const to = g.days[g.days.length - 1].date;
      const what = `${ch.label} ${from === to ? dayLabel(from) : `${dayLabel(from)}–${dayLabel(to)}`}`;
      const amount = r2(g.days.reduce((t, d) => t + d.amount, 0));
      const c =
        g.payDate && g.payDate <= winEnd
          ? credit(g.payDate, g.re, g.amount)
          : undefined;
      evidence.push({
        what,
        amount,
        state: c ? "collected" : g.payDate > winEnd ? "not-due" : "overdue",
        credit: c
          ? { date: c.date, amount: c.amount, narration: c.narration }
          : undefined,
        expected: g.payDate,
      });
    });
  });
  patchRun(id, { closeFile: fileName, evidence });
  return { ...res, evidence };
};

/** Resolve or carry one suspense line; the voucher and its bank line follow. */
export const resolveSuspense = (
  id: string,
  lineId: string,
  outcome: { ledger: string } | "carry"
) => {
  const run = getRun(id);
  const line = run?.suspense.find((s) => s.id === lineId);
  if (!run || !line) return;
  if (outcome === "carry") {
    patchRun(id, {
      suspense: run.suspense.map((s) =>
        s.id === lineId ? { ...s, state: "carried" } : s
      ),
    });
    return;
  }
  const vouchers = run.vouchers.map((v) =>
    v.id === line.voucherId
      ? {
          ...v,
          status: "ready" as const,
          lines: v.lines.map((l) =>
            l.ledger === "Suspense A/c" ? { ...l, ledger: outcome.ledger } : l
          ),
          hits: [
            ...v.hits,
            hit(
              "SUS-04",
              "default",
              `Resolved from suspense to ${outcome.ledger} at the close.`
            ),
          ],
        }
      : v
  );
  patchRun(id, {
    vouchers,
    suspense: run.suspense.map((s) =>
      s.id === lineId ? { ...s, state: "resolved", ledger: outcome.ledger } : s
    ),
    bank: run.bank.map((b) =>
      b.key === line.bankKey
        ? {
            ...b,
            ledger: b.side === "D" ? outcome.ledger : b.ledger,
            source: "answer",
            note: "Resolved at the close",
          }
        : b
    ),
  });
  const v = vouchers.find((x) => x.id === line.voucherId)!;
  const uuid = txnFor(run.company, line.bankKey)?.bankLineUuid;
  if (uuid && run.createdBankKeys.includes(line.bankKey))
    codeLine(run.company, getRun(id)!, v, uuid);
};

/** What closing needs (the brief: coverage, open receivables, suspense). */
export const closeReadiness = (run: ReconRun) => {
  const cov = coverage(run);
  const evidence = run.evidence || [];
  const overdue = evidence.filter((e) => e.state === "overdue");
  const openSuspense = run.suspense.filter((s) => s.state === "open");
  return {
    coverage: cov,
    evidence,
    collected: evidence.filter((e) => e.state === "collected"),
    notDue: evidence.filter((e) => e.state === "not-due"),
    overdue,
    openSuspense,
    carried: run.suspense.filter((s) => s.state === "carried"),
    resolved: run.suspense.filter((s) => s.state === "resolved"),
    ready:
      run.stage === "created" &&
      cov.accounted === cov.total &&
      !!run.evidence &&
      !overdue.length &&
      !openSuspense.length,
  };
};

export const closeRun = (id: string) => {
  const run = getRun(id);
  if (!run || !closeReadiness(run).ready) return;
  const carried = run.suspense
    .filter((s) => s.state === "carried")
    .reduce((t, s) => t + s.amount, 0);
  patchRun(id, {
    closed: { at: new Date().toISOString(), by: actor, carried },
  });
  logActivity({
    company: run.company,
    actor: { kind: "person", name: actor },
    kind: "rule",
    module: "Banking",
    action: `Closed reconciliation for ${run.period}, ${run.outlet}`,
    subject: `${run.bank.length} bank rows accounted · ₹${inr(carried)} carried in suspense`,
    reason: `Run ${run.id}; open receivables evidenced in ${run.closeFile}`,
  });
};

/* --------------------------------------------------------------- counts */

/** Counts for the register's head and the sign-off. */
export const registerCounts = (run: ReconRun) => {
  const by = (t: ReconVoucher["type"]) =>
    run.vouchers.filter((v) => v.type === t && v.status !== "needs-input")
      .length;
  return {
    sales: by("Sales"),
    receipts: by("Receipt"),
    payments: by("Payment"),
    contras: by("Contra"),
    suspense: run.vouchers.filter((v) => v.status === "suspense").length,
    waiting: run.vouchers.filter((v) => v.status === "needs-input").length,
    total: run.vouchers.filter((v) => v.status !== "needs-input").length,
  };
};

/** Bank coverage (the brief's success metric): rows accounted / all rows. */
export const coverage = (run: ReconRun) => ({
  accounted: run.bank.length,
  total: statementBetween(run.from, run.to).length,
});

/* --------------------------------------------------------------- summary */

export type ReconSummaryRow = {
  channel: ReconChannel;
  label: string;
  /** POS sales for the days the period's payouts cover. */
  pos: number;
  /** Gross sales the settlement reports say they paid out. */
  reportGross: number;
  /** Commission, ads, GST on fees, TDS, refunds: gross − net. */
  deductions: number;
  /** What the reports say reached the bank. */
  net: number;
  /** The bank credits those payouts were tied to. */
  bank: number;
  /** Payouts after the period's statement: net, not due yet. */
  notDue: number;
  /** POS − report gross, and report net − bank. Zero both ways reconciles. */
  posVsReport: number;
  reportVsBank: number;
  status: "reconciled" | "round-off" | "difference" | "no-report";
};

/**
 * Three-way reconciliation, per channel (20 Oct 2026): POS ↔ settlement
 * report ↔ bank. Every payout proved in the period is compared twice: the
 * POS sales of the days it covers against its gross, and its net against
 * the bank credit it was tied to. Payouts not yet due are shown apart.
 * Cash has no report: its POS total stands alone (deposits are contras).
 */
export const reconSummary = (run: ReconRun): ReconSummaryRow[] =>
  CHANNELS.map((c) => {
    const pays = run.payouts.filter((p) => p.provider === c.id);
    const tied = pays.filter((p) => p.bank !== undefined);
    const due = pays.filter((p) => p.bank === undefined);
    const posOf = (p: PayoutRow) =>
      daysIn(p.from, p.to).reduce((s, d) => s + saleOn(d, c.id), 0);
    const sum = (xs: PayoutRow[], f: (p: PayoutRow) => number) =>
      r2(xs.reduce((s, p) => s + f(p), 0));
    if (!pays.length) {
      const pos = r2(
        run.sales
          .filter((x) => x.channel === c.id)
          .reduce((s, x) => s + x.amount, 0)
      );
      return {
        channel: c.id,
        label: c.label,
        pos,
        reportGross: 0,
        deductions: 0,
        net: 0,
        bank: 0,
        notDue: 0,
        posVsReport: 0,
        reportVsBank: 0,
        status: "no-report" as const,
      };
    }
    const pos = sum(tied, posOf);
    const reportGross = sum(tied, (p) => p.gross);
    const net = sum(tied, (p) => p.net);
    const bank = sum(tied, (p) => p.bank!);
    const posVsReport = r2(pos - reportGross);
    const reportVsBank = r2(net - bank);
    const off = Math.max(Math.abs(posVsReport), Math.abs(reportVsBank));
    return {
      channel: c.id,
      label: c.label,
      pos,
      reportGross,
      deductions: r2(reportGross - net),
      net,
      bank,
      notDue: sum(due, (p) => p.net),
      posVsReport,
      reportVsBank,
      status: off === 0 ? "reconciled" : off <= 1 ? "round-off" : "difference",
    };
  });
