/**
 * PROTOTYPE ONLY — keeps an uploaded packet's bytes in IndexedDB, so the split
 * review can show the real pages again after a reload. localStorage takes only
 * text; IndexedDB takes the Blob.
 *
 * Every call resolves rather than rejects: private mode or a denied quota must
 * cost the page previews and nothing else.
 *
 * DEV: delete this file; the packet lives in storage behind GET /bill-splits/:id/file.
 */

const DB = "aia-bill-splitter";
const STORE = "pdf";
let opening: Promise<IDBDatabase | null> | null = null;

const open = () => {
  if (opening) return opening;
  opening = new Promise((resolve) => {
    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(DB, 1);
    } catch {
      resolve(null);
      return;
    }
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE))
        request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
  return opening;
};

const run = async <T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T | null> => {
  const db = await open();
  if (!db) return null;
  try {
    return await new Promise<T | null>((resolve) => {
      const request = action(db.transaction(STORE, mode).objectStore(STORE));
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
};

export const vaultPut = (id: string, blob: Blob) =>
  run("readwrite", (store) => store.put(blob, id));
export const vaultGet = (id: string) =>
  run<Blob>("readonly", (store) => store.get(id));
export const vaultDrop = (id: string) =>
  run("readwrite", (store) => store.delete(id));
