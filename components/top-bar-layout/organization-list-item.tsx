import React from "react";
import { Building2, Check, MoreVertical, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Typography from "@/components/common/typography";
import { SmartTooltip } from "@/components/common/smart-tooltip";
import type { UserCompany } from "@/types/pages/organisation";
import { getCompanyBadgeLabel } from "@/utils/components/organization";
import { cn } from "@/lib/utils";

type Props = {
  company: UserCompany;
  isSelected: boolean;
  onSelect?: (company: UserCompany) => void;
  onEdit: (company: UserCompany) => void;
};

/**
 * One organisation in the drawer. Production:
 * components/top-bar-layout/organization-list-item.tsx.
 *
 * Prototype tweak: production's subtitle repeats the name when no tool is
 * connected (getCompanyBadgeLabel). Here it says so instead, because a new
 * organisation starts with nothing connected and the repeat read as a bug.
 */
export const OrganizationListItem = ({
  company,
  isSelected,
  onSelect,
  onEdit,
}: Props) => {
  const subtitle = company.thirdPartyTool?.trim()
    ? getCompanyBadgeLabel(company)
    : "Not connected to Tally";

  return (
    <div
      className={cn(
        "flex w-full items-start gap-3 rounded-lg bg-background px-3 py-3 transition-colors",
        isSelected ? "bg-accent" : "hover:bg-accent"
      )}
    >
      <Button
        type="button"
        variant="ghost"
        onClick={() => onSelect?.(company)}
        disabled={!onSelect}
        aria-current={isSelected ? "true" : undefined}
        className={cn(
          "flex h-auto min-w-0 flex-1 items-start justify-start gap-3 bg-transparent px-0 py-0 text-left hover:!bg-transparent focus:!bg-transparent disabled:opacity-100 aria-disabled:opacity-100",
          !onSelect && "cursor-default"
        )}
      >
        <div
          className={cn(
            "mt-0.5 flex h-10 w-10 flex-none items-center justify-center rounded-md border-2 border-neutral-gray text-xs font-semibold",
            isSelected ? "text-primary" : "text-secondary-foreground"
          )}
        >
          {isSelected ? (
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Check className="!h-2.5 !w-2.5" strokeWidth={3} />
            </div>
          ) : (
            <Building2 className="h-4 w-4" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <SmartTooltip message={company.companyName}>
            <Typography
              weight="medium"
              className="block truncate text-sm text-foreground"
            >
              {company.companyName}
            </Typography>
          </SmartTooltip>
          <SmartTooltip message={subtitle}>
            <Typography className="block truncate pt-0.5 text-xs text-secondary-foreground">
              {subtitle}
            </Typography>
          </SmartTooltip>
        </div>
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`More actions for ${company.companyName}`}
            className="h-7 w-7 flex-shrink-0 rounded-full text-secondary-foreground hover:bg-transparent hover:text-foreground"
            onClick={(event) => event.stopPropagation()}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onEdit(company);
            }}
          >
            <UserCog className="h-4 w-4" />
            Edit Organisation
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default OrganizationListItem;
