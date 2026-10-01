import type { ColumnSizes } from "@/components/inbox/v2/table-sizing";

/**
 * Banking's column sizes, under the Inbox's rule (TABLE-RESIZING.md): no
 * column's minimum sits below what its header needs to show its label and its
 * sort and filter buttons in full — 12px padding each side, the label, 4px
 * gaps and 20px per button.
 */

/**
 * The bank list has no checkbox column, but the resize hook always reserves
 * SELECT_WIDTH for one. Sr No takes that 40px on top of its own 32px, so the
 * columns still add up to the table's width exactly.
 */
export const SR_NO_EXTRA = 32;

export const BANK_LIST_SIZES: ColumnSizes = {
  srNo: { min: SR_NO_EXTRA, preferred: SR_NO_EXTRA, max: SR_NO_EXTRA },
  ledgerName: { min: 150, preferred: 280, max: 520 },
  accountType: { min: 160, preferred: 180, max: 280 },
  bankName: { min: 110, preferred: 200, max: 340 },
  unreconciledCount: { min: 130, preferred: 190, max: 280 },
};

export const TRANSACTION_SIZES: ColumnSizes = {
  date: { min: 112, preferred: 124, max: 180 },
  sync: { min: 44, preferred: 48, max: 56 },
  gst: { min: 152, preferred: 196, max: 300 },
  voucherNo: { min: 124, preferred: 164, max: 240 },
  description: { min: 160, preferred: 300, max: 640 },
  type: { min: 112, preferred: 156, max: 240 },
  ledger: { min: 112, preferred: 220, max: 400 },
  amount: { min: 124, preferred: 150, max: 220 },
};

/**
 * Statement Logs keeps the 40px slot for a file glyph, the one the upload
 * sheet draws beside each statement.
 */
export const STATEMENT_SIZES: ColumnSizes = {
  period: { min: 134, preferred: 210, max: 280 },
  fileName: { min: 140, preferred: 320, max: 640 },
  account: { min: 120, preferred: 240, max: 400 },
  status: { min: 112, preferred: 180, max: 260 },
};
