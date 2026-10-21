import type { Notification } from "@/types/pages/notifications";

/**
 * "Just now", "12m", "3h", "Yesterday", then a date. Short, because it sits
 * on a meta line beside the module name.
 */
export const timeAgo = (iso: string, now = Date.now()) => {
  const at = new Date(iso);
  const mins = Math.floor((now - +at) / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24 && dayKey(at) === dayKey(new Date(now)))
    return `${hours}h ago`;
  const day = dayLabel(iso, now);
  if (day === "Yesterday") return "Yesterday";
  return at.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

/** Full date and time, for the tooltip on a relative time. */
export const fullTime = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

/** Today, Yesterday, or "12 Sep". The full page groups by these. */
export const dayLabel = (iso: string, now = Date.now()) => {
  const at = new Date(iso);
  const today = new Date(now);
  if (dayKey(at) === dayKey(today)) return "Today";
  const yesterday = new Date(now - 86_400_000);
  if (dayKey(at) === dayKey(yesterday)) return "Yesterday";
  return at.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: at.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
};

/** Consecutive runs of notices that share a day label. */
export const groupByDay = (items: Notification[], now = Date.now()) => {
  const groups: { label: string; items: Notification[] }[] = [];
  items.forEach((n) => {
    const label = dayLabel(n.createdAt, now);
    const last = groups.at(-1);
    if (last?.label === label) last.items.push(n);
    else groups.push({ label, items: [n] });
  });
  return groups;
};

/** "(3) AI Accountant" — the count the tab shows. */
export const titleWithCount = (title: string, count: number) => {
  // The browser trims a title, so the prefix is matched with or without
  // its space, and an empty title falls back to the product's name.
  const bare = title.replace(/^(\(\d+\+?\)\s*)+/, "").trim() || "AI Accountant";
  return count > 0 ? `(${count > 99 ? "99+" : count}) ${bare}` : bare;
};
