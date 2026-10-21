import React from "react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/components/inbox/v2/store";
import { useBatches } from "@/hooks/pages/neo/use-batches";
import { useNeo } from "@/hooks/pages/neo/use-neo";
import NeoMark from "@/components/neo/common/neo-mark";

type Props = { id: string; onClear: () => void };

/**
 * Above the Inbox list while it shows one Neo batch: which batch, how far
 * its review has got, the instruction it was entered under, and the two ways
 * out — Neo's chat, where the batch was entered, or the whole Inbox.
 */
const BatchStrip = ({ id, onClear }: Props) => {
  const neo = useNeo();
  const { batches } = useBatches();
  const state = useStore();
  const batch = batches.find((b) => b.id === id);
  const drafts = state.items.filter((x) => x.batch?.id === id);
  const approved = drafts.filter((x) => x.status === "Approved").length;
  const waiting = drafts.filter((x) =>
    ["Needs Review", "Duplicate"].includes(x.status)
  ).length;
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-pi-line bg-background px-4 py-3 shadow-contact">
      <NeoMark className="h-7 w-7" />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] leading-5 text-pi-ink">
          <span className="font-medium">Batch {id}</span>{" "}
          <span className="text-pi-body">
            · {drafts.length} drafts · {waiting} to review · {approved} approved
          </span>
        </p>
        {batch?.instruction && (
          <p className="truncate text-body-4 text-pi-body">
            Entered under: “{batch.instruction}”
          </p>
        )}
      </div>
      <div className="flex flex-none items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onClear}>
          Show all documents
        </Button>
        <Button variant="outline" size="sm" onClick={() => neo.setOpen(true)}>
          Open in Neo
        </Button>
      </div>
    </div>
  );
};

export default BatchStrip;
