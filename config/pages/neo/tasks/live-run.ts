import {
  actor,
  applyBulkAction,
  beginUploadedExtraction,
  companyOf,
  demoUploadDocuments,
  getState,
  hardMatch,
  issue,
  missingFields,
  neoUndoChanges,
  type Item,
} from "@/components/inbox/v2/store";
import type {
  NeoCard,
  NeoLogLine,
  NeoStage,
  NeoTask,
  NeoTone,
} from "@/types/pages/neo";
import { has, money } from "@/utils/pages/neo";
import { describe, label, total } from "./shared";
import { READY_CONFIDENCE } from "./triage";

/**
 * The live bookkeeping run — Neo working the Inbox end to end, in front of
 * the user.
 *
 * Six documents arrive over WhatsApp and email while the run watches. Each is
 * read by the Inbox's own extraction as it lands, then checked the way the
 * approve endpoint checks it. What Neo can fix as a draft it fixes (a missing
 * ledger, from the vendor's own history); what needs judgement it holds with a
 * reason. Then it stops: one approval from the user posts the clean batch, and
 * the run pushes it through the real Tally sync and waits for Tally's answer
 * before it calls anything done.
 *
 * Starting the run is consent for draft-tier fixes, which are listed and
 * undoable. Nothing is approved or synced without the user's click.
 *
 * DEV: in production the arrivals are real (the WhatsApp and email
 * ingestion); the run subscribes to `inbox.item.extracted` events instead of
 * polling the store, and calls the same bulk-update, approve and sync
 * endpoints the screens do.
 */

const ARRIVALS = 6;
/** Below this a read is doubtful however clean the fields look. */
const DOUBTFUL = 0.7;

type Verdict =
  | { kind: "ready" }
  | { kind: "fix"; ledger: string; why: string }
  | { kind: "held"; reason: string; tone: NeoTone };

const SENDERS = [
  { source: "whatsapp" as const, sender: "+91 98450 12342 (Priya R.)" },
  { source: "email" as const, sender: "" },
  { source: "whatsapp" as const, sender: "+91 99001 XXX17 (Ramesh K.)" },
  { source: "email" as const, sender: "" },
];

/**
 * A realistic morning: mostly clean, one duplicate, one that needs a person.
 * Picked from the demo batch by what each document will turn out to be, so
 * every run tells the whole story rather than six clean bills.
 */
const pickArrivals = (company: string) => {
  const pool = demoUploadDocuments(company, 24);
  // One of each real document: the batch repeats its templates.
  const seen = new Set<string>();
  const unique = pool.filter((x) => {
    const key = `${x.form.party}|${x.form.invoiceNo}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const isDuplicate = (x: Item) =>
    x.status === "Duplicate" || !!x.hardRef || !!x.softRef || !!hardMatch(x);
  // Clean = a purchase bill the approve check would pass as it stands, and
  // that would not collide with anything already posted. Purchases, because
  // the run's sync pushes the Purchases module.
  const clean = unique.filter(
    (x) =>
      x.route === "AP" &&
      x.form.voucherType === "Purchase" &&
      !/^(multiple|—|general counterparty)$/i.test(x.form.party) &&
      !x.original.bill?.vendorMissing &&
      x.confidence >= DOUBTFUL &&
      x.status === "Needs Review" &&
      !isDuplicate(x) &&
      !issue(x)
  );
  const duplicate = unique.find(isDuplicate);
  const doubtful =
    unique.find((x) => x.original.bill?.vendorMissing && !isDuplicate(x)) ||
    unique.find(
      (x) =>
        !clean.includes(x) &&
        x !== duplicate &&
        x.status === "Needs Review" &&
        x.confidence < READY_CONFIDENCE
    );
  const picked = [
    ...clean.slice(0, 4),
    ...(duplicate ? [duplicate] : []),
    ...(doubtful ? [doubtful] : []),
  ];
  for (const x of unique) {
    if (picked.length >= ARRIVALS) break;
    if (!picked.includes(x) && x.status !== "Failed") picked.push(x);
  }
  /*
    These are new arrivals, so they carry the score of this read, not the
    seed's. The clean ones read cleanly; the doubtful one (AWS, vendor not in
    masters) keeps its low score, which is what the run should hold for a
    person. DEV: production confidence comes from extraction; delete this.
  */
  clean.slice(0, 4).forEach((x, i) => {
    x.confidence = [0.97, 0.94, 0.96, 0.92][i];
  });
  /*
    One clean bill arrives with a line extraction couldn't map to a ledger —
    the most common thing a person fixes by hand, and the one Neo can fix from
    the books. Prefer a vendor the books already know, so the fix has history
    to point at.
  */
  const known = new Set(
    getState()
      .items.filter((i) => i.company === company)
      .map((i) => i.form.party)
  );
  const cleanPicked = picked.filter(
    (x) =>
      clean.includes(x) &&
      x.form.lines.length &&
      x.confidence >= READY_CONFIDENCE
  );
  const unmapped =
    cleanPicked.find((x) => known.has(x.form.party)) || cleanPicked[0];
  if (unmapped)
    unmapped.form = {
      ...unmapped.form,
      lines: unmapped.form.lines.map((l, i) =>
        i === 0 ? { ...l, ledger: "" } : l
      ),
    };
  return picked.slice(0, ARRIVALS).map((x, i): Item => {
    const via = SENDERS[i % SENDERS.length];
    return {
      ...x,
      preparedBy: { agent: "Neo", runId: "live-arrival", onBehalfOf: actor },
      source: via.source,
      sender:
        via.source === "email"
          ? x.original.source.channel === "email"
            ? x.original.source.sender
            : "accounts@vendor.in"
          : via.sender,
    };
  });
};

/** The ledger a vendor's bills usually go to, from the books as they stand. */
const ledgerFromHistory = (x: Item) => {
  const counts = new Map<string, number>();
  getState()
    .items.filter(
      (i) =>
        i.id !== x.id &&
        i.company === x.company &&
        i.route === x.route &&
        i.form.party === x.form.party
    )
    .forEach((i) =>
      i.form.lines.forEach(
        (l) => l.ledger && counts.set(l.ledger, (counts.get(l.ledger) || 0) + 1)
      )
    );
  const best = [...counts].sort((a, b) => b[1] - a[1])[0];
  if (best)
    return {
      ledger: best[0],
      why: `used on ${best[1]} earlier line${best[1] === 1 ? "" : "s"} from ${x.form.party}`,
    };
  return {
    ledger: x.route === "AR" ? "Other Income" : "General Expenses",
    why: `no history for ${x.form.party || "this party"}, so the general ledger — check it`,
  };
};

const verdictFor = (x: Item): Verdict => {
  if (x.status === "Failed")
    return { kind: "held", reason: "couldn't be read", tone: "negative" };
  if (x.status === "Duplicate")
    return {
      kind: "held",
      reason: x.hardRef
        ? `duplicate of posted ${x.hardRef}`
        : "same file sent twice",
      tone: "notice",
    };
  const blocker = issue(x);
  if (blocker) {
    const missing = missingFields(x);
    if (missing.length === 1 && missing[0] === "Ledger")
      return { kind: "fix", ...ledgerFromHistory(x) };
    return {
      kind: "held",
      reason: missing.length
        ? `missing ${missing.join(", ").toLowerCase()}`
        : blocker,
      tone: "negative",
    };
  }
  if (x.confidence < READY_CONFIDENCE)
    return {
      kind: "held",
      reason: "Source details need verification before approval",
      tone: "notice",
    };
  return { kind: "ready" };
};

const liveRun: NeoTask = {
  id: "live-run",
  title: "Live bookkeeping run",
  match: (p) =>
    has(
      p,
      /live run|live bookkeeping|bookkeeping run|process (the |my |today'?s )?(inbox|queue|documents|bills)|run (the )?books|start (a |the )?run|work the (inbox|queue)|morning run/i
    )
      ? 4
      : 0,
  run: async (api) => {
    const company = getState().company;
    const companyName = companyOf(company)?.name || "";
    await api.navigate("/inbox");
    await api.say(
      `Starting a scripted demo on ${companyName}. I'll receive sample documents, check them, and preview suggested ledger fixes. Then I'll hand the batch to the Inbox for review and approval.`
    );

    /* ------------------------------------------------ the live card */
    const stages: NeoStage[] = [
      { id: "receive", label: "Receiving", status: "waiting" },
      { id: "read", label: "Reading", status: "waiting" },
      { id: "check", label: "Checking", status: "waiting" },
      { id: "fix", label: "Fixing", status: "waiting" },
      { id: "approve", label: "Review hand-off", status: "waiting" },
      { id: "sync", label: "Sync after approval", status: "waiting" },
    ];
    const log: NeoLogLine[] = [];
    const card: Extract<NeoCard, { kind: "pipeline" }> = {
      kind: "pipeline",
      title: "Live run",
      startedAt: Date.now(),
      stages,
      log,
    };
    const paint = api.show({ ...card });
    const redraw = () =>
      paint({ ...card, stages: stages.map((s) => ({ ...s })), log: [...log] });
    const stage = (id: string, patch: Partial<NeoStage>) => {
      const s = stages.find((x) => x.id === id)!;
      Object.assign(s, patch);
      redraw();
    };
    let seq = 0;
    const note = (text: string, itemId?: string, tone?: NeoTone) => {
      log.push({ id: `l${++seq}`, at: Date.now(), text, itemId, tone });
      redraw();
    };

    /* ------------------------------------------ 1 + 2 — arrive, read */
    const arrivals = pickArrivals(company);
    const ids = arrivals.map((x) => x.id);
    const read = new Set<string>();
    stage("receive", { status: "active", detail: `0 of ${ids.length}` });

    // The reader watches the store while documents are still arriving —
    // extraction finishes on its own clock, not the run's.
    let readingError: unknown;
    const reading = (async () => {
      const started = Date.now();
      while (read.size < ids.length) {
        await api.wait(250);
        for (const id of ids) {
          if (read.has(id)) continue;
          const x = getState().items.find((i) => i.id === id);
          if (!x || ["Received", "Extracting"].includes(x.status)) continue;
          read.add(id);
          stage("read", {
            status: read.size === ids.length ? "done" : "active",
            detail: `${read.size} of ${ids.length}`,
          });
          note(
            x.status === "Failed"
              ? `Couldn't read ${x.file.name}`
              : `Read ${describe(x)} · ${money(x.amount)} · ${x.form.voucherType}`,
            id,
            x.status === "Failed" ? "negative" : undefined
          );
        }
        if (Date.now() - started > 45000) break;
      }
    })().catch((error) => {
      readingError = error;
    });

    for (const [i, x] of arrivals.entries()) {
      await api.checkpoint();
      await api.wait(i ? 900 : 300);
      beginUploadedExtraction(company, [x], []);
      api.touch([x.id]);
      api.presence([x.id], "working");
      stage("receive", {
        status: i === arrivals.length - 1 ? "done" : "active",
        detail: `${i + 1} of ${ids.length}`,
      });
      if (i === 0)
        stage("read", { status: "active", detail: `0 of ${ids.length}` });
      api.status(`Receiving · ${x.form.party || x.file.name}`, {
        done: i + 1,
        total: ids.length * 3,
      });
      note(
        `Arrived on ${x.source === "whatsapp" ? `WhatsApp from ${x.sender.match(/\(([^)]+)\)/)?.[1] || x.sender}` : `email from ${x.sender}`} — ${x.form.party || x.file.name}`,
        x.id
      );
    }
    api.status("Reading documents", {
      done: ids.length,
      total: ids.length * 3,
    });
    await reading;
    if (readingError) throw readingError;

    /* ------------------------------------------------------ 3 — check */
    stage("check", { status: "active" });
    const verdicts = new Map<string, Verdict>();
    for (const id of ids) {
      await api.checkpoint();
      await api.wait(380);
      const x = getState().items.find((i) => i.id === id);
      if (!x) continue;
      const v = verdictFor(x);
      verdicts.set(id, v);
      api.presence([id], v.kind === "held" ? "held" : "done");
      api.status(`Checking · ${describe(x)}`, {
        done: ids.length + verdicts.size,
        total: ids.length * 3,
      });
      note(
        v.kind === "ready"
          ? `${describe(x)} — clean, ready to post`
          : v.kind === "fix"
            ? `${describe(x)} — no ledger on a line; I can fix it`
            : `${describe(x)} — held: ${v.reason}`,
        id,
        v.kind === "ready" ? "positive" : v.kind === "fix" ? undefined : v.tone
      );
      const counts = [...verdicts.values()];
      const n = (k: Verdict["kind"]) =>
        counts.filter((c) => c.kind === k).length;
      stage("check", {
        detail: [
          `${n("ready")} clean`,
          n("fix") && `${n("fix")} to fix`,
          n("held") && `${n("held")} held`,
        ]
          .filter(Boolean)
          .join(" · "),
      });
    }
    stage("check", { status: "done" });

    /* -------------------------------------------------------- 4 — fix */
    let fixes = ids.filter((id) => verdicts.get(id)?.kind === "fix");
    const fixSources = new Map(
      fixes.map((id) => [
        id,
        JSON.stringify(getState().items.find((x) => x.id === id)),
      ])
    );
    if (fixes.length) {
      const choice = await api.card(
        {
          kind: "diff",
          title: "Suggested ledger fixes",
          field: "Ledger",
          rows: fixes.flatMap((id) => {
            const item = getState().items.find((x) => x.id === id)!;
            const verdict = verdicts.get(id) as Extract<
              Verdict,
              { kind: "fix" }
            >;
            return item.form.lines.map((line) => ({
              itemId: id,
              party: describe(item),
              from: line.ledger || "Missing",
              to: verdict.ledger,
              amount: line.amount,
            }));
          }),
        },
        [
          {
            id: "apply",
            label: "Apply draft fixes",
            primary: true,
            risk: "draft",
          },
          { id: "skip", label: "Leave for review" },
        ]
      );
      if (choice !== "apply") {
        fixes.forEach((id) =>
          verdicts.set(id, {
            kind: "held",
            reason: "Ledger suggestion left for review",
            tone: "notice",
          })
        );
        fixes = [];
      }
    }
    stage("fix", {
      status: fixes.length ? "active" : "done",
      detail: fixes.length ? `0 of ${fixes.length}` : "Nothing to fix",
    });
    const snapshots: Item[] = [];
    for (const [i, id] of fixes.entries()) {
      await api.checkpoint();
      const x = getState().items.find((it) => it.id === id)!;
      const v = verdicts.get(id) as Extract<Verdict, { kind: "fix" }>;
      api.presence([id], "working");
      api.status(`Fixing · ${describe(x)}`, {
        done: ids.length * 2 + i,
        total: ids.length * 3,
      });
      await api.wait(650);
      if (
        JSON.stringify(getState().items.find((it) => it.id === id)) !==
        fixSources.get(id)
      ) {
        verdicts.set(id, {
          kind: "held",
          reason: "Changed while Neo was checking; review current values",
          tone: "notice",
        });
        continue;
      }
      snapshots.push(structuredClone(x));
      applyBulkAction([id], "Ledger", v.ledger);
      api.touch([id]);
      api.onUndo(neoUndoChanges([snapshots[snapshots.length - 1]], api.runId));
      const after = getState().items.find((it) => it.id === id)!;
      const now = verdictFor(after);
      verdicts.set(
        id,
        now.kind === "fix"
          ? { kind: "held", reason: "still incomplete", tone: "negative" }
          : now
      );
      api.presence([id], now.kind === "ready" ? "done" : "held");
      note(`Set ${v.ledger} on ${describe(x)} — ${v.why}`, id);
      stage("fix", {
        status: i === fixes.length - 1 ? "done" : "active",
        detail: `${i + 1} of ${fixes.length}`,
      });
    }
    if (snapshots.length) {
      api.touch(snapshots.map((x) => x.id));
    }

    /* --------------------------------------------------- 5 — approval */
    const items = ids
      .map((id) => getState().items.find((x) => x.id === id))
      .filter(Boolean) as Item[];
    const ready = items.filter((x) => verdicts.get(x.id)?.kind === "ready");
    const held = items.filter((x) => verdicts.get(x.id)?.kind === "held");
    const finish = async (summary: string, links: Item[]) => {
      card.finishedAt = Date.now();
      redraw();
      api.status(null);
      const secs = Math.round((card.finishedAt - card.startedAt) / 1000);
      await api.say(
        `Done in ${Math.floor(secs / 60)}m ${secs % 60}s. ${summary}`,
        links.slice(0, 4).map((x) => ({
          label: label(x),
          itemId: x.id,
          target: "open" as const,
        }))
      );
    };

    if (!ready.length) {
      stage("approve", { status: "held", detail: "Nothing clean to post" });
      stage("sync", { status: "held", detail: "Skipped" });
      await finish(
        `Nothing was clean enough to post. ${held.length} held for you in the Inbox.`,
        held
      );
      return `${held.length} held`;
    }

    stage("approve", {
      status: "active",
      detail: `${ready.length} vouchers · ${money(total(ready))}`,
    });
    api.status("Waiting for your approval");
    const choice = await api.card(
      {
        kind: "list",
        title: "Ready for your approval",
        groups: [
          {
            label: "Post",
            tone: "positive",
            rows: ready.map((x) => ({
              itemId: x.id,
              primary: describe(x),
              secondary: `${label(x)} · ${x.form.voucherType} · ${x.form.lines[0]?.ledger || "—"}`,
              amount: x.amount,
            })),
          },
          ...(held.length
            ? [
                {
                  label: "Held for you",
                  tone: "notice" as const,
                  rows: held.map((x) => {
                    const v = verdicts.get(x.id) as Extract<
                      Verdict,
                      { kind: "held" }
                    >;
                    return {
                      itemId: x.id,
                      primary: describe(x),
                      secondary: `${label(x)} · ${v.reason}`,
                      amount: x.amount,
                    };
                  }),
                },
              ]
            : []),
        ],
      },
      [
        {
          id: "review",
          label: `Open review · ${ready.length} records`,
          primary: true,
          risk: "read",
        },
        { id: "stop", label: "Stop here" },
      ]
    );
    if (choice === "stop") {
      stage("approve", { status: "held", detail: "Left for you" });
      stage("sync", { status: "held", detail: "Skipped" });
      await finish(
        `Nothing was approved. ${ready.length} ready and ${held.length} held are waiting in the Inbox.`,
        [...ready, ...held]
      );
      return "Stopped before approval";
    }

    stage("approve", { status: "held", detail: "Review in Inbox" });
    stage("sync", {
      status: "held",
      detail: "Use the existing Sync controls after approval",
    });
    await finish(
      `${ready.length} prepared for review. Nothing was approved or synced.`,
      [...ready, ...held]
    );
    await api.navigate(
      `/inbox?neoReview=${encodeURIComponent(ready.map((x) => x.id).join(","))}`
    );
    return `${ready.length} prepared for review · ${held.length} held`;
  },
};

export default liveRun;
