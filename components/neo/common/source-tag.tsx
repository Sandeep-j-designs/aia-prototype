import React from "react";
import { AiMark } from "@/components/inbox/v2/ai-mark";
import type { BatchSource } from "@/types/pages/neo/batch";
import { cn } from "@/lib/utils";

const WORDS: Record<BatchSource, string> = {
  doc: "Document",
  instruction: "Your instruction",
  master: "Master",
  rule: "Rule",
  neo: "Neo",
};

const SHORT: Record<BatchSource, string> = {
  doc: "Doc",
  instruction: "Yours",
  master: "Master",
  rule: "Rule",
  neo: "Neo",
};

type Props = {
  source: BatchSource;
  reason?: string;
  className?: string;
  /** One word, for table cells. */
  short?: boolean;
};

/**
 * Where a value came from. Four sources are plain words; Neo's own choice
 * gets the AI mark instead, because it is the one the accountant should
 * check — the same rule the review form follows.
 */
const SourceTag = ({ source, reason, className, short }: Props) =>
  source === "neo" ? (
    <AiMark
      reason={reason || "Neo chose this; check it"}
      className={className}
    />
  ) : (
    <span
      className={cn(
        "inline-flex h-5 flex-none items-center rounded-xs px-1.5 text-body-4 font-medium",
        source === "instruction"
          ? "bg-pi-brand-tint text-pi-brand"
          : "bg-pi-fill text-pi-body",
        className
      )}
      title={short ? WORDS[source] : undefined}
    >
      {short ? SHORT[source] : WORDS[source]}
    </span>
  );

export default SourceTag;
