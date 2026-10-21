import type { ParsedUrlQuery } from "querystring";

/**
 * Neo's own pages: Chat and Skills. The docked panel is never drawn on
 * them.
 */
export const onNeoPage = (query: ParsedUrlQuery) => query.module === "NEO";

/** Neo › Chat is on screen: ?module=NEO with no page, or page=chat. */
export const onNeoChatPage = (query: ParsedUrlQuery) =>
  query.module === "NEO" && (!query.page || query.page === "chat");

/** A link that lands on one of Neo's own pages. */
export const isNeoHref = (href: string) => /[?&]module=NEO\b/.test(href);
