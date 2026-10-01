import React, { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import {
  ChevronRight,
  FileText,
  Inbox,
  Landmark,
  LayoutDashboard,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  ShoppingBag,
  ShoppingCart,
  RefreshCw,
  Sparkle,
  UserRound,
} from "lucide-react";
import AppTopBar, { type Crumb } from "@/components/top-bar-layout";
import { cn } from "@/lib/utils";
import type { UserCompany } from "@/types/pages/organisation";

/**
 * PROTOTYPE STUB — same path and the same Props contract as
 * components/sidebar-layout/index.tsx in aiaccountant-app.
 *
 * Production resolves the shell from feature flags, reads the collapsed state
 * from the `sidebar_state` cookie, and renders AppSidebar / AppNavbar /
 * AppTopBar plus DashboardSyncBanner.
 *
 * Sidebar styling follows the Bloocks SideNav: 36px rows, 16px icons,
 * subtle active backgrounds, and a bottom-right collapse control.
 *
 * Inbox is a top-level entry here and carries a count badge. That is
 * deliberate and prototype-specific: this prototype's whole premise is that
 * bill review moved OUT of Purchases and into Inbox, which is what the launch
 * guide tells the user on first run.
 *
 * Dimensions are the prototype's, which agree with production's shell:
 *   --topbar-h 50px · --sidebar-w 200px · --sidebar-collapsed-w 56px · --gutter 20px
 *
 * On handoff this file is DELETED and the real SidebarLayout takes over.
 */

type Props = {
  children: ReactNode;
  defaultSidebarState?: boolean;
  contentClassName?: string;
  /** Prototype-only — production derives the breadcrumb from the route. */
  crumbs?: Crumb[];
  /** Prototype-only — the Needs Review count on the Inbox entry. */
  inboxCount?: number;
  /**
   * Prototype-only — PRD §4.1's launch tag on the Inbox entry, for 14 days.
   *
   * It REPLACES the count badge rather than sitting beside it: at a 200px
   * sidebar the row has one slot after the label, and two chips in it left the
   * label truncating to make room for a decoration.
   */
  inboxNew?: boolean;
  /** Prototype-only — replays the launch guide from the top bar. */
  onGuide?: () => void;
  /**
   * Prototype-only. `href` stays production's route for handoff fidelity, but
   * this prototype only has /inbox, so the caller intercepts by nav id and
   * decides what actually happens — including saying "not built yet".
   */
  onNavSelect?: (id: string) => void;
  /** Prototype-only — which entry reads as current, since every route is /inbox. */
  activeNavId?: string;
  /** Prototype-only — makes the top bar's company chip a working picker. */
  companies?: UserCompany[];
  companyId?: string;
  onCompanyChange?: (id: string) => void;
  /** Passed straight to AppTopBar — the Organisations drawer's create/edit. */
  onCompanyCreate?: (name: string) => string;
  onCompanyRename?: (id: string, name: string) => void;
  /** Passed straight to AppTopBar — sits after the company chip. See its prop. */
  companyAction?: ReactNode;
};

const NAV_MAIN = [
  {
    id: "dashboard",
    label: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
  },
  { id: "inbox", label: "Inbox", path: "/inbox", icon: Inbox },
  {
    id: "purchases",
    label: "Purchases",
    path: "/accounts-payable",
    icon: ShoppingBag,
  },
  {
    id: "sales",
    label: "Sales",
    path: "/accounts-receivable",
    icon: ShoppingCart,
  },
  { id: "banking", label: "Banking", path: "/bank", icon: Landmark },
  {
    id: "accounting",
    label: "Accounting",
    path: "/accounting",
    icon: UserRound,
    chevron: true,
    /*
      The chevron used to point at nothing — Accounting was a leaf that opened
      the Journal Vouchers register directly, so the one entry with children
      drawn on it was the one entry without them. These are what production
      files under it (Figma 25568:78839).
    */
    children: [
      { id: "journal-vouchers", label: "Journal Vouchers", path: "/journals" },
      { id: "chart-of-accounts", label: "Chart of Accounts", path: "/coa" },
    ],
  },
  {
    id: "inventory",
    label: "Inventory",
    path: "/inventory-masters",
    icon: Package,
  },
];

const NAV_SECONDARY = [
  { id: "gst", label: "GST", path: "/gst-reconciliation", icon: FileText },
  {
    id: "configuration",
    label: "Sync Management",
    path: "/configuration",
    icon: RefreshCw,
  },
];

type NavChild = { id: string; label: string; path: string };

type NavItem = (typeof NAV_MAIN)[number] & {
  badge?: number;
  /** PRD §4.1's launch tag. Takes the badge's slot while it runs. */
  isNew?: boolean;
  chevron?: boolean;
  children?: NavChild[];
};

const SIDEBAR_STATE_KEY = "sb-collapsed";

const NavLink = ({
  item,
  isActive,
  collapsed,
  onSelect,
  expanded,
}: {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
  onSelect?: (id: string) => void;
  /** Only meaningful on an entry with children — turns the chevron down. */
  expanded?: boolean;
}) => {
  const { label, path, icon: Icon, chevron, badge, isNew } = item;
  /*
    The tag is a word, and a 56px rail has nowhere to put one — so a collapsed
    sidebar falls back to the count. That is the right way round: collapsed is
    the state a user picks to get on with the queue, and the number is the part
    that helps them do it. The tag has the expanded rail for its fortnight.
  */
  const showNew = isNew && !collapsed;

  return (
    <Link
      href={path}
      onClick={
        onSelect
          ? (e) => {
              e.preventDefault();
              onSelect(item.id);
            }
          : undefined
      }
      aria-current={isActive ? "page" : undefined}
      // Anchor for the guided walkthrough; see config/pages/guide.
      data-guide-id={`nav-${item.id}`}
      aria-label={collapsed ? label : undefined}
      title={collapsed ? label : undefined}
      data-label={label}
      className={cn(
        "relative flex shrink-0 items-center gap-2 rounded-md p-2 text-label-2 font-normal",
        "transition-colors duration-150 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 motion-reduce:transition-none",
        isActive ? "bg-accent text-foreground" : "text-secondary-foreground",
        collapsed ? "h-8 w-8 justify-center gap-0" : "h-9 w-full"
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4 flex-none",
          isActive ? "text-primary" : "text-secondary-foreground"
        )}
      />
      {!collapsed ? <span className="flex-1 truncate">{label}</span> : null}
      {showNew ? (
        /*
          Deliberately not the badge's filled brand ground: a count is a
          quantity you act on, the tag is an annotation that expires, and
          giving them the same weight would have the tag reading as unread
          work. A tinted ground with a hairline inset reads as a label at any
          size — the plain outline it replaces went thin and grey-ish against
          the active row's tint, which is exactly the row it appears on.
        */
        <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-[14px] tracking-[0.08em] text-primary ring-1 ring-inset ring-primary/15">
          <Sparkle className="h-2.5 w-2.5 flex-none" aria-hidden />
          New
        </span>
      ) : badge ? (
        <span
          className={cn(
            "grid min-w-5 place-items-center rounded-full bg-primary px-1.5 text-caption-1 font-semibold tabular-nums text-primary-foreground",
            collapsed && "absolute right-1 top-1 min-w-4 px-1"
          )}
        >
          {badge}
        </span>
      ) : null}
      {chevron && !collapsed ? (
        <ChevronRight
          className={cn(
            "ml-auto h-3.5 w-3.5 flex-none text-secondary-foreground transition-transform duration-150 motion-reduce:transition-none",
            expanded && "rotate-90"
          )}
        />
      ) : null}
    </Link>
  );
};

const SidebarLayout = ({
  children,
  defaultSidebarState,
  contentClassName,
  crumbs = [],
  inboxCount,
  inboxNew,
  onGuide,
  onNavSelect,
  activeNavId,
  companies,
  companyId,
  onCompanyChange,
  onCompanyCreate,
  onCompanyRename,
  companyAction,
}: Props) => {
  const router = useRouter();
  const isCurrent = (item: { id: string; path: string }) =>
    activeNavId
      ? activeNavId === item.id
      : router.pathname.startsWith(item.path);
  const [desktopCollapsed, setCollapsed] = useState(
    defaultSidebarState !== undefined ? !defaultSidebarState : false
  );

  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const sync = () => setCompact(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);
  const collapsed = compact || desktopCollapsed;

  // Production persists this in the `sidebar_state` cookie and reads it during
  // render. sessionStorage in an effect keeps the server and client markup
  // identical, so there is no hydration mismatch.
  useEffect(() => {
    const stored = window.sessionStorage.getItem(SIDEBAR_STATE_KEY);
    if (stored !== null) setCollapsed(stored === "1");
  }, []);

  useEffect(() => {
    window.sessionStorage.setItem(
      SIDEBAR_STATE_KEY,
      desktopCollapsed ? "1" : "0"
    );
  }, [desktopCollapsed]);

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background">
      <AppTopBar
        crumbs={crumbs}
        company={{
          initials:
            companies?.find((c) => c.companyUuid === companyId)
              ?.companyName?.[0] ?? "S",
          name:
            companies?.find((c) => c.companyUuid === companyId)?.companyName ??
            "Shakunthalam Oil & Refineries",
        }}
        user={{ initials: "SB", email: "sandeep.balaji@aiaccountant.com" }}
        onGuide={onGuide}
        companies={companies}
        companyId={companyId}
        onCompanyChange={onCompanyChange}
        onCompanyCreate={onCompanyCreate}
        onCompanyRename={onCompanyRename}
        companyAction={companyAction}
      />

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <aside
          className={cn(
            "relative flex min-h-0 flex-none flex-col",
            "border-r border-neutral-gray bg-background pb-10 pt-4",
            "transition-[width] duration-200 ease-in-out motion-reduce:transition-none",
            collapsed ? "w-14" : "w-[200px]"
          )}
        >
          <nav
            id="prototype-main-navigation"
            aria-label="Main"
            className="flex min-h-0 flex-1 flex-col gap-1 overflow-x-hidden overflow-y-auto overscroll-none px-3 pb-1"
          >
            {NAV_MAIN.map((item) => {
              const children = (item as NavItem).children;
              /*
                A parent opens because one of its children is where you are.
                There is no separate toggle: the group has one destination that
                does anything, so a chevron you could close over the page you
                are on would only ever hide it.
              */
              const open =
                !collapsed &&
                !!children?.some((child) => activeNavId === child.id);

              return (
                <React.Fragment key={item.id}>
                  <NavLink
                    item={
                      item.id === "inbox"
                        ? { ...item, badge: inboxCount, isNew: inboxNew }
                        : item
                    }
                    collapsed={collapsed}
                    isActive={isCurrent(item) && !open}
                    expanded={open}
                    onSelect={onNavSelect}
                  />
                  {open && (
                    <ul className="ml-[22px] flex flex-col gap-1 border-l border-neutral-gray pl-2">
                      {children?.map((child) => (
                        <li key={child.id}>
                          <Link
                            href={child.path}
                            onClick={(e) => {
                              e.preventDefault();
                              onNavSelect?.(child.id);
                            }}
                            aria-current={
                              activeNavId === child.id ? "page" : undefined
                            }
                            className={cn(
                              "flex h-8 items-center rounded-md px-2 text-label-2 font-normal",
                              "transition-colors duration-150 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transition-none",
                              activeNavId === child.id
                                ? "bg-accent font-medium text-primary"
                                : "text-secondary-foreground"
                            )}
                          >
                            {child.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </React.Fragment>
              );
            })}
            <div
              className={cn(
                "my-2 h-px bg-neutral-gray",
                collapsed ? "mx-1" : "mx-3"
              )}
            />
            {NAV_SECONDARY.map((item) => (
              <NavLink
                key={item.id}
                item={item}
                collapsed={collapsed}
                isActive={isCurrent(item)}
                onSelect={onNavSelect}
              />
            ))}
          </nav>

          <div className="hidden md:block">
            <button
              type="button"
              onClick={() => setCollapsed((v) => !v)}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-expanded={!collapsed}
              aria-controls="prototype-main-navigation"
              className={cn(
                "absolute bottom-0 -right-px grid h-8 place-items-center bg-accent p-2",
                "text-secondary-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary motion-reduce:transition-none",
                collapsed ? "w-[calc(100%+1px)]" : "w-[41px] rounded-tl-md"
              )}
            >
              {collapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>
          </div>
        </aside>

        <main className="flex h-full min-w-0 flex-1 overflow-hidden">
          <div
            className={cn("min-w-0 flex-1 overflow-hidden", contentClassName)}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default SidebarLayout;
