import { useMemo, useSyncExternalStore } from "react";
import {
  mockAutoApproveSettings,
  mockTrustPatterns,
} from "@/config/pages/inbox/mock-trust";
import { logActivity } from "@/hooks/pages/inbox/use-activity";
import type {
  AutoApproveSettings,
  TrustPattern,
  TrustStatus,
} from "@/types/pages/inbox/automation";

/**
 * Auto-approve's store: each organisation's switch and thresholds, and the
 * vendor + ledger patterns with the evidence behind them.
 *
 * Module-level, like the other module stores, so the Inbox (which approves
 * on this evidence), the review screen (which records edits against it) and
 * Automation › Rules & learning (which shows and governs it) share one copy.
 * In memory, reseeded on load.
 *
 * DEV: production replaces the seed with GET /api/automation/trust and
 * GET /api/automation/auto-approve, and the actions map 1:1:
 *   setSettings            → PUT  /api/automation/auto-approve
 *   pausePattern / resume  → POST /api/automation/trust/:id/pause|resume
 *   recordApproval         → server-side, on POST /api/inbox/:id/approve
 */

type State = { settings: AutoApproveSettings[]; patterns: TrustPattern[] };

const AI = { kind: "ai" as const, name: "Neo · Auto-approve" };

let state: State = { settings: [], patterns: [] };
let seeded = false;
const listeners = new Set<() => void>();

const ensureSeeded = () => {
  if (seeded || typeof window === "undefined") return;
  seeded = true;
  // DEV: replace with the two GETs above.
  state = {
    settings: mockAutoApproveSettings(),
    patterns: mockTrustPatterns(),
  };
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

const DEFAULTS = (company: string): AutoApproveSettings => ({
  company,
  enabled: false,
  minApprovals: 5,
  amountBand: 2,
});

export const settingsFor = (company: string) => {
  ensureSeeded();
  return state.settings.find((s) => s.company === company) ?? DEFAULTS(company);
};

/** Where a pattern stands, from its evidence and the organisation's settings. */
export const trustStatus = (
  pattern: TrustPattern,
  settings: AutoApproveSettings
): TrustStatus =>
  pattern.paused
    ? "paused"
    : pattern.streak >= settings.minApprovals
      ? "trusted"
      : pattern.edits > 0 && pattern.lastEditAt && pattern.streak === 0
        ? "edited"
        : "building";

const rupees = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

/**
 * The evidence as a sentence, never a score: "6 of 6 past Airtel bills to
 * Internet Charges, no edits".
 */
export const evidenceFor = (pattern: TrustPattern) => {
  const short = shortVendor(pattern.vendor);
  if (!pattern.edits)
    return `${pattern.approvals} of ${pattern.approvals} past ${short} bills to ${pattern.ledger}, no edits`;
  return `${pattern.streak} in a row to ${pattern.ledger} since the last edit · ${pattern.approvals} approved, ${pattern.edits} edited`;
};

/** The evidence for a table that already names the vendor and ledger. */
export const evidenceShort = (pattern: TrustPattern) =>
  pattern.edits
    ? `${pattern.streak} in a row since an edit · ${pattern.edits} edited of ${pattern.approvals}`
    : `${pattern.approvals} of ${pattern.approvals} approved, no edits`;

const day = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

/** One line on why a pattern is where it is, for the Rules table and a held bill. */
export const statusLine = (
  pattern: TrustPattern,
  settings: AutoApproveSettings
) => {
  const status = trustStatus(pattern, settings);
  if (status === "paused") return `Paused · ${pattern.paused!.reason}`;
  if (status === "trusted") return "Trusted";
  if (status === "edited") return `Paused · edited ${day(pattern.lastEditAt!)}`;
  return `Building · ${pattern.streak} of ${settings.minApprovals}`;
};

const norm = (s: string) => s.trim().toLowerCase();

/** What an accountant calls a vendor in conversation: "Airtel", "BESCOM". */
const SHORT: [RegExp, string][] = [
  [/\bairtel\b/, "Airtel"],
  [/bangalore electricity supply|\bbescom\b/, "BESCOM"],
  [/maharashtra state electricity|\bmsedcl\b/, "MSEDCL"],
  [/sri durga filling/, "Sri Durga"],
];
export const shortVendor = (vendor: string) =>
  SHORT.find(([pattern]) => pattern.test(norm(vendor)))?.[1] ??
  vendor.split(" ")[0];

/** The pattern a bill would be judged against: same vendor, same single ledger. */
export const patternFor = (company: string, vendor: string, ledger: string) => {
  ensureSeeded();
  return state.patterns.find(
    (p) =>
      p.company === company &&
      norm(p.vendor) === norm(vendor) &&
      norm(p.ledger) === norm(ledger)
  );
};

/**
 * Whether a bill meets the evidence. Returns the reason it does ("evidence")
 * or the reason it was held, or null when the vendor has no trusted pattern
 * at all (an ordinary bill, nothing to say).
 */
export const judge = (
  company: string,
  vendor: string,
  ledgers: string[],
  amount: number
):
  | { ok: true; pattern: TrustPattern; evidence: string }
  | {
      ok: false;
      pattern: TrustPattern;
      reason: string;
    }
  | null => {
  const settings = settingsFor(company);
  if (!settings.enabled || !vendor) return null;
  const distinct = Array.from(new Set(ledgers.filter(Boolean)));
  if (distinct.length !== 1) return null;
  const pattern = patternFor(company, vendor, distinct[0]);
  if (!pattern || trustStatus(pattern, settings) !== "trusted") return null;
  const ratio = amount / pattern.usualAmount;
  if (ratio > settings.amountBand || ratio < 1 / settings.amountBand) {
    const times =
      ratio >= 1
        ? `${Math.round(ratio)}× the usual ${rupees(pattern.usualAmount)}`
        : `well under the usual ${rupees(pattern.usualAmount)}`;
    return {
      ok: false,
      pattern,
      reason: `${rupees(amount)} is ${times} for ${shortVendor(pattern.vendor)} — held from auto-approve`,
    };
  }
  return { ok: true, pattern, evidence: evidenceFor(pattern) };
};

const patch = (id: string, next: Partial<TrustPattern>) => {
  state = {
    ...state,
    patterns: state.patterns.map((p) => (p.id === id ? { ...p, ...next } : p)),
  };
  emit();
};

/** A bill from this vendor was approved: one more piece of evidence, or an edit that resets it. */
export const recordApproval = (
  company: string,
  vendor: string,
  ledger: string,
  amount: number,
  edit?: string
) => {
  ensureSeeded();
  if (!vendor || !ledger) return;
  const pattern = patternFor(company, vendor, ledger);
  const now = new Date().toISOString();
  if (!pattern) {
    state = {
      ...state,
      patterns: [
        ...state.patterns,
        {
          id: `trust-${crypto.randomUUID()}`,
          company,
          vendor,
          ledger,
          approvals: 1,
          edits: edit ? 1 : 0,
          streak: edit ? 0 : 1,
          lastEditAt: edit ? now : undefined,
          lastEditNote: edit,
          usualAmount: amount,
          lastSeenAt: now,
        },
      ],
    };
    emit();
    return;
  }
  const settings = settingsFor(company);
  const before = trustStatus(pattern, settings);
  const approvals = pattern.approvals + 1;
  patch(pattern.id, {
    approvals,
    edits: pattern.edits + (edit ? 1 : 0),
    streak: edit ? 0 : pattern.streak + 1,
    lastEditAt: edit ? now : pattern.lastEditAt,
    lastEditNote: edit ?? pattern.lastEditNote,
    usualAmount: Math.round(
      (pattern.usualAmount * pattern.approvals + amount) / approvals
    ),
    lastSeenAt: now,
  });
  const after = trustStatus(
    state.patterns.find((p) => p.id === pattern.id)!,
    settings
  );
  if (before === "trusted" && after !== "trusted")
    logActivity({
      company,
      actor: AI,
      kind: "rule",
      module: "Automation",
      action: "Paused trust",
      subject: `${vendor} · ${ledger}`,
      ref: { kind: "rule", id: pattern.id },
      reason: `${edit} — the next ${settings.minApprovals} bills come to you for review`,
    });
  else if (before !== "trusted" && after === "trusted")
    logActivity({
      company,
      actor: AI,
      kind: "rule",
      module: "Automation",
      action: "Trusted pattern",
      subject: `${vendor} · ${ledger}`,
      ref: { kind: "rule", id: pattern.id },
      reason: evidenceFor(state.patterns.find((p) => p.id === pattern.id)!),
    });
};

/** An auto-approved bill was edited or undone: its pattern stops being trusted. */
export const revokeTrust = (
  company: string,
  vendor: string,
  ledger: string,
  note: string
) => {
  const pattern = patternFor(company, vendor, ledger);
  if (!pattern) return;
  patch(pattern.id, {
    edits: pattern.edits + 1,
    streak: 0,
    lastEditAt: new Date().toISOString(),
    lastEditNote: note,
  });
  logActivity({
    company,
    actor: AI,
    kind: "rule",
    module: "Automation",
    action: "Paused trust",
    subject: `${vendor} · ${ledger}`,
    ref: { kind: "rule", id: pattern.id },
    reason: `${note} — the next ${settingsFor(company).minApprovals} bills come to you for review`,
  });
};

export const autoApproveActions = {
  setSettings(company: string, next: Partial<AutoApproveSettings>, by: string) {
    ensureSeeded();
    const current = settingsFor(company);
    const merged = { ...current, ...next };
    state = {
      ...state,
      settings: [
        ...state.settings.filter((s) => s.company !== company),
        merged,
      ],
    };
    emit();
    const what =
      next.enabled !== undefined
        ? next.enabled
          ? "Turned auto-approve on"
          : "Turned auto-approve off"
        : "Changed the evidence auto-approve asks for";
    logActivity({
      company,
      actor: { kind: "person", name: by },
      kind: "rule",
      module: "Automation",
      action: what,
      subject: "Auto-approve",
      reason:
        next.enabled === undefined
          ? `${merged.minApprovals} approvals in a row, no edits, within ${merged.amountBand}× the usual amount`
          : undefined,
    });
  },
  pause(id: string, by: string) {
    const pattern = state.patterns.find((p) => p.id === id);
    if (!pattern) return;
    const paused = { by, at: new Date().toISOString(), reason: `by ${by}` };
    patch(id, { paused });
    logActivity(
      {
        company: pattern.company,
        actor: { kind: "person", name: by },
        kind: "rule",
        module: "Automation",
        action: "Paused auto-approve",
        subject: `${pattern.vendor} · ${pattern.ledger}`,
        ref: { kind: "rule", id },
        undoable: true,
      },
      () => patch(id, { paused: undefined })
    );
  },
  resume(id: string, by: string) {
    const pattern = state.patterns.find((p) => p.id === id);
    if (!pattern) return;
    patch(id, { paused: undefined });
    logActivity({
      company: pattern.company,
      actor: { kind: "person", name: by },
      kind: "rule",
      module: "Automation",
      action: "Resumed auto-approve",
      subject: `${pattern.vendor} · ${pattern.ledger}`,
      ref: { kind: "rule", id },
    });
  },
};

/** One organisation's settings and patterns, and how many are trusted. */
export const useAutoApprove = (company: string) => {
  const current = useSyncExternalStore(subscribe, snapshot, () => state);
  return useMemo(() => {
    const settings =
      current.settings.find((s) => s.company === company) ?? DEFAULTS(company);
    const patterns = current.patterns.filter((p) => p.company === company);
    const trusted = patterns.filter(
      (p) => trustStatus(p, settings) === "trusted"
    ).length;
    return { settings, patterns, trusted };
  }, [current, company]);
};
