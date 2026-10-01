import React, { useEffect, useMemo, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  SheetClose,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import Typography from "@/components/common/typography";
import CreateUpdateOrganisationModal from "@/components/organisation/create-update-organisation/create-update-organisation-modal";
import type { UserCompany } from "@/types/pages/organisation";
import { OrganizationListItem } from "./organization-list-item";
import { TopBarDrawerShell } from "./drawer-shell";

type Props = {
  open: boolean;
  onClose: () => void;
  /**
   * Prototype-only: production reads these from useUserCompaniesStore
   * (companies, selectedCompany) and switches through
   * POST /api/users/switch-company itself.
   */
  companies: UserCompany[];
  selectedCompanyUuid?: string;
  onSelect: (companyUuid: string) => void;
  /** Creates an organisation, makes it active, returns its companyUuid. */
  onCreate: (companyName: string) => string;
  onRename: (companyUuid: string, companyName: string) => void;
};

/**
 * The Organisations drawer. Production:
 * components/top-bar-layout/organization-drawer.tsx.
 *
 * Copy says "Organisation" throughout — production mixes "Organization" and
 * "Organisation"; the designer settled on the British spelling. File and
 * symbol names keep production's spelling so the files map one-to-one.
 *
 * Deviation, deliberately: production updates its company list only after
 * an edit (handleModalSuccess returns early on create), so a new
 * organisation is missing from the drawer until the list is refetched. Here
 * the list is the store's, so a created organisation is in it at once.
 */
export const OrganisationDrawer = ({
  open,
  onClose,
  companies,
  selectedCompanyUuid,
  onSelect,
  onCreate,
  onRename,
}: Props) => {
  const [searchValue, setSearchValue] = useState("");
  const [isOrganisationModalOpen, setIsOrganisationModalOpen] = useState(false);
  const [companyToEdit, setCompanyToEdit] = useState<UserCompany | null>(null);

  useEffect(() => {
    if (!open) {
      setSearchValue("");
    }
  }, [open]);

  useEffect(() => {
    if (!isOrganisationModalOpen) {
      setCompanyToEdit(null);
    }
  }, [isOrganisationModalOpen]);

  // DEV: GET /api/companies/user?userUuid=… (useUserCompaniesStore)
  const filteredCompanies = useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase();
    const sortedCompanies = [...companies].sort((first, second) => {
      if (first.companyUuid === selectedCompanyUuid) return -1;
      if (second.companyUuid === selectedCompanyUuid) return 1;
      return first.companyName.localeCompare(second.companyName);
    });

    if (!normalizedSearch) {
      return sortedCompanies;
    }

    return sortedCompanies.filter((company) =>
      company.companyName.toLowerCase().includes(normalizedSearch)
    );
  }, [searchValue, selectedCompanyUuid, companies]);

  const existingNames = useMemo(
    () =>
      companies
        .filter((c) => c.companyUuid !== companyToEdit?.companyUuid)
        .map((c) => c.companyName),
    [companies, companyToEdit]
  );

  const handleCreateOrganisation = () => {
    onClose();
    setCompanyToEdit(null);
    setIsOrganisationModalOpen(true);
  };

  const handleEditOrganisation = (company: UserCompany) => {
    onClose();
    setCompanyToEdit(company);
    setIsOrganisationModalOpen(true);
  };

  const handleSelectCompany = (company: UserCompany) => {
    if (company.companyUuid === selectedCompanyUuid) {
      return;
    }
    // DEV: POST /api/users/switch-company { companyUuid, userUuid, updatedBy },
    // then session.update(...) and selectCompany(response.companyUuid).
    onSelect(company.companyUuid);
    onClose();
  };

  const handleSave = (companyName: string) => {
    if (companyToEdit) {
      onRename(companyToEdit.companyUuid, companyName);
      return companyToEdit.companyUuid;
    }
    return onCreate(companyName);
  };

  return (
    <>
      <TopBarDrawerShell open={open} onClose={onClose} className="h-full">
        <div className="flex items-center justify-between px-4 py-3">
          <SheetTitle className="text-h5 font-semibold text-secondary-foreground">
            Organisations
          </SheetTitle>
          <SheetDescription className="sr-only">
            Switch between your organisations, or create a new one.
          </SheetDescription>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              className="h-auto px-2 py-1 text-sm font-medium text-primary hover:bg-transparent hover:text-primary"
              onClick={handleCreateOrganisation}
            >
              <Plus className="!h-3.5 !w-3.5" />
              New Organisation
            </Button>
            <SheetClose asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Close"
                className="h-7 w-7 rounded-full text-secondary-foreground hover:bg-accent hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </SheetClose>
          </div>
        </div>
        <div className="h-px bg-panel-border" />

        <div className="px-4 py-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary-foreground" />
            <Input
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Search..."
              aria-label="Search organisations"
              className="h-9 border-input bg-background pl-9 text-sm text-foreground placeholder:text-secondary-foreground"
            />
          </div>
        </div>
        <div className="mx-2 h-px bg-panel-border" />
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <Typography
            as="h3"
            weight="semibold"
            className="pb-3 text-base text-foreground"
          >
            My Organisations
          </Typography>

          <div className="space-y-2">
            {filteredCompanies.map((company) => (
              <OrganizationListItem
                key={company.companyUuid}
                company={company}
                isSelected={company.companyUuid === selectedCompanyUuid}
                onSelect={
                  company.companyUuid === selectedCompanyUuid
                    ? undefined
                    : handleSelectCompany
                }
                onEdit={handleEditOrganisation}
              />
            ))}

            {filteredCompanies.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center">
                <Typography className="text-sm text-secondary-foreground">
                  No organisations found.
                </Typography>
              </div>
            ) : null}
          </div>
        </div>
      </TopBarDrawerShell>

      {isOrganisationModalOpen ? (
        <CreateUpdateOrganisationModal
          isOpen={isOrganisationModalOpen}
          setIsOpen={setIsOrganisationModalOpen}
          company={companyToEdit}
          existingNames={existingNames}
          onSave={handleSave}
        />
      ) : null}
    </>
  );
};

export default OrganisationDrawer;
