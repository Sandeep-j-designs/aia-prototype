import { useMemo, useSyncExternalStore } from "react";
import {
  predictedLedgers,
  useStore,
  type Item,
} from "@/components/inbox/v2/store";
import {
  trustStatus,
  useAutoApprove,
} from "@/hooks/pages/inbox/use-auto-approve";

/**
 * Neo speaks first — once, at the moment it is useful (Neo proposition,
 * Phase 3). Two offers, each worked out from what just happened:
 *
 * - rule: a person has changed the same vendor's ledger by hand twice, and
 *   more of that vendor's open bills still sit on the old one. "Show the 3"
 *   opens the change-by-rule sign-off; it changes nothing by itself.
 * - trust: a vendor + ledger is one clean approval from earning auto-approve,
 *   and a bill that would be it is waiting.
 *
 * Offer once, then stop: "Not now" hides an offer until its evidence grows;
 * dismissed twice, it never comes back for that vendor. In memory, like the
 * other stores.
 *
 * DEV: GET /api/neo/offers?company=…&screen=inbox; dismissals are POSTed so
 * they follow the person across devices.
 */

export type NeoOffer = {
  /** Stable per vendor and kind: what dismissals are keyed on. */
  key: string;
  kind: "rule" | "trust";
  /** How much evidence the offer stands on; it may return when this grows. */
  weight: number;
  title: string;
  detail: string;
  action: { label: string; prompt?: string; href?: string };
};

const MIN_MANUAL = 2;

type Dismissal = { times: number; weight: number };
let dismissed: Record<string, Dismissal> = {};
const listeners = new Set<() => void>();
const subscribe = (f: () => void) => {
  listeners.add(f);
  return () => listeners.delete(f);
};
const snapshot = () => dismissed;

export const dismissOffer = (offer: NeoOffer) => {
  const prior = dismissed[offer.key];
  dismissed = {
    ...dismissed,
    [offer.key]: { times: (prior?.times || 0) + 1, weight: offer.weight },
  };
  listeners.forEach((f) => f());
};

const visible = (offer: NeoOffer, d: Record<string, Dismissal>) => {
  const prior = d[offer.key];
  if (!prior) return true;
  if (prior.times >= 2) return false;
  return offer.weight > prior.weight;
};

const ledgerOf = (x: Item) => {
  const set = [...new Set(x.form.lines.map((l) => l.ledger).filter(Boolean))];
  return set.length === 1 ? set[0] : undefined;
};

/** The rule offer: two hand changes, more bills still waiting on the old ledger. */
export const ruleOffers = (items: Item[], company: string): NeoOffer[] => {
  const bills = items.filter(
    (x) =>
      x.company === company &&
      x.route === "AP" &&
      x.status !== "Deleted" &&
      x.form.party &&
      !x.preparedBy
  );
  const moved = new Map<string, Item[]>();
  for (const x of bills) {
    const was = [...new Set(predictedLedgers(x).filter(Boolean))];
    const now = ledgerOf(x);
    if (was.length !== 1 || !now || now === was[0]) continue;
    const key = `${x.form.party}|${was[0]}|${now}`;
    moved.set(key, [...(moved.get(key) || []), x]);
  }
  const out: NeoOffer[] = [];
  moved.forEach((done, key) => {
    if (done.length < MIN_MANUAL) return;
    const [vendor, from, to] = key.split("|");
    const rest = bills.filter(
      (x) =>
        x.form.party === vendor &&
        ["Needs Review", "Duplicate"].includes(x.status) &&
        ledgerOf(x) === from
    );
    if (!rest.length) return;
    out.push({
      key: `rule|${vendor}|${from}`,
      kind: "rule",
      weight: done.length,
      title: `${rest.length} more ${vendor} bill${rest.length === 1 ? " is" : "s are"} on ${from}.`,
      detail: `You moved ${done.length} to ${to}. Do the same for the rest?`,
      action: {
        label: rest.length === 1 ? "Show it" : `Show the ${rest.length}`,
        prompt: `Move all ${vendor} bills from ${from} to ${to}`,
      },
    });
  });
  return out;
};

export const useNeoOffers = (company: string) => {
  const state = useStore();
  const trust = useAutoApprove(company);
  const d = useSyncExternalStore(subscribe, snapshot, snapshot);
  return useMemo(() => {
    const offers = ruleOffers(state.items, company);
    // One clean approval from trust, with the bill that would earn it waiting.
    for (const p of trust.patterns) {
      if (
        trustStatus(p, trust.settings) !== "building" ||
        p.streak !== trust.settings.minApprovals - 1
      )
        continue;
      const waiting = state.items.find(
        (x) =>
          x.company === company &&
          x.status === "Needs Review" &&
          x.form.party === p.vendor &&
          ledgerOf(x) === p.ledger
      );
      if (!waiting) continue;
      offers.push({
        key: `trust|${p.vendor}|${p.ledger}`,
        kind: "trust",
        weight: p.streak,
        title: `One more clean ${p.vendor} bill and ${p.ledger} can auto-approve.`,
        detail: `${p.streak} approved in a row with no edits; trust needs ${trust.settings.minApprovals}. ${waiting.form.invoiceNo || waiting.id} is waiting.`,
        action: {
          label: "Review it",
          href: `/inbox?id=${encodeURIComponent(waiting.id)}`,
        },
      });
    }
    return offers.filter((o) => visible(o, d)).slice(0, 1);
  }, [state, trust, d, company]);
};
