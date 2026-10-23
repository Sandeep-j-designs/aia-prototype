import type { TourStep } from "@/types/pages/guide";

/** Launch copy and the simplified product animation's media-time captions.
 * Editable source: ../Neo Launch Motion/Product happy flow/Neo-Happy-Flow.tsrct.
 */
export const RECON_WELCOME = {
  badge: "New in AI Accountant",
  title: "Neo",
  subtitle: "Your accounting assistant",
  body: "Hand off the work in chat. You just review it.",
  launchLabel: "First job",
  launch: "Three-way reconciliation",
  detail:
    "Your bank statements, payout reports and accounting records, matched in minutes instead of hours.",
  primary: "Try reconciliation",
  media: {
    video: "/onboarding/neo-happy-flow.mp4",
    poster: "/onboarding/neo-happy-flow-poster.png",
    alt: "A simplified animation of Neo: type “Match September payouts with my bank and books”, Neo checks the bank statement, payout reports and accounting records, then opens a sample reconciliation report. Happy-path illustration with setup and exception handling omitted.",
    pause: "Pause preview",
    play: "Play preview",
    listTitle: "What the preview shows",
  },
};

/** Chapter boundaries match the authored Tesseract timeline, in seconds. */
export const RECON_EXPLAINER_STEPS = [
  { title: "Ask Neo to reconcile your records.", start: 0 },
  { title: "Neo checks the three records.", start: 4.8 },
  { title: "Open the report and review the results.", start: 10.1 },
];

/** Three hints for the first sample run, anchored on the report file. */
export const RECON_TOUR: TourStep[] = [
  {
    anchor: "recon-report",
    placement: "left",
    title: "The report is a workbook",
    body: "Summary, exceptions, match groups and every row, with the rule behind each. It's the same file you download.",
  },
  {
    anchor: "recon-report",
    placement: "left",
    title: "Change the yellow cells",
    body: "On Exceptions, pick an Action and write a Reason, here or in Excel. Apply, and Neo runs the reconciliation again as a new version.",
  },
  {
    title: "Or tell Neo",
    body: "Type “defer E1, payout file due 3 Oct”. The old version is kept.",
  },
];

export const RECON_COMPLETION =
  "Done: sources checked, matches proven, exceptions decided, reviewed and exported. Nothing was changed in your accounting records. Run it on your own data next.";

/**
 * The guided first reconciliation (22 Oct 2026): what "Try reconciliation"
 * opens. Five steps, each with one note from the guide in the chat at the
 * moment it matters; the rail above the chat shows where you are.
 */
export const GUIDE_PROMPT = "Guide me through my first reconciliation";
export const GUIDE_SAMPLE_PROMPT = "Reconcile September with the sample files";

export const GUIDE_STEPS = [
  { n: 1, label: "Choose data" },
  { n: 2, label: "Check files" },
  { n: 3, label: "Match" },
  { n: 4, label: "Decide" },
  { n: 5, label: "Review" },
] as const;

export const GUIDE_COPY = {
  rail: "Guided reconciliation",
  exit: "Exit guide",
  done: "You've finished your first reconciliation",
  again: "Try your own files",
  intro: {
    title: "Let's reconcile one month together",
    body: "Neo matches three records: your bank statement, the payout reports from card, UPI and delivery apps, and your accounting records. I'll point out each part as it happens. What should we use?",
    kind: "choice" as const,
    anchor: "neo-composer",
    placement: "top" as const,
  },
  uploadNote: {
    title: "Add your files here",
    body: "Attach one month's bank statement and payout reports as CSV. Your accounting records are already connected, so there's nothing to upload for them. Neo only reads your files; it never changes your books.",
    kind: "upload" as const,
    anchor: "neo-attach-button",
    placement: "top" as const,
  },
  choice: {
    sample: {
      label: "Use sample data",
      title: "Nandhini Deluxe · September 2026",
      body: "A restaurant's real-looking month: 1 bank statement, 4 payout reports and its accounting records. Takes about a minute.",
      tag: "Recommended",
    },
    own: {
      label: "Upload my own files",
      title: "Your bank statement and payout reports",
      body: "CSV exports for one month. Your accounting records are already connected.",
    },
  },
  upload: {
    title: "Add your files for one month",
    needs: [
      { label: "Bank statement", hint: "CSV from your bank's net banking" },
      {
        label: "Payout reports",
        hint: "CSV from card, UPI, Zomato or Swiggy dashboards",
      },
      { label: "Accounting records", hint: "Already connected. Nothing to upload", auto: true },
    ],
    choose: "Choose files",
    fallback: "Use sample data instead",
    note: "Neo only reads these files. It never changes your books.",
  },
  notes: {
    check: {
      title: "Neo checks every row first",
      body: "This line is Neo at work. Before matching anything it makes sure each row has a date, an amount and a reference it can read. Click it any time to see the steps.",
      anchor: "neo-reasoning-live",
      placement: "bottom" as const,
      holds: true,
    },
    rejected: {
      title: "Your call: some rows can't be read",
      body: "Neo won't guess what a broken row says. Load the corrected export (recommended), or run without those rows and the result is marked Partial.",
      anchor: "neo-sheet",
      placement: "top" as const,
    },
    match: {
      title: "Now Neo matches",
      body: "A payout counts as matched only when the bank, the payout report and your accounting records agree on the amount and the reference. Anything short of that becomes an exception for you.",
      anchor: "neo-reasoning-live",
      placement: "bottom" as const,
      holds: true,
    },
    decide: {
      title: "Now Neo needs you",
      body: "These exceptions need a judgement only you can make. Neo has picked the answer it recommends; change it if you know better, then submit.",
      anchor: "neo-sheet",
      placement: "top" as const,
    },
    review: {
      title: "Your report is ready",
      body: "The full result as a workbook. On the Exceptions sheet, pick an action in the yellow cells, or just tell Neo in the chat, like “defer E1, payout due 3 Oct”.",
      anchor: "recon-report",
      placement: "left" as const,
      final: true,
    },
  },
};
