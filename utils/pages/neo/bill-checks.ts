import { predictedLedgers, type Item } from "@/components/inbox/v2/store";
import type { SourceReceipt } from "@/types/pages/inbox/sources";
import type { ReconRun } from "@/types/pages/neo/recon";
import { MOCK_BATCH_DOCUMENTS } from "@/config/pages/neo/mock-batch-documents";
import type { Batch, BatchRow, BatchSource } from "@/types/pages/neo/batch";

/**
 * One bill of a Neo batch, as its review checklist (20 Oct 2026, the bill
 * as a subtask of the batch's chat). Read from the register row Neo signed
 * off, so every line states what Neo did and why, which stays true even
 * after the form is edited. Neo never claims what the form holds now.
 *
 * `needs` are the calls Neo made that the accountant should look at (its
 * own guesses, a vendor it is about to create, reverse charge); `fine` is
 * what matched the document or followed an instruction or rule.
 */
export type BillCheck = { id: string; title: string; detail?: string };

export type BillReview = {
  row: BatchRow;
  needs: BillCheck[];
  fine: BillCheck[];
};

const inr = (n: number) =>
  `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const SOURCE: Record<BatchSource, string> = {
  doc: "from the bill",
  instruction: "from your instruction",
  master: "from the masters",
  rule: "by rule",
  neo: "Neo's pick",
};

/** The batch register row a draft was made from. */
export const rowFor = (batch: Batch, item: Item) =>
  batch.rows.find((r) => item.id === `${r.docId}-${batch.id}`);

export const billReview = (batch: Batch, item: Item): BillReview | null => {
  const row = rowFor(batch, item);
  if (!row) return null;
  const needs: BillCheck[] = [];
  const fine: BillCheck[] = [];

  if (row.status === "new-vendor") {
    const said = batch.questions
      .find((q) => q.id === "newVendors")
      ?.detail.split(" · ")
      .find((s) => s.startsWith(`${row.vendor}:`));
    needs.push({
      id: "vendor",
      title: `New vendor: ${row.vendor}`,
      detail: [
        said?.slice(row.vendor.length + 2),
        "Created in Tally when you approve",
      ]
        .filter(Boolean)
        .join(". "),
    });
  }

  const ledger = { title: `Ledger: ${row.ledger}`, id: "ledger" };
  if (row.ledgerSource === "neo")
    needs.push({
      ...ledger,
      title: `${ledger.title} (Neo's pick)`,
      detail:
        row.ledger === batch.settings.freightLedger
          ? "Your instruction didn't name a freight ledger, so Neo used this one for the batch's freight bills."
          : row.status === "check" && !row.rcm && row.note
            ? row.note
            : "The ledger this SAC is filed on. Change it on the form if it belongs elsewhere.",
    });
  else fine.push({ ...ledger, detail: SOURCE[row.ledgerSource] });

  if (row.rcm)
    needs.push({
      id: "rcm",
      title: `Reverse charge ${inr(row.rcm)}`,
      detail:
        "GTA bill with no tax printed. Pick the liability ledger on the form; it stays outside the bill total.",
    });

  if (row.costCentre) {
    const centre = {
      id: "costCentre",
      title: `Cost centre: ${row.costCentre}`,
    };
    if (row.costCentreSource === "neo")
      needs.push({
        ...centre,
        title: `${centre.title} (Neo's pick)`,
        detail: "Your instruction didn't name one.",
      });
    else fine.push({ ...centre, detail: SOURCE[row.costCentreSource] });
  }

  const printed =
    MOCK_BATCH_DOCUMENTS.find((d) => d.id === row.docId)?.bill?.grandTotal ??
    row.total;
  fine.push({
    id: "total",
    title:
      printed === row.taxable + row.gst
        ? `Total ${inr(row.total)} matches the PDF`
        : `Total ${inr(row.total)}, PDF says ${inr(printed)}`,
  });
  fine.push({
    id: "gst",
    title: row.tax.igst
      ? `IGST ${inr(row.tax.igst)}`
      : row.gst
        ? `CGST + SGST ${inr(row.tax.cgst)} each`
        : "No GST on the bill",
  });
  fine.push({
    id: "tds",
    title: row.tdsExempt
      ? "No TDS"
      : row.tds
        ? `TDS ${inr(row.tds)} under 194C`
        : "No TDS",
    detail: row.tdsExempt?.reason || row.tdsNote || undefined,
  });

  return { row, needs, fine };
};

/** A batch's drafts in the register's order: the order the queue walks. */
export const queueOf = (batch: Batch, items: Item[]) =>
  batch.rows
    .map((r) => items.find((x) => x.id === `${r.docId}-${batch.id}`))
    .filter((x): x is Item => !!x && x.status !== "Deleted");

/** Still waiting on the accountant's decision. */
export const waiting = (x: Item) =>
  ["Needs Review", "Duplicate"].includes(x.status);

/**
 * A bill Document collection prepared: what the run did with the file and
 * what the reading wasn't sure of. Read from the run's receipt and the
 * document as read, never from the form.
 */
export const collectedReview = (
  item: Item,
  receipt?: SourceReceipt
): { needs: BillCheck[]; fine: BillCheck[] } => {
  const needs: BillCheck[] = [];
  const fine: BillCheck[] = [];
  const bill = item.original.bill;

  if (item.status === "Failed")
    needs.push({
      id: "unreadable",
      title: "Couldn't read the attachment",
      detail: receipt?.reason || "Open it to retry, or ask for a clearer copy.",
    });
  // The missing invoice number has its own line below; don't say it thrice.
  const noNumber = item.status !== "Failed" && !item.form.invoiceNo;
  const aboutNumber = (text: string) => /invoice n(umber|o\.)/i.test(text);
  if (
    receipt?.outcome === "needs-decision" &&
    !(noNumber && aboutNumber(receipt.reason))
  )
    needs.push({ id: "held", title: "Held for you", detail: receipt.reason });
  if (receipt?.outcome === "linked")
    needs.push({
      id: "linked",
      title: "Same file as a bill already in the Inbox",
      detail: `${receipt.reason}. Linked, not drafted again.`,
    });
  if (item.status === "Duplicate")
    needs.push({
      id: "duplicate",
      title: "Possible duplicate",
      detail: item.original.duplicateOf
        ? `Same vendor and invoice number as ${item.original.duplicateOf}.`
        : "Same vendor and invoice number as another bill.",
    });
  if (bill?.vendorMissing)
    needs.push({
      id: "vendor",
      title: `New vendor: ${item.form.party || item.original.vendor || "unnamed"}`,
      detail: "Not in your masters. Approving creates it in Tally.",
    });
  if (noNumber)
    needs.push({
      id: "invoiceNo",
      title: "No supplier invoice number",
      detail:
        "The bill doesn't print one. Add it on the form before approving.",
    });
  const unsure = (bill?.flagged || []).filter(
    (f) => !(noNumber && aboutNumber(f))
  );
  if (unsure.length)
    needs.push({
      id: "flagged",
      title: `Unsure of: ${unsure.join(", ")}`,
      detail: "Compare these with the bill before approving.",
    });
  const ledgers = [...new Set(predictedLedgers(item).filter(Boolean))];
  if (ledgers.length)
    needs.push({
      id: "ledger",
      title: `Ledger: ${ledgers.join(", ")} (Neo's pick)`,
      detail:
        "Read from the bill's lines. Change it on the form if it belongs elsewhere.",
    });

  if (receipt)
    fine.push({
      id: "source",
      title: `Collected from ${receipt.location}`,
      detail: receipt.outcome === "prepared" ? receipt.reason : undefined,
    });
  if (item.amount)
    fine.push({
      id: "total",
      title: `Total ${inr(item.amount)} read from the bill`,
    });
  if (item.form.date)
    fine.push({ id: "date", title: `Bill date ${item.form.date}` });
  return { needs, fine };
};

/**
 * A sales voucher a reconciliation run drafted: the rules that shaped it.
 * Soft flags and anything still proposed (the 9(5) treatment) need you;
 * the rest passed.
 */
export const reconReview = (
  run: ReconRun,
  item: Item
): { needs: BillCheck[]; fine: BillCheck[] } => {
  const v = run.vouchers.find((x) => `${x.id}-${run.id}` === item.id);
  if (!v) return { needs: [], fine: [] };
  const needs: BillCheck[] = [];
  const fine: BillCheck[] = [];
  v.hits.forEach((h, i) => {
    const check = { id: `${h.rule}-${i}`, title: h.rule, detail: h.text };
    if (h.severity === "soft" || /proposed/i.test(h.text)) needs.push(check);
    else fine.push(check);
  });
  if (v.status === "suspense")
    needs.push({ id: "suspense", title: "Part of this goes to suspense" });
  return { needs, fine };
};
