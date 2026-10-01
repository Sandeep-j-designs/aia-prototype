import type { ColumnSizes } from "@/components/inbox/v2/table-sizing";

/**
 * Column limits for the Sales upload preview grid, under the Inbox's rule (see
 * ../TABLE-RESIZING.md): no column narrower than its header needs for the
 * label plus its sort and filter buttons.
 */

/**
 * The preview grid. Preferred widths are production's PREVIEW_COLUMNS
 * widths; minimums hold the header label and its buttons.
 */
export const PREVIEW_COLUMN_SIZES: ColumnSizes = {
  invoice_date: { min: 132, preferred: 132, max: 200 },
  reference_number: { min: 142, preferred: 148, max: 240 },
  customer_name: { min: 184, preferred: 190, max: 320 },
  voucher_type: { min: 120, preferred: 130, max: 200 },
  voucher_number: { min: 184, preferred: 184, max: 260 },
  due_date: { min: 110, preferred: 132, max: 200 },
  gstin: { min: 136, preferred: 150, max: 220 },
  place_of_supply: { min: 136, preferred: 150, max: 240 },
  cost_centre: { min: 112, preferred: 130, max: 220 },
  sales_ledger: { min: 160, preferred: 180, max: 260 },
  item_name: { min: 110, preferred: 210, max: 340 },
  hsn_sac: { min: 96, preferred: 100, max: 160 },
  quantity: { min: 96, preferred: 110, max: 160 },
  unit_rate: { min: 100, preferred: 120, max: 180 },
  item_amount: { min: 124, preferred: 132, max: 200 },
  ledger_name: { min: 120, preferred: 150, max: 260 },
  ledger_amount: { min: 132, preferred: 140, max: 200 },
  cgst_amount: { min: 128, preferred: 136, max: 200 },
  sgst_amount: { min: 168, preferred: 168, max: 220 },
  igst_amount: { min: 124, preferred: 132, max: 200 },
  tax_amount: { min: 150, preferred: 150, max: 220 },
  total_amount: { min: 150, preferred: 150, max: 220 },
  narration: { min: 110, preferred: 180, max: 360 },
  gst_registration: { min: 172, preferred: 220, max: 300 },
  row_status: { min: 136, preferred: 140, max: 200 },
};
