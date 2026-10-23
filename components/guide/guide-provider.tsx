import { useRouter } from "next/router";
import { openReconWelcome } from "@/hooks/pages/neo/use-recon-onboarding";
import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { JOURNEYS } from "@/config/pages/guide/journeys";
import { runGuideAction } from "./actions";
import type { JourneyId } from "@/types/pages/guide";
import GuideBanner from "./guide-banner";
import JourneysDialog from "./journeys-dialog";
import TourPopover, { findAnchor } from "./tour-popover";

export type GuideApi = {
  /** Opens the journey launcher — what the Guide button in the top bar does. */
  openLauncher: () => void;
  /** Runs a journey directly, skipping the launcher. */
  startJourney: (id: JourneyId) => void;
  /** The journey currently being narrated, if any. */
  activeJourney: JourneyId | null;
};

export const GuideContext = createContext<GuideApi | null>(null);

/**
 * Holds guide state for the whole app.
 *
 * It lives above the routes because a journey outlasts the screen it started
 * on — the Inbox walkthrough begins on the empty state and ends on a record —
 * and because the launcher is opened from the top bar, which every route
 * renders its own copy of.
 *
 * Production mounts the real GuideProvider here and it talks to Usertour. The
 * contract this exposes is the same three calls, so the swap is this file.
 */
const GuideProvider = ({ children }: { children: React.ReactNode }) => {
  const [launcher, setLauncher] = useState(false);
  const [active, setActive] = useState<JourneyId | null>(null);
  const [step, setStep] = useState(0);
  // DEV: seed from the guide service; POST completion back on finish.
  const [completed, setCompleted] = useState<JourneyId[]>(
    JOURNEYS.filter((j) => j.complete).map((j) => j.id)
  );

  const journey = JOURNEYS.find((j) => j.id === active) ?? null;
  const steps = journey?.steps ?? [];

  const startJourney = useCallback((id: JourneyId) => {
    const target = JOURNEYS.find((j) => j.id === id);
    if (!target?.steps.length) return;
    setLauncher(false);
    setStep(0);
    setActive(id);
  }, []);

  /* The launcher's Start. Three-way reconciliation begins with its welcome
     and explainer in Neo, not with hints: those belong to the sample run,
     which starts them itself (components/neo/common/recon-card.tsx). */
  const router = useRouter();
  const launch = useCallback(
    (id: JourneyId) => {
      if (id !== "recon") return startJourney(id);
      setLauncher(false);
      openReconWelcome();
      if (!/[?&]module=NEO\b/.test(router.asPath))
        void router.push("/inbox?module=NEO");
    },
    [router, startJourney]
  );

  const end = useCallback(
    (finished: boolean) => {
      /* Finished or skipped, the screen goes back the way the tour found it —
         a walkthrough that leaves its own documents in the queue can only be
         watched once, and the empty state is where it begins. */
      if (active === "inbox") runGuideAction("reset-demo");
      if (finished && active)
        setCompleted((prev) =>
          prev.includes(active) ? prev : [...prev, active]
        );
      setActive(null);
      setStep(0);
      /* Finishing returns to the launcher, so the tick that was just earned is
         visible and the next journey is one click away. Skipping does not —
         someone who pressed Skip tour is asking for the screen back. */
      // The recon hints end inside a run; the launcher would cover it.
      if (finished && active !== "recon") setLauncher(true);
    },
    [active]
  );

  const current = steps[step];
  const advance = useCallback(
    () => setStep((s) => Math.min(steps.length - 1, s + 1)),
    [steps.length]
  );

  /*
    The two ways a step ends without Next.

    A click is taken on the capture phase and from the whole subtree of the
    anchor — the highlighted control is usually a button with an icon and a
    label inside it, and the click that matters may land on either. Advancing
    is deferred a frame so the screen the click causes is already up when the
    next step measures its anchor.

    A wait is a poll, guarded by whether the element was already there when the
    step opened: the same tour runs on an empty Inbox and on a full one, and
    on a full one the row it is waiting for exists before the upload it is
    waiting on has happened.
  */
  /* The step's own doing, once per arrival at it. Going Back and forward again
     runs it again, which is the honest reading of "this step uploads": the
     panel it points at has to be open for the step to mean anything. */
  useEffect(() => {
    if (current?.action) runGuideAction(current.action);
  }, [current]);

  useEffect(() => {
    if (!current) return;
    if (current.advanceOn === "click" && current.anchor) {
      const anchor = current.anchor;
      const onClick = (event: MouseEvent) => {
        const el = event.target as HTMLElement | null;
        if (el?.closest?.(`[data-guide-id="${anchor}"]`))
          window.setTimeout(advance, 120);
      };
      document.addEventListener("click", onClick, true);
      return () => document.removeEventListener("click", onClick, true);
    }
    if (current.waitFor) {
      const waitFor = current.waitFor;
      if (findAnchor(waitFor)) return;
      const timer = window.setInterval(() => {
        if (findAnchor(waitFor)) {
          window.clearInterval(timer);
          advance();
        }
      }, 300);
      return () => window.clearInterval(timer);
    }
  }, [current, advance]);

  const api = useMemo<GuideApi>(
    () => ({
      openLauncher: () => setLauncher(true),
      startJourney,
      activeJourney: active,
    }),
    [active, startJourney]
  );

  return (
    <GuideContext.Provider value={api}>
      {children}
      <JourneysDialog
        open={launcher}
        journeys={JOURNEYS}
        completed={completed}
        onClose={() => setLauncher(false)}
        onStart={launch}
      />
      {journey && current && (
        <>
          <GuideBanner />
          <TourPopover
            step={current}
            index={step}
            total={steps.length}
            onBack={() => setStep((s) => Math.max(0, s - 1))}
            onNext={() => (step === steps.length - 1 ? end(true) : advance())}
            onSkip={() => end(false)}
          />
        </>
      )}
    </GuideContext.Provider>
  );
};

export default GuideProvider;
