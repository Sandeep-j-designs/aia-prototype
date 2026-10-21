import type { CollectionDryRunRow } from "@/types/pages/inbox/sources";

/**
 * Neo — the in-app agent.
 *
 * These are the contracts between the agent runtime and the panel that draws
 * it. They are shaped as the stream a real agent backend would send: a run
 * emits steps, questions and cards, and waits on the user where a card or a
 * question needs an answer. The prototype's scripted runtime produces exactly
 * these, so swapping it for a model changes where the events come from, not
 * what they are.
 *
 * DEV: POST /api/neo/runs streams `NeoEvent`s (SSE); the user's answers go
 * back on POST /api/neo/runs/:id/replies. camelCase here, as everywhere.
 */

/**
 * How much a tool call can change, which decides how much Neo asks.
 *
 * - read     — answers and lists. No confirmation.
 * - draft    — creates or edits work that is not yet approved. Previewed,
 *              applied on one key, undoable.
 * - commit   — approval, and anything that syncs to Tally. Neo never does this
 *              on its own; the user's keypress is the approval.
 * - external — anything that leaves the company: messages to vendors or
 *              customers. Shown verbatim, sent only on the user's say-so.
 */
export type NeoRisk = "read" | "draft" | "commit" | "external";

/** A record the agent is pointing at — a citation, or a place to go. */
export type NeoRef = {
  label: string;
  /** Open it in this client: the company is switched first. */
  company?: string;
  href?: string;
  itemId?: string;
  /** "open" goes to the record; "inbox" shows its row in the queue. */
  target?: "open" | "inbox";
};

export type NeoStepStatus = "running" | "done" | "failed";

export type NeoStep = {
  id: string;
  label: string;
  status: NeoStepStatus;
  cite?: NeoRef;
  /** Epoch ms the step started and landed, for "Worked for 1.4s". */
  startedAt?: number;
  endedAt?: number;
};

export type NeoOption = {
  id: string;
  label: string;
  hint?: string;
};

/**
 * One question on a decision sheet (20 Oct 2026). Neo works out everything
 * it needs before asking, pre-picks its recommendation, and folds the ones
 * the books already settle; the person confirms the lot with one click.
 */
export type NeoDecisionItem = {
  id: string;
  /** The question's tab, a word or two: "LLP transfer", "Swiggy ₹10". */
  header?: string;
  /** One line: what Neo needs to know. */
  question: string;
  /** Why it's asking, folded under the question. */
  why?: string;
  /** Recommended first. */
  options: NeoOption[];
  /** The answer Neo recommends; the sheet opens on it. */
  recommended: string;
  /** The current answer; starts as `recommended`. */
  pick: string;
  /**
   * Set when the books settle it ("Collections tie on every day"): the
   * question folds under "Settled from your books" and opens on Change.
   */
  settled?: string;
  /** Shown only while another item's pick is one of these: "Which Drive folder?" waits for Drive. */
  when?: { id: string; in: string[] };
  /**
   * "Something else": an answer in your own words. The task gets `fallback`
   * as the pick (suspense, carry) and the words as a note.
   */
  other?: { fallback: string; placeholder?: string };
  /** Your words, when you answered "Something else". */
  note?: string;
};

export type NeoAsk = {
  question: string;
  options: NeoOption[];
  /** Answered in words: the field's placeholder. Options become fills. */
  input?: { placeholder: string };
  /** The option picked, once answered. The question stays on screen. */
  answer?: string;
};

export type NeoVoucherLine = {
  ledger: string;
  side: "Dr" | "Cr";
  amount: number;
  /** Chosen by Neo rather than read off the source. Highlighted. */
  inferred?: boolean;
};

export type NeoTone = "neutral" | "positive" | "notice" | "negative";

export type NeoCard =
  | {
      kind: "voucher";
      voucherType: string;
      state: "Preview" | "Draft created";
      voucherNo: string;
      party: string;
      date: string;
      lines: NeoVoucherLine[];
      why?: string;
      source?: NeoRef;
      company?: string;
      assumptions?: string[];
      evidence?: NeoRef[];
      items?: { description: string; cost: number; amount: number }[];
    }
  | {
      kind: "list";
      title: string;
      /**
       * Set by a task whose list hands drafts over for review: the set's
       * name ("Collection run"). Each listed bill then opens as a subtask
       * of this chat (utils/pages/neo/review-sets.ts).
       */
      review?: string;
      groups: {
        label: string;
        tone: NeoTone;
        rows: {
          itemId: string;
          primary: string;
          secondary?: string;
          amount?: number;
        }[];
      }[];
    }
  | {
      kind: "diff";
      title: string;
      field: string;
      rows: {
        itemId: string;
        party: string;
        from: string;
        to: string;
        amount: number;
      }[];
    }
  | {
      /**
       * Change by rule: one instruction over many records, signed off once.
       * The person can untick rows; Neo pre-unticks the ones it doubts and
       * says why. Applying it edits drafts only — approved records are never
       * in the set, and are counted so the person knows they were left alone.
       */
      kind: "changeset";
      title: string;
      /** The rule in words: "vendor = Mahindra Logistics Ltd · ledger = …". */
      rule: string;
      field: "Ledger" | "Cost centre";
      /** "Move" or "Tag" — the verb on the sign-off button. */
      verb: string;
      company: string;
      /** Records the rule matched that are approved, so left untouched. */
      approvedSkipped: number;
      rows: NeoChangeRow[];
    }
  | {
      /**
       * A batch of vouchers Neo is entering (Neo voucher entry). The card
       * draws the batch from its store, so what it shows is always the
       * batch as it stands; `view` is which step this card is.
       */
      kind: "batch";
      batchId: string;
      view: "settings" | "register" | "drafts";
    }
  | {
      /**
       * Three-way reconciliation (20 Oct 2026). The card reads the policy
       * or the run live from the recon store; `view` is which step it is.
       */
      kind: "recon";
      company: string;
      runId?: string;
      view:
        | "policy"
        | "reports"
        | "payouts"
        | "sales"
        | "bank"
        | "register"
        | "drafts"
        | "close"
        | "rules";
    }
  | {
      /**
       * Document Collection's setup card. It reads the setup live from the
       * collection store (the draft while setting up, the saved one after),
       * so a field edited on the card and an answer in the chat land in the
       * same place.
       */
      kind: "collection-setup";
      company: string;
    }
  | {
      /**
       * What collecting would do over the backfill, with nothing created.
       * Live while setting up; `rows` freezes it once the setup is saved.
       */
      kind: "collection-dry-run";
      company: string;
      rows?: CollectionDryRunRow[];
    }
  | {
      /**
       * An agent Neo set up with the person (Neo › Agents). What it watches,
       * when it runs and how far it may go — never further than a draft.
       */
      kind: "agent";
      agentId: string;
      name: string;
      description: string;
      trigger: string;
      permission: "flag" | "draft";
      checks: string[];
      state: "Preview" | "Saved as draft" | "Scheduled";
    }
  | {
      kind: "decisions";
      /** What the answers are for: "Before I draft September". */
      title: string;
      items: NeoDecisionItem[];
    }
  | {
      kind: "message";
      channel: "WhatsApp" | "Email";
      to: string;
      body: string;
      /**
       * WhatsApp outside a reply window goes as an approved template, so
       * the wording is fixed except for its fields; the card says which.
       */
      template?: string;
    }
  | {
      /**
       * A long-running workflow, drawn as stages with live counters and a
       * running log. Updated in place as the run moves.
       */
      kind: "pipeline";
      title: string;
      startedAt: number;
      finishedAt?: number;
      stages: NeoStage[];
      log: NeoLogLine[];
    };

export type NeoChangeRow = {
  itemId: string;
  label: string;
  from: string;
  to: string;
  amount: number;
  checked: boolean;
  /** Why Neo left this one unticked. */
  doubt?: string;
};

export type NeoStageStatus = "waiting" | "active" | "done" | "held";

export type NeoStage = {
  id: string;
  label: string;
  status: NeoStageStatus;
  /** "4 clean · 1 duplicate · 1 blocked" — what the stage has found. */
  detail?: string;
};

export type NeoLogLine = {
  id: string;
  at: number;
  text: string;
  itemId?: string;
  tone?: NeoTone;
};

/** How Neo marks a row in the lists while a run is working on it. */
export type NeoPresenceState = "working" | "done" | "held";

export type NeoAction = {
  id: string;
  label: string;
  primary?: boolean;
  risk?: NeoRisk;
};

/** A file sent with a request; `docId` when the prototype can read it. */
export type NeoAttachment = { name: string; docId?: string };

export type NeoMessage = {
  id: string;
  role: "user" | "neo";
  /** Files the user sent with this message. */
  attachments?: NeoAttachment[];
  /** Inbox documents picked for this message (+ › Pick from Inbox). */
  records?: string[];
  runId?: string;
  /**
   * The bill this message is about, when it was asked from that bill's
   * subtask in a batch chat. Neo's replies inherit it from their run
   * (`scopeOf` in the runtime). Unset = the chat itself.
   */
  scope?: string;
  text?: string;
  steps?: NeoStep[];
  ask?: NeoAsk;
  card?: NeoCard;
  actions?: NeoAction[];
  /** The action taken on this card, once decided. Locks its buttons. */
  chosen?: string;
  links?: NeoRef[];
  /** Prompts offered as one-tap follow-ups; picking one sends it. */
  suggestions?: string[];
  /**
   * The run ended here because it was stopped: why, and how many records it
   * had already changed. Continue is offered only when that is none.
   */
  stopped?: { reason: string; touched: number; company: string };
  /** Neo is still writing this text; the reader shows it arriving. */
  streaming?: boolean;
  /** The person's rating of this answer, and what they said was wrong. */
  feedback?: { value: "up" | "down"; note?: string };
  /**
   * A user message that has been edited or retried keeps every version of
   * itself with the conversation that followed it; `version` is the one on
   * screen. The live version's `after` is the messages below it, not this.
   */
  versions?: NeoVersion[];
  version?: number;
};

/** One version of a user turn: what was asked and what followed. */
export type NeoVersion = {
  text: string;
  attachments?: NeoAttachment[];
  after: NeoMessage[];
};

export type NeoRunStatus =
  | "running"
  | "needs-you"
  | "done"
  | "partial"
  | "waiting"
  | "failed"
  | "stopped"
  | "undone";

export type NeoRun = {
  id: string;
  context: NeoContext;
  title: string;
  status: NeoRunStatus;
  startedAt: string;
  /** Records this run created or changed, for Undo and for the Runs tab. */
  touched: string[];
  summary?: string;
  undoable: boolean;
};

/**
 * What the conversation is about so far: the last answer's subject, period
 * and records, so a follow-up ("and August?", "move them to Freight
 * Inward") means what it would mean to a colleague. Shown as a chip in the
 * prompt box; × clears it, which is "new topic".
 *
 * DEV: with a model this is the conversation history it already sees; the
 * chip stays, as the visible statement of what Neo thinks "it" is.
 */
export type NeoFrame = {
  /** The task that set it. */
  task: string;
  company: string;
  kind: "spend" | "top" | "overdue" | "masters" | "move" | "chase" | "freight";
  vendor?: string;
  ledger?: string;
  /** A word searched across ledgers and descriptions: "freight". */
  topic?: string;
  period?: { phrase: string; label: string };
  /** Only approved, or only waiting, records were counted. */
  status?: "open" | "approved";
  /** The records the answer was about. */
  ids?: string[];
  /** The chip: "Mahindra Logistics Ltd · September 2026". */
  label: string;
};

/** What "this" means when the user types it. */
export type NeoContext = {
  company?: string;
  /** The record open on screen. */
  itemId?: string;
  /** Rows ticked in a list. */
  selectedIds: string[];
  /** Which register is on screen, if any. */
  module?: "AP" | "AR" | "JV";
};

/**
 * The runtime's side of a task: what a scripted task (or, later, the model's
 * tool calls) can do to the conversation.
 */
export type NeoTaskApi = {
  outcome: (status: "done" | "partial" | "waiting" | "needs-you") => void;
  runId: string;
  prompt: string;
  /** Files sent with the request. */
  attachments: NeoAttachment[];
  context: NeoContext;
  signal: AbortSignal;
  focus: (itemId: string) => void;
  say: (text: string, links?: NeoRef[]) => Promise<void>;
  /** Offer follow-up requests as one-tap chips once the run is done. */
  suggest: (prompts: string[]) => void;
  /** What this answer was about, for the next message to follow on from. */
  remember: (frame: Omit<NeoFrame, "task" | "company">) => void;
  /**
   * A question answered in words, not picked: an amount, a phone number.
   * `parse` turns the reply into the value, or undefined to ask again with
   * `retry`. `options` are one-tap fills. The prompt box answers it too.
   */
  askText: (
    question: string,
    opts: {
      placeholder: string;
      options?: NeoOption[];
      parse?: (text: string) => string | undefined;
      retry?: string;
    }
  ) => Promise<string>;
  step: (label: string, cite?: NeoRef) => Promise<(label?: string) => void>;
  fail: (label: string) => void;
  ask: (question: string, options: NeoOption[]) => Promise<string>;
  card: (card: NeoCard, actions: NeoAction[]) => Promise<string>;
  /** Show a card that doesn't wait on the user; returns its updater. */
  show: (card: NeoCard, opts?: { open?: boolean }) => (card: NeoCard) => void;
  /** Replace the last card in place — a preview that becomes a result. */
  updateCard: (card: NeoCard, actions?: NeoAction[]) => void;
  touch: (ids: string[]) => void;
  onUndo: (undo: () => { reversed: string[]; skipped: string[] }) => void;
  /** Hand off to another task, as if the user had asked for it. */
  chain: (prompt: string) => Promise<void>;
  wait: (ms: number) => Promise<void>;
  /** Wait here while the user has the run paused. */
  checkpoint: () => Promise<void>;
  /** Mark rows in the on-screen lists; null clears a row. */
  presence: (ids: string[], state: NeoPresenceState | null) => void;
  /** The one-line status the workspace strip shows while a run is live. */
  status: (
    text: string | null,
    progress?: { done: number; total: number }
  ) => void;
  navigate: (path: string) => Promise<void>;
};

export type NeoTask = {
  id: string;
  title: string;
  /** Whether this task answers the prompt, and how strongly. 0 is no. */
  match: (
    prompt: string,
    context: NeoContext,
    attachments?: NeoAttachment[]
  ) => number;
  run: (api: NeoTaskApi) => Promise<string | void>;
};

/**
 * One conversation in Neo's Recent chats. The page and the docked panel show
 * the same current chat; New chat files it here.
 *
 * DEV: GET /api/neo/chats (titles), GET /api/neo/chats/:id (messages).
 */
export type NeoChat = {
  id: string;
  /** The company it was asked in; Neo lists only the top bar's company's. */
  company: string;
  title: string;
  updatedAt: string;
  messages: NeoMessage[];
  starred?: boolean;
  /** Renamed by the person: the automatic title never overwrites it. */
  named?: boolean;
};
