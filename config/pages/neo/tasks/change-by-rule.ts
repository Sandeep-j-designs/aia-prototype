import {
  companyOf,
  getState,
  neoUndoChanges,
  update,
  type Item,
} from "@/components/inbox/v2/store";
import { LEDGERS } from "@/config/pages/inbox/journal-masters";
import { COST_CENTRES } from "@/config/pages/inbox/mock-cost-centres";
import { decide } from "./shared";
import type { NeoChangeRow, NeoTask } from "@/types/pages/neo";
import { findName, has, money } from "@/utils/pages/neo";
import { companyItems, isOpen } from "./shared";

/**
 * Change by rule: "Move all Mahindra Logistics bills from Transportation to
 * Freight Inward", "Tag Sri Balaji Packaging bills to Hosur Plant".
 *
 * One instruction finds the set, every bill is shown before → after, and the
 * person signs off once with the count and the rupees in view. Rows Neo is
 * unsure of start unticked, with the reason. Only drafts change: approved
 * bills the rule matched are counted and left alone, and everything changed
 * still waits in Needs Review. The run's Undo puts each bill back.
 *
 * DEV: tools — list_items(filter), bulk_update(ids, field, value) with an
 * If-Match on each item's version, so a bill edited after the preview is
 * refused rather than overwritten.
 */

type Field = "Ledger" | "Cost centre";

const valueOf = (line: Item["form"]["lines"][number], field: Field) =>
  field === "Ledger" ? line.ledger : line.costCentre;

const knownValues = (field: Field) =>
  field === "Ledger"
    ? [
        ...new Set([
          ...companyItems().flatMap((x) => x.form.lines.map((l) => l.ledger)),
          ...LEDGERS.map((l) => l.name),
          "Freight Inward",
          "Freight Outward",
          "Office Expenses",
          "Staff Welfare",
        ]),
      ].filter(Boolean)
    : COST_CENTRES.map((c) => c.name);

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
};

/** Why a row should be looked at before it changes, if it should. */
const doubtOf = (x: Item, peers: Item[]) => {
  if (x.status === "Duplicate") return "Possible duplicate — check it first";
  const usual = median(peers.map((p) => p.amount));
  if (peers.length >= 3 && usual && x.amount > usual * 1.6)
    return `${money(x.amount)} is well above this vendor's usual ${money(usual)}`;
  const words = (p: Item) =>
    (p.form.lines[0]?.description || "").toLowerCase().trim();
  const common = peers
    .map(words)
    .sort(
      (a, b) =>
        peers.filter((p) => words(p) === b).length -
        peers.filter((p) => words(p) === a).length
    )[0];
  if (peers.length >= 3 && common && words(x) && words(x) !== common)
    return `Described as “${x.form.lines[0].description}”, unlike the others`;
  return undefined;
};

const changeByRule: NeoTask = {
  id: "change-by-rule",
  title: "Change bills by rule",
  match: (p) =>
    has(
      p,
      /\b(move|change|set|switch|re-?ledger|recode|re-?code|reclass|tag|post)\b.*\b(to|ledger|under|into|cost cent)/i
    ) && !has(p, /sales invoice|journal|jv\b|remind/i)
      ? // Acting on records already chosen outranks entering new ones.
        /\bselected\b/i.test(p)
        ? 10
        : 4
      : 0,
  run: async (api) => {
    const field: Field = /cost cent|\btag\b/i.test(api.prompt)
      ? "Cost centre"
      : "Ledger";
    const selection = /selected|ticked|these|chosen/i.test(api.prompt);
    if (selection && !api.context.selectedIds.length) {
      await api.say("Select the bills first. Nothing was changed.");
      return "No selection";
    }
    const bills = companyItems().filter(
      (x) =>
        x.route === "AP" &&
        x.status !== "Deleted" &&
        x.form.party &&
        x.form.lines.length &&
        (!selection || api.context.selectedIds.includes(x.id))
    );
    const openVendors = [
      ...new Set(bills.filter(isOpen).map((x) => x.form.party)),
    ];
    let vendor = findName(api.prompt, [
      ...new Set(bills.map((x) => x.form.party)),
    ]);
    if (!vendor && !selection && !openVendors.length) {
      await api.say("There are no open purchase bills to change.");
      return "Nothing open";
    }

    const values = knownValues(field);
    const fromText = api.prompt.match(/\bfrom\b(.*?)\b(?:to|into|under)\b/i);
    const from = fromText ? findName(fromText[1], values) : undefined;
    const toText = api.prompt.split(/\b(?:to|into|under)\b/i).pop() || "";
    let to = findName(toText, values);
    // Whose bills and where they go, if the request didn't say, on one
    // sheet; the change set after it is the sign-off (20 Oct 2026).
    const askVendor = !vendor && !selection;
    if (askVendor || !to) {
      const targets =
        field === "Ledger"
          ? [
              "Freight Inward",
              "Office Expenses",
              "General Expenses",
              "Repairs & Maintenance",
            ]
          : COST_CENTRES.slice(0, 4).map((c) => c.name);
      const { choice, picks } = await decide(
        api,
        field === "Ledger"
          ? "Move bills to another ledger"
          : "Tag bills with a cost centre",
        [
          ...(askVendor
            ? [
                {
                  id: "vendor",
                  header: "Vendor",
                  question: "Whose bills?",
                  recommended: "",
                  options: openVendors.slice(0, 4).map((v) => ({
                    id: v,
                    label: v,
                    hint: `${bills.filter((b) => b.form.party === v && isOpen(b)).length} open`,
                  })),
                },
              ]
            : []),
          ...(!to
            ? [
                {
                  id: "to",
                  header: "Move to",
                  question:
                    field === "Ledger"
                      ? "Which ledger should they go to?"
                      : "Which cost centre should they carry?",
                  recommended: "",
                  options: targets.map((v) => ({ id: v, label: v })),
                },
              ]
            : []),
        ],
        [
          {
            id: "go",
            label: "Submit and find the bills",
            primary: true,
            risk: "read",
          },
          { id: "cancel", label: "Not now" },
        ]
      );
      if (choice !== "go") {
        await api.say("Nothing changed.");
        return "Not changed";
      }
      if (askVendor) vendor = picks.vendor;
      to = to || picks.to;
    }

    const scan = await api.step(
      `Finding ${vendor ? `${vendor}'s` : "the selected"} bills${from ? ` on ${from}` : ""}`
    );
    await api.wait(450);
    const matched = bills.filter(
      (x) =>
        (!vendor || x.form.party === vendor) &&
        x.form.lines.some(
          (l) =>
            (!from || valueOf(l, field) === from) && valueOf(l, field) !== to
        )
    );
    const approved = matched.filter((x) => x.status === "Approved");
    const open = matched.filter(isOpen);
    scan(
      `${open.length} open bill${open.length === 1 ? "" : "s"} to change${approved.length ? ` · ${approved.length} approved, left alone` : ""}`
    );
    if (!open.length) {
      await api.say(
        approved.length
          ? `The only matching bills are approved, so they're posted as they are. Nothing to change.`
          : `${vendor || "Those"} bills are already on ${to}. Nothing to change.`
      );
      return "Nothing to change";
    }

    const rows: NeoChangeRow[] = open.map((x) => {
      const doubt = doubtOf(x, open);
      return {
        itemId: x.id,
        label: x.form.invoiceNo || x.form.voucherNo || x.id,
        from:
          [
            ...new Set(
              x.form.lines.map((l) => valueOf(l, field)).filter((v) => v !== to)
            ),
          ].join(", ") || "—",
        to,
        amount: x.amount,
        checked: !doubt,
        doubt,
      };
    });
    const company = companyOf(getState().company)?.name || "";
    const card = {
      kind: "changeset" as const,
      title: `${field === "Ledger" ? "Move" : "Tag"} ${vendor || "selected"} bills to ${to}`,
      rule: [
        vendor && `vendor = ${vendor}`,
        from && `${field.toLowerCase()} = ${from}`,
        "status = Needs review",
      ]
        .filter(Boolean)
        .join(" · "),
      field,
      verb: field === "Ledger" ? "Move" : "Tag",
      company,
      approvedSkipped: approved.length,
      rows,
    };
    const choice = await api.card(card, [
      { id: "apply", label: "Apply", primary: true, risk: "draft" },
      { id: "cancel", label: "Cancel" },
    ]);
    const picked = card.rows.filter((r) => r.checked);
    if (choice !== "apply" || !picked.length) {
      await api.say("Cancelled. The bills are as they were.");
      return "Cancelled";
    }

    const targets = open.filter((x) => picked.some((r) => r.itemId === x.id));
    const snapshots = targets.map((x) => structuredClone(x));
    const applying = await api.step(
      `Setting ${to} on ${targets.length} bill${targets.length === 1 ? "" : "s"}`
    );
    await api.wait(350);
    if (
      snapshots.some(
        (x) =>
          JSON.stringify(getState().items.find((i) => i.id === x.id)) !==
          JSON.stringify(x)
      )
    )
      throw new Error(
        "A bill changed after the preview. Ask again to review the current values."
      );
    for (const x of targets) {
      const form = structuredClone(x.form);
      form.lines = form.lines.map((l) =>
        (!from || valueOf(l, field) === from) && valueOf(l, field) !== to
          ? field === "Ledger"
            ? { ...l, ledger: to }
            : { ...l, costCentre: to, costAllocation: null }
          : l
      );
      if (field === "Cost centre") {
        form.costCentre = "";
        form.costClass = "";
      }
      update(
        x.id,
        {
          form,
          edited: [...new Set([...x.edited, field])],
        },
        field === "Ledger" ? "ledger" : "costCentre"
      );
    }
    api.touch(targets.map((x) => x.id));
    api.onUndo(neoUndoChanges(snapshots, api.runId));
    const sum = targets.reduce((s, x) => s + x.amount, 0);
    api.remember({
      kind: "move",
      vendor,
      ids: targets.map((x) => x.id),
      label: `${targets.length} ${vendor ? `${vendor} ` : ""}bill${targets.length === 1 ? "" : "s"} on ${to}`,
    });
    applying(
      `${card.verb === "Move" ? "Moved" : "Tagged"} ${targets.length} bill${targets.length === 1 ? "" : "s"} · ${money(sum)}`
    );
    await api.say(
      `Done. ${targets.length} bill${targets.length === 1 ? " is" : "s are"} on ${to} and still waiting for review — nothing was approved.${card.rows.length > picked.length ? ` ${card.rows.length - picked.length} left as ${card.rows.length - picked.length === 1 ? "it was" : "they were"}.` : ""} Undo is below, and in Activity until they're approved.`,
      targets.slice(0, 3).map((x) => ({
        label: x.form.invoiceNo || x.id,
        itemId: x.id,
        target: "inbox" as const,
      }))
    );
    return `${targets.length} bills → ${to}`;
  },
};

export default changeByRule;
