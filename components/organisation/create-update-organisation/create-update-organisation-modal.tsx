import React, { useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import OrganisationForm from "./organisation-form";
import { useOrganisationForm } from "@/hooks/organisation/useCreateOrganisationForm";
import type {
  CreateUpdateOrganisationProps,
  OrganisationSuccessResult,
} from "@/types/components/organisation";

type Props = CreateUpdateOrganisationProps & {
  /** Prototype-only: the other organisations' names, for the duplicate check. */
  existingNames: string[];
  /** Prototype-only: creates or renames, standing in for /api/companies. */
  onSave: (legalName: string) => string;
};

/**
 * Create / Update Organisation. Production:
 * components/organisation/create-update-organisation/
 * create-update-organisation-modal.tsx, built on common/modal — which this
 * prototype does not have, so the same layout sits on ui/dialog.
 *
 * Production sends a new organisation to Get Started / Configuration after
 * creating it. The prototype has neither, so the new organisation simply
 * becomes the active one and the page stays put.
 */
const CreateUpdateOrganisationModal = ({
  isOpen,
  setIsOpen,
  company,
  onSuccess,
  existingNames,
  onSave,
}: Props) => {
  const isEditMode = Boolean(company);

  const handleFormSuccess = useCallback(
    async (result: OrganisationSuccessResult) => {
      await onSuccess?.(result);
      setIsOpen(false);
    },
    [onSuccess, setIsOpen]
  );

  const form = useOrganisationForm({
    mode: isEditMode ? "edit" : "create",
    companyUuid: company?.companyUuid,
    initialValues: company ? { legalName: company.companyName } : undefined,
    existingNames,
    save: onSave,
    onSuccess: handleFormSuccess,
  });

  const actionLabel = isEditMode ? "Update" : "Create";

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="flex max-w-[485px] flex-col gap-0 p-0">
        <DialogHeader className="border-b border-neutral-gray px-4 pb-5 pt-4">
          {/* Typography's h5 and sm styles, on Radix's own elements — Typography
              takes no ref, so it cannot sit under asChild. */}
          <DialogTitle className="text-h5 font-normal">
            {`${actionLabel} Organisation`}
          </DialogTitle>
          <DialogDescription className="text-body-4 text-primary">
            Provide your official organisation information
          </DialogDescription>
        </DialogHeader>
        <div className="px-4 pt-5">
          <OrganisationForm
            {...form}
            onSubmit={form.handleSubmit}
            showLegalNameDescription
            inputClassName="h-12"
            ButtonComponent={
              <div className="flex justify-end py-3">
                <Button
                  id={isEditMode ? "update" : "create"}
                  type="submit"
                  loading={form.isLoading}
                  size="lg"
                  className="w-1/3"
                >
                  {actionLabel}
                </Button>
              </div>
            }
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateUpdateOrganisationModal;
