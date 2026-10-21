/**
 * Neo's channel into the workspace, for the few things only the screen can do
 * — today, starting a Tally sync. The same arm's-length pattern as the guide's
 * (components/guide/actions.ts): Neo is mounted above the routes and asks on a
 * window event instead of reaching into the workspace's state.
 *
 * DEV: production's sync is a store action Neo can call directly. Delete this
 * file and the listener in the workspace on transplant.
 */
export const NEO_ACTION_EVENT = "aia-neo-action";
export const NEO_SYNC_RESULT_EVENT = "aia-neo-sync-result";

export type NeoSyncResult = {
  pushed: number;
  failed: number;
  total: number;
  outcome: "success" | "partial" | "failure" | "nothing";
};

/** Ask the workspace to sync everything approved, and wait for how it went. */
export const requestSync = (timeoutMs = 45000) =>
  new Promise<NeoSyncResult>((resolve, reject) => {
    const done = (e: Event) => {
      window.removeEventListener(NEO_SYNC_RESULT_EVENT, done);
      window.clearTimeout(timer);
      resolve((e as CustomEvent<NeoSyncResult>).detail);
    };
    const timer = window.setTimeout(() => {
      window.removeEventListener(NEO_SYNC_RESULT_EVENT, done);
      reject(new Error("Tally didn't answer"));
    }, timeoutMs);
    window.addEventListener(NEO_SYNC_RESULT_EVENT, done);
    window.dispatchEvent(
      new CustomEvent(NEO_ACTION_EVENT, { detail: { action: "sync" } })
    );
  });

export const reportSync = (result: NeoSyncResult) =>
  window.dispatchEvent(
    new CustomEvent(NEO_SYNC_RESULT_EVENT, { detail: result })
  );
