import type { TourStep } from "@/types/pages/guide";
import { asset } from "@/lib/base-path";

/** Launch copy and the simplified product animation's media-time captions.
 * Editable source: ../Neo Launch Motion/Product happy flow/Neo-Happy-Flow.tsrct.
 */
export const RECON_WELCOME = {
  badge: "New in AI Accountant",
  title: "Neo",
  subtitle: "Your accounting assistant",
  body: "Ask Neo in chat. Neo does the work. You check it.",
  launchLabel: "First job",
  launch: "Three-way reconciliation",
  detail:
    "Neo checks every payment in your bank statement against your payout reports and books. Done in minutes, not hours.",
  primary: "Try it now",
  media: {
    video: asset("/onboarding/neo-happy-flow.mp4"),
    poster: asset("/onboarding/neo-happy-flow-poster.png"),
    alt: "A simplified animation of Neo: type “Match September payouts with my bank and books”, Neo checks the bank statement, payout reports and accounting records, then opens a sample reconciliation report. Happy-path illustration with setup and exception handling omitted.",
    pause: "Pause preview",
    play: "Play preview",
    listTitle: "What the preview shows",
  },
};

/** Chapter boundaries match the authored Tesseract timeline, in seconds. */
export const RECON_EXPLAINER_STEPS = [
  { title: "Ask Neo to check your month.", start: 0 },
  { title: "Neo compares your bank, payouts and books.", start: 4.8 },
  { title: "Open the report and see what's off.", start: 10.1 },
];

/**
 * Three hints for the first sample run, anchored on the report file.
 * Copy is written for a first-time user (23 Oct 2026): short sentences,
 * everyday words, one idea per card.
 */
export const RECON_TOUR: TourStep[] = [
  {
    anchor: "recon-report",
    placement: "left",
    title: "This is your report",
    body: "It's an Excel file. It shows what matched and what didn't.",
  },
  {
    anchor: "recon-report",
    placement: "left",
    title: "Fill in the yellow cells",
    body: "For each problem, choose what to do and add a short reason. Click Apply. Neo makes a new version.",
  },
  {
    title: "Or just type it",
    body: "For example: “wait on E1, payout comes 3 Oct”. Your old version stays saved.",
  },
];

export const RECON_COMPLETION =
  "All done. Your month is checked and the report is saved. Nothing in your books was changed. Next, try it with your own files.";

/**
 * The guided first reconciliation (22 Oct 2026): what "Try it now"
 * opens. Five steps, each with one note from the guide in the chat at the
 * moment it matters; the rail above the chat shows where you are.
 */
export const GUIDE_PROMPT = "Guide me through my first reconciliation";
export const GUIDE_SAMPLE_PROMPT = "Reconcile September with the sample files";

export const GUIDE_STEPS = [
  { n: 1, label: "Pick files" },
  { n: 2, label: "Check files" },
  { n: 3, label: "Match" },
  { n: 4, label: "Decide" },
  { n: 5, label: "See report" },
] as const;

export const GUIDE_COPY = {
  rail: "Your first reconciliation",
  exit: "Exit guide",
  done: "You finished your first reconciliation",
  again: "Try with my files",
  intro: {
    title: "Let's check one month together",
    body: "Neo checks that the money in your bank matches your payouts and your books. We'll go step by step. First, pick which files to use.",
    kind: "choice" as const,
    anchor: "neo-composer",
    placement: "top" as const,
  },
  uploadNote: {
    title: "Add your files here",
    body: "Add your bank statement and payout reports for one month. Your books are already connected. Neo only reads your files. It never changes your books.",
    kind: "upload" as const,
    anchor: "neo-attach-button",
    placement: "top" as const,
  },
  choice: {
    sample: {
      label: "Use sample files",
      title: "A sample restaurant · September 2026",
      body: "Ready-made files, so you can see how it works. Takes about a minute.",
      tag: "Recommended",
    },
    own: {
      label: "Use my own files",
      title: "Your bank statement and payout reports",
      body: "One month, as CSV files. Your books are already connected.",
    },
  },
  upload: {
    title: "Add files for one month",
    needs: [
      { label: "Bank statement", hint: "Download it as CSV from net banking" },
      {
        label: "Payout reports",
        hint: "CSV from your card, UPI, Zomato or Swiggy account",
      },
      {
        label: "Your books",
        hint: "Already connected. Nothing to add",
        auto: true,
      },
    ],
    choose: "Choose files",
    fallback: "Use sample files instead",
    note: "Neo only reads these files. It never changes your books.",
  },
  notes: {
    check: {
      title: "Neo is reading your files",
      body: "It checks that every row has a date, an amount and a reference. Click this line to see what it's doing.",
      anchor: "neo-reasoning-live",
      placement: "bottom" as const,
      holds: true,
    },
    rejected: {
      title: "Some rows can't be read",
      body: "Neo won't guess. Add the fixed file (best), or skip these rows. If you skip, the report is marked Partial.",
      anchor: "neo-sheet",
      placement: "top" as const,
    },
    match: {
      title: "Neo is matching",
      body: "A payment is matched only when your bank, the payout report and your books all show the same amount. Anything else comes to you.",
      anchor: "neo-reasoning-live",
      placement: "bottom" as const,
      holds: true,
    },
    decide: {
      title: "Your turn",
      body: "Neo found a few payments that don't match. It has picked an answer for each. Change it if you need to, then submit.",
      anchor: "neo-sheet",
      placement: "top" as const,
    },
    review: {
      title: "Your report is ready",
      body: "Open it to see the results. To fix a problem, fill in the yellow cells, or just tell Neo in the chat.",
      anchor: "recon-report",
      placement: "left" as const,
      final: true,
    },
  },
};
