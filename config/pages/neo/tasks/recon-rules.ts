import { getState } from "@/components/inbox/v2/store";
import { approveRule, rulesOf } from "@/hooks/pages/neo/use-recon";
import type { NeoTask } from "@/types/pages/neo";
import { has } from "@/utils/pages/neo";

/**
 * "What has Neo learned?" (Phase 4): the client's rules with their state,
 * and the one place a rule that books to a tax ledger gets its approval.
 *
 * DEV: GET /api/recon/rules?company=…, POST /api/recon/rules/:id/approve.
 */
const reconRules: NeoTask = {
  id: "recon-rules",
  title: "What Neo has learned",
  match: (p) =>
    has(p, /\b(learn(ed|t)?|taught)\b/i) && has(p, /\b(neo|rules?|recon\w*)\b/i)
      ? 40
      : 0,
  run: async (api) => {
    const company = api.context.company || getState().company;
    const rules = rulesOf(company);
    if (!rules.length) {
      await api.say(
        "Nothing yet for this client. Rules come from reconciliation answers you sign off: a payer, a bank narration, a report format."
      );
      return "No rules";
    }
    const active = rules.filter((r) => r.state === "active").length;
    const shadow = rules.filter((r) => r.state === "shadow");
    const proposed = rules.filter((r) => r.state === "proposed");
    await api.say(
      [
        `**${active} active**: Neo applies them without asking.`,
        shadow.length
          ? `**${shadow.length} in shadow**: ${shadow.map((r) => `${r.match} (${r.confirmations} of ${r.needed})`).join(", ")}. Neo suggests them and asks you to confirm until they've earned it.`
          : "",
        proposed.length
          ? `**${proposed.length} need your approval** because they book to a tax ledger.`
          : "",
      ]
        .filter(Boolean)
        .join("\n\n")
    );
    if (!proposed.length) {
      api.show({ kind: "recon", company, view: "rules" });
      return `${rules.length} rules`;
    }
    const go = await api.card({ kind: "recon", company, view: "rules" }, [
      {
        id: "approve",
        label: `Approve ${proposed.length} rule${proposed.length === 1 ? "" : "s"}`,
        primary: true,
        risk: "read",
      },
      { id: "later", label: "Not now" },
    ]);
    if (go === "approve") proposed.forEach((r) => approveRule(r.id));
    return `${rules.length} rules`;
  },
};

export default reconRules;
