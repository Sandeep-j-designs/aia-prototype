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

export type NeoPageId = "chat" | "skills" | "attention" | "activity";

export const NEO_PAGES: NeoPageId[] = [
  "chat",
  "skills",
  "attention",
  "activity",
];

export const neoHref = (page: NeoPageId) =>
  page === "chat" ? "/inbox?module=NEO" : `/inbox?module=NEO&page=${page}`;

const PAGE_TITLE: Record<NeoPageId, string> = {
  chat: "Chat",
  skills: "Skills",
  attention: "Needs attention",
  activity: "Activity",
};

/** Opens Neo's column as a sheet, where there's no room to keep it open. */
const MenuContext = createContext<() => void>(() => undefined);

/**
 * The button that brings Neo's column in below 1024px. Each page puts it at
 * the start of its own header; from 1024px the column is always there and
 * the button isn't drawn.
 */
export const NeoMenuButton = ({ className }: { className?: string }) => {
  const open = useContext(MenuContext);
  return (
    <button
      type="button"
      onClick={open}
      aria-label="Chats and Neo pages"
      className={cn(
        "grid h-9 w-9 flex-none place-items-center rounded-md text-pi-body hover:bg-pi-fill hover:text-pi-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border lg:hidden",
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
 * column takes its place — Chat, Agents, Needs attention, Activity and the
 * recent chats. The docked panel stays for asking from any other screen; it
 * holds the same conversation.
 *
 * Below 1024px the column would leave the chat a sliver, so it becomes a
 * sheet over the page, opened from the page's header and closed by picking
 * anything in it, the scrim or Esc.
 */
const NAV_KEY = "aia.neo.navOpen";

/**
 * Whether Neo's column is open: what you last chose, else open from 1440px
 * and folded below, where every pixel goes to the chat (20 Oct 2026).
 */
const useNavOpen = () => {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(NAV_KEY);
    } catch {
      /* storage blocked: follow the width */
    }
    setOpen(saved ? saved === "1" : window.innerWidth >= 1440);
  }, []);
  const toggle = () =>
    setOpen((v) => {
      try {
        window.localStorage.setItem(NAV_KEY, v ? "0" : "1");
      } catch {
        /* the choice holds for this visit */
      }
      return !v;
    });
  return [open, toggle] as const;
};

const NeoPage = ({ page, children }: Props) => {
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const [navOpen, toggleNav] = useNavOpen();
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
    <MenuContext.Provider value={() => setMenu(true)}>
      <div className="neo-scope flex h-full min-h-0 min-w-0 flex-1 bg-background">
        <div className="hidden lg:flex">
          <NeoNav
            page={page}
            onPage={go}
            folded={!navOpen}
            onToggle={toggleNav}
          />
        </div>
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
