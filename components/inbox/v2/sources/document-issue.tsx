import React from "react";
import { Button } from "@/components/ui/button";
import { useNeo } from "@/hooks/pages/neo/use-neo";
import {
  receiveSourceReply,
  useInboxSources,
} from "@/hooks/pages/inbox/use-inbox-sources";
import type { Item } from "@/components/inbox/v2/store";

/**
 * A collected attachment that couldn't be read: retry, or ask the supplier
 * for a clearer copy. A missing supplier invoice number has no strip here
 * (19 Oct 2026): the form's own Supplier invoice no. field marks it open.
 */
const CollectionDocumentIssue = ({ item }: { item: Item }) => {
  const state = useInboxSources();
  const neo = useNeo();
  const receipt = state.receipts.find(
    (r) =>
      r.company === item.company &&
      r.itemId === item.id &&
      r.outcome === "failed"
  );
  if (!receipt || item.status !== "Failed") return null;
  const request = state.requests.find(
    (r) =>
      r.company === item.company &&
      r.candidateKey === receipt.candidateKey &&
      r.status === "waiting"
  );
  const run = (prompt: string) => {
    neo.setOpen(true);
    void neo.startRun(prompt);
  };
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-pi-line bg-background px-6 py-3 text-sm">
      <p className="text-pi-body">
        {request
          ? "Waiting for a clearer copy from the supplier."
          : "This attachment is unreadable. No voucher has been prepared."}
      </p>
      {request ? (
        <Button
          disabled={!!neo.busy}
          variant="outline"
          onClick={() => {
            if (receiveSourceReply(request.runId)) {
              neo.completeWaiting(request.runId);
              run("Collect replacement documents from my connected sources");
            }
          }}
        >
          Simulate supplier reply
        </Button>
      ) : (
        <>
          <Button
            disabled={!!neo.busy}
            variant="outline"
            onClick={() => run("Retry failed collection attachments")}
          >
            Retry collection
          </Button>
          <Button
            disabled={!!neo.busy}
            variant="outline"
            onClick={() =>
              run("Request a clearer copy of the unreadable source attachment")
            }
          >
            Ask Neo for a clearer copy
          </Button>
        </>
      )}
    </div>
  );
};
export default CollectionDocumentIssue;
