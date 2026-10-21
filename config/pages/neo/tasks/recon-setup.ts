import { companyOf, getState } from "@/components/inbox/v2/store";
import { NANDHINI_ID } from "@/config/pages/neo/mock-recon";
import {
  answerPolicy,
  approvePolicy,
  draftPolicy,
} from "@/hooks/pages/neo/use-recon";
import { decide } from "./shared";
import type { NeoTask } from "@/types/pages/neo";
import { has } from "@/utils/pages/neo";

/**
 * Set up three-way reconciliation (20 Oct 2026). The brief's rule: read the
 * books before asking anything. Neo drafts the company's policy from three
 * months of vouchers (LRN-01), shows what it found with the evidence, asks
 * only what the books can't settle, refuses to copy a pattern that breaks a
 * hard rule, and the accountant approves the policy as version 1.
 *
 * DEV: GET /api/recon/policy/draft?company=… runs skill S3 over the synced
 * vouchers; POST /api/recon/policy approves it.
 */
const reconSetup: NeoTask = {
  id: "recon-setup",
  title: "Set up reconciliation",
  match: (p) =>
    has(p, /\b(set ?up|configure|onboard)\b/i) &&
    has(p, /\b(recon|reconcil\w*)\b/i)
      ? 60
      : 0,
  run: async (api) => {
    const company = api.context.company || getState().company;
    if (company !== NANDHINI_ID) {
      await api.say(
        `Reconciliation reads POS, payment-gateway and platform reports, and ${companyOf(company)?.name} doesn't sell through any. In this prototype it's set up for **Nandhini Deluxe**, a restaurant; switch to it in the top bar.`
      );
      return "Not a POS client";
    }

    const reading = await api.step("Reading Jun–Aug vouchers in your Tally");
    await api.wait(900);
    const policy = draftPolicy(company);
    const counts = policy.rows.reduce<Record<string, number>>(
      (m, r) => ({ ...m, [r.state]: (m[r.state] || 0) + 1 }),
      {}
    );
    // The policy is the document; the step says how it was drafted.
    reading(
      `Drafted the policy from 1,284 vouchers · ${counts.prefilled || 0} from your books, ${counts.assumed || 0} from the restaurant template`
    );
    api.status("Setting up reconciliation", { done: 1, total: 3 });
    api.show({ kind: "recon", company, view: "policy" });

    // The three gaps and the approval, on one sheet (20 Oct 2026). Two are
    // settled by history; only the gross cut-off is a real choice.
    await api.checkpoint();
    const { choice, picks } = await decide(
      api,
      "Before I approve the policy",
      [
        {
          id: "cut",
          header: "Gross from",
          question: "From when are Zomato and Swiggy booked at gross?",
          why: "Your history books them at the payout, which hides commission, ads and the 194-O TDS credit, so I won't copy it. Past months stay as they are.",
          recommended: "sep",
          options: [
            {
              id: "sep",
              label: "From 1 Sep 2026",
              hint: "The month we're about to reconcile",
            },
            { id: "oct", label: "From 1 Oct 2026" },
          ],
        },
        {
          id: "alloc",
          header: "Allocation",
          question: "How are platform receivables closed?",
          settled: "28 of 40 payouts in history",
          recommended: "date",
          options: [
            { id: "date", label: "By sales date" },
            { id: "oldest", label: "Oldest first" },
          ],
        },
        {
          id: "own",
          header: "ICICI ·4105",
          question: "Is ICICI Current A/c ·4105 the company's own account?",
          why: "Only an account the company owns can take a contra.",
          settled: "six transfers in history booked as contras",
          recommended: "yes",
          options: [
            { id: "yes", label: "ICICI ·4105 is our own account" },
            { id: "no", label: "No, it belongs to someone else" },
          ],
        },
      ],
      [
        {
          id: "approve",
          label: "Submit and approve policy v1",
          primary: true,
          risk: "read",
        },
        { id: "later", label: "Not now" },
      ]
    );
    const { cut, alloc, own } = picks;
    answerPolicy(
      company,
      "sales.basis.platform",
      `Zomato, Swiggy and Ownly sales at gross from ${cut === "sep" ? "1 Sep" : "1 Oct"} 2026; fees, ads, GST on fees and TDS 194-O to their own ledgers`
    );
    answerPolicy(
      company,
      "receipt.allocation",
      alloc === "date" ? "Agst Ref by sales date" : "Agst Ref oldest first"
    );
    answerPolicy(
      company,
      "contra_rules",
      own === "yes"
        ? "Cash deposits → Contra from Cash; transfers to ICICI ·4105 (own account, confirmed) → Contra"
        : "Cash deposits → Contra from Cash; transfers to ICICI ·4105 are party payments"
    );
    if (choice !== "approve") {
      await api.say(
        "Kept as a draft with your answers. Nothing is reconciled until it's approved."
      );
      return "Policy kept as draft";
    }
    approvePolicy(company);
    api.status(null);
    await api.say("**Policy v1 approved**, effective 1 Sep 2026.");
    return "Policy v1 approved";
  },
};

export default reconSetup;
