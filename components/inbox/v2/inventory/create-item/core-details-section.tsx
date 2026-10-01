import React from "react";
import { Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { ComboBox } from "@/components/common/combo-box";
import type { StockItemForm } from "@/hooks/pages/inbox/use-stock-item-form";
import { Field, FieldCard, Req } from "@/components/inbox/v2/ui";
import { ErrorText } from "./form-parts";

type Props = {
  form: StockItemForm;
};

/** production's create-item/core-details-section.tsx */
const CoreDetailsSection = ({ form }: Props) => {
  const { register, control, errors, stockGroupOptions, stockCategoryOptions } =
    form;
  return (
    <FieldCard title="Core Details">
      <Field
        htmlFor="name"
        label={
          <>
            <Req />
            Name
          </>
        }
      >
        <Input
          id="name"
          placeholder="Enter item name"
          aria-invalid={!!errors.name}
          error={errors.name?.message}
          {...register("name")}
        />
      </Field>

      <Field
        label={
          <>
            <Req />
            Under
          </>
        }
      >
        <Controller
          control={control}
          name="underUuid"
          render={({ field }) => (
            <ComboBox
              title="Select Under"
              options={stockGroupOptions}
              selectedValue={field.value}
              onChange={(value) => field.onChange(String(value))}
              isMultiSelect={false}
              invalid={!!errors.underUuid}
            />
          )}
        />
        <ErrorText message={errors.underUuid?.message} />
      </Field>

      <Field
        label={
          <>
            <Req />
            Category
          </>
        }
      >
        <Controller
          control={control}
          name="categoryUuid"
          render={({ field }) => (
            <ComboBox
              title="Select Category"
              options={stockCategoryOptions}
              selectedValue={field.value}
              onChange={(value) => field.onChange(String(value))}
              isMultiSelect={false}
              invalid={!!errors.categoryUuid}
            />
          )}
        />
        <ErrorText message={errors.categoryUuid?.message} />
      </Field>
    </FieldCard>
  );
};

export default CoreDetailsSection;
