import React, { useEffect, useRef } from "react";
import { Control, Controller, FieldErrors } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Typography from "@/components/common/typography";
import { OrganizationFormData } from "@/schemas/organisations";
import { cn } from "@/lib/utils";

type Props = {
  control: Control<OrganizationFormData>;
  errors: FieldErrors<OrganizationFormData>;
  onSubmit: React.FormEventHandler<HTMLFormElement>;
  isLoading: boolean;
  ButtonComponent?: React.ReactNode;
  inputClassName?: string;
  wrapperClass?: string;
  showLegalNameDescription?: boolean;
};

/**
 * The legal-name form. Production:
 * components/organisation/create-update-organisation/organisation-form.tsx.
 * Production's FormLabel / ErrorMessage are not in this prototype, so the
 * label and error are written out with the same tokens.
 */
const OrganisationForm = ({
  control,
  errors,
  onSubmit,
  isLoading,
  ButtonComponent,
  inputClassName,
  wrapperClass,
  showLegalNameDescription = false,
}: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <form
      role="presentation"
      onSubmit={onSubmit}
      noValidate
      className={cn("w-full", wrapperClass)}
    >
      <div>
        <Controller
          control={control}
          name="legalName"
          render={({ field }) => (
            <div className="flex flex-col gap-1">
              <Label
                htmlFor="organisation-legal-name"
                className="text-base font-semibold"
              >
                Legal Name
                <span className="text-destructive-foreground">*</span>
              </Label>
              <Input
                {...field}
                id="organisation-legal-name"
                placeholder="Enter Legal Name"
                className={cn("h-14", inputClassName)}
                ref={inputRef}
                aria-invalid={!!errors.legalName}
                aria-describedby={
                  errors.legalName ? "organisation-legal-name-error" : undefined
                }
                onChange={(event) => {
                  const sanitizedValue = event.target.value.replace(/^\s+/, "");
                  field.onChange(sanitizedValue);
                }}
                onBlur={(event) => {
                  field.onBlur();
                  const trimmedValue = event.target.value.trim();
                  if (trimmedValue !== field.value) {
                    field.onChange(trimmedValue);
                  }
                }}
              />
            </div>
          )}
        />
        {showLegalNameDescription && (
          <Typography variant="sm" className="block text-secondary-foreground">
            As per your official registration.
          </Typography>
        )}
        {errors.legalName ? (
          <Typography
            id="organisation-legal-name-error"
            variant="sm"
            className="block text-xs text-destructive-foreground"
          >
            {errors.legalName.message}
          </Typography>
        ) : (
          <div className="h-5" />
        )}
      </div>

      {ButtonComponent ? (
        ButtonComponent
      ) : (
        <Button
          id="create"
          type="submit"
          loading={isLoading}
          className="h-14 w-full"
        >
          Create
        </Button>
      )}
    </form>
  );
};

export default OrganisationForm;
