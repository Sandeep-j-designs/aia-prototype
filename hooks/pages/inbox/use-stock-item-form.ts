import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { getStockItemFormDefaults } from "@/config/pages/inbox/inventory";
import { stockItemSchema } from "@/schemas/inbox/stock-item";
import {
  inventoryActions,
  isSyncInProgress,
  toFormValues,
  useInventory,
} from "@/hooks/pages/inbox/use-inventory";
import type {
  AllocationLike,
  StockItemFormValues,
} from "@/types/pages/inbox/inventory";

/**
 * The Create / Edit Stock Item form: production's
 * hooks/pages/inventory-masters/create-item/index.ts, with the options,
 * detail and UoM-editability fetches read from the Inventory store instead.
 */

type Notify = (
  message: string,
  kind?: "success" | "error" | "warning" | "info"
) => void;

/** production's setPrecisionToTwoDecimals */
export const setPrecisionToTwoDecimals = (n: number) =>
  Math.round((n + Number.EPSILON) * 100) / 100;

/** production's getNumericValue */
export const getNumericValue = (value?: string | number | null) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

export const useStockItemForm = ({
  company,
  itemUuid,
  notify,
  onDone,
}: {
  company: string;
  /** Absent: Create. */
  itemUuid?: string;
  notify: Notify;
  /** Back to the Items list. */
  onDone: () => void;
}) => {
  const { options } = useInventory(company);
  const isEditMode = Boolean(itemUuid);
  // DEV: GET /api/inventory-masters/items/:itemUuid?companyId=…
  const [item] = useState(() =>
    itemUuid ? inventoryActions.getItem(company, itemUuid) : undefined
  );
  const isEditDisabled = isSyncInProgress(item?.thirdPartySyncStatus);
  // DEV: GET /api/inventory-masters/items/:itemUuid/uom-editable?companyId=…
  const isUnitLocked = isEditMode && item?.isUomEditable === false;
  const isUnitEditable = !isUnitLocked;
  const [isGodownModalOpen, setIsGodownModalOpen] = useState(false);

  const stockGroupOptions = options.groups;
  const stockCategoryOptions = options.categories;
  const stockUnitOptions = options.units;
  const hsnSacOptions = options.hsnSac;
  const godownOptions = options.godowns;

  const form = useForm<StockItemFormValues>({
    resolver: zodResolver(stockItemSchema),
    defaultValues: item
      ? toFormValues(item, options)
      : getStockItemFormDefaults(),
    // PROTOTYPE: production validates onChange; here errors wait for Save,
    // then follow each edit.
    mode: "onSubmit",
    reValidateMode: "onChange",
  });
  const {
    control,
    register,
    formState: { errors, isSubmitting },
    handleSubmit,
    setValue,
  } = form;

  const watched = useWatch({ control });
  const values: StockItemFormValues = {
    ...getStockItemFormDefaults(),
    ...(watched as Partial<StockItemFormValues>),
  };

  // The guards production raises once the detail fetch returns.
  useEffect(() => {
    // A tick later, so a toast raised on a direct page load waits for the
    // app's Toaster to mount (production raises it after a fetch anyway).
    const timer = setTimeout(() => {
      if (itemUuid && !item) {
        notify("Failed to fetch stock item details", "error");
        onDone();
        return;
      }
      if (isEditDisabled)
        notify("Cannot edit an item while sync is in progress", "warning");
    }, 0);
    // Clearing it also keeps StrictMode's double mount to one toast.
    return () => clearTimeout(timer);
  }, []);

  const isUnitNotApplicable = values.unitUuid === "not_applicable";

  useEffect(() => {
    const selectedLabel =
      stockUnitOptions.find((o) => o.value === values.unitUuid)?.label ||
      "Not Applicable";
    if (values.perUnitLabel !== selectedLabel)
      setValue("perUnitLabel", selectedLabel, {
        shouldDirty: false,
        shouldValidate: false,
      });

    if (!isUnitNotApplicable) {
      const quantity = getNumericValue(values.quantity);
      const rate = getNumericValue(values.rate);
      const computed =
        quantity && rate
          ? String(setPrecisionToTwoDecimals(quantity * rate))
          : "";
      if (values.openingBalanceValue !== computed)
        setValue("openingBalanceValue", computed, {
          shouldDirty: true,
          shouldValidate: false,
        });
      // PROTOTYPE: a single godown follows the line, so changing quantity
      // or rate does not strand it. Production leaves it for the schema to
      // flag.
      const single = values.godownAllocations;
      if (
        single.length === 1 &&
        (single[0].quantity !== quantity || single[0].rate !== rate)
      )
        setValue(
          "godownAllocations",
          [
            {
              ...single[0],
              quantity,
              rate,
              amount: setPrecisionToTwoDecimals(quantity * rate),
            },
          ],
          { shouldDirty: true }
        );
    } else {
      if (values.quantity !== "") setValue("quantity", "");
      if (values.rate !== "") setValue("rate", "");
      const allocations = values.godownAllocations;
      const value = getNumericValue(values.openingBalanceValue);
      if (
        allocations.some(
          (a) => Number(a.quantity || 0) !== 0 || Number(a.rate || 0) !== 0
        ) ||
        (allocations.length === 1 && allocations[0].amount !== value)
      )
        setValue(
          "godownAllocations",
          allocations.map((a) => ({
            ...a,
            quantity: 0,
            rate: 0,
            ...(allocations.length === 1 ? { amount: value } : {}),
          }))
        );
    }
  }, [
    isUnitNotApplicable,
    values.quantity,
    values.rate,
    values.unitUuid,
    values.openingBalanceValue,
  ]);

  useEffect(() => {
    const gstDetailSource = values.setAlterGst
      ? "custom"
      : "company_or_stock_group";
    if (values.gstDetailSource !== gstDetailSource)
      setValue("gstDetailSource", gstDetailSource);
  }, [values.setAlterGst, values.gstDetailSource]);

  const isGstApplicable = values.gstApplicability === "applicable";
  const shouldShowTaxability = isGstApplicable && values.setAlterGst;
  const shouldShowTaxType =
    shouldShowTaxability && values.taxabilityType === "taxable";
  const showIgstRate = shouldShowTaxType && values.taxType === "igst";
  const showCgstSgstRate =
    shouldShowTaxType && values.taxType === "cgst_sgst_utgst";
  const showCessValuation = shouldShowTaxType && values.taxType === "cess";
  const showCessRatePercent =
    showCessValuation &&
    ["based_on_value", "based_on_value_and_quantity"].includes(
      values.cessValuationType
    );
  const showCessRatePerUnit =
    showCessValuation &&
    ["based_on_quantity", "based_on_value_and_quantity"].includes(
      values.cessValuationType
    );

  const quantityForAllocation = isUnitNotApplicable
    ? 0
    : getNumericValue(values.quantity);
  const unitRateForAllocation = isUnitNotApplicable
    ? 0
    : getNumericValue(values.rate);
  const openingBalanceAmount = getNumericValue(values.openingBalanceValue);
  const shouldEnableGodownAllocation = openingBalanceAmount !== 0;
  const hideSplitButton = godownOptions.length <= 1;

  const setSingleGodownAllocation = (godownUuid: string) => {
    if (!godownUuid) {
      setValue("godownAllocations", [], {
        shouldDirty: true,
        shouldValidate: true,
      });
      return;
    }
    const amount = isUnitNotApplicable
      ? openingBalanceAmount
      : setPrecisionToTwoDecimals(
          quantityForAllocation * unitRateForAllocation
        );
    setValue(
      "godownAllocations",
      [
        {
          id: `single-${godownUuid}`,
          godownUuid,
          quantity: isUnitNotApplicable ? 0 : quantityForAllocation,
          rate: isUnitNotApplicable ? 0 : unitRateForAllocation,
          amount,
        },
      ],
      { shouldDirty: true, shouldValidate: true }
    );
  };

  const setGodownAllocations = (allocations: AllocationLike[]) =>
    setValue("godownAllocations", allocations, {
      shouldDirty: true,
      shouldValidate: true,
    });

  const onSubmit = (data: StockItemFormValues) => {
    if (isEditDisabled) {
      notify("Cannot edit an item in the current sync state", "warning");
      return;
    }
    inventoryActions.saveItem(company, itemUuid, data);
    notify(`Stock item ${isEditMode ? "updated" : "created"} successfully`);
    onDone();
  };

  return {
    form,
    control,
    register,
    errors,
    isSubmitting,
    values,
    isEditMode,
    isEditDisabled,
    isGodownModalOpen,
    setIsGodownModalOpen,
    stockGroupOptions,
    stockCategoryOptions,
    stockUnitOptions,
    hsnSacOptions,
    godownOptions,
    isUnitNotApplicable,
    isUnitEditable,
    isUnitLocked,
    isGstApplicable,
    shouldShowTaxability,
    shouldShowTaxType,
    showIgstRate,
    showCgstSgstRate,
    showCessValuation,
    showCessRatePercent,
    showCessRatePerUnit,
    quantityForAllocation,
    unitRateForAllocation,
    openingBalanceAmount,
    shouldEnableGodownAllocation,
    hideSplitButton,
    setSingleGodownAllocation,
    setGodownAllocations,
    onSubmit: handleSubmit(onSubmit),
    setValue,
  };
};

export type StockItemForm = ReturnType<typeof useStockItemForm>;
