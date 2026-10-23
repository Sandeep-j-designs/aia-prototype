import type { AgentProfile } from "@/types/pages/neo/agents";
import { NEO_AGENT, SKILLS } from "@/config/pages/neo/skills";

/**
 * Neo's agents (21 Oct 2026). The first is the live Three Way Recon agent
 * (config/pages/neo/skills.ts); the others are planned, drawn from the
 * product's modules — GST reconciliation, bank, vendor statements, TDS,
 * bills and receivables — so the directory shows where Neo is going.
 *
 * DEV: replace with GET /api/neo/agents?company=…
 */
export const RECON_AGENT_ID = NEO_AGENT.id;

export const MOCK_AGENTS: AgentProfile[] = [
  {
    id: NEO_AGENT.id,
    name: NEO_AGENT.name,
    category: "Reconciliation",
    status: "live",
    goal: NEO_AGENT.goal,
    output: "Match groups",
    sources: [
      { label: "Bank", from: "CSV" },
      { label: "Settlements", from: "CSV" },
      { label: "Books", from: "Tally" },
    ],
    access: "Read-only",
    skills: SKILLS.length,
    does: NEO_AGENT.may.slice(0, 3),
    never: NEO_AGENT.never.map((n) => n.text),
  },
  {
    id: "gstr-2b-itc",
    name: "GSTR-2B ITC agent",
    category: "Reconciliation",
    status: "beta",
    goal: "Matches your Purchase Register to GSTR-2B every month and tells you which ITC you can claim in GSTR-3B Table 4.",
    output: "Claimable ITC",
    sources: [
      { label: "Purchase Register", from: "Tally" },
      { label: "GSTR-2B", from: "GST portal" },
    ],
    access: "Read-only",
    skills: 4,
    does: [
      "Sorts every invoice into Fully Matched, AI Matched, Probable Match, Missing in Books or Missing in 2B",
      "Explains each mismatch: GSTIN, invoice number, date or tax amount",
      "Drafts the Table 4 figures for you to check",
    ],
    never: [
      "File a return or change a GSTR-3B figure",
      "Claim ITC on an invoice that isn't in 2B",
    ],
    eta: "Beta for selected clients",
  },
  {
    id: "bank-book",
    name: "Bank reconciliation agent",
    category: "Reconciliation",
    status: "coming-soon",
    goal: "Ticks your bank statement against the Tally bank book and leaves you a bank reconciliation statement with only the real differences.",
    output: "BRS",
    sources: [
      { label: "Bank statement", from: "CSV" },
      { label: "Bank book", from: "Tally" },
    ],
    access: "Read-only",
    skills: 3,
    does: [
      "Matches cheques, NEFT and UPI lines by reference and amount",
      "Lists cheques issued but not presented, and deposits not yet credited",
      "Names bank charges and interest that aren't in the books",
    ],
    never: ["Post a bank charge or interest entry for you"],
    eta: "Planned for November",
  },
  {
    id: "vendor-statement",
    name: "Vendor statement agent",
    category: "Reconciliation",
    status: "coming-soon",
    goal: "Reconciles a supplier's statement of account with their ledger in your books, and drafts the confirmation reply.",
    output: "Balance confirmation",
    sources: [
      { label: "Vendor statement", from: "PDF or Excel" },
      { label: "Purchase ledger", from: "Tally" },
      { label: "Payments", from: "Bank" },
    ],
    access: "Prepares, you approve",
    skills: 4,
    does: [
      "Matches bills, debit notes and payments line by line",
      "Flags bills the vendor has that you haven't booked",
      "Drafts a balance confirmation for you to send",
    ],
    never: ["Send anything to a vendor without your click"],
    eta: "Planned for December",
  },
  {
    id: "tds-26as",
    name: "TDS reconciliation agent",
    category: "Reconciliation",
    status: "coming-soon",
    goal: "Checks the TDS your customers deducted, as Form 26AS and AIS show it, against the TDS receivable in your books.",
    output: "TDS credit",
    sources: [
      { label: "Form 26AS", from: "TRACES" },
      { label: "AIS", from: "Income tax portal" },
      { label: "TDS receivable", from: "Tally" },
    ],
    access: "Read-only",
    skills: 3,
    does: [
      "Matches deductions by TAN, section and amount, quarter by quarter",
      "Lists credits missing from 26AS so you can chase the deductor",
      "Shows the credit you can take in the return",
    ],
    never: ["Change a TDS entry or file a return"],
    eta: "Planned for Q4",
  },
  {
    id: "bill-processing",
    name: "Bill processing agent",
    category: "Bookkeeping",
    status: "coming-soon",
    goal: "Reads vendor bills from the inbox, maps them to ledgers and GST, and prepares purchase vouchers for you to approve into Tally.",
    output: "Purchase vouchers",
    sources: [
      { label: "Bills", from: "Inbox" },
      { label: "Masters", from: "Tally" },
    ],
    access: "Prepares, you approve",
    skills: 5,
    does: [
      "Reads printed, scanned and handwritten bills",
      "Picks the ledger, GST rate and cost centre from your history",
      "Spots duplicates before they reach Tally",
    ],
    never: ["Post a voucher to Tally without your approval"],
    eta: "Planned for Q4",
  },
];

export const agentById = (id?: string) => MOCK_AGENTS.find((a) => a.id === id);
