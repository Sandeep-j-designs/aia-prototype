/**
 * The masters behind the sales invoice's pickers.
 *
 * Income ledgers, not expense ones — that is the whole distinction between
 * this form and the bill sheet. A line on a sales invoice credits revenue; the
 * same line read from the other side debits a cost. Offering one chart to both
 * is how "Cloud Services" ends up on an invoice we issued.
 *
 * DEV: two master endpoints in production —
 *   GET /api/ledgers?type=income  → income ledgers
 *   GET /api/customers            → customer typeahead
 * Both should be typeaheads rather than fixed lists; a real chart of accounts
 * and a real customer book are far too long for a <select>. Production already
 * has components/common/combobox-with-lazy-loading for exactly this.
 */

export const INCOME_LEDGERS = [
  "Sales - Edible Oil 5%",
  "Sales - De-oiled Cake",
  "Sales - Acid Oil",
  "Sales — Freight Recovered",
  "Service Income",
  "Commission Income",
  "Scrap Sales",
  "Other Income",
];

/**
 * Customers already in masters. A customer absent from this list is what
 * `customerMissing` on the extracted invoice marks — approving proposes
 * creating it, the same way the bill sheet handles an unknown vendor.
 */
export const CUSTOMERS = [
  "Annapoorna Wholesale",
  "Chennai Oil Depot",
  "Hotel Mayura Group",
  "Malabar Foods",
  "Reliance Retail Ltd",
  "Spar Hypermarket",
  "Sri Lakshmi Traders",
  "Tata Projects Ltd",
  "Vijaya Provisions",
];

/**
 * Voucher types that post against a customer. Sales is the default and what
 * the AR route means; a credit note is the same document reversed, and both
 * belong to the receivable side.
 */
export const AR_VOUCHER_TYPES = ["Sales", "Credit Note", "Receipt"];

/**
 * Stock items, for Item Mode's `Item` column.
 *
 * DEV: GET /api/inventory/items. A typeahead in production — the design's cell
 * reads "Type or Select Item", which is a combobox, not a picker.
 */
export const STOCK_ITEMS = [
  "Refined Sunflower Oil — 15 L Tin",
  "Refined Sunflower Oil — 1 L Pouch",
  "Refined Groundnut Oil — 15 L Tin",
  "Refined Palmolein — 15 kg Tin",
  "Rice Bran Oil — 1 L Pouch",
  "Kachi Ghani Mustard Oil — 1 L",
  "De-oiled Cake — Sunflower",
];

/** DEV: GET /api/inventory/godowns. */
export const GODOWNS = [
  "Main Location",
  "Factory - Harihar",
  "Warehouse - Peenya",
  "Depot - Mysuru",
];

/**
 * GST rates as saved tax ledgers. Each line picks one, and the Taxes table
 * below totals what they come to.
 *
 * DEV: GET /api/taxes. These are saved tax objects in Tally, not bare rates —
 * which is why the column is "Select a Tax" and not a percentage field.
 */
export const TAXES = [
  "GST 0%",
  "GST 5%",
  "GST 18%",
  "GST 40%",
  "Exempt",
  "Nil Rated",
];

/** The tax ledgers the Taxes table posts to. */
export const TAX_LEDGERS = [
  "Output CGST",
  "Output SGST",
  "Output IGST",
  "Output Cess",
  "Round Off",
];
