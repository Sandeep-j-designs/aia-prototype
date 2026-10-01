import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  OrganizationFormData,
  organizationSchema,
} from "@/schemas/organisations";

type UseOrganisationFormOptions = {
  mode?: "create" | "edit";
  companyUuid?: string;
  initialValues?: Partial<OrganizationFormData>;
  /**
   * Prototype-only: the other organisations' names. Production's
   * POST/PUT /api/companies rejects a duplicate and the form shows its error;
   * here the hook checks against these instead.
   */
  existingNames?: string[];
  /**
   * Prototype-only: stands in for the API call. Creates or renames the
   * organisation and returns its companyUuid.
   */
  save: (legalName: string) => string;
  onSuccess?: (result: {
    companyUuid: string;
    ucUuid?: string;
    companyName: string;
  }) => void | Promise<void>;
};

/** What the API answers for a name the user already has. */
export const DUPLICATE_ORGANISATION_ERROR =
  "You already have a company with this name.";

/** Stands in for the round trip, so the button's loading state shows. */
const SAVE_MS = 450;

/**
 * Create / Update Organisation form. Production:
 * hooks/organisation/useCreateOrganisationForm.ts.
 *
 * Production also writes the session (update({ companyUuid, … })) — the
 * prototype has no session, so the caller's `save` switches company instead.
 */
export function useOrganisationForm(options: UseOrganisationFormOptions) {
  const {
    onSuccess,
    mode = "create",
    companyUuid,
    initialValues,
    existingNames = [],
    save,
  } = options;
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      legalName: "",
      gstin: "",
    },
  });

  const {
    handleSubmit,
    control,
    formState: { errors },
    reset,
    setError,
  } = form;

  // Reset form when initialValues change
  useEffect(() => {
    if (initialValues) {
      reset({
        legalName: initialValues.legalName ?? "",
        gstin: initialValues.gstin ?? "",
      });
    }
  }, [initialValues?.legalName, initialValues?.gstin, reset]);

  const handleGstinChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    e.target.value.toUpperCase().trim();

  const onSubmit = async (data: OrganizationFormData) => {
    const sanitizedLegalName = data.legalName.trim();
    const taken = existingNames.some(
      (name) => name.trim().toLowerCase() === sanitizedLegalName.toLowerCase()
    );
    if (taken) {
      setError("legalName", { message: DUPLICATE_ORGANISATION_ERROR });
      return;
    }

    setIsLoading(true);
    try {
      await new Promise((resolve) => window.setTimeout(resolve, SAVE_MS));

      if (mode === "edit") {
        if (!companyUuid) {
          throw new Error("Missing organisation identifier.");
        }
        // DEV: PUT /api/companies { companyUuid, companyName, userUuid, updatedBy }
        // then session.update({ companyName }) when it is the active company.
        save(sanitizedLegalName);
        toast.success("Organisation updated successfully.");
        await onSuccess?.({ companyUuid, companyName: sanitizedLegalName });
        return;
      }

      // DEV: POST /api/companies { companyName, userUuid, createdBy }
      // → { companyUuid, ucUuid }, then session.update({ companyUuid, … }).
      const createdCompanyUuid = save(sanitizedLegalName);
      toast.success("Organisation created successfully.");
      await onSuccess?.({
        companyUuid: createdCompanyUuid,
        companyName: sanitizedLegalName,
      });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to create organisation."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return {
    handleSubmit: handleSubmit(onSubmit),
    control,
    errors,
    isLoading,
    handleGstinChange,
  };
}
