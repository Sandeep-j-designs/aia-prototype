import type { Item } from "@/components/inbox/v2/store";
import type { ReconRun } from "@/types/pages/neo/recon";

/**
 * A draft a reconciliation run handed over for review, as its checklist
 * (20 Oct 2026, the draft as a subtask of the run's chat). `needs` are the
 * calls the accountant should look at; `fine` is what passed its rules.
 */
export type BillCheck = { id: string; title: string; detail?: string };

/** Still waiting on the accountant's decision. */
export const waiting = (x: Item) =>
  ["Needs Review", "Duplicate"].includes(x.status);

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
