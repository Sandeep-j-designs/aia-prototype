import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowRight,
  Check,
  CornerDownLeft,
  Database,
  FileSpreadsheet,
  Landmark,
  Upload,
  X,
} from "lucide-react";
import { place, useAnchorBox } from "@/components/guide/tour-popover";
import { useLiveMessage } from "@/components/neo/common/thread";
import { NeoStar } from "@/components/icons";
import { useNeo } from "@/hooks/pages/neo/use-neo";
import {
  GUIDE_COPY,
  GUIDE_SAMPLE_PROMPT,
  GUIDE_STEPS,
} from "@/config/pages/neo/onboarding";
import {
  dismissCoach,
  exitGuide,
  useReconOnboarding,
} from "@/hooks/pages/neo/use-recon-onboarding";
import { cn } from "@/lib/utils";

/**
 * The guided first reconciliation, as an annotated walkthrough (23 Oct
 * 2026). "Try it now" on Meet Neo starts a real run in the chat;
 * the guide sits on top of it, never in it. At each step one annotation
 * rings the part of the screen that matters and says what is happening
 * there. Where the step is only Neo working, Neo holds until Continue;
 * where it is a question, answering it moves the guide on.
 *
 * The card is light and reads like a ledger slip: a tinted head with the
 * guide's name and its five steps, a body with the step's numeral in its
 * own ruled column beside the words, and a foot with the way on. Brand
 * blue marks only the step, the progress and the one button.
 */

/** Opens the prompt box's file dialog: choosing files starts the run. */
export const chooseFiles = () => document.getElementById("neo-attach")?.click();

const WIDTH = 340;
const TOTAL = GUIDE_STEPS.length;

type Box = NonNullable<ReturnType<typeof useAnchorBox>>;

/**
 * The pointer from the card to what it annotates, on the facing edge, in the
 * colour of the band it leaves from: the head above, the foot below.
 */
const Pointer = ({
  box,
  card,
}: {
  box: Box;
  card: { top: number; left: number; height: number; width: number };
}) => {
  const cx = box.left + box.width / 2;
  const cy = box.top + box.height / 2;
  const style: React.CSSProperties = {};
  let rotate = 45;
  let band = "var(--background-color, #fff)";
  if (card.top >= box.top + box.height - 1) {
    style.top = -6;
    style.left = Math.min(card.width - 26, Math.max(20, cx - card.left - 6));
    band = "var(--pi-head-bg)";
  } else if (card.top + card.height <= box.top + 1) {
    style.bottom = -6;
    style.left = Math.min(card.width - 26, Math.max(20, cx - card.left - 6));
    rotate = 225;
    band = "var(--pi-fill)";
  } else if (card.left >= box.left + box.width - 1) {
    style.left = -6;
    style.top = Math.min(card.height - 26, Math.max(20, cy - card.top - 6));
    rotate = -45;
  } else {
    style.right = -6;
    style.top = Math.min(card.height - 26, Math.max(20, cy - card.top - 6));
    rotate = 135;
  }
  return (
    <span
      aria-hidden
      style={{ ...style, transform: `rotate(${rotate}deg)`, background: band }}
      className="absolute h-3 w-3 rounded-tl-[3px] border-l border-t border-pi-line bg-background"
    />
  );
};

/** The two ways in, as the first annotation's choice. */
const Choice = ({ onPick }: { onPick: (id: string) => void }) => {
  const { sample, own } = GUIDE_COPY.choice;
  const rows = [
    { id: "sample", icon: Database, ...sample },
    { id: "own", icon: Upload, tag: undefined, ...own },
  ];
  return (
    <div className="mt-3.5 flex flex-col gap-2">
      {rows.map((r) => {
        const lead = !!r.tag;
        return (
          <button
            key={r.id}
            type="button"
            onClick={() => onPick(r.id)}
            className={cn(
              "group flex items-center gap-3 rounded-lg border p-2.5 text-left transition-[background-color,border-color,transform] duration-150 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border",
              lead
                ? "border-pi-brand-border bg-pi-brand-tint hover:border-pi-brand"
                : "border-pi-line bg-background hover:border-pi-line-2 hover:bg-pi-fill"
            )}
          >
            <span
              className={cn(
                "grid h-8 w-8 flex-none place-items-center rounded-md",
                lead
                  ? "bg-background text-pi-brand shadow-contact"
                  : "bg-pi-fill text-pi-body"
              )}
            >
              <r.icon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-[13px] font-semibold leading-[18px] text-pi-ink">
                {r.label}
                {lead && (
                  <span className="text-[11px] font-medium text-pi-brand">
                    · {r.tag}
                  </span>
                )}
              </span>
              <span className="mt-0.5 block truncate text-[12px] leading-4 text-pi-body">
                {r.title}
              </span>
            </span>
            <ArrowRight
              className={cn(
                "h-4 w-4 flex-none transition-transform duration-150 group-hover:translate-x-0.5",
                lead ? "text-pi-brand" : "text-pi-faint"
              )}
            />
          </button>
        );
      })}
    </div>
  );
};

/** What your own files are, beside the paperclip that adds them. */
const Needs = () => {
  const icons = [Landmark, FileSpreadsheet, Database];
  return (
    <ul className="mt-3 divide-y divide-pi-line overflow-hidden rounded-lg border border-pi-line">
      {GUIDE_COPY.upload.needs.map((n, i) => {
        const Icon = icons[i];
        const auto = "auto" in n && n.auto;
        return (
          <li
            key={n.label}
            className="flex items-center gap-2.5 px-3 py-2 text-[12px] leading-4"
          >
            <Icon className="h-3.5 w-3.5 flex-none text-pi-body" />
            <span className="font-medium text-pi-ink">{n.label}</span>
            <span
              className={cn(
                "ml-auto flex items-center gap-1",
                auto ? "font-medium text-pi-success" : "text-pi-faint"
              )}
            >
              {auto ? (
                <>
                  <Check className="h-3 w-3" strokeWidth={2.5} />
                  Connected
                </>
              ) : (
                "CSV"
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
};

const primaryBtn =
  "flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md border border-pi-btn-primary-edge bg-pi-btn-fill px-3 text-[12.5px] font-semibold text-white shadow-contact transition-[background-color,transform] duration-150 hover:bg-pi-btn-fill-hover active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-1";
const secondaryBtn =
  "flex h-8 items-center whitespace-nowrap rounded-md border border-pi-line-2 bg-background px-3 text-[12.5px] font-medium text-pi-ink shadow-contact transition-colors duration-150 hover:bg-pi-fill focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border";

const GuideCoach = ({ onPrompt }: { onPrompt: (p: string) => void }) => {
  const { guided, coach, coachSeen } = useReconOnboarding();
  const neo = useNeo();
  const live = useLiveMessage(neo);
  const shown = guided && !!coach && !coachSeen;
  const box = useAnchorBox(shown ? coach?.anchor : undefined);
  const card = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(200);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useLayoutEffect(() => {
    const h = card.current?.offsetHeight;
    if (h && h !== height) setHeight(h);
  });

  // Enter moves on from a note that only needs reading.
  const advance = shown && coach && !coach.kind && !coach.final;
  useEffect(() => {
    if (!advance) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.key !== "Enter" || t?.closest("textarea,input,[contenteditable]"))
        return;
      e.preventDefault();
      dismissCoach();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advance]);

  // A card with an anchor waits until the anchor is measured, so it lands
  // in place instead of flashing in the middle and jumping. If the anchor
  // never turns up, it centres after a moment.
  const [late, setLate] = useState(false);
  useEffect(() => {
    setLate(false);
    if (!shown || !coach?.anchor) return;
    const t = window.setTimeout(() => setLate(true), 800);
    return () => window.clearTimeout(t);
  }, [shown, coach?.anchor, coach?.title]);

  if (!mounted || !shown || !coach) return null;
  if (coach.anchor && !box && !late) return null;

  const width = Math.min(
    coach.kind === "choice" ? 380 : WIDTH,
    window.innerWidth - 32
  );
  const pos = box
    ? place(box, height, coach.placement, width)
    : {
        top: Math.max(16, window.innerHeight / 2 - height / 2),
        left: Math.max(16, window.innerWidth / 2 - width / 2),
      };
  const label = GUIDE_STEPS.find((s) => s.n === coach.step)?.label;
  const choice =
    coach.kind === "choice" && live?.card?.kind === "guide-choice"
      ? live
      : undefined;
  // The spotlight follows the shape it circles: the prompt box is a pill.
  const radius = coach.anchor === "neo-composer" ? 32 : 12;
  const pad = 6;

  return createPortal(
    <>
      {box ? (
        <div
          aria-hidden
          key={coach.anchor}
          className="neo-fade-in pointer-events-none fixed left-0 top-0 z-[65]"
          style={{
            transform: `translate(${box.left - pad}px, ${box.top - pad}px)`,
            width: box.width + pad * 2,
            height: box.height + pad * 2,
            borderRadius: radius,
            boxShadow:
              "0 0 0 2px var(--pi-brand), 0 0 0 9999px rgb(18 18 18 / 0.1)",
          }}
        >
          <span
            className="neo-spot-pulse absolute inset-0"
            style={{ borderRadius: radius }}
          />
        </div>
      ) : (
        <div
          aria-hidden
          className="neo-fade-in fixed inset-0 z-[64] bg-[rgb(18_18_18/0.1)]"
        />
      )}
      <div
        ref={card}
        role="dialog"
        aria-label={`Guide: ${coach.title}`}
        key={coach.title}
        className="fixed z-[70] rounded-xl border border-pi-line bg-background shadow-[0_1px_2px_rgb(18_18_18/0.06),0_16px_40px_-12px_rgb(40_48_87/0.28)] duration-300 ease-out animate-in fade-in-0 slide-in-from-bottom-2 motion-reduce:animate-none"
        style={{ top: pos.top, left: pos.left, width }}
      >
        {box && (
          <Pointer
            box={box}
            card={{ top: pos.top, left: pos.left, height, width }}
          />
        )}

        {/* Head: whose voice this is, and where you are in five steps. */}
        <div className="flex items-center gap-2 rounded-t-xl border-b border-pi-line bg-pi-head-bg px-3.5 py-2.5">
          <span className="grid h-5 w-5 flex-none place-items-center rounded-[5px] bg-pi-brand text-white">
            <NeoStar className="h-3 w-3" />
          </span>
          <span className="min-w-0 flex-1 truncate text-[12px] font-semibold leading-4 text-pi-ink-2">
            {GUIDE_COPY.rail}
          </span>
          <ol
            aria-label={`Step ${coach.step} of ${TOTAL}`}
            className="flex gap-1"
          >
            {GUIDE_STEPS.map((s) => (
              <li
                key={s.n}
                className={cn(
                  "h-1.5 rounded-full transition-[width,background-color] duration-300",
                  s.n === coach.step
                    ? "w-4 bg-pi-brand"
                    : s.n < coach.step
                      ? "w-1.5 bg-pi-brand"
                      : "w-1.5 bg-pi-line-2"
                )}
              />
            ))}
          </ol>
          <button
            type="button"
            onClick={exitGuide}
            aria-label={GUIDE_COPY.exit}
            className="-mr-1 ml-1 grid h-6 w-6 place-items-center rounded-md text-pi-faint transition-colors hover:bg-background hover:text-pi-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Body: the step's numeral in its own ruled column, then the words. */}
        <div className="flex gap-3.5 px-3.5 pb-3.5 pt-3">
          <div className="flex w-11 flex-none flex-col items-start border-r border-pi-line pr-3">
            <span className="text-[26px] font-semibold leading-7 tabular-nums tracking-[-0.03em] text-pi-brand">
              {String(coach.step).padStart(2, "0")}
            </span>
            <span className="mt-1 whitespace-nowrap text-[10.5px] font-medium tabular-nums leading-3 text-pi-faint">
              of {String(TOTAL).padStart(2, "0")}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase leading-4 tracking-[0.07em] text-pi-faint">
              {label}
            </p>
            <h2 className="mt-1 text-[14.5px] font-semibold leading-5 tracking-[-0.01em] text-pi-ink">
              {coach.title}
            </h2>
            <p className="mt-1 text-[12.5px] leading-[19px] text-pi-body">
              {coach.body}
            </p>
            {choice && <Choice onPick={(id) => neo.answer(choice.id, id)} />}
            {coach.kind === "upload" && <Needs />}
          </div>
        </div>

        {/* Foot: the way on. */}
        {!choice && (
          <div className="flex items-center gap-2 rounded-b-xl border-t border-pi-line bg-pi-fill px-3.5 py-2.5">
            {!coach.final && coach.kind !== "upload" && (
              <button
                type="button"
                onClick={exitGuide}
                className="rounded-sm text-[12px] font-medium text-pi-body transition-colors hover:text-pi-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
              >
                {GUIDE_COPY.exit}
              </button>
            )}
            <span className="flex-1" />
            {coach.kind === "upload" ? (
              <>
                <button
                  type="button"
                  className={secondaryBtn}
                  onClick={() => onPrompt(GUIDE_SAMPLE_PROMPT)}
                >
                  Use sample
                </button>
                <button
                  type="button"
                  className={primaryBtn}
                  onClick={chooseFiles}
                >
                  <Upload className="h-3.5 w-3.5" />
                  {GUIDE_COPY.upload.choose}
                </button>
              </>
            ) : coach.final ? (
              <>
                <button
                  type="button"
                  className={secondaryBtn}
                  onClick={chooseFiles}
                >
                  {GUIDE_COPY.again}
                </button>
                <button
                  type="button"
                  className={primaryBtn}
                  onClick={exitGuide}
                >
                  Finish
                </button>
              </>
            ) : (
              <button
                type="button"
                className={primaryBtn}
                onClick={dismissCoach}
              >
                {coach.holds ? "Continue" : "Got it"}
                <CornerDownLeft className="h-3 w-3 opacity-70" />
              </button>
            )}
          </div>
        )}
      </div>
    </>,
    document.body
  );
};

export default GuideCoach;
