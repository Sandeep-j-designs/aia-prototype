import { JOBS } from "@/config/pages/neo/skills";
import { companyOf, getState } from "@/components/inbox/v2/store";
import {
  REVIEW_LABEL,
  configOf,
  currentVersion,
  latestRun,
  latestUnsavedAnswer,
} from "@/hooks/pages/neo/use-recon";
import type { ReconPeriodId } from "@/types/pages/neo/recon";
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
  /** Where the work stands, for the row's glyph. */
  kind:
    "setup" | "not-run" | "waiting" | "review" | "pending" | "done" | "save";
};

/**
 * Neo's home leads with where three-way reconciliation stands at this
 * client (aligned to the AiA 2.0 PRD, 21 Oct 2026): no configuration, a
 * period not reconciled or waiting for inputs, a version waiting for
 * review, an answer that applies to one run only. Each line is a job Neo
 * runs. At most four, in the order the work happens.
 *
 * A client without settlement data gets nothing: the home says why
 * instead (see `unavailableFor`).
 *
 * DEV: GET /api/neo/today?company=… — the recon run state for one client.
 */
export const todayFor = (company: string): TodayItem[] => {
  if (unavailableFor(company)) return [];
  const name = companyOf(company)?.name ?? "this client";
  const out: TodayItem[] = [];
  if (!configOf(company))
    out.push({
      id: "setup",
      text: `Reconciliation isn't set up for ${name}`,
      detail: "Confirm the template: three sources, INR, India time",
      prompt: "Set up reconciliation",
      tone: "notice",
      kind: "setup",
    });

  const period = (id: ReconPeriodId, short: string) => {
    const run = latestRun(company, id);
    const v = run && currentVersion(run);
    if (!run || !v || run.execution === "cancelled")
      return out.push({
        id,
        text: `${short} not reconciled`,
        detail:
          "Bank ·0418, card, UPI, Zomato and Swiggy settlements, Tally receipts",
        prompt: `Reconcile ${short}`,
        tone: id === "sep" ? "notice" : "neutral",
        kind: "not-run",
      });
    if (run.execution !== "completed")
      return out.push({
        id,
        text: `${short} is waiting for inputs`,
        detail: "A source, a row correction or an answer is missing",
        prompt: `Reconcile ${short}`,
        tone: "notice",
        kind: "waiting",
      });
    if (v.review === "not-submitted" || v.review === "changes-requested")
      return out.push({
        id,
        text: `${short} version ${v.n} isn't reviewed`,
        detail: `${v.exceptions.length} exceptions unresolved · ${v.completeness === "full" ? "Full" : "Partial"}`,
        prompt: `Submit ${short} for review`,
        tone: "notice",
        kind: "review",
      });
    if (v.review === "pending-review")
      return out.push({
        id,
        text: `${short} version ${v.n} is pending review`,
        detail: "You hold the reviewer role for this company",
        prompt: `Record the review for ${short}`,
        tone: "neutral",
        kind: "pending",
      });
    return out.push({
      id,
      text: `${short} is ${REVIEW_LABEL[v.review].toLowerCase()}`,
      detail: `Version ${v.n}, ready to share as Excel`,
      prompt: `Export ${short}`,
      tone: "neutral",
      kind: "done",
    });
  };
  period("sep", "September");
  const sep = latestRun(company, "sep");
  if (sep && currentVersion(sep)?.review.startsWith("reviewed"))
    period("oct", "1–15 October");

  const unsaved = latestUnsavedAnswer(company);
  if (unsaved)
    out.push({
      id: "save",
      text: `An answer from ${unsaved.run.period.label} applies to that run only`,
      detail: "Save it to the configuration to reuse it in later runs",
      prompt: "Save the answer to the configuration",
      tone: "neutral",
      kind: "save",
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
