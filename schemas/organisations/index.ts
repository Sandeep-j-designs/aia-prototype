import { z } from "zod";

/**
 * Production: schemas/organisations/index.ts. The GSTIN field is kept for
 * parity — the modal only asks for the legal name.
 */
export const organizationSchema = z.object({
  legalName: z
    .string()
    .min(1, "Legal name is required")
    .min(2, "Legal name must be at least 2 characters")
    .max(255, "Legal name must not exceed 255 characters"),
  gstin: z
    .string()
    .optional()
    .refine(
      (val) =>
        !val ||
        /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(val),
      "GSTIN must be a valid 15-character format"
    ),
});

export type OrganizationFormData = z.infer<typeof organizationSchema>;
