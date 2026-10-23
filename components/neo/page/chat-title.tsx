import React, { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Download,
  Pencil,
  Star,
  Trash2,
} from "@/components/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNeo } from "@/hooks/pages/neo/use-neo";
import type { NeoChat } from "@/types/pages/neo";
import { cn } from "@/lib/utils";

/** The chat as Markdown, for Export: each request, then Neo's words. */
export const chatMarkdown = (chat: NeoChat) =>
  [
    `# ${chat.title}`,
    ...chat.messages
      .filter((m) => m.text)
      .map((m) =>
        m.role === "user" ? `**You:** ${m.text}` : `**Neo:** ${m.text}`
      ),
  ].join("\n\n");

export const exportChat = (chat: NeoChat) => {
  const blob = new Blob([chatMarkdown(chat)], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${chat.title.replace(/[^\w\s-]/g, "").trim() || "Neo chat"}.md`;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

type Props = {
  compact?: boolean;
  /** In the dark top bar's trail: takes the bar's ink instead of the page's. */
  onBar?: boolean;
};

/**
 * The chat's name, at the top of the conversation. It is written once Neo
 * has answered, and fades in when it is; click it to rename. The caret opens
 * Star, Rename, Export and Delete.
 */
const ChatTitle = ({ compact, onBar }: Props) => {
  const neo = useNeo();
  const chat = neo.chats.find((c) => c.id === neo.chatId);
  const title = neo.messages.length ? chat?.title || "New chat" : "New chat";
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(title);
  const field = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!renaming) return;
    setDraft(title);
    window.setTimeout(() => field.current?.select(), 0);
  }, [renaming, title]);

  const save = () => {
    if (chat && draft.trim()) neo.renameChat(chat.id, draft);
    setRenaming(false);
  };

  if (renaming)
    return (
      <input
        ref={field}
        aria-label="Chat name"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") {
            e.stopPropagation();
            setRenaming(false);
          }
        }}
        className={cn(
          "h-8 min-w-0 max-w-md flex-1 rounded-sm border border-primary bg-background px-2 font-semibold text-pi-ink focus-visible:outline-none",
          compact ? "text-[14px]" : "text-[15px]"
        )}
      />
    );

  return (
    <div className="flex min-w-0 items-center">
      <button
        type="button"
        disabled={!chat || !neo.messages.length}
        onClick={() => setRenaming(true)}
        title={chat ? "Rename" : undefined}
        className={cn(
          "h-8 min-w-0 truncate rounded-l-md px-2 text-left font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border",
          compact ? "text-[14px]" : "text-[15px]",
          onBar
            ? "text-topnav-text enabled:hover:bg-surface-muted"
            : "text-pi-ink enabled:hover:bg-pi-fill",
          !chat?.messages.length && "rounded-md"
        )}
      >
        <span key={title} className="duration-500 animate-in fade-in-0">
          {chat?.starred && (
            <Star className="mr-1.5 inline h-3.5 w-3.5 -translate-y-px fill-current text-pi-warning" />
          )}
          {title}
        </span>
      </button>
      {chat && neo.messages.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Chat options"
              className={cn(
                "grid h-8 w-6 flex-none place-items-center rounded-r-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border",
                onBar
                  ? "text-surface-foreground-muted hover:bg-surface-muted hover:text-topnav-text data-[state=open]:bg-surface-muted"
                  : "text-pi-body hover:bg-pi-fill hover:text-pi-ink data-[state=open]:bg-pi-fill"
              )}
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem onSelect={() => neo.toggleStar(chat.id)}>
              <Star
                className={cn("mr-2 h-4 w-4", chat.starred && "fill-current")}
              />
              {chat.starred ? "Unstar" : "Star"}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setRenaming(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => exportChat({ ...chat, messages: neo.messages })}
            >
              <Download className="mr-2 h-4 w-4" />
              Export as Markdown
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={!!neo.busy}
              onSelect={() => neo.deleteChat(chat.id)}
              className="text-status-error focus:text-status-error"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
};

export default ChatTitle;
