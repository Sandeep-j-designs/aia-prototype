import React, { useEffect, useRef, useState } from "react";
import { Tooltip } from "@/components/common/tooltip";

/**
 * A tooltip that only appears when its text is cut off.
 *
 * Production: components/common/smart-tooltip.tsx — ported so the
 * organisation drawer reads the same; delete on transplant.
 */
export function SmartTooltip({
  message,
  children,
  clampedline,
  className,
}: {
  message: string;
  children: React.ReactNode;
  clampedline?: boolean;
  /**
   * Prototype addition: classes for the wrapper, so it can shrink inside a
   * flex row (min-w-0) instead of holding the row open at the text's width.
   */
  className?: string;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isTextTruncated, setIsTextTruncated] = useState(false);

  useEffect(() => {
    const checkTruncation = () => {
      const textElement = contentRef.current?.firstElementChild;
      if (!textElement) return;
      const isOverflowing = textElement.scrollWidth > textElement.clientWidth;
      const isLineClamped = textElement.scrollHeight > textElement.clientHeight;
      setIsTextTruncated(
        clampedline ? isOverflowing || isLineClamped : isOverflowing
      );
    };

    checkTruncation();
    window.addEventListener("resize", checkTruncation);

    return () => window.removeEventListener("resize", checkTruncation);
  }, [message]);

  if (!isTextTruncated) {
    return (
      <div ref={contentRef} className={className}>
        {children}
      </div>
    );
  }

  return (
    <Tooltip message={message} className="whitespace-normal break-all">
      <div ref={contentRef} className={className}>
        {children}
      </div>
    </Tooltip>
  );
}
