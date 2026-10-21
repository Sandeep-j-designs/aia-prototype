import type {
  NeoAgent,
  NeoAgentRecipe,
  NeoAgentTrigger,
  NeoReadyAgent,
} from "@/types/pages/neo/agents";

/** How each trigger reads on a card and in the set-up chat. */
export const TRIGGER_LABEL: Record<NeoAgentTrigger, string> = {
  "bill-uploaded": "When a bill is uploaded",
  daily: "Daily",
  weekly: "Every Monday",
  monthly: "On the 1st of each month",
};

/**
 * Recommended agents: ideas Neo sets up with you in a conversation. Each one
 * flags or drafts; none of them approves.
 */
export const AGENT_RECIPES: NeoAgentRecipe[] = [
  {
    id: "validate-bills",
    name: "Validate vendor bills",
    agentName: "Bill validator",
    description:
      "Checks bills for duplicates, missing fields and GST issues before you post them.",
    icon: "bill-check",
    trigger: "bill-uploaded",
    permission: "flag",
    checks: [
      "Mandatory fields: invoice no., date, GSTIN, place of supply",
      "Duplicate invoice numbers for the same vendor",
      "GSTIN format and state against the place of supply",
    ],
  },
  {
    id: "find-duplicates",
    name: "Find duplicate invoices",
    agentName: "Duplicate finder",
    description:
      "Flags a bill that was already entered or appears twice in a batch.",
    icon: "duplicate",
    trigger: "bill-uploaded",
    permission: "flag",
    checks: [
      "Same vendor and invoice number as a posted bill",
      "Same amount and date from one vendor within 7 days",
      "Two copies of one file in a single upload",
    ],
  },
  {
    id: "bank-mismatches",
    name: "Review bank mismatches",
    agentName: "Bank mismatch review",
    description: "Lists bank lines that do not match your books.",
    icon: "bank",
    trigger: "daily",
    permission: "flag",
    checks: [
      "Bank lines with no matching voucher",
      "Receipts that settle part of an invoice",
      "Payments net of TDS",
    ],
  },
  {
    id: "receivables-summary",
    name: "Monthly receivables summary",
    agentName: "Receivables summary",
    description: "Summarises overdue customer invoices for review each month.",
    icon: "receivables",
    trigger: "monthly",
    permission: "draft",
    checks: [
      "Invoices past their due date, by customer",
      "Part payments and what remains",
      "Reminder drafts for the oldest, sent only when you say",
    ],
  },
  {
    id: "gst-on-bills",
    name: "Check GST on bills",
    agentName: "GST checker",
    description: "Looks for GSTIN and tax-rate problems on purchase bills.",
    icon: "gst",
    trigger: "bill-uploaded",
    permission: "flag",
    checks: [
      "Vendor GSTIN active and matching the bill",
      "IGST vs CGST + SGST against the place of supply",
      "Tax rate against the HSN/SAC",
    ],
  },
];

/** Built-in assistants: nothing to set up, each one starts a chat. */
export const READY_AGENTS: NeoReadyAgent[] = [
  {
    id: "invoice-assistant",
    name: "Invoice Assistant",
    description:
      "Drafts sales invoices from plain language and from purchases you re-bill.",
    prompt: "Create a sales invoice from a purchase",
  },
  {
    id: "payables-review",
    name: "Payables Review",
    description:
      "Checks purchase bills for vendors that are missing from your masters.",
    prompt: "Which vendors aren't in my masters?",
  },
  {
    id: "receivables-follow-up",
    name: "Receivables Follow-up",
    description:
      "Finds overdue and unpaid customer invoices and drafts reminders.",
    prompt: "Draft collection reminders",
  },
  {
    id: "ledger-search",
    name: "Ledger and Voucher Search",
    description:
      "Finds ledgers, groups and vouchers, and totals spend by vendor or month.",
    prompt: "How much did we spend with Mahindra Logistics in September?",
  },
  {
    id: "gst-review",
    name: "GST Review",
    description:
      "Checks tax treatment on invoices and flags input tax credit at risk.",
    prompt: "How much ITC is at risk this quarter?",
  },
];

const seed = (company: string): NeoAgent[] => [
  {
    id: `${company}-agent-bill-validator`,
    company,
    name: "Bill validator",
    description: AGENT_RECIPES[0].description,
    status: "draft",
    trigger: "bill-uploaded",
    permission: "flag",
    recipeId: "validate-bills",
    checks: AGENT_RECIPES[0].checks,
    lastRunAt: "2026-10-13T12:07:00+05:30",
    toReview: 5,
  },
  {
    id: `${company}-agent-tds`,
    company,
    name: "TDS deduction check",
    description:
      "Looks for contractor and professional bills where TDS was not deducted.",
    status: "scheduled",
    trigger: "daily",
    permission: "flag",
    checks: [
      "194C and 194J bills above the single and yearly limits",
      "Lower-deduction certificates and 194C(6) declarations",
    ],
    lastRunAt: "2026-10-10T11:11:00+05:30",
  },
];

/** DEV: GET /api/neo/agents?company=… */
export const MOCK_NEO_AGENTS: NeoAgent[] = [...seed("shakun"), ...seed("acme")];
