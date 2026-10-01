import {
  DR_CR,
  GST_APPLICABILITY,
  GST_STATE_CODES,
  GST_TREATMENT_OPTIONS,
  LEDGER_TYPES,
  YES_NO,
} from "@/config/pages/inbox/chart-of-accounts";
import {
  EMPTY_PARTY_ADDRESS,
  LEDGER_FORM_DEFAULTS,
  type LedgerFormValues,
} from "@/schemas/inbox/chart-of-accounts";
import type {
  FormType,
  LedgerDetailResponse,
  LedgerGroupListItem,
} from "@/types/pages/inbox/chart-of-accounts";

/**
 * Ledger detail ⇄ form values.
 *
 * Production: utils/pages/accounting-masters/customer-accounts-v2.ts
 * (mapLedgerDataToFormValues, and buildForm1…8LedgerPayload for the way
 * back). Those build the API payload per form; this builds the stored ledger
 * the in-memory book keeps, from the fields the current form draws.
 */

const text = (value: unknown) =>
  value === null || value === undefined ? "" : String(value);

/** Tally's sign: a debit balance is negative. */
export const signedOpeningBalance = (amount: string, drCr: string) => {
  const value = Math.abs(Number(amount) || 0);
  if (!value) return "0";
  return (drCr === DR_CR.DEBIT ? -value : value).toFixed(2);
};

export const detailToFormValues = (
  detail: LedgerDetailResponse
): LedgerFormValues => {
  const balance = Number(detail.openingBalance) || 0;
  const bank = detail.bankDetails?.[0];
  const addresses = detail.customerMerchantAddresses;
  return {
    ...structuredClone(LEDGER_FORM_DEFAULTS),
    name: detail.accountName,
    under: detail.ledgerGroupUuid,
    costCentreApplicable: detail.isCostCentreOn ? YES_NO.YES : YES_NO.NO,
    currencyOfLedger: detail.currency || "INR",
    address: text(detail.address?.address),
    country: text(detail.address?.country) || "India",
    state: text(detail.address?.state),
    pincode: text(detail.address?.pincode),
    contactPerson: text(detail.contactPerson),
    mobileNo: text(detail.address?.phoneNo),
    emailId: text(detail.address?.email),
    gstTreatmentUuid: text(detail.gstTreatmentUuid),
    gstTreatment:
      GST_TREATMENT_OPTIONS.find((o) => o.value === detail.gstTreatmentUuid)
        ?.korefiGstTreatment ?? "",
    gstinUin: text(detail.taxRegistrationDetails?.gstin),
    panItNo: text(detail.taxRegistrationDetails?.pan),
    openingBalanceAmount: balance ? Math.abs(balance).toFixed(2) : "",
    drCr: balance < 0 ? DR_CR.DEBIT : DR_CR.CREDIT,
    acHolderName: text(bank?.accountName),
    bankName: text(bank?.bankName),
    acNumber: text(bank?.accountNumber),
    ifscCode: text(bank?.ifscCode),
    swiftCode: text(bank?.swiftCode),
    branch: text(bank?.branch),
    bsrCode: text(bank?.bsrCode),
    maintainBalancesBillByBill: detail.isBillWiseOn ? YES_NO.YES : YES_NO.NO,
    inventoryValuesAffected: detail.isInventoryAffected
      ? YES_NO.YES
      : YES_NO.NO,
    behaveAsDutiesTaxesLedger:
      detail.isDutyAndTaxes && !detail.groupPath.includes("Duties & Taxes")
        ? YES_NO.YES
        : YES_NO.NO,
    typeOfLedger: text(detail.typeOfLedger) || LEDGER_TYPES.NOT_APPLICABLE,
    gstApplicability:
      text(detail.gstApplicability) || GST_APPLICABILITY.NOT_APPLICABLE,
    setAlterHsnSac: !!detail.isHsnSacDetailsSpecified,
    hsnSac: text(detail.hsnSac),
    setAlterTaxabilityRate: !!detail.isGstRateDetailsSpecified,
    taxabilityType: text(detail.taxabilityType),
    typeOfSupply: text(detail.typeOfSupply),
    typeOfDutyTax: text(detail.typeOfDutyTax),
    taxType: text(detail.taxType),
    igstRate: text(detail.igstRate),
    cgstRate: text(detail.cgstRate),
    sgstUgstRate: text(detail.sgstUgstRate),
    cessRatePercent: text(detail.cessRatePercent),
    applicationDate: text(detail.applicationDate),
    tdsNatureOfPayments: text(detail.tdsNatureOfPayments),
    tcsNatureOfGoods: text(detail.tcsNatureOfGoods),
    othersPercentageOfCalculation: text(detail.othersPercentageOfCalculation),
    legalName: text(detail.legalName),
    paymentTerms: text(detail.creditPeriod),
    gstDetails: detail.gstDetails?.length
      ? structuredClone(detail.gstDetails)
      : structuredClone(LEDGER_FORM_DEFAULTS.gstDetails),
    customerMerchantAddresses: {
      billing: addresses?.billing.length
        ? structuredClone(addresses.billing)
        : [{ ...EMPTY_PARTY_ADDRESS }],
      shipping: addresses?.shipping.length
        ? structuredClone(addresses.shipping)
        : [{ ...EMPTY_PARTY_ADDRESS }],
    },
    bankDetails: detail.bankDetails?.length
      ? structuredClone(detail.bankDetails)
      : structuredClone(LEDGER_FORM_DEFAULTS.bankDetails),
    contactInformations: detail.contactInformations?.length
      ? structuredClone(detail.contactInformations)
      : structuredClone(LEDGER_FORM_DEFAULTS.contactInformations),
  };
};

const blankToNull = (value: string) => value.trim() || null;

/** The stored ledger after Save — the payload builders' job in production. */
export const formValuesToDetail = ({
  values,
  formType,
  group,
  existing,
  accountUuid,
}: {
  values: LedgerFormValues;
  formType: FormType;
  group: LedgerGroupListItem;
  existing?: LedgerDetailResponse;
  accountUuid: string;
}): LedgerDetailResponse => {
  const isParty = formType === "form-8";
  const duty =
    formType === "form-6" || values.behaveAsDutiesTaxesLedger === YES_NO.YES;
  const billing = values.customerMerchantAddresses.billing[0];
  return {
    accountUuid,
    accountName: values.name.trim(),
    ledgerGroupUuid: group.ledgerGroupUuid,
    groupPath: group.groupPath,
    groupReserveName: group.reserveName,
    nature: group.nature ?? "",
    currency: "INR",
    isCostCentreOn: values.costCentreApplicable === YES_NO.YES,
    isBillWiseOn: values.maintainBalancesBillByBill === YES_NO.YES,
    isInventoryAffected: values.inventoryValuesAffected === YES_NO.YES,
    isDutyAndTaxes: duty,
    openingBalance: signedOpeningBalance(
      values.openingBalanceAmount,
      values.drCr
    ),
    address: {
      address: isParty
        ? [billing?.addrLine_1, billing?.addrLine_2]
            .filter(Boolean)
            .join(", ") || null
        : blankToNull(values.address),
      pincode: blankToNull(isParty ? (billing?.pincode ?? "") : values.pincode),
      state: blankToNull(isParty ? (billing?.state ?? "") : values.state),
      country: blankToNull(isParty ? (billing?.country ?? "") : values.country),
      phoneNo: blankToNull(values.mobileNo),
      email: blankToNull(values.emailId),
    },
    contactPerson: blankToNull(values.contactPerson),
    taxRegistrationDetails: {
      gstin: blankToNull(
        isParty ? (values.gstDetails[0]?.gstin ?? "") : values.gstinUin
      ),
      pan: blankToNull(
        isParty ? (values.gstDetails[0]?.panNo ?? "") : values.panItNo
      ),
      registrationType: null,
    },
    gstTreatmentUuid: blankToNull(values.gstTreatmentUuid),
    bankDetails:
      formType === "form-1"
        ? [
            {
              accountName: values.acHolderName,
              bankName: values.bankName,
              accountNumber: values.acNumber,
              ifscCode: values.ifscCode,
              swiftCode: values.swiftCode,
              branch: values.branch,
              bsrCode: values.bsrCode,
              isPrimary: true,
            },
          ]
        : isParty
          ? values.bankDetails
          : [],
    thirdPartyProduct: existing?.thirdPartyProduct ?? "Tally",
    thirdPartySyncStatus: "not_synced",
    thirdPartySyncMessage: null,
    transactionCount: existing?.transactionCount ?? 0,
    gstApplicability: values.gstApplicability,
    isHsnSacDetailsSpecified: values.setAlterHsnSac,
    hsnSac: blankToNull(values.hsnSac),
    isGstRateDetailsSpecified: values.setAlterTaxabilityRate,
    taxabilityType: blankToNull(values.taxabilityType),
    typeOfSupply: blankToNull(values.typeOfSupply),
    typeOfLedger: values.typeOfLedger,
    typeOfDutyTax: duty ? blankToNull(values.typeOfDutyTax) : null,
    taxType: duty ? blankToNull(values.taxType) : null,
    igstRate: blankToNull(values.igstRate),
    cgstRate: duty ? blankToNull(values.cgstRate) : null,
    sgstUgstRate: duty ? blankToNull(values.sgstUgstRate) : null,
    cessRatePercent: duty ? blankToNull(values.cessRatePercent) : null,
    applicationDate: duty ? blankToNull(values.applicationDate) : null,
    tdsNatureOfPayments: duty ? blankToNull(values.tdsNatureOfPayments) : null,
    tcsNatureOfGoods: duty ? blankToNull(values.tcsNatureOfGoods) : null,
    othersPercentageOfCalculation: duty
      ? blankToNull(values.othersPercentageOfCalculation)
      : null,
    legalName: isParty ? blankToNull(values.legalName) : null,
    creditPeriod: isParty ? blankToNull(values.paymentTerms) : null,
    gstDetails: isParty ? values.gstDetails : null,
    contactInformations: isParty ? values.contactInformations : [],
    customerMerchantAddresses: isParty
      ? values.customerMerchantAddresses
      : undefined,
  };
};

/** production's getStateFromGstin: the first two digits name the state. */
export const stateFromGstin = (gstin: string) =>
  GST_STATE_CODES[gstin.slice(0, 2)] ?? "";
