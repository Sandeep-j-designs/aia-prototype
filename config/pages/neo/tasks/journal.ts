import {
  actor,
  getState,
  neoCreate,
  neoDiscard,
  type Item,
} from "@/components/inbox/v2/store";
import { decide } from "./shared";
import type { NeoCard, NeoTask } from "@/types/pages/neo";
import {
  day,
  findAmount,
  fyShort,
  has,
  money,
  round2,
} from "@/utils/pages/neo";

/**
 * "Book depreciation of ₹12,000 on office equipment."
 *
 * Month-end entries that have no document behind them. Neo picks the two
 * ledgers from what the entry is, asks what it cannot know — the period and
 * the cost centre — and shows a balanced Dr/Cr voucher before creating a
 * Journal draft.
 *
 * DEV: tools — list_ledgers, create_jv_draft. The recipes below become the
 * model's judgement plus the firm's saved rules.
 */

type Recipe = {
  id: string;
  label: string;
  match: RegExp;
  dr: string;
  cr: string;
  narration: (what: string, month: string) => string;
};

const RECIPES: Recipe[] = [
  {
    id: "depreciation",
    label: "Depreciation",
    match: /depreciat/i,
    dr: "Depreciation A/c",
    cr: "Accumulated Depreciation A/c",
    narration: (what, month) =>
      `Depreciation on ${what || "fixed assets"} for ${month}`,
  },
  {
    id: "rent",
    label: "Rent provision",
    match: /\brent\b/i,
    dr: "Rent A/c",
    cr: "Provision for Expenses A/c",
    narration: (what, month) => `Rent for ${month} provided, bill awaited`,
  },
  {
    id: "salary",
    label: "Salary provision",
    match: /salar|wages|payroll/i,
    dr: "Salaries & Wages A/c",
    cr: "Provision for Expenses A/c",
    narration: (what, month) => `Salaries for ${month} provided`,
  },
  {
    id: "insurance",
    label: "Prepaid insurance",
    match: /insurance/i,
    dr: "Insurance Expense A/c",
    cr: "Prepaid Insurance A/c",
    narration: (what, month) => `Insurance for ${month} charged out of prepaid`,
  },
  {
    id: "bank-charges",
    label: "Bank charges",
    match: /bank charge/i,
    dr: "Bank Charges",
    cr: "Bank",
    narration: (what, month) => `Bank charges for ${month}`,
  },
];

const monthEnd = (offset: number) => {
  const d = new Date();
  const end = new Date(d.getFullYear(), d.getMonth() + 1 - offset, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`;
};
const monthName = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
  });

const journal: NeoTask = {
  id: "journal",
  title: "Book a journal",
  match: (p) =>
    has(p, /\bjournal\b|\bjv\b/i) ||
    (has(p, /\b(book|provide|post|record|pass)\b/i) &&
      RECIPES.some((r) => r.match.test(p)))
      ? 3
      : RECIPES.some((r) => r.match.test(p))
        ? 1
        : 0,
  run: async (api) => {
    const named = RECIPES.find((r) => r.match.test(api.prompt));
    // The accountant knows this figure to the rupee: ask for it in words.
    // Quick fills are only what this ledger was booked at before.
    let amount = findAmount(api.prompt);
    if (!amount) {
      const base = named?.dr.replace(/\s*A\/c$/, "").toLowerCase();
      const before = base
        ? [
            ...new Set(
              getState()
                .items.filter(
                  (x) =>
                    x.route === "JV" &&
                    x.company === getState().company &&
                    x.status !== "Deleted"
                )
                .flatMap((x) =>
                  x.form.lines
                    .filter((l) => l.ledger?.toLowerCase().startsWith(base))
                    .map((l) => l.amount)
                )
                .filter((n) => n > 0)
            ),
          ].slice(-3)
        : [];
      amount = Number(
        await api.askText(
          named
            ? `How much is the ${named.label.toLowerCase()}?`
            : "How much is the entry for?",
          {
            placeholder: "Amount, e.g. 12,000 or 1.5 lakh",
            options: before.map((n) => ({
              id: String(n),
              label: money(n),
              hint: `Last booked on ${named!.dr}`,
            })),
            parse: (t) => {
              const n = findAmount(/^\d/.test(t.trim()) ? `₹${t}` : t);
              return n && n > 0 ? String(n) : undefined;
            },
            retry:
              "That didn't read as an amount. Try 12000, ₹12,000 or 1.5 lakh.",
          }
        )
      );
    }
    amount = round2(amount);
    const what =
      api.prompt.match(/\bon (?:the )?([a-z &]+?)(?: for| in|$)/i)?.[1] || "";
    const monthMentioned = [0, 1].find((o) =>
      new RegExp(
        new Date(`${monthEnd(o)}T00:00:00`).toLocaleString("en-IN", {
          month: "long",
        }),
        "i"
      ).test(api.prompt)
    );

    // What's left — the entry type if the request didn't say, the month and
    // the cost centre — on one sheet whose button creates the draft.
    const { choice, picks } = await decide(
      api,
      named
        ? `${named.label} · ${money(amount)} · Dr ${named.dr} / Cr ${named.cr}`
        : `Journal · ${money(amount)}`,
      [
        ...(!named
          ? [
              {
                id: "recipe",
                header: "Entry",
                question: "What is the entry for?",
                recommended: "",
                options: RECIPES.slice(0, 4).map((r) => ({
                  id: r.id,
                  label: r.label,
                  hint: `Dr ${r.dr} · Cr ${r.cr}`,
                })),
              },
            ]
          : []),
        ...(monthMentioned === undefined
          ? [
              {
                id: "date",
                header: "Month",
                question: "For which month?",
                recommended: monthEnd(1),
                options: [monthEnd(1), monthEnd(0)].map((d) => ({
                  id: d,
                  label: monthName(d),
                  hint: `Dated ${day(d)}`,
                })),
              },
            ]
          : []),
        {
          id: "centre",
          header: "Cost centre",
          question: "Charge it to a cost centre?",
          recommended: "none",
          options: [
            { id: "none", label: "No cost centre" },
            { id: "Operations", label: "Operations" },
            { id: "Finance", label: "Finance" },
            { id: "Sales", label: "Sales" },
          ],
        },
      ],
      [
        {
          id: "create",
          label: "Submit and create the draft",
          primary: true,
          risk: "draft",
        },
        { id: "discard", label: "Discard" },
      ]
    );
    if (choice !== "create") {
      await api.say("Discarded. Nothing was created.");
      return "Discarded";
    }
    const recipe = named || RECIPES.find((r) => r.id === picks.recipe)!;
    const date =
      monthMentioned !== undefined ? monthEnd(monthMentioned) : picks.date;
    const centre = picks.centre === "none" ? "" : picks.centre;

    const building = await api.step("Building the entry");
    await api.wait(450);
    const narration = recipe.narration(what.trim(), monthName(date));
    building(`Dr ${recipe.dr} / Cr ${recipe.cr} · ${money(amount)} · balanced`);
    const n = getState().items.filter((x) => x.route === "JV").length + 101;
    const voucherNo = `JV/${fyShort(date)}/${String(n).padStart(3, "0")}`;
    const preview: NeoCard = {
      kind: "voucher",
      voucherType: "Journal",
      state: "Preview",
      voucherNo,
      party: narration,
      date: day(date),
      lines: [
        {
          ledger: `${recipe.dr}${centre ? ` · ${centre}` : ""}`,
          side: "Dr",
          amount,
          inferred: true,
        },
        { ledger: recipe.cr, side: "Cr", amount, inferred: true },
      ],
      why: `Both ledgers follow the entry type (${recipe.label.toLowerCase()}). Check them against how this company books it.`,
    };
    const writing = await api.step("Creating the journal");
    const template =
      getState().items.find((x) => x.route === "JV" && x.original.jv) ||
      getState().items[0];
    const id = `NEO-JV-${String(n)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const item: Item = {
      ...structuredClone(template),
      id,
      route: "JV",
      aiRoute: "JV",
      topChoice: "JV",
      confidence: 1,
      reason: `Prepared by Neo for ${actor}.`,
      source: "upload",
      sender: actor,
      subject: narration,
      file: {
        name: `${voucherNo} · ${recipe.label}`,
        size: "Prepared by Neo",
        ext: "pdf",
      },
      received: new Date().toISOString(),
      form: {
        ...structuredClone(template.form),
        voucherType: "Journal",
        voucherNo,
        invoiceNo: "",
        date,
        due: "",
        party: "",
        costClass: centre ? "Department" : "",
        costClassEnabled: false,
        costCentre: "",
        narration,
        lines: [
          {
            description: "",
            ledger: recipe.dr,
            amount,
            dr: amount,
            cr: 0,
            costCentre: centre,
          },
          {
            description: "",
            ledger: recipe.cr,
            amount,
            dr: 0,
            cr: amount,
            costCentre: "",
          },
        ],
      },
      amount,
      original: {
        ...structuredClone(template.original),
        id,
        route: "JV",
        vendor: "—",
        jv: {
          narration,
          lines: [
            { ledger: recipe.dr, dr: amount, cr: null },
            { ledger: recipe.cr, dr: null, cr: amount },
          ],
        },
        bill: undefined,
        invoice: undefined,
      },
      arSheet: undefined,
      edited: [],
      hardRef: undefined,
      softRef: undefined,
      snapshot: undefined,
      sheet: undefined,
      routeDrafts: undefined,
      doneAt: undefined,
      doneBy: undefined,
      retries: 0,
      firstAttempt: true,
      error: undefined,
    };
    await api.wait(400);
    const created = neoCreate(item, api.runId);
    api.touch([created.id]);
    api.onUndo(() => neoDiscard([created], api.runId));
    writing(`Created ${voucherNo} · ${money(amount)} · Needs Review`);
    api.show({ ...preview, state: "Draft created" });
    await api.say(
      `${voucherNo} is in Journal Vouchers as a draft, waiting for your approval.`,
      [
        { label: `Open ${voucherNo}`, itemId: created.id, target: "open" },
        { label: "Show in Inbox", itemId: created.id, target: "inbox" },
      ]
    );
    return `${voucherNo} · ${money(amount)}`;
  },
};

export default journal;
