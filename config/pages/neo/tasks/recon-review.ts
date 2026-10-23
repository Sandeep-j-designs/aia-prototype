import { getState } from "@/components/inbox/v2/store";
import { RECON_PERIODS } from "@/config/pages/neo/mock-recon-sources";
import {
  REVIEW_LABEL,
  currentVersion,
  latestRun,
  recordReview,
  submitForReview,
} from "@/hooks/pages/neo/use-recon";
import { decide } from "./shared";
import type { NeoTask } from "@/types/pages/neo";
import type { ReconPeriodId } from "@/types/pages/neo/recon";
import { has } from "@/utils/pages/neo";

/**
 * US-07 · Review a versioned result (FR-07, aligned 21 Oct 2026). Review
 * is its own state, apart from execution: a completed version is submitted,
 * then a reviewer records Reviewed, Reviewed with exceptions (unresolved
 * items acknowledged) or Changes requested. Review never means anything was
 * posted. A change after review makes a new version that needs review; the
 * reviewed one is kept.
 *
 * In the prototype one person holds both roles, which A6 allows only where
 * the company permits it (OD6).
 *
 * DEV: POST /api/recon/runs/:id/versions/:n/submit · POST …/review.
 */
const reconReview: NeoTask = {
  id: "recon-review",
  title: "Review a reconciliation",
  match: (p) =>
    has(p, /\b(review|submit|sign ?off)\b/i) &&
    !has(p, /\bexport\b/i) &&
    has(p, /\b(sep|september|oct|october|recon\w*|run|period)\b/i)
      ? 50
      : 0,
  run: async (api) => {
    const company = api.context.company || getState().company;
    const periodId: ReconPeriodId = /\boct/i.test(api.prompt) ? "oct" : "sep";
    const p = RECON_PERIODS[periodId];
    const run = latestRun(company, periodId);
    const v = run && currentVersion(run);
    api.stage(7);
    if (!run || !v || run.execution !== "completed") {
      await api.say(
        `There's no completed run for ${p.label} to review${run ? ` (this one is ${run.execution.replace(/-/g, " ")})` : ""}. Reconcile it first.`
      );
      api.suggest([`Reconcile ${p.short}`]);
      return "Nothing to review";
    }

    if (v.review === "not-submitted" || v.review === "changes-requested") {
      submitForReview(run.id);
      api.show({ kind: "recon", company, runId: run.id, view: "review" });
      await api.say(
        `**Version ${v.n} of ${p.label} is pending review.** The reviewer sees its totals, ${v.exceptions.length} unresolved item${v.exceptions.length === 1 ? "" : "s"}, ${v.completeness === "partial" ? "the excluded rows, " : ""}and the source and rule versions. You hold the reviewer role for Nandhini Deluxe too, so you can record it now.`
      );
      api.suggest([`Record the review for ${p.short}`]);
      return "Pending review";
    }

    if (v.review !== "pending-review") {
      await api.say(
        `Version ${v.n} of ${p.label} is already **${REVIEW_LABEL[v.review]}**${v.reviewedBy ? ` by ${v.reviewedBy}` : ""}. Any change makes a new version that needs its own review.`
      );
      api.show({ kind: "recon", company, runId: run.id, view: "review" });
      return REVIEW_LABEL[v.review];
    }

    api.show({ kind: "recon", company, runId: run.id, view: "review" });
    const open = v.exceptions.length;
    await api.checkpoint();
    const { choice, picks, notes } = await decide(
      api,
      `Review ${p.label}, version ${v.n}`,
      [
        {
          id: "outcome",
          header: "Outcome",
          question: "What's your review?",
          why: `${v.groups.length} match groups (${v.groups.filter((g) => g.origin === "human").length} resolved by a person), ${open} unresolved, ${v.completeness === "partial" ? "partial" : "full"} completeness. Recording a review doesn't post anything.`,
          recommended: "reviewed",
          options: [
            {
              id: "reviewed",
              label: open ? "Reviewed with exceptions" : "Reviewed",
              hint: open
                ? `I've seen the ${open} unresolved item${open === 1 ? "" : "s"}; they stay unresolved and labelled`
                : "Every accepted row is matched or explained",
            },
            {
              id: "changes-requested",
              label: "Changes requested",
              hint: "Back to the preparer; a change makes a new version",
            },
          ],
          other: { fallback: "reviewed", placeholder: "A note for the record" },
        },
      ],
      [
        { id: "record", label: "Record the review", primary: true },
        { id: "cancel", label: "Not now" },
      ]
    );
    if (choice !== "record") return "Review not recorded";
    const after = recordReview(
      run.id,
      picks.outcome as "reviewed" | "changes-requested",
      notes.outcome || ""
    );
    await api.say(
      `Recorded: **${REVIEW_LABEL[after.review]}** on version ${after.n}, by ${after.reviewedBy}. Nothing was posted.`
    );
    api.suggest([`Export ${p.short}`]);
    return REVIEW_LABEL[after.review];
  },
};

export default reconReview;
