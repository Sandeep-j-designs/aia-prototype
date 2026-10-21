import { companyOf, getState } from "@/components/inbox/v2/store";
import {
  BACKFILL_LABEL,
  collectionAgent,
  collectionDraft,
  commitCollectionSetup,
  discardCollectionDraft,
  dryRunCollection,
  patchCollectionDraft,
  setDraftChannel,
  sinceFor,
  startCollectionDraft,
} from "@/hooks/pages/inbox/use-inbox-sources";
import {
  forwardingAddress,
  MOCK_FORWARDING_CODE,
  MOCK_GMAIL_FILTER,
  SOURCE_SCOPES,
} from "@/config/pages/inbox/mock-sources";
import { decide } from "./shared";
import type { NeoTask } from "@/types/pages/neo";
import type {
  CollectionBackfill,
  CollectionSetup,
} from "@/types/pages/inbox/sources";
import { has } from "@/utils/pages/neo";

const AGENT_HREF = "/inbox?module=AGENTS&page=document-collection";
const MONTHS = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");
const day = (iso: string) =>
  `${Number(iso.slice(8))} ${MONTHS.at(Number(iso.slice(5, 7)) - 1)}`;

/**
 * Document Collection, set up in the chat (19 Oct 2026; plan: "Document
 * Collection setup — research and plan"). Six steps fill a live setup card:
 * where bills arrive, connect each channel (the forwarding address first,
 * needing no permission), which documents count, how far back, then a dry
 * run that creates nothing. Turn on saves it and collects the backfill.
 *
 * A field the person changed on the card is never asked again or
 * overwritten (`patchCollectionDraft` keeps their edit).
 *
 * "Edit agent Document collection" opens the saved setup straight at the
 * card and its dry run.
 */
const collectionSetup: NeoTask = {
  id: "collection-setup",
  title: "Set up Document collection",
  match: (p) =>
    has(
      p,
      /set ?up (the )?(document )?collection|(edit|open) agent document collection|document collection agent/i,
      /\b(collect|gather|pick up)\b.*\bbills?\b.*\b(from|in|on)\b.*\b(gmail|e-?mail|mail|whatsapp|drive)\b/i
    )
      ? 60
      : 0,
  run: async (api) => {
    const company = api.context.company || getState().company;
    const org = companyOf(company);
    const slug = org?.slug || company;
    const before = collectionAgent(company);
    const editing = !!before.setup;
    const edited = (k: keyof CollectionSetup) =>
      !!collectionDraft(company)?.edited.includes(k);

    startCollectionDraft(company);
    try {
      if (editing) {
        await api.say(
          `Here's how Document collection is set up for ${org?.name}. Change anything on the card and I'll show what it would collect before saving.`
        );
        api.show({ kind: "collection-setup", company });
      } else {
        await api.say(
          `I'll set up Document collection for ${org?.name} with you. It collects supplier bills and prepares drafts for review. It never approves, posts or messages anyone. The card fills in as we go, and you can change anything on it.`
        );
        api.show({ kind: "collection-setup", company });

        /*
          Everything setup needs, on one sheet (20 Oct 2026): channels, the
          Gmail label, the Drive folder, senders, non-bills and how far back.
          Neo's picks are filled in; questions about a channel show only
          while that channel is picked. One button applies them and runs the
          dry run, whose card is the turn-on.
        */
        const items = getState().items.filter((x) => x.company === company);
        const hasWhatsApp = items.some((x) => x.source === "whatsapp");
        const order: CollectionBackfill[] = ["period", "30d", "fy", "new"];
        const { choice: ready, picks } = await decide(
          api,
          `Set up Document collection for ${org?.name}`,
          [
            {
              id: "where",
              header: "Channels",
              question: "Where do bills arrive today?",
              why: "Pick the closest; a channel can be added later. Email starts with a forwarding address, which needs no access to your mailbox.",
              recommended: hasWhatsApp ? "email-wa" : "email",
              ...(hasWhatsApp
                ? {
                    settled:
                      "your Inbox already has bills from email and WhatsApp",
                  }
                : {}),
              options: [
                { id: "email-wa", label: "Email and WhatsApp" },
                { id: "email", label: "Email only" },
                { id: "all", label: "Email, a Drive folder and WhatsApp" },
                { id: "wa", label: "WhatsApp only" },
              ],
            },
            {
              id: "gmail",
              header: "Gmail label",
              question: "Also read a Gmail label directly?",
              why: "Forwarding is enough to start. A label is read-only and sees only the mail you file there.",
              when: { id: "where", in: ["email-wa", "email", "all"] },
              recommended: "no",
              options: [
                { id: "no", label: "Not now, forwarding is enough" },
                { id: "yes", label: "Connect Gmail: read-only, one label" },
              ],
            },
            {
              id: "folder",
              header: "Drive folder",
              question: "Which Drive folder?",
              when: { id: "where", in: ["all"] },
              recommended: "new",
              options: [
                {
                  id: "new",
                  label: "A folder AI Accountant creates",
                  hint: "Access to that folder only",
                },
                {
                  id: "existing",
                  label: "An existing folder",
                  hint: "Needs read access to your whole Drive",
                },
              ],
            },
            ...(!edited("senders")
              ? [
                  {
                    id: "senders",
                    header: "Senders",
                    question: "Whose bills should I collect?",
                    recommended: "known",
                    options: [
                      {
                        id: "known",
                        label: "Your vendors and staff",
                        hint: "Anyone else is skipped, and you can allow them",
                      },
                      { id: "anyone", label: "Anyone who sends one" },
                    ],
                  },
                ]
              : []),
            ...(!edited("files")
              ? [
                  {
                    id: "files",
                    header: "Other files",
                    question: "Files that aren't bills?",
                    why: "Bank statements, payment advices, quotes and newsletters.",
                    recommended: "bills",
                    options: [
                      {
                        id: "bills",
                        label: "Skip them",
                        hint: "Each is listed with the reason",
                      },
                      { id: "all", label: "Hold them for me to file" },
                    ],
                  },
                ]
              : []),
            ...(!edited("backfill")
              ? [
                  {
                    id: "backfill",
                    header: "How far back",
                    question: "How far back should the first collection go?",
                    why: "September's GSTR-3B is due on 20 Oct, so starting on 1 Sep makes that return complete.",
                    recommended: "period",
                    options: order.map((b) => ({
                      id: b,
                      label: `${BACKFILL_LABEL[b]} · ${day(sinceFor(b))}`,
                    })),
                  },
                ]
              : []),
          ],
          [
            {
              id: "go",
              label: "Submit and show a dry run",
              primary: true,
              risk: "read",
            },
            { id: "cancel", label: "Not now" },
          ]
        );
        if (ready !== "go") {
          await api.say("Nothing saved.");
          return "Nothing saved";
        }
        const where = picks.where;
        const email = where !== "wa";
        const drive = where === "all";
        const whatsapp = where !== "email";
        if (email) {
          setDraftChannel(company, {
            provider: "Forwarding",
            status: "connected",
            account: forwardingAddress(slug),
            scope: SOURCE_SCOPES.Forwarding[0],
          });
          await api.say(
            `Your forwarding address is ready: ${forwardingAddress(slug)}. In Gmail, open Settings › Forwarding, add it, and forward everything sent to accounts@. Gmail mails a confirmation code to the new address; I caught it for you: ${MOCK_FORWARDING_CODE}.`
          );
        }
        if (drive)
          setDraftChannel(company, {
            provider: "Google Drive",
            status: "connected",
            account: `accounts@${slug}.example`,
            scope:
              SOURCE_SCOPES["Google Drive"][picks.folder === "new" ? 0 : 1],
          });
        // Choosing WhatsApp on the sheet is the go-ahead for the business
        // number: vendors in your masters and named staff only.
        if (whatsapp)
          setDraftChannel(company, {
            provider: "WhatsApp Business",
            status: "connected",
            account: "Business number +91 80 4718 2290",
            scope: SOURCE_SCOPES["WhatsApp Business"][0],
          });
        if (picks.senders)
          patchCollectionDraft(company, {
            senders: picks.senders as CollectionSetup["senders"],
          });
        if (picks.files)
          patchCollectionDraft(company, {
            files: picks.files as CollectionSetup["files"],
          });
        if (picks.backfill)
          patchCollectionDraft(company, {
            backfill: picks.backfill as CollectionBackfill,
          });
        // Google's consent is its own step, and only for the label.
        if (email && picks.gmail === "yes") {
          const allow = await api.ask(
            "Allow AI Accountant to read the Gmail label AIA/Bills?\nRead-only. It can't send or delete mail, or see other labels. Google's sign-in opens in its own window.",
            [
              { id: "allow", label: "Allow (sample sign-in)" },
              { id: "cancel", label: "Cancel" },
            ]
          );
          setDraftChannel(company, {
            provider: "Gmail",
            status: allow === "allow" ? "connected" : "skipped",
            account: `accounts@${slug}.example`,
            scope: SOURCE_SCOPES.Gmail[0],
          });
          if (allow === "allow")
            await api.say(
              `Connected. I'll read AIA/Bills only. To fill the label by itself, add this Gmail filter and set it to apply AIA/Bills: ${MOCK_GMAIL_FILTER}. It's on the card to copy.`
            );
        }
      }

      /* 6 — dry run, then switch on */
      const draft = collectionDraft(company);
      const live = draft?.channels.filter((c) => c.status === "connected");
      if (!draft || !live?.length) {
        await api.say(
          "No channel is connected, so there's nothing to collect yet. Ask me again when you're ready."
        );
        return "No channel connected";
      }
      const done = await api.step(
        `Dry run: checking ${live.length} channel${live.length === 1 ? "" : "s"} since ${day(sinceFor(draft.backfill))}`
      );
      await api.wait(700);
      done("Dry run finished; nothing was created");
      const keepOn = editing && before.configured;
      const choice = await api.card(
        { kind: "collection-dry-run", company },
        keepOn
          ? [
              { id: "save", label: "Save changes", primary: true },
              { id: "cancel", label: "Cancel" },
            ]
          : [
              { id: "on", label: "Turn on", primary: true },
              { id: "draft", label: "Save as draft" },
              { id: "cancel", label: "Not now" },
            ]
      );
      if (choice === "cancel") {
        await api.say(editing ? "Kept the setup as it was." : "Nothing saved.");
        return "Nothing saved";
      }
      const final = collectionDraft(company)!;
      const rows = dryRunCollection(company, final);
      api.updateCard({ kind: "collection-dry-run", company, rows });
      commitCollectionSetup(company, choice === "draft" ? "draft" : "on");

      if (choice === "draft") {
        await api.say(
          "Saved as a draft. It won't collect anything until you turn it on.",
          [{ label: "Open Document collection", href: AGENT_HREF }]
        );
        return "Saved as a draft";
      }
      if (choice === "save") {
        await api.say(
          "Saved. The next check uses the new rules; nothing already collected changes.",
          [{ label: "Open Document collection", href: AGENT_HREF }]
        );
        return "Setup changed";
      }
      await api.say(
        `Document collection is on. It checks ${final.schedule === "15m" ? "every 15 minutes" : "only when you ask"}. Collecting the backfill now.`
      );
      // The first collection is an ordinary run: same rules as the dry run.
      await api.chain(
        "Collect documents from my connected sources and prepare my Inbox"
      );
      return "Document collection turned on";
    } finally {
      // Stopped or finished: an unsaved draft never lingers.
      if (collectionDraft(company)) discardCollectionDraft(company);
    }
  },
};

export default collectionSetup;
