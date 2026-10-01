/**
 * Stock item form schema — production's schemas/inventory-masters/stock-item.ts,
 * unchanged but for the types import.
 */
import { z } from "zod";
import {
  CessValuationType,
  GstApplicability,
  GstDetailSource,
  TaxabilityType,
  TaxType,
} from "@/types/pages/inbox/inventory";

const gstApplicabilitySchema = z.enum([
  "applicable",
  "not_applicable",
] as const satisfies readonly GstApplicability[]);

const gstDetailSourceSchema = z.enum([
  "custom",
  "company_or_stock_group",
] as const satisfies readonly GstDetailSource[]);

const taxabilityTypeSchema = z.enum([
  "taxable",
  "exempt",
  "nil_rated",
  "non_gst",
] as const satisfies readonly TaxabilityType[]);

const taxTypeSchema = z.enum([
  "igst",
  "cgst_sgst_utgst",
  "cess",
] as const satisfies readonly TaxType[]);

const cessValuationTypeSchema = z.enum([
  "not_applicable",
  "based_on_quantity",
  "based_on_value",
  "based_on_value_and_quantity",
] as const satisfies readonly CessValuationType[]);

const numericString = z
  .string()
  .trim()
  .regex(/^$|^\d+(\.\d+)?$/, "Please enter a valid number");

const signedNumericString = z
  .string()
  .trim()
  .regex(/^$|^-?\d+(\.\d+)?$/, "Please enter a valid number");

export const stockItemSchema = z
  .object({
    name: z.string().trim().min(1, "Please enter a stock item name"),
    underUuid: z.string().trim().min(1, "Please select a stock group"),
    categoryUuid: z.string().trim().min(1, "Please select a category"),
    unitUuid: z.string().trim().min(1, "Please select a unit"),

    gstApplicability: gstApplicabilitySchema,
    setAlterGst: z.boolean(),
    setAlterHsnSac: z.boolean(),
    gstDetailSource: gstDetailSourceSchema,
    taxabilityType: taxabilityTypeSchema,
    taxType: z.union([taxTypeSchema, z.literal("")]),

    igstRate: numericString,
    cgstRate: numericString,
    sgstUgstRate: numericString,
    cessValuationType: cessValuationTypeSchema,
    cessRatePercent: numericString,
    cessRatePerUnit: numericString,

    applicableDate: z.date().nullable(),
    applicableForReverseCharge: z.boolean(),
    eligibleForInputTaxCredit: z.boolean(),

    typeOfSupply: z.enum(["goods", "services", "capital_goods"]),
    hsnSac: z.string().trim(),

    quantity: signedNumericString,
    rate: numericString,
    perUnitLabel: z.string(),
    openingBalanceValue: signedNumericString,

    godownAllocations: z
      .array(
        z.object({
          id: z.string().optional(),
          godownUuid: z.string().nullable().optional(),
          quantity: z.number().nullable().optional(),
          rate: z.number().nullable().optional(),
          discount: z.number().nullable().optional(),
          amount: z.number().nullable().optional(),
        })
      )
      .default([]),
  })
  .superRefine((values, ctx) => {
    if (values.gstApplicability === "not_applicable" && values.setAlterGst) {
      ctx.addIssue({
        code: "custom",
        path: ["setAlterGst"],
        message: "Set/Alter GST should be No when GST is not applicable",
      });
    }

    if (values.gstApplicability === "applicable") {
      if (values.setAlterHsnSac) {
        if (!values.hsnSac) {
          ctx.addIssue({
            code: "custom",
            path: ["hsnSac"],
            message: "Please enter an HSN/SAC",
          });
        } else if (!/^(\d{2}|\d{4}|\d{6}|\d{8})$/.test(values.hsnSac)) {
          ctx.addIssue({
            code: "custom",
            path: ["hsnSac"],
            message: "HSN/SAC must be 2, 4, 6, or 8 digits",
          });
        }
      }

      if (values.setAlterGst && values.gstDetailSource !== "custom") {
        ctx.addIssue({
          code: "custom",
          path: ["gstDetailSource"],
          message:
            "GST details should be set as custom when Set/Alter GST is Yes",
        });
      }

      if (
        !values.setAlterGst &&
        values.gstDetailSource !== "company_or_stock_group"
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["gstDetailSource"],
          message:
            "GST details should be inherited from company/stock group when Set/Alter GST is No",
        });
      }

      if (values.setAlterGst) {
        if (!values.applicableDate) {
          ctx.addIssue({
            code: "custom",
            path: ["applicableDate"],
            message: "Please select a valid applicable date",
          });
        }

        if (values.taxabilityType === "taxable") {
          if (!values.taxType) {
            ctx.addIssue({
              code: "custom",
              path: ["taxType"],
              message: "This field is required",
            });
          }

          if (values.taxType === "igst" && !values.igstRate) {
            ctx.addIssue({
              code: "custom",
              path: ["igstRate"],
              message: "This field is required",
            });
          }

          if (values.taxType === "cgst_sgst_utgst") {
            if (!values.cgstRate) {
              ctx.addIssue({
                code: "custom",
                path: ["cgstRate"],
                message: "This field is required",
              });
            }
            if (!values.sgstUgstRate) {
              ctx.addIssue({
                code: "custom",
                path: ["sgstUgstRate"],
                message: "This field is required",
              });
            }
          }

          if (values.taxType === "cess") {
            if (
              values.cessValuationType === "based_on_value" &&
              !values.cessRatePercent
            ) {
              ctx.addIssue({
                code: "custom",
                path: ["cessRatePercent"],
                message: "This field is required",
              });
            }

            if (
              values.cessValuationType === "based_on_quantity" &&
              !values.cessRatePerUnit
            ) {
              ctx.addIssue({
                code: "custom",
                path: ["cessRatePerUnit"],
                message: "This field is required",
              });
            }

            if (values.cessValuationType === "based_on_value_and_quantity") {
              if (!values.cessRatePercent) {
                ctx.addIssue({
                  code: "custom",
                  path: ["cessRatePercent"],
                  message: "This field is required",
                });
              }
              if (!values.cessRatePerUnit) {
                ctx.addIssue({
                  code: "custom",
                  path: ["cessRatePerUnit"],
                  message: "This field is required",
                });
              }
            }
          }
        }
      }
    }

    if (values.unitUuid !== "not_applicable") {
      if (values.quantity && !values.rate) {
        ctx.addIssue({
          code: "custom",
          path: ["rate"],
          message: "Please enter a rate",
        });
      }

      if (!values.quantity && values.rate) {
        ctx.addIssue({
          code: "custom",
          path: ["quantity"],
          message: "Please enter a quantity",
        });
      }
    }

    const openingBalanceAmount = Number(values.openingBalanceValue || 0);
    if (openingBalanceAmount !== 0 && values.godownAllocations.length < 1) {
      ctx.addIssue({
        code: "custom",
        path: ["godownAllocations"],
        message: "Please allocate opening balance to a godown",
      });
    }

    if (openingBalanceAmount === 0 || values.godownAllocations.length === 0) {
      return;
    }

    const hasMissingGodownSelection = values.godownAllocations.some(
      (allocation) => !allocation.godownUuid
    );
    if (hasMissingGodownSelection) {
      ctx.addIssue({
        code: "custom",
        path: ["godownAllocations"],
        message: "Select a godown for each allocation row",
      });
      return;
    }

    const selectedGodowns = values.godownAllocations
      .map((allocation) => allocation.godownUuid || "")
      .filter(Boolean);
    if (new Set(selectedGodowns).size !== selectedGodowns.length) {
      ctx.addIssue({
        code: "custom",
        path: ["godownAllocations"],
        message: "Duplicate godown selections are not allowed",
      });
      return;
    }

    if (values.unitUuid === "not_applicable") {
      const hasNonZeroQuantityOrRate = values.godownAllocations.some(
        (allocation) =>
          Number(allocation.quantity || 0) !== 0 ||
          Number(allocation.rate || 0) !== 0
      );
      if (hasNonZeroQuantityOrRate) {
        ctx.addIssue({
          code: "custom",
          path: ["godownAllocations"],
          message: "Quantity and rate must be zero when unit is not applicable",
        });
        return;
      }
    } else {
      const targetQuantity = Number(values.quantity || 0);
      const hasInvalidQuantity = values.godownAllocations.some((allocation) => {
        const quantity = Number(allocation.quantity || 0);
        if (quantity === 0) return true;
        if (targetQuantity === 0) return false;
        return Math.sign(quantity) !== Math.sign(targetQuantity);
      });
      if (hasInvalidQuantity) {
        ctx.addIssue({
          code: "custom",
          path: ["godownAllocations"],
          message:
            "Allocated quantity must be non-zero and follow the opening balance quantity sign",
        });
        return;
      }

      const totalAllocatedQuantity = values.godownAllocations.reduce(
        (sum, allocation) => sum + Number(allocation.quantity || 0),
        0
      );
      if (Math.abs(totalAllocatedQuantity - targetQuantity) > 0.0001) {
        ctx.addIssue({
          code: "custom",
          path: ["godownAllocations"],
          message: "Allocated quantity must match opening balance quantity",
        });
        return;
      }
    }

    const totalAllocatedAmount = values.godownAllocations.reduce(
      (sum, allocation) => sum + Number(allocation.amount || 0),
      0
    );
    if (Math.abs(totalAllocatedAmount - openingBalanceAmount) > 0.01) {
      ctx.addIssue({
        code: "custom",
        path: ["godownAllocations"],
        message: "Allocated amount must match opening balance value",
      });
    }
  });

export type StockItemFormSchema = z.infer<typeof stockItemSchema>;
