import React from "react";
import { Loader2, MoreVertical, RotateCcw, Scissors } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import FileIcon from "@/components/inbox/common/file-icon";
import { cn } from "@/lib/utils";
import type { SplitPacket } from "@/types/pages/inbox/bill-splitter";
import { billsOf } from "@/utils/pages/inbox/bill-splitter";
import { Pill, StatusPill, T } from "../ui";
import type { Item } from "../store";

type Props = {
  packets: SplitPacket[];
  /** Bills uploaded one at a time through Upload Bills. */
  uploads: Item[];
  onOpenUpload: (item: Item) => void;
  onReview: (packet: SplitPacket) => void;
  onRetry: (packet: SplitPacket) => void;
  onRemove: (packet: SplitPacket) => void;
  onRemoveUpload: (item: Item) => void;
};

const stamp = (iso: string) => format(new Date(iso), "d MMM yyyy, h:mm aaa");

/** The PRD's four packet states, in the words it gives them. */
const PacketStatus = ({ packet }: { packet: SplitPacket }) => {
  switch (packet.status) {
    case "inProgress":
      return (
        <Pill tone="info" size="sm" className="gap-1">
          <Loader2
            className="size-2.5 animate-spin motion-reduce:animate-none"
            aria-hidden
          />
          In progress
        </Pill>
      );
    case "splitReady":
      return (
        <Pill tone="warn" size="sm">
          Split ready
        </Pill>
      );
    case "failed":
      return (
        <Pill tone="error" size="sm">
          Failed
        </Pill>
      );
    case "completed":
      return (
        <Pill tone="ok" size="sm">
          Completed
        </Pill>
      );
  }
};

/** The line under the file name: what the packet is doing, in words. */
const packetDetail = (packet: SplitPacket) => {
  if (packet.status === "inProgress")
    return "Reading pages and finding where each bill starts";
  if (packet.status === "failed") return packet.failure?.reason ?? "";
  if (packet.status === "completed")
    return `Split into ${packet.billCount} ${packet.billCount === 1 ? "bill" : "bills"} · sent to Needs Review`;
  const bills = packet.plan ? billsOf(packet.plan).length : 0;
  return `${bills} ${bills === 1 ? "bill" : "bills"} found across ${packet.pageCount} pages`;
};

/**
 * Bill Uploads — files on their way in. A multi-bill packet lives here, not
 * in Needs Review, until its split is confirmed (PRD); single bills sit here
 * beside it with the Inbox's own status.
 */
const BillUploadsTable = ({
  packets,
  uploads,
  onOpenUpload,
  onReview,
  onRetry,
  onRemove,
  onRemoveUpload,
}: Props) => {
  const head = cn("h-10 whitespace-nowrap px-3 py-0 align-middle", T.head);
  const cell = cn("h-[52px] px-3 py-0 align-middle", T.cell);

  return (
    <div className="min-h-0 min-w-0 flex-1 overflow-auto">
      <Table className="border-separate border-spacing-0 [&_td]:border-b [&_td]:border-neutral-gray [&_th]:border-y [&_th]:border-neutral-gray">
        <TableHeader className="sticky top-0 z-10 bg-accent">
          <TableRow>
            <TableHead className={cn(head, "w-[40%] pl-6")}>File</TableHead>
            <TableHead className={cn(head, "w-20 text-right")}>Pages</TableHead>
            <TableHead className={head}>Status</TableHead>
            <TableHead className={head}>Uploaded</TableHead>
            <TableHead className={head}>User</TableHead>
            <TableHead className={cn(head, "w-[170px] pr-6 text-right")}>
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {packets.map((packet) => (
            <TableRow
              key={packet.id}
              className={cn(
                "hover:bg-transparent",
                packet.status === "splitReady" && "cursor-pointer"
              )}
              onClick={() => packet.status === "splitReady" && onReview(packet)}
            >
              <TableCell className={cn(cell, "pl-6")}>
                <div className="flex min-w-0 items-center gap-2.5">
                  <FileIcon ext="pdf" />
                  <div className="min-w-0">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="truncate font-medium">
                        {packet.fileName}
                      </span>
                      <Pill tone="neutral" size="sm" className="flex-none">
                        Multi-bill
                      </Pill>
                    </span>
                    <span
                      className={cn(
                        T.sub,
                        "block truncate",
                        packet.status === "failed" &&
                          "text-destructive-foreground"
                      )}
                      title={packetDetail(packet)}
                    >
                      {packetDetail(packet)}
                    </span>
                  </div>
                </div>
              </TableCell>
              <TableCell className={cn(cell, "text-right tabular-nums")}>
                {packet.pageCount || "—"}
              </TableCell>
              <TableCell className={cell}>
                <PacketStatus packet={packet} />
              </TableCell>
              <TableCell className={cn(cell, "whitespace-nowrap")}>
                {stamp(packet.uploadedAt)}
              </TableCell>
              <TableCell className={cell}>{packet.uploadedBy}</TableCell>
              <TableCell
                className={cn(cell, "pr-6 text-right")}
                onClick={(e) => e.stopPropagation()}
              >
                <span className="inline-flex items-center gap-1">
                  {packet.status === "splitReady" && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onReview(packet)}
                    >
                      <Scissors className="h-3.5 w-3.5" />
                      Review split
                    </Button>
                  )}
                  {/* Retry only where it can help (PRD) — a locked or
                      oversized file fails the same way twice. */}
                  {packet.status === "failed" && packet.failure?.retryable && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onRetry(packet)}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Retry
                    </Button>
                  )}
                  {packet.status !== "inProgress" && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Actions for ${packet.fileName}`}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => onRemove(packet)}>
                          {packet.status === "completed"
                            ? "Remove from this list"
                            : "Remove"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </span>
              </TableCell>
            </TableRow>
          ))}
          {uploads.map((item) => (
            <TableRow
              key={item.id}
              className="cursor-pointer hover:bg-transparent"
              onClick={() => onOpenUpload(item)}
            >
              <TableCell className={cn(cell, "pl-6")}>
                <div className="flex min-w-0 items-center gap-2.5">
                  <FileIcon ext={item.file.ext || "pdf"} />
                  <div className="min-w-0">
                    <span className="block truncate font-medium text-primary">
                      {item.file.name}
                    </span>
                    <span className={cn(T.sub, "block truncate")}>
                      {item.file.size}
                    </span>
                  </div>
                </div>
              </TableCell>
              <TableCell className={cn(cell, "text-right tabular-nums")}>
                —
              </TableCell>
              <TableCell className={cell}>
                <StatusPill status={item.status} />
              </TableCell>
              <TableCell className={cn(cell, "whitespace-nowrap")}>
                {stamp(item.received)}
              </TableCell>
              <TableCell className={cell}>{item.sender}</TableCell>
              <TableCell
                className={cn(cell, "pr-6 text-right")}
                onClick={(e) => e.stopPropagation()}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Actions for ${item.file.name}`}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => onOpenUpload(item)}>
                      Open in Inbox
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => onRemoveUpload(item)}>
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {!packets.length && !uploads.length && (
        <div className="px-6 py-16 text-center">
          <h2 className="text-lg font-semibold">Nothing uploaded yet</h2>
          <p className={cn(T.value, "mt-2")}>
            Bills you upload appear here while they are read. A PDF with several
            bills in it goes through Upload Purchases ▾ → Split Purchases.
          </p>
        </div>
      )}
    </div>
  );
};

export default BillUploadsTable;
