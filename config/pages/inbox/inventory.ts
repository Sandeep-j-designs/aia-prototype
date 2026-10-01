import type {
  Option,
  StockItemFormValues,
} from "@/types/pages/inbox/inventory";

/**
 * Inventory Masters static config, from production's
 * config/pages/inventory-masters/items.ts. The group/category/unit lists here
 * are production's fallbacks; the company's own come from the options
 * endpoint (see mock-inventory.ts).
 */

export const INVENTORY_ITEMS_TABS = {
  ITEMS: "items",
} as const;

export const STOCK_GROUP_OPTIONS: Option[] = [
  { label: "Primary", value: "primary" },
];

export const STOCK_CATEGORY_OPTIONS: Option[] = [
  { label: "Not Applicable", value: "not_applicable" },
];

export const STOCK_UNIT_OPTIONS: Option[] = [
  { label: "Not Applicable", value: "not_applicable" },
];

export const GST_APPLICABILITY_OPTIONS: Option[] = [
  { label: "Applicable", value: "applicable" },
  { label: "Not Applicable", value: "not_applicable" },
];

export const TAXABILITY_TYPE_OPTIONS: Option[] = [
  { label: "Taxable", value: "taxable" },
  { label: "Exempt", value: "exempt" },
  { label: "Nil Rated", value: "nil_rated" },
  { label: "Non-GST", value: "non_gst" },
];

export const TAX_TYPE_OPTIONS: Option[] = [
  { label: "IGST", value: "igst" },
  { label: "CGST + SGST/UTGST", value: "cgst_sgst_utgst" },
  { label: "Cess", value: "cess" },
];

export const CESS_VALUATION_TYPE_OPTIONS: Option[] = [
  { label: "Not Applicable", value: "not_applicable" },
  { label: "Based on Quantity", value: "based_on_quantity" },
  { label: "Based on Value", value: "based_on_value" },
  {
    label: "Based on Value and Quantity",
    value: "based_on_value_and_quantity",
  },
];

export const TYPE_OF_SUPPLY_OPTIONS: Option[] = [
  { label: "Goods", value: "goods" },
  { label: "Services", value: "services" },
  { label: "Capital Goods", value: "capital_goods" },
];

/** A function, not a constant, so "today" is today when the form opens. */
export const getStockItemFormDefaults = (): StockItemFormValues => ({
  name: "",
  underUuid: "primary",
  categoryUuid: "not_applicable",
  unitUuid: "not_applicable",

  gstApplicability: "applicable",
  setAlterGst: false,
  setAlterHsnSac: false,
  gstDetailSource: "company_or_stock_group",
  taxabilityType: "taxable",
  taxType: "",

  igstRate: "",
  cgstRate: "",
  sgstUgstRate: "",
  cessValuationType: "not_applicable",
  cessRatePercent: "",
  cessRatePerUnit: "",

  applicableDate: new Date(),
  applicableForReverseCharge: false,
  eligibleForInputTaxCredit: true,

  typeOfSupply: "goods",
  hsnSac: "",

  quantity: "",
  rate: "",
  perUnitLabel: "Not Applicable",
  openingBalanceValue: "",

  godownAllocations: [],
});

/** How long the simulated Tally sync takes. */
export const INVENTORY_SYNC_MS = 3000;
