import React from "react";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useStockItemForm } from "@/hooks/pages/inbox/use-stock-item-form";
import { PageButton, T } from "@/components/inbox/v2/ui";
import CoreDetailsSection from "./core-details-section";
import GstDetailsSection from "./gst-details-section";
import OpeningBalanceSection from "./opening-balance-section";

type Props = {
  company: string;
  /** Absent: Create Stock Item. */
  itemUuid?: string;
  onBack: () => void;
  notify: (
    message: string,
    kind?: "success" | "error" | "warning" | "info"
  ) => void;
};

const FORM_ID = "stock-item-form";

/**
 * Create / Edit Stock Item: production's create-item/index.tsx, top-bar.tsx
 * and form.tsx on one page. The sections sit in the bill sheet's field cards
 * rather than production's bare headings.
 */
const CreateItem = ({ company, itemUuid, onBack, notify }: Props) => {
  const form = useStockItemForm({
    company,
    itemUuid,
    notify,
    onDone: onBack,
  });
  const { isEditMode, isSubmitting, isEditDisabled, onSubmit } = form;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-neutral-gray px-6 pb-3 pt-5">
        <PageButton
          label="Back to Inventory Masters"
          disabled={false}
          onClick={onBack}
        >
          <ChevronLeft className="h-5 w-5" />
        </PageButton>
        <h1 className={cn(T.title, "mr-auto text-2xl")}>
          {isEditMode ? "Edit Stock Item" : "Create Stock Item"}
        </h1>
        <Button type="button" variant="outline" onClick={onBack}>
          Cancel
        </Button>
        <Button
          type="submit"
          form={FORM_ID}
          disabled={isSubmitting || isEditDisabled}
        >
          {isEditMode ? "Update Item" : "Save Item"}
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <form
          id={FORM_ID}
          onSubmit={onSubmit}
          noValidate
          className="flex w-full max-w-4xl flex-col gap-4 px-6 py-6"
        >
          <CoreDetailsSection form={form} />
          <OpeningBalanceSection form={form} />
          <GstDetailsSection form={form} />
        </form>
      </div>
    </div>
  );
};

export default CreateItem;
