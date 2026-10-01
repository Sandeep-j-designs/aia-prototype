import React, { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { BookOpen, ChevronDown, ChevronRight, MonitorPlay } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserCompany } from "@/types/pages/organisation";
import OrganisationSwitcher from "./organization-switcher";

/**
 * `next/image` prefixes basePath itself for an optimised image, but not for an
 * `unoptimized` one: the src is passed through as written. On Pages that made
 * the logo a request to /images/logo.png at the domain root, one level above
 * the site. The base path now lives in one module, because the same gap later
 * took out the AP and AR sheets — see lib/base-path.
 */
import { basePath } from "@/lib/base-path";

/** Bloocks TopNav styling with the prototype's company and sync actions. */

export type Crumb = string;

type Props = {
  crumbs?: Crumb[];
  company: { initials: string; name: string };
  user: { initials: string; email: string };
  leadingContent?: ReactNode;
  /** Prototype-only — opens the launch guide. */
  onGuide?: () => void;
  /**
   * Prototype-only. Production reads the company list from
   * useUserCompaniesStore and switches in place; passing these turns the chip
   * into the Organisations drawer so the prototype keeps its multi-company
   * scenarios.
   */
  companies?: UserCompany[];
  companyId?: string;
  onCompanyChange?: (id: string) => void;
  /** Creates an organisation, makes it active and returns its id. */
  onCompanyCreate?: (name: string) => string;
  onCompanyRename?: (id: string, name: string) => void;
  /**
   * Rendered immediately after the company switcher — this is where Sync
   * lives ("Sync Management - Phase 2" Figma).
   *
   * A slot rather than sync-specific props, because the bar has no business
   * knowing what a Tally sync is: it knows there is a company-scoped action
   * that belongs next to the company chip. Production's top-bar-layout needs
   * the same slot adding before this ships.
   */
  companyAction?: ReactNode;
};

const AppTopBar = ({
  crumbs = [],
  company,
  user,
  leadingContent,
  onGuide,
  companies,
  companyId,
  onCompanyChange,
  onCompanyCreate,
  onCompanyRename,
  companyAction,
}: Props) => {
  const focus =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface";
  const chip = cn(
    "group flex h-8 min-w-0 w-auto max-w-[150px] sm:max-w-[262px] shrink items-center gap-1.5 rounded-md px-[7px] py-0",
    "border border-surface-stroke bg-surface-muted text-label-2 font-normal text-topnav-text shadow-none",
    "transition-colors duration-150 hover:bg-surface-muted hover:border-topnav-text data-[state=open]:border-topnav-text motion-reduce:transition-none",
    focus
  );
  // The static chip, shown when no company list is passed. The switcher
  // draws the same badge itself.
  const initialsBadge = (
    <span
      aria-hidden="true"
      className="!inline-flex h-[18px] w-[18px] flex-none items-center justify-center rounded-[4.5px] bg-surface-badge text-[11px] leading-none font-bold text-primary-foreground"
    >
      {company.initials}
    </span>
  );

  return (
    <header className="sticky top-0 z-40 grid h-[50px] w-full flex-none grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 bg-surface py-2 pl-3 pr-3 sm:pr-6 text-topnav-text">
      <div className="col-start-1 hidden min-w-0 items-center gap-3 sm:flex">
        {leadingContent}

        <Link
          href="/inbox"
          aria-label="AI Accountant home"
          className={cn("flex flex-none items-center rounded p-0.5", focus)}
        >
          {/* The artwork is white-on-transparent, so it only reads against the
              dark bar — never put this bar on a light ground without swapping
              in a dark logo asset.

              `unoptimized` because the source is only 272x54: Next's optimiser
              was serving a 128px-wide variant for this 121px box, which is
              soft at 2x. Unoptimised, the browser downsamples the full 272px. */}
          <Image
            src={`${basePath}/images/logo.png`}
            alt="AI Accountant"
            width={121}
            height={24}
            className="h-6 w-auto"
            unoptimized
            priority
          />
        </Link>

        {crumbs.length ? (
          <>
            <span
              aria-hidden="true"
              className="h-5 w-px flex-none bg-surface-stroke"
            />
            <nav
              className="flex min-w-0 items-center gap-2 text-sm"
              aria-label="Breadcrumb"
            >
              {crumbs.map((crumb, i) => (
                <React.Fragment key={crumb}>
                  {i > 0 ? (
                    <ChevronRight className="h-3 w-3 flex-none text-surface-foreground-muted" />
                  ) : null}
                  {i === crumbs.length - 1 ? (
                    <strong
                      title={crumb}
                      className="max-w-[360px] truncate font-semibold"
                    >
                      {crumb}
                    </strong>
                  ) : (
                    <span className="text-surface-foreground-muted">
                      {crumb}
                    </span>
                  )}
                </React.Fragment>
              ))}
            </nav>
          </>
        ) : null}
      </div>

      <div className="col-start-1 col-end-4 flex min-w-0 items-center justify-end gap-2 sm:col-start-3 sm:gap-3">
        {companies?.length && onCompanyChange ? (
          <OrganisationSwitcher
            companies={companies}
            selectedCompanyUuid={companyId}
            onSelect={onCompanyChange}
            onCreate={onCompanyCreate ?? (() => companyId ?? "")}
            onRename={onCompanyRename ?? (() => undefined)}
            className={chip}
          />
        ) : (
          <button type="button" title={company.name} className={chip}>
            {initialsBadge}
            <span className="min-w-0 max-w-[220px] truncate">
              {company.name}
            </span>
            <ChevronDown className="h-3.5 w-3.5 flex-none opacity-80" />
          </button>
        )}

        {companyAction}

        <span
          aria-hidden="true"
          className="h-5 w-px flex-none bg-surface-stroke"
        />

        <button
          type="button"
          title="Guide"
          onClick={onGuide}
          aria-label="Guide"
          className={cn(
            "flex h-8 shrink-0 items-center gap-2 rounded-lg px-2 text-label-2 font-normal transition-colors hover:bg-surface-muted",
            focus
          )}
        >
          <BookOpen className="h-4 w-4" />
          <span className="hidden sm:inline">Guide</span>
        </button>

        <button
          type="button"
          title="What's new"
          aria-label="What's new"
          onClick={onGuide}
          className={cn(
            "grid h-8 w-8 flex-none place-items-center rounded-full transition-colors hover:bg-surface-muted",
            focus
          )}
        >
          <MonitorPlay className="h-4 w-4" />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Profile menu"
              title={user.email}
              className={cn(
                "grid h-8 w-8 flex-none place-items-center rounded-full border border-transparent bg-surface-muted text-label-1 font-medium text-topnav-avatar-text transition-colors hover:border-surface-stroke data-[state=open]:border-surface-stroke",
                focus
              )}
            >
              {user.initials}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="break-all font-normal">
              <span className="block text-label-3 text-secondary-foreground">
                Signed in as
              </span>
              <span className="mt-1 block text-body-3">{user.email}</span>
            </DropdownMenuLabel>
            {onGuide && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={onGuide}>
                  <BookOpen className="mr-2 h-4 w-4" />
                  Open guide
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default AppTopBar;
