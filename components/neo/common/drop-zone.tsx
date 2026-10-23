import React, { useRef, useState } from "react";
import { Upload } from "@/components/icons";
import { cn } from "@/lib/utils";

type Props = {
  onFiles: (files: FileList) => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
};

/**
 * Files dropped anywhere on the chat attach to the next message. While files
 * are dragged over it the whole chat says so.
 */
const DropZone = ({ onFiles, disabled, className, children }: Props) => {
  const [over, setOver] = useState(false);
  const depth = useRef(0);
  const hasFiles = (e: React.DragEvent) =>
    Array.from(e.dataTransfer.types).includes("Files");
  return (
    <div
      className={cn("relative", className)}
      onDragEnter={(e) => {
        if (disabled || !hasFiles(e)) return;
        e.preventDefault();
        depth.current += 1;
        setOver(true);
      }}
      onDragOver={(e) => {
        if (disabled || !hasFiles(e)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      }}
      onDragLeave={() => {
        depth.current = Math.max(0, depth.current - 1);
        if (!depth.current) setOver(false);
      }}
      onDrop={(e) => {
        if (disabled || !hasFiles(e)) return;
        e.preventDefault();
        depth.current = 0;
        setOver(false);
        if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files);
      }}
    >
      {children}
      {over && (
        <div className="pointer-events-none absolute inset-2 z-30 grid place-items-center rounded-2xl border-2 border-dashed border-pi-brand-border bg-background/90 duration-150 animate-in fade-in-0">
          <div className="flex flex-col items-center gap-2 text-center">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-pi-brand-tint text-pi-brand">
              <Upload className="h-5 w-5" />
            </span>
            <p className="text-[15px] font-semibold text-pi-ink">
              Drop files to reconcile
            </p>
            <p className="text-body-4 text-pi-body">
              Bank, settlement and books exports start a three-way
              reconciliation
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DropZone;
