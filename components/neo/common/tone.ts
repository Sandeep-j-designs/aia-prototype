import type { NeoTone } from "@/types/pages/neo";

/** Status grounds for list groups. Colour is never the only signal: each
 *  group also carries its label. */
export const TONE: Record<NeoTone, string> = {
  positive: "bg-success-green text-success-green-foreground",
  notice: "bg-warning text-warning-foreground",
  negative: "bg-destructive text-destructive-foreground",
  neutral: "bg-section text-muted-foreground",
};
