import { useMemo, useSyncExternalStore } from "react";
import { format } from "date-fns";
import { INVENTORY_SYNC_MS } from "@/config/pages/inbox/inventory";
import { seedFor } from "@/config/pages/inbox/mock-inventory";
import type {
  InventoryOptions,
  Option,
  StockItemDetail,
  StockItemFormValues,
  StockItemRow,
} from "@/types/pages/inbox/inventory";

/**
 * Inventory state: one company's stock items and the option lists the form
 * picks from.
 *
 * Module-level, so leaving the Items list for the form and coming back keeps
 * every save, and a sync started from the list still finishes while the form
 * is open. In memory only: a reload starts from the mocks again.
 *
 * Every write below names the production endpoint it stands in for.
 */

type InventoryState = {
  items: StockItemDetail[];
  options: InventoryOptions;
};

const stores = new Map<string, InventoryState>();
const listeners = new Set<() => void>();

const seed = (company: string): InventoryState => ({
  // DEV: GET /api/inventory-masters/items?companyId=…&page=…&limit=…&search=…
  items: structuredClone(seedFor(company).items),
  // DEV: GET /api/inventory-masters/items/options?companyId=…
  options: structuredClone(seedFor(company).options),
});

const read = (company: string) => {
  let state = stores.get(company);
  if (!state) {
    state = seed(company);
    stores.set(company, state);
  }
  return state;
};

const write = (company: string, next: Partial<InventoryState>) => {
  stores.set(company, { ...read(company), ...next });
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const labelOf = (options: Option[], value: string, fallback: string) =>
  options.find((option) => option.value === value)?.label || fallback;

/** production's mapStockItemRow (utils/pages/inventory-masters/mappers.ts) */
export const mapStockItemRow = (
  item: StockItemDetail,
  options: InventoryOptions
): StockItemRow => ({
  itemUuid: item.itemUuid,
  thirdPartySyncStatus: item.thirdPartySyncStatus,
  thirdPartyPostingDate: item.thirdPartyPostingDate,
  thirdPartyProduct: item.thirdPartyProduct,
  thirdPartySyncError: item.thirdPartySyncError,
  name: item.name,
  under: labelOf(options.groups, item.underUuid, "Primary"),
  category: labelOf(options.categories, item.categoryUuid, "Not Applicable"),
  unit: labelOf(options.units, item.unitUuid, "Not Applicable"),
  openingBalance: item.openingBalanceValue,
  openingStockQty: item.quantity,
  openingStockValue: item.openingBalanceValue,
});

export const isSyncInProgress = (status?: string) =>
  status === "in_progress" || status === "in_progress_initiated";

/** production's isCheckboxEnable: only unsynced or failed rows can be picked. */
export const isCheckboxEnable = (status?: string) =>
  ["not_synced", "event_creations_failed", "event_processing_failed"].includes(
    status || "not_synced"
  );

export const useInventory = (company: string) => {
  const state = useSyncExternalStore(
    subscribe,
    () => read(company),
    () => read(company)
  );
  const rows = useMemo(
    () => state.items.map((item) => mapStockItemRow(item, state.options)),
    [state]
  );
  return { items: state.items, options: state.options, rows };
};

/** production's mapInventoryItemDetailsToFormValues */
export const toFormValues = (
  item: StockItemDetail,
  options: InventoryOptions
): StockItemFormValues => ({
  ...item,
  applicableDate: item.applicableDate ? new Date(item.applicableDate) : null,
  perUnitLabel: labelOf(options.units, item.unitUuid, "Not Applicable"),
  godownAllocations: item.godownAllocations.map((a) => ({ ...a })),
});

export const inventoryActions = {
  getItem: (company: string, itemUuid: string) =>
    read(company).items.find((item) => item.itemUuid === itemUuid),

  /**
   * Create or update. Either way the item is not in Tally until the next
   * sync, so it comes back not_synced.
   */
  saveItem: (
    company: string,
    itemUuid: string | undefined,
    values: StockItemFormValues
  ) => {
    // DEV: POST /api/inventory-masters/items (create)
    // DEV: PUT /api/inventory-masters/items/:itemUuid (update)
    //      body: buildStockItemPayload(...) — utils/pages/inventory-masters/create-item
    const { items } = read(company);
    const existing = itemUuid
      ? items.find((item) => item.itemUuid === itemUuid)
      : undefined;
    const { perUnitLabel: _perUnitLabel, applicableDate, ...rest } = values;
    const next: StockItemDetail = {
      ...rest,
      itemUuid: existing?.itemUuid ?? `itm-${Date.now().toString(36)}`,
      applicableDate: applicableDate
        ? format(applicableDate, "yyyy-MM-dd")
        : null,
      isUomEditable: existing?.isUomEditable ?? true,
      thirdPartySyncStatus: "not_synced",
      thirdPartyProduct: "Tally",
    };
    write(company, {
      items: existing
        ? items.map((item) => (item.itemUuid === next.itemUuid ? next : item))
        : [next, ...items],
    });
    return next;
  },

  deleteItem: (company: string, itemUuid: string) => {
    // DEV: DELETE /api/inventory-masters/items/:itemUuid?companyId=…
    write(company, {
      items: read(company).items.filter((item) => item.itemUuid !== itemUuid),
    });
  },

  /**
   * Push items to Tally. In progress at once, synced a few seconds later —
   * production polls the list every 10s and sees the same transition.
   */
  syncItems: (company: string, itemUuids: string[]) => {
    // DEV: POST /api/sync/financial-data { unsyncedInventoryItems: itemUuids }
    //      (components/transactions/sync-financial-data.tsx)
    const ids = new Set(itemUuids);
    const patch = (fn: (item: StockItemDetail) => StockItemDetail) =>
      write(company, {
        items: read(company).items.map((item) =>
          ids.has(item.itemUuid) ? fn(item) : item
        ),
      });
    patch((item) => ({
      ...item,
      thirdPartySyncStatus: "in_progress",
      thirdPartySyncError: undefined,
    }));
    setTimeout(
      () =>
        patch((item) =>
          isSyncInProgress(item.thirdPartySyncStatus)
            ? {
                ...item,
                thirdPartySyncStatus: "synced",
                thirdPartyPostingDate: new Date().toISOString(),
              }
            : item
        ),
      INVENTORY_SYNC_MS
    );
  },
};
