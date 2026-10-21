import React, { useState } from "react";
import { ArrowRight, ChevronRight, Stamp } from "@/components/icons";
import { useStore } from "@/components/inbox/v2/store";
import { CHANNELS, dayLabel } from "@/config/pages/neo/mock-recon";
import {
  closeReadiness,
  coverage,
  inr,
  policyOf,
  registerCounts,
  rulesOf,
  useRecon,
} from "@/hooks/pages/neo/use-recon";
import type { NeoCard, NeoRef } from "@/types/pages/neo";
import type {
  BankLine,
  CloseEvidence,
  LearnedRule,
  PayoutRow,
  PolicyRowState,
  ReconDocStatus,
  ReconRun,
  ReconVoucher,
} from "@/types/pages/neo/recon";
import { cn } from "@/lib/utils";
import {
  DocBar,
  DocFootnotes,
  DocLede,
  DocPage,
  DocSection,
  Mark,
  NUM,
  Notes,
  ROW,
  TD,
  TH,
  type Tone,
} from "./doc";

type Props = {
  card: Extract<NeoCard, { kind: "recon" }>;
  onRef: (ref: NeoRef) => void;
};

/*
 * Three-way reconciliation, as documents (20 Oct 2026). Each view is one of
 * three shapes from ./doc: a Ledger (reports, payouts, sales, bank lines,
 * register, drafts), a Rulebook (policy, what Neo has learned) or a
 * Statement (the close). All read live from the recon store; nothing here
 * does arithmetic of its own beyond counting and summing what's shown.
 */

/** Whole rupees drop their paise in prose and totals; ₹0.01 differences keep them. */
const rupees = (n: number) => `₹${inr(n).replace(/\.00$/, "")}`;
const plural = (n: number, one: string, many = `${one}s`) =>
  `${n} ${n === 1 ? one : many}`;
const span = (from: string, to: string) =>
  from === to ? dayLabel(from) : `${dayLabel(from)}–${dayLabel(to)}`;
const month = (run: ReconRun) => run.period.replace(" 2026", "");

/** A row that opens to show its working underneath. */
const Expander = ({
  open,
  onToggle,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    aria-expanded={open}
    onClick={(e) => {
      e.stopPropagation();
      onToggle();
    }}
    className="-ml-5 flex items-center gap-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
  >
    <ChevronRight
      className={cn(
        "h-4 w-4 flex-none text-pi-faint transition-transform",
        open && "rotate-90"
      )}
    />
    {children}
  </button>
);

/** The working under an opened row: a quiet inset, never a second card. */
const Working = ({ children }: { children: React.ReactNode }) => (
  <div className="mb-3 rounded-md bg-pi-fill px-4 py-3">{children}</div>
);

/* ============================================================ RULEBOOKS */

/**
 * A term and what it means, in two columns; the term is written once for
 * a run of rows that share it.
 */
const Term = ({
  term,
  first,
  children,
}: {
  term: React.ReactNode;
  first: boolean;
  children: React.ReactNode;
}) => (
  <div
    className={cn(
      "grid grid-cols-[minmax(0,200px)_minmax(0,1fr)] gap-x-6 py-3 max-sm:grid-cols-1",
      first ? "border-t border-pi-line first:border-t-0" : "pt-0"
    )}
  >
    <dt className="text-[13px] font-semibold leading-5 text-pi-ink">
      {first ? term : ""}
    </dt>
    <dd className="min-w-0">{children}</dd>
  </div>
);

/* --------------------------------------------------------------- policy */

const POLICY_MARK: Partial<
  Record<PolicyRowState, { tone: Tone; label: string }>
> = {
  asked: { tone: "muted", label: "Your answer" },
  assumed: { tone: "muted", label: "Assumed, no history" },
  "not-copied": { tone: "warn", label: "Changed from your books" },
};

const PolicyView = ({ company }: { company: string }) => {
  useRecon();
  const p = policyOf(company);
  if (!p) return null;
  const n = (s: PolicyRowState) => p.rows.filter((r) => r.state === s).length;
  const yours = n("asked") + n("not-copied");
  return (
    <DocPage>
      <DocLede
        context={`Version ${p.version} · ${p.status === "approved" ? "approved" : "draft"} · effective ${dayLabel(p.effectiveFrom)} 2026 · read from Jun–Aug vouchers`}
      >
        How Nandhini Deluxe books its sales and settlements.{" "}
        <strong>
          {n("prefilled")} of {p.rows.length} sections
        </strong>{" "}
        come straight from your books
        {n("assumed")
          ? `, ${n("assumed")} use the restaurant template until there's history`
          : ""}
        {yours
          ? `, and ${yours} ${yours === 1 ? "was" : "were"} your call`
          : ""}
        .
      </DocLede>
      <dl>
        {p.rows.map((r, i) => {
          const mark = POLICY_MARK[r.state];
          return (
            <Term
              key={r.id}
              term={r.family}
              first={i === 0 || p.rows[i - 1].family !== r.family}
            >
              <div className="flex items-start justify-between gap-4">
                <p className="text-[13px] leading-5 text-pi-ink">
                  {r.answer || r.value}
                </p>
                {mark && <Mark tone={mark.tone}>{mark.label}</Mark>}
              </div>
              {r.answer && r.state === "not-copied" && (
                <p className="text-body-4 text-pi-faint">
                  Was: <span className="line-through">{r.value}</span>
                </p>
              )}
              <p className="mt-0.5 text-body-4 text-pi-body">{r.evidence}</p>
            </Term>
          );
        })}
      </dl>
    </DocPage>
  );
};

/* ---------------------------------------------------------------- rules */

const KIND: { kind: LearnedRule["kind"]; title: string }[] = [
  { kind: "format", title: "Report formats" },
  { kind: "payer", title: "Payers" },
  { kind: "narration", title: "Bank narrations" },
];

const RULE_MARK = (r: LearnedRule): { tone: Tone; label: string } | null =>
  r.state === "active"
    ? null
    : r.state === "shadow"
      ? {
          tone: "wait",
          label: `Trying out · ${r.confirmations} of ${r.needed}`,
        }
      : r.state === "proposed"
        ? { tone: "warn", label: "Needs your approval" }
        : r.state === "review"
          ? { tone: "warn", label: "Back for review" }
          : { tone: "muted", label: "Retired" };

/**
 * What the client has taught Neo (Phase 4). The proof is how many
 * questions each run still asks.
 */
const RulesView = ({ company }: { company: string }) => {
  const { runs } = useRecon();
  const rules = rulesOf(company);
  const asked = runs
    .filter((r) => r.company === company && r.stage === "created")
    .map(
      (r) => `${month(r)} run asked ${plural(r.questions.length, "question")}`
    );
  const live = rules.filter((r) => r.state === "active").length;
  const pending = rules.length - live;
  return (
    <DocPage>
      <DocLede context={asked.join(" · ") || undefined}>
        {rules.length ? (
          <>
            <strong>{plural(rules.length, "rule")}</strong> for Nandhini Deluxe.{" "}
            {live === rules.length
              ? "Neo applies all of them without asking."
              : `Neo applies ${live} without asking; ${pending} ${pending === 1 ? "is" : "are"} still earning it.`}
          </>
        ) : (
          "Nothing learned yet. Rules come from answers you sign off."
        )}
      </DocLede>
      {KIND.map((k) => {
        const rows = rules.filter((r) => r.kind === k.kind);
        if (!rows.length) return null;
        return (
          <DocSection key={k.kind} title={k.title} aside={rows.length}>
            <dl>
              {rows.map((r) => {
                const mark = RULE_MARK(r);
                return (
                  <Term key={r.id} term={r.match} first>
                    <div className="flex items-start justify-between gap-4">
                      <p className="text-[13px] leading-5 text-pi-ink">
                        {r.does}
                      </p>
                      {mark && <Mark tone={mark.tone}>{mark.label}</Mark>}
                    </div>
                    <p
                      className="mt-0.5 text-body-4 text-pi-body"
                      title={r.id}
                    >
                      From {r.source}
                      {r.usedIn.length
                        ? ` · used in ${r.usedIn.join(", ")} without asking`
                        : ""}
                    </p>
                  </Term>
                );
              })}
            </dl>
          </DocSection>
        );
      })}
      <DocFootnotes
        title="How Neo learns"
        items={[
          {
            rule: "LRN-03",
            severity: "hard",
            text: 'An answer covers that one item, unless you say "always" or "from now on".',
          },
          {
            rule: "LRN-02",
            severity: "default",
            text: '"From now on" is tried out until it matches your call three times. A rule that touches GST, TDS or TCS ledgers needs your approval instead.',
          },
          {
            rule: "LRN-06",
            severity: "default",
            text: "A rule unused for six months, or contradicted twice in a row, comes back to you for review.",
          },
        ]}
      />
    </DocPage>
  );
};

/* ============================================================== LEDGERS */

/* -------------------------------------------------------------- reports */

const SET_ASIDE: Record<Exclude<ReconDocStatus, "read">, string> = {
  rejected: "Not a report",
  blocked: "Blocked",
  duplicate: "Already in Banking",
};

const ReportRow = ({ d }: { d: ReconRun["docs"][number] }) => (
  <li className={cn(ROW, "py-3")}>
    <div className="flex items-start justify-between gap-4">
      <p className="min-w-0 truncate text-[13px] font-medium leading-5">
        {d.file}
      </p>
      {d.status !== "read" && (
        <Mark tone={d.status === "duplicate" ? "muted" : "bad"}>
          {SET_ASIDE[d.status]}
        </Mark>
      )}
    </div>
    <p className="text-body-4 text-pi-body">
      {[d.purpose, d.provider, d.outlet, d.period, d.detail]
        .filter((x) => x && x !== "—")
        .join(" · ")}
      {d.rows ? ` · ${d.rows} rows` : ""}
    </p>
    <Notes hits={d.hits} className="mt-1" />
  </li>
);

const ReportsView = ({ run }: { run: ReconRun }) => {
  const read = run.docs.filter((d) => d.status === "read");
  const aside = run.docs.filter((d) => d.status !== "read");
  return (
    <DocPage>
      <DocLede context={`${run.outlet} · ${run.period}`}>
        <strong>
          {read.length} of {plural(run.docs.length, "file")}
        </strong>{" "}
        read as reports.
        {aside.length
          ? ` ${aside.length} set aside: ${[...new Set(aside.map((d) => SET_ASIDE[d.status as keyof typeof SET_ASIDE].toLowerCase()))].join(", ")}.`
          : " Nothing set aside."}
      </DocLede>
      {aside.length > 0 && (
        <DocSection title="Set aside" aside={aside.length}>
          <ul>
            {aside.map((d) => (
              <ReportRow key={d.file} d={d} />
            ))}
          </ul>
        </DocSection>
      )}
      <DocSection title="Read" aside={read.length}>
        <ul>
          {read.map((d) => (
            <ReportRow key={d.file} d={d} />
          ))}
        </ul>
      </DocSection>
    </DocPage>
  );
};

/* -------------------------------------------------------------- payouts */

const PROVIDERS: {
  id: PayoutRow["provider"];
  label: string;
  note: string;
  open?: boolean;
}[] = [
  { id: "zomato", label: "Zomato", note: "weekly", open: true },
  { id: "swiggy", label: "Swiggy", note: "weekly", open: true },
  { id: "ownly", label: "Ownly", note: "weekly", open: true },
  { id: "card", label: "Card", note: "HDFC TID 96201256 · T+1" },
  { id: "upi", label: "UPI", note: "HDFC · T+1" },
];
const providerLabel = (id: PayoutRow["provider"]) =>
  PROVIDERS.find((x) => x.id === id)?.label || id;

const flagged = (p: PayoutRow) => p.hits.some((h) => h.severity === "soft");
const needsLook = (p: PayoutRow) =>
  p.status === "suspense" || p.status === "unknown-payer" || flagged(p);

/** Only what differs from "proved to the paisa" gets a word. */
const payoutMark = (p: PayoutRow): { tone: Tone; label: string } | null =>
  p.status === "suspense"
    ? {
        tone: "bad",
        label: `Suspense · ${rupees(Math.abs(p.net - (p.bank ?? p.net)))}`,
      }
    : p.status === "unknown-payer"
      ? { tone: "warn", label: "Payer unknown" }
      : flagged(p)
        ? { tone: "warn", label: "Check" }
        : p.status === "round-off"
          ? { tone: "muted", label: "Round-off" }
          : null;

/** Gross → each deduction → net → bank, to the paisa. */
const Waterfall = ({ p }: { p: PayoutRow }) => (
  <Working>
    <table className="w-full text-[12.5px] leading-6">
      <tbody>
        <tr>
          <td>Gross sales {span(p.from, p.to)}</td>
          <td className={NUM}>{inr(p.gross)}</td>
        </tr>
        {p.deductions.map((d) => (
          <tr key={d.label} className="text-pi-body">
            <td>{d.label}</td>
            <td className={cn(NUM, d.amount > 0 && "text-pi-success")}>
              {d.amount < 0 ? "−" : "+"}
              {inr(Math.abs(d.amount))}
            </td>
          </tr>
        ))}
        <tr className="border-t border-pi-line-2 font-semibold">
          <td>Net payout</td>
          <td className={NUM}>{inr(p.net)}</td>
        </tr>
        {p.bank !== undefined && (
          <tr className="text-pi-body">
            <td>
              Bank credit {dayLabel(p.payDate)} · {p.key}
            </td>
            <td className={NUM}>{inr(p.bank)}</td>
          </tr>
        )}
      </tbody>
    </table>
    <Notes hits={p.hits} className="mt-2 border-t border-pi-line-2 pt-2" />
  </Working>
);

const PayoutTable = ({
  rows,
  openRow,
  setOpenRow,
  withProvider,
}: {
  rows: PayoutRow[];
  openRow: string | null;
  setOpenRow: (id: string | null) => void;
  withProvider?: boolean;
}) => (
  <table className="w-full">
    <thead>
      <tr className="border-b border-pi-line">
        <th className={cn(TH, "pl-5")}>Covers</th>
        <th className={cn(TH, "text-right")}>Net</th>
        <th className={cn(TH, "text-right")}>In the bank</th>
        <th className={cn(TH, "w-[150px]")}>
          <span className="sr-only">Status</span>
        </th>
      </tr>
    </thead>
    <tbody>
      {rows.map((p) => {
        const open = openRow === p.id;
        const mark = payoutMark(p);
        return (
          <React.Fragment key={p.id}>
            <tr
              onClick={() => setOpenRow(open ? null : p.id)}
              className={cn(
                "cursor-pointer hover:bg-pi-row-hover",
                !open && "border-b border-pi-line"
              )}
            >
              <td className={cn(TD, "pl-5")}>
                <Expander
                  open={open}
                  onToggle={() => setOpenRow(open ? null : p.id)}
                >
                  {withProvider ? `${providerLabel(p.provider)} · ` : ""}
                  {span(p.from, p.to)}
                </Expander>
                {withProvider && !open && (
                  <span className="block text-body-4 text-pi-body">
                    {
                      (
                        p.hits.find((h) => h.severity === "soft") ||
                        p.hits.find((h) => h.severity === "hard") ||
                        p.hits[0]
                      )?.text
                    }
                  </span>
                )}
              </td>
              <td className={cn(TD, NUM)}>{inr(p.net)}</td>
              <td
                className={cn(TD, NUM, p.bank === undefined && "text-pi-body")}
              >
                {p.bank === undefined
                  ? `due ${dayLabel(p.payDate)}`
                  : inr(p.bank)}
              </td>
              <td className={TD}>
                {mark && <Mark tone={mark.tone}>{mark.label}</Mark>}
              </td>
            </tr>
            {open && (
              <tr className="border-b border-pi-line">
                <td colSpan={4}>
                  <Waterfall p={p} />
                </td>
              </tr>
            )}
          </React.Fragment>
        );
      })}
    </tbody>
  </table>
);

const PayoutsView = ({ run }: { run: ReconRun }) => {
  const [openRow, setOpenRow] = useState<string | null>(null);
  const all = run.payouts;
  const look = all.filter(needsLook);
  const due = all.filter((p) => p.status === "open");
  const proved = all.filter(
    (p) => (p.status === "matched" || p.status === "round-off") && !flagged(p)
  );
  const unknown = all.filter(
    (p) => p.status === "unknown-payer" && !flagged(p)
  );
  return (
    <DocPage>
      <DocLede context={`${run.outlet} · ${run.period} · HDFC ·0418`}>
        <strong>
          {proved.length} of {plural(all.length, "payout")}
        </strong>{" "}
        reached the bank to the paisa.{" "}
        {look.length
          ? `${plural(look.length, "needs", "need")} a look`
          : "Nothing needs a look"}
        {due.length
          ? `, and ${due.length} aren't due until after ${dayLabel(run.to)}.`
          : "."}
      </DocLede>
      <DocBar
        parts={[
          { tone: "ok", label: "Proved", value: proved.length },
          {
            tone: "warn",
            label: "To check",
            value: look.filter((p) => p.status !== "suspense").length,
          },
          {
            tone: "bad",
            label: "Suspense",
            value: all.filter((p) => p.status === "suspense").length,
          },
          { tone: "wait", label: "Not due yet", value: due.length },
          { tone: "warn", label: "Payer unknown", value: unknown.length },
        ]}
      />
      {look.length > 0 && (
        <DocSection title="Needs a look" aside={look.length} tone="warn">
          <PayoutTable
            rows={look}
            openRow={openRow}
            setOpenRow={setOpenRow}
            withProvider
          />
        </DocSection>
      )}
      {PROVIDERS.map((g) => {
        const rows = all.filter((p) => p.provider === g.id);
        if (!rows.length) return null;
        return (
          <DocSection
            key={g.id}
            title={
              <>
                {g.label}
                <span className="ml-2 text-body-4 font-normal text-pi-body">
                  {g.note}
                </span>
              </>
            }
            aside={`${plural(rows.length, "payout")} · ${rupees(rows.reduce((s, p) => s + p.net, 0))}`}
            defaultOpen={!!g.open}
          >
            <PayoutTable
              rows={rows}
              openRow={openRow}
              setOpenRow={setOpenRow}
            />
          </DocSection>
        );
      })}
    </DocPage>
  );
};

/* ---------------------------------------------------------------- sales */

/**
 * Days down, channels across, a total each way. Paid cells read as plain
 * figures; what isn't due yet sits on a tint, so the open tail of the month
 * shows as a shape rather than 180 dots.
 */
const SalesView = ({ run }: { run: ReconRun }) => {
  const days = [...new Set(run.sales.map((c) => c.date))];
  const cell = (d: string, ch: string) =>
    run.sales.find((x) => x.date === d && x.channel === ch)!;
  const sum = (f: (c: ReconRun["sales"][number]) => boolean) =>
    run.sales.filter(f).reduce((s, c) => s + c.amount, 0);
  const whole = (n: number) => inr(n).replace(/\.00$/, "");
  const paid = sum((c) => c.state === "settled");
  const open = sum((c) => c.state === "open");
  const booked = sum((c) => c.state === "booked");
  return (
    <DocPage>
      <DocLede
        context={`${run.outlet} · ${days.length} days × ${CHANNELS.length} channels`}
      >
        <strong>{rupees(paid)}</strong> of {month(run)}&apos;s{" "}
        {rupees(paid + open + booked)} in sales is tied to the payout that paid
        it. {rupees(open)}, the month&apos;s last days, isn&apos;t due until
        October.
      </DocLede>
      <DocBar
        parts={[
          { tone: "ok", label: "Paid", value: paid, figure: rupees(paid) },
          {
            tone: "wait",
            label: "Not due yet",
            value: open,
            figure: rupees(open),
          },
          {
            tone: "muted",
            label: "Already in your books",
            value: booked,
            figure: rupees(booked),
          },
        ]}
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-[12.5px]">
          <thead>
            <tr className="border-b border-pi-ink">
              <th className={TH}>Day</th>
              {CHANNELS.map((c) => (
                <th key={c.id} className={cn(TH, "px-2 text-right")}>
                  {c.label}
                </th>
              ))}
              <th className={cn(TH, "pl-2 text-right text-pi-ink")}>Total</th>
            </tr>
          </thead>
          <tbody>
            {days.map((d) => (
              <tr key={d} className="border-b border-pi-line">
                <td className="whitespace-nowrap py-1.5 pr-2 text-pi-body">
                  {dayLabel(d)}
                </td>
                {CHANNELS.map((c) => {
                  const x = cell(d, c.id);
                  return (
                    <td
                      key={c.id}
                      title={
                        x.state === "settled"
                          ? `Paid${x.payout ? ` · ${x.payout}` : ""}`
                          : x.state === "open"
                            ? "Not due yet"
                            : "Already in your books"
                      }
                      className={cn(
                        "px-2 py-1.5",
                        NUM,
                        x.state === "open" && "bg-pi-fill text-pi-body",
                        x.state === "booked" && "text-pi-faint"
                      )}
                    >
                      {whole(x.amount)}
                    </td>
                  );
                })}
                <td className={cn("py-1.5 pl-2 font-medium", NUM)}>
                  {whole(
                    run.sales
                      .filter((x) => x.date === d)
                      .reduce((s, x) => s + x.amount, 0)
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-pi-ink font-semibold">
              <td className="py-2 pr-2">Total</td>
              {CHANNELS.map((c) => (
                <td key={c.id} className={cn("px-2 py-2", NUM)}>
                  {whole(sum((x) => x.channel === c.id))}
                </td>
              ))}
              <td className={cn("py-2 pl-2", NUM)}>
                {whole(paid + open + booked)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <DocFootnotes
        items={[
          {
            rule: "MAT-04",
            severity: "hard",
            text: "Each day's channel total is tied to the payout that paid it; a day's total never stands in for a bill.",
          },
          {
            rule: "MAT-06",
            severity: "default",
            text: `Sales paid after ${dayLabel(run.to)} are open receivables, not shortfalls.`,
          },
        ]}
      />
    </DocPage>
  );
};

/* ----------------------------------------------------------------- bank */

const BANK_GROUPS: {
  source: BankLine["source"];
  title: string;
  tone?: Tone;
}[] = [
  { source: "suspense", title: "In suspense", tone: "bad" },
  { source: "answer", title: "From your answers" },
  { source: "learned", title: "From your rules" },
  { source: "history", title: "From your history" },
];

const BankRows = ({ rows }: { rows: BankLine[] }) => {
  const [all, setAll] = useState(rows.length <= 12);
  return (
    <>
      <table className="w-full">
        <tbody>
          {(all ? rows : rows.slice(0, 10)).map((b) => (
            <tr key={b.key} className={ROW}>
              <td className={cn(TD, "w-[64px] whitespace-nowrap text-pi-body")}>
                {dayLabel(b.date)}
              </td>
              <td className={TD}>
                <span className="block">
                  {b.ledger}
                  <span className="ml-2 text-body-4 text-pi-body">
                    {b.voucher}
                  </span>
                </span>
                <span className="block truncate text-body-4 text-pi-body">
                  {b.narration}
                </span>
              </td>
              <td className={cn(TD, NUM)}>
                {b.side === "D" ? "−" : "+"}
                {inr(b.amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!all && (
        <button
          type="button"
          onClick={() => setAll(true)}
          className="mt-2 text-body-4 font-medium text-pi-brand hover:underline"
        >
          Show all {rows.length}
        </button>
      )}
    </>
  );
};

const BankView = ({ run }: { run: ReconRun }) => {
  const cov = coverage(run);
  const payouts = run.bank.filter((b) => b.source === "payout").length;
  const others = run.bank.filter((b) => b.source !== "payout");
  const susp = others.filter((b) => b.source === "suspense").length;
  return (
    <DocPage>
      <DocLede context={`HDFC ·0418 · ${span(run.from, run.to)}`}>
        <strong>
          {cov.accounted} of {cov.total} bank rows
        </strong>{" "}
        are accounted for. {payouts} are payouts, proved on the payouts page;
        the other {others.length} are coded below
        {susp ? `, ${susp} of them to suspense` : ""}.
      </DocLede>
      {BANK_GROUPS.map((g) => {
        const rows = others.filter((b) => b.source === g.source);
        if (!rows.length) return null;
        return (
          <DocSection
            key={g.source}
            title={g.title}
            aside={rows.length}
            tone={g.tone}
          >
            <BankRows rows={rows} />
          </DocSection>
        );
      })}
    </DocPage>
  );
};

/* ------------------------------------------------------------- register */

const V_MARK: Partial<
  Record<ReconVoucher["status"], { tone: Tone; label: string }>
> = {
  suspense: { tone: "bad", label: "To suspense" },
  "needs-input": { tone: "warn", label: "Needs your answer" },
};

const VoucherRow = ({ v }: { v: ReconVoucher }) => {
  const [open, setOpen] = useState(false);
  const amount = v.lines.reduce((s, l) => s + (l.dr || 0), 0);
  const mark = V_MARK[v.status];
  return (
    <li className={open ? "" : "border-b border-pi-line"}>
      <div
        onClick={() => setOpen((x) => !x)}
        className="flex cursor-pointer items-center gap-4 py-2.5 pl-5 hover:bg-pi-row-hover"
      >
        <span className="min-w-0 flex-1 text-[13px]">
          <Expander open={open} onToggle={() => setOpen((x) => !x)}>
            {v.title}
          </Expander>
        </span>
        {mark && <Mark tone={mark.tone}>{mark.label}</Mark>}
        <span className="w-[110px] text-right text-[13px] tabular-nums">
          {inr(amount)}
        </span>
      </div>
      {open && (
        <div className="border-b border-pi-line">
          <Working>
            <table className="w-full text-[12.5px] leading-6">
              <thead>
                <tr className="text-body-4 text-pi-body">
                  <th className="text-left font-medium">Ledger</th>
                  <th className="text-right font-medium">Dr</th>
                  <th className="text-right font-medium">Cr</th>
                </tr>
              </thead>
              <tbody>
                {v.lines.map((l, i) => (
                  <tr key={i}>
                    <td>
                      {l.ledger}
                      {l.ref && (
                        <span className="ml-2 text-body-4 text-pi-body">
                          {l.ref}
                        </span>
                      )}
                    </td>
                    <td className={NUM}>{l.dr ? inr(l.dr) : ""}</td>
                    <td className={NUM}>{l.cr ? inr(l.cr) : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-1 text-body-4 italic text-pi-body">
              {v.narration}
            </p>
            <Notes
              hits={v.hits}
              className="mt-2 border-t border-pi-line-2 pt-2"
            />
          </Working>
        </div>
      )}
    </li>
  );
};

const GROUPS: { type: ReconVoucher["type"]; label: string; open?: boolean }[] =
  [
    { type: "Receipt", label: "Receipts", open: true },
    { type: "Payment", label: "Payments", open: true },
    { type: "Contra", label: "Contras" },
    { type: "Sales", label: "Sales" },
  ];

const worthALook = (v: ReconVoucher) =>
  v.status !== "ready" ||
  v.hits.some(
    (h) =>
      h.severity === "soft" ||
      ["ALC-04", "AMT-03", "IDN-04", "DUP-06"].includes(h.rule)
  );

const RegisterView = ({ run }: { run: ReconRun }) => {
  const [onlyFlags, setOnlyFlags] = useState(true);
  const c = registerCounts(run);
  return (
    <DocPage>
      <DocLede context={`${run.outlet} · ${run.period}`}>
        <strong>{c.total} vouchers</strong> drafted: {c.sales} sales,{" "}
        {c.receipts} receipts, {c.payments} payments and {c.contras} contras.{" "}
        {c.suspense
          ? `${c.suspense} go to suspense`
          : "Nothing goes to suspense"}
        {c.waiting ? `, and ${c.waiting} wait for your answer.` : "."}
      </DocLede>
      <label className="mb-2 flex cursor-pointer items-center justify-end gap-2 text-body-4 text-pi-body">
        <input
          type="checkbox"
          checked={onlyFlags}
          onChange={() => setOnlyFlags((v) => !v)}
          className="h-3.5 w-3.5 accent-[hsl(var(--primary))]"
        />
        Only what needs a look
      </label>
      {GROUPS.map((g) => {
        const all = run.vouchers.filter((v) => v.type === g.type);
        if (!all.length) return null;
        const rows = onlyFlags ? all.filter(worthALook) : all;
        const total = all.reduce(
          (s, v) => s + v.lines.reduce((t, l) => t + (l.dr || 0), 0),
          0
        );
        return (
          <DocSection
            key={g.type}
            className="mt-8"
            title={`${g.label} · ${all.length}`}
            aside={rupees(total)}
            defaultOpen={!!g.open}
          >
            <ul>
              {rows.map((v) => (
                <VoucherRow key={v.id} v={v} />
              ))}
            </ul>
            {onlyFlags && rows.length < all.length && (
              <p className="py-2.5 pl-5 text-body-4 text-pi-body">
                {rows.length
                  ? `${all.length - rows.length} more, nothing to look at`
                  : `All ${all.length} are routine`}
              </p>
            )}
          </DocSection>
        );
      })}
      {run.skipped.length > 0 && (
        <DocSection title="Not drafted" aside={run.skipped.length}>
          <ul>
            {run.skipped.map((s) => (
              <li key={s.what} className={cn(ROW, "py-2.5")}>
                <div className="flex justify-between gap-4 text-[13px]">
                  <span>{s.what}</span>
                  {s.amount ? (
                    <span className="tabular-nums">{inr(s.amount)}</span>
                  ) : null}
                </div>
                <Notes hits={[s.hit]} />
              </li>
            ))}
          </ul>
        </DocSection>
      )}
    </DocPage>
  );
};

/* --------------------------------------------------------------- drafts */

const DraftsView = ({
  run,
  onRef,
}: {
  run: ReconRun;
  onRef: (r: NeoRef) => void;
}) => {
  const state = useStore();
  const items = run.createdItemIds
    .map((id) => state.items.find((x) => x.id === id))
    .filter((x): x is NonNullable<typeof x> => !!x);
  const approved = items.filter((x) => x.status === "Approved").length;
  const flagged95 = new Set(
    run.vouchers
      .filter(
        (v) => v.type === "Sales" && v.hits.some((h) => h.rule === "ENT-04")
      )
      .map((v) => `${v.id}-${run.id}`)
  );
  const [all, setAll] = useState(false);
  return (
    <DocPage>
      <DocLede context={`${run.outlet} · ${run.period} · run ${run.id}`}>
        <strong>{plural(items.length, "sales draft")}</strong> are in your
        inbox, {approved} approved so far. {run.createdBankKeys.length}{" "}
        receipts, payments and contras sit on their bank lines in Banking,
        explained but not marked ready.
      </DocLede>
      <button
        type="button"
        onClick={() => onRef({ label: "Banking", href: "/inbox?module=BANK" })}
        className="mb-2 inline-flex h-8 items-center gap-1.5 rounded-sm border border-pi-line-2 bg-background px-3 text-[13px] font-medium text-pi-ink shadow-contact hover:bg-pi-fill focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
      >
        Open the bank lines in Banking
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
      <DocSection
        title="Sales drafts"
        aside={`${approved} of ${items.length} approved`}
      >
        <ul>
          {(all ? items : items.slice(0, 10)).map((x) => (
            <li key={x.id} className={ROW}>
              <button
                type="button"
                onClick={() =>
                  onRef({
                    label: x.form.invoiceNo,
                    itemId: x.id,
                    target: "open",
                  })
                }
                className="flex w-full items-center gap-4 py-2.5 text-left hover:bg-pi-row-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px]">
                    {x.form.party}
                  </span>
                  <span className="block truncate text-body-4 text-pi-body">
                    {x.form.voucherNo}
                  </span>
                </span>
                {x.status === "Approved" ? (
                  <Mark tone="ok">Approved</Mark>
                ) : flagged95.has(x.id) ? (
                  <Mark tone="warn">GST paid by platform</Mark>
                ) : null}
                <span className="w-[110px] text-right text-[13px] tabular-nums">
                  {inr(x.amount)}
                </span>
              </button>
            </li>
          ))}
        </ul>
        {items.length > 10 && !all && (
          <button
            type="button"
            onClick={() => setAll(true)}
            className="mt-2 text-body-4 font-medium text-pi-brand hover:underline"
          >
            Show all {items.length}
          </button>
        )}
      </DocSection>
    </DocPage>
  );
};

/* =========================================================== STATEMENTS */

const EVIDENCE_MARK: Record<
  CloseEvidence["state"],
  { tone: Tone; label: string } | null
> = {
  collected: null,
  "not-due": { tone: "wait", label: "Not due yet" },
  overdue: { tone: "bad", label: "Overdue" },
};

/**
 * The close (Phase 3), as the record someone signs: the three questions —
 * is every bank row accounted, is what's open explained by the next
 * statement, is suspense resolved or deliberately carried — each with its
 * answer in the heading, and the signature at the foot.
 */
const CloseView = ({ run }: { run: ReconRun }) => {
  const state = useStore();
  const r = closeReadiness(run);
  const sum = (xs: { amount: number }[]) =>
    xs.reduce((t, x) => t + x.amount, 0);
  const approved = run.createdItemIds.filter(
    (id) => state.items.find((x) => x.id === id)?.status === "Approved"
  ).length;
  const covered = r.coverage.accounted === r.coverage.total;
  const evidence = run.evidence || [];
  const collected = evidence.filter((e) => e.state === "collected");
  const closing = sum(r.carried) + sum(r.openSuspense);
  const blockers = [
    !covered && "bank rows unaccounted",
    !run.evidence && "the next statement isn't read",
    r.overdue.length > 0 && `${r.overdue.length} overdue`,
    r.openSuspense.length > 0 &&
      `${plural(r.openSuspense.length, "suspense line")} to decide`,
  ].filter(Boolean) as string[];
  const notDue = evidence.filter((e) => e.state === "not-due");
  return (
    <DocPage>
      <DocLede
        context={`${run.outlet} · ${span(run.from, run.to)} · HDFC ·0418`}
      >
        {run.closed ? (
          <>
            <strong>{month(run)} is closed.</strong>{" "}
          </>
        ) : r.ready ? (
          <>
            <strong>{month(run)} is ready to close.</strong>{" "}
          </>
        ) : (
          <>
            <strong>{month(run)} can&apos;t close yet:</strong>{" "}
            {blockers.join(", ")}.{" "}
          </>
        )}
        {covered
          ? "Every bank row is accounted for"
          : `${r.coverage.accounted} of ${r.coverage.total} bank rows are accounted for`}
        {run.evidence
          ? `, ${collected.length} of ${evidence.length} receivables open on ${dayLabel(run.to)} have come in${notDue.length ? `, ${notDue.length} not due yet` : ""}`
          : ""}
        , and suspense closes at {rupees(closing)}.
      </DocLede>

      <DocSection
        title="Bank coverage"
        aside={`${r.coverage.accounted} of ${r.coverage.total} rows accounted`}
        tone={covered ? "ok" : "warn"}
      >
        <p className="py-2.5 text-[13px]">
          HDFC ·0418, {span(run.from, run.to)}
        </p>
      </DocSection>

      <DocSection
        title={`Open on ${dayLabel(run.to)}`}
        aside={
          run.evidence
            ? `${collected.length} of ${evidence.length} collected`
            : `${rupees(sum(run.open))} open`
        }
        tone={run.evidence ? (r.overdue.length ? "bad" : "ok") : undefined}
      >
        {run.closeFile && (
          <p className="pt-2.5 text-body-4 text-pi-body">
            Checked against {run.closeFile}
          </p>
        )}
        {run.evidence ? (
          <table className="w-full">
            <tbody>
              {evidence.map((e) => {
                const mark = EVIDENCE_MARK[e.state];
                return (
                  <tr key={e.what} className={ROW}>
                    <td className={TD}>
                      <span className="block">{e.what}</span>
                      <span className="block truncate text-body-4 text-pi-body">
                        {e.credit
                          ? `Came in ${dayLabel(e.credit.date)} · ${e.credit.narration}`
                          : `Expected ${dayLabel(e.expected)}`}
                      </span>
                    </td>
                    <td className={cn(TD, "w-[120px]")}>
                      {mark && <Mark tone={mark.tone}>{mark.label}</Mark>}
                    </td>
                    <td className={cn(TD, NUM)}>{inr(e.amount)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="py-2.5 text-[13px] text-pi-body">
            {plural(run.open.length, "receivable")}, {rupees(sum(run.open))}.
            The next statement shows whether they were paid.
          </p>
        )}
      </DocSection>

      <DocSection
        title="Suspense"
        aside={`Closing ${rupees(closing)}`}
        tone={closing === 0 && !r.openSuspense.length ? "ok" : "warn"}
      >
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-3 text-[13px] tabular-nums">
          <span className="text-pi-body">Opening</span> {rupees(0)}
          <span className="text-pi-faint">+</span>
          <span className="text-pi-body">new</span> {rupees(sum(run.suspense))}
          <span className="text-pi-faint">−</span>
          <span className="text-pi-body">resolved</span>{" "}
          {rupees(sum(r.resolved))}
          <span className="text-pi-faint">=</span>
          <span className="font-semibold">{rupees(closing)}</span>
        </div>
        {run.suspense.length ? (
          <table className="w-full border-t border-pi-line">
            <tbody>
              {run.suspense.map((l) => (
                <tr key={l.id} className={ROW}>
                  <td className={TD}>
                    <span className="block">{l.what}</span>
                    <span className="block text-body-4 text-pi-body">
                      {l.reason} · {l.owner}, since {dayLabel(l.since)}
                    </span>
                  </td>
                  <td className={cn(TD, "w-[180px]")}>
                    {l.state === "resolved" ? (
                      <span className="text-body-4 text-pi-body">
                        Moved to <span className="text-pi-ink">{l.ledger}</span>
                      </span>
                    ) : (
                      <Mark tone={l.state === "carried" ? "wait" : "warn"}>
                        {l.state === "carried"
                          ? "Carried forward"
                          : "To decide"}
                      </Mark>
                    )}
                  </td>
                  <td className={cn(TD, NUM)}>{inr(l.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="pb-2.5 text-[13px] text-pi-body">
            Nothing went to suspense.
          </p>
        )}
      </DocSection>

      <footer className="mt-12 flex items-start gap-3 border-t border-pi-ink pt-4">
        {run.closed && (
          <Stamp className="mt-0.5 h-4 w-4 flex-none text-pi-success" />
        )}
        <div className="text-body-4 leading-5 text-pi-body">
          {run.closed && (
            <p className="text-[13px] font-semibold text-pi-ink">
              Closed {dayLabel(run.closed.at.slice(0, 10))} by {run.closed.by}
            </p>
          )}
          <p>
            Not part of the close: {approved} of {run.createdItemIds.length}{" "}
            sales drafts approved; {run.createdBankKeys.length} bank lines wait
            in Banking.
          </p>
        </div>
      </footer>
    </DocPage>
  );
};

/* ----------------------------------------------------------------- card */

const ReconCard = ({ card, onRef }: Props) => {
  const { runs } = useRecon();
  if (card.view === "policy") return <PolicyView company={card.company} />;
  if (card.view === "rules") return <RulesView company={card.company} />;
  const run = runs.find((r) => r.id === card.runId);
  if (!run) return null;
  switch (card.view) {
    case "reports":
      return <ReportsView run={run} />;
    case "payouts":
      return <PayoutsView run={run} />;
    case "sales":
      return <SalesView run={run} />;
    case "bank":
      return <BankView run={run} />;
    case "register":
      return <RegisterView run={run} />;
    case "drafts":
      return <DraftsView run={run} onRef={onRef} />;
    case "close":
      return <CloseView run={run} />;
    default:
      return null;
  }
};

export default ReconCard;
