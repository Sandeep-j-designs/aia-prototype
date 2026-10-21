import {
  actor,
  companyOf,
  arRowId,
  blankArItem,
  blankArLedger,
  blankArSheet,
  getState,
  neoCreate,
  neoDiscard,
  arTotals,
  deriveLines,
  type Item,
} from "@/components/inbox/v2/store";
import { CUSTOMERS } from "@/config/pages/inbox/ar-masters";
import {
  MOCK_NEO_CUSTOMERS,
  MOCK_NEO_REGISTRATIONS,
} from "@/config/pages/neo/mock-customers";
import { decide } from "./shared";
import type { NeoCard, NeoTask, NeoVoucherLine } from "@/types/pages/neo";
import {
  day,
  findName,
  findPercent,
  fyShort,
  has,
  money,
  round2,
  todayIso,
} from "@/utils/pages/neo";
import {
  companyItems,
  describe,
  isOpen,
  pickItem,
  refTo,
  resolveItem,
} from "./shared";

/**
 * "Create a sales invoice based on this purchase."
 *
 * Reads the bill's lines, prices them for the customer, decides the GST heads
 * from the two registrations, picks the income ledger, and shows the voucher
 * before anything is written. On Create it adds a new sales invoice to the
 * Inbox as Needs Review, prepared by Neo — a separate document, not the bill
 * re-routed, because the purchase still has to be booked as a purchase.
 *
 * DEV: tools — get_item, get_customer, list_sales_history, create_ar_draft.
 */

/** A GST rate out of a document's tax block, snapped to the nearest slab. */
const rateOf = (x: Item) => {
  const b = x.original.bill;
  const base = b?.items.reduce((s, l) => s + l.amount, 0) || x.amount;
  const tax = Object.values(b?.taxes || {}).reduce<number>(
    (s, v) => s + (v || 0),
    0
  );
  if (!base || !b?.taxes) return undefined;
  const raw = (tax / (b?.subTotal || base)) * 100;
  const slabs = [0, 5, 12, 18, 28];
  return slabs.find((s) => Math.abs(s - raw) < 0.1);
};

/** The bill's lines, as the invoice will re-sell them. */
const linesOf = (x: Item) => {
  return x.form.lines.map((l) => ({
    text: l.description || l.ledger,
    cost: l.amount,
    ledger: l.ledger,
  }));
};

/**
 * The income ledger, and why. This customer's own sales history first; with
 * none, the nature of what is being sold.
 */
const ledgerFor = (
  customer: string,
  lines: { ledger: string; text: string }[]
) => {
  const history = getState().items.filter(
    (x) =>
      x.company === getState().company &&
      x.route === "AR" &&
      x.status === "Approved" &&
      x.form.party === customer &&
      x.arSheet?.salesLedger
  );
  if (history.length) {
    const counts = new Map<string, number>();
    history.forEach((x) =>
      counts.set(
        x.arSheet!.salesLedger,
        (counts.get(x.arSheet!.salesLedger) || 0) + 1
      )
    );
    const [ledger, n] = [...counts].sort((a, b) => b[1] - a[1])[0];
    return {
      ledger,
      evidence: history
        .filter((x) => x.arSheet?.salesLedger === ledger)
        .map((x) => refTo(x)),
      why: `${ledger} is the income ledger on ${n} of ${customer}'s ${history.length} sales invoice${history.length === 1 ? "" : "s"} here.`,
    };
  }
  const service = lines.every((l) =>
    /service|repair|maintenance|warranty|consult|subscription/i.test(
      `${l.ledger} ${l.text}`
    )
  );
  const ledger = service ? "Service Income" : "Other Income";
  return {
    ledger,
    evidence: [],
    why: `No approved sales history for ${customer}. ${ledger} is a suggestion based on the line descriptions; check it before approval.`,
  };
};

const nextVoucherNo = () => {
  const n = getState().items.filter((x) => x.route === "AR").length + 101;
  return `SI/${fyShort()}/${String(n).padStart(3, "0")}`;
};

const MARKUPS = [0, 10, 15, 20];

const salesFromPurchase: NeoTask = {
  id: "sales-from-purchase",
  title: "Sales invoice from a purchase",
  match: (p) =>
    has(
      p,
      /sales invoice/i,
      /(raise|create|make|generate).*(invoice|bill).*(customer|from|based)/i,
      /(re-?sell|on-?bill|pass on|bill (it|this) to)/i,
      /^(create|raise|make) an? (sales )?invoice\b/i
    )
      ? 3
      : 0,
  run: async (api) => {
    /* 1 — the purchase */
    let bill = resolveItem(
      api,
      (x) => x.route === "AP" && x.status !== "Deleted"
    );
    const onScreen = api.context.itemId
      ? companyItems().find((x) => x.id === api.context.itemId)
      : undefined;
    if (!bill && onScreen && onScreen.route !== "AP")
      await api.say(
        `${onScreen.id} is a ${onScreen.route === "AR" ? "sales invoice" : "journal"}, not a purchase. Which bill should the invoice be based on?`
      );
    if (!bill) {
      const pool = companyItems().filter((x) => x.route === "AP" && isOpen(x));
      if (!pool.length) {
        await api.say(
          "There are no purchase bills in this company's Inbox to base an invoice on. Send one in and ask again."
        );
        return "No purchase to work from";
      }
      bill = await pickItem(api, "Which purchase is this for?", pool);
      if (!bill) return;
    }
    api.focus(bill.id);
    const lines = linesOf(bill);
    if (
      !lines.length ||
      lines.some((l) => !Number.isFinite(l.cost) || l.cost <= 0)
    )
      throw new Error(
        "The purchase needs valid positive line amounts before it can be used for a sales draft."
      );
    const sourceSnapshot = JSON.stringify(bill);
    if (/margin/i.test(api.prompt)) {
      await api.say(
        "This task supports markup on pre-tax cost, not target margin. Choose a markup explicitly below."
      );
    }
    const read = await api.step(`Reading ${describe(bill)}`, refTo(bill));
    await api.wait(500);
    read(
      `Read ${lines.length} line${lines.length === 1 ? "" : "s"} from ${describe(bill)} · ${money(lines.reduce((s, l) => s + l.cost, 0))} before tax`
    );

    /* 2 — who, and at what price */
    let customer = findName(api.prompt, CUSTOMERS);
    let markup = /margin/i.test(api.prompt)
      ? undefined
      : findPercent(api.prompt);
    if (
      markup === undefined &&
      has(api.prompt, /at cost|no markup|same price/i)
    )
      markup = 0;
    const askCustomer = async () =>
      (customer = await api.ask(
        "Which customer is this invoice for?",
        CUSTOMERS.slice(0, 4).map((name) => {
          const c = MOCK_NEO_CUSTOMERS.find((x) => x.name === name);
          return {
            id: name,
            label: name,
            hint: c ? `${c.state} · ${c.gstin}` : "",
          };
        })
      ));
    const askMarkup = async () =>
      (markup = Number(
        await api.ask(
          "At what price? Neo marks up the bill's cost.",
          MARKUPS.map((m) => ({
            id: String(m),
            label: m ? `${m}% markup` : "At cost",
          }))
        )
      ));
    // Who, the price, the GST rate and where it's supplied: what the bill
    // doesn't say, on one sheet with Neo's picks filled in (20 Oct 2026).
    // Place of supply follows the customer unless you say the goods go
    // elsewhere.
    const suggestedRate = rateOf(bill);
    const states = [
      ...new Map(
        MOCK_NEO_CUSTOMERS.map((x) => [x.stateCode, x.state])
      ).entries(),
    ];
    const sheet = await decide(
      api,
      `Before I prepare the invoice from ${describe(bill)}`,
      [
        ...(!customer
          ? [
              {
                id: "customer",
                header: "Customer",
                question: "Which customer is it for?",
                recommended: "",
                options: CUSTOMERS.slice(0, 4).map((name) => {
                  const c = MOCK_NEO_CUSTOMERS.find((x) => x.name === name);
                  return {
                    id: name,
                    label: name,
                    hint: c ? `${c.state} · ${c.gstin}` : "",
                  };
                }),
              },
            ]
          : []),
        ...(markup === undefined
          ? [
              {
                id: "markup",
                header: "Price",
                question: "At what price?",
                why: "Neo marks up the bill's pre-tax cost; it isn't a margin.",
                recommended: "",
                options: MARKUPS.map((m) => ({
                  id: String(m),
                  label: m ? `${m}% markup` : "At cost",
                })),
              },
            ]
          : []),
        {
          id: "rate",
          header: "GST rate",
          question: "One GST rate for every resale line?",
          why: "Mixed rates need editing in Sales before approval.",
          recommended: suggestedRate !== undefined ? String(suggestedRate) : "",
          ...(suggestedRate !== undefined
            ? { settled: `the purchase bill charges ${suggestedRate}%` }
            : {}),
          options: [0, 5, 18, 40].map((n) => ({
            id: String(n),
            label: `${n}%`,
          })),
        },
        {
          id: "supply",
          header: "Supply",
          question: "Place of supply?",
          why: "The customer's registration state isn't proof of where the goods go.",
          recommended: "registered",
          options: [
            {
              id: "registered",
              label: "Where the customer is registered",
              hint: "Change only if the goods ship to another state",
            },
            ...states.map(([id, label]) => ({ id, label })),
          ],
        },
      ],
      [
        {
          id: "go",
          label: "Submit and show the invoice",
          primary: true,
          risk: "read",
        },
        { id: "discard", label: "Discard" },
      ]
    );
    if (sheet.choice !== "go") {
      await api.say("Discarded. Nothing was created.");
      return "Discarded";
    }
    if (!customer) customer = sheet.picks.customer;
    if (markup === undefined) markup = Number(sheet.picks.markup);
    const rate = Number(sheet.picks.rate);
    let placeOfSupply: string | undefined =
      sheet.picks.supply === "registered"
        ? MOCK_NEO_CUSTOMERS.find((x) => x.name === customer)?.stateCode
        : sheet.picks.supply;
    let chosenLedger: string | undefined;

    /* 3 — build, preview, and let the user steer until they create */
    for (;;) {
      const c = MOCK_NEO_CUSTOMERS.find((x) => x.name === customer)!;
      const reg = MOCK_NEO_REGISTRATIONS[bill.form.gst];
      if (!c || !reg)
        throw new Error(
          "Customer or company GST registration is missing. Complete the master data before preparing this draft."
        );
      if (!placeOfSupply)
        placeOfSupply = await api.ask(
          `Confirm the place of supply. ${c.state} is the customer's registration state, not proof of the supply location.`,
          [
            ...new Map(
              MOCK_NEO_CUSTOMERS.map((x) => [x.stateCode, x.state])
            ).entries(),
          ].map(([id, label]) => ({ id, label }))
        );
      const supplyState = MOCK_NEO_CUSTOMERS.find(
        (x) => x.stateCode === placeOfSupply
      )!.state;
      const intra = placeOfSupply === reg.stateCode;
      const gstStep = await api.step("Working out GST");
      await api.wait(420);
      gstStep(
        intra
          ? `Confirmed ${supplyState} supply: CGST ${rate / 2}% + SGST ${rate / 2}%`
          : `${reg.state} registration · confirmed ${supplyState} supply: IGST ${rate}%`
      );
      const ledgerStep = await api.step("Choosing the income ledger");
      await api.wait(420);
      const suggestion = ledgerFor(customer!, lines);
      const ledger = chosenLedger || suggestion.ledger;
      const why = chosenLedger
        ? `Ledger selected by you: ${chosenLedger}.`
        : suggestion.why;
      ledgerStep(`Income ledger: ${ledger}`);

      const priced = lines.map((l) => ({
        ...l,
        amount: round2(l.cost * (1 + (markup || 0) / 100)),
      }));
      const taxable = round2(priced.reduce((s, l) => s + l.amount, 0));
      const taxes = intra
        ? [
            { ledger: "Output CGST", amount: round2((taxable * rate) / 200) },
            { ledger: "Output SGST", amount: round2((taxable * rate) / 200) },
          ]
        : [{ ledger: "Output IGST", amount: round2((taxable * rate) / 100) }];
      const grand = round2(taxable + taxes.reduce((s, t) => s + t.amount, 0));
      const voucherNo = nextVoucherNo();
      const date = todayIso();

      const voucherLines: NeoVoucherLine[] = [
        { ledger: customer!, side: "Dr", amount: grand },
        ...priced.map((l) => ({
          ledger: `${ledger} · ${l.text}`,
          side: "Cr" as const,
          amount: l.amount,
          inferred: true,
        })),
        ...taxes.map((t) => ({
          ledger: `${t.ledger} ${intra ? rate / 2 : rate}%`,
          side: "Cr" as const,
          amount: t.amount,
        })),
      ];
      const preview: NeoCard = {
        kind: "voucher",
        voucherType: "Sales",
        state: "Preview",
        voucherNo,
        party: `${customer} · ${c.gstin}`,
        date: day(date),
        lines: voucherLines,
        why: `${markup ? `${markup}% over the bill's cost. ` : "At the bill's cost. "}${why}`,
        source: refTo(bill),
        company: companyOf(bill.company)?.name,
        items: priced.map((l) => ({
          description: l.text,
          cost: l.cost,
          amount: l.amount,
        })),
        evidence: chosenLedger ? [] : suggestion.evidence,
        assumptions: [
          "Scope: resell every purchase line to one customer. Each source line is consolidated as quantity 1; physical quantities must be checked in Sales.",
          `Your pricing: ${markup}% markup on pre-tax line cost, not margin. No additional freight or discount.`,
          `Your tax inputs: ${rate}% for every line; place of supply ${supplyState}. Company registration: ${bill.form.gst}.`,
          `Invoice date: ${day(date)}. Partial quantities and mixed tax rates need editing in Sales before approval.`,
        ],
      };
      const choice = await api.card(preview, [
        { id: "create", label: "Create draft", primary: true, risk: "draft" },
        { id: "customer", label: "Change customer" },
        { id: "markup", label: "Change price" },
        { id: "ledger", label: "Change ledger" },
        { id: "supply", label: "Change place of supply" },
        { id: "discard", label: "Discard" },
      ]);
      if (choice === "discard") {
        await api.say("Discarded. Nothing was created.");
        return "Discarded";
      }
      if (choice === "customer") {
        await askCustomer();
        placeOfSupply = undefined;
        chosenLedger = undefined;
        continue;
      }
      if (choice === "markup") {
        await askMarkup();
        continue;
      }
      if (choice === "supply") {
        placeOfSupply = undefined;
        continue;
      }
      if (choice === "ledger") {
        chosenLedger = await api.ask(
          "Choose the sales ledger",
          [
            ...new Set([
              suggestion.ledger,
              "Sales",
              "Service Income",
              "Other Income",
            ]),
          ].map((name) => ({ id: name, label: name }))
        );
        continue;
      }

      /* 4 — create */
      const writing = await api.step("Creating the sales invoice");
      const template =
        getState().items.find((x) => x.route === "AR" && x.original.invoice) ||
        bill;
      const sheet = {
        ...blankArSheet(),
        salesLedger: ledger,
        items: priced.map((l) => ({
          ...blankArItem(),
          description: l.text,
          quantity: 1,
          unitRate: l.amount,
          amount: l.amount,
          tax: `GST ${rate}%`,
        })),
        ledgers: [blankArLedger()],
        taxes: taxes.map((t) => ({
          id: arRowId(),
          ledger: t.ledger,
          costCentre: "",
          amount: t.amount,
        })),
      };
      const id = `NEO-SI-${voucherNo.split("/").pop()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const item: Item = {
        ...structuredClone(template),
        id,
        route: "AR",
        aiRoute: "AR",
        topChoice: "AR",
        confidence: bill.confidence,
        reason: `Prepared by Neo from ${bill.id} for ${actor}.`,
        source: "upload",
        sender: actor,
        subject: `Sales invoice from ${describe(bill)}`,
        file: {
          name: `${voucherNo} · ${customer}.pdf`,
          size: "Prepared by Neo",
          ext: "pdf",
        },
        received: new Date().toISOString(),
        form: {
          ...structuredClone(template.form),
          gst: bill.form.gst,
          voucherType: "Sales",
          voucherNo,
          invoiceNo: voucherNo,
          date,
          due: "",
          party: customer!,
          costCentre: bill.form.costCentre,
          narration: `Against purchase ${describe(bill)}. ${markup}% markup on pre-tax cost; place of supply ${supplyState}; GST ${rate}%. Each source line consolidated as quantity 1.`,
          lines: deriveLines(sheet),
        },
        amount: arTotals(sheet).grandTotal,
        original: {
          ...structuredClone(template.original),
          id,
          route: "AR",
          customer: customer!,
          vendor: "—",
          invoice: {
            voucherNo,
            invoiceNo: voucherNo,
            invoiceDate: date,
            dueDate: "",
            gstReg: bill.form.gst,
            costCentre: bill.form.costCentre || null,
            customer: customer!,
            flagged: [],
            items: priced.map((l) => ({
              desc: l.text,
              ledger,
              amount: l.amount,
            })),
            taxes: intra
              ? { cgst: taxes[0].amount, sgst: taxes[1].amount }
              : { igst: taxes[0].amount },
            subTotal: taxable,
            grandTotal: grand,
          },
          bill: undefined,
          jv: undefined,
        },
        arSheet: sheet,
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
      await api.wait(450);
      if (
        JSON.stringify(getState().items.find((x) => x.id === bill.id)) !==
        sourceSnapshot
      )
        throw new Error(
          "The source purchase changed after it was read. Run this request again to prepare a fresh preview; no sales draft was created."
        );
      const created = neoCreate(item, api.runId, bill.id);
      api.touch([created.id]);
      api.onUndo(() => neoDiscard([created], api.runId));
      writing(
        `Created ${voucherNo} for ${customer} · ${money(grand)} · Needs Review`
      );
      api.updateCard({ ...preview, state: "Draft created" }, []);
      await api.say(
        `${voucherNo} is in Sales as a draft, waiting for your approval. The purchase ${bill.id} is unchanged, and still needs booking as a purchase.`,
        [
          { label: `Open ${voucherNo}`, itemId: created.id, target: "open" },
          { label: "Show in Inbox", itemId: created.id, target: "inbox" },
        ]
      );
      return `${voucherNo} for ${customer} · ${money(grand)}`;
    }
  },
};

export default salesFromPurchase;
