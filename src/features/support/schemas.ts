import { z } from 'zod';

/**
 * The exact 5 reference ID formats `support.routes.ts`'s `resolveReference`
 * accepts today (confirmed against the server's own `refType()` and the
 * `next_*_number()`/`next_finance_number()` Postgres functions that mint
 * them): a known prefix, a literal hyphen, then exactly 6 zero-padded digits.
 * Nothing else — not RV- (receipt vouchers), not a discount's hex id, not
 * PO-, and no Daily Sale Record lookup (keyed by date, not an id) — is wired
 * up server-side; see this feature's Step 0 report for what each of those
 * would need before it could be added here.
 */
export const SUPPORTED_REFERENCE_PREFIXES = ['MB', 'DMD', 'EXP', 'STK', 'CT'] as const;
export type SupportedReferencePrefix = (typeof SUPPORTED_REFERENCE_PREFIXES)[number];

const REFERENCE_ID_PATTERN = new RegExp(`^(${SUPPORTED_REFERENCE_PREFIXES.join('|')})-\\d{6}$`);

/** Trim + uppercase — exactly what the server does to `req.body.referenceId`/`req.query.ref` before matching a prefix, so what the client validates against is what the server will actually see. */
export function normalizeReferenceId(raw: string): string {
  return raw.trim().toUpperCase();
}

export const referenceIdSchema = z
  .string()
  .trim()
  .min(1, 'Reference ID is required')
  .transform(normalizeReferenceId)
  .refine((value) => REFERENCE_ID_PATTERN.test(value), {
    message: 'Unknown ID format. Use MB-, DMD-, EXP-, STK-, or CT- followed by 6 digits.',
  });

export type ReferenceIdParseResult = { success: true; value: string } | { success: false; error: string };

/** Non-throwing wrapper for form code that wants a plain result, not a try/catch around `.parse()`. */
export function parseReferenceId(raw: string): ReferenceIdParseResult {
  const result = referenceIdSchema.safeParse(raw);
  if (result.success) return { success: true, value: result.data };
  return { success: false, error: result.error.issues[0]?.message ?? 'Unknown ID format.' };
}

/**
 * Server's own floor (`CreateSupportTicketSchema`: `message.min(3)`) — this
 * app asks for a bit more (the brief's "~10 characters") because 3 characters
 * is enough to pass the server but rarely enough to tell Admin what's wrong;
 * the server is still the final authority and is never loosened to match.
 */
export const ISSUE_MESSAGE_MIN_LENGTH = 10;

export const newQuerySchema = z.object({
  referenceId: referenceIdSchema,
  message: z.string().trim().min(ISSUE_MESSAGE_MIN_LENGTH, `Please describe the issue (at least ${ISSUE_MESSAGE_MIN_LENGTH} characters).`).max(2000),
});
export type NewQueryInput = z.infer<typeof newQuerySchema>;
