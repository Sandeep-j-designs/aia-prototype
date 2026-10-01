import type { ColumnSizes } from "@/components/inbox/v2/table-sizing";

/**
 * The Items table's column sizes, under the Inbox's rule (TABLE-RESIZING.md):
 * no minimum below what the header needs for its label and its sort and
 * filter buttons — 12px padding each side, the label, 4px gaps, 20px a button.
 */
export const ITEM_SIZES: ColumnSizes = {
  name: { min: 120, preferred: 300, max: 560 },
  sync: { min: 44, preferred: 48, max: 56 },
  under: { min: 112, preferred: 180, max: 320 },
  category: { min: 132, preferred: 170, max: 300 },
  unit: { min: 100, preferred: 130, max: 220 },
  openingStocks: { min: 152, preferred: 170, max: 260 },
};
