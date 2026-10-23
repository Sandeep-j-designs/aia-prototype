import React, { useEffect, useRef, useState } from "react";
import { ArrowRight, Files, Pause, Play } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { configure, useStore } from "@/components/inbox/v2/store";
import { NANDHINI_ID } from "@/config/pages/neo/mock-recon";
import {
  GUIDE_PROMPT,
  RECON_EXPLAINER_STEPS,
  RECON_WELCOME,
} from "@/config/pages/neo/onboarding";
import {
  closeReconWelcome,
  openReconWelcome,
  startGuidedRun,
  useReconOnboarding,
} from "@/hooks/pages/neo/use-recon-onboarding";
import { useStartChat } from "@/hooks/pages/neo/use-start-chat";
import { track } from "@/utils/pages/neo/recon-events";
import { NeoStar } from "@/components/icons";
import { cn } from "@/lib/utils";

/** prefers-reduced-motion, read after mount so the server render matches. */
const useReducedMotion = () => {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const q = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(q.matches);
    const on = (e: MediaQueryListEvent) => setReduced(e.matches);
    q.addEventListener("change", on);
    return () => q.removeEventListener("change", on);
  }, []);
  return reduced;
};

/**
 * Tesseract preview on the left, launch copy on the right. Captions follow
 * video time; reduced motion gets a poster and a complete text description.
 * The sample waits for the switch to Nandhini before starting its chat.
 */
const ReconWelcome = () => {
  const { open, seen } = useReconOnboarding();
  const { company } = useStore();
  const chat = useStartChat();
  const reduced = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const [run, setRun] = useState(0);
  const [beat, setBeat] = useState(0);
  const video = useRef<HTMLVideoElement>(null);
  const still = reduced;

  // A request waiting for the switch to Nandhini Deluxe to land: a run
  // started before it would belong to the old company and stop itself.
  const [pending, setPending] = useState<string | null>(null);
  useEffect(() => {
    if (!pending || company !== NANDHINI_ID) return;
    setPending(null);
    void chat(pending);
  }, [pending, company]);

  // Every load of the prototype is a first visit.
  useEffect(() => {
    if (!seen) openReconWelcome();
  }, [seen]);
  useEffect(() => {
    if (!open) return;
    setPaused(false);
    setRun((r) => r + 1);
    track("recon_onboarding_shown");
  }, [open]);
  useEffect(() => {
    const el = video.current;
    if (!el || !open) return;
    if (paused || reduced) el.pause();
    else void el.play().catch(() => setPaused(true));
  }, [open, paused, reduced, run]);

  const start = () => {
    if (company !== NANDHINI_ID)
      configure({ company: NANDHINI_ID, queue: [], queueFrom: undefined });
    startGuidedRun();
    track("recon_onboarding_sample_started");
    setPending(GUIDE_PROMPT);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && closeReconWelcome()}>
      <DialogContent
        onOpenAutoFocus={(event) => event.preventDefault()}
        className={cn(
          "max-h-[calc(100vh-32px)] w-[calc(100vw-32px)] max-w-[1180px] gap-0 overflow-y-auto overscroll-contain rounded-[20px] border border-pi-line bg-background p-0 shadow-popover-shadow outline-none",
          "[&>button]:right-2 [&>button]:top-2 [&>button]:z-10 [&>button]:grid [&>button]:h-8 [&>button]:w-8 [&>button]:place-items-center [&>button]:rounded-full [&>button]:bg-background [&>button]:text-pi-body [&>button]:opacity-100 [&>button]:shadow-contact [&>button:hover]:text-pi-ink [&>button]:data-[state=open]:bg-background"
        )}
      >
        <div className="grid md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          {/* Who Neo is, and the way in. */}
          <div className="order-2 flex flex-col justify-center px-7 py-9 md:px-10 md:py-10">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-pi-brand-border bg-pi-brand-tint px-3 py-1 text-[12px] font-semibold leading-4 text-pi-brand">
              <span
                aria-hidden
                className="h-1.5 w-1.5 rounded-full bg-pi-brand"
              />
              {RECON_WELCOME.badge}
            </span>
            <DialogTitle className="mt-6 text-pi-ink">
              <span className="flex items-center gap-3.5 text-[44px] font-semibold leading-[1.05] tracking-[-0.04em] md:text-[48px]">
                <span
                  aria-hidden
                  className="neo-home-emblem grid h-12 w-12 flex-none place-items-center rounded-[15px] text-pi-brand"
                >
                  <NeoStar className="h-6 w-6" />
                </span>
                {RECON_WELCOME.title}
              </span>
              <span className="mt-2 block text-[21px] font-medium leading-[1.3] tracking-[-0.02em] md:text-[23px]">
                {RECON_WELCOME.subtitle}
              </span>
            </DialogTitle>
            <DialogDescription className="mt-3 max-w-[360px] text-[14px] leading-[22px] text-pi-body">
              {RECON_WELCOME.body}
            </DialogDescription>
            <section
              aria-label={RECON_WELCOME.launch}
              className="mt-7 rounded-2xl border border-[#E4E7F4] bg-[#F5F6FC] p-5"
            >
              <div className="flex items-center gap-2.5">
                <Files
                  aria-hidden="true"
                  className="h-5 w-5 text-pi-brand"
                  strokeWidth={1.75}
                />
                <p className="text-[11px] font-semibold uppercase leading-4 tracking-[0.1em] text-pi-brand">
                  {RECON_WELCOME.launchLabel}
                </p>
              </div>
              <h3 className="mt-3 text-[20px] font-semibold leading-[26px] tracking-[-0.02em] text-pi-ink">
                {RECON_WELCOME.launch}
              </h3>
              <p className="mt-1.5 max-w-[380px] text-[14px] leading-[22px] text-pi-body">
                {RECON_WELCOME.detail}
              </p>
            </section>
            <div className="mt-6 flex flex-col items-start gap-2">
              <button
                type="button"
                onClick={start}
                className="group inline-flex h-12 w-full items-center justify-between gap-3 rounded-xl bg-primary px-5 text-[14px] font-semibold text-primary-foreground shadow-pi-2 transition-[background-color,transform] hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border active:translate-y-px"
              >
                {RECON_WELCOME.primary}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>

          {/* The native Tesseract render and playback controls. */}
          <div className="order-1 flex min-w-0 flex-col justify-center overflow-hidden bg-[#10162B]">
            <div className="flex items-center px-6 py-4 text-[12px]">
              <span className="font-semibold text-[#CAD3FF]">
                How reconciliation works
              </span>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {still ? (
              <img
                src={RECON_WELCOME.media.poster}
                alt={RECON_WELCOME.media.alt}
                width={1200}
                height={900}
                className="block aspect-[4/3] w-full"
              />
            ) : (
              <video
                ref={video}
                key={run}
                src={RECON_WELCOME.media.video}
                poster={RECON_WELCOME.media.poster}
                aria-label={RECON_WELCOME.media.alt}
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                width={1200}
                height={900}
                onTimeUpdate={(event) => {
                  const time = event.currentTarget.currentTime;
                  setBeat(
                    Math.max(
                      0,
                      RECON_EXPLAINER_STEPS.filter((step) => time >= step.start)
                        .length - 1
                    )
                  );
                }}
                className="block aspect-[4/3] w-full"
              />
            )}
            {still ? (
              <div className="px-7 pb-6 pt-1">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-[13px] font-semibold leading-5 text-[#F7F8FF]">
                    {RECON_WELCOME.media.listTitle}
                  </p>
                </div>
                <ol className="grid gap-1.5">
                  {RECON_EXPLAINER_STEPS.map((s, i) => (
                    <li
                      key={s.title}
                      className="flex gap-3 text-[14px] leading-5 text-[#CBD3E6]"
                    >
                      <span className="w-3 flex-none tabular-nums text-[#A6B2FF]">
                        {i + 1}
                      </span>
                      {s.title}
                    </li>
                  ))}
                </ol>
              </div>
            ) : (
              <div className="flex items-center gap-3 px-7 pb-5 pt-2">
                <span
                  aria-hidden
                  className="h-1.5 w-1.5 flex-none rounded-full bg-[#A6B2FF]"
                />
                <p
                  key={beat}
                  className="min-w-0 flex-1 text-[12px] font-medium leading-5 text-[#CBD3E6]"
                >
                  {RECON_EXPLAINER_STEPS[beat].title}
                </p>
                <ol
                  aria-label="Preview progress"
                  className="flex flex-none items-center gap-1.5"
                >
                  {RECON_EXPLAINER_STEPS.map((s, i) => (
                    <li
                      key={s.title}
                      aria-current={i === beat ? "step" : undefined}
                      className={cn(
                        "h-1.5 rounded-full transition-[width,background-color] duration-300",
                        i === beat ? "w-5 bg-[#A6B2FF]" : "w-1.5 bg-[#465374]"
                      )}
                    >
                      <span className="sr-only">{s.title}</span>
                    </li>
                  ))}
                </ol>
                {!reduced && (
                  <button
                    type="button"
                    onClick={() => setPaused((value) => !value)}
                    aria-label={
                      paused
                        ? RECON_WELCOME.media.play
                        : RECON_WELCOME.media.pause
                    }
                    aria-pressed={paused}
                    className="grid h-8 w-8 flex-none place-items-center rounded-full text-[#CBD3E6] transition-colors hover:bg-[#303F70] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A6B2FF]"
                  >
                    {paused ? (
                      <Play className="h-3.5 w-3.5 fill-current" />
                    ) : (
                      <Pause className="h-3.5 w-3.5 fill-current" />
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReconWelcome;
