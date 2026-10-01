/**
 * Unified Inbox — conversion static config.
 *
 * The ledger and party option lists the conversion panel offers. These are
 * placeholders standing in for the real masters.
 *
 * DEV: replace all three with lookups —
 *   INCOME_LEDGERS / EXPENSE_LEDGERS → GET /api/accounting-masters/ledgers?type=
 *   EXISTING_PARTIES                 → GET /api/customers  |  GET /api/vendors
 * All three should be typeaheads, not fixed lists — a real chart of accounts is
 * far too long for a <select>. Production already has
 * components/common/combobox-with-lazy-loading for exactly this.
 */

export const INCOME_LEDGERS = [
  "Sales Income — Services",
  "Sales Income — Goods",
  "Other Income",
];

export const EXPENSE_LEDGERS = [
  "Pass-through Expense",
  "Cost of Sales",
  "Other Expenses",
];

export const EXISTING_PARTIES = [
  "Annapoorna Wholesale",
  "Hotel Mayura Group",
  "Sri Lakshmi Traders",
];

/**
 * The company's own GST registration, used to decide whether a conversion
 * crosses a filed period.
 *
 * DEV: source from the active company — GET /api/organisations/current.
 */
export const BANK_ACCOUNT_LABEL = "HDFC 50100123456";
