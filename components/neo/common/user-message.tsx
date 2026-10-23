import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  FileText,
  Pencil,
} from "@/components/icons";
import type { NeoMessage } from "@/types/pages/neo";
import { cn } from "@/lib/utils";
import { IconAction } from "./turn-actions";

type Props = {
  message: NeoMessage;
  /** No edits or version changes while a run is live. */
  busy: boolean;
  editing: boolean;
  onEditing: (on: boolean) => void;
  onEdit: (text: string) => void;
  onVersion: (n: number) => void;
};

/** Taller than this and the message folds behind "Show more". */
const FOLD = 168;

/**
 * What the person asked: a quiet grey bubble on the right, so the answer is
 * what the eye lands on. Hover offers Copy and Edit; an edited or retried
 * request keeps its versions, switched with ‹ 2 / 3 ›.
 */
const UserMessage = ({
  message: m,
  busy,
  editing,
  onEditing,
  onEdit,
  onVersion,
}: Props) => {
  const [draft, setDraft] = useState(m.text || "");
  const [copied, setCopied] = useState(false);
  const [tall, setTall] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [allFiles, setAllFiles] = useState(false);
  const body = useRef<HTMLParagraphElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    if (body.current) setTall(body.current.scrollHeight > FOLD + 24);
  }, [m.text]);

  useEffect(() => {
    if (!editing) return;
    setDraft(m.text || "");
    window.setTimeout(() => {
      const f = field.current;
      if (!f) return;
      f.focus();
      f.setSelectionRange(f.value.length, f.value.length);
    }, 0);
  }, [editing, m.text]);

  const versions = m.versions?.length || 0;
  const v = m.version ?? 0;

  if (editing)
    return (
      <div className="w-full self-stretch rounded-2xl border border-pi-line-2 bg-background p-3 shadow-contact focus-within:border-primary">
        <label htmlFor={`neo-edit-${m.id}`} className="sr-only">
          Edit your message
        </label>
        <textarea
          id={`neo-edit-${m.id}`}
          ref={field}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing) return;
            if (e.key === "Escape") {
              e.preventDefault();
              e.stopPropagation();
              onEditing(false);
            }
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (draft.trim()) onEdit(draft.trim());
            }
          }}
          rows={1}
          className="max-h-60 min-h-12 w-full resize-none bg-transparent text-[14px] leading-[22px] text-pi-ink focus-visible:outline-none [field-sizing:content]"
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-body-4 text-pi-faint">
            Neo answers again from here. The earlier answer stays as a version.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onEditing(false)}
              className="h-8 rounded-sm border border-pi-line-2 bg-background px-3 text-[13px] font-medium text-pi-ink shadow-contact hover:bg-pi-fill focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!draft.trim() || busy}
              onClick={() => onEdit(draft.trim())}
              className="h-8 rounded-sm border border-pi-btn-primary-edge bg-pi-btn-fill px-3 text-[13px] font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    );

  return (
    <div className="group/user ml-10 flex flex-col items-end gap-1.5 self-end">
      {m.attachments && m.attachments.length > 0 && (
        <ul
          aria-label="Attached files"
          className="flex flex-wrap justify-end gap-1.5"
        >
          {(allFiles || m.attachments.length <= 4
            ? m.attachments
            : m.attachments.slice(0, 3)
          ).map((a) => (
            <li
              key={a.name}
              className="flex max-w-[13rem] items-center gap-2 rounded-lg border border-pi-line bg-background py-1.5 pl-1.5 pr-2.5 shadow-contact"
            >
              <span className="grid h-7 w-7 flex-none place-items-center rounded-sm bg-pi-fill text-pi-body">
                <FileText className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[12px] font-medium leading-4 text-pi-ink">
                  {a.name}
                </span>
                <span className="block text-[11px] uppercase leading-4 text-pi-faint">
                  {a.name.split(".").pop()}
                </span>
              </span>
            </li>
          ))}
          {!allFiles && m.attachments.length > 4 && (
            <li>
              <button
                type="button"
                onClick={() => setAllFiles(true)}
                className="flex h-full min-h-[44px] items-center rounded-lg border border-pi-line bg-background px-3 text-[12px] font-medium text-pi-body shadow-contact hover:bg-pi-fill hover:text-pi-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
              >
                +{m.attachments.length - 3} more
              </button>
            </li>
          )}
        </ul>
      )}
      <div className="relative max-w-full rounded-2xl bg-pi-fill px-4 py-2.5">
        <p
          ref={body}
          className={cn(
            "whitespace-pre-wrap text-[14px] leading-[22px] text-pi-ink",
            tall && !expanded && "overflow-hidden"
          )}
          style={tall && !expanded ? { maxHeight: FOLD } : undefined}
        >
          {m.text}
        </p>
        {tall && (
          <button
            type="button"
            onClick={() => setExpanded((x) => !x)}
            className={cn(
              "mt-1 text-[12px] font-medium text-pi-body hover:text-pi-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border",
              !expanded &&
                "before:pointer-events-none before:absolute before:inset-x-0 before:bottom-8 before:h-10 before:bg-gradient-to-t before:from-pi-fill before:to-transparent"
            )}
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        )}
      </div>
      <div
        className={cn(
          "-mb-2 flex items-center gap-0.5 transition-opacity",
          versions > 1
            ? "opacity-100"
            : "opacity-0 focus-within:opacity-100 group-hover/user:opacity-100"
        )}
      >
        {versions > 1 && (
          <span className="mr-1 flex items-center text-[12px] tabular-nums text-pi-body">
            <IconAction
              label="Previous version"
              disabled={busy || v === 0}
              onClick={() => onVersion(v - 1)}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </IconAction>
            {v + 1} / {versions}
            <IconAction
              label="Next version"
              disabled={busy || v === versions - 1}
              onClick={() => onVersion(v + 1)}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </IconAction>
          </span>
        )}
        <IconAction
          label={copied ? "Copied" : "Copy"}
          onClick={() => {
            void navigator.clipboard?.writeText(m.text || "");
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1600);
          }}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </IconAction>
        <IconAction
          label="Edit"
          disabled={busy}
          onClick={() => onEditing(true)}
        >
          <Pencil className="h-3.5 w-3.5" />
        </IconAction>
      </div>
    </div>
  );
};

export default UserMessage;
