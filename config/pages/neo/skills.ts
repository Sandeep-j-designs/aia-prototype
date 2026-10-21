import { NANDHINI_ID } from "@/config/pages/neo/mock-recon";

/**
 * What Neo knows how to do (20 Oct 2026). Neo has no agents: it has skills,
 * each a piece of accounting work it does in the chat and hands back for a
 * sign-off. Some can also run on their own (on upload, daily); those were
 * the "agents", and they're the same skill with "Runs automatically" on.
 *
 * One list feeds the Skills page and the prompt box's / menu, so the slash
 * a person sees on the page is the one that works in the chat.
 *
 * DEV: GET /api/neo/skills?company=… (availability, learned rules and
 * automatic runs come back per company).
 */
export type SkillGroup =
  | "Reconcile"
  | "Enter"
  | "Collect and chase"
  | "Check"
  | "Ask the books";

export const SKILL_GROUPS: SkillGroup[] = [
  "Reconcile",
  "Enter",
  "Collect and chase",
  "Check",
  "Ask the books",
];

export type NeoSkill = {
  id: string;
  /** Typed after / in the prompt box. */
  slash: string;
  name: string;
  group: SkillGroup;
  /** One line: what it does, outcome first. */
  does: string;
  /** What it works from. */
  needs: string;
  /** The request that runs it. */
  prompt: string;
  /** Put in the prompt box rather than sent, when it needs finishing. */
  prefill?: boolean;
  /**
   * It can run on its own. `recipe` is the set-up it starts from; `agentId`
   * is a company's automatic run made outside the recipes.
   */
  auto?: { recipe?: string; agentSuffix?: string; collection?: true };
  /** Only some clients can use it: the reason, when this one can't. */
  onlyFor?: (company: string) => string | undefined;
};

const POS_ONLY = (company: string) =>
  company === NANDHINI_ID
    ? undefined
    : "For clients selling through POS and platforms: Nandhini Deluxe";

export const SKILLS: NeoSkill[] = [
  {
    id: "recon",
    slash: "recon",
    name: "Three-way reconciliation",
    group: "Reconcile",
    does: "Proves POS sales against settlement reports and the bank, then drafts the vouchers.",
    needs: "POS day-end, card, UPI and platform settlements, bank statement",
    prompt: "Reconcile September",
    onlyFor: POS_ONLY,
  },
  {
    id: "close",
    slash: "close",
    name: "Close a reconciled month",
    group: "Reconcile",
    does: "Checks what was open at month-end against the next statement, settles suspense, closes the period.",
    needs: "The next month's first statement",
    prompt: "Close September with the 1–7 Oct statement",
    onlyFor: POS_ONLY,
  },
  {
    id: "bills",
    slash: "bills",
    name: "Batch bill entry",
    group: "Enter",
    does: "Reads a batch of bills and drafts every voucher from one instruction.",
    needs: "Bills (PDF or image) and what they don't say",
    prompt: "Enter a batch of bills with an instruction",
  },
  {
    id: "invoice",
    slash: "invoice",
    name: "Sales invoice from a purchase",
    group: "Enter",
    does: "Re-bills a purchase to a customer at cost or a markup, GST worked out.",
    needs: "A purchase bill and the customer",
    prompt: "Create a sales invoice from a purchase",
  },
  {
    id: "journal",
    slash: "journal",
    name: "Journal entry",
    group: "Enter",
    does: "Books provisions, accruals and depreciation as a balanced draft.",
    needs: "What it's for and the amount",
    prompt: "Book a journal",
  },
  {
    id: "move",
    slash: "move",
    name: "Move bills by rule",
    group: "Enter",
    does: "Moves a vendor's bills to another ledger or cost centre, all in one sign-off.",
    needs: "The vendor and where they go",
    prompt: "Move all ",
    prefill: true,
  },
  {
    id: "collect",
    slash: "collect",
    name: "Document collection",
    group: "Collect and chase",
    does: "Collects supplier bills from email, WhatsApp and Drive and prepares drafts.",
    needs: "A forwarding address, WhatsApp or a Drive folder",
    prompt: "Set up document collection",
    auto: { collection: true },
  },
  {
    id: "chase",
    slash: "chase",
    name: "Chase a vendor",
    group: "Collect and chase",
    does: "Asks a vendor for a GSTIN, a clearer copy or a credit note, and tracks the reply.",
    needs: "A bill",
    prompt: "Ask the vendor for their GSTIN",
  },
  {
    id: "remind",
    slash: "remind",
    name: "Collection reminders",
    group: "Collect and chase",
    does: "Drafts reminders for overdue customer invoices; sends only when you say.",
    needs: "Approved invoices past their due date",
    prompt: "Draft collection reminders",
  },
  {
    id: "validate",
    slash: "validate",
    name: "Bill validation",
    group: "Check",
    does: "Flags bills with missing fields, duplicate numbers or GST problems before you post.",
    needs: "Purchase bills",
    prompt: "Set up the Bill validator to run automatically",
    auto: { recipe: "validate-bills" },
  },
  {
    id: "duplicates",
    slash: "duplicates",
    name: "Duplicate check",
    group: "Check",
    does: "Flags a bill already entered, or two copies in one upload.",
    needs: "Purchase bills",
    prompt: "Set up the Duplicate finder to run automatically",
    auto: { recipe: "find-duplicates" },
  },
  {
    id: "gst",
    slash: "gst",
    name: "GST check on bills",
    group: "Check",
    does: "Checks GSTIN, IGST against CGST + SGST, and the rate against the HSN.",
    needs: "Purchase bills",
    prompt: "Set up the GST checker to run automatically",
    auto: { recipe: "gst-on-bills" },
  },
  {
    id: "tds",
    slash: "tds",
    name: "TDS check",
    group: "Check",
    does: "Finds contractor and professional bills where TDS wasn't deducted.",
    needs: "Purchase bills and the year's totals per vendor",
    prompt: "Edit agent TDS deduction check",
    auto: { agentSuffix: "-agent-tds" },
  },
  {
    id: "bank",
    slash: "bank",
    name: "Bank mismatch review",
    group: "Check",
    does: "Lists bank lines with no voucher, part settlements and payments net of TDS.",
    needs: "Bank statements in Banking",
    prompt: "Set up the Bank mismatch review to run automatically",
    auto: { recipe: "bank-mismatches" },
  },
  {
    id: "spend",
    slash: "spend",
    name: "Spend and totals",
    group: "Ask the books",
    does: "Totals spend by vendor, ledger or topic for any period, with its sources.",
    needs: "Nothing: it reads your books",
    prompt: "How much did we spend with ",
    prefill: true,
  },
  {
    id: "owes",
    slash: "owes",
    name: "Who owes us",
    group: "Ask the books",
    does: "Lists overdue customer invoices, oldest first, with part payments.",
    needs: "Nothing: it reads your books",
    prompt: "Who owes us money?",
  },
  {
    id: "masters",
    slash: "masters",
    name: "Vendors not in masters",
    group: "Ask the books",
    does: "Finds open bills from vendors Tally doesn't know yet.",
    needs: "Nothing: it reads your books",
    prompt: "Which vendors aren't in my masters?",
  },
  {
    id: "today",
    slash: "today",
    name: "What needs me today",
    group: "Ask the books",
    does: "This client's deadline, ITC at risk, bills waiting and chases, in order.",
    needs: "Nothing: it reads your books",
    prompt: "What needs me today?",
  },
];

export const skillById = (id: string) => SKILLS.find((s) => s.id === id);
