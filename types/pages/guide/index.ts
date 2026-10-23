import type { LucideIcon } from "lucide-react";
import type { GuideAction } from "@/components/guide/actions";

/**
 * One stop in a guided walkthrough.
 *
 * `anchor` is the `data-guide-id` of the element the step points at. It is
 * optional on purpose: a step whose element is not on screen — the Approve
 * button while the list is still empty — still has something to say, and the
 * card falls back to the centre of the viewport rather than pointing at
 * nothing.
 */
export type TourStep = {
  anchor?: string;
  title: string;
  body: string;
  /** Preferred side of the anchor. The popover flips if it would clip. */
  placement?: "top" | "bottom" | "left" | "right";
  /**
   * Advance when the user presses the highlighted control.
   *
   * Next is always there as well. A guide that can only be advanced by doing
   * the thing is a guide that traps anyone who cannot do the thing right now.
   */
  advanceOn?: "click";
  /**
   * Advance when the element with this `data-guide-id` turns up — how the tour
   * follows work it did not trigger: an upload settling, a row reaching the
   * queue. Ignored if the element is already on screen when the step opens,
   * so a tour started on a populated Inbox does not skip itself.
   */
  waitFor?: string;
  /** What the user is being waited on for, shown in place of nothing. */
  hint?: string;
  /**
   * Something the screen does when this step opens — the walkthrough showing
   * the flow rather than asking for it. See components/guide/actions.
   */
  action?: GuideAction;
};

export type JourneyId =
  "recon" | "purchases" | "banking" | "sales" | "sales-upload" | "inbox";

/** Which skeleton the journey card draws in its thumbnail. */
export type JourneyArt = "list" | "ledger" | "form" | "upload" | "inbox";

export type Journey = {
  id: JourneyId;
  title: string;
  description: string;
  icon: LucideIcon;
  art: JourneyArt;
  /**
   * Empty when the journey exists in production but is not scripted in this
   * prototype — the card still renders, Start is just inert.
   */
  steps: TourStep[];
  /** Seeded progress. Production reads this from the user's guide state. */
  complete: boolean;
};
