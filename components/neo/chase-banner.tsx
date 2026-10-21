import React from "react";
import { Button } from "@/components/ui/button";
import { RecordBanner } from "@/components/inbox/v2/record-details";
import type { Item } from "@/components/inbox/v2/store";
import { MessageSquare } from "@/components/icons";
import {
  ASK_WORDS,
  closeChase,
  simulateReply,
  useChases,
} from "@/hooks/pages/neo/use-chases";
import { useNeo } from "@/hooks/pages/neo/use-neo";

type Props = { item: Item };

const when = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

/**
 * The chase on the document under review, where the reply is needed.
 *
 * - A vendor missing from masters with no chase yet: why approval would
 *   create a vendor without a GSTIN, and "Ask for GSTIN", which opens Neo
 *   with the message drafted. This is where "explain why it's flagged" lives
 *   now — on the screen that raised the question, not in a chat.
 * - A chase waiting: who was asked, when.
 * - A reply in: what it says, to use on the form, and Mark done.
 */
const ChaseBanner = ({ item }: Props) => {
  const { chases } = useChases();
  const neo = useNeo();
  const chase = chases.find(
    (c) => c.itemId === item.id && c.status !== "closed"
  );
  const open = ["Needs Review", "Duplicate"].includes(item.status);

  if (!chase) {
    if (!open || item.route !== "AP" || !item.original.bill?.vendorMissing)
      return null;
    return (
      <RecordBanner
        tone="warning"
        icon={MessageSquare}
        title={`${item.form.party || "This vendor"} isn't in your masters`}
        label="Vendor not in masters"
        action={
          <Button
            variant="outline"
            disabled={!!neo.busy}
            onClick={() => {
              neo.setOpen(true);
              void neo.startRun(`ask ${item.id} vendor for their GSTIN`);
            }}
          >
            Ask to confirm GSTIN
          </Button>
        }
      >
        Approving creates them as a vendor in Tally with the GSTIN read off this
        bill. Ask them to confirm it first; Neo drafts the request, you send it.
      </RecordBanner>
    );
  }

  const received = chase.status === "received";
  return (
    <RecordBanner
      tone={received ? "success" : "warning"}
      icon={MessageSquare}
      title={
        received
          ? `${chase.party} replied`
          : `Waiting on ${chase.party} · ${ASK_WORDS[chase.ask]}`
      }
      label={received ? "Chase answered" : "Chase waiting"}
      action={
        received ? (
          <Button variant="outline" onClick={() => closeChase(chase.id)}>
            Mark done
          </Button>
        ) : (
          <Button
            variant="ghost"
            title="Prototype: play the other side's reply"
            onClick={() => simulateReply(chase.id)}
          >
            Simulate reply
          </Button>
        )
      }
    >
      {received
        ? `“${chase.reply?.text}” Use it on the form, then mark the chase done. It closes on its own when this is approved.`
        : `Asked by ${chase.channel.toLowerCase()} on ${when(chase.sentAt)}. The reply will be linked here when it lands.`}
    </RecordBanner>
  );
};

export default ChaseBanner;
