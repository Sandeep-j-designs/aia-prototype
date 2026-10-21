import { useMemo, useSyncExternalStore } from "react";
import Router from "next/router";
import { toast } from "sonner";
import { NOTIFICATION_KINDS } from "@/config/pages/notifications/kinds";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  MOCK_NOTIFICATIONS,
} from "@/config/pages/notifications/mock-notifications";
import type {
  Notification,
  NotificationCounts,
  NotificationInput,
  NotificationKind,
  NotificationPreferences,
} from "@/types/pages/notifications";

/**
 * The notification centre's store.
 *
 * Module-level, like the other module stores: the bell, the full page, the
 * settings dialog and every emitter (a sync finishing, a statement read)
 * share one list, and a notice raised while you are on another screen is
 * still there when you open the bell.
 *
 * In memory, reseeded on load like the Inbox store. Preferences are the one
 * thing kept, in localStorage, because a setting that forgets itself on
 * reload reads as broken.
 *
 * DEV: production replaces the seed with GET /api/notifications and the
 * emitters with a realtime subscription (the same Ably channel Tally sync
 * uses) that pushes new and resolved notices. The actions below map 1:1:
 *   markRead / markUnread      → PATCH /api/notifications/:id { readAt }
 *   markAllRead                → POST  /api/notifications/read-all { companyId, category? }
 *   setPreferences             → PUT   /api/notification-preferences
 *   push / resolve             → server-side only; delete the client calls.
 */

const PREFS_KEY = "aia.notifications.prefs";

type State = {
  items: Notification[];
  preferences: NotificationPreferences;
  settingsOpen: boolean;
};

const EMPTY: State = {
  items: [],
  preferences: DEFAULT_NOTIFICATION_PREFERENCES,
  settingsOpen: false,
};

let state: State = EMPTY;
let seeded = false;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((listener) => listener());

const set = (next: Partial<State>) => {
  state = { ...state, ...next };
  emit();
};

const uid = () => `ntf-${crypto.randomUUID()}`;

/** A notice from what the caller knows, with the rest filled from its kind. */
const build = (input: NotificationInput): Notification => {
  const meta = NOTIFICATION_KINDS[input.kind];
  const { title, body } = meta.copy(input.data);
  return {
    id: uid(),
    companyId: input.companyId,
    kind: input.kind,
    category: meta.category,
    module: input.module ?? meta.module,
    severity: meta.severity,
    title,
    body,
    data: input.data,
    actor: input.actor ?? { kind: "system" },
    target: input.target,
    refs: input.refs ?? [],
    groupKey: input.groupKey,
    createdAt: input.createdAt ?? new Date().toISOString(),
    readAt: input.readAt ?? null,
    resolvedAt: null,
  };
};

/** Re-render a notice's copy after its data changed. */
const recopy = (n: Notification): Notification => ({
  ...n,
  ...NOTIFICATION_KINDS[n.kind].copy(n.data),
});

const ensureSeeded = () => {
  if (seeded || typeof window === "undefined") return;
  seeded = true;
  let preferences = DEFAULT_NOTIFICATION_PREFERENCES;
  try {
    const saved = localStorage.getItem(PREFS_KEY);
    if (saved) preferences = { ...preferences, ...JSON.parse(saved) };
  } catch {}
  state = {
    ...state,
    preferences,
    items: [...MOCK_NOTIFICATIONS.map(build), ...state.items],
  };
};

/** How long an update stays open to fold more of the same into it. */
const FOLD_MS = 15 * 60_000;

const isOpen = (n: Notification) => !n.resolvedAt;

/**
 * Pop a toast for a critical notice, if the user wants them. Callers that
 * already toast for the same moment pass `toast: false`.
 */
const announce = (n: Notification) => {
  if (n.severity !== "critical" || !state.preferences.urgentToasts) return;
  toast.error(n.title, {
    description: n.body,
    duration: 8000,
    closeButton: true,
    action: {
      label: NOTIFICATION_KINDS[n.kind].action,
      onClick: () => {
        notificationActions.markRead(n.id);
        void Router.push(n.target.href);
      },
    },
  });
};

export const notificationActions = {
  /**
   * Raise a notice. With a `groupKey`, an open notice under the same key
   * takes it in instead — refs merge, the count follows, and it comes back
   * to the top as unread. An action notice stays open to folding until it is
   * resolved; an update only for FOLD_MS, so yesterday's arrivals don't
   * swallow today's.
   */
  push(input: NotificationInput, options: { toast?: boolean } = {}) {
    ensureSeeded();
    const fresh = build(input);
    const now = Date.now();
    const into = input.groupKey
      ? state.items.find(
          (n) =>
            n.companyId === input.companyId &&
            n.groupKey === input.groupKey &&
            isOpen(n) &&
            (n.category === "action" ||
              (!n.readAt && now - +new Date(n.createdAt) < FOLD_MS))
        )
      : undefined;
    if (into) {
      const refs = Array.from(new Set([...into.refs, ...fresh.refs]));
      if (refs.length === into.refs.length && into.category === "action")
        return into;
      const count =
        into.category === "action"
          ? refs.length
          : Number(into.data.count ?? 0) + Number(fresh.data.count ?? 0);
      const merged = recopy({
        ...into,
        data: { ...into.data, ...fresh.data, count },
        refs,
        createdAt: fresh.createdAt,
        readAt: null,
      });
      set({
        items: [merged, ...state.items.filter((n) => n.id !== into.id)],
      });
      return merged;
    }
    // The same record raising the same open notice twice is one notice.
    if (
      fresh.refs.length &&
      state.items.some(
        (n) =>
          n.companyId === fresh.companyId &&
          n.kind === fresh.kind &&
          isOpen(n) &&
          fresh.refs.every((ref) => n.refs.includes(ref))
      )
    )
      return null;
    set({ items: [fresh, ...state.items] });
    if (options.toast !== false && !fresh.readAt) announce(fresh);
    return fresh;
  },

  /**
   * The work behind a notice is done for `ref`. A grouped notice drops the
   * ref and recounts; the last ref closes it. Resolving also reads it — a
   * problem you fixed is not news.
   */
  resolve(companyId: string, kinds: NotificationKind[], ref: string) {
    ensureSeeded();
    let changed = false;
    const at = new Date().toISOString();
    const items = state.items.map((n) => {
      if (
        n.companyId !== companyId ||
        !kinds.includes(n.kind) ||
        !isOpen(n) ||
        !n.refs.includes(ref)
      )
        return n;
      changed = true;
      const refs = n.refs.filter((r) => r !== ref);
      if (!refs.length || n.category === "update")
        return { ...n, refs: n.refs, resolvedAt: at, readAt: n.readAt ?? at };
      return recopy({ ...n, refs, data: { ...n.data, count: refs.length } });
    });
    if (changed) set({ items });
  },

  /** Close every open notice of these kinds for a company. */
  resolveAll(companyId: string, kinds: NotificationKind[]) {
    ensureSeeded();
    const at = new Date().toISOString();
    set({
      items: state.items.map((n) =>
        n.companyId === companyId && kinds.includes(n.kind) && isOpen(n)
          ? { ...n, resolvedAt: at, readAt: n.readAt ?? at }
          : n
      ),
    });
  },

  markRead(id: string) {
    set({
      items: state.items.map((n) =>
        n.id === id && !n.readAt
          ? { ...n, readAt: new Date().toISOString() }
          : n
      ),
    });
  },

  markUnread(id: string) {
    set({
      items: state.items.map((n) => (n.id === id ? { ...n, readAt: null } : n)),
    });
  },

  markManyRead(ids: string[], read = true) {
    const pick = new Set(ids);
    const at = new Date().toISOString();
    set({
      items: state.items.map((n) =>
        pick.has(n.id) ? { ...n, readAt: read ? (n.readAt ?? at) : null } : n
      ),
    });
  },

  markAllRead(companyId: string, category?: Notification["category"]) {
    const at = new Date().toISOString();
    set({
      items: state.items.map((n) =>
        n.companyId === companyId &&
        !n.readAt &&
        (!category || n.category === category)
          ? { ...n, readAt: at }
          : n
      ),
    });
  },

  setPreferences(preferences: NotificationPreferences) {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(preferences));
    } catch {}
    set({ preferences });
  },

  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),
};

const subscribe = (listener: () => void) => {
  ensureSeeded();
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useNotificationStore = () =>
  useSyncExternalStore(
    subscribe,
    () => state,
    () => EMPTY
  );

/**
 * Whether a notice shows in the app. Action notices always do — they are the
 * work list, and switching one off would hide work, not noise. An update
 * follows its group's in-app switch.
 */
export const isShown = (n: Notification, prefs: NotificationPreferences) =>
  n.category === "action" ||
  prefs.channels[NOTIFICATION_KINDS[n.kind].group].inApp;

/** Counts for one company, as the unread-count endpoint returns them. */
export const countsFor = (
  items: Notification[],
  companyId: string,
  prefs: NotificationPreferences
): NotificationCounts => {
  const mine = items.filter(
    (n) => n.companyId === companyId && isShown(n, prefs)
  );
  return {
    companyId,
    action: mine.filter((n) => n.category === "action" && isOpen(n)).length,
    unread: mine.filter((n) => !n.readAt).length,
  };
};

/**
 * One company's notices, newest first, and the counts for every company the
 * user belongs to (the bell names the others that need attention).
 */
export const useNotifications = (companyId: string, companyIds: string[]) => {
  const { items, preferences, settingsOpen } = useNotificationStore();
  return useMemo(() => {
    const mine = items
      .filter((n) => n.companyId === companyId && isShown(n, preferences))
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    return {
      all: mine,
      needsAction: mine.filter((n) => n.category === "action" && isOpen(n)),
      updates: mine.filter((n) => n.category === "update"),
      counts: countsFor(items, companyId, preferences),
      others: companyIds
        .filter((id) => id !== companyId)
        .map((id) => countsFor(items, id, preferences))
        .filter((c) => c.action > 0),
      preferences,
      settingsOpen,
    };
  }, [items, preferences, settingsOpen, companyId, companyIds.join("|")]);
};
