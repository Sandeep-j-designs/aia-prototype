/**
 * Chart of Accounts contracts.
 *
 * Mirrors production's types/pages/accounting-masters/coa-tree-items.ts and
 * ledger.ts, camelCase as the apiClient hands them over. Only the subset of
 * LedgerDetailResponse the ledger forms read is kept; the names are prod's,
 * so the dev can swap the import path and nothing else.
 */

/** production's ThirdPartySyncStatus values (config/index.ts). */
export type CoaSyncStatus =
  | "not_synced"
  | "synced"
  | "in_progress"
  | "in_progress_initiated"
  | "event_creations_failed"
  | "event_processing_failed";

/** production's AsyncTreeNode (types/components/async-tree-select). */
export type AsyncTreeNode = {
  id: string;
  label: string;
  /** A group's path ends with itself; a ledger's is its group's path. */
  path: string[];
  isLeaf?: boolean | string;
  hasChildren?: boolean | string;
  selectable?: boolean;
};

/** One row of GET /api/accounts/coa-list-v2, after normalizeCoaFetchResult. */
export type CoaTreeNode = AsyncTreeNode & {
  accountUuid?: string | null;
  accountName?: string | null;
  ledgerGroupUuid?: string | null;
  groupName?: string | null;
  nature: string;
  subGroups: number;
  subgroupCount?: number | string | null;
  ledgers: number;
  ledgerCount?: number | string | null;
  thirdPartySyncStatus?: string | null;
  thirdPartySyncMessage?: string | null;
  thirdPartyProduct?: string | null;
  transactionCount?: number | string | null;
  txnCount?: number | string | null;
};

export type UnderOption = {
  value: string;
  label: string;
  isMismatch?: boolean;
  ledgerGroupUuid?: string;
  groupName?: string;
  groupPath: string[];
  reserveName?: string | null;
  nature?: string | null;
  underSlug?: string;
};

/** One row of GET /api/accounting-masters/ledger-groups. */
export type LedgerGroupListItem = {
  ledgerGroupUuid: string;
  groupName: string;
  groupPath: string[];
  reserveName: string | null;
  nature?: string | null;
};

export type LedgerAddress = {
  address: string | null;
  pincode: string | null;
  state: string | null;
  country: string | null;
  phoneNo: string | null;
  email: string | null;
};

export type LedgerTaxRegistrationDetails = {
  pan: string | null;
  gstin: string | null;
  registrationType: string | null;
};

export type LedgerBankDetail = {
  bankName?: string | null;
  accountName?: string | null;
  accountNumber?: string | null;
  ifscCode?: string | null;
  upiId?: string | null;
  branch?: string | null;
  swiftCode?: string | null;
  bsrCode?: string | null;
  isPrimary?: boolean;
  isActive?: boolean;
};

export type LedgerGstFormDetail = {
  gstin?: string;
  panNo?: string;
  placeOfSupply?: string;
};

export type LedgerContactInformation = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNo?: string;
};

/** A billing or shipping address on a party (form-8). */
export type LedgerPartyAddress = {
  addrLine_1?: string;
  addrLine_2?: string;
  addrLine_3?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
};

export type LedgerCustomerMerchantAddresses = {
  billing: LedgerPartyAddress[];
  shipping: LedgerPartyAddress[];
};

/**
 * GET /api/accounting-masters/customer-accounts-v2/{ledgerUuid}, the fields
 * the eight ledger forms read. `transactionCount` really arrives on the tree
 * row, not the detail; it is kept here so the in-memory store has one record
 * per ledger.
 */
export type LedgerDetailResponse = {
  accountUuid: string;
  accountName: string;
  ledgerGroupUuid: string;
  groupPath: string[];
  groupReserveName?: string | null;
  nature: string;
  currency: string;
  isCostCentreOn: boolean;
  isBillWiseOn: boolean;
  isInventoryAffected: boolean;
  isDutyAndTaxes: boolean;
  openingBalance: string;
  address?: LedgerAddress | null;
  contactPerson?: string | null;
  taxRegistrationDetails?: LedgerTaxRegistrationDetails | null;
  gstTreatmentUuid?: string | null;
  bankDetails?: LedgerBankDetail[];
  thirdPartyProduct: string;
  thirdPartySyncStatus?: CoaSyncStatus | null;
  thirdPartySyncMessage?: string | null;
  transactionCount: number;
  // Statutory (form-4/5)
  gstApplicability?: string | null;
  isHsnSacDetailsSpecified?: boolean | null;
  hsnSac?: string | null;
  isGstRateDetailsSpecified?: boolean | null;
  taxabilityType?: string | null;
  typeOfSupply?: string | null;
  typeOfLedger?: string | null;
  // Duties & taxes (form-4/5/6)
  typeOfDutyTax?: string | null;
  taxType?: string | null;
  igstRate?: string | number | null;
  cgstRate?: string | number | null;
  sgstUgstRate?: string | number | null;
  cessRatePercent?: string | number | null;
  applicationDate?: string | null;
  tdsNatureOfPayments?: string | null;
  tcsNatureOfGoods?: string | null;
  othersPercentageOfCalculation?: string | null;
  // Party (form-8)
  legalName?: string | null;
  creditPeriod?: string | null;
  gstDetails?: LedgerGstFormDetail[] | null;
  contactInformations?: LedgerContactInformation[];
  customerMerchantAddresses?: LedgerCustomerMerchantAddresses;
};

/** GET /api/companies/masters-count */
export type AccountingMastersCounts = {
  totalGroupCount: number | null;
  totalLedgerCount: number | null;
};

/** production's FormType (types/pages/accounting-masters/forms.ts). */
export type FormType =
  | "form-1"
  | "form-2"
  | "form-3"
  | "form-4"
  | "form-5"
  | "form-6"
  | "form-7"
  | "form-8";

/** production's GstTreatmentOption: a Tally label over Korefi's code. */
export type GstTreatmentOption = {
  value: string;
  label: string;
  korefiGstTreatment: string;
};

export type Option = { label: string; value: string };
