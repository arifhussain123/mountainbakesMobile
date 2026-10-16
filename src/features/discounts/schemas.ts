import { z } from 'zod';

/**
 * Mirrors the server's `discountAmount`/`discountReason` schemas exactly
 * (`backend/src/shared/schemas/discount.schemas.ts`) — positive, capped at
 * 10,000,000, at most 2 decimal places; reason mandatory, 3-500 chars. Shared
 * by both create and revise, since the server's own schemas only differ by
 * whether `productionOrderId` is present (a revision never re-points the
 * demand — "re-pointing to a different demand isn't a revision").
 */
const discountAmount = z
  .number()
  .positive('Amount must be greater than 0')
  .max(10_000_000, 'Amount is too large')
  .refine((n) => Math.round(n * 100) === n * 100, 'Amount can have at most 2 decimal places');

const discountReason = z
  .string()
  .trim()
  .min(3, 'Say what the discount is for (at least 3 characters)')
  .max(500, 'Keep the reason under 500 characters');

export const CreateDiscountSchema = z.object({
  productionOrderId: z.string().min(1, 'Pick the demand this discount is against'),
  amount: discountAmount,
  reason: discountReason,
});
export type CreateDiscountFormValues = z.infer<typeof CreateDiscountSchema>;

export const ReviseDiscountSchema = z.object({
  amount: discountAmount,
  reason: discountReason,
});
export type ReviseDiscountFormValues = z.infer<typeof ReviseDiscountSchema>;
