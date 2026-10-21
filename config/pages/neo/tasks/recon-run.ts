import { companyOf, getState } from "@/components/inbox/v2/store";
import {
  NANDHINI_ID,
  RECON_OCT_FILES,
  RECON_SAMPLE_FILES,
  dayLabel,
  reconFileNamed,
  statementBetween,
} from "@/config/pages/neo/mock-recon";
import {
  PERIODS,
  answerRun,
  coverage,
  createReconDrafts,
  getRun,
  inr,
  latestRun,
  policyOf,
  registerCounts,
  rulesOf,
  showRunRegister,
  startRun,
  undoRecon,
  reconSummary,
  type ReconSummaryRow,
} from "@/hooks/pages/neo/use-recon";
import type { ReconRun } from "@/types/pages/neo/recon";
import { decide } from "./shared";
import type { NeoTask } from "@/types/pages/neo";
import { has } from "@/utils/pages/neo";

/**
 * Three-way reconciliation, Flow 1 (20 Oct 2026): POS day-ends, card/UPI
 * and platform settlements and the bank statement, for one outlet and one
 * period. The brief's order: identify every file, check the books, ask only
 * what blocks something (each answer pauses only what it touches), prove
 * every payout to the bank (Leg B), tie sales days to payouts (Leg A),
 * classify the rest of the bank, then one register to sign off.
 *
 * September is the first run. "1–15 October" is the second, where what
 * September taught (formats, payers, shadow rules) shows as questions not
 * asked (Phase 4).
 *
 * Drafts only: sales to the Sales book's Needs Review, bank-led vouchers
 * onto their Banking lines. Approving and syncing stay on those screens.
 *
 * DEV: POST /api/recon/runs streams these steps; the engine is
 * hooks/pages/neo/use-recon.ts.
 */
/** Whole rupees when there are no paise; a dash for nothing. */
const amt = (n: number) => (n ? inr(n).replace(/\.00$/, "") : "—");

/**
 * The three-way summary as the chat says it: the verdict, then one row per
 * channel (POS sales ↔ settlement report ↔ bank) with both differences and
 * a status, totals, and what's not due yet. Cash has no report; its
 * deposits are contras in the register.
 */
const summaryText = (run: ReconRun) => {
  const rows = reconSummary(run);
  const withReport = rows.filter((r) => r.status !== "no-report");
  const off = withReport.filter((r) => r.status === "difference");
  // Short enough to sit on one line in the table; the verdict above says more.
  const status = (r: ReconSummaryRow) =>
    r.status === "reconciled"
      ? "✓ Reconciled"
      : r.status === "round-off"
        ? "✓ Within ₹1"
        : r.status === "no-report"
          ? "No report"
          : r.reportVsBank
            ? `✗ ₹${amt(Math.abs(r.reportVsBank))} ${r.reportVsBank > 0 ? "short" : "over"}`
            : `✗ POS ₹${amt(Math.abs(r.posVsReport))} off`;
  const verdict = (r: ReconSummaryRow) =>
    [
      r.posVsReport &&
        `POS and report differ by ₹${inr(Math.abs(r.posVsReport))}`,
      r.reportVsBank &&
        `₹${inr(Math.abs(r.reportVsBank))} ${r.reportVsBank > 0 ? "short in the bank" : "over in the bank"}`,
    ]
      .filter(Boolean)
      .join(", ");
  const sum = (f: (r: ReconSummaryRow) => number) =>
    withReport.reduce((s, r) => s + f(r), 0);
  const head = off.length
    ? `**${run.period.replace(" 2026", "")} reconciles three ways on ${withReport.length - off.length} of ${withReport.length} channels.** ${off.map((r) => `${r.label}: ${verdict(r)}`).join("; ")}; it's in suspense below.`
    : `**${run.period.replace(" 2026", "")} reconciles three ways on every channel with a report.** POS, settlement reports and bank agree${withReport.some((r) => r.status === "round-off") ? ", within ₹1 round-off" : ""}.`;
  // Six columns fit the chat: the three records, the bank's side, and the
  // verdict. Deductions (gross − net) are on the payouts document.
  const table = [
    "| Channel | POS sales | Report gross | Net payout | Bank credit | Status |",
    "|---|---:|---:|---:|---:|---|",
    ...rows.map(
      (r) =>
        `| ${r.label} | ${amt(r.pos)} | ${amt(r.reportGross)} | ${amt(r.net)} | ${amt(r.bank)} | ${status(r)} |`
    ),
    `| **With a report** | **${amt(sum((r) => r.pos))}** | **${amt(sum((r) => r.reportGross))}** | **${amt(sum((r) => r.net))}** | **${amt(sum((r) => r.bank))}** | **${off.length ? `${off.length} to look at` : "✓ Reconciled"}** |`,
  ].join("\n");
  const notDue = rows.reduce((t, r) => t + r.notDue, 0);
  return [
    head,
    table,
    notDue
      ? `Not due yet: ₹${(notDue / 1e5).toFixed(1)}L of payouts land after ${dayLabel(run.to)}. Cash has no report.`
      : "Cash has no report.",
  ].join("\n\n");
};

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * What needs a person after the run, as a short list: suspense with its
 * reason, payouts booked as charged that deserve a look, files set aside,
 * vouchers waiting on an answer. Nothing when nothing does.
 */
const needsYou = (run: ReconRun, flagged: number) => {
  const lines = [
    ...run.suspense
      .filter((l) => l.state === "open")
      .map(
        (l) =>
          `- **${l.what}**: ₹${amt(l.amount)} in suspense. ${l.reason.replace(/\.$/, "")}.`
      ),
    flagged
      ? `- **${flagged} payout${flagged === 1 ? "" : "s"}** booked as charged but worth a check: an unusual fee or a missing UTR. See Payouts › Needs a look.`
      : "",
    run.docs.filter((d) => d.status !== "read").length
      ? `- **${run.docs.filter((d) => d.status !== "read").length} files set aside**: ${run.docs
          .filter((d) => d.status !== "read")
          .map((d) =>
            d.status === "duplicate"
              ? "a statement already in Banking"
              : d.status === "blocked"
                ? `a ${d.outlet} report`
                : "not a report"
          )
          .join(", ")}. See Reports.`
      : "",
    run.vouchers.filter((v) => v.status === "needs-input").length
      ? `- **${run.vouchers.filter((v) => v.status === "needs-input").length} sales vouchers** wait for your answer on the POS GST.`
      : "",
  ].filter(Boolean);
  return lines.length ? ["**Needs you**", ...lines].join("\n") : "";
};

/** Each question's tab on the sheet. */
const RUN_HEADER: Record<string, string> = {
  "pos-inclusive": "POS GST",
  ctrlx: "CTRLX",
  llp: "LLP transfer",
  "swiggy-short": "Swiggy short",
  amazon: "Amazon Pay",
};

const reconRun: NeoTask = {
  id: "recon-run",
  title: "Reconcile sales, settlements and bank",
  match: (p, _ctx, attachments = []) =>
    has(p, /\b(set ?up|configure)\b/i)
      ? 0
      : has(p, /\b(recon|reconcil\w*|3-way|three-way)\b/i) ||
          attachments.some((a) => reconFileNamed(a.name))
        ? 30
        : 0,
  run: async (api) => {
    const company = api.context.company || getState().company;
    if (company !== NANDHINI_ID) {
      await api.say(
        `${companyOf(company)?.name} doesn't sell through POS or platforms, so there's nothing to reconcile three ways. Bank matching for its invoices is in Banking. In this prototype, three-way reconciliation runs for **Nandhini Deluxe**; switch to it in the top bar.`
      );
      return "Not a POS client";
    }
    const attached = api.attachments.map((a) => a.name);
    const periodId =
      has(api.prompt, /\boct(ober)?\b/i) ||
      attached.some((n) => RECON_OCT_FILES.some((f) => f.name === n))
        ? "oct"
        : "sep";
    const p = PERIODS[periodId];
    if (policyOf(company)?.status !== "approved") {
      await api.chain("Set up reconciliation for Nandhini Deluxe");
      if (policyOf(company)?.status !== "approved")
        return "Waiting for the policy";
    }

    // No reports attached: the sample is the only set that works here, so
    // Neo reads it rather than asking (20 Oct 2026, one sheet per run).
    const files = attached.length
      ? attached
      : (periodId === "oct" ? RECON_OCT_FILES : RECON_SAMPLE_FILES).map(
          (f) => f.name
        );
    const known = rulesOf(company).filter((r) => r.state === "active");
    const reading = await api.step(
      attached.length
        ? `Reading ${files.length} files`
        : `Reading the sample: Nandhini's ${p.short} reports`
    );
    await api.wait(800);
    const run = startRun(company, files, periodId);
    const set = run.docs.filter((d) => d.status !== "read");
    const remembered = run.docs.filter((d) =>
      d.hits.some((h) => h.rule === "DOC-06")
    );
    reading(
      remembered.length
        ? `Read ${run.docs.filter((d) => d.status === "read").length} reports · ${remembered.length} formats recognised, no re-mapping`
        : `Read ${run.docs.filter((d) => d.status === "read").length} reports${set.length ? ` · ${set.length} set aside` : ""}`
    );
    api.status(`Reconciling ${p.short}`, { done: 1, total: 5 });
    const books = await api.step(`Checking ${p.short} in your books`);
    await api.wait(600);
    books(
      `Checked your books · ${statementBetween(p.from, p.to).length} bank rows${periodId === "sep" ? " · 8 Sep card already booked" : ` · ${dayLabel(PERIODS.sep.to)} receivables from September`}`
    );
    await api.checkpoint();
    const qs = getRun(run.id)!.questions;
    const prior = periodId === "oct" ? latestRun(company, "sep") : undefined;
    // Every question and the drafting, on one sheet: Neo's picks are filled
    // in, what the books settle is folded, and one button answers them all
    // and creates the drafts. With nothing to ask, the register's own
    // sign-off is the one input.
    const sheet = qs.length
      ? await decide(
          api,
          prior
            ? `Before I draft ${p.short} · ${qs.length} against ${prior.questions.length} in September`
            : `Before I draft ${p.short}`,
          qs.map((q) => ({
            id: q.id,
            header: RUN_HEADER[q.id],
            question: q.text,
            // Your own words book it to suspense, with them as its note.
            ...(q.options.some((o) => o.id === "suspense")
              ? {
                  other: {
                    fallback: "suspense",
                    placeholder:
                      "What it is; it waits in suspense until you confirm",
                  },
                }
              : {}),
            why: q.detail,
            settled: q.settled,
            recommended: q.answer,
            options: q.options,
          })),
          [
            {
              id: "create",
              label: "Submit and create drafts",
              primary: true,
              risk: "draft",
            },
            { id: "cancel", label: "Not now" },
          ]
        )
      : undefined;
    if (sheet) {
      for (const q of qs) answerRun(run.id, q.id, sheet.picks[q.id]);
      const said = Object.entries(sheet.notes);
      if (sheet.choice === "create" && said.length)
        await api.say(
          `In suspense with your note${said.length === 1 ? "" : "s"}, until you confirm: ${said.map(([id, n]) => `${RUN_HEADER[id] || id}: “${n}”`).join("; ")}.`
        );
      if (sheet.choice !== "create") {
        await api.say(
          "Nothing drafted, and nothing learned: rules only come from runs you sign off. Your answers are kept on the run."
        );
        return "Not drafted";
      }
    }
    api.status(`Reconciling ${p.short}`, { done: 2, total: 5 });

    const legB = await api.step("Proving every payout to the bank");
    await api.wait(700);
    const r1 = getRun(run.id)!;
    const tied = r1.payouts.filter((x) => x.bank !== undefined);
    const flagged = r1.payouts.filter((x) =>
      x.hits.some((h) => h.severity === "soft")
    );
    legB(
      `${tied.length} payouts tied to bank credits · ${r1.payouts.filter((x) => x.status === "open").length} not due yet`
    );

    const legA = await api.step("Tying sales days to payouts");
    await api.wait(500);
    const openSales = r1.sales.filter((s) => s.state === "open");
    legA(
      `${r1.sales.length - openSales.length} of ${r1.sales.length} day-channels paid · ${openSales.length} not due yet`
    );

    const cls = await api.step("Classifying the rest of the bank");
    await api.wait(500);
    const cov = coverage(r1);
    cls(`${cov.accounted} of ${cov.total} bank rows accounted`);
    api.status(`Reconciling ${p.short}`, { done: 3, total: 5 });

    showRunRegister(run.id);
    const sign = sheet
      ? "create"
      : await api.card(
          { kind: "recon", company, runId: run.id, view: "register" },
          [
            {
              id: "create",
              label: "Create drafts",
              primary: true,
              risk: "draft",
            },
            { id: "cancel", label: "Cancel" },
          ]
        );
    if (sign !== "create") {
      await api.say(
        "Nothing drafted, and nothing learned: rules only come from runs you sign off."
      );
      return "Not drafted";
    }

    await api.checkpoint();
    const creating = await api.step("Creating the drafts");
    await api.wait(600);
    const made = createReconDrafts(run.id);
    creating(
      `Created ${made.sales} sales drafts · coded ${made.bank} bank lines`
    );
    const r3 = getRun(run.id)!;
    api.touch(r3.createdItemIds);
    api.onUndo(() => undoRecon(run.id, made.before));
    api.status(null);

    // The answer, and only the answer (20 Oct 2026): does it reconcile, what
    // needs you, what was made. Everything else is in the documents below.
    await api.say(
      [
        summaryText(r3),
        needsYou(r3, flagged.length),
        `**Created ${made.sales} sales drafts and coded ${made.bank} bank lines.** Nothing is approved or posted.`,
      ]
        .filter(Boolean)
        .join("\n\n"),
      [
        { label: "Sales › Needs Review", href: "/inbox?module=AR&tab=review" },
        { label: "Banking", href: "/inbox?module=BANK" },
      ]
    );
    // The documents, as one row (the thread groups them).
    (["reports", "payouts", "sales", "bank", "register", "drafts"] as const).forEach(
      (view) =>
        api.show({ kind: "recon", company, runId: run.id, view }, { open: false })
    );
    api.suggest(
      periodId === "sep"
        ? ["Close September with the 1–7 Oct statement"]
        : ["What has Neo learned for Nandhini Deluxe?"]
    );
    return `${made.sales + made.bank} drafts · ${run.id}`;
  },
};

export default reconRun;
