import { useEffect, useState } from "react";
import { keepFile } from "@/utils/pages/neo/attachment-files";
import { UPLOAD_STANDINS } from "@/config/pages/neo/mock-recon-sources";
import type { NeoAttachment } from "@/types/pages/neo";
import type { NeoRuntime } from "./use-neo-runtime";

/**
 * The prompt box's state, shared by Neo's page and the docked panel: the
 * draft, the files waiting to go with it, and sending both as one request.
 */
/**
 * A request to finish rather than send: put in the prompt box
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
    // An upload starts the three-way reconciliation at once (21 Oct 2026),
    // with whatever was typed. While Neo works, files wait in the box.
    attachFiles: (files: FileList) => {
      // An edited Neo report goes as itself; anything else shows as the
      // six sample sources, so the run reads what the demo has.
      const picked = Array.from(files);
      picked.forEach(keepFile);
      const reports = picked.filter((f) => /^recon-.*\.xlsx$/i.test(f.name));
      const list = reports.length
        ? reports.map((f) => ({ name: f.name }))
        : UPLOAD_STANDINS.map((f) => ({ name: f.name }));
      if (neo.busy || neo.textAsk) return attach(list);
      const all = [
        ...attachments,
        ...list.filter((a) => !attachments.some((x) => x.name === a.name)),
      ];
      setDraft("");
      setAttachments([]);
      void neo.startRun(draft, all);
    },
    removeAttachment: (name: string) =>
      setAttachments((as) => as.filter((a) => a.name !== name)),
  };
};
