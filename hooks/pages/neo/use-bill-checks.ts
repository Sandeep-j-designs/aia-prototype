import { useSyncExternalStore } from "react";

/**
 * What the accountant has ticked on a bill's checklist, per draft id. The
 * ticks are the accountant's own notes that they looked, not a claim about
 * the form, so they never block or drive Approve.
 *
 * DEV: in memory, like the batches; a reload clears it.
 */
type State = Record<string, string[]>;
let state: State = {};
const listeners = new Set<() => void>();
const subscribe = (f: () => void) => {
  listeners.add(f);
  return () => listeners.delete(f);
};
const snapshot = () => state;

export const useBillChecks = () =>
  useSyncExternalStore(subscribe, snapshot, snapshot);

export const toggleBillCheck = (itemId: string, checkId: string) => {
  const ticked = state[itemId] || [];
  state = {
    ...state,
    [itemId]: ticked.includes(checkId)
      ? ticked.filter((c) => c !== checkId)
      : [...ticked, checkId],
  };
  listeners.forEach((f) => f());
};
