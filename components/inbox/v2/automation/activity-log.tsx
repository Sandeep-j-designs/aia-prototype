import React, { useMemo, useRef, useState } from "react";
import { Check, History } from "@/components/icons";
import FilterChip from "@/components/common/filter-chip";
import OverlayScrollbars from "@/components/common/overlay-scrollbars";
import PageTopBar from "@/components/common/page-top-bar";
import {
  Pager,
  SearchBox,
  UNDERLINE_TAB,
} from "@/components/inbox/v2/banking/table-parts";
import EmptyState from "@/components/inbox/v2/empty-state";
import { CountPill } from "@/components/inbox/v2/ui";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ACTIVITY_KIND_LABELS,
  undoActivity,
  useActivity,
} from "@/hooks/pages/inbox/use-activity";
import { cn } from "@/lib/utils";
import type {
  ActivityEntry,
  ActivityKind,
  ActivityModule,
} from "@/types/pages/inbox/automation";
import { dayLabel } from "@/utils/pages/notifications";
import ActivityRow from "./common/activity-row";

type Props = {
  company: string;
  /** The person using the prototype, who an Undo is attributed to. */
  user: string;
  onOpenDocument: (id: string) => void;
  notify: (message: string, kind?: "success" | "info") => void;
  /**
   * Neo › Activity adds Neo's tasks as a tab: each run with its outcome and
   * its Undo (moved here from the docked panel, 19 Oct 2026).
   */
  tasks?: { label: string; count: number; content: React.ReactNode };
};

type Tab = "all" | "ai" | "people" | "tasks";

const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "ai", label: "By AI" },
  { id: "people", label: "By people" },
];

/**
 * The kinds a partner reads before signing come first in the filter: what
 * the AI did unasked, and where a person overrode it.
 */
const KIND_ORDER: ActivityKind[] = [
  "auto-approved",
  "override",
  "undone",
  "held",
  "blocked",
  "rule",
  "matched",
  "learned",
  "predicted",
  "approved",
  "cleaned",
  "synced",
];

/** One option in a filter popover: the label, then a tick or its count. */
const FilterOption = ({
  on,
  label,
  count,
  onToggle,
}: {
  on: boolean;
  label: string;
  count: number;
  onToggle: () => void;
}) => (
  <button
    type="button"
    aria-pressed={on}
    onClick={onToggle}
    className={cn(
      "flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
      on
        ? "bg-pi-brand-tint font-medium text-pi-brand"
        : "text-pi-ink hover:bg-pi-fill"
    )}
  >
    <span className="flex-1 truncate">{label}</span>
    {on ? (
      <Check className="size-4" aria-hidden />
    ) : (
      <span className="text-[12px] tabular-nums text-pi-faint">{count}</span>
    )}
  </button>
);

const counted = <K extends string>(
  rows: ActivityEntry[],
  key: (e: ActivityEntry) => K
) => {
  const counts = new Map<K, number>();
  rows.forEach((e) => counts.set(key(e), (counts.get(key(e)) ?? 0) + 1));
  return counts;
};

/**
 * Automation › Activity log: everything the AI and the team did in this
 * organisation's books, newest first, by day.
 *
 * Every row says who acted (the AI, named by the rule or model, or a person),
 * what they did to which record, and why. A partner signing off reads the
 * auto-approvals and overrides here; an auditor's "why is this in Rent?" is
 * answered by a search. Anything not yet in Tally can be undone in place.
 */
const ActivityLog = ({
  company,
  user,
  onOpenDocument,
  notify,
  tasks,
}: Props) => {
  const entries = useActivity(company);
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [kinds, setKinds] = useState<ActivityKind[]>([]);
  const [modules, setModules] = useState<ActivityModule[]>([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const scroller = useRef<HTMLDivElement>(null);

  const base = useMemo(
    () =>
      entries.filter((e) =>
        tab === "ai"
          ? e.actor.kind === "ai"
          : tab === "people"
            ? e.actor.kind === "person"
            : true
      ),
    [entries, tab]
  );
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return base.filter(
      (e) =>
        (!kinds.length || kinds.includes(e.kind)) &&
        (!modules.length || modules.includes(e.module)) &&
        (!q ||
          `${e.action} ${e.subject} ${e.reason ?? ""} ${e.actor.name} ${e.change?.from ?? ""} ${e.change?.to ?? ""}`
            .toLowerCase()
            .includes(q))
    );
  }, [base, search, kinds, modules]);
  const shown = rows.slice(page * pageSize, (page + 1) * pageSize);
  const days = useMemo(() => {
    const groups: { label: string; items: ActivityEntry[] }[] = [];
    shown.forEach((e) => {
      const label = dayLabel(e.at);
      const last = groups.at(-1);
      if (last?.label === label) last.items.push(e);
      else groups.push({ label, items: [e] });
    });
    return groups;
  }, [shown]);

  const kindCounts = counted(base, (e) => e.kind);
  const moduleCounts = Array.from(
    counted(base, (e) => e.module).entries()
  ).sort((a, b) => b[1] - a[1]);
  const tabs = tasks
    ? [...TABS, { id: "tasks" as const, label: tasks.label }]
    : TABS;
  const tabCount = (id: Tab) =>
    id === "tasks"
      ? (tasks?.count ?? 0)
      : id === "ai"
        ? entries.filter((e) => e.actor.kind === "ai").length
        : id === "people"
          ? entries.filter((e) => e.actor.kind === "person").length
          : entries.length;
  const filtersOn = !!search.trim() || kinds.length > 0 || modules.length > 0;
  const clearFilters = () => {
    setSearch("");
    setKinds([]);
    setModules([]);
    setPage(0);
  };
  const undo = (e: ActivityEntry) => {
    if (undoActivity(e.id, user))
      notify(`Undone: ${e.action.toLowerCase()} · ${e.subject}`, "success");
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        <div
          ref={scroller}
          className="table-scroller scrollbar-hide flex min-h-0 min-w-0 flex-1 flex-col overflow-auto overscroll-none"
        >
          <div className="shrink-0 bg-pi-page">
            <div className="px-[var(--inset-page)] pt-6">
              <PageTopBar
                title="Activity log"
                className="flex-wrap gap-x-4 gap-y-2"
                leading={
                  <div
                    role="tablist"
                    aria-label="Who acted"
                    className="flex shrink-0 gap-6 overflow-x-auto overflow-y-hidden border-b border-pi-line"
                  >
                    {tabs.map((entry) => (
                      <button
                        key={entry.id}
                        role="tab"
                        type="button"
                        aria-selected={tab === entry.id}
                        data-state={tab === entry.id ? "active" : "inactive"}
                        onClick={() => {
                          setTab(entry.id);
                          setPage(0);
                        }}
                        className={cn(
                          UNDERLINE_TAB,
                          "inline-flex flex-none items-center whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring motion-reduce:transition-none"
                        )}
                      >
                        {entry.label}
                        <CountPill>{tabCount(entry.id)}</CountPill>
                      </button>
                    ))}
                  </div>
                }
              />
            </div>

            <div
              className={cn(
                "flex flex-wrap items-center gap-2 px-[var(--inset-page)] py-4",
                tab === "tasks" && "hidden"
              )}
            >
              <SearchBox
                label="Search the activity log"
                placeholder="Search vendor, ledger, reason…"
                value={search}
                onChange={(value) => {
                  setSearch(value);
                  setPage(0);
                }}
              />
              <span aria-hidden className="h-6 w-px flex-none bg-pi-line" />
              <Popover>
                <PopoverTrigger asChild>
                  <FilterChip
                    label="What happened"
                    value={kinds.map((k) => ACTIVITY_KIND_LABELS[k])}
                    selectionType="multiple"
                    onClearButtonClick={() => {
                      setKinds([]);
                      setPage(0);
                    }}
                  />
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  className="w-64 rounded-md border-pi-line p-2 shadow-pi-2"
                >
                  {KIND_ORDER.filter((k) => kindCounts.get(k)).map((k) => (
                    <FilterOption
                      key={k}
                      on={kinds.includes(k)}
                      label={ACTIVITY_KIND_LABELS[k]}
                      count={kindCounts.get(k) ?? 0}
                      onToggle={() => {
                        setKinds((all) =>
                          all.includes(k)
                            ? all.filter((x) => x !== k)
                            : [...all, k]
                        );
                        setPage(0);
                      }}
                    />
                  ))}
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <FilterChip
                    label="Module"
                    value={modules}
                    selectionType="multiple"
                    onClearButtonClick={() => {
                      setModules([]);
                      setPage(0);
                    }}
                  />
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  className="w-60 rounded-md border-pi-line p-2 shadow-pi-2"
                >
                  {moduleCounts.map(([m, count]) => (
                    <FilterOption
                      key={m}
                      on={modules.includes(m)}
                      label={m}
                      count={count}
                      onToggle={() => {
                        setModules((all) =>
                          all.includes(m)
                            ? all.filter((x) => x !== m)
                            : [...all, m]
                        );
                        setPage(0);
                      }}
                    />
                  ))}
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {tab === "tasks" && tasks ? (
            <div className="flex-1 border-t border-pi-line bg-background [&>ul]:max-w-[1040px]">
              {tasks.content}
            </div>
          ) : days.length ? (
            <div className="border-t border-pi-line bg-background">
              {days.map((day) => (
                <section key={day.label} aria-label={day.label}>
                  <h2 className="sticky top-0 z-[2] border-b border-pi-line bg-pi-head-bg px-6 py-2 text-[12px] font-medium text-pi-body">
                    {day.label}
                  </h2>
                  <ul className="divide-y divide-pi-line border-b border-pi-line">
                    {day.items.map((e) => (
                      <li key={e.id} className="[&>div]:max-w-[1040px]">
                        <ActivityRow
                          entry={e}
                          showSubject
                          onOpen={(x) => x.ref && onOpenDocument(x.ref.id)}
                          onUndo={undo}
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          ) : (
            <div className="flex-1 border-t border-pi-line bg-background">
              {filtersOn ? (
                <EmptyState
                  title="Nothing in the log matches"
                  body="No action fits the search and filters."
                  filters={[
                    ...(search.trim() ? [{ label: `“${search.trim()}”` }] : []),
                    ...kinds.map((k) => ({ label: ACTIVITY_KIND_LABELS[k] })),
                    ...modules.map((m) => ({ label: m })),
                  ]}
                  onClear={clearFilters}
                />
              ) : (
                <EmptyState
                  icon={History}
                  title="No activity yet"
                  body="Every prediction, approval, override and undo in these books is recorded here, with who did it and why."
                />
              )}
            </div>
          )}
        </div>
        <OverlayScrollbars scroller={scroller} />
      </div>
      {tab !== "tasks" && rows.length > pageSize ? (
        <Pager
          page={page}
          pageSize={pageSize}
          total={rows.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      ) : null}
    </div>
  );
};

export default ActivityLog;
