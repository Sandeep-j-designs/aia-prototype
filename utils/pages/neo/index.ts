/**
 * Formatting and prompt-reading helpers for Neo.
 *
 * The readers here are the scripted runtime's stand-in for a model: they pull
 * the few facts a task needs (an amount, a percentage, a document id, a name
 * out of a known list) from what the user typed. When the model arrives these
 * become its job and this half of the file goes.
 */

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** ₹12,34,567.89 — lakh grouping, always two decimals. */
export const money = (n: number) => inr.format(n || 0);

export const round2 = (n: number) => Math.round(n * 100) / 100;

/** DD-MM-YYYY, from an ISO date or date-time. */
export const day = (iso: string) => {
  const m = iso?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : iso || "—";
};

export const todayIso = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** "26-27" for any date in FY 2026-27 (April to March). */
export const fyShort = (iso = todayIso()) => {
  const [y, m] = iso.split("-").map(Number);
  const start = m >= 4 ? y : y - 1;
  return `${String(start).slice(2)}-${String(start + 1).slice(2)}`;
};

/* ------------------------------------------------------ prompt reading */

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Words that name a company's form rather than the company. */
const NOISE = new Set([
  "pvt",
  "ltd",
  "private",
  "limited",
  "llp",
  "co",
  "inc",
  "india",
  "the",
  "and",
  "services",
  "group",
]);

const keyWords = (name: string) =>
  norm(name)
    .split(" ")
    .filter((w) => w.length > 2 && !NOISE.has(w));

/**
 * The name from `names` the prompt mentions, if any. A name counts as
 * mentioned when every distinctive word of it appears — "theta" finds
 * "Theta Hotels Pvt Ltd", "nova" finds "Nova Logistics".
 */
export const findName = (prompt: string, names: string[]) => {
  const words = new Set(norm(prompt).split(" "));
  const scored = names
    .map((name) => {
      const keys = keyWords(name);
      const hits = keys.filter((k) => words.has(k)).length;
      return { name, score: keys.length ? hits / keys.length : 0, hits };
    })
    .filter((x) => x.hits > 0 && x.score >= 0.5)
    .sort((a, b) => b.score - a.score || b.hits - a.hits);
  return scored[0]?.name;
};

/** A document id typed into the prompt: INB-2042, NEO-SI-…, etc. */
export const findItemId = (prompt: string, ids: string[]) => {
  const upper = prompt.toUpperCase();
  return ids.find((id) => upper.includes(id.toUpperCase()));
};

/** "15%", "15 percent", "markup of 15". */
export const findPercent = (prompt: string) => {
  const m =
    prompt.match(/(\d+(?:\.\d+)?)\s*(?:%|percent|pc\b)/i) ||
    prompt.match(/markup (?:of )?(\d+(?:\.\d+)?)/i);
  return m ? Number(m[1]) : undefined;
};

/** "₹12,000", "12000", "12k", "1.5 lakh", "2 cr". */
export const findAmount = (prompt: string) => {
  const m = prompt.match(
    /(?:₹|rs\.?|inr)?\s*(\d[\d,]*(?:\.\d+)?)\s*(k|lakh|lakhs|lac|l|cr|crore)?\b/i
  );
  if (!m) return undefined;
  const base = Number(m[1].replace(/,/g, ""));
  const unit = (m[2] || "").toLowerCase();
  const mult =
    unit === "k"
      ? 1e3
      : ["lakh", "lakhs", "lac", "l"].includes(unit)
        ? 1e5
        : ["cr", "crore"].includes(unit)
          ? 1e7
          : 1;
  const value = base * mult;
  // A bare small number is a percentage or a count, not an amount.
  if (!unit && !/₹|rs|inr/i.test(m[0]) && value < 100) return undefined;
  return value;
};

export const has = (prompt: string, ...patterns: RegExp[]) =>
  patterns.some((p) => p.test(prompt));
