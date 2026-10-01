import { useEffect, useSyncExternalStore } from "react";
import { SAMPLE_SPLIT_PLAN } from "@/config/pages/inbox/mock-split-packet";
import type { SplitPacket, SplitPlan } from "@/types/pages/inbox/bill-splitter";
import {
  PACKET_PAGE_LIMIT,
  detectPlan,
} from "@/utils/pages/inbox/bill-splitter";
import { PdfReadError, readPacket } from "@/utils/pages/inbox/read-pdf";
import { vaultDrop, vaultGet, vaultPut } from "@/utils/pages/inbox/pdf-vault";

/**
 * Split packets — the Bill Uploads rows the multi-bill path creates.
 *
 * Module-level rather than component state: detection outlives the screen
 * that started it (you can leave Purchases while a packet is read), and
 * a packet has to survive a reload, which the PRD makes a requirement of every
 * upload state.
 *
 * DEV: replace with GET /bill-splits (list), POST /bill-splits (upload,
 * starts detection), PATCH /bill-splits/:id (the plan), and
 * POST /bill-splits/:id/bills (Create N bills).
 */

const KEY = "aia.split-packets.v1";
/** The sample reads in about the time a short real packet takes. */
const SAMPLE_READ_MS = 2400;

let packets: SplitPacket[] = [];
let loaded = false;
const listeners = new Set<() => void>();

const emit = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(packets));
  } catch {}
  listeners.forEach((listener) => listener());
};

const patch = (id: string, change: Partial<SplitPacket>) => {
  packets = packets.map((p) => (p.id === id ? { ...p, ...change } : p));
  emit();
};

const load = () => {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const saved = localStorage.getItem(KEY);
    if (saved) packets = JSON.parse(saved);
  } catch {}
  // A read that was running when the page closed did not finish. The sample
  // simply reads again; a real file is read again from the vault.
  packets
    .filter((p) => p.status === "inProgress")
    .forEach((p) => void detect(p.id));
};

const detect = async (id: string) => {
  const packet = packets.find((p) => p.id === id);
  if (!packet) return;
  if (packet.sample) {
    window.setTimeout(
      () =>
        patch(id, {
          status: "splitReady",
          plan: structuredClone(SAMPLE_SPLIT_PLAN),
        }),
      SAMPLE_READ_MS
    );
    return;
  }
  const file = await vaultGet(id);
  if (!file) {
    patch(id, {
      status: "failed",
      failure: {
        reason:
          "The page closed before this file finished uploading. Upload it again.",
        retryable: false,
      },
    });
    return;
  }
  try {
    const started = Date.now();
    const facts = await readPacket(file, PACKET_PAGE_LIMIT);
    // A read that lands instantly reads as nothing having happened.
    const rest = 1400 - (Date.now() - started);
    if (rest > 0) await new Promise((r) => setTimeout(r, rest));
    patch(id, {
      status: "splitReady",
      pageCount: facts.length,
      plan: detectPlan(facts),
      failure: undefined,
    });
  } catch (error) {
    patch(id, {
      status: "failed",
      failure:
        error instanceof PdfReadError
          ? { reason: error.message, retryable: error.retryable }
          : {
              reason:
                "We couldn’t work out where the bills start. Try again, or split the file before uploading.",
              retryable: true,
            },
    });
  }
};

const newId = () => `SPLIT-${crypto.randomUUID()}`;

export const splitPackets = {
  async addFile(company: string, uploadedBy: string, file: File) {
    const packet: SplitPacket = {
      id: newId(),
      company,
      fileName: file.name,
      size: file.size,
      pageCount: 0,
      status: "inProgress",
      uploadedAt: new Date().toISOString(),
      uploadedBy,
      sample: false,
    };
    packets = [packet, ...packets];
    emit();
    await vaultPut(packet.id, file);
    void detect(packet.id);
    return packet;
  },
  retry(id: string) {
    patch(id, { status: "inProgress", failure: undefined });
    void detect(id);
  },
  savePlan(id: string, plan: SplitPlan) {
    patch(id, { plan });
  },
  complete(id: string, billCount: number) {
    patch(id, { status: "completed", billCount });
  },
  remove(id: string) {
    packets = packets.filter((p) => p.id !== id);
    emit();
    void vaultDrop(id);
  },
  file: (id: string) => vaultGet(id),
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const EMPTY: SplitPacket[] = [];

/** This company's packets, newest first. */
export const useSplitPackets = (company: string) => {
  useEffect(load, []);
  const all = useSyncExternalStore(
    subscribe,
    () => packets,
    () => EMPTY
  );
  return all.filter((p) => p.company === company);
};
