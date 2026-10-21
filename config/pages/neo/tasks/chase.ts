import {
  actor,
  companyOf,
  getState,
  neoLog,
} from "@/components/inbox/v2/store";
import { decide } from "./shared";
import type { NeoCard, NeoTask } from "@/types/pages/neo";
import { findName, has } from "@/utils/pages/neo";
import { openChaseOn, recordChase } from "@/hooks/pages/neo/use-chases";
import {
  contactFor,
  normaliseEmail,
  normalisePhone,
  saveContact,
} from "@/hooks/pages/neo/use-contacts";
import { VENDOR_REQUEST_TEMPLATE } from "@/config/pages/neo/mock-contacts";
import { demoNote } from "@/config/pages/neo/demo";
import type { ChaseAsk } from "@/types/pages/neo/chases";
import {
  companyItems,
  describe,
  isOpen,
  pickItem,
  refTo,
  resolveItem,
} from "./shared";

/**
 * "Ask AWS for their GSTIN."
 *
 * The one external task. Neo drafts the message from what the document says
 * and shows it word for word, editable; it goes only when the user sends it.
 * It goes to the address the vendor's bill came from. Without one, Neo hands
 * over the text instead of guessing a recipient.
 *
 * In the prototype the send is simulated and logged. Nothing leaves the page.
 *
 * DEV: tool — send_vendor_message(itemId, channel, body). WhatsApp goes
 * through the approved template API; free text only inside the 24-hour window.
 */

const ASKS = [
  {
    id: "gstin",
    label: "Their GSTIN",
    test: /gstin|gst number|gst no|registration/i,
  },
  {
    id: "copy",
    label: "A clearer copy of the bill",
    test: /copy|clear|legible|scan|resend/i,
  },
  {
    id: "invoice",
    label: "The tax invoice, not the proforma",
    test: /tax invoice|proforma/i,
  },
  {
    id: "credit",
    label: "A credit note for the difference",
    test: /credit note|difference|short/i,
  },
];

const body = (ask: string, vendor: string, doc: string, company: string) => {
  const hello = `Hello ${vendor.split(" ")[0]} team,`;
  const sign = `Thanks,\n${actor}\nAccounts, ${company}`;
  switch (ask) {
    case "gstin":
      return `${hello}\n\nWe're booking your invoice ${doc} and need your GSTIN to claim the input tax credit. Could you share it, or a copy of your GST registration certificate?\n\n${sign}`;
    case "copy":
      return `${hello}\n\nThe copy of invoice ${doc} we received isn't readable in places. Could you send a clearer PDF?\n\n${sign}`;
    case "invoice":
      return `${hello}\n\nWe have a proforma for ${doc}. To book it we need the final tax invoice. Could you send it across?\n\n${sign}`;
    default:
      return `${hello}\n\nOn invoice ${doc}, the amount billed is more than agreed. Could you issue a credit note for the difference?\n\n${sign}`;
  }
};

const chase: NeoTask = {
  id: "chase",
  title: "Message a vendor",
  match: (p) =>
    has(
      p,
      /\b(ask|chase|message|whatsapp|email|remind|write to|follow up)\b/i
    ) && !has(p, /\bwhy\b/i)
      ? 3
      : 0,
  run: async (api) => {
    const bills = companyItems().filter((x) => x.route === "AP" && isOpen(x));
    const vendor = findName(api.prompt, [
      ...new Set(bills.map((x) => x.form.party).filter(Boolean)),
    ]);
    let x =
      resolveItem(api, (i) => i.route === "AP") ||
      bills.find((b) => b.form.party === vendor);
    if (!x) {
      if (!bills.length) {
        await api.say("There are no open bills to follow up on.");
        return "Nothing open";
      }
      x = await pickItem(
        api,
        "Which bill is this about?",
        [...bills].sort(
          (a, b) =>
            Number(!!b.original.bill?.vendorMissing) -
            Number(!!a.original.bill?.vendorMissing)
        )
      );
      if (!x) return;
    }
    const named = ASKS.find((a) => a.test.test(api.prompt))?.id;
    const party = x.form.party || "the vendor";
    /*
      Where it can go. The address a bill was emailed from is the vendor's
      own; the vendor master may add an email or a WhatsApp number. A bill
      that came in on WhatsApp was forwarded by a teammate, so its sender is
      one of us — never message that number as if it were the vendor.
    */
    const src = x.original.source;
    const fromEmail =
      src.channel === "email" && /@/.test(src.sender) ? src.sender : "";
    const saved = contactFor(x.form.party);
    type Way = { channel: "Email" | "WhatsApp"; to: string; hint: string };
    const ways: Way[] = [
      fromEmail && {
        channel: "Email" as const,
        to: fromEmail,
        hint: "The address the bill came from",
      },
      saved.email &&
        saved.email !== fromEmail && {
          channel: "Email" as const,
          to: saved.email,
          hint: "From the vendor master",
        },
      saved.whatsapp && {
        channel: "WhatsApp" as const,
        to: saved.whatsapp,
        hint: "From the vendor master · approved template",
      },
    ].filter(Boolean) as Way[];

    // What to ask for (if the request didn't say) and which way to send
    // it (if there's more than one), on one sheet; the message preview after
    // it is the send.
    let askId: string = named || ASKS[0].id;
    let way: Way | undefined = ways[0];
    if (!named || ways.length > 1) {
      const { choice, picks } = await decide(
        api,
        `Follow up with ${party}`,
        [
          ...(!named
            ? [
                {
                  id: "ask",
                  header: "Request",
                  question: "What do you need from them?",
                  recommended: x.original.bill?.vendorMissing ? "gstin" : "",
                  ...(x.original.bill?.vendorMissing
                    ? { settled: "the vendor isn't in your masters yet" }
                    : {}),
                  options: ASKS.map((a) => ({ id: a.id, label: a.label })),
                },
              ]
            : []),
          ...(ways.length > 1
            ? [
                {
                  id: "way",
                  header: "Send by",
                  question: "Send it how?",
                  recommended: "0",
                  options: ways.map((w, i) => ({
                    id: String(i),
                    label: `${w.channel} · ${w.to}`,
                    hint: w.hint,
                  })),
                },
              ]
            : []),
        ],
        [
          {
            id: "go",
            label: "Submit and draft the message",
            primary: true,
            risk: "read",
          },
          { id: "cancel", label: "Not now" },
        ]
      );
      if (choice !== "go") {
        await api.say("Nothing drafted.");
        return "Not drafted";
      }
      askId = named || picks.ask;
      if (picks.way !== undefined) way = ways[Number(picks.way)];
    }
    const already = openChaseOn(x.id, askId as ChaseAsk);
    if (already) {
      await api.say(
        already.status === "received"
          ? `${x.form.party || "The vendor"} already replied: “${already.reply?.text}” Use it on the bill rather than asking again.`
          : `I asked ${x.form.party || "the vendor"} for this on ${new Date(already.sentAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} and I'm still waiting. I won't send it twice.`,
        [refTo(x)]
      );
      return "Chase already open";
    }
    if (!way) {
      // No contact on file: add one here, rather than sending the person
      // off to the vendor master — or hand over the text.
      const pick = await api.ask(
        `${party} has no email or WhatsApp in the vendor master. How should I reach them?`,
        [
          { id: "whatsapp", label: "Add their WhatsApp number" },
          { id: "email", label: "Add their email address" },
          { id: "copy", label: "Just give me the text" },
        ]
      );
      if (pick === "whatsapp") {
        const to = await api.askText(`${party}'s WhatsApp number?`, {
          placeholder: "+91 98450 12345",
          parse: normalisePhone,
          retry: "That isn't a 10-digit Indian mobile number.",
        });
        saveContact(x.form.party, { whatsapp: to });
        way = { channel: "WhatsApp", to, hint: "Added to the vendor master" };
      } else if (pick === "email") {
        const to = await api.askText(`${party}'s email address?`, {
          placeholder: "accounts@vendor.com",
          parse: normaliseEmail,
          retry: "That doesn't look like an email address.",
        });
        saveContact(x.form.party, { email: to });
        way = { channel: "Email", to, hint: "Added to the vendor master" };
      }
    }

    const drafting = await api.step("Drafting the message", refTo(x));
    await api.wait(500);
    const company = companyOf(getState().company)?.name || "";
    const doc = x.form.invoiceNo || x.file.name;
    const card: NeoCard = {
      kind: "message",
      channel: way?.channel || "Email",
      to: way?.to || "no contact on file",
      body: body(askId, x.form.party || "Vendor", doc, company),
      template:
        way?.channel === "WhatsApp" ? VENDOR_REQUEST_TEMPLATE : undefined,
    };
    drafting(
      way
        ? `Drafted a${way.channel === "Email" ? "n email" : " WhatsApp message"} to ${party}${way.hint.startsWith("Added") ? " · contact saved to the vendor master" : ""}`
        : "Drafted the text to send yourself"
    );
    if (!way) {
      const pick = await api.card(card, [
        { id: "copy", label: "Copy the text", primary: true },
        { id: "cancel", label: "Don't send" },
      ]);
      if (pick === "copy") {
        if (!navigator.clipboard)
          throw new Error(
            "Clipboard access is unavailable. Select and copy the message text manually."
          );
        await navigator.clipboard.writeText(card.body);
        neoLog("Neo Vendor Message Drafted", api.runId, x, { request: askId });
        await api.say("Copied. Send it from your own phone or mail.");
        return "Drafted, not sent";
      }
      await api.say("Not sent.");
      return "Not sent";
    }
    const to = way.to;
    const choice = await api.card(card, [
      {
        id: "send",
        label: "Send",
        primary: true,
        risk: "external",
      },
      { id: "cancel", label: "Don't send" },
    ]);
    if (choice !== "send") {
      await api.say("Not sent.");
      return "Not sent";
    }
    const sending = await api.step(`Sending to ${to}`);
    await api.wait(700);
    neoLog("Neo Vendor Message Sent", api.runId, x, {
      channel: card.channel,
      to,
      request: askId,
      simulated: true,
      body: card.body,
    });
    recordChase({
      company: x.company,
      ask: askId as ChaseAsk,
      party: x.form.party || to,
      channel: card.channel,
      to,
      body: card.body,
      itemId: x.id,
      docRef: doc,
      runId: api.runId,
    });
    api.touch([x.id]);
    sending(`Sent to ${to} · logged against ${x.id}`);
    await api.say(
      `Sent. I'll watch for the reply and link it to ${describe(x)} when it lands — it's under Chases in Needs attention until then.${demoNote(" (Simulated: nothing left the prototype.)")}`,
      [refTo(x)]
    );
    return `Asked ${x.form.party || to}`;
  },
};

export default chase;
