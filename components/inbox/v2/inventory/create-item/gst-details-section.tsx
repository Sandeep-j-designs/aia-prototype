import React from "react";
import { format } from "date-fns";
import { Controller, useFormState } from "react-hook-form";
import { ComboBox } from "@/components/common/combo-box";
import {
  CESS_VALUATION_TYPE_OPTIONS,
  GST_APPLICABILITY_OPTIONS,
  TAXABILITY_TYPE_OPTIONS,
  TAX_TYPE_OPTIONS,
  TYPE_OF_SUPPLY_OPTIONS,
} from "@/config/pages/inbox/inventory";
import type { StockItemForm } from "@/hooks/pages/inbox/use-stock-item-form";
import type { StockItemFormValues } from "@/types/pages/inbox/inventory";
import { DateField, Field, FieldCard, Req } from "@/components/inbox/v2/ui";
import { ErrorText, HelperText, SwitchRow } from "./form-parts";
import HsnSacAutocompleteField from "./hsn-sac-autocomplete-field";
import NumericInput from "./numeric-input";

type Props = {
  form: StockItemForm;
};

type RateKey = keyof Pick<
  StockItemFormValues,
  | "igstRate"
  | "cgstRate"
  | "sgstUgstRate"
  | "cessRatePercent"
  | "cessRatePerUnit"
>;

/** production's create-item/gst-details-section.tsx */
const GstDetailsSection = ({ form }: Props) => {
  const {
    control,
    errors,
    setValue,
    values,
    hsnSacOptions,
    isGstApplicable,
    isEditMode,
    shouldShowTaxability,
    shouldShowTaxType,
    showIgstRate,
    showCgstSgstRate,
    showCessValuation,
    showCessRatePercent,
    showCessRatePerUnit,
  } = form;
  const shouldShowSetAlterGstToggle = isGstApplicable || isEditMode;
  const { isSubmitted, dirtyFields } = useFormState({ control });

  const rateField = (name: RateKey, label: string, placeholder: string) => (
    <Field
      htmlFor={name}
      label={
        <>
          <Req />
          {label}
        </>
      }
    >
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <NumericInput
            id={name}
            placeholder={placeholder}
            value={field.value ? Number(field.value) : null}
            onChange={(val) => field.onChange(val !== null ? String(val) : "")}
            error={errors[name]?.message}
          />
        )}
      />
    </Field>
  );

  const selectedHsn = hsnSacOptions.find((o) => o.value === values.hsnSac);
  const hsnError =
    errors.hsnSac?.message && (isSubmitted || dirtyFields.hsnSac)
      ? errors.hsnSac.message
      : undefined;

  return (
    <FieldCard title="GST Details">
      <Field
        label={
          <>
            <Req />
            GST Applicability
          </>
        }
      >
        <Controller
          control={control}
          name="gstApplicability"
          render={({ field }) => (
            <ComboBox
              title="Select GST Applicability"
              options={GST_APPLICABILITY_OPTIONS}
              selectedValue={field.value}
              onChange={(value) => {
                field.onChange(value);
                if (value === "not_applicable")
                  setValue("setAlterGst", false, {
                    shouldDirty: true,
                    shouldValidate: isSubmitted,
                  });
              }}
              isMultiSelect={false}
              hasSearch={false}
              hideClearButton
            />
          )}
        />
        <ErrorText message={errors.gstApplicability?.message} />
      </Field>

      {shouldShowSetAlterGstToggle ? (
        <Controller
          control={control}
          name="setAlterGst"
          render={({ field }) => (
            <SwitchRow
              id="setAlterGst"
              label="Set/Alter GST"
              checked={Boolean(field.value)}
              onCheckedChange={(checked) => {
                field.onChange(checked);
                if (checked && !isGstApplicable)
                  setValue("gstApplicability", "applicable", {
                    shouldDirty: true,
                  });
              }}
            />
          )}
        />
      ) : null}

      {shouldShowTaxability ? (
        <Field
          label={
            <>
              <Req />
              Taxability Type
            </>
          }
        >
          <Controller
            control={control}
            name="taxabilityType"
            render={({ field }) => (
              <ComboBox
                title="Select Taxability Type"
                options={TAXABILITY_TYPE_OPTIONS}
                selectedValue={field.value}
                onChange={field.onChange}
                isMultiSelect={false}
                hasSearch={false}
                hideClearButton
              />
            )}
          />
          <ErrorText message={errors.taxabilityType?.message} />
        </Field>
      ) : null}

      {shouldShowTaxType ? (
        <Field
          label={
            <>
              <Req />
              Tax Type
            </>
          }
        >
          <Controller
            control={control}
            name="taxType"
            render={({ field }) => (
              <ComboBox
                title="Select Tax Type"
                options={TAX_TYPE_OPTIONS}
                selectedValue={field.value || ""}
                onChange={field.onChange}
                isMultiSelect={false}
                hasSearch={false}
                invalid={!!errors.taxType}
              />
            )}
          />
          <ErrorText message={errors.taxType?.message} />
        </Field>
      ) : null}

      {showIgstRate
        ? rateField("igstRate", "IGST Rate", "Enter IGST rate")
        : null}

      {showCgstSgstRate ? (
        <>
          {rateField("cgstRate", "CGST Rate", "Enter CGST rate")}
          {rateField(
            "sgstUgstRate",
            "SGST/UTGST Rate",
            "Enter SGST/UTGST rate"
          )}
        </>
      ) : null}

      {showCessValuation ? (
        <>
          <Field
            label={
              <>
                <Req />
                Cess Valuation Type
              </>
            }
          >
            <Controller
              control={control}
              name="cessValuationType"
              render={({ field }) => (
                <ComboBox
                  title="Select valuation type"
                  options={CESS_VALUATION_TYPE_OPTIONS}
                  selectedValue={field.value}
                  onChange={field.onChange}
                  isMultiSelect={false}
                  hasSearch={false}
                />
              )}
            />
            <ErrorText message={errors.cessValuationType?.message} />
          </Field>
          {showCessRatePercent
            ? rateField("cessRatePercent", "CESS Rate", "Enter CESS rate")
            : null}
          {showCessRatePerUnit
            ? rateField(
                "cessRatePerUnit",
                "CESS Rate / Unit",
                "Enter CESS rate per unit"
              )
            : null}
        </>
      ) : null}

      {shouldShowTaxability ? (
        <>
          <Field
            htmlFor="applicableDate"
            label={
              <>
                <Req />
                Applicable Date
              </>
            }
          >
            <Controller
              control={control}
              name="applicableDate"
              render={({ field }) => (
                <DateField
                  id="applicableDate"
                  value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                  onChange={(iso) =>
                    field.onChange(iso ? new Date(`${iso}T00:00:00`) : null)
                  }
                />
              )}
            />
            <ErrorText message={errors.applicableDate?.message} />
          </Field>
          <Controller
            control={control}
            name="applicableForReverseCharge"
            render={({ field }) => (
              <SwitchRow
                id="applicableForReverseCharge"
                label="Applicable for Reverse Charge"
                checked={Boolean(field.value)}
                onCheckedChange={field.onChange}
              />
            )}
          />
          <Controller
            control={control}
            name="eligibleForInputTaxCredit"
            render={({ field }) => (
              <SwitchRow
                id="eligibleForInputTaxCredit"
                label="Eligible for ITC"
                checked={Boolean(field.value)}
                onCheckedChange={field.onChange}
              />
            )}
          />
        </>
      ) : null}

      <Field
        label={
          <>
            <Req />
            Type of Supply
          </>
        }
        className="sm:col-start-1"
      >
        <Controller
          control={control}
          name="typeOfSupply"
          render={({ field }) => (
            <ComboBox
              title="Select Type of Supply"
              options={TYPE_OF_SUPPLY_OPTIONS}
              selectedValue={field.value}
              onChange={field.onChange}
              isMultiSelect={false}
              hasSearch={false}
              hideClearButton
            />
          )}
        />
        <ErrorText message={errors.typeOfSupply?.message} />
      </Field>

      <Controller
        control={control}
        name="setAlterHsnSac"
        render={({ field }) => (
          <SwitchRow
            id="setAlterHsnSac"
            label="Set/Alter HSN Code"
            checked={Boolean(field.value)}
            onCheckedChange={(checked) => {
              field.onChange(checked);
              if (!checked)
                setValue("hsnSac", "", {
                  shouldDirty: true,
                  shouldValidate: isSubmitted,
                });
            }}
          />
        )}
      />

      <Field
        htmlFor="hsnSac"
        label={
          <>
            {values.setAlterHsnSac && <Req />}
            HSN/SAC
          </>
        }
        hint={
          selectedHsn && values.setAlterHsnSac ? (
            <HelperText>{selectedHsn.label.replace(/^\d+ - /, "")}</HelperText>
          ) : undefined
        }
      >
        <Controller
          control={control}
          name="hsnSac"
          render={({ field }) => (
            <HsnSacAutocompleteField
              id="hsnSac"
              value={field.value || ""}
              onChange={field.onChange}
              options={hsnSacOptions}
              disabled={!values.setAlterHsnSac}
              invalid={!!hsnError}
              placeholder={
                values.setAlterHsnSac
                  ? "Select or type 2, 4, 6, or 8 digit HSN/SAC"
                  : "As per company/master"
              }
            />
          )}
        />
        <ErrorText message={hsnError} />
      </Field>
    </FieldCard>
  );
};

export default GstDetailsSection;
