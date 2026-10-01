import { useMemo, useSyncExternalStore } from "react";
import {
  COA_SYNC_MS,
  toUnderOption,
} from "@/config/pages/inbox/chart-of-accounts";
import { seedFor } from "@/config/pages/inbox/mock-chart-of-accounts";
import type {
  AccountingMastersCounts,
  CoaTreeNode,
  LedgerDetailResponse,
  LedgerGroupListItem,
  UnderOption,
} from "@/types/pages/inbox/chart-of-accounts";

/**
 * Chart of Accounts state: ledger groups and ledgers for one company.
 *
 * Module-level, so the tree, the New Ledger page and Edit Ledger page share
 * one book — a ledger saved on the form is in the tree the moment the page
 * returns to it. In memory only: a reload starts from the mocks again.
 *
 * Production fetches the tree a level at a time (useCoaTreeItemsController,
 * 20 children per parent with a "Load more" row). Here every level is already
 * in memory, so expanding is instant and nothing pages. Every read and write
 * below names the production endpoint it stands in for.
 */

type CoaState = {
  groups: LedgerGroupListItem[];
  ledgers: LedgerDetailResponse[];
};

/** production's ROOT_KEY and pathKey (utils/components/async-tree-select). */
export const ROOT_KEY = "";
export const pathKey = (path: string[]) => path.join(" / ");

const stores = new Map<string, CoaState>();
const listeners = new Set<() => void>();

const seed = (company: string): CoaState => ({
  // DEV: GET /api/accounting-masters/ledger-groups?companyUuid=…
  groups: structuredClone(seedFor(company).groups),
  // DEV: GET /api/accounts/coa-list-v2?companyId=…&pageSize=20[&parentPath=…]
  //      (tree rows), GET /api/accounting-masters/customer-accounts-v2/{id}
  //      (one ledger's detail, on the Edit page)
  ledgers: structuredClone(seedFor(company).ledgers),
});

const read = (company: string) => {
  let state = stores.get(company);
  if (!state) {
    state = seed(company);
    stores.set(company, state);
  }
  return state;
};

const write = (company: string, next: Partial<CoaState>) => {
  stores.set(company, { ...read(company), ...next });
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const byLabel = (a: CoaTreeNode, b: CoaTreeNode) =>
  a.label.localeCompare(b.label, "en-IN", { numeric: true });

/** A group as normalizeCoaFetchResult hands it to the tree. */
const groupNode = (
  group: LedgerGroupListItem,
  subGroups: number,
  ledgers: number
): CoaTreeNode => ({
  id: group.ledgerGroupUuid,
  label: group.groupName,
  path: group.groupPath,
  ledgerGroupUuid: group.ledgerGroupUuid,
  groupName: group.groupName,
  nature: group.nature ?? "",
  subGroups,
  subgroupCount: subGroups,
  ledgers,
  ledgerCount: ledgers,
  isLeaf: subGroups + ledgers === 0,
  hasChildren: subGroups + ledgers > 0,
  selectable: true,
});

/** A ledger row: its path is its group's, and it is always a leaf. */
const ledgerNode = (ledger: LedgerDetailResponse): CoaTreeNode => ({
  id: ledger.accountUuid,
  label: ledger.accountName,
  path: ledger.groupPath,
  accountUuid: ledger.accountUuid,
  accountName: ledger.accountName,
  nature: "",
  subGroups: 0,
  ledgers: 0,
  isLeaf: true,
  hasChildren: false,
  selectable: true,
  thirdPartySyncStatus: ledger.thirdPartySyncStatus ?? "not_synced",
  thirdPartySyncMessage: ledger.thirdPartySyncMessage ?? null,
  thirdPartyProduct: ledger.thirdPartyProduct,
  transactionCount: ledger.transactionCount,
});

const buildTree = ({ groups, ledgers }: CoaState) => {
  const childGroups = new Map<string, LedgerGroupListItem[]>();
  const childLedgers = new Map<string, LedgerDetailResponse[]>();
  groups.forEach((group) => {
    const parent = pathKey(group.groupPath.slice(0, -1));
    childGroups.set(parent, [...(childGroups.get(parent) ?? []), group]);
  });
  ledgers.forEach((ledger) => {
    const parent = pathKey(ledger.groupPath);
    childLedgers.set(parent, [...(childLedgers.get(parent) ?? []), ledger]);
  });

  const nodesByParent: Record<string, CoaTreeNode[]> = {};
  const allNodes: CoaTreeNode[] = [];
  const keys = new Set([...childGroups.keys(), ...childLedgers.keys()]);
  keys.forEach((key) => {
    // Sub-groups first, then the group's own ledgers, each alphabetical.
    const groupRows = (childGroups.get(key) ?? [])
      .map((group) => {
        const own = pathKey(group.groupPath);
        return groupNode(
          group,
          childGroups.get(own)?.length ?? 0,
          childLedgers.get(own)?.length ?? 0
        );
      })
      .sort(byLabel);
    const ledgerRows = (childLedgers.get(key) ?? [])
      .map(ledgerNode)
      .sort(byLabel);
    nodesByParent[key] = [...groupRows, ...ledgerRows];
    allNodes.push(...groupRows, ...ledgerRows);
  });
  return { nodesByParent, allNodes };
};

export const useChartOfAccounts = (company: string) => {
  const state = useSyncExternalStore(
    subscribe,
    () => read(company),
    () => read(company)
  );
  const tree = useMemo(() => buildTree(state), [state]);
  const underOptions: UnderOption[] = useMemo(
    () => state.groups.map(toUnderOption),
    [state.groups]
  );
  // DEV: GET /api/companies/masters-count?companyUuid=…
  const counts: AccountingMastersCounts = {
    totalGroupCount: state.groups.length,
    totalLedgerCount: state.ledgers.length,
  };
  return {
    groups: state.groups,
    ledgers: state.ledgers,
    nodesByParent: tree.nodesByParent,
    allNodes: tree.allNodes,
    underOptions,
    counts,
  };
};

/**
 * DEV: GET /api/accounts/coa-list-v2?companyId=…&search=… — production
 * searches server-side and pages 20 at a time ("Load more matches").
 */
export const searchCoa = (nodes: CoaTreeNode[], query: string) => {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  return nodes
    .filter((node) => node.label.toLowerCase().includes(needle))
    .sort(
      (a, b) =>
        Number(!!a.accountUuid) - Number(!!b.accountUuid) || byLabel(a, b)
    );
};

export const coaActions = {
  /** DEV: DELETE /api/accounting-masters/customer-accounts-v2/{ledgerUuid} */
  deleteLedger: (company: string, accountUuid: string) =>
    write(company, {
      ledgers: read(company).ledgers.filter(
        (l) => l.accountUuid !== accountUuid
      ),
    }),

  /**
   * DEV: POST /api/accounting-masters/customer-accounts-v2 (create) or
   * PUT /api/accounting-masters/customer-accounts-v2/{ledgerUuid} (update).
   * A saved ledger waits for the next sync, so it lands as not_synced.
   */
  saveLedger: (company: string, ledger: LedgerDetailResponse) => {
    const { ledgers } = read(company);
    const exists = ledgers.some((l) => l.accountUuid === ledger.accountUuid);
    write(company, {
      ledgers: exists
        ? ledgers.map((l) =>
            l.accountUuid === ledger.accountUuid ? ledger : l
          )
        : [...ledgers, ledger],
    });
  },

  /**
   * DEV: POST /api/accounting-masters/customer-accounts-v2/sync with the
   * selected ledger ids (production's SyncFinancialData dialog). With nothing
   * selected, every unsynced or failed ledger goes.
   */
  sync: (company: string, ids: string[], onDone?: (count: number) => void) => {
    const syncable = (l: LedgerDetailResponse) =>
      ids.length
        ? ids.includes(l.accountUuid)
        : l.thirdPartySyncStatus === "not_synced" ||
          l.thirdPartySyncStatus === "event_creations_failed" ||
          l.thirdPartySyncStatus === "event_processing_failed";
    const targets = read(company)
      .ledgers.filter(syncable)
      .map((l) => l.accountUuid);
    write(company, {
      ledgers: read(company).ledgers.map((l) =>
        targets.includes(l.accountUuid)
          ? { ...l, thirdPartySyncStatus: "in_progress" }
          : l
      ),
    });
    window.setTimeout(() => {
      write(company, {
        ledgers: read(company).ledgers.map((l) =>
          targets.includes(l.accountUuid)
            ? {
                ...l,
                thirdPartySyncStatus: "synced",
                thirdPartySyncMessage: null,
              }
            : l
        ),
      });
      onDone?.(targets.length);
    }, COA_SYNC_MS);
    return targets.length;
  },
};
