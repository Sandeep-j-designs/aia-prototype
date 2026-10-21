import {
  approveClean,
  cleanDrafts,
  getBatch,
  policyFor,
  saveBatchPolicy,
  undoBatch,
} from "@/hooks/pages/neo/use-batches";
import type { NeoTask } from "@/types/pages/neo";
import { has, money } from "@/utils/pages/neo";

/**
 * What comes after a batch, asked in the same chat: approve the clean drafts,
 * keep the freight rule as client policy, or undo the batch.
 *
 * Approving is a commit: Neo lists the bills and the total and waits for the
 * accountant's click (Ctrl+Enter doesn't take it). Clean means nothing on
 * the voucher was Neo's own guess, no new vendor, no reverse charge.
 *
 * DEV: tools — approve_items(ids), save_policy(rule), discard_batch(id).
 */
const batchActions: NeoTask = {
  id: "batch-actions",
  title: "Finish a batch",
  match: (p) =>
    has(p, /\bbatch B-\d{4}-\d{2}\b/i) &&
    has(p, /approve|polic|undo|discard|review/i)
      ? 12
      : 0,
  run: async (api) => {
    const id = api.prompt.match(/B-\d{4}-\d{2}/i)?.[0].toUpperCase() || "";
    const batch = getBatch(id);
    if (!batch) {
      await api.say(
        `I can't find batch ${id}. Batches live for the session in this prototype.`
      );
      return "No batch";
    }

    if (has(api.prompt, /undo|discard/i)) {
      const result = undoBatch(id);
      await api.say(
        result.skipped.length
          ? `Removed ${result.reversed.length} drafts. ${result.skipped.length} kept: they were edited or approved.`
          : `Batch ${id} undone: ${result.reversed.length} drafts removed from the Inbox.`
      );
      return "Batch undone";
    }

    if (has(api.prompt, /polic/i)) {
      if (batch.policySaved) {
        await api.say("That rule is already saved as client policy.");
        return "Already saved";
      }
      const rule = policyFor(batch);
      const pick = await api.ask(
        `Save “${rule.text}” as client policy?\nIt covered ${rule.covered} bills in this batch, so next month's freight bills won't need the instruction. Cost centre and TDS stay per batch.`,
        [
          { id: "save", label: "Save as policy" },
          { id: "no", label: "Not now" },
        ]
      );
      if (pick !== "save") return "Not saved";
      saveBatchPolicy(id);
      await api.say("Saved. It's on the Client policy page with the rest.");
      return "Policy saved";
    }

    if (has(api.prompt, /review/i)) {
      await api.navigate(`/inbox?batch=${id}`);
      await api.say(
        `The Inbox is showing batch ${id}; Approve & Next walks it.`
      );
      return "Opened in Inbox";
    }

    const clean = cleanDrafts(batch);
    if (!clean.length) {
      await api.say(
        "Nothing in the batch is clean and waiting. The rest have something to look at first: open them from the Inbox."
      );
      return "Nothing clean";
    }
    const total = clean.reduce((s, x) => s + x.amount, 0);
    const pick = await api.card(
      {
        kind: "list",
        title: `Approve from batch ${id}: nothing guessed, no new vendor, no reverse charge`,
        groups: [
          {
            label: "Clean",
            tone: "positive",
            rows: clean.map((x) => ({
              itemId: x.id,
              primary: x.form.party,
              secondary: `${x.form.voucherNo} · ${x.form.invoiceNo}`,
              amount: x.amount,
            })),
          },
        ],
      },
      [
        {
          id: "approve",
          label: `Approve ${clean.length} bills · ${money(total)}`,
          primary: true,
          risk: "commit",
        },
        { id: "cancel", label: "Not now" },
      ]
    );
    if (pick !== "approve") return "Not approved";
    const result = approveClean(id);
    api.touch(clean.map((x) => x.id));
    await api.say(
      result?.skipped
        ? `${result.changed} approved. ${result.skipped} not: ${Object.entries(
            result.reasons
          )
            .map(([why, n]) => `${n} ${why.toLowerCase()}`)
            .join("; ")}.`
        : `${result?.changed ?? 0} approved by you. Nothing reaches Tally until you sync.`,
      [{ label: "Review the rest", href: `/inbox?batch=${id}` }]
    );
    return `${result?.changed ?? 0} approved`;
  },
};

export default batchActions;
