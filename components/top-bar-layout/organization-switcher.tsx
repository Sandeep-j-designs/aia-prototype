import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { SmartTooltip } from "@/components/common/smart-tooltip";
import type { UserCompany } from "@/types/pages/organisation";
import { cn } from "@/lib/utils";
import { OrganisationDrawer } from "./organization-drawer";

type Props = {
  companies: UserCompany[];
  selectedCompanyUuid?: string;
  onSelect: (companyUuid: string) => void;
  onCreate: (companyName: string) => string;
  onRename: (companyUuid: string, companyName: string) => void;
  /** The top bar's chip styling — kept with the bar, which owns its look. */
  className?: string;
};

/**
 * The top bar's organisation chip and the drawer it opens. Production:
 * components/top-bar-layout/organization-switcher.tsx.
 *
 * The chip keeps the prototype's styling (bg-surface-badge initials) rather
 * than production's hard-coded teal (#12A594), which has no token.
 */
const OrganisationSwitcher = ({
  companies,
  selectedCompanyUuid,
  onSelect,
  onCreate,
  onRename,
  className,
}: Props) => {
  const [open, setOpen] = useState(false);
  const selectedCompany = companies.find(
    (company) => company.companyUuid === selectedCompanyUuid
  );

  const companyName = selectedCompany?.companyName || "Select organisation";
  const companyInitial = companyName.trim().charAt(0).toUpperCase() || "O";

  return (
    <>
      <button
        type="button"
        aria-label={`Organisation: ${companyName}. Switch organisation`}
        aria-haspopup="dialog"
        aria-expanded={open}
        data-state={open ? "open" : "closed"}
        onClick={() => setOpen(true)}
        className={className}
      >
        <span
          aria-hidden="true"
          className="inline-flex h-[18px] w-[18px] flex-none items-center justify-center rounded-[4.5px] bg-surface-badge text-[11px] font-bold leading-none text-primary-foreground"
        >
          {companyInitial}
        </span>
        <SmartTooltip message={companyName} className="min-w-0">
          <span className="block max-w-[220px] truncate">{companyName}</span>
        </SmartTooltip>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "h-[13px] w-[13px] flex-none transition-transform duration-200 motion-reduce:transition-none",
            open && "rotate-180"
          )}
        />
      </button>

      <OrganisationDrawer
        open={open}
        onClose={() => setOpen(false)}
        companies={companies}
        selectedCompanyUuid={selectedCompanyUuid}
        onSelect={onSelect}
        onCreate={onCreate}
        onRename={onRename}
      />
    </>
  );
};

export default OrganisationSwitcher;
