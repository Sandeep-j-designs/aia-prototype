import { SKILLS } from "@/config/pages/neo/skills";
import { getBankingState } from "@/hooks/pages/inbox/use-banking";
import { NANDHINI_ID } from "@/config/pages/neo/mock-recon";
import { getState } from "@/components/inbox/v2/store";
import type { NeoContext } from "@/types/pages/neo";
import { itcRisk, overdueInvoices } from "@/utils/pages/inbox/ai-calculations";
import { getGstState } from "@/hooks/pages/inbox/use-gst";
import { companyBrief, lakhs } from "@/hooks/pages/neo/use-firm-brief";
import { BRIEF_DEADLINE } from "@/config/pages/neo/mock-firm";

/**
 * The prompts Neo offers before you type, from what is on screen.
 *
 * Each one is one of Neo's four jobs — ask the books, change by rule, chase,
 * the day across clients — worked out from the data that is actually there:
 * a vendor whose open bills sit on a different ledger from their approved
 * ones, a vendor missing from masters, an overdue customer. Never a canned
 * example that would answer "nothing found".
 *
 * DEV: GET /api/neo/suggestions?context=… — the server knows the queue better.
 */
export const suggestionsFor = (context: NeoContext): string[] => {
  const s = getState();
  const items = s.items.filter(
    (x) => x.company === s.company && !x.priorVoucher
  );
  const item = items.find((x) => x.id === context.itemId);
  const open = items.filter((x) =>
    ["Needs Review", "Duplicate"].includes(x.status)
  );
  const bills = items.filter((x) => x.route === "AP" && x.form.party);
  const out: string[] = [];

  if (item) {
    if (item.route === "AP" && item.original.bill?.vendorMissing)
      out.push("Ask the vendor for their GSTIN");
    if (item.route === "AP" && item.form.party)
      out.push(`How much did we spend with ${item.form.party}?`);
    if (item.route === "AP")
      out.push("Create a sales invoice based on this purchase");
  } else {
    out.push("Enter a batch of bills with an instruction");
    out.push("What needs me today?");
  }

  // A vendor whose open bills sit on a different ledger from their approved
  // ones: the change-by-rule Neo is for.
  const ledgerOf = (x: (typeof bills)[number]) => x.form.lines[0]?.ledger;
  for (const x of open.filter((b) => b.route === "AP" && ledgerOf(b))) {
    const past = bills.filter(
      (b) => b.status === "Approved" && b.form.party === x.form.party
    );
    const counts = new Map<string, number>();
    past.forEach((b) =>
      counts.set(ledgerOf(b)!, (counts.get(ledgerOf(b)!) || 0) + 1)
    );
    const usual = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    if (usual && usual !== ledgerOf(x)) {
      out.push(
        `Move all ${x.form.party} bills from ${ledgerOf(x)} to ${usual}`
      );
      break;
    }
  }

  if (overdueInvoices(s.items, s.company).length)
    out.push("Who owes us money?");
  if (!item && open.some((x) => x.original.bill?.vendorMissing))
    out.push("Which vendors aren't in my masters?");
  const top = bills
    .filter((x) => x.status === "Approved")
    .reduce<Record<string, number>>((m, x) => {
      m[x.form.party] = (m[x.form.party] || 0) + x.amount;
      return m;
    }, {});
  const biggest = Object.entries(top).sort((a, b) => b[1] - a[1])[0]?.[0];
  if (biggest) out.push(`How much did we spend with ${biggest} in September?`);

  return [...new Set(out)].slice(0, 4);
};

export type TodayItem = {
  id: string;
  /** The finding, in the accountant's words: "₹7.4L overdue at Sahyadri". */
  text: string;
  /** The one fact that makes it matter. */
  detail: string;
  /** The request that works on it; a request the planner handles. */
  prompt: string;
  tone: "negative" | "notice" | "neutral";
};

/**
 * Neo's home leads with today's work, not with Neo's verbs: what the books
 * show needs doing at this client, each one a request Neo answers. Worked
 * out from the same stores as the brief, so a figure here is the figure the
 * screen shows. At most four, most pressing first.
 *
 * DEV: GET /api/neo/today?company=… — the brief's signals for one client.
 */
export const todayFor = (company: string): TodayItem[] => {
  const s = getState();
  const items = s.items.filter((x) => x.company === company && !x.priorVoucher);
  const out: TodayItem[] = [];
  const due = new Date(
    `${BRIEF_DEADLINE.due}T00:00:00+05:30`
  ).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

  // A POS client with a month of bank lines no run has coded yet.
  const uncoded = getBankingState(company).transactions.filter(
    (t) => !t.paymentType
  ).length;
  if (company === NANDHINI_ID && uncoded)
    out.push({
      id: "recon",
      text: `${uncoded} September bank lines not reconciled`,
      detail: "POS, Zomato, Swiggy and card settlements against HDFC ·0418",
      prompt: "Reconcile September for Nandhini Deluxe",
      tone: "notice",
    });

  const q2 = Object.entries(getGstState(company).invoices)
    .filter(([m]) => m >= "2026-07" && m <= "2026-09")
    .flatMap(([, rows]) => rows);
  const itc = itcRisk(q2);
  if (itc.total > 0)
    out.push({
      id: "itc",
      text: `${lakhs(itc.total)} of Q2 ITC at risk`,
      detail: `${itc.missingCount + itc.probableCount} invoices not cleanly in 2B · GSTR-3B due ${due}`,
      prompt: "How much ITC is at risk in Q2?",
      tone: "negative",
    });

  // A vendor whose open bills sit on another ledger than their approved ones.
  const bills = items.filter((x) => x.route === "AP" && x.form.party);
  const ledgerOf = (x: (typeof bills)[number]) => x.form.lines[0]?.ledger;
  for (const vendor of new Set(bills.map((b) => b.form.party))) {
    const mine = bills.filter((b) => b.form.party === vendor);
    const counts = new Map<string, number>();
    mine
      .filter((b) => b.status === "Approved" && ledgerOf(b))
      .forEach((b) =>
        counts.set(ledgerOf(b)!, (counts.get(ledgerOf(b)!) || 0) + 1)
      );
    const usual = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    const off = mine.filter(
      (b) =>
        ["Needs Review", "Duplicate"].includes(b.status) &&
        ledgerOf(b) &&
        ledgerOf(b) !== usual
    );
    if (usual && off.length) {
      const from = ledgerOf(off[0])!;
      out.push({
        id: "ledger",
        text: `${off.length} ${vendor.replace(/ (Pvt )?Ltd$/, "")} bill${off.length === 1 ? " sits" : "s sit"} on ${from}`,
        detail: `${counts.get(usual)} approved ones went to ${usual}`,
        prompt: `Move all ${vendor} bills from ${from} to ${usual}`,
        tone: "notice",
      });
      break;
    }
  }

  const overdue = overdueInvoices(s.items, company);
  if (overdue.length) {
    const sum = overdue.reduce((n, r) => n + r.outstanding, 0);
    const oldest = overdue.reduce((a, b) => (b.days > a.days ? b : a));
    out.push({
      id: "overdue",
      text: `${lakhs(sum)} overdue`,
      detail: `Oldest ${oldest.days} days, ${oldest.item.form.party}`,
      prompt: "Who owes us money?",
      tone: "notice",
    });
  }

  const missing = items.filter(
    (x) =>
      x.route === "AP" &&
      ["Needs Review", "Duplicate"].includes(x.status) &&
      x.original.bill?.vendorMissing
  );
  if (missing.length)
    out.push({
      id: "masters",
      text: `${missing.length} open bill${missing.length === 1 ? " is" : "s are"} from vendors not in your masters`,
      detail: "Approving creates the vendor in Tally, which needs their GSTIN",
      prompt: "Which vendors aren't in my masters?",
      tone: "notice",
    });

  const needs = (companyBrief(company)?.signals || []).filter(
    (x) => x.tone !== "neutral"
  ).length;
  if (needs)
    out.push({
      id: "brief",
      text: `${needs} thing${needs === 1 ? "" : "s"} need${needs === 1 ? "s" : ""} you here`,
      detail: `Before GSTR-3B on ${due}`,
      prompt: "What needs me today?",
      tone: "neutral",
    });

  return out.slice(0, 4);
};

/**
 * Everything Neo can do, as requests it handles, grouped by the work they
 * belong to. Shown on the home under "What can Neo do?" — the place to
 * learn Neo's range without it standing between the person and today's
 * work.
 */
export const NEO_EXAMPLE_GROUPS: { label: string; prompts: string[] }[] = [
  {
    label: "Ask the books",
    prompts: [
      "How much did we spend with Mahindra Logistics last month?",
      "What did we spend on freight this quarter?",
      "Who are my top vendors this FY?",
      "Why is freight up in September?",
    ],
  },
  {
    label: "GST and compliance",
    prompts: [
      "How much ITC is at risk in Q2?",
      "Which vendors aren't in my masters?",
      "What needs me today?",
    ],
  },
  {
    label: "Entry",
    prompts: [
      "Enter a batch of bills with an instruction",
      "Move all Mahindra Logistics bills from Transportation to Freight Inward",
      "Create a sales invoice from a purchase",
      "Book depreciation on office equipment",
    ],
  },
  {
    label: "Receivables and chasing",
    prompts: [
      "Who owes us money?",
      "Draft collection reminders",
      "Ask the vendor for their GSTIN",
    ],
  },
  {
    label: "Agents",
    prompts: [
      "Set up the Bill validator to run automatically",
      "Set up document collection",
    ],
  },
];

/**
 * The four starting points on Neo's home, one per kind of work: ask the
 * books, enter a batch, draft a document, set up an agent. Each one is a
 * request the planner already handles; the icon is named, not imported, so
 * this stays config.
 */
export const HOME_PROMPTS: {
  label: string;
  icon: "search" | "upload" | "invoice" | "agent";
}[] = [
  { label: "Find unpaid invoices", icon: "search" },
  { label: "Upload purchase bills", icon: "upload" },
  { label: "Create an invoice", icon: "invoice" },
  { label: "Create an agent", icon: "agent" },
];

/**
 * Slash commands in Neo's prompt box: one per kind of work, each filling in
 * the start of a request the planner already handles. Picking one leaves the
 * caret at the end, so "/spend" becomes "How much did we spend with ▍".
 */
/** The / menu: every skill, by its slash (see config/pages/neo/skills.ts). */
export const NEO_COMMANDS: { cmd: string; label: string; prompt: string }[] =
  SKILLS.map((k) => ({ cmd: k.slash, label: k.name, prompt: k.prompt }));
