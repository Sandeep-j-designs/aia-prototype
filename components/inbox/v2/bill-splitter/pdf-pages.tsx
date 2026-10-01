import React from "react";
import { Document, Page, pdfjs } from "react-pdf";

/*
  Loaded through next/dynamic with ssr: false — pdfjs touches browser globals.
  The worker is set as production sets it
  (components/common/pdf-document-viewer-page.tsx).
*/
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type DocumentProps = {
  file: Blob;
  children: React.ReactNode;
  /** Shown in place of the pages if the file cannot be opened. */
  fallback: React.ReactNode;
};

/** One parse of the packet, shared by every thumbnail inside it. */
export const PdfDocument = ({ file, children, fallback }: DocumentProps) => (
  // `contents`: the wrapper react-pdf adds must not become a layout box, or
  // the dialog's reader and rail stop being siblings in one flex row.
  <Document
    file={file}
    loading={null}
    error={fallback}
    noData={fallback}
    className="contents"
  >
    {children}
  </Document>
);

export const PdfPage = ({ page, width }: { page: number; width: number }) => (
  <Page
    pageNumber={page}
    width={width}
    renderTextLayer={false}
    renderAnnotationLayer={false}
    loading={<div className="aspect-[1/1.414] w-full bg-section" />}
  />
);
