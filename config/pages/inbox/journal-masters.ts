/**
 * The masters behind the journal voucher's pickers.
 *
 * Lifted from Prototypes/Journals (config/pages/journal-voucher/mock-masters),
 * which is the screen this form is a port of — same constants, same names, so
 * the two prototypes cannot drift into offering different ledgers for the same
 * entry.
 *
 * GST registrations are NOT here. The Inbox already knows a company's branches
 * (see `companies` in components/inbox/v2/store), the list has a GST
 * Registration column reading off them, and the bulk Reassign panel writes to
 * them. A second source of branches would be a second answer to the same
 * question.
 *
 * DEV: in production these are three master endpoints —
 *   GET /api/ledgers              → LedgerAccount[]
 *   GET /api/cost-centre-classes  → CostCentreClass[]
 *   GET /api/cost-centres         → CostCentre[]
 * Replace this file and nothing else; every picker reads through it.
 */

export type LedgerAccount = { id: string; name: string; group: string };
export type CostCentreClass = { id: string; name: string };
export type CostCentre = { id: string; name: string; classId: string };

/**
 * Voucher types that post as debits and credits rather than against a party.
 *
 * Journal is the default and what the route selector means by "Journal", but
 * the design shows a live picker rather than a fixed label — a contra or a
 * debit note is the same two-sided entry with a different Tally type on it.
 */
export const JOURNAL_VOUCHER_TYPES = [
  "Journal",
  "Contra",
  "Debit Note",
  "Credit Note",
];

export const LEDGERS: LedgerAccount[] = [
  {
    id: "led-insurance-exp",
    name: "Insurance Expense A/c",
    group: "Indirect Expenses",
  },
  {
    id: "led-prepaid-insurance",
    name: "Prepaid Insurance A/c",
    group: "Current Assets",
  },
  {
    id: "led-marketing",
    name: "Marketing & Advertising A/c",
    group: "Indirect Expenses",
  },
  { id: "led-rent", name: "Rent A/c", group: "Indirect Expenses" },
  {
    id: "led-salaries",
    name: "Salaries & Wages A/c",
    group: "Indirect Expenses",
  },
  {
    id: "led-depreciation",
    name: "Depreciation A/c",
    group: "Indirect Expenses",
  },
  {
    id: "led-accum-dep",
    name: "Accumulated Depreciation A/c",
    group: "Fixed Assets",
  },
  {
    id: "led-audit-fees",
    name: "Audit Fees Payable A/c",
    group: "Current Liabilities",
  },
  {
    id: "led-provision-exp",
    name: "Provision for Expenses A/c",
    group: "Current Liabilities",
  },
  { id: "led-tds-payable", name: "TDS Payable A/c", group: "Duties & Taxes" },
  { id: "led-round-off", name: "Round Off A/c", group: "Indirect Expenses" },
  { id: "led-suspense", name: "Suspense A/c", group: "Suspense A/c" },
  // The Inbox seeds journals from documents the AI has already read, and those
  // land on plainer ledger names than the masters above. Kept so a seeded
  // voucher opens with its ledger selected rather than blank.
  { id: "led-bank-charges", name: "Bank Charges", group: "Indirect Expenses" },
  { id: "led-general-exp", name: "General Expenses", group: "Indirect Expenses" },
  { id: "led-bank", name: "Bank", group: "Bank Accounts" },
  { id: "led-cash", name: "Cash", group: "Cash-in-hand" },
  { id: "led-ap", name: "Accounts Payable", group: "Sundry Creditors" },
  { id: "led-ar", name: "Accounts Receivable", group: "Sundry Debtors" },
  { id: "led-sales", name: "Sales", group: "Direct Income" },
];

export const COST_CENTRE_CLASSES: CostCentreClass[] = [
  { id: "ccc-department", name: "Department" },
  { id: "ccc-region", name: "Region" },
  { id: "ccc-project", name: "Project" },
];

export const COST_CENTRES: CostCentre[] = [
  { id: "cc-sales", name: "Sales", classId: "ccc-department" },
  { id: "cc-operations", name: "Operations", classId: "ccc-department" },
  { id: "cc-finance", name: "Finance", classId: "ccc-department" },
  { id: "cc-south", name: "South Zone", classId: "ccc-region" },
  { id: "cc-west", name: "West Zone", classId: "ccc-region" },
  { id: "cc-apex", name: "Solvent Plant Expansion", classId: "ccc-project" },
];

/**
 * The Inbox's `Form` holds display strings throughout — `gst` is a branch name,
 * `ledger` is a ledger name — because that is what the list columns render and
 * what the bulk Reassign panel writes. Cost centres follow the same rule, so
 * these resolve a stored name back to the master behind it.
 */
export const costCentreByName = (name: string) =>
  COST_CENTRES.find((centre) => centre.name === name);
export const costCentreClassByName = (name: string) =>
  COST_CENTRE_CLASSES.find((klass) => klass.name === name);
