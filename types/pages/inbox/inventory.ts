/**
 * Inventory Masters contracts, camelCase as the API returns them.
 *
 * Mirrors production's types/pages/inventory-masters/index.ts (same names,
 * same unions) plus `AllocationLike` from types/pages/common.ts, so the form,
 * schema and table can move into the app unchanged. `StockItemDetail` and
 * `InventoryOptions` stand in for the detail and options responses the
 * production services read (services/pages/inventory-masters/create-item).
 */

export type GstApplicability = "applicable" | "not_applicable";
export type TaxabilityType = "taxable" | "exempt" | "nil_rated" | "non_gst";
export type TaxType = "igst" | "cgst_sgst_utgst" | "cess";
export type CessValuationType =
  | "not_applicable"
  | "based_on_quantity"
  | "based_on_value"
  | "based_on_value_and_quantity";
export type TypeOfSupply = "goods" | "services" | "capital_goods";
export type GstDetailSource = "custom" | "company_or_stock_group";

/** production's ThirdPartySyncStatus values (config/index.ts) */
export type ThirdPartySyncStatus =
  | "not_synced"
  | "synced"
  | "in_progress"
  | "in_progress_initiated"
  | "event_creations_failed"
  | "event_processing_failed";

export type Option = { label: string; value: string };

/** production's AllocationLike (types/pages/common.ts) */
export type AllocationLike = {
  id?: string;
  godownUuid?: string | null;
  quantity?: number | null;
  rate?: number | null;
  discount?: number | null;
  amount?: number | null;
};

/** One row of the Items table, as mapStockItemRow builds it. */
export interface StockItemRow {
  itemUuid?: string;
  thirdPartySyncStatus?: string;
  thirdPartyPostingDate?: string;
  thirdPartyProduct?: string;
  thirdPartySyncError?: string;
  thirdPartySyncMessage?: string;
  name: string;
  under: string;
  category: string;
  unit: string;
  openingBalance: string;
  openingStockQty?: string;
  openingStockValue?: string;
}

export interface StockItemFormValues {
  name: string;
  underUuid: string;
  categoryUuid: string;
  unitUuid: string;

  gstApplicability: GstApplicability;
  setAlterGst: boolean;
  setAlterHsnSac: boolean;
  gstDetailSource: GstDetailSource;
  taxabilityType: TaxabilityType;
  taxType: TaxType | "";

  igstRate: string;
  cgstRate: string;
  sgstUgstRate: string;
  cessValuationType: CessValuationType;
  cessRatePercent: string;
  cessRatePerUnit: string;

  applicableDate: Date | null;
  applicableForReverseCharge: boolean;
  eligibleForInputTaxCredit: boolean;

  typeOfSupply: TypeOfSupply;
  hsnSac: string;

  quantity: string;
  rate: string;
  perUnitLabel: string;
  openingBalanceValue: string;

  godownAllocations: AllocationLike[];
}

/**
 * A stock item as the detail endpoint returns it: the form's values with the
 * date as an ISO string, plus identity and sync state.
 */
export interface StockItemDetail extends Omit<
  StockItemFormValues,
  "applicableDate" | "perUnitLabel"
> {
  itemUuid: string;
  applicableDate: string | null;
  /** false once a voucher uses the item — production's UoM-editability check. */
  isUomEditable: boolean;
  thirdPartySyncStatus: ThirdPartySyncStatus;
  thirdPartyPostingDate?: string;
  thirdPartyProduct?: string;
  thirdPartySyncError?: string;
}

/** The create-item options response: groups, categories, units, HSN, godowns. */
export interface InventoryOptions {
  groups: Option[];
  categories: Option[];
  units: Option[];
  /** value is the code; label is "code - description" as production shows it. */
  hsnSac: Option[];
  godowns: Option[];
}

export type InventoryItemsColumnsParams = {
  onEdit: (row: StockItemRow) => void;
  onDelete: (row: StockItemRow) => void;
};

/** One row of the godown split modal while it is being edited. */
export type GodownAllocationDraftRow = {
  id: string;
  godownUuid: string;
  quantity: number;
  rate: number;
  amount: number;
};
