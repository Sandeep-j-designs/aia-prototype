import { companyOf, getState } from "@/components/inbox/v2/store";
import {
  collectSources,
  getSourceState,
  retryFailedSources,
  collectionAgent,
} from "@/hooks/pages/inbox/use-inbox-sources";
import type { NeoTask } from "@/types/pages/neo";

const inboxCollection: NeoTask = {
  id: "inbox-collection",
  title: "Collect and prepare Inbox documents",
  match: (p) =>
    /\b(collect|fetch|retrieve)\b|prepare.*inbox|check.*sources|retry.*collection/i.test(
      p
    )
      ? 50
      : 0,
  run: async (api) => {
    const company = api.context.company || getState().company;
    const sources = getSourceState().sources.filter(
      (s) => s.company === company && s.status === "connected"
    );
    if (!sources.length || !collectionAgent(company).configured) {
      await api.say(
        `Document collection isn't on for ${companyOf(company)?.name} yet. Let's set it up first.`
      );
      await api.chain("Set up document collection");
      return "Set up Document collection";
    }
    await api.say(
      `I’ll check the delegated sources for ${companyOf(company)?.name}: ${sources.map((s) => `${s.provider} · ${s.scope} · from ${s.since}`).join("; ")}. This demo uses sample files. I’ll prepare drafts, link exact duplicates and leave exceptions for you. Nothing will be approved, sent or synced.`
    );
    if (/retry/i.test(api.prompt)) retryFailedSources(company);
    const done = await api.step("Checking scoped sources and preparing drafts");
    const results = await collectSources(
      company,
      api.runId,
      async () => {
        await api.checkpoint();
        await api.wait(450);
      },
      (text) => api.status(text),
      undefined,
      (receipt) => {
        if (receipt.itemId) api.touch([receipt.itemId]);
      }
    );
    api.status(null);
    done("Source check completed");
    const ids = results.flatMap((r) => (r.itemId ? [r.itemId] : []));
    api.touch([...new Set(ids)]);
    const prepared = results.filter((r) => r.outcome === "prepared").length;
    const linked = results.filter((r) => r.outcome === "linked").length;
    const held = results.filter((r) => r.outcome === "needs-decision").length;
    const failed = results.filter((r) => r.outcome === "failed").length;
    const skipped = results.filter((r) => r.outcome === "skipped").length;
    const summary = results.length
      ? `${prepared} prepared · ${linked} duplicates linked · ${held} need a decision · ${failed} unreadable · ${skipped} skipped`
      : "No new documents; previously collected files were not duplicated";
    if (held || failed) api.outcome("partial");
    api.show({
      kind: "list",
      title: "Collection results",
      review: "Collection run",
      groups: [
        {
          label: "Ready for review",
          tone: "positive",
          rows: results
            .filter((r) => r.itemId && r.outcome === "prepared")
            .map((r) => ({
              itemId: r.itemId!,
              primary:
                getState().items.find((x) => x.id === r.itemId)?.form.party ||
                r.itemId!,
              secondary: r.reason,
            })),
        },
        {
          label: "Linked or needs your decision",
          tone: "notice",
          rows: results
            .filter((r) => r.itemId && r.outcome !== "prepared")
            .map((r) => ({
              itemId: r.itemId!,
              primary: r.location,
              secondary: r.reason,
            })),
        },
      ],
    });
    await api.say(
      `${summary}. Drafts remain in Needs Review. ${failed ? "The unreadable attachment is in Inbox; open it to retry or request a clearer copy." : ""} ${skipped ? "The dry run lists each skipped file and why." : ""}`,
      [
        {
          label: "Agent activity",
          href: "/inbox?module=AGENTS&page=document-collection&tab=activity",
        },
        ...[...new Set(ids)].map((id) => ({
          label:
            getState().items.find((x) => x.id === id)?.form.invoiceNo ||
            "Missing invoice number",
          itemId: id,
        })),
      ]
    );
    return summary;
  },
};
export default inboxCollection;
