import React from "react";
import { NeoStar } from "@/components/icons";
import { cn } from "@/lib/utils";

type Props = { className?: string; live?: boolean };

/**
 * Neo's mark: the solid star, white on the brand indigo — the same star the
 * sidebar and Neo's home draw bare (19 Oct 2026; was an N). While a run is
 * live, a ring turns round the mark — the one piece of motion that says
 * "working", visible from anywhere on the screen.
 */
const NeoMark = ({ className, live }: Props) => (
  <span
    aria-hidden
    className={cn(
      "relative grid h-7 w-7 flex-none place-items-center rounded-lg bg-primary text-primary-foreground",
      className
    )}
  >
    <NeoStar className="h-[62%] w-[62%]" />
    {live && (
      <span className="absolute -inset-1 animate-spin rounded-xl border-2 border-transparent border-t-border [animation-duration:1.6s] motion-reduce:animate-none" />
    )}
  </span>
);

export default NeoMark;
