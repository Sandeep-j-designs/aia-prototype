import type { SplitPage, SplitPlan } from "@/types/pages/inbox/bill-splitter";

/** The downstream extraction limit — per bill, not per packet (PRD). */
export const BILL_PAGE_LIMIT = 12;
/** The most pages a packet may carry through the split path (PRD). */
export const PACKET_PAGE_LIMIT = 1000;

const sorted = (values: number[]) => [...new Set(values)].sort((a, b) => a - b);

export type SplitGroup = {
  /** Page the bill starts on. */
  start: number;
  end: number;
  /** Every page from start to end, excluded ones included. */
  pages: number[];
  /** The pages that go into the bill. */
  kept: number[];
};

/** Every page sits in the bill whose start it follows. */
export const groupsOf = (plan: SplitPlan): SplitGroup[] => {
  const starts = sorted(plan.starts);
  const last = plan.pages.length;
  return starts.map((start, i) => {
    const end = i + 1 < starts.length ? starts[i + 1] - 1 : last;
    const pages = Array.from({ length: end - start + 1 }, (_, k) => start + k);
    return {
      start,
      end,
      pages,
      kept: pages.filter((n) => !plan.excluded.includes(n)),
    };
  });
};

/** The groups that become bills — a group left with no pages makes nothing. */
export const billsOf = (plan: SplitPlan) =>
  groupsOf(plan).filter((group) => group.kept.length > 0);

/**
 * A bill over the limit is created as ordered parts of the same bill rather
 * than refused: a long invoice is still one invoice (PRD).
 */
export const partsOf = (kept: number[]) => {
  const parts: number[][] = [];
  for (let i = 0; i < kept.length; i += BILL_PAGE_LIMIT)
    parts.push(kept.slice(i, i + BILL_PAGE_LIMIT));
  return parts;
};

/** "1–2, 4" — pages as a reader would say them. */
export const pageRange = (pages: number[]) => {
  const runs: string[] = [];
  let from = pages[0];
  let prev = pages[0];
  pages.slice(1).forEach((n) => {
    if (n === prev + 1) {
      prev = n;
      return;
    }
    runs.push(from === prev ? `${from}` : `${from}–${prev}`);
    from = prev = n;
  });
  if (pages.length) runs.push(from === prev ? `${from}` : `${from}–${prev}`);
  return runs.join(", ");
};

/**
 * What still stands between the plan and Create. Page coverage is exact by
 * construction (see SplitPlan), so what is left is the unanswered boundaries
 * and a plan that has nothing in it.
 */
export const blockersOf = (plan: SplitPlan) => {
  const blockers: string[] = [];
  if (plan.uncertain.length)
    blockers.push(
      plan.uncertain.length === 1
        ? `Page ${plan.uncertain[0]} needs an answer`
        : `${plan.uncertain.length} pages need an answer`
    );
  if (!billsOf(plan).length) blockers.push("Every page is left out");
  return blockers;
};

/** The first page of the packet always starts the first bill. */
const firstPage = (plan: SplitPlan) => plan.pages[0]?.n ?? 1;

export type SplitEdit =
  | { type: "split"; page: number }
  | { type: "merge"; page: number }
  | { type: "exclude"; page: number }
  | { type: "restore"; page: number }
  | { type: "answer"; page: number; startsNewBill: boolean };

export const applyEdit = (plan: SplitPlan, edit: SplitEdit): SplitPlan => {
  const { page } = edit;
  const settle = plan.uncertain.filter((n) => n !== page);
  switch (edit.type) {
    // Splitting or merging at a page answers its question too — it is the
    // same decision, made from the boundary instead of from the prompt.
    case "split":
      return {
        ...plan,
        starts: sorted([...plan.starts, page]),
        uncertain: settle,
      };
    case "merge":
      if (page === firstPage(plan)) return plan;
      return {
        ...plan,
        starts: plan.starts.filter((n) => n !== page),
        uncertain: settle,
      };
    case "answer":
      return {
        ...plan,
        starts: edit.startsNewBill
          ? sorted([...plan.starts, page])
          : plan.starts.filter((n) => n !== page || n === firstPage(plan)),
        uncertain: settle,
      };
    case "exclude":
      return { ...plan, excluded: sorted([...plan.excluded, page]) };
    case "restore":
      return { ...plan, excluded: plan.excluded.filter((n) => n !== page) };
  }
};

/** Where a cut came from, as the PRD asks it to be labelled. */
export const cutOrigin = (plan: SplitPlan, page: number) => {
  const on = plan.starts.includes(page);
  const suggested = plan.suggestedStarts.includes(page);
  if (on) return suggested ? "suggested" : "added";
  return suggested ? "removed" : null;
};

/*
  File names, as Bill Upload derives them: the vendor's first three letters
  and the invoice number, made safe for a file name — KAV-KF-26-27-0101. Two
  bills that derive the same name are numbered the way a folder numbers a
  duplicate, in document order, until someone renames one.
*/
const fileSafe = (text?: string) =>
  (text || "").replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
const vendorCode = (vendor?: string) =>
  (vendor || "")
    .replace(/[^A-Za-z]/g, "")
    .slice(0, 3)
    .toUpperCase() || "VEN";

const derivedName = (page?: SplitPage) =>
  page?.name
    ? page.name
    : `${vendorCode(page?.vendor)}-${fileSafe(page?.invoiceNo) || "number"}`;

/** Each bill's name without ".pdf", keyed by the page it starts on. */
export const billNames = (plan: SplitPlan) => {
  const seen = new Map<string, number>();
  const names = new Map<number, string>();
  billsOf(plan).forEach((group) => {
    const base = fileSafe(derivedName(plan.pages[group.start - 1])) || "bill";
    const key = base.toLowerCase();
    const n = seen.get(key) || 0;
    seen.set(key, n + 1);
    names.set(group.start, n ? `${base}(${n})` : base);
  });
  return names;
};

/** The files Create makes: one per bill, or one per part of a long bill. */
export const outputFiles = (plan: SplitPlan) => {
  const names = billNames(plan);
  return billsOf(plan).flatMap((group) => {
    const page = plan.pages[group.start - 1];
    const parts = partsOf(group.kept);
    const base = names.get(group.start) || "bill";
    return parts.map((pages, k) => ({
      fileName:
        parts.length > 1
          ? `${base} (part ${k + 1} of ${parts.length}).pdf`
          : `${base}.pdf`,
      pages,
      vendor: page?.vendor,
      invoiceNo: page?.invoiceNo,
    }));
  });
};

/** A bill's name, set by the accountant; empty puts the derived one back. */
export const renameBill = (
  plan: SplitPlan,
  start: number,
  name: string
): SplitPlan => ({
  ...plan,
  pages: plan.pages.map((page) =>
    page.n === start ? { ...page, name: name.trim() || undefined } : page
  ),
});

/** Boundaries the accountant drew, as opposed to ones detection proposed. */
export const manualStarts = (plan: SplitPlan) =>
  plan.starts.filter((n) => !plan.suggestedStarts.includes(n));

/** "Pages 1–2", "Page 7" — Bill Upload's range label. */
export const rangeLabel = (pages: number[]) =>
  `${pages.length === 1 ? "Page" : "Pages"} ${pageRange(pages)}`;

/* ------------------------------------------------------------- detection

   Real PDFs are read in the browser — prototype only. The PRD's signals are
   an invoice heading, an invoice number, and who the supplier is: a page with
   a heading and a number that differs from the page before is where a bill
   starts; a heading without a number is a boundary a person has to settle.

   DEV: detection runs server-side in production. Replace detectPlan with
   the plan returned by POST /bill-splits. */

export type PageFacts = {
  heading: boolean;
  invoiceNo: string | null;
  vendor: string | null;
  empty: boolean;
  blank: boolean;
};

/** Letter-spaced mastheads ("T A X  I N V O I C E") are closed up first. */
const deSpace = (line: string) =>
  line.replace(/(?:\b[A-Za-z]\s){3,}[A-Za-z]\b/g, (m) => m.replace(/\s+/g, ""));
const RE_REF =
  /\b(?:invoice|bill|inv)\s*(?:no\.?|number|num|#)\s*[:\-.]?\s*([A-Za-z0-9][A-Za-z0-9/-]{2,})/gi;
const isDocType = (line: string) =>
  /^(taxinvoice|billofsupply|proformainvoice|invoice)$/i.test(
    line.replace(/\s+/g, "")
  );

/** One page's text, as lines in reading order, reduced to the signals. */
export const factsFromLines = (lines: string[], blank: boolean): PageFacts => {
  const clean = lines.map(deSpace);
  const top = clean.slice(0, 16).join(" \n ");
  const flat = top.replace(/\s+/g, "").toLowerCase();
  const refs = [...top.matchAll(RE_REF)].map((m) => m[1]);
  const loose = top.match(/\b([A-Z]{2,6}[-/][A-Za-z0-9/-]*\d[A-Za-z0-9/-]*)\b/);
  return {
    heading: /taxinvoice|billofsupply|proformainvoice|invoice/.test(flat),
    invoiceNo: refs.find((r) => /\d/.test(r)) || loose?.[1] || refs[0] || null,
    vendor:
      clean
        .map((l) => l.replace(/\s+/g, " ").trim())
        .find(
          (l) =>
            l.length > 3 &&
            l.length < 70 &&
            !/^[\d₹]/.test(l) &&
            !/^invoice\b/i.test(l) &&
            !isDocType(l)
        ) || null,
    empty: !lines.length,
    blank,
  };
};

/**
 * Boundaries read off the pages. A scan carries no text, so with nothing to
 * read this falls back to an even proposal and leaves one boundary open —
 * a guess has to say it is one.
 */
export const detectPlan = (facts: PageFacts[]): SplitPlan => {
  const count = facts.length;
  const blank = facts.flatMap((f, i) => (f.blank ? [i + 1] : []));
  const readable = facts.some((f) => !f.empty);
  const starts = [1];
  const uncertain: number[] = [];

  if (readable) {
    let lastRef: string | null = facts[0]?.invoiceNo ?? null;
    facts.forEach((f, i) => {
      const n = i + 1;
      if (n === 1 || f.blank || !f.heading) return;
      if (f.invoiceNo && f.invoiceNo !== lastRef) {
        starts.push(n);
        lastRef = f.invoiceNo;
      } else if (!f.invoiceNo) uncertain.push(n);
    });
  } else {
    const bills = count >= 9 ? 3 : count >= 4 ? 2 : 1;
    for (let b = 1; b < bills; b++) {
      let n = Math.round((b * count) / bills) + 1;
      while (n <= count && blank.includes(n)) n++;
      if (n <= count && !starts.includes(n)) starts.push(n);
    }
    starts.sort((a, b) => a - b);
    const open = starts[1] ? starts[1] + 1 : 0;
    if (open && open <= count && !blank.includes(open)) uncertain.push(open);
  }

  const pages: SplitPage[] = facts.map((f, i) => {
    const n = i + 1;
    return {
      n,
      kind: f.blank
        ? "blank"
        : starts.includes(n)
          ? "start"
          : uncertain.includes(n)
            ? "uncertain"
            : "continued",
      vendor: f.vendor ?? undefined,
      invoiceNo: f.invoiceNo ?? undefined,
    };
  });
  return {
    pages,
    starts,
    suggestedStarts: [...starts],
    excluded: blank,
    autoExcluded: [...blank],
    uncertain,
  };
};
