import type { NeoTask } from "@/types/pages/neo";
import { companyBrief } from "@/hooks/pages/neo/use-firm-brief";
import { companyOf, getState } from "@/components/inbox/v2/store";
import { has } from "@/utils/pages/neo";

/**
 * "What needs me today?" / "What needs my attention?"
 *
 * This company's brief, said briefly, with Needs attention one tap away.
 * Neo is one company's (20 Oct 2026): asked "across my clients", it answers
 * for the company in the top bar and says so.
 * Read-only. It used to sort one company's queue and offer to approve the
 * ready bills from chat; approving belongs to the Inbox, and the question an
 * accountant actually asks at nine is which client to open first.
 *
 * DEV: tool — get_brief, the same endpoint as Neo › Today.
 */
/** Extraction confidence a live run treats as ready to prepare. */
export const READY_CONFIDENCE = 0.9;

const triage: NeoTask = {
  id: "triage",
  title: "What needs you today",
  match: (p) =>
    has(
      p,
      /attention|needs? (me|my)|what('s| is)? (pending|left|waiting)|triage|where do i start|across (my )?clients|today|summari[sz]e (the )?(queue|inbox)/i
    )
      ? 3
      : 0,
  run: async (api) => {
    const company = api.context.company || getState().company;
    const name = companyOf(company)?.name || "This company";
    const scan = await api.step(`Reading ${name}'s queue, GST and chases`);
    await api.wait(600);
    const c = companyBrief(company);
    const needs = (c?.signals || []).filter((s) => s.tone !== "neutral");
    scan(`Checked ${name}`);
    const scope = has(
      api.prompt,
      /across (my )?clients|all (my )?clients|every client/i
    )
      ? `Neo works one company at a time, so this is ${name} only. `
      : "";
    if (!c || !needs.length) {
      await api.say(`${scope}Nothing at ${name} needs you today.`);
      return "Nothing needs you";
    }
    // Markdown: the verdict in bold, then each signal as a short list.
    // Money stays in its kinds — ITC, waiting, overdue — never one sum.
    const body = [
      `${scope}**${name} needs you on ${needs.length} thing${needs.length === 1 ? "" : "s"}** — ${c.deadline}.`,
      needs.map((s) => `- ${s.text}${s.due ? ` · ${s.due}` : ""}`).join("\n"),
    ].join("\n\n");
    await api.say(body, [
      ...(c.next ? [{ label: c.next.label, href: c.next.href }] : []),
      {
        label: "Open Needs attention",
        href: "/inbox?module=NEO&page=attention",
      },
    ]);
    return `${needs.length} need you`;
  },
};

export default triage;
