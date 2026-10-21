import * as React from "react";
import type { LucideIcon, LucideProps } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Icon names Neo uses, mapped onto lucide (Neo port from AIA 2.0, 21 Oct
 * 2026). AIA 2.0 draws these from its own set; this prototype keeps lucide,
 * so Neo's files import the same names from here and get lucide glyphs.
 * Only Neo's own marks are drawn here: the solid star and the AI sparkle.
 */
export type IconComponent = LucideIcon;
export type IconProps = LucideProps;
export type { LucideIcon, LucideProps };

export {
  ArrowDown,
  ArrowLeft,
  Clock,
  Settings,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  CircleAlert,
  CircleCheck,
  CirclePause,
  Copy,
  CornerDownLeft,
  Crosshair,
  Download,
  Ellipsis,
  FileStack,
  FileText,
  FolderTree,
  History,
  Inbox,
  ListFilter,
  Loader2,
  Lock,
  Mail,
  Maximize,
  MessageCircle,
  MessageSquare,
  MessageSquareText,
  PanelLeftClose,
  PanelLeftOpen,
  Pause,
  Pencil,
  Play,
  Plus,
  Receipt,
  RotateCcw,
  ScrollText,
  Search,
  ShieldCheck,
  Slash,
  Square,
  SquarePen,
  Stamp,
  Star,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  Undo2,
  Upload,
  UserRound,
  Wand2,
  X,
  BookText as Ledger,
} from "lucide-react";

function make(name: string, glyph: React.ReactNode): LucideIcon {
  const Icon = React.forwardRef<SVGSVGElement, LucideProps>(
    (
      {
        size = 24,
        strokeWidth = 2,
        color = "currentColor",
        absoluteStrokeWidth: _absolute,
        className,
        ...rest
      },
      ref
    ) => (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden={rest["aria-label"] ? undefined : true}
        focusable="false"
        className={cn("lucide", className)}
        {...rest}
      >
        {glyph}
      </svg>
    )
  );
  Icon.displayName = name;
  return Icon as LucideIcon;
}

/** Lucide "sparkles", duotone: the star carries a soft fill under its stroke. */
export const SPARKLE_PATH =
  "M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z";
export const SPARKLE_ACCENTS = "M20 3v4M22 5h-4M4 17v2M5 18H3";
/** The mark for a value the AI decided. */
export const Sparkle = make(
  "Sparkle",
  <>
    <path d={SPARKLE_PATH} fill="currentColor" fillOpacity={0.22} />
    <path d={SPARKLE_ACCENTS} />
  </>
);
export const Sparkles = Sparkle;
export const AiMark = Sparkle;
/** Neo's mark: the sparkle's star, solid, without its accents. Neo only. */
export const NeoStar = make(
  "NeoStar",
  <path d={SPARKLE_PATH} fill="currentColor" stroke="none" />
);
