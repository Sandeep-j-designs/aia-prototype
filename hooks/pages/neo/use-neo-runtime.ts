import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { pickTask } from "@/config/pages/neo/tasks";
import { fallbackFor } from "@/config/pages/neo/doors";
import type {
  NeoAction,
  NeoAttachment,
  NeoCard,
  NeoChat,
  NeoContext,
  NeoFrame,
  NeoMessage,
  NeoOption,
  NeoPresenceState,
  NeoRef,
  NeoRun,
  NeoRunStatus,
  NeoTaskApi,
} from "@/types/pages/neo";
import { MOCK_NEO_CHATS } from "@/config/pages/neo/mock-chats";
import { opensInCanvas } from "@/utils/pages/neo/canvas";
import { isNeoHref, onNeoChatPage, onNeoPage } from "@/utils/pages/neo/route";
import { subscribeNeoSelection } from "@/utils/pages/neo/selection";
import { resolveFollowUp } from "@/utils/pages/neo/frame";
import { findName } from "@/utils/pages/neo";
import { reviewSetFor } from "@/utils/pages/neo/review-sets";
import { logActivity } from "@/hooks/pages/inbox/use-activity";
import {
  companyOf,
  configure,
  getState,
  subscribeStore,
  useStore,
} from "@/components/inbox/v2/store";

/**
 * Neo's runtime: the conversation, the runs, and the loop that plays a task
 * against them.
 *
 * A task is written as a straight-line script — ask, wait for the answer,
 * show a card, wait for the choice — and this hook is what turns each of
 * those awaits into something on screen and a promise that resolves when the
 * user answers it. That is exactly the shape of an agent loop with
 * elicitation. A live backend must also enforce authorisation, validation,
 * idempotent writes and approval independently of the event stream.
 *
 * DEV: `startRun` calls the scripted `pickTask(...).run(api)`. Replace with a
 * stream from POST /api/neo/runs whose events map one-to-one onto the `api`
 * methods (step → step, ask → ask, card → card, say → say), and send answers
 * back on POST /api/neo/runs/:id/replies.
 */

/** One answer given in a run: a pick on a question, or a card's action. */
type NeoDecision =
  | { kind: "ask"; value: string }
  | { kind: "card"; value: string; card: NeoCard };

const uid = (p: string) =>
  `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

/** A frame plus the question that set it, to ask again for another client. */
type Frame = NeoFrame & { question: string };

/** The company a request names, other than the one on screen. */
const companyNamed = (text: string, current: string) => {
  const companies = getState().companies;
  // A client goes by its first word: "Sahyadri", "Shakunthalam".
  const words = new Set(text.toLowerCase().match(/[a-z]+/g) || []);
  const hit =
    companies.find(
      (c) =>
        c.name ===
        findName(
          text,
          companies.map((x) => x.name)
        )
    ) ||
    companies.find((c) => {
      const first = c.name.split(" ")[0].toLowerCase();
      return first.length >= 5 && words.has(first);
    });
  return hit && hit.id !== current ? hit : undefined;
};

/** Vendors and ledgers in a company's books, for reading follow-ups. */
const namesIn = (company: string) => {
  const bills = getState().items.filter(
    (x) => x.company === company && x.route === "AP" && !x.priorVoucher
  );
  return {
    vendors: [...new Set(bills.map((x) => x.form.party).filter(Boolean))],
    ledgers: [
      ...new Set(
        bills.flatMap((x) => x.form.lines.map((l) => l.ledger)).filter(Boolean)
      ),
    ],
  };
};

class Stopped extends Error {
  constructor() {
    super("Task stopped");
  }
}

/**
 * A chat's title, from its first request: the first sentence, at most
 * eight words, without the question mark — "How much did we spend with Blue
 * Dart".
 */
const titleFrom = (text: string) => {
  const first = text
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.?!])\s/)[0];
  const words = first.replace(/[?.!]+$/, "").split(" ");
  const title = words.slice(0, 8).join(" ") + (words.length > 8 ? "…" : "");
  return title.charAt(0).toUpperCase() + title.slice(1) || "New chat";
};

const PANEL_WIDTH_KEY = "aia.neo.panelWidth";
export const PANEL_MIN = 384;
export const PANEL_MAX = 560;

const reducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Find a row in whatever list is on screen and mark it for a moment. */
const flashRow = (id: string, tries = 24): Promise<boolean> =>
  new Promise((resolve) => {
    const attempt = (n: number) => {
      const row = document.querySelector<HTMLElement>(
        `[data-item-id="${CSS.escape(id)}"]`
      );
      if (row) {
        row.scrollIntoView({
          block: "center",
          behavior: reducedMotion() ? "auto" : "smooth",
        });
        if (!reducedMotion())
          row.animate(
            [
              {
                outline: "2px solid hsl(var(--primary))",
                outlineOffset: "-2px",
              },
              {
                outline: "2px solid hsl(var(--primary))",
                outlineOffset: "-2px",
                offset: 0.7,
              },
              { outline: "2px solid transparent", outlineOffset: "-2px" },
            ],
            { duration: 1800, easing: "ease-out" }
          );
        resolve(true);
      } else if (n > 0) window.setTimeout(() => attempt(n - 1), 150);
      else resolve(false);
    };
    attempt(tries);
  });

export const useNeoRuntime = () => {
  const router = useRouter();
  // The key handler is bound once; it reads the route through this.
  const routerRef = useRef(router);
  routerRef.current = router;
  const { company, items } = useStore();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<NeoMessage[]>([]);
  // Edits and retries read the conversation outside a render.
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  // The document open beside the chat (a message id), page and panel alike.
  const [canvas, setCanvas] = useState<string | null>(null);
  // The docked panel's width, dragged from its left edge. Per viewer.
  const [panelWidth, setPanelWidthState] = useState(PANEL_MIN);
  useEffect(() => {
    try {
      const saved = Number(window.localStorage.getItem(PANEL_WIDTH_KEY));
      if (saved >= PANEL_MIN && saved <= PANEL_MAX) setPanelWidthState(saved);
    } catch {
      /* storage blocked: the default width stands */
    }
  }, []);
  const setPanelWidth = useCallback((w: number) => {
    const next = Math.round(Math.min(PANEL_MAX, Math.max(PANEL_MIN, w)));
    setPanelWidthState(next);
    try {
      window.localStorage.setItem(PANEL_WIDTH_KEY, String(next));
    } catch {
      /* storage blocked: the width holds for this visit */
    }
  }, []);
  // Recent chats. The current conversation is filed under `chatId` as soon
  // as it has a message, so the page's list shows it while it runs.
  // DEV: replace the seed with GET /api/neo/chats
  const [chats, setChats] = useState<NeoChat[]>(() =>
    structuredClone(MOCK_NEO_CHATS)
  );
  const [chatId, setChatId] = useState(() => uid("chat"));
  // Neo is one company's: a chat belongs to the company it was started in,
  // and Recent chats lists only the company in the top bar (20 Oct 2026).
  const [chatCompany, setChatCompany] = useState(company);
  const [runs, setRuns] = useState<NeoRun[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [detached, setDetached] = useState(false);
  const [launchers, setLaunchers] = useState(0);
  const [paused, setPaused] = useState(false);
  const [presence, setPresence] = useState<Record<string, NeoPresenceState>>(
    {}
  );
  const [liveStatus, setLiveStatus] = useState<{
    text: string;
    progress?: { done: number; total: number };
  } | null>(null);
  // What the conversation is about, for follow-ups. Cleared by New chat,
  // opening another chat, × on its chip, or another company.
  const [frame, setFrame] = useState<Frame | null>(null);
  const frameRef = useRef(frame);
  frameRef.current = frame;
  useEffect(() => {
    if (frame && frame.company !== company) setFrame(null);
  }, [company, frame]);
  // Once a sign-off has been given this visit, the footer note has made
  // its point and steps aside.
  const [signedOff, setSignedOff] = useState(false);
  const pausedRef = useRef(false);
  const resumers = useRef<(() => void)[]>([]);

  const resolvers = useRef(new Map<string, (value: string) => void>());
  const rejecters = useRef(new Map<string, (e: Error) => void>());
  const controller = useRef<AbortController | null>(null);
  const undos = useRef(
    new Map<string, (() => { reversed: string[]; skipped: string[] })[]>()
  );
  const editableCards = useRef(new Map<string, NeoCard>());
  /**
   * What each run was asked and every decision the person made in it, in
   * order — so a stopped run can be continued: replayed to where it stood,
   * then carried on live.
   */
  const runMeta = useRef(
    new Map<
      string,
      {
        prompt: string;
        attachments: NeoAttachment[];
        context: NeoContext;
        decisions: NeoDecision[];
      }
    >()
  );

  useEffect(() => subscribeNeoSelection(setSelectedIds), []);

  const itemId =
    typeof router.query.id === "string" ? router.query.id : undefined;
  const module = ["AP", "AR", "JV"].includes(String(router.query.module))
    ? (router.query.module as NeoContext["module"])
    : undefined;
  // A new screen is a new "this": whatever was detached re-attaches.
  useEffect(() => setDetached(false), [itemId, module]);

  /*
    Neo's own pages show no record, so "this" there is nothing — unless the
    chat was expanded from the panel, which carries the panel's "this" along
    (`carried`) until a new chat or ×.
  */
  const onNeo = onNeoPage(router.query);
  const [carried, setCarried] = useState<NeoContext | null>(null);
  // Documents picked from the Inbox in the prompt box (+ › Pick from Inbox).
  // They are "this" — on the page and in the panel — until ×, a new chat or
  // another company.
  const [picked, setPicked] = useState<{
    company: string;
    ids: string[];
  } | null>(null);
  useEffect(() => {
    if (!onNeo) setCarried(null);
    // Neo never docks beside Neo: entering its pages folds the panel.
    else setOpen(false);
  }, [onNeo]);

  const context: NeoContext = useMemo(
    () =>
      picked?.company === company && picked.ids.length
        ? picked.ids.length === 1
          ? { company, itemId: picked.ids[0], selectedIds: [] }
          : { company, selectedIds: picked.ids }
        : detached
          ? { company, selectedIds: [] }
          : onNeo
            ? carried?.company === company
              ? carried
              : { company, selectedIds: [] }
            : {
                company,
                itemId,
                selectedIds: itemId ? [] : selectedIds,
                module,
              },
    [picked, detached, onNeo, carried, itemId, selectedIds, module, company]
  );

  /*
    A bill this chat handed over for review — a voucher-entry batch, or
    Document collection's results — is a subtask of the chat (20 Oct 2026):
    on the bill, the dock opens on the bill's checklist and the questions
    asked about it, with the chat one click up. `dockView` is that click;
    every new bill opens on its own view again.
  */
  const [dockView, setDockView] = useState<"bill" | "chat">("bill");
  useEffect(() => setDockView("bill"), [itemId]);
  const subtask = useMemo(() => {
    if (onNeo || !itemId) return null;
    const set = reviewSetFor(messages, items, itemId);
    return set ? { itemId, set } : null;
  }, [onNeo, itemId, items, messages]);
  const billFocus = subtask && dockView === "bill" ? subtask.itemId : null;
  const billFocusRef = useRef(billFocus);
  billFocusRef.current = billFocus;
  // Which bill each run was asked from; its replies belong there too.
  const runScopes = useRef(new Map<string, string>());
  const scopeOf = useCallback(
    (m: NeoMessage) =>
      m.scope || (m.runId ? runScopes.current.get(m.runId) : undefined),
    []
  );

  /*
    Leaving Neo's chat page for a record keeps the conversation on screen:
    the panel docks beside where you landed. Panel-to-record keeps its old
    behaviour (the panel closes), and Neo's own pages never dock.
    The canvas closes on the way out: the record is the document now, and
    an open canvas would sit over it. Its tile in the thread reopens it.
  */
  const dockAfter = (fromChat: boolean, href: string) => {
    setOpen(fromChat && !isNeoHref(href));
    if (!isNeoHref(href)) setCanvas(null);
  };

  /* ---------------------------------------------------- conversation ops */

  const patch = (id: string, f: (m: NeoMessage) => NeoMessage) =>
    setMessages((ms) => ms.map((m) => (m.id === id ? f(m) : m)));

  const patchRun = (id: string, p: Partial<NeoRun>) =>
    setRuns((rs) => rs.map((r) => (r.id === id ? { ...r, ...p } : r)));

  const goTo = useCallback(
    async (ref: NeoRef) => {
      const fromChat = onNeoChatPage(router.query);
      // Neo never changes company; a link to another one says so instead.
      if (ref.company && ref.company !== getState().company) {
        setMessages((ms) => [
          ...ms,
          {
            id: uid("m"),
            role: "neo",
            text: `That's ${companyOf(ref.company!)?.name || "another company"}'s. Switch to it in the top bar to open it there.`,
          },
        ]);
        return;
      }
      if (ref.href) {
        await router.push(ref.href);
        dockAfter(fromChat, ref.href);
        return;
      }
      if (!ref.itemId) return;
      const target = getState().items.find((x) => x.id === ref.itemId);
      if (target && target.company !== getState().company) {
        setMessages((ms) => [
          ...ms,
          {
            id: uid("m"),
            role: "neo",
            text: `That record is ${companyOf(target.company)?.name || "another company"}'s. Switch to it in the top bar to open it there.`,
          },
        ]);
        return;
      }
      // A bill of a set this chat handed over opens with the set as the
      // review queue, so the form's counter, ‹ › and Approve & Next walk it
      // and say so.
      const set = reviewSetFor(
        messagesRef.current,
        getState().items,
        ref.itemId
      );
      if (set) configure({ queue: set.ids, queueFrom: `inbox:${set.name}` });
      if (ref.target === "inbox") {
        if (router.asPath !== "/inbox") await router.push("/inbox");
        dockAfter(fromChat, "/inbox");
        const found = await flashRow(ref.itemId);
        if (found) return;
      }
      await router.push(`/inbox?id=${encodeURIComponent(ref.itemId)}`);
      dockAfter(fromChat, "/inbox?id=");
      // A bill of this chat's set is its subtask: the dock stays, on it.
      if (set) {
        setOpen(true);
        setDockView("bill");
      }
    },
    [router]
  );

  /* ------------------------------------------------------------- runs */

  const startRun = useCallback(
    async (
      prompt: string,
      attachments: NeoAttachment[] = [],
      // An edit or retry has already put the user's message on screen.
      // Continue also brings the stopped run's "this" and its decisions.
      opts: {
        userId?: string;
        context?: NeoContext;
        replay?: NeoDecision[];
      } = {}
    ) => {
      const text =
        prompt.trim() ||
        (attachments.length
          ? `${attachments.length} file${attachments.length === 1 ? "" : "s"} attached`
          : "");
      if (!text || controller.current) return;
      const runId = uid("run");
      const ctx = structuredClone(opts.context || context);
      let runText = text;
      /*
        Asked from a bill's subtask, the turn stays with that bill — unless
        it is about the set ("approve all the drafts", "the rest"), which
        is the chat's business: answered there, and the dock goes up to it.
        An edit, retry or continue keeps the turn where it was asked.
      */
      const asked = opts.userId
        ? messagesRef.current.find((m) => m.id === opts.userId)
        : undefined;
      let scope = opts.userId
        ? asked?.scope
        : billFocusRef.current || undefined;
      if (
        scope &&
        !opts.userId &&
        /\b(batch|collection|this run|all (the |of the )?(bills|drafts|vouchers|documents)|every (bill|draft|voucher|document)|the rest)\b/i.test(
          text
        )
      ) {
        scope = undefined;
        setDockView("chat");
      }
      if (scope) runScopes.current.set(runId, scope);
      // Said back before the answer: how Neo read a follow-up, or that it
      // switched client because the request named one.
      const notes: string[] = [];
      let prior = frameRef.current;

      // "Who owes Sahyadri?" asked in Shakunthalam's Neo: Neo is one
      // company's, so it says whose chat this is and changes nothing. The
      // top bar is the only way to another company.
      const elsewhere = !opts.replay
        ? companyNamed(text, ctx.company || "")
        : undefined;

      // "and August?", "move them to Freight Inward": read against what the
      // conversation is about.
      if (!opts.replay && runText === text) {
        const r = resolveFollowUp(
          text,
          prior && prior.company === ctx.company ? prior : null,
          namesIn(ctx.company || getState().company)
        );
        if (r) {
          runText = r.prompt;
          if (r.selectedIds) {
            ctx.itemId = undefined;
            ctx.selectedIds = r.selectedIds;
          }
          notes.push(`Taken as “${r.note}”`);
        }
      }
      logActivity({
        company: ctx.company || getState().company,
        actor: { kind: "ai", name: "Neo" },
        kind: "predicted",
        module: "Automation",
        action: "Started requested task",
        subject: text,
        reason: "User request; calculations read from company records",
      });
      if (!opts.userId)
        setMessages((ms) => [
          ...ms,
          {
            id: uid("m"),
            role: "user",
            scope,
            text,
            attachments: attachments.length ? attachments : undefined,
            records:
              picked && picked.company === ctx.company && picked.ids.length
                ? picked.ids
                : undefined,
          },
        ]);

      const noteSteps = notes.length
        ? [
            {
              id: uid("m"),
              role: "neo" as const,
              runId,
              steps: notes.map((label) => ({
                id: uid("s"),
                label,
                status: "done" as const,
                startedAt: Date.now(),
                endedAt: Date.now(),
              })),
            },
          ]
        : [];
      if (elsewhere) {
        const here = companyOf(ctx.company || getState().company)?.name;
        setMessages((ms) => [
          ...ms,
          {
            id: uid("m"),
            role: "neo",
            scope,
            text: `Neo here only answers about ${here}. Switch to **${elsewhere.name}** in the top bar to ask about it.`,
          },
        ]);
        return;
      }
      const task = pickTask(runText, ctx, attachments);
      if (!task) {
        // Nothing does it; still say what the request was about and where
        // that work lives. Every miss is logged: it is the research.
        const f = fallbackFor(runText, ctx.company || getState().company);
        logActivity({
          company: ctx.company || getState().company,
          actor: { kind: "ai", name: "Neo" },
          kind: "predicted",
          module: "Automation",
          action: "Couldn't answer",
          subject: text,
          reason: "No Neo task handles this request yet",
        });
        setMessages((ms) => [
          ...ms,
          ...noteSteps,
          {
            id: uid("m"),
            role: "neo",
            scope,
            text: f.text,
            links: f.links.length ? f.links : undefined,
            suggestions: f.suggestions,
          },
        ]);
        return;
      }

      const abort = new AbortController();
      controller.current = abort;
      // Continuing: the decisions already made are answered again at once,
      // and nothing waits until they run out.
      const replay = [...(opts.replay || [])];
      const decisions: NeoDecision[] = [];
      runMeta.current.set(runId, {
        prompt: runText,
        attachments,
        context: structuredClone(ctx),
        decisions,
      });
      let stopReason = "Stopped by you";
      const touched = new Set<string>();
      const unsubscribe = subscribeStore(() => {
        if (getState().company !== ctx.company) {
          stopReason = "Stopped because the company changed";
          abort.abort();
          rejecters.current.forEach((reject) => reject(new Stopped()));
        }
      });
      setBusy(runId);
      undos.current.set(runId, []);
      setRuns((rs) => [
        {
          id: runId,
          context: ctx,
          title: task.title,
          status: "running",
          startedAt: new Date().toISOString(),
          touched: [],
          undoable: false,
        },
        ...rs,
      ]);

      if (noteSteps.length) setMessages((ms) => [...ms, ...noteSteps]);
      let stepsMsg: string | null = null;
      let lastCard: string | null = null;
      // The run is waiting on a sign-off: Esc then cancels it.
      let atSignOff = false;
      const guard = () => {
        if (getState().company !== ctx.company) {
          stopReason = "Stopped because the company changed";
          abort.abort();
        }
        if (abort.signal.aborted) throw new Stopped();
      };
      const wait = (ms: number) =>
        new Promise<void>((resolve, reject) => {
          guard();
          if (replay.length) ms = 0;
          const onAbort = () => {
            window.clearTimeout(t);
            reject(new Stopped());
          };
          const t = window.setTimeout(
            () => {
              abort.signal.removeEventListener("abort", onAbort);
              try {
                guard();
                resolve();
              } catch (e) {
                reject(e);
              }
            },
            reducedMotion() ? Math.min(ms, 40) : ms
          );
          abort.signal.addEventListener("abort", onAbort, { once: true });
        });
      const push = (m: Omit<NeoMessage, "id" | "role" | "runId">) => {
        const id = uid("m");
        stepsMsg = null;
        setMessages((ms) => [...ms, { id, role: "neo", runId, ...m }]);
        return id;
      };
      const waitFor = (id: string, status: NeoRunStatus = "needs-you") =>
        new Promise<string>((resolve, reject) => {
          patchRun(runId, { status });
          resolvers.current.set(id, (v) => {
            patchRun(runId, { status: "running" });
            resolve(v);
          });
          rejecters.current.set(id, reject);
        });

      let outcome: NeoRunStatus = "done";
      const api: NeoTaskApi = {
        outcome: (status) => {
          outcome = status;
        },
        runId,
        prompt: runText,
        attachments,
        context: ctx,
        signal: abort.signal,
        focus: (itemId) => {
          guard();
          if (
            !getState().items.some(
              (x) => x.id === itemId && x.company === ctx.company
            )
          )
            throw new Error("The record is not in this run's company.");
          ctx.itemId = itemId;
          ctx.selectedIds = [];
          patchRun(runId, { context: { ...ctx } });
        },
        wait,
        say: async (said, links) => {
          guard();
          if (task.id === "triage") {
            push({ text: said, links });
            return;
          }
          // Written out word by word, as a model streams: about 30ms a
          // word, never more than 2.4s for the whole answer.
          if (reducedMotion() || replay.length) {
            push({ text: said, links });
            return;
          }
          const id = push({ text: "", links: undefined, streaming: true });
          const words = said.split(/(\s+)/);
          const perTick = Math.max(2, Math.ceil(words.length / 80));
          const tick = Math.min(60, 2400 / Math.ceil(words.length / perTick));
          for (let i = 0; i < words.length; i += perTick) {
            const shown = words.slice(0, i + perTick).join("");
            patch(id, (m) => ({ ...m, text: shown }));
            await wait(tick);
          }
          patch(id, (m) => ({ ...m, text: said, links, streaming: false }));
        },
        step: async (label, cite) => {
          guard();
          const stepId = uid("s");
          if (!stepsMsg) {
            const id = uid("m");
            stepsMsg = id;
            setMessages((ms) => [
              ...ms,
              {
                id,
                role: "neo",
                runId,
                steps: [
                  {
                    id: stepId,
                    label,
                    status: "running",
                    cite,
                    startedAt: Date.now(),
                  },
                ],
              },
            ]);
          } else {
            const id = stepsMsg;
            patch(id, (m) => ({
              ...m,
              steps: [
                ...(m.steps || []),
                {
                  id: stepId,
                  label,
                  status: "running",
                  cite,
                  startedAt: Date.now(),
                },
              ],
            }));
          }
          const owner = stepsMsg!;
          await wait(120);
          return (done?: string) =>
            patch(owner, (m) => ({
              ...m,
              steps: m.steps?.map((s) =>
                s.id === stepId
                  ? {
                      ...s,
                      status: "done",
                      label: done || s.label,
                      endedAt: Date.now(),
                    }
                  : s
              ),
            }));
        },
        suggest: (prompts) => {
          guard();
          push({ suggestions: prompts });
        },
        remember: (f) =>
          setFrame({
            ...f,
            task: task.id,
            company: ctx.company || getState().company,
            question: runText,
          }),
        askText: async (question, o) => {
          guard();
          const parse = o.parse || ((t: string) => t.trim() || undefined);
          if (replay[0]?.kind === "ask") {
            const { value } = replay.shift()!;
            const parsed = parse(value);
            if (parsed) {
              push({
                ask: {
                  question,
                  options: o.options || [],
                  input: { placeholder: o.placeholder },
                  answer: value,
                },
              });
              decisions.push({ kind: "ask", value });
              return parsed;
            }
          }
          replay.length = 0;
          let q = question;
          for (;;) {
            const id = push({
              ask: {
                question: q,
                options: o.options || [],
                input: { placeholder: o.placeholder },
              },
            });
            const raw = await waitFor(id);
            guard();
            patch(id, (m) => ({ ...m, ask: { ...m.ask!, answer: raw } }));
            const parsed = parse(raw);
            if (parsed) {
              decisions.push({ kind: "ask", value: raw });
              return parsed;
            }
            q = `${o.retry || "I couldn't read that."}\n${question.split("\n")[0]}`;
          }
        },
        fail: (label) => {
          push({
            steps: [{ id: uid("s"), label, status: "failed" }],
          });
        },
        ask: async (question: string, options: NeoOption[]) => {
          guard();
          if (replay[0]?.kind === "ask") {
            const { value } = replay.shift()!;
            push({ ask: { question, options, answer: value } });
            decisions.push({ kind: "ask", value });
            return value;
          }
          // The run went a different way this time: stop replaying.
          replay.length = 0;
          const id = push({ ask: { question, options } });
          const answer = await waitFor(id);
          guard();
          patch(id, (m) => ({ ...m, ask: { ...m.ask!, answer } }));
          decisions.push({ kind: "ask", value: answer });
          return answer;
        },
        card: async (card: NeoCard, actions: NeoAction[]) => {
          guard();
          if (replay[0]?.kind === "card" && replay[0].card.kind === card.kind) {
            const d = replay.shift() as Extract<NeoDecision, { kind: "card" }>;
            // The person's edits to the card come back with it.
            if (card.kind === "message" && d.card.kind === "message")
              card.body = d.card.body;
            if (card.kind === "changeset" && d.card.kind === "changeset")
              card.rows = d.card.rows;
            if (card.kind === "decisions" && d.card.kind === "decisions")
              card.items = d.card.items;
            const id = push({ card, actions, chosen: d.value });
            lastCard = id;
            decisions.push({ kind: "card", value: d.value, card });
            return d.value;
          }
          replay.length = 0;
          const id = push({ card, actions });
          lastCard = id;
          if (opensInCanvas(card)) setCanvas(id);
          editableCards.current.set(id, card);
          atSignOff = actions.some(
            (a) => a.primary && a.risk && a.risk !== "read"
          );
          const choice = await waitFor(id);
          atSignOff = false;
          guard();
          if (actions.find((a) => a.id === choice)?.risk) setSignedOff(true);
          const edited = editableCards.current.get(id);
          if (card.kind === "message" && edited?.kind === "message")
            card.body = edited.body;
          if (card.kind === "changeset" && edited?.kind === "changeset")
            card.rows = edited.rows;
          if (card.kind === "decisions" && edited?.kind === "decisions")
            card.items = edited.items;
          editableCards.current.delete(id);
          patch(id, (m) => ({ ...m, chosen: choice }));
          decisions.push({ kind: "card", value: choice, card });
          return choice;
        },
        show: (card, opts) => {
          guard();
          const id = push({ card });
          // A list to read opens beside the answer, not over it: on a phone
          // the canvas covers the chat, so there it waits for a tap.
          // Below 1440px a document opens over the chat, so it waits for a
          // click there; a run's closing documents never open themselves.
          if (
            opts?.open !== false &&
            opensInCanvas(card) &&
            window.innerWidth >= 1440
          )
            setCanvas(id);
          return (next) => patch(id, (m) => ({ ...m, card: next }));
        },
        updateCard: (card, actions) => {
          if (!lastCard) return;
          patch(lastCard, (m) => ({
            ...m,
            card,
            actions: actions ?? m.actions,
          }));
        },
        touch: (ids) => {
          ids.forEach((id) => touched.add(id));
          setRuns((rs) =>
            rs.map((r) =>
              r.id === runId
                ? { ...r, touched: [...new Set([...r.touched, ...ids])] }
                : r
            )
          );
        },
        onUndo: (undo) => {
          undos.current.get(runId)?.push(undo);
          logActivity(
            {
              company: ctx.company || getState().company,
              actor: { kind: "ai", name: "Neo" },
              kind: "predicted",
              module: "Automation",
              action: "Prepared reversible change",
              subject: task.title,
              reason: text,
              undoable: true,
            },
            () => {
              const result = undo();
              if (!result.reversed.length)
                throw new Error(
                  "The records changed or were approved; Undo cannot overwrite them."
                );
            }
          );
          patchRun(runId, { undoable: true });
        },
        checkpoint: async () => {
          guard();
          if (!pausedRef.current) return;
          patchRun(runId, { status: "needs-you" });
          await new Promise<void>((resolve, reject) => {
            resumers.current.push(resolve);
            abort.signal.addEventListener("abort", () => reject(new Stopped()));
          });
          patchRun(runId, { status: "running" });
        },
        presence: (ids, state) =>
          setPresence((p) => {
            const next = { ...p };
            ids.forEach((id) => {
              if (state) next[id] = state;
              else delete next[id];
            });
            return next;
          }),
        status: (said, progress) =>
          setLiveStatus(said ? { text: said, progress } : null),
        navigate: async (path) => {
          guard();
          const fromChat = onNeoChatPage(router.query);
          if (path.includes("neoReview=") || path.includes("neoSync="))
            setOpen(false);
          else if (fromChat && !isNeoHref(path)) setOpen(true);
          if (router.asPath !== path) await router.push(path);
        },
        chain: async (next) => {
          const t = pickTask(next, ctx);
          if (!t) return;
          const summary = await t.run({ ...api, prompt: next });
          if (summary) patchRun(runId, { title: t.title });
        },
      };

      try {
        const summary = await task.run(api);
        patchRun(runId, {
          status: outcome,
          summary: typeof summary === "string" ? summary : undefined,
        });
      } catch (error) {
        if (error instanceof Stopped || abort.signal.aborted) {
          if (atSignOff && stopReason === "Stopped by you")
            stopReason = "Cancelled at the sign-off";
          patchRun(runId, {
            status: "stopped",
            summary: `${stopReason} · ${touched.size} records touched`,
          });
          setMessages((ms) => [
            ...ms,
            {
              id: uid("m"),
              role: "neo",
              runId,
              stopped: {
                reason: stopReason,
                touched: touched.size,
                company: ctx.company || getState().company,
              },
            },
          ]);
        } else {
          console.error("[Neo]", error);
          patchRun(runId, {
            status: "failed",
            summary: "Something went wrong",
          });
          setMessages((ms) => [
            ...ms,
            {
              id: uid("m"),
              role: "neo",
              runId,
              steps: [
                {
                  id: uid("s"),
                  label: `${error instanceof Error ? error.message : "That didn't work."} ${touched.size} records were touched before this failure; check Runs for completed changes.`,
                  status: "failed",
                },
              ],
            },
          ]);
        }
      } finally {
        unsubscribe();
        // A stopped answer stops arriving where it stood.
        setMessages((ms) =>
          ms.map((m) => (m.streaming ? { ...m, streaming: false } : m))
        );
        editableCards.current.clear();
        // Any question still open on screen belongs to a run that has ended.
        resolvers.current.clear();
        rejecters.current.clear();
        controller.current = null;
        pausedRef.current = false;
        resumers.current = [];
        setPaused(false);
        setLiveStatus(null);
        // Rows keep their last mark for a moment, then let go.
        window.setTimeout(() => setPresence({}), 2500);
        setBusy(null);
      }
    },
    [busy, context, router, picked]
  );

  /** Answer the open question or card. */
  const answer = useCallback((messageId: string, value: string) => {
    const resolve = resolvers.current.get(messageId);
    if (!resolve) return;
    resolvers.current.delete(messageId);
    rejecters.current.delete(messageId);
    resolve(value);
  }, []);

  const editCard = useCallback((messageId: string, card: NeoCard) => {
    if (!resolvers.current.has(messageId)) return;
    editableCards.current.set(messageId, card);
    setMessages((ms) =>
      ms.map((m) => (m.id === messageId ? { ...m, card } : m))
    );
  }, []);

  const pause = useCallback(() => {
    if (!controller.current) return;
    pausedRef.current = true;
    setPaused(true);
  }, []);

  const resume = useCallback(() => {
    pausedRef.current = false;
    setPaused(false);
    const waiting = resumers.current;
    resumers.current = [];
    waiting.forEach((f) => f());
  }, []);

  const stop = useCallback(() => {
    if (!controller.current) return;
    controller.current.abort();
    rejecters.current.forEach((reject) => reject(new Stopped()));
  }, []);

  const undo = useCallback(
    (runId: string) => {
      if (controller.current) return;
      const owner = runs.find((r) => r.id === runId);
      if (owner?.context.company !== getState().company) {
        setMessages((ms) => [
          ...ms,
          {
            id: uid("m"),
            role: "neo",
            text: "Switch to the run's company before undoing it. Nothing was changed.",
          },
        ]);
        return;
      }
      const list = undos.current.get(runId) || [];
      if (!list.length) return;
      const results = [...list].reverse().map((f) => f());
      const reversed = [...new Set(results.flatMap((r) => r.reversed))];
      const skipped = [...new Set(results.flatMap((r) => r.skipped))];
      // Undoing what is on screen leaves nothing to show: go back to the queue.
      const run = runs.find((r) => r.id === runId);
      if (itemId && run?.touched.includes(itemId)) void router.push("/inbox");
      undos.current.set(runId, []);
      setRuns((rs) =>
        rs.map((r) =>
          r.id === runId
            ? {
                ...r,
                status: skipped.length ? r.status : "undone",
                summary: `${reversed.length} reversed · ${skipped.length} kept (changed, approved or unavailable)`,
                undoable: false,
              }
            : r
        )
      );
      setMessages((ms) => [
        ...ms,
        {
          id: uid("m"),
          role: "neo",
          runId,
          text: `Reversed ${reversed.length} records.${skipped.length ? ` Kept ${skipped.length} records because they changed, were approved or are unavailable: ${skipped.join(", ")}.` : " No later edits were overwritten."}`,
        },
      ]);
    },
    [runs, itemId, router]
  );

  useEffect(() => {
    if (!messages.length) return;
    const first = messages.find((m) => m.role === "user");
    // Titled once Neo has answered, so the list doesn't flicker mid-request.
    const answered = messages.some((m) => m.role === "neo");
    const title = answered ? titleFrom(first?.text || "") : "New chat";
    setChats((cs) => {
      const entry: NeoChat = {
        id: chatId,
        company: chatCompany,
        title,
        updatedAt: new Date().toISOString(),
        messages,
      };
      return cs.some((c) => c.id === chatId)
        ? cs.map((c) =>
            c.id === chatId
              ? {
                  ...entry,
                  starred: c.starred,
                  named: c.named,
                  title:
                    c.named || c.title !== "New chat" ? c.title : entry.title,
                }
              : c
          )
        : [entry, ...cs];
    });
  }, [messages, chatId, chatCompany]);

  const reset = useCallback(() => {
    if (controller.current) return;
    setFrame(null);
    setMessages([]);
    setChatId(uid("chat"));
    setChatCompany(getState().company);
    setCarried(null);
    setPicked(null);
    setCanvas(null);
  }, []);

  // Another company in the top bar is another Neo: the chat on screen stays
  // filed under its own company and a new one starts. A live run is stopped
  // by the company change (its guard); the new chat starts once it has
  // written its stopped notice, so that notice stays in the chat it ends.
  const switchedRef = useRef(false);
  useEffect(() => {
    if (company === chatCompany) return;
    if (controller.current) switchedRef.current = true;
    else reset();
  }, [company, chatCompany, reset]);
  useEffect(() => {
    if (!busy && switchedRef.current) {
      switchedRef.current = false;
      reset();
    }
  }, [busy, reset]);

  /* ------------------------------------------- edits, retries, versions */

  /**
   * Ask again from a user message: the old answer (and everything after it)
   * is kept as a version, and the new one runs in its place. `text` is the
   * edited request; a retry passes the same words.
   */
  const branch = useCallback(
    (userId: string, text: string) => {
      if (controller.current || !text.trim()) return;
      const ms = messagesRef.current;
      const idx = ms.findIndex((m) => m.id === userId && m.role === "user");
      if (idx < 0) return;
      const u = ms[idx];
      const versions = (
        u.versions || [
          { text: u.text || "", attachments: u.attachments, after: [] },
        ]
      ).map((v) => ({ ...v }));
      const cur = u.version ?? 0;
      versions[cur] = {
        text: u.text || "",
        attachments: u.attachments,
        after: ms.slice(idx + 1),
      };
      versions.push({ text, attachments: u.attachments, after: [] });
      setMessages([
        ...ms.slice(0, idx),
        { ...u, text, versions, version: versions.length - 1 },
      ]);
      setCanvas(null);
      void startRun(text, u.attachments || [], { userId });
    },
    [startRun]
  );

  const retry = useCallback(
    (userId: string) => {
      const u = messagesRef.current.find((m) => m.id === userId);
      if (u?.text) branch(userId, u.text);
    },
    [branch]
  );

  /** Show another version of a user turn, with the conversation it had. */
  const switchVersion = useCallback((userId: string, n: number) => {
    if (controller.current) return;
    const ms = messagesRef.current;
    const idx = ms.findIndex((m) => m.id === userId);
    const u = ms[idx];
    if (!u?.versions?.[n] || n === (u.version ?? 0)) return;
    const versions = u.versions.map((v) => ({ ...v }));
    versions[u.version ?? 0] = {
      text: u.text || "",
      attachments: u.attachments,
      after: ms.slice(idx + 1),
    };
    const v = versions[n];
    setMessages([
      ...ms.slice(0, idx),
      { ...u, text: v.text, attachments: v.attachments, versions, version: n },
      ...v.after,
    ]);
    setCanvas(null);
  }, []);

  /**
   * Rate an answer. DEV: POST /api/neo/feedback { messageId, value, note }.
   * The same value again clears it.
   */
  const rate = useCallback(
    (messageId: string, value: "up" | "down", note?: string) =>
      setMessages((ms) =>
        ms.map((m) =>
          m.id === messageId
            ? {
                ...m,
                feedback:
                  m.feedback?.value === value && note === undefined
                    ? undefined
                    : { value, note },
              }
            : m
        )
      ),
    []
  );

  /**
   * Carry on a stopped run: its messages are replaced by the same task run
   * again, with every decision already made answered at once, so it arrives
   * back where it stopped and goes on from there. Only when the stop left
   * nothing changed — a replay must never write twice.
   */
  const continueRun = useCallback(
    (stoppedId: string) => {
      if (controller.current) return;
      const ms = messagesRef.current;
      const stop = ms.find((m) => m.id === stoppedId);
      const meta = stop?.runId && runMeta.current.get(stop.runId);
      if (!stop?.stopped || !meta || stop.stopped.touched) return;
      if (meta.context.company !== getState().company) return;
      const first = ms.findIndex((m) => m.runId === stop.runId);
      const user = [...ms.slice(0, first)]
        .reverse()
        .find((m) => m.role === "user");
      setMessages(ms.filter((m) => m.runId !== stop.runId));
      setCanvas(null);
      void startRun(meta.prompt, meta.attachments, {
        userId: user?.id,
        context: meta.context,
        replay: meta.decisions,
      });
    },
    [startRun]
  );

  /** Make these Inbox documents "this", for the next request. */
  const pickRecords = useCallback(
    (ids: string[]) =>
      setPicked(ids.length ? { company: getState().company, ids } : null),
    []
  );

  /* ------------------------------------------------------ chat management */

  const renameChat = useCallback((id: string, title: string) => {
    const t = title.replace(/\s+/g, " ").trim();
    if (!t) return;
    setChats((cs) =>
      cs.map((c) => (c.id === id ? { ...c, title: t, named: true } : c))
    );
  }, []);

  const toggleStar = useCallback(
    (id: string) =>
      setChats((cs) =>
        cs.map((c) => (c.id === id ? { ...c, starred: !c.starred } : c))
      ),
    []
  );

  /** The panel's chat, full width on Neo's page, with its "this" carried. */
  const expand = useCallback(() => {
    setCarried(context.itemId || context.selectedIds.length ? context : null);
    void router.push("/inbox?module=NEO");
  }, [context, router]);

  /** Carry on an earlier conversation. Not while a run is live. */
  const openChat = useCallback(
    (id: string) => {
      if (controller.current) return;
      const chat = chats.find((c) => c.id === id);
      if (!chat || chat.company !== getState().company) return;
      setChatId(id);
      setChatCompany(chat.company);
      setMessages(chat.messages);
      setFrame(null);
      setCanvas(null);
    },
    [chats]
  );

  /** Delete a chat. Deleting the one on screen starts a new one. */
  const deleteChat = useCallback(
    (id: string) => {
      if (controller.current && id === chatId) return;
      setChats((cs) => cs.filter((c) => c.id !== id));
      if (id === chatId) {
        setMessages([]);
        setChatId(uid("chat"));
        setChatCompany(getState().company);
        setCanvas(null);
      }
    },
    [chatId]
  );

  /* ---------------------------------------------------------- global keys */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        !e.shiftKey &&
        !e.altKey &&
        e.code === "KeyJ"
      ) {
        e.preventDefault();
        // Inside Neo, Ctrl J is the prompt box, not a second Neo.
        if (onNeoPage(routerRef.current.query)) {
          if (!onNeoChatPage(routerRef.current.query))
            void routerRef.current.push("/inbox?module=NEO");
          window.setTimeout(
            () => document.getElementById("neo-composer")?.focus(),
            60
          );
        } else setOpen((o) => !o);
      }
      // Ctrl Shift O: a new chat, as in the chat apps.
      if (
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        !e.altKey &&
        e.code === "KeyO"
      ) {
        if (controller.current) return;
        e.preventDefault();
        setMessages([]);
        setFrame(null);
        setChatId(uid("chat"));
        setCarried(null);
        setPicked(null);
        setCanvas(null);
        window.setTimeout(
          () => document.getElementById("neo-composer")?.focus(),
          60
        );
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const registerLauncher = useCallback(() => {
    setLaunchers((n) => n + 1);
    return () => setLaunchers((n) => n - 1);
  }, []);

  return {
    subtask,
    billFocus,
    dockView,
    setDockView,
    scopeOf,
    open,
    setOpen,
    messages,
    runs,
    busy,
    context,
    runContext: runs.find((r) => r.id === busy)?.context,
    detach: () => {
      setPicked(null);
      setCarried(null);
      setDetached(true);
    },
    expand,
    startRun,
    completeWaiting: (runId: string) =>
      setRuns((rs) =>
        rs.map((r) =>
          r.id === runId &&
          r.context.company === getState().company &&
          r.status === "waiting"
            ? {
                ...r,
                status: "done",
                summary:
                  "Supplier reply received (simulated); replacement queued for collection",
              }
            : r
        )
      ),
    answer,
    editCard,
    frame,
    clearFrame: () => setFrame(null),
    signedOff,
    /** The open question answered in words, if any: the prompt box answers it. */
    textAsk: busy
      ? [...messages]
          .reverse()
          .find(
            (m) =>
              m.runId === busy && m.ask?.input && m.ask.answer === undefined
          )?.id
      : undefined,
    stop,
    undo,
    reset,
    chats: chats.filter((c) => c.company === company),
    chatId,
    openChat,
    deleteChat,
    renameChat,
    toggleStar,
    retry,
    edit: branch,
    continueRun,
    pickRecords,
    picked: picked?.company === company ? picked.ids : [],
    switchVersion,
    rate,
    canvas,
    setCanvas,
    panelWidth,
    setPanelWidth,
    goTo,
    hasLauncher: launchers > 0,
    paused,
    pause,
    resume,
    presence,
    liveStatus,
    registerLauncher,
  };
};

export type NeoRuntime = ReturnType<typeof useNeoRuntime>;
