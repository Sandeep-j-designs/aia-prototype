import React, { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Cloud,
  CloudAlert,
  CloudUpload,
  FileText,
  FolderTree,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Slash,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip } from "@/components/common/tooltip";
import { cn } from "@/lib/utils";
import {
  ROOT_KEY,
  pathKey,
  searchCoa,
} from "@/hooks/pages/inbox/use-chart-of-accounts";
import { useColumnResize } from "@/hooks/pages/inbox/use-column-resize";
import type {
  AccountingMastersCounts,
  CoaTreeNode,
} from "@/types/pages/inbox/chart-of-accounts";
import type { ColumnSizes } from "@/components/inbox/v2/table-sizing";
import {
  ACTIONS_WIDTH,
  SELECT_WIDTH,
} from "@/components/inbox/v2/table-sizing";
import {
  EmptyBlock,
  HEADER_CLASS,
  HeaderCell,
  TABLE_CLASS,
} from "@/components/inbox/v2/banking/table-parts";
import { PageDialog, T } from "@/components/inbox/v2/ui";

/**
 * Chart of Accounts — the group and ledger tree.
 *
 * Production: components/accounting-masters/index.tsx, ledger-tab/* and the
 * shared components/common/async-tree-items. One tab ("Groups (N) & Ledgers
 * (M)"), a search that flattens the tree into matches with their path, and a
 * tree whose groups open in place. Ledgers that never reached Tally (or
 * failed to) can be ticked and synced.
 *
 * Drawn with the Purchases register's table vocabulary: sticky accent
 * header, hairlines, a pinned checkbox column and a pinned actions column.
 */

type ColumnKey = "name" | "sync" | "nature" | "subGroups" | "ledgers";
const COLUMNS: {
  key: ColumnKey;
  label: string;
  align?: "right";
}[] = [
  { key: "name", label: "Name" },
  { key: "sync", label: "" },
  { key: "nature", label: "Nature" },
  { key: "subGroups", label: "Sub Group Count", align: "right" },
  { key: "ledgers", label: "Ledger Count", align: "right" },
];
const SHOWN = COLUMNS.map((c) => c.key);

/** Under TABLE-RESIZING.md: no minimum below the header's own label. */
const COA_SIZES: ColumnSizes = {
  name: { min: 240, preferred: 460, max: 960 },
  sync: { min: 48, preferred: 48, max: 48 },
  nature: { min: 96, preferred: 160, max: 260 },
  subGroups: { min: 128, preferred: 160, max: 220 },
  ledgers: { min: 112, preferred: 150, max: 220 },
};

const isLedger = (node: CoaTreeNode) => !!node.accountUuid;
const syncOf = (node: CoaTreeNode) => node.thirdPartySyncStatus || "not_synced";

/** production's isCheckboxEnable: only what has not reached Tally. */
const canSelect = (node: CoaTreeNode) =>
  isLedger(node) &&
  ["not_synced", "event_creations_failed", "event_processing_failed"].includes(
    syncOf(node)
  );

/**
 * production's SyncStatus tooltip over SyncStatusIcon. Not synced draws
 * nothing. Same glyphs and inks as Banking's sync column.
 */
const SyncIcon = ({ node }: { node: CoaTreeNode }) => {
  const status = syncOf(node);
  if (status === "not_synced") return null;
  const product = node.thirdPartyProduct || "";
  const [Icon, ink, title, detail] =
    status === "synced"
      ? [Cloud, "text-primary", `Synced ${product ? `to ${product}` : ""}`, ""]
      : status === "in_progress" || status === "in_progress_initiated"
        ? [
            CloudUpload,
            "text-warning-foreground",
            `Syncing to ${product.toLowerCase()}...`,
            "Updates will appear shortly",
          ]
        : [
            CloudAlert,
            "text-destructive-foreground",
            "Failed to Sync",
            node.thirdPartySyncMessage ?? "",
          ];
  return (
    <Tooltip
      message={
        <span className="flex flex-col">
          <span className="font-medium">{title}</span>
          {detail ? (
            <span className="text-xs text-secondary-foreground">{detail}</span>
          ) : null}
        </span>
      }
    >
      <Icon aria-label={title} className={cn("h-4 w-4", ink)} />
    </Tooltip>
  );
};

/** Groups and ledgers alike: a folder tree or a page, in secondary ink. */
const NodeIcon = ({ node }: { node: CoaTreeNode }) =>
  isLedger(node) ? (
    <FileText
      aria-hidden
      className="h-4 w-4 flex-none text-secondary-foreground"
    />
  ) : (
    <FolderTree
      aria-hidden
      className="h-4 w-4 flex-none text-secondary-foreground"
    />
  );

type Row = { node: CoaTreeNode; level: number; expanded: boolean };

type Props = {
  nodesByParent: Record<string, CoaTreeNode[]>;
  allNodes: CoaTreeNode[];
  counts: AccountingMastersCounts;
  onAdd: () => void;
  onEdit: (node: CoaTreeNode) => void;
  onDelete: (node: CoaTreeNode) => void;
  onSync: (ids: string[]) => void;
  notify: (
    message: string,
    kind?: "success" | "error" | "warning" | "info"
  ) => void;
};

const LedgerTree = ({
  nodesByParent,
  allNodes,
  counts,
  onAdd,
  onEdit,
  onDelete,
  onSync,
  notify,
}: Props) => {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selection, setSelection] = useState<Record<string, boolean>>({});
  const [deleting, setDeleting] = useState<CoaTreeNode | null>(null);
  const searching = search.trim().length > 0;

  // The tree flattened to the rows on screen: each open group's children
  // follow it, one level deeper.
  const browseRows = useMemo(() => {
    const rows: Row[] = [];
    const walk = (key: string, level: number) =>
      (nodesByParent[key] ?? []).forEach((node) => {
        const own = pathKey(node.path);
        const open = !isLedger(node) && expanded.has(own);
        rows.push({ node, level, expanded: open });
        if (open) walk(own, level + 1);
      });
    walk(ROOT_KEY, 0);
    return rows;
  }, [nodesByParent, expanded]);

  const results = useMemo(
    () => (searching ? searchCoa(allNodes, search) : []),
    [allNodes, search, searching]
  );
  const rows: Row[] = searching
    ? results.map((node) => ({ node, level: 0, expanded: false }))
    : browseRows;

  // Like production, "select all" reaches the ledgers already loaded — here,
  // the ones on screen.
  const selectableIds = rows
    .map((r) => r.node)
    .filter(canSelect)
    .map((n) => n.accountUuid as string);
  const selectedIds = Object.keys(selection).filter(
    (id) =>
      selection[id] &&
      allNodes.some((n) => n.accountUuid === id && canSelect(n))
  );
  const selectedOnScreen = selectableIds.filter((id) => selection[id]).length;
  const headerChecked: boolean | "indeterminate" =
    selectableIds.length > 0 && selectedOnScreen === selectableIds.length
      ? true
      : selectedOnScreen > 0
        ? "indeterminate"
        : false;

  const toggle = (node: CoaTreeNode) => {
    const key = pathKey(node.path);
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const resize = useColumnResize({
    shown: SHOWN,
    sizes: COA_SIZES,
    storageKey: "coa.tree.widths.v1",
  });

  const askDelete = (node: CoaTreeNode) => {
    // production's handleDelete: anything Tally already has stays.
    if (syncOf(node) !== "not_synced") {
      notify("Synced ledger cannot be deleted", "error");
      return;
    }
    setDeleting(node);
  };

  const sync = () => {
    onSync(selectedIds);
    setSelection({});
  };

  const cell = (key: ColumnKey, row: Row) => {
    const { node, level } = row;
    const ledger = isLedger(node);
    switch (key) {
      case "name":
        if (searching)
          return (
            <div className="flex min-w-0 items-start gap-2">
              <span className="mt-0.5">
                <NodeIcon node={node} />
              </span>
              <div className="min-w-0">
                <div
                  className="truncate font-medium text-foreground"
                  title={node.label}
                >
                  {node.label}
                </div>
                <div className={cn(T.sub, "truncate leading-4")}>
                  {/* A group's path ends with itself; show where it sits. */}
                  {(ledger ? node.path : node.path.slice(0, -1)).join(" / ") ||
                    "Root"}
                </div>
              </div>
            </div>
          );
        return (
          <div
            className="flex min-w-0 items-center gap-1.5"
            style={{ paddingLeft: level * 20 }}
          >
            {node.isLeaf ? (
              <span className="h-7 w-5 flex-none" />
            ) : (
              <button
                type="button"
                aria-label={`${row.expanded ? "Collapse" : "Expand"} ${node.label}`}
                aria-expanded={row.expanded}
                onClick={(e) => {
                  e.stopPropagation();
                  toggle(node);
                }}
                className="grid h-7 w-5 flex-none place-items-center rounded-md text-secondary-foreground hover:bg-muted"
              >
                {row.expanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            )}
            <NodeIcon node={node} />
            <span
              className={cn(
                "min-w-0 truncate text-foreground",
                !ledger && "font-semibold"
              )}
              title={node.label}
            >
              {node.label}
            </span>
          </div>
        );
      case "sync":
        return ledger ? <SyncIcon node={node} /> : null;
      case "nature":
        return ledger ? null : (
          <span className="truncate">{node.nature || "-"}</span>
        );
      case "subGroups":
        return ledger ? null : (
          <span className="font-medium tabular-nums">{node.subGroups}</span>
        );
      case "ledgers":
        return ledger ? null : (
          <span className="font-medium tabular-nums">{node.ledgers}</span>
        );
    }
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-3 px-6 pb-3 pt-5">
        <h1 className={cn(T.title, "mr-auto text-2xl")}>Chart of Accounts</h1>
        <Button variant="secondary" onClick={sync}>
          <RefreshCw className="h-4 w-4" />
          {selectedIds.length ? `Sync ${selectedIds.length} selected` : "Sync"}
        </Button>
      </div>

      <Tabs
        value="ledger"
        className="mx-6 shrink-0 overflow-x-auto border-b border-neutral-gray"
      >
        <TabsList className="h-auto gap-2 rounded-none bg-transparent p-0">
          <TabsTrigger
            value="ledger"
            className="gap-2 rounded-none border-b-2 border-transparent px-2.5 py-3 text-sm text-secondary-foreground shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-primary data-[state=active]:shadow-none"
          >
            {/* production's formatLedgerMastersTabLabel */}
            {counts.totalGroupCount && counts.totalLedgerCount
              ? `Groups (${counts.totalGroupCount}) & Ledgers (${counts.totalLedgerCount})`
              : "Groups & Ledgers"}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex shrink-0 flex-wrap items-center gap-2 px-6 py-3">
        <div className="relative w-full sm:w-auto sm:min-w-[198px] sm:max-w-[420px] sm:flex-1">
          <Input
            aria-label="Search Ledgers or groups"
            placeholder="Search Ledgers or groups"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn("h-9 pr-9", T.cell, "text-foreground")}
          />
          {!search && (
            <span
              aria-hidden
              className="pointer-events-none absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md bg-section"
            >
              <Slash className="h-3 w-3 text-secondary-foreground" />
            </span>
          )}
        </div>
        <span className="flex-1" />
        <Button onClick={onAdd}>
          <Plus className="h-4 w-4" />
          Add Ledger
        </Button>
      </div>

      <div
        ref={resize.gridRef}
        className="min-h-0 min-w-0 flex-1 overflow-auto"
      >
        <Table
          aria-label="Chart of Accounts"
          style={{ width: resize.tableWidth }}
          className={TABLE_CLASS}
        >
          <TableHeader className={HEADER_CLASS}>
            <TableRow>
              <TableHead
                style={{ width: SELECT_WIDTH }}
                className="sticky left-0 z-10 h-10 bg-accent px-3 py-0 align-middle"
              >
                <Checkbox
                  aria-label="Select all ledgers"
                  checked={headerChecked}
                  disabled={!selectableIds.length}
                  onCheckedChange={(checked) =>
                    setSelection((current) => {
                      const next = { ...current };
                      selectableIds.forEach((id) => {
                        if (checked) next[id] = true;
                        else delete next[id];
                      });
                      return next;
                    })
                  }
                />
              </TableHead>
              {COLUMNS.map(({ key, label, align }) => (
                <HeaderCell
                  key={key}
                  columnKey={key}
                  label={label}
                  sizes={COA_SIZES}
                  resize={resize}
                  align={align}
                  resizable={key !== "sync"}
                />
              ))}
              <TableHead
                style={{ width: ACTIONS_WIDTH }}
                className="sticky right-0 z-10 h-10 border-l border-neutral-gray bg-accent px-3 py-0 align-middle"
              >
                <span className={cn(T.head, "flex h-4 items-center truncate")}>
                  Actions
                </span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const { node } = row;
              const ledger = isLedger(node);
              const id = node.accountUuid ?? "";
              const ticked = ledger && !!selection[id];
              const ground = ticked ? "bg-accent" : "bg-background";
              return (
                <TableRow
                  key={`${node.id}-${row.level}`}
                  data-node={ledger ? "ledger" : "group"}
                  aria-selected={ticked || undefined}
                  onClick={() => (ledger ? onEdit(node) : toggle(node))}
                  className={cn(
                    "cursor-pointer hover:bg-transparent",
                    ticked && "bg-accent hover:bg-accent",
                    !ledger && node.isLeaf && !searching && "cursor-default"
                  )}
                >
                  <TableCell
                    onClick={(e) => e.stopPropagation()}
                    className={cn(
                      "sticky left-0 z-[1] h-[45px] px-3 py-0 align-middle",
                      ground
                    )}
                  >
                    {ledger ? (
                      <Checkbox
                        aria-label={`Select ${node.label}`}
                        checked={ticked}
                        disabled={!canSelect(node)}
                        onCheckedChange={(checked) =>
                          setSelection((current) => {
                            const next = { ...current };
                            if (checked) next[id] = true;
                            else delete next[id];
                            return next;
                          })
                        }
                      />
                    ) : null}
                  </TableCell>
                  {COLUMNS.map(({ key, align }) => (
                    <TableCell
                      key={key}
                      className={cn(
                        "h-[45px] overflow-hidden px-3 py-0 align-middle",
                        T.cell,
                        align === "right" && "text-right"
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-[44px] min-w-0 flex-col justify-center overflow-hidden",
                          align === "right" && "items-end",
                          key === "sync" && "items-center"
                        )}
                      >
                        {cell(key, row)}
                      </div>
                    </TableCell>
                  ))}
                  <TableCell
                    onClick={(e) => e.stopPropagation()}
                    className={cn(
                      "sticky right-0 z-[1] h-[45px] border-l border-neutral-gray px-3 py-0 align-middle",
                      ground
                    )}
                  >
                    {ledger ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Actions for ${node.label}`}
                            className="text-secondary-foreground"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-32">
                          <DropdownMenuItem onSelect={() => onEdit(node)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          {Number(node.transactionCount ?? 0) === 0 ? (
                            <DropdownMenuItem
                              onSelect={() => askDelete(node)}
                              className="text-destructive-foreground focus:bg-destructive focus:text-destructive-foreground"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {!rows.length && (
          <EmptyBlock
            title={
              searching
                ? "No ledgers or groups match your search."
                : "No ledger groups found."
            }
          />
        )}
      </div>

      <PageDialog
        open={!!deleting}
        title="Delete ledger?"
        onClose={() => setDeleting(null)}
        className="max-w-[460px]"
      >
        <p className={T.value}>
          <span className="font-semibold text-foreground">
            {deleting?.label}
          </span>{" "}
          has no transactions and has not been synced to Tally. Deleting it
          removes it from AI Accountant for good.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleting(null)}>
            Cancel
          </Button>
          <Button
            isDestructive
            onClick={() => {
              if (deleting) onDelete(deleting);
              setDeleting(null);
            }}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </PageDialog>
    </div>
  );
};

export default LedgerTree;
