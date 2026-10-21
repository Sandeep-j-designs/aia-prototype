import { useEffect, useState } from "react";
import { sampleFor } from "@/hooks/pages/neo/use-batches";
import { MOCK_BATCH_DOCUMENTS } from "@/config/pages/neo/mock-batch-documents";
import { RECON_SAMPLE_FILES } from "@/config/pages/neo/mock-recon";
import type { NeoAttachment } from "@/types/pages/neo";
import type { NeoRuntime } from "./use-neo-runtime";

/**
 * The prompt box's state, shared by Neo's page and the docked panel: the
 * draft, the files waiting to go with it, and sending both as one request.
 */
/**
 * A request to finish rather than send ("Move all …"): put in the prompt box
 * of whichever composer mounts next, then announced to one already open.
 */
let pendingPrefill: string | null = null;
export const PREFILL_EVENT = "neo:prefill";
export const prefillComposer = (text: string) => {
  pendingPrefill = text;
  window.dispatchEvent(new CustomEvent(PREFILL_EVENT, { detail: text }));
};

export const useComposer = (neo: NeoRuntime) => {
  const [draft, setDraft] = useState(() => {
    const t = pendingPrefill;
    pendingPrefill = null;
    return t || "";
  });
  useEffect(() => {
    const on = (e: Event) => {
      pendingPrefill = null;
      setDraft((e as CustomEvent<string>).detail);
    };
    window.addEventListener(PREFILL_EVENT, on);
    return () => window.removeEventListener(PREFILL_EVENT, on);
  }, []);
  const [attachments, setAttachments] = useState<NeoAttachment[]>([]);

  const attach = (list: NeoAttachment[]) =>
    setAttachments((as) => [
      ...as,
      ...list.filter((a) => !as.some((x) => x.name === a.name)),
    ]);

  const send = (text = draft) => {
    // Neo asked for a value in words (an amount, a number): this is it.
    if (neo.textAsk && text.trim()) {
      setDraft("");
      neo.answer(neo.textAsk, text.trim());
      return;
    }
    if ((!text.trim() && !attachments.length) || neo.busy) return;
    setDraft("");
    const files = attachments;
    setAttachments([]);
    void neo.startRun(text, files);
  };

  return {
    draft,
    setDraft,
    attachments,
    send,
    attachFiles: (files: FileList) =>
      attach(
        Array.from(files).map((f) => ({
          name: f.name,
          docId: sampleFor(f.name)?.id,
        }))
      ),
    attachSample: (which: "bills" | "recon" = "bills") =>
      attach(
        which === "recon"
          ? RECON_SAMPLE_FILES.map((f) => ({ name: f.name }))
          : MOCK_BATCH_DOCUMENTS.map((d) => ({ name: d.file.name, docId: d.id }))
      ),
    removeAttachment: (name: string) =>
      setAttachments((as) => as.filter((a) => a.name !== name)),
  };
};
