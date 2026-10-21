import { JOBS } from "@/config/pages/neo/skills";
import { getBankingState } from "@/hooks/pages/inbox/use-banking";
import { companyOf, getState } from "@/components/inbox/v2/store";
import { latestRun, policyOf, rulesOf } from "@/hooks/pages/neo/use-recon";
import type { NeoContext } from "@/types/pages/neo";

export type TodayItem = {
  id: string;
  /** Where reconciliation stands, in the accountant's words. */
  text: string;
  /** The one fact that makes it matter. */
  detail: string;
  /** The request that works on it; one of the agent's jobs. */
  prompt: string;
  tone: "negative" | "notice" | "neutral";
};

/**
 * Neo's home leads with where three-way reconciliation stands at this
 * client (phase one, 21 Oct 2026): not set up, a month not reconciled, a
 * month reconciled but not closed, rules waiting on an approval. Each line
 * is a job Neo runs. At most four, in the order the work happens.
 *
 * A client that doesn't sell through POS or platforms gets nothing: the
 * home says why instead (see `unavailableFor`).
 *
 * DEV: GET /api/neo/today?company=… — the recon run state for one client.
 */
export const todayFor = (company: string): TodayItem[] => {
  if (unavailableFor(company)) return [];
  const name = companyOf(company)?.name ?? "this client";
  const out: TodayItem[] = [];

  if (policyOf(company)?.status !== "approved")
    out.push({
      id: "setup",
      text: `Reconciliation isn't set up for ${name}`,
      detail: "Neo drafts the policy from Jun–Aug vouchers before it asks",
      prompt: "Set up reconciliation",
      tone: "notice",
    });

  const sep = latestRun(company, "sep");
  const uncoded = getBankingState(company).transactions.filter(
    (t) => !t.paymentType
  ).length;
  if (!sep || sep.stage !== "created")
    out.push({
      id: "recon",
      text: uncoded
        ? `${uncoded} September bank lines not reconciled`
        : "September not reconciled",
      detail: "POS, Zomato, Swiggy and card settlements against HDFC ·0418",
      prompt: "Reconcile September",
      tone: "notice",
    });
  else if (!sep.closed) {
    const suspense = sep.suspense.filter((s) => s.state === "open").length;
    out.push({
      id: "close",
      text: "September reconciled, not closed",
      detail: [
        `${sep.open.length} receivable${sep.open.length === 1 ? "" : "s"} open at month-end`,
        suspense && `${suspense} in suspense`,
        !sep.evidence && "needs the 1–7 Oct statement",
      ]
        .filter(Boolean)
        .join(" · "),
      prompt: "Close September with the 1–7 Oct statement",
      tone: "neutral",
    });
  } else if (!latestRun(company, "oct"))
    out.push({
      id: "oct",
      text: "1–15 October not reconciled",
      detail: "September's formats, payers and rules carry over",
      prompt: "Reconcile 1–15 October",
      tone: "neutral",
    });

  const waiting = rulesOf(company).filter((r) => r.state === "proposed");
  if (waiting.length)
    out.push({
      id: "learned",
      text: `${waiting.length} learned rule${waiting.length === 1 ? " waits" : "s wait"} for your approval`,
      detail: "Rules that book to a GST, TDS or TCS ledger need one approval",
      prompt: "What has Neo learned?",
      tone: "notice",
    });

  return out.slice(0, 4);
};

/** Why Neo has nothing to do here, when it doesn't. */
export const unavailableFor = (company: string) => JOBS[0].onlyFor?.(company);

/**
 * The prompts the docked panel offers before you type: the next job at
 * this client, then the rest of the jobs.
 *
 * DEV: GET /api/neo/suggestions?context=…
 */
export const suggestionsFor = (context: NeoContext): string[] => {
  const company = context.company || getState().company;
  if (unavailableFor(company)) return [];
  return [
    ...new Set([
      ...todayFor(company).map((t) => t.prompt),
      ...JOBS.map((j) => j.prompt),
    ]),
  ].slice(0, 4);
};

/** The / menu: every job, by its slash (see config/pages/neo/skills.ts). */
export const NEO_COMMANDS: { cmd: string; label: string; prompt: string }[] =
  JOBS.map((j) => ({ cmd: j.slash, label: j.name, prompt: j.prompt }));
