import { useMemo } from "react";
import { MOCK_SOURCE_DOCUMENTS } from "@/config/pages/inbox/mock-source-documents";
import type { Item } from "@/components/inbox/v2/store";
import type { SourceDocument } from "@/types/pages/inbox";

/**
 * The document an inbox item was read from — its pages and where each
 * extracted value sits on them — plus the line descriptions as the document
 * printed them, which is how a form line finds its row on the page.
 *
 * Only for the document the item arrived with. A bill raised by hand borrows a
 * seeded item's scaffolding but has no paper behind it, and an upload's own
 * bytes are shown as they are.
 */
export const useSourceDocument = (
  item: Item
): { doc: SourceDocument | null; printedLines: string[] } => {
  const id = item.original.id;
  const own =
    !item.created &&
    !item.file.blobId &&
    item.file.name === item.original.file.name;
  return useMemo(() => {
    // DEV: replace with GET /api/inbox/:id/document → SourceDocument, the
    // extraction result stored with the upload (page images + field boxes).
    const doc = (own && MOCK_SOURCE_DOCUMENTS[id]) || null;
    const original = item.original;
    const printedLines = (
      original.bill?.items ||
      original.invoice?.items ||
      original.jv?.lines.map((l) => ({ desc: l.ledger })) ||
      []
    ).map((l) => l.desc);
    return { doc, printedLines };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, own]);
};

export default useSourceDocument;
