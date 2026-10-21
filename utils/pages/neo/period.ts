import { DEMO_TODAY } from "@/utils/pages/inbox/ai-calculations";

/**
 * Periods as an accountant says them: "September", "last month", "Q2",
 * "this quarter", "this FY", "till date". Quarters are the Indian financial
 * year's (Q1 is April to June), and "today" is the prototype's one clock,
 * DEMO_TODAY, so a period means the same thing on every screen.
 *
 * DEV: the model reads periods itself; this stays as the server's resolver
 * from a period phrase to a date range for query_ledger.
 */
export type Period = {
  /** Inclusive ISO dates. */
  from: string;
  to: string;
  /** "September 2026", "Q2 (Jul–Sep)", "FY 26-27 to date". */
  label: string;
  /** What the person typed that named it, for a follow-up to replace. */
  phrase: string;
};

const MONTHS = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const SHORT = MONTH_NAMES.map((m) => m.slice(0, 3));

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const lastDay = (y: number, m: number) => new Date(y, m + 1, 0).getDate();

/** "Today" for the prototype, as year and month index. */
const now = () => ({
  y: DEMO_TODAY.getFullYear(),
  m: DEMO_TODAY.getMonth(),
  d: DEMO_TODAY.getDate(),
});

/** The FY that a calendar month falls in starts in this year. */
const fyStart = (y: number, m: number) => (m >= 3 ? y : y - 1);

const month = (y: number, m: number, phrase: string): Period => ({
  from: iso(y, m, 1),
  to: iso(y, m, lastDay(y, m)),
  label: `${MONTH_NAMES[m]} ${y}`,
  phrase,
});

/** FY quarter q (1–4) of the FY starting in April of `start`. */
const quarter = (start: number, q: number, phrase: string): Period => {
  const m0 = 3 + (q - 1) * 3; // Apr, Jul, Oct, Jan
  const y = start + Math.floor(m0 / 12);
  const m = m0 % 12;
  return {
    from: iso(y, m, 1),
    to: iso(y, m + 2, lastDay(y, m + 2)),
    label: `Q${q} (${SHORT[m]}–${SHORT[m + 2]})`,
    phrase,
  };
};

/**
 * The period a request names, if it names one. A bare month later in the
 * year than today is last year's ("December" in October is last December).
 */
export const parsePeriod = (text: string): Period | undefined => {
  const p = text.toLowerCase();
  const t = now();
  const fy = fyStart(t.y, t.m);

  let m: RegExpMatchArray | null;
  if ((m = p.match(/\b(last|previous|prev) month\b/))) {
    const back = new Date(t.y, t.m - 1, 1);
    return month(back.getFullYear(), back.getMonth(), m[0]);
  }
  if ((m = p.match(/\b(this|current) month\b|\bmtd\b/)))
    return { ...month(t.y, t.m, m[0]), to: iso(t.y, t.m, t.d) };
  if ((m = p.match(/\b(last|previous) quarter\b/))) {
    const q = Math.floor(((t.m + 9) % 12) / 3) + 1;
    return q === 1 ? quarter(fy - 1, 4, m[0]) : quarter(fy, q - 1, m[0]);
  }
  if ((m = p.match(/\b(this|current) quarter\b|\bqtd\b/))) {
    const q = Math.floor(((t.m + 9) % 12) / 3) + 1;
    return quarter(fy, q, m[0]);
  }
  if ((m = p.match(/\bq([1-4])\b/))) return quarter(fy, Number(m[1]), m[0]);
  if (
    (m = p.match(
      /\b(this|current) (fy|financial year|year)\b|\bytd\b|\btill date\b|\bto date\b|\bso far\b/
    ))
  )
    return {
      from: iso(fy, 3, 1),
      to: iso(t.y, t.m, t.d),
      label: `FY ${String(fy).slice(2)}-${String(fy + 1).slice(2)} to date`,
      phrase: m[0],
    };
  if ((m = p.match(/\b(last|previous) (fy|financial year|year)\b/)))
    return {
      from: iso(fy - 1, 3, 1),
      to: iso(fy, 2, 31),
      label: `FY ${String(fy - 1).slice(2)}-${String(fy).slice(2)}`,
      phrase: m[0],
    };
  if (
    (m = p.match(
      /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)(?:uary|ruary|ch|il|e|y|ust|t|tember|ober|ember)?\b(?:\s*'?(\d{2,4})\b)?/
    ))
  ) {
    // "may" alone is usually the verb; only take it with a year or "in".
    if (m[1] === "may" && !m[2] && !/\bin may\b/.test(p)) return undefined;
    const idx = MONTHS.indexOf(m[1]);
    const y = m[2]
      ? Number(m[2].length === 2 ? `20${m[2]}` : m[2])
      : idx > t.m
        ? t.y - 1
        : t.y;
    return month(y, idx, m[0]);
  }
  return undefined;
};

/** A document date as ISO, from "2026-09-10", "10 Sep 2026" or "10-Sep-26". */
export const isoDate = (s?: string) => {
  if (!s) return "";
  const a = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (a) return `${a[1]}-${a[2]}-${a[3]}`;
  const b = s.match(/^(\d{1,2})[\s-]([A-Za-z]{3})[a-z]*[\s-](\d{2,4})/);
  if (b) {
    const m = MONTHS.indexOf(b[2].toLowerCase());
    if (m < 0) return "";
    const y = b[3].length === 2 ? `20${b[3]}` : b[3];
    return `${y}-${pad(m + 1)}-${pad(Number(b[1]))}`;
  }
  return "";
};

export const inPeriod = (date: string | undefined, p?: Period) => {
  if (!p) return true;
  const d = isoDate(date);
  return !!d && d >= p.from && d <= p.to;
};

/** " in September 2026", or nothing. For the end of a sentence. */
export const periodPhrase = (p?: Period) => (p ? ` in ${p.label}` : "");
