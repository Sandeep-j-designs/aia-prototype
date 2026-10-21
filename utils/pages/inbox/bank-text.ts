/**
 * Bank narrations as words, for matching rules and documents against them.
 * "NACH-DR-BESCOM-DVG-88213" → "NACH DR BESCOM DVG 88213".
 */
export const normalise = (text: string) =>
  text
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter(Boolean)
    .join(" ");

/** Whether the narration carries these words, in order, as whole words. */
export const hasWords = (narration: string, words: string) => {
  const needle = normalise(words);
  return !!needle && ` ${normalise(narration)} `.includes(` ${needle} `);
};

/**
 * The words in a narration that are channel and bank plumbing, not who was
 * paid: the rail (NEFT, UPI…), the side, and the clerical tags.
 */
const PLUMBING = new Set([
  "NACH",
  "ACH",
  "DR",
  "CR",
  "D",
  "C",
  "NEFT",
  "RTGS",
  "IMPS",
  "UPI",
  "P2A",
  "P2M",
  "CHQ",
  "DEP",
  "PAID",
  "TRF",
  "TO",
  "POS",
  "INV",
  "PMT",
  "ATM",
  "WDL",
  "BILLDESK",
  "PAYMENT",
  "BULK",
  "UPLOAD",
]);

/**
 * The payee words a rule would key on: the first two words that are not
 * plumbing and carry no digits. "NACH-DR-BESCOM-DVG-88213" → "BESCOM DVG";
 * "IMPS-SRI LAKSHMI TRADERS-P2A-…" → "SRI LAKSHMI".
 */
export const narrationKey = (narration: string) =>
  normalise(narration)
    .split(" ")
    .filter((w) => w.length >= 3 && !/\d/.test(w) && !PLUMBING.has(w))
    .slice(0, 2)
    .join(" ");
