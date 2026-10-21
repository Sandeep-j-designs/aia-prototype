import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useInboxSources } from "@/hooks/pages/inbox/use-inbox-sources";

const SourceProvenance = ({
  company,
  itemId,
  label,
}: {
  company: string;
  itemId: string;
  label?: string;
}) => {
  const [open, setOpen] = useState(false);
  const state = useInboxSources();
  const receipts = state.receipts.filter(
    (r) => r.company === company && r.itemId === itemId
  );
  if (!receipts.length) return <span className="truncate">{label}</span>;
  return (
    <>
      <button
        type="button"
        aria-label={`Source details for ${itemId}`}
        className="truncate text-left text-pi-brand underline-offset-4 hover:underline"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        {state.sources.find((s) => s.id === receipts[0].sourceId)?.provider ||
          label}
        {receipts.length > 1 ? ` +${receipts.length - 1}` : ""}
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          className="overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <SheetTitle>Document sources</SheetTitle>
          <SheetDescription className="mt-2">
            Collected within your delegated scope. Sample source records; no
            live account access.
          </SheetDescription>
          {receipts.map((r) => (
            <div
              key={r.sourceId + r.candidateKey}
              className="my-4 border-b border-pi-line pb-4 text-sm"
            >
              <p className="font-medium">
                {state.sources.find((s) => s.id === r.sourceId)?.provider}
              </p>
              <p className="mt-2 break-words">{r.location}</p>
              <p className="mt-2 break-all text-xs text-pi-body">
                {state.sources.find((s) => s.id === r.sourceId)?.account}
              </p>
              <p className="mt-2">{r.reason}</p>
              <p className="mt-2 text-xs text-pi-body">
                {new Date(r.collectedAt).toLocaleString("en-IN")}
              </p>
            </div>
          ))}
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </SheetContent>
      </Sheet>
    </>
  );
};
export default SourceProvenance;
