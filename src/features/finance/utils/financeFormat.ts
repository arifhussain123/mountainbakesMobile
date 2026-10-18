import { formatDisplayDate } from '@/shared/utils/formatters';

/**
 * Finance screens show money to the paisa — "Rs. 24,262.50", never
 * "Rs. 24,262.5" — because a closing balance that hides its last digit cannot
 * be checked against a voucher. `formatCurrency` (shared) drops trailing zeros,
 * which suits the branch screens and not these.
 */
export function formatMoney2(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return '—';
  const sign = amount < 0 ? '-' : '';
  return `${sign}Rs. ${Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Spoken form for screen readers: "24,262.50 rupees". */
export function moneyWords(amount: number): string {
  return `${amount < 0 ? 'minus ' : ''}${Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} rupees`;
}

const KARACHI_OFFSET_MS = 5 * 60 * 60 * 1000; // UTC+5, no DST

/** "18 Oct 2026 · 02:04 AM" in Karachi time, from a server timestamp. */
export function formatStamp(iso: string | null | undefined): string {
  if (!iso) return '—';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return iso;
  const k = new Date(t + KARACHI_OFFSET_MS);
  const date = `${k.getUTCFullYear()}-${String(k.getUTCMonth() + 1).padStart(2, '0')}-${String(k.getUTCDate()).padStart(2, '0')}`;
  const h = k.getUTCHours();
  const time = `${String(h % 12 || 12).padStart(2, '0')}:${String(k.getUTCMinutes()).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
  return `${formatDisplayDate(date)} · ${time}`;
}

/**
 * "Finance Admin (finance@mountainbakes.com)" when a name is known, the email
 * alone otherwise. The server records approvers by sign-in email only, so the
 * name half appears only where a screen has one to offer.
 */
export function approverLabel(email: string | null | undefined, name?: string | null): string {
  if (!email) return '—';
  return name && name !== email ? `${name} (${email})` : email;
}
