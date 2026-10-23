import React, {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/router";
import { PanelLeftOpen } from "@/components/icons";
import { cn } from "@/lib/utils";
import NeoNav from "./nav";

export type NeoPageId = "chat" | "agents";

export const NEO_PAGES: NeoPageId[] = ["chat", "agents"];

export const neoHref = (page: NeoPageId) =>
  page === "chat" ? "/inbox?module=NEO" : `/inbox?module=NEO&page=${page}`;

const PAGE_TITLE: Record<NeoPageId, string> = {
  chat: "Chat",
  agents: "Agents",
};

/**
 * Brings Neo's column back: as a sheet where there's no room to keep it
 * open, or into place when it was hidden. `hidden` says the column is put
 * away on a wide screen, so the button has to show there too.
 */
const MenuContext = createContext<{ open: () => void; hidden: boolean }>({
  open: () => undefined,
  hidden: false,
});

/** Whether the column is hidden on a wide screen. */
export const useNeoColumnHidden = () => useContext(MenuContext).hidden;

const HIDDEN_KEY = "aia.neo.columnHidden";

/**
 * The button that brings Neo's column in: below 1024px as a sheet, and from
 * 1024px when the column has been hidden. Each page puts it at the start of
 * its own header.
 */
export const NeoMenuButton = ({ className }: { className?: string }) => {
  const { open, hidden } = useContext(MenuContext);
  return (
    <button
      type="button"
      onClick={open}
      aria-label="Show chats"
      title="Show chats"
      className={cn(
        "grid h-9 w-9 flex-none place-items-center rounded-md text-pi-body hover:bg-pi-fill hover:text-pi-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border",
        !hidden && "lg:hidden",
        className
      )}
    >
      <PanelLeftOpen className="h-[18px] w-[18px]" />
    </button>
  );
};

type Props = { page: NeoPageId; children: ReactNode };

/**
 * Neo as a place (19 Oct 2026): the app rail folds to icons and Neo's own
 * column takes its place — Chat, Agents and the recent chats. The docked panel stays for asking from any other screen; it
 * holds the same conversation.
 *
 * Below 1024px the column would leave the chat a sliver, so it becomes a
 * sheet over the page, opened from the page's header and closed by picking
 * anything in it, the scrim or Esc.
 */
const NeoPage = ({ page, children }: Props) => {
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    try {
      setHidden(window.localStorage.getItem(HIDDEN_KEY) === "1");
    } catch {
      /* private window: start with the column shown */
    }
  }, []);
  const hide = (on: boolean) => {
    setHidden(on);
    try {
      window.localStorage.setItem(HIDDEN_KEY, on ? "1" : "0");
    } catch {
      /* not kept; fine for this session */
    }
  };
  const bringBack = () =>
    window.matchMedia("(min-width: 1024px)").matches
      ? hide(false)
      : setMenu(true);
  useEffect(() => setMenu(false), [router.asPath]);
  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu]);
  const go = (p: NeoPageId) => {
    setMenu(false);
    void router.push(neoHref(p));
  };
  return (
    <MenuContext.Provider value={{ open: bringBack, hidden }}>
      <div className="neo-scope flex h-full min-h-0 min-w-0 flex-1 bg-background">
        {!hidden && (
          <div className="hidden lg:flex">
            <NeoNav page={page} onPage={go} onHide={() => hide(true)} />
          </div>
        )}
        {menu && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              aria-label="Close"
              onClick={() => setMenu(false)}
              className="absolute inset-0 bg-foreground/30 duration-200 animate-in fade-in-0"
            />
            <div className="absolute inset-y-0 left-0 flex max-w-[85vw] shadow-popover-shadow duration-200 animate-in slide-in-from-left-4 motion-reduce:animate-none">
              <NeoNav page={page} onPage={go} />
            </div>
          </div>
        )}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {page !== "chat" && (
            <div className="flex h-12 flex-none items-center gap-2 border-b border-pi-line px-2 lg:hidden">
              <NeoMenuButton />
              <span className="text-[14px] font-semibold text-pi-ink">
                {PAGE_TITLE[page]}
              </span>
            </div>
          )}
          {children}
        </div>
      </div>
    </MenuContext.Provider>
  );
};

export default NeoPage;
