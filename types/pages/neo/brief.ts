/**
 * The firm brief: Neo's home. Every client the accountant handles, ranked by
 * what needs a person before the next deadline. Read-only — each row opens
 * that client's own screen, where the work is done.
 *
 * DEV: GET /api/neo/brief — computed server-side across companies the user
 * has access to; camelCase as everywhere.
 */
export type BriefTone = "negative" | "notice" | "neutral";

export type BriefSignal = {
  id: string;
  /** "₹2.4L ITC at risk", "22 to review". */
  text: string;
  tone: BriefTone;
  /** Where the work behind it is. */
  href: string;
  /** The return it holds up: "3B · 20 Oct". */
  due?: string;
};

/** One kind of money waiting on a decision, never added to another kind. */
export type BriefPart = {
  id: "itc" | "waiting" | "overdue";
  /** "₹7.6L ITC", "₹38L waiting", "₹2L overdue". */
  label: string;
  amount: number;
};

export type BriefClient = {
  company: string;
  name: string;
  /** "GSTR-3B due 20 Oct · 7 days". */
  deadline: string;
  /**
   * The largest single amount needing a decision. Ranking only: ITC at risk,
   * bills waiting and money overdue are different things and are shown
   * apart (`parts`), never summed.
   */
  impact: number;
  /** Each kind of money, largest first. */
  parts: BriefPart[];
  signals: BriefSignal[];
  /** The one place to start, with its label. */
  next?: { label: string; href: string };
  clear: boolean;
};

export type FirmRest = { clients: number; note: string };

export type FirmBrief = {
  clients: BriefClient[];
  rest: FirmRest;
  /** "4 documents arrived · 1 reply to a chase · nothing posted". */
  overnight: string;
  needYou: number;
  total: number;
};
