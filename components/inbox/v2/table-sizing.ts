/**
 * Automatic layouts adapt; manual layouts retain exact CSS-pixel widths.
 *
 * `min` is the floor for both, and no column may go below the width its header
 * needs to show in full: 12px left padding + label + 4px gap and 20px for each
 * sort/filter button + 12px right padding, plus a few px of slack for font
 * rendering. A header that truncates hides the name of what the column holds.
 */
export type ColumnSizes = Record<
  string,
  { min: number; preferred: number; max: number }
>;

export const COLUMN_SIZES: ColumnSizes = {
  File: { min: 180, preferred: 240, max: 600 },
  Source: { min: 116, preferred: 120, max: 200 },
  User: { min: 150, preferred: 200, max: 360 },
  Vendor: { min: 120, preferred: 160, max: 360 },
  "Voucher type": { min: 152, preferred: 160, max: 240 },
  "GST Registration": { min: 172, preferred: 180, max: 360 },
  Amount: { min: 120, preferred: 130, max: 220 },
  Received: { min: 168, preferred: 190, max: 280 },
  Status: { min: 140, preferred: 150, max: 220 },
};
/**
 * The Purchases register's bill columns, under the same rule: no minimum below
 * what the header needs for its label, sort and filter buttons.
 */
export const BILL_COLUMN_SIZES: ColumnSizes = {
  voucherNo: { min: 124, preferred: 128, max: 240 },
  invoiceNo: { min: 144, preferred: 150, max: 280 },
  party: { min: 110, preferred: 180, max: 400 },
  date: { min: 124, preferred: 136, max: 220 },
  due: { min: 130, preferred: 136, max: 220 },
  amount: { min: 154, preferred: 156, max: 240 },
  payment: { min: 142, preferred: 150, max: 240 },
  attachments: { min: 126, preferred: 128, max: 200 },
};
export const SELECT_WIDTH = 40;
/**
 * The kebab column. Fixed, like the checkbox: it holds one 32px button, so
 * there is nothing in it for extra width to do, and both bookends stay out of
 * the distribution below.
 */
export const ACTIONS_WIDTH = 78;
export const preferredWidths = (sizes: ColumnSizes) =>
  Object.fromEntries(
    Object.entries(sizes).map(([key, size]) => [key, size.preferred])
  );
export const DEFAULT_WIDTHS = preferredWidths(COLUMN_SIZES);
/*
  Every helper below takes the column map last and defaults it to the Inbox's,
  so the Inbox's calls read as they always did and other tables pass their own.
*/
export function clampWidth(
  column: string,
  value: number,
  sizes: ColumnSizes = COLUMN_SIZES
) {
  const size = sizes[column];
  return Math.round(
    Math.max(
      size.min,
      Math.min(size.max, Number.isFinite(value) ? value : size.preferred)
    )
  );
}
export function readWidths(
  value: unknown,
  sizes: ColumnSizes = COLUMN_SIZES
): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter(
        ([key, width]) =>
          Object.prototype.hasOwnProperty.call(sizes, key) &&
          typeof width === "number" &&
          Number.isFinite(width)
      )
      .map(([key, width]) => [key, clampWidth(key, width as number, sizes)])
  );
}
export function sizeColumns(
  shown: string[],
  available: number | null,
  manual: Record<string, number>,
  sizes: ColumnSizes = COLUMN_SIZES
): Record<string, number> {
  if (Object.keys(manual).length)
    return Object.fromEntries(
      shown.map((key) => [
        key,
        clampWidth(key, manual[key] ?? sizes[key].preferred, sizes),
      ])
    );
  const preferred = shown.reduce((sum, key) => sum + sizes[key].preferred, 0);
  const minimum = shown.reduce((sum, key) => sum + sizes[key].min, 0);
  const maximum = shown.reduce((sum, key) => sum + sizes[key].max, 0);
  const target = Math.round(
    Math.max(
      minimum,
      Math.min(
        maximum,
        available === null
          ? preferred
          : available - SELECT_WIDTH - ACTIONS_WIDTH
      )
    )
  );
  const growing = target >= preferred;
  const room = growing ? maximum - preferred : preferred - minimum;
  // Carry rounding across columns so exact fits never create a 1px scrollbar.
  let fractional = 0,
    allocated = 0;
  return Object.fromEntries(
    shown.map((key) => {
      const size = sizes[key];
      const capacity = growing
        ? size.max - size.preferred
        : size.preferred - size.min;
      fractional +=
        size.preferred + (room ? ((target - preferred) * capacity) / room : 0);
      const width = Math.round(fractional) - allocated;
      allocated += width;
      return [key, width];
    })
  );
}
