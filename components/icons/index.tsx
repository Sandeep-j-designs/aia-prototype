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
  FileSpreadsheet,
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
/**
 * Neo's connection mark: two equal ledger columns joined into a rounded N.
 * One colour and generous gaps keep it readable at
 * toolbar sizes. Keep the export name for existing Neo consumers.
 */
export const NeoStar = make(
  "NeoStar",
  <path
    d="M5 19V6.2C5 4.9 5.8 4.6 6.6 5.6L17.4 18.4C18.2 19.4 19 19.1 19 17.8V5"
    strokeWidth={3.4}
  />
);

/*
 * Neo's own tabs (21 Oct 2026), drawn for Neo only, from primitives on the
 * 24px grid at lucide's stroke so they sit with the rest. Chat: a speech
 * bubble holding Neo's connection mark. Agents: the seam — three sources (bank,
 * settlements, books) meeting in one node, as the onboarding draws it.
 */
export const NeoChat = make(
  "NeoChat",
  <>
    <path d="M6.5 4h11A3.5 3.5 0 0 1 21 7.5v6a3.5 3.5 0 0 1-3.5 3.5h-7L6.5 20.5V17A3.5 3.5 0 0 1 3 13.5v-6A3.5 3.5 0 0 1 6.5 4z" />
    <path d="M9 14V8L15 14V8" strokeWidth={1.7} />
  </>
);
export const NeoAgents = make(
  "NeoAgents",
  <>
    <path d="M3 6h3.5c3.5 0 4.5 6 8 6" />
    <path d="M3 12h11.5" />
    <path d="M3 18h3.5c3.5 0 4.5-6 8-6" />
    <circle cx="17" cy="12" r="2.5" fill="currentColor" fillOpacity={0.25} />
    <path d="M19.5 12H21" />
  </>
);
