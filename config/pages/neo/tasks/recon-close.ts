import { getState } from "@/components/inbox/v2/store";
import {
  CLOSE_STATEMENT,
  NANDHINI_ID,
  dayLabel,
} from "@/config/pages/neo/mock-recon";
import {
  closeReadiness,
  closeRun,
  getRun,
  inr,
  latestRun,
  learn,
  readCloseStatement,
  resolveSuspense,
} from "@/hooks/pages/neo/use-recon";
import { decide } from "./shared";
import type { NeoTask } from "@/types/pages/neo";
import { has } from "@/utils/pages/neo";

/**
 * Close a reconciled month (Phase 3, 20 Oct 2026). The brief: period close
 * is a separate decision, made on bank coverage, open receivables and the
 * suspense schedule. Neo reads the next statement for evidence that what
 * was open got paid, asks what each suspense line was (once, with its
 * scope: this time, or from now on), and the accountant closes.
 *
 * DEV: POST /api/recon/runs/:id/close-evidence { statement }, PATCH
 * /api/recon/suspense/:id, POST /api/recon/runs/:id/close.
 */
const reconClose: NeoTask = {
  id: "recon-close",
  title: "Close a reconciled month",
  match: (p, _ctx, attachments = []) =>
    attachments.some((a) => a.name === CLOSE_STATEMENT.name) ||
    (has(p, /\bclose\b/i) &&
      has(p, /\b(sep|september|month|recon\w*|period)\b/i))
      ? 45
      : 0,
  run: async (api) => {
    const company = api.context.company || getState().company;
    const run = company === NANDHINI_ID ? latestRun(company, "sep") : undefined;
    if (!run || run.stage !== "created") {
      await api.say(
        "There's no reconciled September to close yet. Reconcile it first; the close reads what's left open."
      );
      return "Nothing to close";
    }
    if (run.closed) {
      await api.say(
        `${run.period} was closed on ${dayLabel(run.closed.at.slice(0, 10))}.`
      );
      api.show({ kind: "recon", company, runId: run.id, view: "close" });
      return "Already closed";
    }

    // No statement attached: the sample is the only one that works here, so
    // Neo uses it rather than asking (20 Oct 2026, one sheet per run).
    const reading = await api.step(
      api.attachments.some((a) => a.name === CLOSE_STATEMENT.name)
        ? `Reading ${CLOSE_STATEMENT.name}`
        : `Reading the sample statement, ${CLOSE_STATEMENT.name}`
    );
    await api.wait(700);
    const res = readCloseStatement(run.id, CLOSE_STATEMENT.name)!;
    const collected = res.evidence.filter((e) => e.state === "collected");
    const notDue = res.evidence.filter((e) => e.state === "not-due");
    const overdue = res.evidence.filter((e) => e.state === "overdue");
    reading(
      `${res.fresh} new rows in Banking · ${collected.length} of ${res.evidence.length} open receivables collected`
    );
    const total = (xs: { amount: number }[]) =>
      xs.reduce((t, x) => t + x.amount, 0);
    // Only what stops the close is said before the questions.
    if (overdue.length)
      await api.say(
        `**${overdue.map((e) => e.what).join(", ")}** should have arrived by ${dayLabel(CLOSE_STATEMENT.to!)} and hasn't. That blocks the close until it's chased or explained.`
      );

    // Every open suspense line and the close itself, on one sheet. Carrying
    // is the recommendation: nothing gets booked on a guess, and the close
    // can still happen.
    await api.checkpoint();
    const lines = getRun(run.id)!.suspense.filter((l) => l.state === "open");
    const month = run.period.replace(" 2026", "");
    const closeAction = {
      id: "close",
      label: `Close ${month}`,
      primary: true,
      risk: "read" as const,
    };
    let go: string;
    if (lines.length) {
      const { choice, picks, notes } = await decide(
        api,
        `Before I close ${month}`,
        lines.map((line) => {
          const swiggy = /Swiggy/.test(line.what);
          const amazon = /AMAZON/.test(line.what);
          return {
            id: line.id,
            header: swiggy
              ? "Swiggy short"
              : amazon
                ? "Amazon Pay"
                : line.what.split(" ·")[0],
            other: {
              fallback: "carry",
              placeholder:
                "What it was; it's carried with your note until booked",
            },
            question: `₹${inr(line.amount)} in suspense, ${line.what}: what was it?`,
            why: `${line.reason}. Owner ${line.owner}, since ${dayLabel(line.since)}.`,
            recommended: "carry",
            options: [
              {
                id: "carry",
                label: `Not known yet: carry it into ${month === "September" ? "October" : "next month"}`,
                hint: "Nothing booked on a guess; the close still goes ahead",
              },
              ...(swiggy
                ? [
                    {
                      id: "fee",
                      label: "Swiggy's payment-gateway fee",
                      hint: "To Swiggy Commission",
                    },
                  ]
                : amazon
                  ? [
                      { id: "office", label: "Office expenses, this time" },
                      {
                        id: "office-always",
                        label: "Office expenses, from now on",
                        hint: "Tried out until it matches your call 3 times",
                      },
                      { id: "repairs", label: "Repairs & maintenance" },
                    ]
                  : []),
            ],
          };
        }),
        [
          { ...closeAction, label: `Submit and close ${month}` },
          { id: "later", label: "Not now" },
        ]
      );
      go = choice;
      const said = Object.entries(notes);
      if (go === "close" && said.length)
        await api.say(
          `Carried with your note${said.length === 1 ? "" : "s"}: ${said.map(([id, n]) => `${lines.find((l) => l.id === id)?.what}: “${n}”`).join("; ")}. Book ${said.length === 1 ? "it" : "them"} when confirmed.`
        );
      if (go === "close")
        for (const line of lines) {
          const answer = picks[line.id];
          if (answer === "carry") resolveSuspense(run.id, line.id, "carry");
          else {
            const ledger =
              answer === "fee"
                ? "Swiggy Commission"
                : answer === "repairs"
                  ? "Repairs & Maintenance"
                  : "Office Expenses";
            resolveSuspense(run.id, line.id, { ledger });
            if (answer === "office-always")
              learn(company, {
                kind: "narration",
                match: "AMAZON PAY",
                does: "Office expenses",
                ledger: "Office Expenses",
                source: `your answer at the ${run.period} close`,
                always: false,
              });
          }
        }
    } else {
      go = await api.card(
        { kind: "recon", company, runId: run.id, view: "close" },
        [closeAction, { id: "later", label: "Not now" }]
      );
    }
    const r = closeReadiness(getRun(run.id)!);
    if (go !== "close" || !r.ready) {
      api.show({ kind: "recon", company, runId: run.id, view: "close" });
      await api.say(
        go !== "close"
          ? "Left open. Nothing changed."
          : "It can't close yet; the close document says what's left."
      );
      return "Not closed";
    }
    closeRun(run.id);
    const carried = getRun(run.id)!.closed!.carried;
    const month2 = run.period.replace(" 2026", "");
    await api.say(
      [
        `**${month2} is closed.**`,
        `- Bank: ${r.coverage.accounted} of ${r.coverage.total} rows accounted`,
        `- Open on ${dayLabel(run.to)}: ₹${inr(total(collected))} of ₹${inr(total(res.evidence))} collected${notDue.length ? `; ${notDue.map((e) => `${e.what} due ${dayLabel(e.expected)}`).join(", ")}` : ""}`,
        `- Suspense: ${carried ? `₹${inr(carried)} carried into ${month2 === "September" ? "October" : "next month"}` : "nil"}`,
        "\nClosing posts nothing; the drafts still wait for approval.",
      ].join("\n"),
      [
        { label: "Sales › Needs Review", href: "/inbox?module=AR&tab=review" },
        { label: "Banking", href: "/inbox?module=BANK" },
      ]
    );
    api.show(
      { kind: "recon", company, runId: run.id, view: "close" },
      { open: false }
    );
    api.show({ kind: "recon", company, view: "rules" }, { open: false });
    api.suggest(["Reconcile 1–15 October for Nandhini Deluxe"]);
    return `${run.period} closed`;
  },
};

export default reconClose;
