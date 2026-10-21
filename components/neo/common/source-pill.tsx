import React from "react";
import { ArrowUpRight, FileText } from "@/components/icons";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useStore } from "@/components/inbox/v2/store";
import { MOCK_SOURCE_DOCUMENTS } from "@/config/pages/inbox/mock-source-documents";
import type { NeoRef } from "@/types/pages/neo";
import { day, money } from "@/utils/pages/neo";
import { asset } from "@/lib/base-path";
import { cn } from "@/lib/utils";

/**
 * The record behind a citation, as a card: the page itself when there is
 * one, then who, which number, when, how much and where it stands. Enough to
 * trust the figure without leaving the chat.
 */
export const SourcePreview = ({ itemId }: { itemId: string }) => {
  const state = useStore();
  const item = state.items.find((x) => x.id === itemId);
  if (!item) return null;
  const page = MOCK_SOURCE_DOCUMENTS[itemId]?.pages[0];
  return (
    <div className="flex gap-3">
      {page ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={asset(page.image)}
          alt=""
          className="h-24 w-[68px] flex-none rounded-xs border border-pi-line bg-background object-cover object-top"
        />
      ) : (
        <span className="grid h-24 w-[68px] flex-none place-items-center rounded-xs border border-pi-line bg-pi-fill text-pi-faint">
          <FileText className="h-5 w-5" />
        </span>
      )}
      <div className="min-w-0 flex-1 text-[13px] leading-5">
        <p className="truncate font-semibold text-pi-ink">
          {item.form.party || item.file.name}
        </p>
        <p className="code truncate text-body-4 text-pi-body">
          {item.form.invoiceNo || item.form.voucherNo || item.id}
        </p>
        <p className="mt-1 text-body-4 text-pi-body">
          {day(item.form.date)} · {item.status}
        </p>
        <p className="mt-1 font-semibold tabular-nums text-pi-ink">
          {money(item.amount)}
        </p>
      </div>
    </div>
  );
};

type PillProps = {
  source: NeoRef;
  onRef: (ref: NeoRef) => void;
  className?: string;
};

/**
 * An inline citation: the record's number as a small pill in the sentence.
 * Hover shows the record; click opens it.
 */
export const SourcePill = ({ source, onRef, className }: PillProps) => {
  const pill = (
    <button
      type="button"
      onClick={() => onRef(source)}
      className={cn(
        "neo-cite mx-0.5 inline-flex max-w-[16rem] items-center gap-1 rounded-xs bg-pi-fill px-1.5 align-[1px] font-sans text-[12px] font-medium leading-5 text-pi-ink-2 transition-colors hover:bg-pi-brand-tint hover:text-pi-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border",
        className
      )}
    >
      <span className="truncate">{source.label}</span>
    </button>
  );
  if (!source.itemId) return pill;
  return (
    <HoverCard openDelay={250} closeDelay={80}>
      <HoverCardTrigger asChild>{pill}</HoverCardTrigger>
      <HoverCardContent side="top" align="start" className="w-72 p-3">
        <SourcePreview itemId={source.itemId} />
      </HoverCardContent>
    </HoverCard>
  );
};

/**
 * Every record an answer rests on, behind one pill at its foot: "3 sources".
 * Each row previews on hover and opens on click.
 */
export const SourcesButton = ({
  sources,
  onRef,
}: {
  sources: NeoRef[];
  onRef: (ref: NeoRef) => void;
}) => {
  const state = useStore();
  if (!sources.length) return null;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-7 items-center gap-1.5 rounded-md px-2 text-[12px] font-medium text-pi-body transition-colors hover:bg-pi-fill hover:text-pi-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border data-[state=open]:bg-pi-fill data-[state=open]:text-pi-ink"
        >
          <FileText className="h-3.5 w-3.5" />
          {sources.length} source{sources.length === 1 ? "" : "s"}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-1.5">
        <p className="px-2 pb-1.5 pt-1 text-body-4 font-semibold text-pi-faint">
          Records this answer used
        </p>
        <ul className="flex max-h-72 flex-col overflow-y-auto">
          {sources.map((s) => {
            const item = s.itemId
              ? state.items.find((x) => x.id === s.itemId)
              : undefined;
            const row = (
              <button
                type="button"
                onClick={() => onRef(s)}
                className="group flex w-full items-center gap-2.5 rounded-sm px-2 py-1.5 text-left hover:bg-pi-fill focus-visible:bg-pi-fill focus-visible:outline-none"
              >
                <FileText className="h-3.5 w-3.5 flex-none text-pi-body" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] text-pi-ink">
                    {item?.form.party || s.label}
                  </span>
                  {item && (
                    <span className="code block truncate text-body-4 text-pi-body">
                      {item.form.invoiceNo || item.id}
                    </span>
                  )}
                </span>
                {item ? (
                  <span className="text-body-4 font-semibold tabular-nums text-pi-ink-2">
                    {money(item.amount)}
                  </span>
                ) : (
                  <ArrowUpRight className="h-3.5 w-3.5 text-pi-faint group-hover:text-pi-ink" />
                )}
              </button>
            );
            return (
              <li key={`${s.label}-${s.itemId || s.href}`}>
                {s.itemId ? (
                  <HoverCard openDelay={300} closeDelay={60}>
                    <HoverCardTrigger asChild>{row}</HoverCardTrigger>
                    <HoverCardContent side="right" align="start" className="w-72 p-3">
                      <SourcePreview itemId={s.itemId} />
                    </HoverCardContent>
                  </HoverCard>
                ) : (
                  row
                )}
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
};
