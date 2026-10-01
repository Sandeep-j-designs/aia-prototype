import { z } from "zod";
import {
  DR_CR,
  DUTY_TAX_TYPES,
  FORM4_DUTY_TAX_ALLOWED_UNDER,
  FORM5_DUTY_TAX_ALLOWED_UNDER,
  GST_APPLICABILITY,
  GST_TREATMENT_OPTIONS,
  LEDGER_TYPES,
  NOT_APPLICABLE,
  TAXABILITY_TYPES,
  TAX_REGISTRATION_EXCLUDED_UNDER,
  TAX_TYPES,
  YES_NO,
} from "@/config/pages/inbox/chart-of-accounts";
import type {
  FormType,
  LedgerBankDetail,
  LedgerContactInformation,
  LedgerGstFormDetail,
  LedgerPartyAddress,
} from "@/types/pages/inbox/chart-of-accounts";

/**
 * The ledger form's values and rules.
 *
 * Production keeps eight schemas (schemas/accounting-masters/ledger.ts,
 * form1Schema … form8Schema), one per form. Here the eight forms share one
 * set of values — so switching "Under" keeps everything already typed, as
 * production's draftValues do — and one schema checks only the fields the
 * current form draws. Every message is production's, verbatim.
 */

export type LedgerFormValues = {
  // Basic details
  name: string;
  under: string;
  costCentreApplicable: string;
  currencyOfLedger: string;
  // Address
  address: string;
  country: string;
  state: string;
  pincode: string;
  contactPerson: string;
  mobileNo: string;
  emailId: string;
  // Tax registration
  gstTreatmentUuid: string;
  gstTreatment: string;
  gstinUin: string;
  panItNo: string;
  // Opening balance
  openingBalanceAmount: string;
  drCr: string;
  // Bank account (form-1)
  acHolderName: string;
  bankName: string;
  acNumber: string;
  ifscCode: string;
  swiftCode: string;
  branch: string;
  bsrCode: string;
  // Additional fields (form-2/4/5/6)
  maintainBalancesBillByBill: string;
  inventoryValuesAffected: string;
  behaveAsDutiesTaxesLedger: string;
  typeOfLedger: string;
  // Statutory (form-4/5)
  gstApplicability: string;
  setAlterHsnSac: boolean;
  hsnSac: string;
  setAlterTaxabilityRate: boolean;
  taxabilityType: string;
  typeOfSupply: string;
  // Duties & taxes (form-4/5/6)
  typeOfDutyTax: string;
  taxType: string;
  igstRate: string;
  cgstRate: string;
  sgstUgstRate: string;
  cessRatePercent: string;
  applicationDate: string;
  tdsNatureOfPayments: string;
  tcsNatureOfGoods: string;
  othersPercentageOfCalculation: string;
  // Party (form-8)
  legalName: string;
  paymentTerms: string;
  gstDetails: LedgerGstFormDetail[];
  customerMerchantAddresses: {
    billing: LedgerPartyAddress[];
    shipping: LedgerPartyAddress[];
  };
  bankDetails: LedgerBankDetail[];
  contactInformations: LedgerContactInformation[];
};

export const EMPTY_PARTY_ADDRESS: LedgerPartyAddress = {
  addrLine_1: "",
  addrLine_2: "",
  addrLine_3: "",
  city: "",
  state: "",
  pincode: "",
  country: "India",
};

/** The union of production's FORM1…FORM8_DEFAULT_VALUES. */
export const LEDGER_FORM_DEFAULTS: LedgerFormValues = {
  name: "",
  under: "",
  costCentreApplicable: YES_NO.NO,
  currencyOfLedger: "INR",
  address: "",
  country: "India",
  state: "",
  pincode: "",
  contactPerson: "",
  mobileNo: "",
  emailId: "",
  gstTreatmentUuid: "",
  gstTreatment: "",
  gstinUin: "",
  panItNo: "",
  openingBalanceAmount: "",
  drCr: DR_CR.CREDIT,
  acHolderName: "",
  bankName: "",
  acNumber: "",
  ifscCode: "",
  swiftCode: "",
  branch: "",
  bsrCode: "",
  maintainBalancesBillByBill: YES_NO.NO,
  inventoryValuesAffected: YES_NO.NO,
  behaveAsDutiesTaxesLedger: YES_NO.NO,
  typeOfLedger: LEDGER_TYPES.NOT_APPLICABLE,
  gstApplicability: GST_APPLICABILITY.NOT_APPLICABLE,
  setAlterHsnSac: false,
  hsnSac: "",
  setAlterTaxabilityRate: false,
  taxabilityType: "",
  typeOfSupply: "",
  typeOfDutyTax: "",
  taxType: "",
  igstRate: "",
  cgstRate: "",
  sgstUgstRate: "",
  cessRatePercent: "",
  applicationDate: "",
  tdsNatureOfPayments: "",
  tcsNatureOfGoods: "",
  othersPercentageOfCalculation: "",
  legalName: "",
  paymentTerms: "",
  gstDetails: [{ gstin: "", panNo: "", placeOfSupply: "" }],
  customerMerchantAddresses: {
    billing: [{ ...EMPTY_PARTY_ADDRESS }],
    shipping: [{ ...EMPTY_PARTY_ADDRESS }],
  },
  bankDetails: [
    {
      accountName: "",
      bankName: "",
      accountNumber: "",
      ifscCode: "",
      upiId: "",
    },
  ],
  contactInformations: [
    { firstName: "", lastName: "", email: "", phoneNo: "" },
  ],
};

/* --------------------------------------------------- field rules (prod's) */
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

type Rule = (value: string) => string;

const pincode: Rule = (v) =>
  !v || /^\d{6}$/.test(v) ? "" : "Pincode must be 6 digits.";
const mobile: Rule = (v) =>
  !v || /^\d{10}$/.test(v) ? "" : "Mobile number must be 10 digits.";
const email: Rule = (v) =>
  !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
    ? ""
    : "Enter a valid email address.";
const gstin: Rule = (v) =>
  !v
    ? ""
    : !/^[A-Za-z0-9]{15}$/.test(v)
      ? "GSTIN must be 15 alphanumeric characters."
      : !GSTIN_REGEX.test(v.toUpperCase())
        ? "Invalid GSTIN Number format"
        : "";
const pan: Rule = (v) =>
  !v || /^[A-Za-z0-9]{10}$/.test(v)
    ? ""
    : "PAN/IT No. must be 10 alphanumeric characters.";
const hsnSac: Rule = (v) =>
  !v || /^(\d{2}|\d{4}|\d{6}|\d{8})$/.test(v)
    ? ""
    : "HSN/SAC must be 2, 4, 6, or 8 digits.";
const RATE_RANGE = "Rate must be greater than 0 and up to 100.";
const rate: Rule = (v) =>
  !v ||
  (/^\d{1,3}(\.\d{1,2})?$/.test(v) &&
    Number.parseFloat(v) >= 0 &&
    Number.parseFloat(v) <= 100)
    ? ""
    : RATE_RANGE;
const creditPeriod: Rule = (v) =>
  !v || /^\d{1,4}$/.test(v) ? "" : "Credit period must be 0 to 9999.";
const ifsc: Rule = (v) =>
  !v || /^[A-Za-z]{4}0[A-Za-z0-9]{6}$/.test(v)
    ? ""
    : "IFSC must match 11-character standard format.";
const acHolder: Rule = (v) =>
  !v || /^[a-zA-Z\s]+$/.test(v)
    ? ""
    : "Account holder name must contain only alphabets and spaces";
const acNumber: Rule = (v) =>
  !v || /^\d{9,18}$/.test(v) ? "" : "Account number must be 9 to 18 digits";
const bsr: Rule = (v) =>
  !v || /^\d{7}$/.test(v)
    ? ""
    : "BSR code must be a valid 7-digit numeric code.";

/* ------------------------------------------- GST rules by treatment (form-8) */
type GstRule = {
  showGSTIN: boolean;
  gstinRequired: boolean;
  showSourceOfSupply: boolean;
  sourceOfSupplyRequired: boolean;
};

/** production's getGstRules (config/pages/vendors). */
export const getGstRules = (korefiTreatment: string): GstRule => {
  switch (korefiTreatment) {
    case "consumer":
    case "business_none":
    case "embassy_un_body":
      return {
        showGSTIN: false,
        gstinRequired: false,
        showSourceOfSupply: true,
        sourceOfSupplyRequired: true,
      };
    case "overseas":
    case "non_resident_taxpayer":
      return {
        showGSTIN: true,
        gstinRequired: false,
        showSourceOfSupply: false,
        sourceOfSupplyRequired: false,
      };
    case "unknown":
      return {
        showGSTIN: true,
        gstinRequired: false,
        showSourceOfSupply: true,
        sourceOfSupplyRequired: false,
      };
    default:
      return {
        showGSTIN: true,
        gstinRequired: true,
        showSourceOfSupply: true,
        sourceOfSupplyRequired: true,
      };
  }
};

export const korefiTreatmentOf = (gstTreatmentUuid: string) =>
  GST_TREATMENT_OPTIONS.find((o) => o.value === gstTreatmentUuid)
    ?.korefiGstTreatment ?? "";

/* --------------------------------------------------------------- the schema */
export type LedgerSchemaContext = {
  formType: FormType;
  /** The selected group's slug (getUnderSlugForSelection). */
  underSlug: string;
};

/** Production's ledger-duty-tax superRefine, shared by form-4/5/6. */
const checkDutyTax = (
  v: LedgerFormValues,
  add: (path: string, message: string) => void,
  {
    requiresTaxabilityType,
    allowOthers,
  }: {
    requiresTaxabilityType: boolean;
    allowOthers: boolean;
  }
) => {
  if (!v.typeOfDutyTax) {
    add("typeOfDutyTax", "Type of Duty/Tax is required.");
    return;
  }
  if (v.typeOfDutyTax === DUTY_TAX_TYPES.TDS && !v.tdsNatureOfPayments)
    add("tdsNatureOfPayments", "Nature of Payments is required for TDS.");
  if (v.typeOfDutyTax === DUTY_TAX_TYPES.TCS && !v.tcsNatureOfGoods)
    add("tcsNatureOfGoods", "Nature of Goods is required for TCS.");
  if (allowOthers && v.typeOfDutyTax === DUTY_TAX_TYPES.OTHERS) {
    if (!v.othersPercentageOfCalculation.trim())
      add(
        "othersPercentageOfCalculation",
        "Percentage of Calculation is required for Others."
      );
    else if (
      rate(v.othersPercentageOfCalculation) ||
      Number.parseFloat(v.othersPercentageOfCalculation) <= 0
    )
      add("othersPercentageOfCalculation", RATE_RANGE);
  }
  if (v.typeOfDutyTax !== DUTY_TAX_TYPES.GST) return;
  if (requiresTaxabilityType) {
    if (!v.taxabilityType) {
      add("taxabilityType", "Taxability Type is required.");
      return;
    }
    if (v.taxabilityType !== TAXABILITY_TYPES.TAXABLE) return;
  }
  if (!v.taxType) {
    add("taxType", "Tax Type is required.");
    return;
  }
  const [field, label] =
    v.taxType === TAX_TYPES.IGST
      ? (["igstRate", "IGST Rate"] as const)
      : v.taxType === TAX_TYPES.CGST
        ? (["cgstRate", "CGST Rate"] as const)
        : v.taxType === TAX_TYPES.SGST
          ? (["sgstUgstRate", "SGST/UTGST Rate"] as const)
          : (["cessRatePercent", "CESS Rate"] as const);
  const value = v[field].trim();
  if (!value) add(field, `${label} is required.`);
  else if (rate(value) || Number.parseFloat(value) <= 0) add(field, RATE_RANGE);
};

/** Production's statutory superRefine (the else-branch of form-4/5). */
const checkStatutory = (
  v: LedgerFormValues,
  add: (path: string, message: string) => void
) => {
  if (v.gstApplicability !== GST_APPLICABILITY.APPLICABLE) return;
  if (v.setAlterHsnSac) {
    const message = hsnSac(v.hsnSac.trim());
    if (message) add("hsnSac", message);
  }
  if (v.setAlterTaxabilityRate && !v.taxabilityType)
    add("taxabilityType", "Taxability Type is required.");
  if (
    v.setAlterTaxabilityRate &&
    v.taxabilityType === TAXABILITY_TYPES.TAXABLE
  ) {
    if (!v.igstRate.trim()) add("igstRate", "GST Rate is required.");
    else if (rate(v.igstRate) || Number.parseFloat(v.igstRate) <= 0)
      add("igstRate", RATE_RANGE);
  }
};

export const ledgerFormSchema = ({
  formType,
  underSlug,
}: LedgerSchemaContext) =>
  z.custom<LedgerFormValues>().superRefine((v, ctx) => {
    const seen = new Set<string>();
    const add = (path: string, message: string) => {
      if (!message || seen.has(path)) return;
      seen.add(path);
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message,
        path: path.split(".").map((p) => (/^\d+$/.test(p) ? Number(p) : p)),
      });
    };
    const check = (path: string, rule: Rule, value: string) =>
      add(path, rule(value.trim()));

    // Basic details — every form.
    if (!v.name) add("name", "Ledger Name is required");
    else if (v.name.length > 150)
      add("name", "Ledger Name must not exceed 150 characters");
    if (!v.under) add("under", "Under Group is required");

    const taxRegistration =
      !TAX_REGISTRATION_EXCLUDED_UNDER.includes(underSlug);
    const duty = v.behaveAsDutiesTaxesLedger === YES_NO.YES;

    switch (formType) {
      case "form-1":
        check("pincode", pincode, v.pincode);
        check("mobileNo", mobile, v.mobileNo);
        check("emailId", email, v.emailId);
        check("gstinUin", gstin, v.gstinUin);
        check("acHolderName", acHolder, v.acHolderName);
        check("acNumber", acNumber, v.acNumber);
        check("ifscCode", ifsc, v.ifscCode);
        check("bsrCode", bsr, v.bsrCode);
        break;
      case "form-2":
        check("pincode", pincode, v.pincode);
        check("mobileNo", mobile, v.mobileNo);
        check("emailId", email, v.emailId);
        if (taxRegistration) check("gstinUin", gstin, v.gstinUin);
        check("panItNo", pan, v.panItNo);
        break;
      case "form-3":
        check("pincode", pincode, v.pincode);
        break;
      case "form-4":
      case "form-5": {
        const isForm4 = formType === "form-4";
        check("pincode", pincode, v.pincode);
        check("mobileNo", mobile, v.mobileNo);
        check("emailId", email, v.emailId);
        if (isForm4 && taxRegistration) check("gstinUin", gstin, v.gstinUin);
        check("panItNo", pan, v.panItNo);
        if (
          !isForm4 &&
          v.maintainBalancesBillByBill === YES_NO.YES &&
          v.inventoryValuesAffected === YES_NO.YES
        ) {
          const message =
            "Maintain Balances Bill by Bill and Inventory Values are Affected cannot both be enabled.";
          add("maintainBalancesBillByBill", message);
          add("inventoryValuesAffected", message);
        }
        if (
          !isForm4 &&
          v.typeOfLedger &&
          v.typeOfLedger !== NOT_APPLICABLE &&
          v.gstApplicability === GST_APPLICABILITY.APPLICABLE
        )
          add(
            "gstApplicability",
            "GST Applicability must be Not Applicable when Type of Ledger is selected."
          );
        const allowed = (
          isForm4 ? FORM4_DUTY_TAX_ALLOWED_UNDER : FORM5_DUTY_TAX_ALLOWED_UNDER
        ).includes(underSlug);
        if (duty && allowed)
          checkDutyTax(v, add, {
            requiresTaxabilityType: false,
            allowOthers: !isForm4,
          });
        else checkStatutory(v, add);
        break;
      }
      case "form-6":
        // Address and PAN are read-only under Duties & Taxes (the only group
        // that opens form-6), so a stale value there cannot block Save.
        checkDutyTax(v, add, {
          requiresTaxabilityType: true,
          allowOthers: false,
        });
        break;
      case "form-7":
        check("pincode", pincode, v.pincode);
        check("panItNo", pan, v.panItNo);
        break;
      case "form-8": {
        if (!v.gstTreatmentUuid)
          add("gstTreatmentUuid", "GST Treatment is required");
        check("mobileNo", mobile, v.mobileNo);
        check("emailId", email, v.emailId);
        if (v.maintainBalancesBillByBill === YES_NO.YES)
          check("paymentTerms", creditPeriod, v.paymentTerms);
        const rules = getGstRules(korefiTreatmentOf(v.gstTreatmentUuid));
        const unregistered =
          korefiTreatmentOf(v.gstTreatmentUuid) === "business_none";
        v.gstDetails.forEach((detail, index) => {
          const base = `gstDetails.${index}`;
          if (rules.showGSTIN) {
            const value = detail.gstin?.trim() ?? "";
            if (rules.gstinRequired && !value)
              add(`${base}.gstin`, "GSTIN is required");
            else if (value && !GSTIN_REGEX.test(value.toUpperCase()))
              add(`${base}.gstin`, "Invalid GSTIN Number format");
          }
          if (
            rules.showSourceOfSupply &&
            rules.sourceOfSupplyRequired &&
            !unregistered &&
            !detail.placeOfSupply?.trim()
          )
            add(`${base}.placeOfSupply`, "Source of Supply is required");
        });
        (["billing", "shipping"] as const).forEach((kind) =>
          v.customerMerchantAddresses[kind].forEach((address, index) =>
            check(
              `customerMerchantAddresses.${kind}.${index}.pincode`,
              pincode,
              address.pincode ?? ""
            )
          )
        );
        const bank = v.bankDetails[0];
        if (bank) {
          check(
            "bankDetails.0.accountNumber",
            acNumber,
            bank.accountNumber ?? ""
          );
          const code = bank.ifscCode?.trim() ?? "";
          if (code && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(code))
            add("bankDetails.0.ifscCode", "Invalid IFSC code format");
        }
        const contact = v.contactInformations[0];
        if (contact) {
          check("contactInformations.0.email", email, contact.email ?? "");
          check("contactInformations.0.phoneNo", mobile, contact.phoneNo ?? "");
        }
        break;
      }
    }
  });
