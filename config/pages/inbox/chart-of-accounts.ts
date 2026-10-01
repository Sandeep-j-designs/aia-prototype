import type {
  FormType,
  GstTreatmentOption,
  LedgerGroupListItem,
  Option,
  UnderOption,
} from "@/types/pages/inbox/chart-of-accounts";

/**
 * Chart of Accounts static config: the form tokens and option lists from
 * production's config/pages/accounting-masters/{form-tokens,form-options,
 * ledger-groups}.ts, plus utils/pages/accounting-masters/form-shared.ts.
 * Values and labels are production's, verbatim — a Tally ledger is written
 * with these strings.
 */

/* --------------------------------------------------------------- form tokens */
export const NOT_APPLICABLE = "Not Applicable" as const;

export const YES_NO = { YES: "yes", NO: "no" } as const;
export type YesNoValue = (typeof YES_NO)[keyof typeof YES_NO];

export const DR_CR = { DEBIT: "dr", CREDIT: "cr" } as const;
export type DrCrValue = (typeof DR_CR)[keyof typeof DR_CR];

export const GST_APPLICABILITY = {
  APPLICABLE: "Applicable",
  NOT_APPLICABLE,
} as const;

export const DUTY_TAX_TYPES = {
  GST: "GST",
  OTHERS: "Others",
  TDS: "TDS",
  TCS: "TCS",
} as const;

export const TAXABILITY_TYPES = {
  TAXABLE: "Taxable",
  EXEMPT: "Exempt",
  NIL_RATED: "Nil Rated",
  NON_GST: "Non-GST",
} as const;

export const TAX_TYPES = {
  IGST: "IGST",
  SGST: "SGST",
  CGST: "CGST",
  CESS: "CESS",
} as const;
export const TAX_TYPE_VALUES: string[] = Object.values(TAX_TYPES);

export const SUPPLY_TYPES = {
  CAPITAL_GOODS: "Capital Goods",
  GOODS: "Goods",
  SERVICES: "Services",
} as const;

export const LEDGER_TYPES = {
  NOT_APPLICABLE,
  DISCOUNT: "Discount",
  INVOICE: "Invoice Rounding",
} as const;

/* -------------------------------------------------------------- form options */
export const YES_NO_OPTIONS: Option[] = [
  { label: "No", value: YES_NO.NO },
  { label: "Yes", value: YES_NO.YES },
];

export const DR_CR_OPTIONS: Option[] = [
  { label: "Dr", value: DR_CR.DEBIT },
  { label: "Cr", value: DR_CR.CREDIT },
];

export const GST_APPLICABILITY_OPTIONS: Option[] = [
  { label: "Applicable", value: GST_APPLICABILITY.APPLICABLE },
  { label: "Not Applicable", value: NOT_APPLICABLE },
];

export const TYPE_OF_DUTY_TAX_OPTIONS: Option[] = [
  { label: "GST", value: DUTY_TAX_TYPES.GST },
  { label: "TDS", value: DUTY_TAX_TYPES.TDS },
  { label: "TCS", value: DUTY_TAX_TYPES.TCS },
];

export const TYPE_OF_DUTY_TAX_OPTIONS_WITH_OTHERS: Option[] = [
  { label: "GST", value: DUTY_TAX_TYPES.GST },
  { label: "Others", value: DUTY_TAX_TYPES.OTHERS },
  { label: "TDS", value: DUTY_TAX_TYPES.TDS },
  { label: "TCS", value: DUTY_TAX_TYPES.TCS },
];

export const TAXABILITY_TYPE_OPTIONS: Option[] = [
  { label: "Taxable", value: TAXABILITY_TYPES.TAXABLE },
  { label: "Exempt", value: TAXABILITY_TYPES.EXEMPT },
  { label: "Nil Rated", value: TAXABILITY_TYPES.NIL_RATED },
  { label: "Non-GST", value: TAXABILITY_TYPES.NON_GST },
];

/** form-6's Tax Type list (production's TAX_TYPE_OPTIONS, labels as-is). */
export const TAX_TYPE_OPTIONS: Option[] = [
  { label: "IGST", value: TAX_TYPES.IGST },
  { label: "SGST", value: TAX_TYPES.SGST },
  { label: "CGST/UTGST", value: TAX_TYPES.CGST },
  { label: "Cess", value: TAX_TYPES.CESS },
];

/** The shared duty-tax section's inline Tax Type list (form-4/5). */
export const DUTY_SECTION_TAX_TYPE_OPTIONS: Option[] = [
  { label: "IGST", value: TAX_TYPES.IGST },
  { label: "CGST", value: TAX_TYPES.CGST },
  { label: "SGST/UTGST", value: TAX_TYPES.SGST },
  { label: "CESS", value: TAX_TYPES.CESS },
];

export const FORM4_TYPE_OF_SUPPLY_OPTIONS: Option[] = [
  { label: "Goods", value: SUPPLY_TYPES.GOODS },
  { label: "Services", value: SUPPLY_TYPES.SERVICES },
  { label: "Capital Goods", value: SUPPLY_TYPES.CAPITAL_GOODS },
];

export const FORM5_TYPE_OF_SUPPLY_OPTIONS: Option[] = [
  { label: "Capital Goods", value: SUPPLY_TYPES.CAPITAL_GOODS },
  { label: "Goods", value: SUPPLY_TYPES.GOODS },
  { label: "Services", value: SUPPLY_TYPES.SERVICES },
];

export const FORM5_TYPE_OF_LEDGER_OPTIONS: Option[] = [
  { label: "Not Applicable", value: LEDGER_TYPES.NOT_APPLICABLE },
  { label: "Discount", value: LEDGER_TYPES.DISCOUNT },
  { label: "Invoice Rounding", value: LEDGER_TYPES.INVOICE },
];

/* ------------------------------------------------------- masters (fetched) */

/**
 * DEV: GET /api/companies/korefi-gst-treatments?toolConnected=tally — the
 * company's Tally registration types, each mapped to Korefi's code.
 */
export const GST_TREATMENT_OPTIONS: GstTreatmentOption[] = [
  {
    value: "gstt-regular",
    label: "Regular",
    korefiGstTreatment: "business_gst",
  },
  {
    value: "gstt-composition",
    label: "Composition",
    korefiGstTreatment: "business_registered_composition",
  },
  { value: "gstt-consumer", label: "Consumer", korefiGstTreatment: "consumer" },
  {
    value: "gstt-unregistered",
    label: "Unregistered",
    korefiGstTreatment: "business_none",
  },
  { value: "gstt-overseas", label: "Overseas", korefiGstTreatment: "overseas" },
  { value: "gstt-sez", label: "SEZ", korefiGstTreatment: "business_sez" },
  {
    value: "gstt-govt",
    label: "Government Entity / TDS",
    korefiGstTreatment: "government_entity_tds",
  },
  { value: "gstt-unknown", label: "Unknown", korefiGstTreatment: "unknown" },
];

/** DEV: GET /api/taxes?companyId=…&taxType=TDS (fetchTaxOptionsByTypeForLedger) */
export const TDS_NATURE_OPTIONS: Option[] = [
  "194C - Payment to Contractors",
  "194H - Commission or Brokerage",
  "194I(a) - Rent on Plant & Machinery",
  "194I(b) - Rent on Land & Building",
  "194J(b) - Fees for Professional Services",
  "194Q - Purchase of Goods",
].map((label) => ({ label, value: label }));

/** DEV: GET /api/taxes?companyId=…&taxType=TCS */
export const TCS_NATURE_OPTIONS: Option[] = [
  "206C(1) - Scrap",
  "206C(1H) - Sale of Goods",
].map((label) => ({ label, value: label }));

/** DEV: GET /api/merchants/get-all-banks — the bank picker's master. */
export const COA_BANK_OPTIONS: Option[] = [
  "HDFC Bank",
  "ICICI Bank",
  "State Bank of India",
  "Axis Bank",
  "Kotak Mahindra Bank",
  "Canara Bank",
  "Karnataka Bank",
  "Bank of Baroda",
  "Union Bank of India",
  "Federal Bank",
].map((label) => ({ label, value: label }));

/** production's COUNTRIES (config/pages/common), the head of the list. */
export const COUNTRIES: Option[] = [
  "India",
  "Bangladesh",
  "Indonesia",
  "Malaysia",
  "Nepal",
  "Singapore",
  "Sri Lanka",
  "United Arab Emirates",
  "United Kingdom",
  "United States",
].map((label) => ({ label, value: label }));

/** useStateOptions: states and union territories, as Tally names them. */
export const INDIAN_STATES: Option[] = [
  "Andaman & Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra & Nagar Haveli and Daman & Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu & Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
].map((label) => ({ label, value: label }));

/** GSTIN state codes, for Source of Supply from a GSTIN (getStateFromGstin). */
export const GST_STATE_CODES: Record<string, string> = {
  "07": "Delhi",
  "09": "Uttar Pradesh",
  "24": "Gujarat",
  "27": "Maharashtra",
  "29": "Karnataka",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "36": "Telangana",
  "37": "Andhra Pradesh",
};

/* ----------------------------------------------------------- ledger groups */
const normalizeName = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, " ");

const slugifyLabel = (value: string) =>
  normalizeName(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const NATURE_TO_UNDER_SLUG: Record<string, string> = {
  assets: "current-assets",
  liabilities: "current-liabilities",
  income: "direct-incomes",
  expenses: "direct-expenses",
};

/** production's UNDER_NAME_TO_SLUG */
export const UNDER_NAME_TO_SLUG: Record<string, string> = {
  "bank accounts": "bank-accounts",
  "bank a/c": "bank-accounts",
  "bank od a/c": "bank-od",
  "branch division": "branch-divisions",
  "branch / divisions": "branch-divisions",
  "capital account": "capital-account",
  "deposits (asset)": "deposits-asset",
  "suspense a/c": "suspense",
  "reserves & surplus": "reserves-surplus",
  "reserves and surplus": "reserves-surplus",
  "cash-in-hand": "cash-in-hand",
  "current assets": "current-assets",
  "current liabilities": "current-liabilities",
  "fixed assets": "fixed-assets",
  investments: "investments",
  "loans (liability)": "loans-liability",
  "loans and advances (asset)": "loans-advances-asset",
  "loans & advances (asset)": "loans-advances-asset",
  "misc. expenses (asset)": "misc-expenses-asset",
  provisions: "provisions",
  "secured loans": "secured-loans",
  "unsecured loans": "unsecured-loans",
  "primary (liability)": "primary-liability",
  "primary (asset)": "primary-asset",
  "direct expenses": "direct-expenses",
  "direct incomes": "direct-incomes",
  "indirect expenses": "indirect-expenses",
  "indirect incomes": "indirect-incomes",
  "sales account": "sales-accounts",
  "purchase accounts": "purchase-accounts",
  "sales accounts": "sales-accounts",
  "primary (expense)": "primary-expense",
  "primary (income)": "primary-income",
  "duties & taxes": "duties-taxes",
  "duties and taxes": "duties-taxes",
  "stock-in-hand": "stock-in-hand",
  "sundry creditors": "sundry-creditors",
  "sundry debtors": "sundry-debtors",
  "sundry debitors": "sundry-debtors",
};

/** production's UNDER_SLUG_TO_FORM_TYPE: which of the eight forms a group opens. */
export const UNDER_SLUG_TO_FORM_TYPE: Partial<Record<string, FormType>> = {
  "bank-accounts": "form-1",
  "bank-od": "form-1",
  "branch-divisions": "form-2",
  "capital-account": "form-2",
  "deposits-asset": "form-2",
  suspense: "form-2",
  "reserves-surplus": "form-2",
  "cash-in-hand": "form-3",
  "current-assets": "form-4",
  "current-liabilities": "form-4",
  "fixed-assets": "form-4",
  "loans-advances-asset": "form-4",
  investments: "form-4",
  "loans-liability": "form-4",
  "misc-expenses-asset": "form-4",
  provisions: "form-4",
  "secured-loans": "form-4",
  "unsecured-loans": "form-4",
  "primary-liability": "form-4",
  "primary-asset": "form-4",
  "direct-expenses": "form-5",
  "direct-incomes": "form-5",
  "indirect-expenses": "form-5",
  "indirect-incomes": "form-5",
  "purchase-accounts": "form-5",
  "sales-accounts": "form-5",
  "primary-expense": "form-5",
  "primary-income": "form-5",
  "duties-taxes": "form-6",
  "stock-in-hand": "form-7",
  "sundry-creditors": "form-8",
  "sundry-debtors": "form-8",
};

/** production's mapLedgerGroupsToUnderOptions, one group at a time. */
export const toUnderOption = (group: LedgerGroupListItem): UnderOption => {
  const label = (group.groupName || group.reserveName || "").trim();
  const reserveName = (group.reserveName || "").trim();
  const mapped = reserveName
    ? UNDER_NAME_TO_SLUG[normalizeName(reserveName)]
    : "";
  const byNature =
    !reserveName && group.nature
      ? NATURE_TO_UNDER_SLUG[normalizeName(group.nature)] || ""
      : "";
  return {
    label,
    value: group.ledgerGroupUuid,
    underSlug: mapped || byNature || slugifyLabel(label),
    isMismatch: reserveName ? !mapped : !byNature,
    ledgerGroupUuid: group.ledgerGroupUuid,
    groupName: group.groupName,
    groupPath: group.groupPath,
    reserveName: group.reserveName,
    nature: group.nature,
  };
};

export const getUnderSlugForSelection = (
  selectedUnder: string,
  underOptions: UnderOption[]
) =>
  underOptions.find((option) => option.value === selectedUnder)?.underSlug ||
  selectedUnder;

export const getFormTypeForUnder = (
  selectedUnder: string,
  underOptions: UnderOption[]
): FormType =>
  UNDER_SLUG_TO_FORM_TYPE[
    getUnderSlugForSelection(selectedUnder, underOptions)
  ] || "form-1";

/* --------------------------------------------- form-shared (utils in prod) */
export const TAX_REGISTRATION_EXCLUDED_UNDER = [
  "misc-expenses-asset",
  "provisions",
  "reserves-surplus",
  "suspense",
  "investments",
];

export const FORM4_DUTY_TAX_ALLOWED_UNDER = [
  "current-assets",
  "current-liabilities",
  "primary-liability",
  "primary-asset",
];

export const FORM5_DUTY_TAX_ALLOWED_UNDER = [
  "direct-expenses",
  "indirect-expenses",
  "purchase-accounts",
  "primary-expense",
];

export const FORM5_INVENTORY_ALLOWED_UNDER = [
  "direct-expenses",
  "direct-incomes",
  "indirect-expenses",
  "indirect-incomes",
  "sales-accounts",
  "purchase-accounts",
  "primary-expense",
  "primary-income",
];

export const FORM5_INVENTORY_ENABLED_BY_DEFAULT_UNDER = [
  "purchase-accounts",
  "sales-accounts",
];

/** production's createMode default: a new ledger opens under Bank Accounts. */
export const DEFAULT_UNDER_SLUG = "bank-accounts";

/** production's LEDGER_TREE_PAGE_SIZE — children per parent, per request. */
export const LEDGER_TREE_PAGE_SIZE = 20;

/** How long the simulated Tally sync takes. */
export const COA_SYNC_MS = 3000;
