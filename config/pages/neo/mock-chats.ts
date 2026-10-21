import type { NeoChat } from "@/types/pages/neo";

/**
 * Recent chats when the session opens. None in phase one (21 Oct 2026): the
 * recon store starts with no policy and no runs, so an earlier chat about
 * reconciliation would describe work the books don't show. The first chat
 * is the setup.
 *
 * DEV: GET /api/neo/chats
 */
export const MOCK_NEO_CHATS: NeoChat[] = [];
