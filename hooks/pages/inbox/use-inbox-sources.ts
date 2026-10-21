import { useSyncExternalStore } from "react";
import {
  getState,
  itemFromMock,
  neoCreate,
  neoLog,
  sourceFailure,
  neoReplaceFailed,
} from "@/components/inbox/v2/store";
import { logActivity } from "@/hooks/pages/inbox/use-activity";
// DEV: direct fetch GET /api/inbox/sources/:id/candidates. Fixture hashes stand
// in for server-computed content hashes, never a model's duplicate judgement.
import {
  mockSourceCandidates,
  mockClearerSourceCopy,
  SOURCE_SCOPES,
  MOCK_SOURCE_CONTACT,
} from "@/config/pages/inbox/mock-sources";
import type {
  InboxSource,
  SourceCandidate,
  SourceProvider,
  SourceReceipt,
  SourceRequest,
  CollectionAgent,
  CollectionBackfill,
  CollectionChannel,
  CollectionDryRunRow,
  CollectionRun,
  CollectionSetup,
  AgentRunMode,
} from "@/types/pages/inbox/sources";
import { DEMO_TODAY } from "@/utils/pages/inbox/ai-calculations";

type State = {
  /** Setups being made in Neo's chat, one per company, until saved. */
  drafts: { company: string; setup: CollectionSetup }[];
  agents: CollectionAgent[];
  runs: CollectionRun[];
  sources: InboxSource[];
  receipts: SourceReceipt[];
  busy: string[];
  requests: SourceRequest[];
};
const empty: State = {
  drafts: [],
  sources: [],
  receipts: [],
  busy: [],
  requests: [],
  agents: [],
  runs: [],
};
const stopped = new Set<string>();
let state = empty;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((fn) => fn());
const set = (next: State) => {
  state = next;
  emit();
};
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};
export const getSourceState = () => state;
export const useInboxSources = () =>
  useSyncExternalStore(subscribe, getSourceState, () => empty);
const guard = (company: string) => {
  if (getState().company !== company)
    throw new Error(
      "Organisation changed. Start a new task in the current organisation."
    );
};
export const collectionAgent = (company: string): CollectionAgent =>
  state.agents.find((a) => a.company === company) || {
    company,
    configured: false,
    runMode: "on-demand",
    paused: false,
  };
// DEV: direct fetch PUT /api/agents/document-collection/configuration.
export const configureCollectionAgent = (
  company: string,
  runMode: AgentRunMode,
  paused = false
) => {
  guard(company);
  if (!["continuous", "on-demand"].includes(runMode))
    throw new Error("Choose a valid run mode.");
  const agent: CollectionAgent = {
    ...collectionAgent(company),
    company,
    configured: true,
    runMode,
    paused: runMode === "continuous" && paused,
  };
  set({
    ...state,
    agents: [...state.agents.filter((a) => a.company !== company), agent],
  });
  logActivity({
    company,
    actor: { kind: "person", name: "You" },
    kind: "rule",
    module: "Inbox",
    action: "Updated Document Collection agent",
    subject: runMode === "continuous" ? "Continuous" : "On demand",
    reason: agent.paused
      ? "Future background collection paused; existing task is unaffected."
      : "Run mode changed explicitly in Agents. Approval and sending still require confirmation.",
  });
};
export const shouldWatchSources = (company: string) => {
  const agent = collectionAgent(company);
  return (
    agent.configured &&
    agent.runMode === "continuous" &&
    !agent.paused &&
    !state.busy.includes(company) &&
    state.sources.some((s) => s.company === company && s.status === "connected")
  );
};
export const stopCollection = (company: string) => {
  guard(company);
  stopped.add(company);
};
export const previewSource = (
  company: string,
  provider: SourceProvider,
  scope: string,
  since: string
) =>
  mockSourceCandidates(company)
    .map((x) =>
      state.requests.some(
        (r) =>
          r.company === company &&
          r.candidateKey === x.key &&
          r.status === "received"
      )
        ? mockClearerSourceCopy(x)
        : x
    )
    .filter(
      (x) =>
        x.provider === provider &&
        x.received >= since &&
        (!scope.endsWith("Freight") ||
          x.document.vendor === "Mahindra Logistics Ltd")
    );

// DEV: POST /api/inbox/sources delegates read + draft preparation only. OAuth
// tokens and access checks belong on the server; never in this browser store.
export const connectSource = (
  company: string,
  provider: SourceProvider,
  scope: string,
  since: string,
  options?: { account?: string; id?: string }
) => {
  guard(company);
  if (
    !SOURCE_SCOPES[provider].includes(scope) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(since)
  )
    throw new Error("Choose a valid source scope and start date.");
  const id =
    options?.id ||
    `source-${company}-${provider}${options?.account ? `-${options.account}` : ""}`;
  if (
    options?.id &&
    !state.sources.some((s) => s.id === options.id && s.company === company)
  )
    throw new Error("Connection unavailable in this organisation.");
  const previous = state.sources.find((s) => s.id === id);
  const source: InboxSource = {
    ...previous,
    id,
    company,
    provider,
    scope,
    since,
    status: "connected",
    account:
      options?.account ||
      (provider === "WhatsApp Business"
        ? "Registered business number · demo"
        : `accounts@${getState().companies.find((c) => c.id === company)?.slug}.example`),
  };
  set({
    ...state,
    sources: [...state.sources.filter((s) => s.id !== id), source],
  });
  logActivity({
    company,
    actor: { kind: "person", name: "You" },
    kind: "rule",
    module: "Inbox",
    action: "Saved simulated source connection",
    subject: provider,
    reason: `${scope} · from ${since} · prepare drafts only`,
  });
  return source;
};
export const setSourceStatus = (id: string, status: InboxSource["status"]) => {
  const source = state.sources.find((s) => s.id === id);
  if (!source) return;
  guard(source.company);
  set({
    ...state,
    sources: state.sources.map((s) => (s.id === id ? { ...s, status } : s)),
  });
  logActivity({
    company: source.company,
    actor: { kind: "person", name: "You" },
    kind: "rule",
    module: "Inbox",
    action: `Collection ${status}`,
    subject: source.provider,
    reason: "Existing documents and source history are retained.",
  });
};

/** Shared by the session watcher and Neo: one company lock, exact-content
 * dedup, durable receipts at each completed step, and no approval calls.
 * DEV: POST /api/inbox/collection-tasks; execute in a server worker with a
 * unique company+contentHash constraint and transactional receipt writes.
 */
export const collectSources = async (
  company: string,
  runId: string,
  checkpoint: () => Promise<void>,
  report: (text: string) => void = () => {},
  onlySource?: string,
  onReceipt: (receipt: SourceReceipt) => void = () => {},
  trigger: "continuous" | "on-demand" = "on-demand"
) => {
  guard(company);
  if (!collectionAgent(company).configured)
    throw new Error("Set up Document Collection in Agents first.");
  if (state.busy.includes(company))
    throw new Error(
      "A collection is already running. Wait for it to finish, then retry."
    );
  const sources = state.sources.filter(
    (s) =>
      s.company === company &&
      s.status === "connected" &&
      (!onlySource || s.id === onlySource)
  );
  if (!sources.length) throw new Error("Connect or resume a source first.");
  if (trigger === "continuous" && !shouldWatchSources(company)) return [];
  stopped.delete(company);
  set({
    ...state,
    busy: [...state.busy, company],
    runs: [
      {
        id: runId,
        company,
        trigger,
        status: "running",
        startedAt: new Date().toISOString(),
        itemIds: [],
        summary: "Checking authorised sources",
      },
      ...state.runs,
    ],
  });
  const results: SourceReceipt[] = [];
  const finish = (status: CollectionRun["status"], summary: string) =>
    set({
      ...state,
      runs: state.runs.map((r) =>
        r.id === runId
          ? {
              ...r,
              status,
              summary,
              finishedAt: new Date().toISOString(),
              itemIds: [
                ...new Set(
                  results.flatMap((r) => (r.itemId ? [r.itemId] : []))
                ),
              ],
            }
          : r
      ),
    });
  try {
    for (const source of sources) {
      for (const candidate of previewSource(
        company,
        source.provider,
        source.scope,
        source.since
      )) {
        await checkpoint();
        guard(company);
        if (stopped.has(company)) throw new Error("Collection stopped by you");
        if (
          state.sources.find((s) => s.id === source.id)?.status !== "connected"
        )
          break;
        // Completed receipts survive retries, stops and concurrent requests.
        if (
          state.receipts.some(
            (r) =>
              r.company === company &&
              r.sourceId === source.id &&
              r.candidateKey === candidate.key
          )
        )
          continue;
        report(
          `Reading ${candidate.document.file.name} from ${source.provider}`
        );
        const existing = getState().items.find(
          (x) =>
            x.company === company &&
            x.file.hash === candidate.hash &&
            x.status !== "Failed"
        );
        const verdict = classify(
          candidate,
          collectionAgent(company).setup || OPEN_RULES,
          !!existing
        );
        const receipt: SourceReceipt = {
          company,
          sourceId: source.id,
          candidateKey: candidate.key,
          hash: candidate.hash,
          location: candidate.location,
          collectedAt: new Date().toISOString(),
          outcome: verdict.outcome,
          reason: verdict.reason,
        };
        // Skipped, and anything that isn't a bill, is recorded and never
        // drafted.
        if (verdict.outcome === "skipped" || candidate.kind !== "bill") {
          set({ ...state, receipts: [...state.receipts, receipt] });
          results.push(receipt);
          onReceipt(receipt);
          continue;
        }
        if (existing) {
          receipt.itemId = existing.id;
          neoLog("Linked another collection source", runId, existing, {
            reason: receipt.reason,
          });
        } else if (candidate.problem !== "unreadable") {
          const item = itemFromMock(candidate.document, 0);
          item.file.hash = candidate.hash;
          item.reason = receipt.reason;
          item.form.gst =
            getState().companies.find((c) => c.id === company)?.branches[0] ||
            "";
          item.routingAddress = "";
          if (candidate.problem === "missing-reference")
            item.form.invoiceNo = "";
          const created = getState().items.some(
            (x) =>
              x.id === item.id && x.company === company && x.status === "Failed"
          )
            ? neoReplaceFailed(item, runId)
            : neoCreate(item, runId);
          receipt.itemId = created.id;
        } else {
          const item = itemFromMock(candidate.document, 0);
          item.file.hash = candidate.hash;
          item.reason = receipt.reason;
          receipt.itemId = sourceFailure(item, runId).id;
        }
        set({ ...state, receipts: [...state.receipts, receipt] });
        results.push(receipt);
        onReceipt(receipt);
      }
      guard(company);
      set({
        ...state,
        sources: state.sources.map((s) =>
          s.id === source.id
            ? {
                ...s,
                lastChecked: new Date().toISOString(),
                summary: `${results.filter((r) => r.sourceId === s.id).length} new results on last check`,
              }
            : s
        ),
      });
    }
    finish(
      results.some(
        (r) => r.outcome === "failed" || r.outcome === "needs-decision"
      )
        ? "partial"
        : "completed",
      results.length
        ? `${results.filter((r) => r.outcome === "prepared").length} prepared · ${results.filter((r) => r.outcome === "linked").length} duplicates linked · ${results.filter((r) => r.outcome === "needs-decision" || r.outcome === "failed").length} need attention · ${results.filter((r) => r.outcome === "skipped").length} skipped`
        : "No new documents found"
    );
    return results;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Task interrupted";
    finish(
      /stop|abort|organisation changed/i.test(message) ? "stopped" : "failed",
      `${message || "Task stopped"} · ${results.length} completed results retained`
    );
    throw error;
  } finally {
    set({ ...state, busy: state.busy.filter((id) => id !== company) });
  }
};

// A failed receipt is deliberately retried only on user request; good results
// are never re-created. The same unreadable fixture honestly fails again.
export const retryFailedSources = (company: string) => {
  guard(company);
  if (state.busy.includes(company)) return;
  set({
    ...state,
    receipts: state.receipts.filter(
      (r) => r.company !== company || r.outcome !== "failed"
    ),
  });
};

export const sourceContact = () => MOCK_SOURCE_CONTACT;
export const requestSourceCopy = (
  receipt: SourceReceipt,
  runId: string,
  body: string
) => {
  guard(receipt.company);
  if (
    state.requests.some(
      (r) =>
        r.company === receipt.company &&
        r.candidateKey === receipt.candidateKey &&
        r.status === "waiting"
    )
  )
    return false;
  if (
    state.sources.find((s) => s.id === receipt.sourceId)?.status !== "connected"
  )
    throw new Error("Reconnect the source before requesting a copy.");
  set({
    ...state,
    requests: [
      ...state.requests,
      {
        company: receipt.company,
        sourceId: receipt.sourceId,
        candidateKey: receipt.candidateKey,
        runId,
        body,
        status: "waiting",
      },
    ],
  });
  logActivity({
    company: receipt.company,
    actor: { kind: "person", name: "You" },
    kind: "predicted",
    module: "Inbox",
    action: "Sent clearer-copy request (simulated)",
    subject: sourceContact(),
    reason: body,
  });
  return true;
};
export const receiveSourceReply = (runId: string) => {
  const request = state.requests.find(
    (r) => r.runId === runId && r.status === "waiting"
  );
  if (!request) return false;
  guard(request.company);
  set({
    ...state,
    requests: state.requests.map((r) =>
      r === request ? { ...r, status: "received" } : r
    ),
    receipts: state.receipts.filter(
      (r) =>
        !(
          r.company === request.company &&
          r.candidateKey === request.candidateKey &&
          r.outcome === "failed"
        )
    ),
  });
  logActivity({
    company: request.company,
    actor: { kind: "person", name: "You" },
    kind: "predicted",
    module: "Inbox",
    action: "Simulated supplier reply",
    subject: request.candidateKey,
    reason:
      "Clearer replacement is available for the next scoped collection check.",
  });
  return true;
};

/* ------------------------------------------------- setup in Neo's chat */

const KIND_WORD: Record<SourceCandidate["kind"], string> = {
  bill: "Bill",
  statement: "Bank statement",
  advice: "Payment advice",
  quote: "Quotation",
  newsletter: "Newsletter",
};

/** What collection did before setup had rules: every sender, bills only. */
const OPEN_RULES: CollectionSetup = {
  channels: [],
  senders: "anyone",
  files: "bills",
  backfill: "period",
  schedule: "manual",
  notify: "off",
  allowed: [],
  blocked: [],
  edited: [],
};

/**
 * One rule set for the dry run and the real collection, so what the dry run
 * promised is what a run does. Order: an excluded sender, then what the file
 * is, then who sent it, then duplicates, then what the bill is missing.
 */
const classify = (
  c: SourceCandidate,
  setup: CollectionSetup,
  duplicate: boolean
): Pick<CollectionDryRunRow, "outcome" | "reason" | "senderRule"> => {
  if (setup.blocked.includes(c.sender))
    return {
      outcome: "skipped",
      reason: "You excluded this sender",
      senderRule: "blocked",
    };
  if (c.kind !== "bill")
    return setup.files === "bills"
      ? { outcome: "skipped", reason: `${KIND_WORD[c.kind]}, not a bill` }
      : {
          outcome: "needs-decision",
          reason: `${KIND_WORD[c.kind]}, not a bill; held for you to file`,
        };
  if (
    !c.knownSender &&
    setup.senders === "known" &&
    !setup.allowed.includes(c.sender)
  )
    return {
      outcome: "skipped",
      reason: "Sender isn't one of your vendors or staff",
      senderRule: "unknown",
    };
  if (duplicate)
    return {
      outcome: "linked",
      reason: "Same file is already in your Inbox; linked, not drafted again",
    };
  if (c.problem === "unreadable")
    return {
      outcome: "failed",
      reason: "Attachment can't be read; a clearer copy is needed",
    };
  if (c.problem)
    return {
      outcome: "needs-decision",
      reason: "No supplier invoice number on the bill; add it before approving",
    };
  return { outcome: "prepared", reason: "Supplier bill; drafted for review" };
};

const isoDay = (d: Date) =>
  new Date(d.getTime() + 5.5 * 3600000).toISOString().slice(0, 10);

/** The first day a backfill collects from, relative to the demo's today. */
export const sinceFor = (backfill: CollectionBackfill) =>
  backfill === "period"
    ? "2026-09-01"
    : backfill === "30d"
      ? isoDay(new Date(DEMO_TODAY.getTime() - 30 * 86400000))
      : backfill === "fy"
        ? "2026-04-01"
        : isoDay(DEMO_TODAY);

export const BACKFILL_LABEL: Record<CollectionBackfill, string> = {
  period: "Start of this return period",
  "30d": "Last 30 days",
  fy: "Start of the financial year",
  new: "Only new from now",
};

const defaultSetup = (): CollectionSetup => ({
  ...OPEN_RULES,
  senders: "known",
  schedule: "15m",
  notify: "daily",
});

export const collectionDraft = (company: string) =>
  state.drafts.find((d) => d.company === company)?.setup;

/** Start setting up (or editing): from the saved setup, else defaults. */
export const startCollectionDraft = (company: string) => {
  const setup = structuredClone(
    collectionAgent(company).setup || defaultSetup()
  );
  setup.edited = [];
  set({
    ...state,
    drafts: [
      ...state.drafts.filter((d) => d.company !== company),
      { company, setup },
    ],
  });
  return setup;
};

/**
 * Change the draft. Neo's answers never overwrite a field the person edited
 * on the card (`edited`); the person's own edits always land.
 */
export const patchCollectionDraft = (
  company: string,
  patch: Partial<CollectionSetup>,
  byHand = false
) => {
  const draft = collectionDraft(company);
  if (!draft) return;
  const keys = Object.keys(patch) as (keyof CollectionSetup)[];
  const allowed = byHand
    ? patch
    : Object.fromEntries(
        keys.filter((k) => !draft.edited.includes(k)).map((k) => [k, patch[k]])
      );
  const setup: CollectionSetup = {
    ...draft,
    ...allowed,
    edited: byHand ? [...new Set([...draft.edited, ...keys])] : draft.edited,
  };
  set({
    ...state,
    drafts: state.drafts.map((d) =>
      d.company === company ? { company, setup } : d
    ),
  });
};

/** Add or update one channel on the draft. */
export const setDraftChannel = (
  company: string,
  channel: CollectionChannel
) => {
  const draft = collectionDraft(company);
  if (!draft) return;
  patchCollectionDraft(company, {
    // Keeps its place on the card when a channel goes pending → connected.
    channels: draft.channels.some((c) => c.provider === channel.provider)
      ? draft.channels.map((c) =>
          c.provider === channel.provider ? channel : c
        )
      : [...draft.channels, channel],
  });
};

export const discardCollectionDraft = (company: string) =>
  set({
    ...state,
    drafts: state.drafts.filter((d) => d.company !== company),
  });

/**
 * What collecting would do over the backfill, with nothing written: every
 * connected channel's files through the same rules a run uses. A file seen
 * on an earlier channel in the same pass counts as a duplicate.
 * DEV: POST /api/collection/dry-run
 */
export const dryRunCollection = (
  company: string,
  setup: CollectionSetup
): CollectionDryRunRow[] => {
  const since = sinceFor(setup.backfill);
  const seen = new Set<string>();
  const items = getState().items;
  return setup.channels
    .filter((ch) => ch.status === "connected")
    .flatMap((ch) => previewSource(company, ch.provider, ch.scope, since))
    .map((c) => {
      const duplicate =
        seen.has(c.hash) ||
        items.some(
          (x) =>
            x.company === company &&
            x.file.hash === c.hash &&
            x.status !== "Failed"
        );
      const verdict = classify(c, setup, duplicate);
      if (c.kind === "bill" && verdict.outcome !== "skipped") seen.add(c.hash);
      return {
        key: c.key,
        provider: c.provider,
        sender: c.sender,
        file: c.document.file.name,
        vendor: c.document.vendor || c.sender,
        amount: c.document.amount ?? 0,
        received: c.received,
        ...verdict,
      };
    });
};

/**
 * Save the draft: connect its channels, then either turn the agent on or
 * keep it as a draft that doesn't run.
 * DEV: POST /api/collection/setup
 */
export const commitCollectionSetup = (
  company: string,
  mode: "on" | "draft"
) => {
  guard(company);
  const setup = collectionDraft(company);
  if (!setup) throw new Error("Nothing to save; start the setup again.");
  const since = sinceFor(setup.backfill);
  const connected = setup.channels.filter((c) => c.status === "connected");
  if (mode === "on" && !connected.length)
    throw new Error("Connect at least one channel first.");
  connected.forEach((c) =>
    connectSource(company, c.provider, c.scope, since, {
      account: c.account,
      id: state.sources.find(
        (s) => s.company === company && s.provider === c.provider
      )?.id,
    })
  );
  const runMode: AgentRunMode =
    setup.schedule === "15m" ? "continuous" : "on-demand";
  const saved = { ...setup, edited: [] };
  set({
    ...state,
    drafts: state.drafts.filter((d) => d.company !== company),
    sources: state.sources.map((s) =>
      s.company === company && !connected.some((c) => c.provider === s.provider)
        ? { ...s, status: "disconnected" }
        : s
    ),
    agents: [
      ...state.agents.filter((a) => a.company !== company),
      {
        company,
        configured: mode === "on" || collectionAgent(company).configured,
        runMode,
        paused: false,
        setup: saved,
      },
    ],
  });
  logActivity({
    company,
    actor: { kind: "person", name: "You" },
    kind: "rule",
    module: "Inbox",
    action:
      mode === "on"
        ? "Turned on Document Collection"
        : "Saved Document Collection as a draft",
    subject: connected.map((c) => c.provider).join(", "),
    reason: `From ${since} · ${setup.senders === "known" ? "known senders" : "any sender"} · ${setup.files === "bills" ? "bills only" : "non-bills held"} · prepares drafts, never approves`,
  });
};
