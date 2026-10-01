import type { SplitPlan } from "@/types/pages/inbox/bill-splitter";

/**
 * The sample month-end packet, as detection would return it.
 *
 * Carried over from the Bill Upload prototype so the demo exercises every
 * rule the PRD names: two confident bills, a blank separator left out
 * automatically, an item schedule on page 6 that could be either an annexure
 * or a new bill, and a third bill of seven pages. Remove the split at page 8
 * and bill 2 runs to 11 pages; remove the one at 4 as well and the merged bill
 * passes the 12-page limit and is created in parts.
 *
 * DEV: replace with GET /bill-splits/:id once detection returns a plan.
 */
export const SAMPLE_PACKET_NAME = "Scan_Aug-26_vendor-bills.pdf";
export const SAMPLE_PACKET_SIZE = 2_480_000;

export const SAMPLE_SPLIT_PLAN: SplitPlan = {
  pages: [
    {
      n: 1,
      kind: "start",
      vendor: "Hyderabad Hexane Traders",
      invoiceNo: "HHT/26-27/0442",
    },
    { n: 2, kind: "continued" },
    { n: 3, kind: "blank" },
    {
      n: 4,
      kind: "start",
      vendor: "Karnataka Tin Containers",
      invoiceNo: "KTC/26-27/1187",
    },
    { n: 5, kind: "continued" },
    { n: 6, kind: "uncertain" },
    { n: 7, kind: "continued" },
    {
      n: 8,
      kind: "start",
      vendor: "Sri Venkateswara Chemicals",
      invoiceNo: "SVC/26-27/0903",
    },
    { n: 9, kind: "continued" },
    { n: 10, kind: "continued" },
    { n: 11, kind: "continued" },
    { n: 12, kind: "continued" },
    { n: 13, kind: "continued" },
    { n: 14, kind: "continued" },
  ],
  starts: [1, 4, 8],
  suggestedStarts: [1, 4, 8],
  excluded: [3],
  autoExcluded: [3],
  uncertain: [6],
};
