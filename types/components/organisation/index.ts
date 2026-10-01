import { Dispatch, SetStateAction } from "react";

/** Production: types/components/organisation/index.ts, verbatim. */
export type OrganisationModalCompany = {
  companyUuid: string;
  companyName: string;
};

export type OrganisationSuccessResult = {
  companyUuid: string;
  ucUuid?: string;
  companyName: string;
};

export interface CreateUpdateOrganisationProps {
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  company?: OrganisationModalCompany | null;
  onSuccess?: (result: OrganisationSuccessResult) => void | Promise<void>;
}
