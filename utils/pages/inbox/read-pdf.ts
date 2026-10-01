import { factsFromLines, type PageFacts } from "./bill-splitter";

/**
 * PROTOTYPE ONLY — reads a PDF in the browser so a real packet can be split
 * in a demo. Production detects server-side.
 *
 * DEV: delete this file; the plan comes back from POST /bill-splits.
 */

type TextItem = { str: string; transform: number[] };

/** A page's text layer as lines in reading order. */
const linesOf = (items: TextItem[]) => {
  const rows = new Map<number, { x: number; s: string }[]>();
  items.forEach((item) => {
    if (!item.str) return;
    const y = Math.round(item.transform[5]);
    if (!rows.has(y)) rows.set(y, []);
    rows.get(y)!.push({ x: item.transform[4], s: item.str });
  });
  return [...rows.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([, cells]) =>
      cells
        .sort((a, b) => a.x - b.x)
        .map((c) => c.s)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter(Boolean);
};

/** Loaded on demand: pdfjs touches browser globals and cannot run in SSR. */
export const loadPdfjs = async () => {
  const { pdfjs } = await import("react-pdf");
  // As production sets it (components/common/pdf-document-viewer-page.tsx).
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  return pdfjs;
};

export class PdfReadError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean
  ) {
    super(message);
  }
}

/**
 * Page count and the per-page signals detection needs. A page is blank only
 * when it has no text and almost no ink — measured, because the PRD allows an
 * automatic exclusion only when the system is sure.
 */
export const readPacket = async (
  file: Blob,
  maxPages: number
): Promise<PageFacts[]> => {
  const pdfjs = await loadPdfjs();
  let doc;
  try {
    doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  } catch (error) {
    const name = (error as { name?: string })?.name;
    if (name === "PasswordException")
      throw new PdfReadError(
        "This PDF is password-protected. Remove the password and upload it again.",
        false
      );
    throw new PdfReadError(
      "This file could not be opened as a PDF. Upload the supplier’s original file.",
      false
    );
  }
  if (doc.numPages > maxPages)
    throw new PdfReadError(
      `This PDF has ${doc.numPages} pages. Split packets can have up to ${maxPages}; upload it in parts.`,
      false
    );

  const facts: PageFacts[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const text = await page.getTextContent();
    const lines = linesOf(text.items as TextItem[]);
    let blank = false;
    if (!lines.length) {
      // Only a page with no text is worth rasterising to check for ink.
      const viewport = page.getViewport({ scale: 0.5 });
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      const context = canvas.getContext("2d");
      if (context) {
        await page.render({ canvasContext: context, viewport }).promise;
        const px = context.getImageData(0, 0, canvas.width, canvas.height).data;
        let ink = 0;
        for (let i = 0; i < px.length; i += 4) if (px[i] < 200) ink++;
        blank = ink / (canvas.width * canvas.height) < 0.0012;
      }
    }
    facts.push(factsFromLines(lines, blank));
  }
  return facts;
};
