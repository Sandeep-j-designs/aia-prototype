import { getState } from "@/components/inbox/v2/store";
import {
  MOCK_BATCH_DOCUMENTS,
  SAMPLE_BATCH_INSTRUCTION,
} from "@/config/pages/neo/mock-batch-documents";
import {
  answerBatch,
  createBatchDrafts,
  getBatch,
  readBatch,
  reconcile,
  showRegister,
  startBatch,
  undoBatch,
} from "@/hooks/pages/neo/use-batches";
import { decide } from "./shared";
import type { NeoTask } from "@/types/pages/neo";
import { has, money } from "@/utils/pages/neo";

/**
 * Voucher entry in the chat: bills attached to a message, plus one line of
 * instruction, entered as a batch.
 *
 * The conversation is the plan's loop. Neo says what it understood from the
 * instruction (a settings card, editable in place), asks about each kind of
 * exception once, shows the purchase register to sign off (ticks, Dr/Cr per
 * row, totals reconciled to the documents), and only then makes the drafts —
 * Needs Review, prepared by Neo, tagged with the batch. Approving stays the
 * accountant's: in the Inbox, or from the follow-up Neo offers, which asks
 * again with the total in view.
 *
 * DEV: attachments go up with the prompt to POST /api/neo/runs; the batch
 * endpoints (types/pages/neo/batch.ts) are the tools this task calls.
 */
const batchEntry: NeoTask = {
  id: "batch-entry",
  title: "Enter a batch of bills",
  match: (p, _ctx, attachments = []) =>
    attachments.length ||
    has(p, /\bbatch\b/i) ||
    (has(p, /\b(bills|invoices|vouchers)\b/i) &&
      has(
        p,
        /\b(book|enter|post|upload|these|freight goes|deduct|cost cent|plant)\b/i
      ) &&
      !has(
        p,
        // "Move … bills from Plant & Machinery to …" is change by rule, not a
        // batch: "plant" here names a ledger, not the Plant cost centre.
        /sales invoice|how much|spend|which vendors|approve|undo|polic|selected|\bmove\b/i
      ))
      ? 9
      : 0,
  run: async (api) => {
    const typed = api.attachments.length
      ? /^\d+ files? attached$/.test(api.prompt)
        ? ""
        : api.prompt
      : api.prompt;
    let docIds = api.attachments
      .map((a) => a.docId)
      .filter(Boolean) as string[];
    const unreadable = api.attachments
      .filter((a) => !a.docId)
      .map((a) => a.name);

    // Nothing attached: the sample is the only batch that works here, so
    // Neo reads it rather than asking (20 Oct 2026).
    const sample = !api.attachments.length;
    if (sample) docIds = MOCK_BATCH_DOCUMENTS.map((d) => d.id);
    if (!docIds.length) {
      await api.say(
        `I couldn't read ${unreadable.join(", ")}. This prototype reads its sample bills only; attach those from the clip menu.`
      );
      return "Nothing readable";
    }

    // What the bills don't say isn't asked either: the sample's own
    // instruction, or defaults, land on the settings card, where any value
    // is one click to change.
    let instruction = /^enter a batch/i.test(typed) ? "" : typed.trim();
    if (!instruction && sample) instruction = SAMPLE_BATCH_INSTRUCTION;
    const reading = await api.step(
      sample
        ? "Reading the sample: 10 Harihar plant bills"
        : `Reading ${docIds.length} bill${docIds.length === 1 ? "" : "s"}`
    );
    await api.wait(700);
    const batch = startBatch(
      instruction,
      docIds,
      unreadable,
      api.context.company || getState().company
    );
    reading(
      `Read ${docIds.length} bill${docIds.length === 1 ? "" : "s"}${unreadable.length ? ` · ${unreadable.length} not readable` : ""}`
    );
    api.status("Entering a batch of bills", { done: 1, total: 4 });

    await api.say(
      instruction
        ? "Here's what I understood. Click any value to change it; the sparkle marks the ones I chose myself."
        : "No instruction, so these are my defaults. Click any value to change it."
    );
    const go = await api.card(
      { kind: "batch", batchId: batch.id, view: "settings" },
      [
        {
          id: "enter",
          label: `Enter ${docIds.length} vouchers`,
          primary: true,
          risk: "read",
        },
        { id: "cancel", label: "Cancel" },
      ]
    );
    if (go !== "enter") {
      await api.say("Stopped. Nothing was entered.");
      return "Cancelled";
    }

    await api.checkpoint();
    readBatch(batch.id);
    const questions = getBatch(batch.id)?.questions || [];
    api.status("Entering a batch of bills", { done: 2, total: 4 });
    // Every exception on one sheet, Neo's pick filled in; one answer covers
    // every bill it applies to.
    if (questions.length) {
      const { choice, picks } = await decide(
        api,
        "Before I build the register",
        questions.map((q) => ({
          id: q.id,
          header: {
            goods: "Goods",
            costCentre: "Cost centre",
            newVendors: "New vendors",
            c6: "194C(6)",
          }[q.id],
          question: q.text,
          why: q.detail,
          recommended: q.answer,
          options: q.options,
        })),
        [
          {
            id: "go",
            label: "Submit and build the register",
            primary: true,
            risk: "read",
          },
          { id: "cancel", label: "Cancel" },
        ]
      );
      if (choice !== "go") {
        await api.say("Stopped. Nothing was entered.");
        return "Cancelled";
      }
      for (const q of questions) answerBatch(batch.id, q.id, picks[q.id]);
    }

    showRegister(batch.id);
    const b = getBatch(batch.id)!;
    const rows = b.rows.filter((r) => r.status !== "left-out");
    const out = b.rows.filter((r) => r.status === "left-out");
    const check = rows.filter((r) => r.status !== "ready");
    const rec = reconcile(b);
    api.status("Entering a batch of bills", { done: 3, total: 4 });
    await api.say(
      `${rows.length} vouchers, ${money(rows.reduce((s, r) => s + r.total, 0))}, reconciling to the documents (difference ${money(rec.difference)}).${out.length ? ` ${out.length} left out: ${out.map((r) => r.note?.toLowerCase()).join("; ")}.` : ""}${check.length ? ` ${check.length} to look at: ${check.map((r) => r.vendor.split(" ")[0]).join(", ")}.` : ""} Open a row for its Dr/Cr; untick anything you don't want.`
    );
    const sign = await api.card(
      { kind: "batch", batchId: batch.id, view: "register" },
      [
        { id: "create", label: "Create drafts", primary: true, risk: "draft" },
        { id: "cancel", label: "Cancel" },
      ]
    );
    if (sign !== "create") {
      await api.say(
        "Not entered. The batch is kept here if you want it later."
      );
      return "Not entered";
    }

    await api.checkpoint();
    const creating = await api.step("Creating the drafts");
    await api.wait(500);
    const created = createBatchDrafts(batch.id);
    creating(`Created ${created.length} drafts in Needs Review`);
    api.touch(created.map((x) => x.id));
    api.onUndo(() => undoBatch(batch.id));
    api.status(null);

    await api.say(
      `${created.length} drafts are in Needs Review as batch ${batch.id}, each beside its own document. Nothing is approved or synced.`,
      [{ label: "Review in Inbox", href: `/inbox?batch=${batch.id}` }]
    );
    api.show({ kind: "batch", batchId: batch.id, view: "drafts" });
    api.suggest([
      `Approve the clean drafts in batch ${batch.id}`,
      `Save the freight rule from batch ${batch.id} as client policy`,
    ]);
    return `${created.length} drafts · batch ${batch.id}`;
  },
};

export default batchEntry;
