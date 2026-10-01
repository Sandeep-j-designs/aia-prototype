import React, { useMemo } from "react";
import { Input } from "@/components/ui/input";
import {
  COA_BANK_OPTIONS,
  COUNTRIES,
  DUTY_SECTION_TAX_TYPE_OPTIONS,
  DUTY_TAX_TYPES,
  GST_APPLICABILITY,
  GST_APPLICABILITY_OPTIONS,
  GST_TREATMENT_OPTIONS,
  INDIAN_STATES,
  LEDGER_TYPES,
  TAXABILITY_TYPES,
  TAXABILITY_TYPE_OPTIONS,
  TAX_TYPES,
  TAX_TYPE_OPTIONS,
  TCS_NATURE_OPTIONS,
  TDS_NATURE_OPTIONS,
  TAX_TYPE_VALUES,
  YES_NO,
  YES_NO_OPTIONS,
} from "@/config/pages/inbox/chart-of-accounts";
import type {
  Option,
  UnderOption,
} from "@/types/pages/inbox/chart-of-accounts";
import { Field, FieldCard } from "@/components/inbox/v2/ui";
import {
  ComboField,
  DateInputField,
  InlineSwitch,
  OpeningBalanceFields,
  RateField,
  TextField,
  digits,
  upperAlnum,
  type FormApi,
} from "./form-fields";

/**
 * Production's forms/shared-sections/*, each drawn as one of the Inbox's
 * field cards (two columns on the section ground) instead of a heading over
 * a bare grid. The props are production's, so each form composes them the
 * way its production file does.
 */

/* ------------------------------------------------------------ Basic Details */
type BasicProps = {
  f: FormApi;
  underOptions: UnderOption[];
  onUnderChange: (value: string) => void;
  showCostCentre?: boolean;
  /** form-5's Type of Ledger, drawn right after Under. */
  afterUnder?: React.ReactNode;
};

/** Under, grouped by primary group so each option carries its path. */
const useUnderGroups = (underOptions: UnderOption[]) =>
  useMemo(() => {
    const groups = new Map<string, Option[]>();
    underOptions.forEach((option) => {
      const head = option.groupPath[0] ?? option.label;
      groups.set(head, [
        ...(groups.get(head) ?? []),
        { label: option.label, value: option.value },
      ]);
    });
    return [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, options]) => ({
        label,
        // The primary group first, then its sub-groups.
        options: options.sort((a, b) =>
          a.label === label
            ? -1
            : b.label === label
              ? 1
              : a.label.localeCompare(b.label)
        ),
      }));
  }, [underOptions]);

export const BasicDetailsSection = ({
  f,
  underOptions,
  onUnderChange,
  showCostCentre,
  afterUnder,
}: BasicProps) => {
  const optionGroups = useUnderGroups(underOptions);
  return (
    <FieldCard title="Basic Details">
      <TextField
        f={f}
        name="name"
        label="Ledger Name"
        required
        placeholder="E.g., Reliance Industries Ltd"
      />
      <ComboField
        f={f}
        name="under"
        label="Under"
        title="Select Under"
        required
        options={underOptions.map((o) => ({ label: o.label, value: o.value }))}
        optionGroups={optionGroups}
        hasSearch
        hideClearButton
        onPicked={onUnderChange}
      />
      {afterUnder}
      {showCostCentre ? (
        <ComboField
          f={f}
          name="costCentreApplicable"
          label="Cost Centre Applicable"
          title="Select Cost Centre Applicable"
          options={YES_NO_OPTIONS}
          hideClearButton
        />
      ) : null}
      <Field label="Currency of Ledger">
        <Input value="INR" disabled aria-label="Currency of Ledger" />
      </Field>
    </FieldCard>
  );
};

/* ---------------------------------------------------------- Address Details */
export const AddressSection = ({
  f,
  title = "Address Details",
  disabled,
  includeMobileNo = true,
  includeEmailId = true,
  includeContactPerson = false,
}: {
  f: FormApi;
  title?: string;
  disabled?: boolean;
  includeMobileNo?: boolean;
  includeEmailId?: boolean;
  includeContactPerson?: boolean;
}) => (
  <FieldCard title={title}>
    <TextField
      f={f}
      name="address"
      label="Address"
      placeholder="Enter Address"
      disabled={disabled}
      multiline
      wide
    />
    <ComboField
      f={f}
      name="country"
      label="Country"
      title="Select Country"
      options={COUNTRIES}
      disabled={disabled}
    />
    <ComboField
      f={f}
      name="state"
      label="State"
      title="Select State"
      options={INDIAN_STATES}
      disabled={disabled}
    />
    <TextField
      f={f}
      name="pincode"
      label="Pincode"
      placeholder="Enter Pincode"
      inputMode="numeric"
      maxLength={6}
      filter={digits(6)}
      disabled={disabled}
    />
    {includeContactPerson ? (
      <TextField
        f={f}
        name="contactPerson"
        label="Contact Person"
        placeholder="Enter Contact Person"
        disabled={disabled}
      />
    ) : null}
    {includeMobileNo ? (
      <TextField
        f={f}
        name="mobileNo"
        label="Mobile Number"
        type="tel"
        inputMode="numeric"
        maxLength={10}
        prefix="+91"
        filter={digits(10)}
        disabled={disabled}
      />
    ) : null}
    {includeEmailId ? (
      <TextField
        f={f}
        name="emailId"
        label="Email"
        type="email"
        placeholder="Enter Email"
        disabled={disabled}
      />
    ) : null}
  </FieldCard>
);

/* ------------------------------------------------- Tax Registration Details */
export const TaxRegistrationSection = ({
  f,
  disabled,
  includeGstTreatment,
  includeGstin = true,
  includePanItNo = true,
  disableGstTreatment,
  disableGstin,
  gstTreatmentLabel = "GST Treatment",
}: {
  f: FormApi;
  disabled?: boolean;
  includeGstTreatment?: boolean;
  includeGstin?: boolean;
  includePanItNo?: boolean;
  disableGstTreatment?: boolean;
  disableGstin?: boolean;
  gstTreatmentLabel?: string;
}) => (
  <FieldCard title="Tax Registration Details">
    {includeGstTreatment ? (
      <ComboField
        f={f}
        name="gstTreatmentUuid"
        label={gstTreatmentLabel}
        title={`Select ${gstTreatmentLabel}`}
        options={GST_TREATMENT_OPTIONS}
        disabled={disabled || disableGstTreatment}
        onPicked={(value) =>
          f.set(
            "gstTreatment",
            GST_TREATMENT_OPTIONS.find((o) => o.value === value)
              ?.korefiGstTreatment ?? ""
          )
        }
      />
    ) : null}
    {includeGstin ? (
      <TextField
        f={f}
        name="gstinUin"
        label="GSTIN/UIN"
        placeholder="Enter GSTIN/UIN"
        maxLength={15}
        disabled={disabled || disableGstin}
        filter={(raw) => {
          const next = upperAlnum(15)(raw);
          // PAN is characters 3–12 of a GSTIN; production fills it as you type.
          if (includePanItNo)
            f.set("panItNo", next.length >= 12 ? next.slice(2, 12) : "");
          return next;
        }}
      />
    ) : null}
    {includePanItNo ? (
      <TextField
        f={f}
        name="panItNo"
        label="PAN/IT No."
        placeholder="Enter PAN/IT No."
        maxLength={10}
        disabled={disabled}
        filter={upperAlnum(10)}
      />
    ) : null}
  </FieldCard>
);

/* ---------------------------------------------- Bank Account Details (form-1) */
export const BankAccountSection = ({ f }: { f: FormApi }) => (
  <FieldCard title="Bank Account Details">
    <TextField
      f={f}
      name="acHolderName"
      label="A/C Holder Name"
      placeholder="Enter A/C Holder Name"
      filter={(raw) => raw.replace(/[^a-zA-Z\s]/g, "")}
    />
    <ComboField
      f={f}
      name="bankName"
      label="Bank Name"
      title="Select Bank"
      options={COA_BANK_OPTIONS}
      hasSearch
    />
    <TextField
      f={f}
      name="acNumber"
      label="A/C Number"
      placeholder="Enter A/C Number"
      inputMode="numeric"
      maxLength={18}
      filter={digits(18)}
    />
    <TextField
      f={f}
      name="ifscCode"
      label="IFSC Code"
      placeholder="Enter IFSC Code"
      maxLength={11}
    />
    <TextField
      f={f}
      name="swiftCode"
      label="SWIFT Code"
      placeholder="Enter SWIFT Code"
    />
    <TextField f={f} name="branch" label="Branch" placeholder="Enter Branch" />
    <TextField
      f={f}
      name="bsrCode"
      label="BSR Code"
      placeholder="Enter BSR Code"
      inputMode="numeric"
      maxLength={7}
      filter={digits(7)}
    />
  </FieldCard>
);

/* ---------------------------------------------------------- Opening Balance */
export const OpeningBalanceSection = ({ f }: { f: FormApi }) => (
  <FieldCard title="Opening Balance">
    <OpeningBalanceFields f={f} />
  </FieldCard>
);

/* ------------------------------------------------ Statutory Details (4 / 5) */
export const StatutorySection = ({
  f,
  hsnLabel = "HSN/SAC",
  typeOfSupplyOptions,
  typeOfSupplyRequired,
}: {
  f: FormApi;
  hsnLabel?: string;
  typeOfSupplyOptions: Option[];
  typeOfSupplyRequired?: boolean;
}) => {
  const v = f.values;
  const hsnOn = v.setAlterHsnSac;
  const rateOn = v.setAlterTaxabilityRate;
  const applicable = v.gstApplicability === GST_APPLICABILITY.APPLICABLE;
  return (
    <FieldCard title="Statutory Details">
      <ComboField
        f={f}
        name="gstApplicability"
        label="GST Applicability"
        title="Select GST Applicability"
        options={GST_APPLICABILITY_OPTIONS}
        hideClearButton
        disabled={
          !!v.typeOfLedger && v.typeOfLedger !== LEDGER_TYPES.NOT_APPLICABLE
        }
      />
      {applicable ? (
        <>
          <InlineSwitch
            label="Set/Alter HSN Code"
            checked={hsnOn}
            onChange={(checked) => {
              f.set("setAlterHsnSac", checked);
              f.set("hsnSac", "");
            }}
          />
          {/* DEV: production's HsnSacAutoCompleteField — GET
              /api/inventory/hsn-sac?companyUuid=…, cursor-paginated. */}
          <TextField
            f={f}
            name="hsnSac"
            label={hsnLabel}
            placeholder={
              hsnOn
                ? "Select or type 2, 4, 6, or 8 digit HSN/SAC"
                : "As per company/master"
            }
            inputMode="numeric"
            maxLength={8}
            filter={digits(8)}
            disabled={!hsnOn}
          />
          <InlineSwitch
            label="Set/Alter Taxability & GST Rate"
            checked={rateOn}
            onChange={(checked) => f.set("setAlterTaxabilityRate", checked)}
          />
          <ComboField
            f={f}
            name="taxabilityType"
            label="Taxability Type"
            required
            title={rateOn ? "Select Taxability Type" : "As per company/master"}
            options={TAXABILITY_TYPE_OPTIONS}
            disabled={!rateOn}
          />
          {!rateOn || v.taxabilityType === TAXABILITY_TYPES.TAXABLE ? (
            <RateField
              f={f}
              name="igstRate"
              label="GST Rate"
              required
              placeholder={rateOn ? "Enter GST rate" : "As per company/master"}
              disabled={
                !rateOn || v.taxabilityType !== TAXABILITY_TYPES.TAXABLE
              }
            />
          ) : null}
          <ComboField
            f={f}
            name="typeOfSupply"
            label="Type of Supply"
            required={typeOfSupplyRequired}
            title="Select Type of Supply"
            options={typeOfSupplyOptions}
          />
        </>
      ) : null}
    </FieldCard>
  );
};

/* ---------------------------------------------- Duties & Taxes (form-4 / 5) */

/** Clearing what a new Type of Duty/Tax or Tax Type no longer shows. */
export const clearDutyRates = (f: FormApi, keep?: string) =>
  (["igstRate", "cgstRate", "sgstUgstRate", "cessRatePercent"] as const)
    .filter((name) => name !== keep)
    .forEach((name) => f.set(name, ""));

const RATE_FIELD_BY_TAX_TYPE: Record<string, string> = {
  [TAX_TYPES.IGST]: "igstRate",
  [TAX_TYPES.CGST]: "cgstRate",
  [TAX_TYPES.SGST]: "sgstUgstRate",
  [TAX_TYPES.CESS]: "cessRatePercent",
};

/** The GST rate fields under a chosen Tax Type, then Application Date. */
const GstDutyRateFields = ({ f }: { f: FormApi }) => {
  const taxType = f.values.taxType;
  return (
    <>
      {taxType === TAX_TYPES.IGST ? (
        <RateField
          f={f}
          name="igstRate"
          label="IGST Rate"
          required
          placeholder="Enter IGST rate"
        />
      ) : null}
      {taxType === TAX_TYPES.CGST ? (
        <RateField
          f={f}
          name="cgstRate"
          label="CGST Rate"
          required
          placeholder="Enter CGST rate"
        />
      ) : null}
      {taxType === TAX_TYPES.SGST ? (
        <RateField
          f={f}
          name="sgstUgstRate"
          label="SGST/UTGST Rate"
          required
          placeholder="Enter SGST/UTGST rate"
        />
      ) : null}
      {taxType === TAX_TYPES.CESS ? (
        <RateField
          f={f}
          name="cessRatePercent"
          label="CESS Rate"
          required
          placeholder="Enter CESS rate"
        />
      ) : null}
      {TAX_TYPE_VALUES.includes(taxType) ? (
        <DateInputField f={f} name="applicationDate" label="Application Date" />
      ) : null}
    </>
  );
};

const TaxTypeField = ({ f, options }: { f: FormApi; options: Option[] }) => (
  <ComboField
    f={f}
    name="taxType"
    label="Tax Type"
    required
    title="Select Tax Type"
    options={options}
    onPicked={(value) => clearDutyRates(f, RATE_FIELD_BY_TAX_TYPE[value])}
  />
);

const NatureFields = ({ f }: { f: FormApi }) => (
  <>
    {f.values.typeOfDutyTax === DUTY_TAX_TYPES.TDS ? (
      <ComboField
        f={f}
        name="tdsNatureOfPayments"
        label="Nature of Payments"
        required
        title="Select Nature of Payments"
        options={TDS_NATURE_OPTIONS}
      />
    ) : null}
    {f.values.typeOfDutyTax === DUTY_TAX_TYPES.TCS ? (
      <ComboField
        f={f}
        name="tcsNatureOfGoods"
        label="Nature of Goods"
        required
        title="Select Nature of Goods"
        options={TCS_NATURE_OPTIONS}
      />
    ) : null}
  </>
);

const TypeOfDutyField = ({ f, options }: { f: FormApi; options: Option[] }) => (
  <ComboField
    f={f}
    name="typeOfDutyTax"
    label="Type of Duty/Tax"
    required
    title="Select Type of Duty/Tax"
    options={options}
    onPicked={(value) => {
      if (value !== DUTY_TAX_TYPES.GST) {
        f.set("taxType", "");
        clearDutyRates(f);
      }
      if (value !== DUTY_TAX_TYPES.TDS) f.set("tdsNatureOfPayments", "");
      if (value !== DUTY_TAX_TYPES.TCS) f.set("tcsNatureOfGoods", "");
    }}
  />
);

/** production's SharedDutyTaxesSection (form-4 and form-5). */
export const DutyTaxesSection = ({
  f,
  typeOfDutyTaxOptions,
  showOthersPercentage,
}: {
  f: FormApi;
  typeOfDutyTaxOptions: Option[];
  showOthersPercentage?: boolean;
}) => (
  <FieldCard title="Duties & Taxes Details">
    <TypeOfDutyField f={f} options={typeOfDutyTaxOptions} />
    {f.values.typeOfDutyTax === DUTY_TAX_TYPES.GST ? (
      <>
        <TaxTypeField f={f} options={DUTY_SECTION_TAX_TYPE_OPTIONS} />
        <GstDutyRateFields f={f} />
      </>
    ) : null}
    <NatureFields f={f} />
    {showOthersPercentage &&
    f.values.typeOfDutyTax === DUTY_TAX_TYPES.OTHERS ? (
      <RateField
        f={f}
        name="othersPercentageOfCalculation"
        label="If Others: Percentage of Calculation"
        required
        placeholder="Enter rate"
        suffix=""
      />
    ) : null}
  </FieldCard>
);

/** form-6's own duty fields: Taxability Type comes before Tax Type. */
export const Form6DutySection = ({
  f,
  typeOfDutyTaxOptions,
}: {
  f: FormApi;
  typeOfDutyTaxOptions: Option[];
}) => {
  const gst = f.values.typeOfDutyTax === DUTY_TAX_TYPES.GST;
  const taxable = f.values.taxabilityType === TAXABILITY_TYPES.TAXABLE;
  return (
    <FieldCard title="Duties & Taxes Details">
      <TypeOfDutyField f={f} options={typeOfDutyTaxOptions} />
      {gst ? (
        <>
          <ComboField
            f={f}
            name="taxabilityType"
            label="Taxability Type"
            required
            title="Select Taxability Type"
            options={TAXABILITY_TYPE_OPTIONS}
            onPicked={(value) => {
              if (value !== TAXABILITY_TYPES.TAXABLE) {
                f.set("taxType", "");
                clearDutyRates(f);
              }
            }}
          />
          {taxable ? (
            <>
              <TaxTypeField f={f} options={TAX_TYPE_OPTIONS} />
              <GstDutyRateFields f={f} />
            </>
          ) : null}
        </>
      ) : null}
      <NatureFields f={f} />
    </FieldCard>
  );
};

/* -------------------------------------------- Additional Fields (2/4/5/6) */
export const isYes = (value: string) => value === YES_NO.YES;
export const yesNo = (checked: boolean) => (checked ? YES_NO.YES : YES_NO.NO);
