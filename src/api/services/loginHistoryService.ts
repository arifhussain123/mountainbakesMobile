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
 * There is no `offset`, so there is no server-side pagination
 * ---------------------------------------------------------------------------
 * `listSessions` takes `{ userId, days, limit }` and reads
 * `.range(0, limit - 1)` — always from the top. A caller asking for "the next
 * page" has no way to express it, and widening `limit` re-fetches everything.
 *
 * There is no search parameter either. So a filter over this data is a filter
 * over **the rows already fetched**, done on the device, and the window it
 * covers is exactly `days`/`limit` — which is what `LoginHistoryResult.total`
 * reports and what a screen has to show beside any "no matches" state. Saying
 * "nothing found" when the answer is "nothing found in the last 90 days, capped
 * at 500 rows" is the difference between a clean result and a wrong one.
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
  /** Newest login first. */
  sessions: LoginSession[];
  /**
   * `sessions.length`, NOT a total in the database.
   *
   * The handler sets it from the array it is about to return, so it can never
   * exceed `limit` and says nothing about how many rows exist beyond the window.
   * Do not render it as "N sessions in total" — it is the size of this answer.
   */
  total: number;
  /** `'self'` when the rows are one user's, `'all'` when an admin read everyone. */
  scope: 'self' | 'all';
}

/** The server's own bounds, so a screen can label its window honestly. */
export const LOGIN_HISTORY_MAX_ROWS = 500;
export const LOGIN_HISTORY_DEFAULT_DAYS = 90;

/**
 * A window of sign-ins, newest first.
 *
 * `days` is clamped to 1–365 and `limit` to 1–500 on the server, and a junk
 * value falls back to the default rather than 400-ing the screen — so this
 * sends what it was given and lets the server be the authority on the bound.
 */
export function getLoginHistory(options: {
  days: number;
  limit?: number;
}): Promise<LoginHistoryResult> {
  const params: Record<string, string> = { days: String(options.days) };
  if (options.limit != null) params.limit = String(options.limit);
  return api.get<LoginHistoryResult>('/api/login-history', { params });
}
