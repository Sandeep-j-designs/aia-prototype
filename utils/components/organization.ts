import type { UserCompany } from "@/types/pages/organisation";

/** Production: utils/components/organization.ts — "Tally: {name}". */
export const getCompanyBadgeLabel = (company: UserCompany) => {
  const tool = company.thirdPartyTool?.trim();

  if (!tool) {
    return company.companyName;
  }

  return `${tool[0].toUpperCase()}${tool.slice(1)}: ${company.companyName}`;
};
