import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { InvoiceViewPrData } from "@/types/pages/inbox/gst";
import { PageDialog, T } from "@/components/inbox/v2/ui";

/**
 * Add Remark — production's remark-modal: a note on a PR line. Commas are
 * normalised to ", " on save, as production does.
 */

type Props = {
  pr: InvoiceViewPrData | null;
  onClose: () => void;
  onSave: (prLineUuid: string, remarks: string) => void;
};

const RemarkModal = ({ pr, onClose, onSave }: Props) => {
  const [value, setValue] = useState("");
  useEffect(() => setValue(pr?.remarks ?? ""), [pr]);

  return (
    <PageDialog
      open={!!pr}
      onClose={onClose}
      title="Add Remark"
      description={`For Invoice #${pr?.invoiceNo || "-"}`}
      className="max-w-[480px]"
    >
      <label className="mt-2 flex flex-col gap-1.5">
        <span className={T.label}>Remarks</span>
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Enter your remarks here"
          className="min-h-24"
        />
      </label>
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={() => pr && onSave(pr.prLineUuid, value)}>
          Save Remark
        </Button>
      </div>
    </PageDialog>
  );
};

export default RemarkModal;
