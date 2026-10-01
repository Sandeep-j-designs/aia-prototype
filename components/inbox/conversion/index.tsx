import React, { useMemo, useState } from "react";
import { AlertTriangle, ArrowLeftRight, Check, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  countUnresolved,
  describeConversion,
  isConversionBlocked,
} from "@/utils/pages/inbox/conversion-spec";
import LineBuilder from "./line-builder";
import MappingRow from "./mapping-row";
import PreflightLine from "./preflight-line";
import type { InboxItem } from "@/types/pages/inbox";
import type {
  BuiltLine,
  ConversionRequest,
  ResolvedValues,
} from "@/types/pages/inbox/conversion";
import { LINES_KEY } from "@/types/pages/inbox/conversion";

/**
 * The conversion panel. Ported from js/conversion-panel.jsx.
 *
 * One surface for all seven conversion edges. What varies is the spec —
 * see utils/pages/inbox/conversion-spec.ts — not the layout, because the
 * question the accountant is answering is the same every time: what maps to
 * what, what do I still have to decide, and what will posting this actually do.
 *
 * The original rendered its own backdrop div. This uses the shadcn Dialog
 * production already has, which brings focus trapping, Escape-to-close and
 * scroll locking that the hand-rolled version did not.
 */

type Props = {
  item: InboxItem;
  request: ConversionRequest;
  /** Another user has already converted this item since it was opened. */
  conflict: boolean;
  onClose: () => void;
  onConfirm: (resolved: ResolvedValues) => void;
  onRefreshConflict: () => void;
};

const ConversionPanel = ({
  item,
  request,
  conflict,
  onClose,
  onConfirm,
  onRefreshConflict,
}: Props) => {
  const spec = useMemo(
    () => describeConversion(item, request),
    [item, request]
  );
  const [resolved, setResolved] = useState<ResolvedValues>({});

  const resolve = (key: string, value: string) =>
    setResolved((prev) => ({ ...prev, [key]: value }));

  const setLines = (lines: BuiltLine[]) =>
    setResolved((prev) => ({ ...prev, [LINES_KEY]: lines }));

  const unresolvedCount = countUnresolved(spec, resolved);
  const blocked = isConversionBlocked(spec, resolved);
  const lines = (resolved[LINES_KEY] as BuiltLine[] | undefined) ?? [];

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="flex-row items-start gap-3 space-y-0 border-b border-neutral-gray px-5 py-4">
          <span className="mt-0.5 grid h-9 w-9 flex-none place-items-center rounded-lg bg-accent text-accent-foreground">
            <ArrowLeftRight className="h-[18px] w-[18px]" />
          </span>
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-base leading-snug">
              {spec.title}
            </DialogTitle>
            <DialogDescription className="mt-0.5 text-xs">
              {spec.subtitle}
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* Consequence chips — the irreversible effects, stated up front */}
        {spec.consequenceChips.length > 0 ? (
          <div className="flex flex-wrap gap-2 border-b border-neutral-gray px-5 py-3">
            {spec.consequenceChips.map((chip) => (
              <span
                key={chip}
                className="rounded-md bg-section px-2 py-1 text-[11px] text-secondary-foreground"
              >
                {chip}
              </span>
            ))}
          </div>
        ) : null}

        {spec.freeformBanner ? (
          <div className="flex items-start gap-2 border-b border-neutral-gray bg-accent px-5 py-3">
            <Info className="mt-0.5 h-3.5 w-3.5 flex-none text-primary" />
            <span className="text-sm leading-relaxed text-primary">
              {spec.freeformBanner}
            </span>
          </div>
        ) : null}

        {conflict ? (
          <div className="flex items-start gap-2.5 border-b border-warning-border bg-destructive px-5 py-3">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-none text-destructive-foreground" />
            <div className="text-sm text-destructive-foreground">
              <strong>
                This item was just converted to a JV by Priya R. (30s ago).
              </strong>
              <div className="mt-1 flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="underline underline-offset-2"
                >
                  View JV/26-27/0098
                </button>
                <span aria-hidden>·</span>
                <button
                  type="button"
                  onClick={onRefreshConflict}
                  className="underline underline-offset-2"
                >
                  Refresh and continue
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="mb-1 flex items-center gap-2">
            <strong className="text-sm">Mapping</strong>
            <span className="text-[11px] text-secondary-foreground">
              {spec.mapping.length} fields · {unresolvedCount} need you
            </span>
          </div>

          <div className="overflow-hidden rounded-lg border border-panel-border">
            <div className="grid grid-cols-[1fr_1.4fr_auto] gap-3 bg-section px-3 py-2 text-[11px] font-medium text-secondary-foreground">
              <div>Source Field</div>
              <div>Target Field</div>
              <div>Status</div>
            </div>
            {spec.mapping.map((row) => (
              <MappingRow
                key={row.key}
                row={row}
                value={resolved[row.key] as string | undefined}
                onResolve={(value) => resolve(row.key, value)}
              />
            ))}
          </div>

          {spec.lineBuilder ? (
            <LineBuilder
              spec={spec.lineBuilder}
              lines={lines}
              onChange={setLines}
            />
          ) : null}

          <div className="mt-5">
            <strong className="mb-2 block text-sm">Pre-flight</strong>
            <PreflightLine
              kind={spec.preflight.duplicate.ok ? "ok" : "warn"}
              label="Duplicate check"
              body={spec.preflight.duplicate.message}
              action={spec.preflight.duplicate.action}
            />
            <PreflightLine
              kind={spec.preflight.gstPeriod.ok ? "ok" : "warn"}
              label="GST period"
              body={spec.preflight.gstPeriod.message}
              action={spec.preflight.gstPeriod.action}
            />
            <PreflightLine
              kind="info"
              label="Blast radius"
              body={spec.preflight.blastRadius}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-neutral-gray px-5 py-3.5">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={blocked} onClick={() => onConfirm(resolved)}>
            <Check className="h-3.5 w-3.5" />
            {spec.ctaLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConversionPanel;
