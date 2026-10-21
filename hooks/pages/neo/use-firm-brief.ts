import { useMemo } from "react";
import { getState, useStore, type Item } from "@/components/inbox/v2/store";
import {
  BRIEF_DEADLINE,
  COMPLIANCE_CALENDAR,
  MOCK_FIRM_REST,
} from "@/config/pages/neo/mock-firm";
import { getGstState, useGstState } from "@/hooks/pages/inbox/use-gst";
import {
  getComplianceIssues,
  useCompliance,
} from "@/hooks/pages/inbox/use-compliance";
import { getChases, useChases } from "@/hooks/pages/neo/use-chases";
import type {
  BriefClient,
  BriefPart,
  BriefSignal,
  FirmBrief,
} from "@/types/pages/neo/brief";
import {
  DEMO_TODAY,
  itcRisk,
  overdueInvoices,
} from "@/utils/pages/inbox/ai-calculations";

/**
 * The firm brief, worked out from the same stores every screen reads — so a
 * figure here is the figure the client's own screen shows when opened.
 *
 * Ranking: clients that need a person first, then by the largest single
 * amount that needs a decision. ITC at risk, bills waiting and money overdue
 * are shown apart and never added together: a tax exposure, a work queue
 * and a collection problem are not one number. Each client's next action
 * follows its own largest one. Signals that hold up a return say which.
 *
 * DEV: GET /api/neo/brief replaces `firmBrief`; the hook keeps its shape.
 */

/** "₹2.4L", "₹38,000" — compact, as a partner says it aloud. */
export const lakhs = (n: number) =>
  n >= 100000
    ? `₹${(n / 100000).toFixed(n >= 1000000 ? 0 : 1).replace(/\.0$/, "")}L`
    : `₹${Math.round(n).toLocaleString("en-IN")}`;

const daysTo = (iso: string) =>
  Math.ceil((+new Date(`${iso}T00:00:00+05:30`) - +DEMO_TODAY) / 86400000);

/** "20 Oct". */
const short = (iso: string) =>
  new Date(`${iso}T00:00:00+05:30`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });

/** The next returns due, soonest first, with days to go. */
export const upcomingReturns = (n = 4) =>
  COMPLIANCE_CALENDAR.map((r) => ({
    ...r,
    days: daysTo(r.due),
    on: short(r.due),
  }))
    .filter((r) => r.days >= 0)
    .sort((a, b) => a.days - b.days)
    .slice(0, n);

const isWaiting = (x: Item) =>
  !x.priorVoucher && ["Needs Review", "Duplicate", "Failed"].includes(x.status);

export const firmBrief = (): FirmBrief => {
  const s = getState();
  const chases = getChases();
  const days = daysTo(BRIEF_DEADLINE.due);
  const due = short(BRIEF_DEADLINE.due);
  // ITC and the bills behind it decide this month's 3B.
  const threeB = `3B · ${due}`;

  const clients: BriefClient[] = s.companies.map((c) => {
    const items = s.items.filter((x) => x.company === c.id);
    const waiting = items.filter(isWaiting);
    const dupes = waiting.filter((x) => x.status === "Duplicate");
    const failed = waiting.filter((x) => x.status === "Failed");
    const waitingSum = waiting.reduce((n, x) => n + x.amount, 0);

    const q2 = Object.entries(getGstState(c.id).invoices)
      .filter(([m]) => m >= "2026-07" && m <= "2026-09")
      .flatMap(([, rows]) => rows);
    const itc = itcRisk(q2).total;

    const overdue = overdueInvoices(s.items, c.id);
    const overdueSum = overdue.reduce((n, x) => n + x.outstanding, 0);

    const checks = getComplianceIssues(c.id).filter((x) => x.status === "open");
    const mine = chases.filter((x) => x.company === c.id);
    const replies = mine.filter((x) => x.status === "received");
    const out = mine.filter((x) => x.status === "waiting");

    const signals: BriefSignal[] = [];
    if (itc > 0)
      signals.push({
        id: "itc",
        text: `${lakhs(itc)} ITC at risk`,
        tone: "negative",
        href: "/inbox?module=GST&tab=invoices",
        due: threeB,
      });
    if (waiting.length)
      signals.push({
        id: "review",
        text: `${waiting.length} to review`,
        tone: "notice",
        href: "/inbox",
        due: threeB,
      });
    if (dupes.length)
      signals.push({
        id: "dupes",
        text: `${dupes.length} duplicate${dupes.length === 1 ? "" : "s"}`,
        tone: "notice",
        href: "/inbox",
      });
    if (failed.length)
      signals.push({
        id: "failed",
        text: `${failed.length} unreadable`,
        tone: "notice",
        href: "/inbox",
      });
    if (overdueSum > 0)
      signals.push({
        id: "overdue",
        text: `${lakhs(overdueSum)} overdue`,
        tone: "notice",
        // No Overdue tab in this prototype's Sales: the posted invoices.
        href: "/inbox?module=AR",
      });
    if (checks.length)
      signals.push({
        id: "checks",
        text: `${checks.length} compliance check${checks.length === 1 ? "" : "s"}`,
        tone: "notice",
        // No Compliance checks screen in this prototype: the first bill a
        // check is about.
        href: checks[0].documentId
          ? `/inbox?id=${encodeURIComponent(checks[0].documentId)}`
          : "/inbox",
        due: threeB,
      });
    if (replies.length)
      signals.push({
        id: "replies",
        text: `${replies.length} chase repl${replies.length === 1 ? "y" : "ies"} to read`,
        tone: "neutral",
        href: replies[0].itemId
          ? `/inbox?id=${encodeURIComponent(replies[0].itemId)}`
          : "/inbox",
      });
    if (out.length)
      signals.push({
        id: "out",
        text: `${out.length} chase${out.length === 1 ? "" : "s"} waiting`,
        tone: "neutral",
        href: out[0].itemId
          ? `/inbox?id=${encodeURIComponent(out[0].itemId)}`
          : "/inbox",
      });

    const parts: BriefPart[] = (
      [
        { id: "itc", label: `${lakhs(itc)} ITC at risk`, amount: itc },
        {
          id: "waiting",
          label: `${lakhs(waitingSum)} waiting`,
          amount: waitingSum,
        },
        {
          id: "overdue",
          label: `${lakhs(overdueSum)} overdue`,
          amount: overdueSum,
        },
      ] as BriefPart[]
    )
      .filter((p) => p.amount > 0)
      .sort((a, b) => b.amount - a.amount);

    // Where to start: this client's largest money first; with none, the
    // deadline's work, then replies and checks.
    const forPart = { itc: "itc", waiting: "review", overdue: "overdue" };
    const order = [
      ...parts.map((p) => forPart[p.id]),
      "itc",
      "review",
      "replies",
      "overdue",
      "checks",
      "dupes",
    ];
    const first = order
      .map((id) => signals.find((x) => x.id === id))
      .find(Boolean);
    const labels: Record<string, string> = {
      itc: "Open GST",
      review: "Open Inbox",
      replies: "Read replies",
      overdue: "Open overdue",
      checks: "Open checks",
      dupes: "Open Inbox",
    };

    const needs = signals.filter((x) => x.id !== "out");
    return {
      company: c.id,
      name: c.name,
      deadline: `${BRIEF_DEADLINE.label} due ${due} · ${days} day${days === 1 ? "" : "s"}`,
      impact: parts[0]?.amount || 0,
      parts,
      signals,
      next: first ? { label: labels[first.id], href: first.href } : undefined,
      clear: !needs.length,
    };
  });

  clients.sort(
    (a, b) => Number(a.clear) - Number(b.clear) || b.impact - a.impact
  );

  const day = 86400000;
  const arrived = s.items.filter(
    (x) =>
      !x.priorVoucher && x.received && Date.now() - +new Date(x.received) < day
  ).length;
  const replies = chases.filter(
    (x) => x.reply && Date.now() - +new Date(x.reply.at) < 2 * day
  ).length;
  const needYou = clients.filter((x) => !x.clear).length;

  return {
    clients,
    rest: MOCK_FIRM_REST,
    overnight: [
      arrived
        ? `${arrived} document${arrived === 1 ? "" : "s"} arrived in the last day`
        : "No new documents since yesterday",
      replies
        ? `${replies} repl${replies === 1 ? "y" : "ies"} to chases`
        : "no chase replies",
      "nothing posted without you",
    ].join(" · "),
    needYou,
    total: clients.length + MOCK_FIRM_REST.clients,
  };
};

/** The brief, recomputed when any store it reads changes. */
export const useFirmBrief = () => {
  const s = useStore();
  const chases = useChases();
  // Subscribing is what matters; the values are read again in firmBrief.
  const gst = useGstState(s.company);
  const checks = useCompliance(s.company);
  return useMemo(() => firmBrief(), [s, chases, gst, checks]);
};

/**
 * One company's part of the brief. Neo is per company (20 Oct 2026): Needs
 * attention, the nav count and "what needs me" read only the company in the
 * top bar.
 */
export const companyBrief = (company: string): BriefClient | undefined =>
  firmBrief().clients.find((c) => c.company === company);

export const useCompanyBrief = () => {
  const s = useStore();
  const brief = useFirmBrief();
  const chases = useChases();
  const day = 86400000;
  const arrived = s.items.filter(
    (x) =>
      x.company === s.company &&
      !x.priorVoucher &&
      x.received &&
      Date.now() - +new Date(x.received) < day
  ).length;
  const replies = chases.chases.filter(
    (x) =>
      x.company === s.company &&
      x.reply &&
      Date.now() - +new Date(x.reply.at) < 2 * day
  ).length;
  return {
    client: brief.clients.find((c) => c.company === s.company),
    overnight: [
      arrived
        ? `${arrived} document${arrived === 1 ? "" : "s"} arrived in the last day`
        : "No new documents since yesterday",
      replies
        ? `${replies} repl${replies === 1 ? "y" : "ies"} to chases`
        : "no chase replies",
      "nothing posted without you",
    ].join(" · "),
  };
};
