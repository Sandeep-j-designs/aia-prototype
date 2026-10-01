import React from "react";
import { Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { ComboBox } from "@/components/common/combo-box";
import {
  setPrecisionToTwoDecimals,
  type StockItemForm,
} from "@/hooks/pages/inbox/use-stock-item-form";
import { Field, FieldCard, Req } from "@/components/inbox/v2/ui";
import { ErrorText, HelperText } from "./form-parts";
import GodownAllocationField from "./godown-allocation-field";
import GodownSplitModal from "./godown-split-modal";
import NumericInput from "./numeric-input";

type Props = {
  form: StockItemForm;
};

const toNumber = (value: string) => (value ? Number(value) : null);
const toText = (value: number | null) => (value !== null ? String(value) : "");

/** production's create-item/opening-balance-section.tsx */
const OpeningBalanceSection = ({ form }: Props) => {
  const {
    control,
    errors,
    values,
    stockUnitOptions,
    godownOptions,
    isUnitNotApplicable,
    isUnitEditable,
    isUnitLocked,
    shouldEnableGodownAllocation,
    hideSplitButton,
    isGodownModalOpen,
    setIsGodownModalOpen,
    setSingleGodownAllocation,
    setGodownAllocations,
    quantityForAllocation,
    unitRateForAllocation,
    openingBalanceAmount,
  } = form;
  const godownError =
    errors.godownAllocations?.message ||
    errors.godownAllocations?.root?.message;

  return (
    <FieldCard title="Opening Balance">
      <Field
        label={
          <>
            <Req />
            Unit
          </>
        }
        hint={
          isUnitLocked ? (
            <HelperText>
              Unit cannot be changed because this stock item is used in a
              voucher.
            </HelperText>
          ) : undefined
        }
      >
        <Controller
          control={control}
          name="unitUuid"
          render={({ field }) => (
            <ComboBox
              title="Select Unit"
              options={stockUnitOptions}
              selectedValue={field.value}
              onChange={(value) => field.onChange(String(value))}
              isMultiSelect={false}
              disabled={!isUnitEditable}
              hideClearButton={!isUnitEditable}
              invalid={!!errors.unitUuid}
            />
          )}
        />
        <ErrorText message={errors.unitUuid?.message} />
      </Field>

      {isUnitNotApplicable ? (
        <Field htmlFor="openingBalanceValue" label="Value">
          <Controller
            control={control}
            name="openingBalanceValue"
            render={({ field }) => (
              <NumericInput
                id="openingBalanceValue"
                placeholder="Enter value"
                value={toNumber(field.value)}
                allowNegative
                onChange={(val) => field.onChange(toText(val))}
                error={errors.openingBalanceValue?.message}
              />
            )}
          />
        </Field>
      ) : (
        <>
          {/* Unit sits alone on its row, as in production. */}
          <span aria-hidden className="hidden sm:block" />
          <Field htmlFor="quantity" label="Quantity">
            <Controller
              control={control}
              name="quantity"
              render={({ field }) => (
                <NumericInput
                  id="quantity"
                  placeholder="Enter quantity"
                  value={toNumber(field.value)}
                  allowNegative
                  onChange={(val) => field.onChange(toText(val))}
                  error={errors.quantity?.message}
                />
              )}
            />
          </Field>
          <Field htmlFor="rate" label="Rate">
            <Controller
              control={control}
              name="rate"
              render={({ field }) => (
                <NumericInput
                  id="rate"
                  placeholder="Enter rate"
                  value={toNumber(field.value)}
                  onChange={(val) => field.onChange(toText(val))}
                  error={errors.rate?.message}
                />
              )}
            />
          </Field>
          <Field htmlFor="perUnitLabel" label="Per">
            <Input
              id="perUnitLabel"
              readOnly
              value={values.perUnitLabel}
              className="bg-muted"
            />
          </Field>
          <Field htmlFor="openingBalanceValueComputed" label="Value">
            <NumericInput
              id="openingBalanceValueComputed"
              value={toNumber(values.openingBalanceValue)}
              disabled
              className="bg-muted"
            />
          </Field>
        </>
      )}

      <Field
        className="sm:col-span-2"
        label={
          <>
            {shouldEnableGodownAllocation && <Req />}
            Godown Allocation
          </>
        }
      >
        <GodownAllocationField
          allocations={values.godownAllocations}
          godownOptions={godownOptions}
          hideSplitButton={hideSplitButton}
          disabled={!shouldEnableGodownAllocation}
          invalid={!!godownError}
          onSelectSingleGodown={setSingleGodownAllocation}
          onOpenSplit={() => setIsGodownModalOpen(true)}
          onClear={() => setGodownAllocations([])}
        />
        {!shouldEnableGodownAllocation ? (
          <HelperText>
            Enter opening balance to enable godown allocation.
          </HelperText>
        ) : null}
        <ErrorText message={godownError} />
      </Field>

      {isGodownModalOpen && (
        <GodownSplitModal
          open
          onOpenChange={setIsGodownModalOpen}
          quantity={quantityForAllocation}
          rate={unitRateForAllocation}
          amount={
            isUnitNotApplicable
              ? openingBalanceAmount
              : setPrecisionToTwoDecimals(
                  quantityForAllocation * unitRateForAllocation
                )
          }
          allocations={values.godownAllocations}
          godownOptions={godownOptions}
          forceAmountEditableMode={isUnitNotApplicable}
          onSave={setGodownAllocations}
        />
      )}
    </FieldCard>
  );
};

export default OpeningBalanceSection;
