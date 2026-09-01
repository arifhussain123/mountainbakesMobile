import type { LoginSession } from '@/shared/types/login-session.types';
import { api } from '../client';

/**
 * Sign-in history — `GET /api/login-history`.
 *
 * ---------------------------------------------------------------------------
 * Scope is the server's, and for a branch account it is ALWAYS "you"
 * ---------------------------------------------------------------------------
 * The route decides scope from the JWT and nothing else: only `super_admin`
 * sees other people's sessions. Every other role — branch, production and all
 * four finance roles alike — is pinned to its own `uid` whatever it asks for,
 * and the `userId` query parameter is *silently ignored* for them rather than
 * refused.
 *
 * That silence is the thing to design around. A screen that sent `userId` and
 * rendered the answer would show one person's sessions under another person's
 * name with nothing having failed, so this function does not accept a `userId`
 * at all. When admin-scoped history is wanted it should arrive as a second,
 * separate function whose name says so — not as an optional argument here that
 * does nothing on seven roles out of eight.
 *
 * The practical consequence for the branch dashboard: this card is **"your
 * sign-ins", not "the branch's"**. A branch manager cannot see their shift
 * users' logins through it, and the card has to say so rather than let the
 * reader assume the shop is covered.
 *
 * ---------------------------------------------------------------------------
 * The endpoint is PAGED now, and `total` changed meaning with it
 * ---------------------------------------------------------------------------
 * Migration 98 replaced `{ days, limit }` with `{ page, pageSize }` plus filters
 * applied in SQL, and `total` is now the count of rows MATCHING THE FILTER in
 * the database — not the length of the array returned. The old field could never
 * exceed `limit` and said nothing about what lay beyond the window; the new one
 * is the honest answer to "how many sign-ins are there".
 *
 * `days` is gone entirely. The server's Zod schema strips unknown query keys
 * rather than rejecting them, so a caller still sending `days=30` gets no error
 * and no filtering — silently the whole history, one page at a time. That is
 * precisely the failure this file exists to prevent, which is why the parameter
 * is not accepted here at all: use `from` / `to` business dates instead.
 *
 * There is still no search parameter reachable from a branch account worth
 * using — `search` matches the staff code and name, and a branch account's rows
 * all carry its own — so the filter on this screen remains a filter over the
 * page already fetched.
 */

/**
 * The response envelope.
 *
 * Declared here rather than in `@mb/shared` because it is not there — only
 * `LoginSession` is mirrored; the wrapper is built inline in the route handler.
 * That makes this one of the inline response shapes `CLAUDE.md` warns about,
 * checked against nothing, so every field is read from the handler rather than
 * assumed.
 */
export interface LoginHistoryResult {
  /** Newest login first. One page of them. */
  sessions: LoginSession[];
  /**
   * Rows MATCHING THE FILTER in the database — not `sessions.length`.
   *
   * Changed meaning in migration 98; it used to be the size of the answer. It is
   * now safe to render as "N sign-ins", and `total > sessions.length` simply
   * means there are more pages.
   */
  total: number;
  page: number;
  pageSize: number;
  /** `'self'` when the rows are one user's, `'all'` when an admin read everyone. */
  scope: 'self' | 'all';
}

/**
 * The server's cap on a page.
 *
 * Asking for more is clamped, not refused — so a screen that wants a bigger page
 * gets a smaller one silently. Named here so a caller can stay inside it.
 */
export const LOGIN_HISTORY_MAX_PAGE_SIZE = 100;

/**
 * One page of sign-ins, newest first.
 *
 * `from` / `to` are BUSINESS dates ('YYYY-MM-DD'), matching the column the
 * server filters on — so a sign-in at half past midnight belongs to the day the
 * staff member was working, not the calendar day after it.
 */
export function getLoginHistory(options: {
  page?: number;
  pageSize?: number;
  from?: string;
  to?: string;
}): Promise<LoginHistoryResult> {
  const params: Record<string, string> = {};
  if (options.page != null) params.page = String(options.page);
  if (options.pageSize != null) params.pageSize = String(options.pageSize);
  if (options.from) params.from = options.from;
  if (options.to) params.to = options.to;
  return api.get<LoginHistoryResult>('/api/login-history', { params });
}
