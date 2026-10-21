/**
 * The rows ticked on whatever list is on screen, published for Neo.
 *
 * Neo is mounted above the routes and the selection lives inside the
 * workspace, so the workspace announces it here rather than Neo reaching into
 * the screen's state — the same arm's-length channel the guide uses.
 *
 * DEV: production keeps selection in the inbox's Zustand store, which Neo can
 * read directly. Delete this file and the one effect in the workspace.
 */
let selected: string[] = [];
const listeners = new Set<(ids: string[]) => void>();

export const setNeoSelection = (ids: string[]) => {
  selected = ids;
  listeners.forEach((f) => f(ids));
};

export const subscribeNeoSelection = (f: (ids: string[]) => void) => {
  listeners.add(f);
  f(selected);
  return () => {
    listeners.delete(f);
  };
};
