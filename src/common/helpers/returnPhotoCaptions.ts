import type { ProductionReturn } from '@/shared/types/production-ops.types';
import { karachiTimeStr } from '@/shared/utils/timezone';
import { formatBusinessDate } from '@/common/helpers/businessDay';
import { formatQty } from '@/common/utils/money';

/**
 * What a return photo is a photo of, as the lines the viewer prints under it.
 *
 * Shared by the branch's list and Production's, so the same return reads the
 * same on both sides of the handover. The first line is the one the viewer
 * draws strongest.
 *
 * The reference is the head of the row's id: a return has no human-facing
 * number, and this is the fragment that is short enough to read out and still
 * find the record with.
 *
 * The date is the BUSINESS day the return was booked to; the time is the
 * Karachi wall clock it was raised at. Between midnight and 02:00 those name
 * different calendar days, which is correct — see `docs/timezone.md`.
 */
export function returnPhotoCaptions(row: ProductionReturn): string[] {
  const raisedAt = new Date(row.createdAt);
  const time = Number.isNaN(raisedAt.getTime()) ? null : karachiTimeStr(raisedAt);

  return [
    `${formatQty(row.qty)} × ${row.productName}`,
    `Return ${row.id.slice(0, 8)}`,
    row.branchName,
    `${formatBusinessDate(row.date, { weekday: true })}${time ? ` · ${time}` : ''}`,
    row.reason ? `Reason: ${row.reason}` : '',
  ].filter(line => line.length > 0);
}
