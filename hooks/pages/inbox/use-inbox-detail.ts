import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { toast } from "sonner";
import { AI_CONFIDENCE_THRESHOLD } from "@/config/pages/inbox";
import { MOCK_INBOX_ITEMS } from "@/config/pages/inbox/mock-inbox";
import type { InboxItem, InboxRoute } from "@/types/pages/inbox";
import type {
  ConversionRequest,
  ResolvedValues,
} from "@/types/pages/inbox/conversion";

/**
 * Unified Inbox — detail orchestration.
 *
 * Ported from the DetailShell cohort/disambiguation logic in js/inbox-detail.jsx
 * and the conversion actions in the js/app.jsx reducer.
 *
 * The prototype kept `_chosenRoute`, `_routeConfirmed`, `_convertedToJv` and
 * `_destination` on the item itself. They are local UI state here and never
 * touch InboxItem — none of them is a field the API returns.
 */

/** Statuses that belong to the reviewable queue the pager walks. */
const OPENABLE_STATUSES: InboxItem["status"][] = [
  "needs-review",
  "extracting",
  "retrying",
  "duplicate-soft",
  "duplicate-hard",
];

export const useInboxDetail = (itemId: string | undefined) => {
  const router = useRouter();

  // DEV: replace with GET /api/inbox/:id → InboxItem, plus
  //      GET /api/inbox?status=needs-review&route=<route> for the pager cohort.
  //      The prototype holds the whole set in memory and derives both from it.
  const [items] = useState<InboxItem[]>(MOCK_INBOX_ITEMS);

  const item = useMemo(
    () => items.find((candidate) => candidate.id === itemId) ?? null,
    [items, itemId]
  );

  /* ------------------------------- cohort ------------------------------- */

  // The pager moves within the route cohort, not the whole inbox — after
  // approving a bill you want the next bill, not the next bank statement.
  const cohort = useMemo(() => {
    if (!item?.route) {
      return { index: 0, total: 0, prev: null, next: null };
    }

    const list = items.filter(
      (candidate) =>
        OPENABLE_STATUSES.includes(candidate.status) &&
        candidate.route === item.route
    );
    const index = list.findIndex((candidate) => candidate.id === item.id);

    return {
      index: index < 0 ? 0 : index,
      total: list.length,
      prev: index > 0 ? list[index - 1] : null,
      next: index >= 0 && index < list.length - 1 ? list[index + 1] : null,
    };
  }, [items, item]);

  /* --------------------------- disambiguation --------------------------- */

  const [chosenRoute, setChosenRoute] = useState<InboxRoute | null>(null);
  const [routeConfirmed, setRouteConfirmed] = useState(false);

  const effectiveRoute = chosenRoute ?? item?.route ?? null;

  /**
   * Two ways to land here: the document is genuinely ambiguous, or it was
   * routed but the classifier scored below the threshold. Either way nothing is
   * pre-filled until the accountant settles it.
   */
  const needsDisambiguation = useMemo(() => {
    if (!item) return false;
    if (item.ambiguous && !chosenRoute) return true;
    return (
      item.ai.confidence != null &&
      item.ai.confidence < AI_CONFIDENCE_THRESHOLD &&
      !routeConfirmed &&
      Boolean(item.route) &&
      !item.ambiguous
    );
  }, [item, chosenRoute, routeConfirmed]);

  /* ----------------------------- conversion ----------------------------- */

  const [conversion, setConversion] = useState<ConversionRequest | null>(null);
  const [conflict, setConflict] = useState(false);
  const [approvedAs, setApprovedAs] = useState<{
    convertedToJv: boolean;
    destination: string;
  } | null>(null);

  const openConversion = useCallback((request: ConversionRequest) => {
    setConversion(request);
  }, []);

  /**
   * `?convert=JV` opens the panel straight from a list-row kebab, so the
   * accountant does not have to re-find the action once the detail loads.
   * Deep-linkable on purpose — it makes the state shareable and testable.
   */
  useEffect(() => {
    if (!router.isReady || !item) return;
    const target = router.query.convert;
    if (typeof target !== "string") return;
    if (target !== "JV" && target !== "Bill" && target !== "Invoice") return;

    setConversion({
      source: item.route === "JV" ? "jv" : "bill",
      target,
    });
  }, [router.isReady, router.query.convert, item]);

  const closeConversion = useCallback(() => {
    setConversion(null);
    setConflict(false);

    // Drop ?convert= too, or the effect above immediately reopens the panel.
    if (router.query.convert) {
      const { convert: _convert, ...rest } = router.query;
      void router.replace(
        { pathname: router.pathname, query: rest },
        undefined,
        {
          shallow: true,
          scroll: false,
        }
      );
    }
  }, [router]);

  const confirmConversion = useCallback(
    (_resolved: ResolvedValues) => {
      if (!item || !conversion) return;

      // Prototype-only: the first confirm on a conflictSim item fires the
      // multi-user conflict instead of converting, so the state is reachable.
      // DEV: delete this branch — a real conflict comes back as a 409 from
      //      POST /api/inbox/:id/convert and is surfaced the same way.
      if (item.conflictSim && !conflict) {
        setConflict(true);
        return;
      }

      // DEV: POST /api/inbox/:id/convert { source, target, rowIndex?, resolved }
      //      → { voucherId }. Invalidate the inbox list on success.
      const destination =
        conversion.target === "JV"
          ? "JV/26-27/0088"
          : conversion.target === "Invoice"
            ? "SOR/26-27/0447"
            : "PUR/26-27/0321";

      setApprovedAs({
        convertedToJv: conversion.target === "JV",
        destination,
      });
      setConversion(null);
      setConflict(false);

      toast.success(`Converted — posted as ${destination}.`, {
        action: {
          label: "Undo",
          // DEV: POST /api/inbox/:id/reverse
          onClick: () => {
            setApprovedAs(null);
            toast("Conversion reversed.");
          },
        },
        duration: 10_000,
      });
    },
    [item, conversion, conflict]
  );

  const refreshConflict = useCallback(() => {
    setConflict(false);
    toast("Refreshed — this item is up to date.");
  }, []);

  /* ------------------------------ actions ------------------------------- */

  const goPrev = useCallback(() => {
    if (cohort.prev) void router.push(`/inbox/${cohort.prev.id}`);
  }, [cohort.prev, router]);

  const goNext = useCallback(() => {
    if (cohort.next) void router.push(`/inbox/${cohort.next.id}`);
    else void router.push("/inbox");
  }, [cohort.next, router]);

  const runAction = useCallback((label: string) => {
    toast(`This action would ${label.toLowerCase()} in the live product.`);
  }, []);

  /**
   * Approving is the product's whole point — the moment an AI guess becomes a
   * posted entry. It is undoable for ten seconds, because the cost of a wrong
   * posting is far higher than the cost of a confirmation step.
   *
   * DEV: POST /api/inbox/:id/approve → { voucherId }. Invalidate the list.
   */
  const approve = useCallback(() => {
    if (!item) return;

    const destination =
      item.route === "AR"
        ? `Batch · ${item.ar?.validRows.toLocaleString("en-IN")} invoices`
        : item.route === "Banking"
          ? "Sent to reconciliation"
          : item.route === "JV"
            ? "JV/26-27/0019"
            : (item.bill?.voucherNo ?? "PUR/26-27/0322");

    setApprovedAs({ convertedToJv: false, destination });

    toast.success(`Approved — posted as ${destination}.`, {
      action: {
        label: "Undo",
        // DEV: POST /api/inbox/:id/reverse
        onClick: () => {
          setApprovedAs(null);
          toast("Approval reversed.");
        },
      },
      duration: 10_000,
    });
  }, [item]);

  const saveDraft = useCallback(() => {
    // DEV: PATCH /api/inbox/:id { draft: true, ...fields }
    toast("Draft saved.");
  }, []);

  /** The last item in its cohort loses the "& Next" half of the Approve CTA. */
  const isLastInCohort = cohort.total <= 1 || cohort.next === null;

  /**
   * Two-pane — file preview beside the review surface — only where seeing the
   * source document actually helps. AR and Banking are single-pane: the parsed
   * grid already carries everything the original PDF would tell you, and the
   * preview would just take half the width.
   */
  const isTwoPane = useMemo(() => {
    if (!item || needsDisambiguation) return false;
    if (
      [
        "duplicate-cross-type",
        "done",
        "failed",
        "extracting",
        "retrying",
      ].includes(item.status)
    ) {
      return false;
    }
    if (approvedAs) return false;
    /*
      AP is single-pane here, which reads backwards until you see what hosts it:
      the AP module's own sheet is *itself* a document-beside-form split, and it
      draws the document from the same payload it was given. Putting that inside
      a second split halves the form again — narrow enough that the sheet's own
      container query folds every field into a single column. So the sheet gets
      the whole width and keeps its own preview.
    */
    if (effectiveRoute === "AP") return false;
    return effectiveRoute === "JV" || !effectiveRoute;
  }, [item, needsDisambiguation, approvedAs, effectiveRoute]);

  return {
    item,
    cohort,
    effectiveRoute,
    needsDisambiguation,
    threshold: AI_CONFIDENCE_THRESHOLD,
    isTwoPane,

    pickRoute: setChosenRoute,
    confirmRoute: () => setRouteConfirmed(true),

    conversion,
    conflict,
    openConversion,
    closeConversion,
    confirmConversion,
    refreshConflict,

    approvedAs,
    goPrev,
    goNext,
    runAction,
    approve,
    saveDraft,
    isLastInCohort,
  };
};
