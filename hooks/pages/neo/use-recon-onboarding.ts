import { useSyncExternalStore } from "react";

/**
 * Where the three-way reconciliation onboarding stands for this user: seen
 * the welcome, running the guided sample, finished it. In memory, so every
 * fresh load of the prototype is a first visit.
 *
 * DEV: GET /api/users/me/onboarding?feature=recon on load and PATCH it on
 * each change; the shape below is the payload.
 */
type State = {
  /** The welcome sheet has been shown (or dismissed) once. */
  seen: boolean;
  /** The sheet is open now. */
  open: boolean;
  /** The sample run was started from the welcome; its hints are due. */
  guided: boolean;
  /** The hints have started (once per guided run). */
  hinted: boolean;
  /** The first export has happened: the loop is done. */
  completed: boolean;
  /** The guided run's current annotation, pinned to a part of the screen. */
  coach?: GuideCoachNote;
  /** The current annotation was put away with "Got it". */
  coachSeen: boolean;
};

export type GuideCoachNote = {
  /** Which of the guide's five steps. */
  step: number;
  title: string;
  body: string;
  /** The `data-guide-id` it points at; none centres it. */
  anchor?: string;
  placement?: "top" | "bottom" | "left" | "right";
  /** The note carries the step's own choice: the data, or the files. */
  kind?: "choice" | "upload";
  /** The last note: the guide is done. */
  final?: boolean;
  /** Neo holds here until the note is read: Continue lets it carry on. */
  holds?: boolean;
};

let state: State = {
  seen: false,
  open: false,
  guided: false,
  hinted: false,
  completed: false,
  coachSeen: false,
};
const listeners = new Set<() => void>();
const set = (p: Partial<State>) => {
  state = { ...state, ...p };
  listeners.forEach((f) => f());
};
const subscribe = (f: () => void) => {
  listeners.add(f);
  return () => listeners.delete(f);
};
const snapshot = () => state;

export const useReconOnboarding = () =>
  useSyncExternalStore(subscribe, snapshot, snapshot);
export const reconOnboarding = () => state;

/** Open the welcome: on first visit, or asked for from Skills or the Guide. */
export const openReconWelcome = () => set({ open: true, seen: true });
export const closeReconWelcome = () => set({ open: false, seen: true });
export const startGuidedRun = () =>
  set({
    open: false,
    seen: true,
    guided: true,
    hinted: false,
    coach: undefined,
    coachSeen: false,
  });
/** Leave the guide: the run carries on as an ordinary one. */
export const exitGuide = () => {
  release?.();
  release = null;
  set({ guided: false, coach: undefined, coachSeen: false });
};
/** The guided run moves on: its next annotation. */
let release: (() => void) | null = null;
export const setCoach = (coach: GuideCoachNote) => {
  release?.();
  release = null;
  set({ coach, coachSeen: false });
  if (!coach.holds) return Promise.resolve();
  return new Promise<void>((resolve) => (release = resolve));
};
export const dismissCoach = () => {
  release?.();
  release = null;
  set({ coachSeen: true });
};
export const markHinted = () => set({ hinted: true });
export const markCompleted = () => set({ completed: true, guided: false });
