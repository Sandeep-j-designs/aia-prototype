import { getState } from "@/components/inbox/v2/store";
import {
  getSourceState,
  requestSourceCopy,
  sourceContact,
} from "@/hooks/pages/inbox/use-inbox-sources";
import type { NeoCard, NeoTask } from "@/types/pages/neo";
import { recordChase } from "@/hooks/pages/neo/use-chases";

const sourceRequest: NeoTask = {
  id: "source-request",
  title: "Request a clearer source document",
  match: (p) =>
    /request.*clearer.*source|request.*unreadable/i.test(p) ? 60 : 0,
  run: async (api) => {
    const company = api.context.company || getState().company;
    const state = getSourceState();
    const receipt = state.receipts.find(
      (r) =>
        r.company === company &&
        r.outcome === "failed" &&
        (!api.context.itemId || r.itemId === api.context.itemId)
    );
    if (!receipt) {
      await api.say("There are no unreadable source attachments to request.");
      return "Nothing to request";
    }
    if (
      state.requests.some(
        (r) =>
          r.company === company &&
          r.candidateKey === receipt.candidateKey &&
          r.status === "waiting"
      )
    ) {
      await api.say(
        "A request for this attachment is already waiting for a reply. I won’t send it twice.",
        [{ label: "View document request", itemId: receipt.itemId }]
      );
      return "Existing request retained";
    }
    const card: NeoCard = {
      kind: "message",
      channel: "Email",
      to: sourceContact(),
      body: `Hello,\n\nThe attachment ${receipt.candidateKey} received in our accounts mailbox is unreadable. Please reply with a clearer PDF of the original invoice.\n\nThank you,\nAccounts team`,
    };
    await api.say(
      "I’ve drafted a request to the source contact. Review or edit it before sending."
    );
    const choice = await api.card(card, [
      {
        id: "send",
        label: "Send request",
        risk: "external",
        primary: true,
      },
      { id: "cancel", label: "Don’t send" },
    ]);
    if (choice !== "send") return "Request not sent";
    await api.checkpoint();
    requestSourceCopy(receipt, api.runId, card.body);
    recordChase({
      company,
      ask: "copy",
      party: card.to,
      channel: card.channel,
      to: card.to,
      body: card.body,
      itemId: receipt.itemId,
      docRef: receipt.candidateKey,
      runId: api.runId,
    });
    api.outcome("waiting");
    await api.say(
      "Sent with your approved message. I’ll link the clearer copy to this document when it arrives — it’s under Chases in Needs attention until then.",
      [{ label: "View pending request", itemId: receipt.itemId }]
    );
    return "Waiting for a clearer copy · simulated send";
  },
};
export default sourceRequest;
