import { useMemo, useSyncExternalStore } from "react";
import { MOCK_ACTIVITY } from "@/config/pages/inbox/mock-activity";
import type {
  ActivityEntry,
  ActivityKind,
} from "@/types/pages/inbox/automation";

/**
 * The activity log's store: one list of everything the AI and the team did,
 * attributed to whoever did it.
 *
 * Module-level, like the other module stores, so an action taken on one
 * screen (a bill auto-approved in the Inbox, a bank rule accepted in
 * Banking) is in the log and on the document's History the moment it
 * happens. In memory, reseeded on load.
 *
 * DEV: production replaces the seed with GET /api/activity?companyUuid=…
 * and drops `logActivity`: every entry is written server-side by the action
 * that caused it, so the client never posts to the log itself.
 */

type State = { entries: ActivityEntry[] };

let state: State = { entries: [] };
let seeded = false;
const listeners = new Set<() => void>();

const ensureSeeded = () => {
  if (seeded || typeof window === "undefined") return;
  seeded = true;
  // DEV: replace with GET /api/activity?companyUuid=…
  state = { entries: [...MOCK_ACTIVITY] };
};

const emit = () => listeners.forEach((listener) => listener());

const subscribe = (listener: () => void) => {
  ensureSeeded();
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const snapshot = () => {
  ensureSeeded();
  return state;
};

/**
 * How to reverse an undoable entry, keyed by entry id. Kept beside the store,
 * not in it: a function is not data, and production undoes server-side.
 */
const undoers = new Map<string, () => void>();

/**
 * Record an action. Pass `undo` with `undoable: true` and the log, the
 * document's History and any toast can all offer Undo against the same
 * entry; whichever is used first closes the others.
 */
export const logActivity = (
  entry: Omit<ActivityEntry, "id" | "at"> & { at?: string },
  undo?: () => void
): ActivityEntry => {
  ensureSeeded();
  const full: ActivityEntry = {
    ...entry,
    id: `act-${crypto.randomUUID()}`,
    at: entry.at ?? new Date().toISOString(),
  };
  if (undo && full.undoable) undoers.set(full.id, undo);
  state = { entries: [full, ...state.entries] };
  emit();
  return full;
};

/** Whether an entry can be reversed from here. */
export const canUndo = (entry: ActivityEntry) =>
  !!entry.undoable && undoers.has(entry.id);

/**
 * Reverse an entry: run its undo, close it, and log the undo itself, by the
 * person, so the record shows both the action and its reversal.
 *
 * DEV: POST /api/activity/:id/undo
 */
export const undoActivity = (id: string, by: string) => {
  const entry = state.entries.find((e) => e.id === id);
  const undo = undoers.get(id);
  if (!entry || !undo || !entry.undoable) return false;
  undo();
  undoers.delete(id);
  closeActivity(id);
  logActivity({
    company: entry.company,
    actor: { kind: "person", name: by },
    kind: "undone",
    module: entry.module,
    action: `Undid “${entry.action.toLowerCase()}”`,
    subject: entry.subject,
    ref: entry.ref,
  });
  return true;
};

/** An entry can no longer be reversed: the voucher went to Tally, or it was undone. */
export const closeActivity = (id: string) => {
  state = {
    entries: state.entries.map((e) =>
      e.id === id ? { ...e, undoable: false } : e
    ),
  };
  emit();
};

/** Newest first, for one organisation; `ref` narrows to one record's history. */
export const useActivity = (company: string, refId?: string) => {
  const current = useSyncExternalStore(subscribe, snapshot, () => state);
  return useMemo(
    () =>
      current.entries
        .filter(
          (e) => e.company === company && (!refId || e.ref?.id === refId)
        )
        .sort((a, b) => +new Date(b.at) - +new Date(a.at)),
    [current, company, refId]
  );
};

/** The kinds a partner filters on before signing, in the order the filter lists them. */
export const ACTIVITY_KIND_LABELS: Record<ActivityKind, string> = {
  predicted: "Predicted",
  "auto-approved": "Auto-approved",
  held: "Held",
  approved: "Approved",
  override: "Changed by a person",
  undone: "Undone",
  rule: "Rule",
  matched: "Matched",
  learned: "Learned",
  blocked: "Blocked",
  synced: "Synced",
  cleaned: "Cleaned",
};
