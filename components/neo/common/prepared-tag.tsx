import React from "react";
import { cn } from "@/lib/utils";

type Props = { className?: string };

/**
 * Marks a document Neo prepared, wherever it is listed. Neo prepares; the
 * person approves — the tag is what keeps that visible after the fact.
 */
const PreparedTag = ({ className }: Props) => (
  <span
    title="Prepared by Neo. Waiting for your approval."
    className={cn(
      "inline-flex h-4 flex-none items-center rounded-sm border border-border bg-accent px-1 text-body-4 font-semibold text-primary",
      className
    )}
  >
    Neo
  </span>
);

export default PreparedTag;
