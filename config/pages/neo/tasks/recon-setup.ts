import { companyOf, getState } from "@/components/inbox/v2/store";
import { NANDHINI_ID } from "@/config/pages/neo/mock-recon";
import {
  TEMPLATE,
  configOf,
  confirmConfig,
  latestUnsavedAnswer,
  saveAnswerToConfig,
} from "@/hooks/pages/neo/use-recon";
import { decide } from "./shared";
import type { NeoTask } from "@/types/pages/neo";
import { has } from "@/utils/pages/neo";

/**
 * US-01 · Set up a reconciliation (FR-01, aligned to the AiA 2.0 PRD on
 * 21 Oct 2026). A template with the company, timezone, currency and the
 * checklist of three sources, confirmed as the company's configuration.
 * A later period reuses it: the configuration is copied, never the rows or
 * results of an earlier run (US-01 AC3).
 *
 * Also the one way an answer becomes reusable: "Save the answer to the
 * configuration" is a separate, authorised confirmation (US-05 AC4).
 *
 * DEV: POST /api/recon/configs; POST /api/recon/configs/:id/mappings.
 */
const reconSetup: NeoTask = {
  id: "recon-setup",
  title: "Set up reconciliation",
  match: (p) =>
    has(p, /\bsave\b/i) && has(p, /\bconfig/i)
      ? 70
      : has(p, /\b(set ?up|configure|template)\b/i) &&
          has(p, /\b(recon|reconcil\w*)\b/i)
        ? 60
        : 0,
  run: async (api) => {
    const company = api.context.company || getState().company;
    if (company !== NANDHINI_ID) {
      await api.say(
        `In this prototype, three-way reconciliation is set up for **Nandhini Deluxe**, which has bank, settlement and books data. ${companyOf(company)?.name} doesn't; switch in the top bar.`
      );
      return "No settlement data for this client";
    }

    // US-05 AC4: saving an answer is its own confirmation.
    if (has(api.prompt, /\bsave\b/i)) {
      const cfg = configOf(company);
      const latest = latestUnsavedAnswer(company);
      if (!latest) {
        await api.say(
          "There's no answered question to save yet. Answers apply to the run they were given in until you save one here."
        );
        return "Nothing to save";
      }
      const { run: r, q } = latest;
      const opt = q.options.find((o) => o.id === q.answer);
      const { choice } = await decide(
        api,
        "Save to the configuration",
        [
          {
            id: "what",
            header: "Answer",
            question: `Save this answer for runs after ${r.period.label}?`,
            why: "Saved answers apply from the next run. Only someone who can edit this company's configuration can save one.",
            recommended: q.answer!,
            options: [
              {
                id: q.answer!,
                label: opt?.label || q.answer!,
                hint: opt?.hint,
              },
            ],
            settled: `Answered in ${r.period.label}: ${q.text}`,
          },
        ],
        [
          {
            id: "save",
            label: `Save to configuration v${(cfg?.version || 0) + 1}`,
            primary: true,
            risk: "draft",
          },
          { id: "cancel", label: "Not now" },
        ]
      );
      if (choice !== "save") return "Not saved";
      const next = saveAnswerToConfig(r.id, q.id)!;
      await api.say(
        `Saved to **configuration v${next.version}**: ${opt?.hint || opt?.label}. It applies from the next run; ${r.period.label} keeps the answer it was given.`
      );
      return "Saved to configuration";
    }

    const prior = configOf(company);
    api.stage(1);
    const step = await api.step(
      prior
        ? `Reading configuration v${prior.version}`
        : `Opening the ${TEMPLATE.name} template`,
      undefined,
      { tools: ["config.get"] }
    );
    await api.wait(500);
    step(
      prior
        ? `Configuration v${prior.version}: ${TEMPLATE.name}, ${prior.timezone}, ${prior.currency}`
        : `${TEMPLATE.name}: three sources, one currency, one timezone`
    );
    api.stage(2);
    await api.checkpoint();
    const { choice, picks } = await decide(
      api,
      prior ? "Confirm the configuration" : "Set up the configuration",
      [
        {
          id: "tz",
          header: "Timezone",
          question: "Which timezone sets the period's boundaries?",
          why: "A row on the last day belongs to the period by this clock (R1).",
          recommended: "Asia/Kolkata",
          options: [
            {
              id: "Asia/Kolkata",
              label: "India (IST, UTC+5:30)",
              hint: "Nandhini Deluxe's company timezone",
            },
          ],
          settled: "Nandhini Deluxe's company timezone in AiA 1.0",
        },
        {
          id: "cur",
          header: "Currency",
          question: "Which currency does the run reconcile in?",
          why: "One currency per run (A3). A row in another currency stops the run until it's corrected.",
          recommended: "INR",
          options: [{ id: "INR", label: "Indian rupee (INR)" }],
          settled: "Every source for this company is in INR",
        },
      ],
      [
        {
          id: "confirm",
          label: prior
            ? `Confirm configuration v${prior.version + 1}`
            : "Confirm configuration v1",
          primary: true,
          risk: "draft",
        },
        { id: "cancel", label: "Not now" },
      ]
    );
    if (choice !== "confirm") return "Not confirmed";
    const cfg = confirmConfig(company, {
      timezone: picks.tz,
      currency: picks.cur,
    });
    api.show({ kind: "recon", company, view: "config" });
    await api.say(
      `**Configuration v${cfg.version} confirmed** for Nandhini Deluxe: ${TEMPLATE.name}, ${cfg.timezone}, ${cfg.currency}. Each run needs a bank statement, the settlement reports and the books' settlement receipts, all as CSV.`
    );
    api.suggest(["Reconcile September"]);
    return "Configuration confirmed";
  },
};

export default reconSetup;
