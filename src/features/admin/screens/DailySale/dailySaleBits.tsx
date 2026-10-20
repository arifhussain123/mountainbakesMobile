import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { DailySaleAuditAction, DailySaleRecord, DailySaleRecordStatus } from '@/api';
import { useAppTheme } from '@/shared/theme';
import { Icon, StatusBadge, type IconName, type StatusVariant } from '@/shared/ui';
import { formatCurrency } from '@/shared/utils';

/**
 * The web Daily Sale Record's small shared pieces (`daily-sale/parts.tsx`,
 * `columns.tsx` and `@mb/shared` daily-sale labels), so the board, its totals
 * and the View screen state a status, a difference and a figure the same way.
 */

/** The API caps the window; a wider one is not requested (web `DAILY_SALE_MAX_WINDOW_DAYS`). */
export const DAILY_SALE_MAX_WINDOW_DAYS = 180;

export const DSR_STATUS_LABEL: Record<DailySaleRecordStatus, string> = {
  open: 'Open',
  pending_verification: 'Pending Verification',
  verified: 'Verified',
  locked: 'Locked',
  amended: 'Amended',
};

/** Open grey, Pending amber, Verified emerald, Locked blue, Amended violet — the web's badge colours. */
export const DSR_STATUS_VARIANT: Record<DailySaleRecordStatus, StatusVariant> = {
  open: 'neutral',
  pending_verification: 'warning',
  verified: 'success',
  locked: 'info',
  amended: 'violet',
};

export const DAILY_SALE_AUDIT_LABELS: Record<DailySaleAuditAction, string> = {
  generated: 'Record generated',
  refreshed: 'Sales figures refreshed',
  manual_feed: 'Manual figure entered',
  manual_feed_override: 'Admin override — locked method',
  verified: 'Verified',
  locked: 'Locked',
  unlocked: 'Unlocked',
  amended: 'Amended',
  method_locked: 'Payment method locked',
  method_unlocked: 'Payment method unlocked',
};

export const DAILY_SALE_FIELD_LABELS: Record<string, string> = {
  manual_cash: 'Counted Cash',
  manual_easypaisa: 'Counted Easypaisa',
  manual_bank: 'Counted Bank',
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  easypaisa: 'Easypaisa',
  foodpanda: 'Foodpanda',
  bank_account: 'Bank Account',
  staff: 'Staff',
  card: 'Card',
  online: 'Online',
};

/** `Rs. 85,000` — whole rupees, the web board's `money`. */
export function money(n: number): string {
  return formatCurrency(Math.round(n));
}

/** Keeps paisa when there is any (`Rs. 28,312.50`) — the shares, which are a percentage of the takings. */
export function paisaMoney(n: number): string {
  if (!Number.isFinite(n)) return '—';
  if (Number.isInteger(n)) return money(n);
  return `Rs. ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** An em dash for an absent figure, so "not counted" never renders as a confident 0. */
export function orDash(n: number | null | undefined, format: (v: number) => string): string {
  return n === null || n === undefined ? '—' : format(n);
}

/** 'DD-MM-YYYY' — string work, these are already Karachi business dates. */
export function displayDate(iso: string): string {
  const [y, m, d] = (iso || '').split('-');
  return y && m && d ? `${d}-${m}-${y}` : iso || '—';
}

export function daysBetween(from: string, to: string): number {
  return Math.floor((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1;
}

export type DifferenceState = 'uncounted' | 'matched' | 'over' | 'short';

/** No tolerance band: exactly 0 is matched, anything else is over or short. */
export function differenceState(difference: number | null | undefined): DifferenceState {
  if (difference === null || difference === undefined) return 'uncounted';
  if (difference === 0) return 'matched';
  return difference > 0 ? 'over' : 'short';
}

/** A row's difference: null when nothing at all was counted (overallDifference is 0 then, which is not "matched"). */
export function rowDifference(r: DailySaleRecord): number | null {
  const nothingCounted = r.cashDifference === null && r.easypaisaDifference === null && r.bankDifference === null;
  return nothingCounted ? null : r.overallDifference;
}

/** The sign carried explicitly: "+Rs. 500" over, "−Rs. 500" short. */
export function signedMoney(n: number): string {
  if (n === 0) return formatCurrency(0);
  return `${n > 0 ? '+' : '−'}${formatCurrency(Math.abs(n))}`;
}

const DIFF_LABEL: Record<DifferenceState, string> = { uncounted: 'Not counted', matched: 'Matched', over: 'Over', short: 'Short' };
const DIFF_VARIANT: Record<DifferenceState, StatusVariant> = { uncounted: 'neutral', matched: 'success', over: 'warning', short: 'danger' };

/**
 * Over is amber, not green: a drawer holding more than the till recorded
 * usually means a sale that was never rung up. Short red, matched green,
 * nothing counted grey.
 */
export function DifferenceBadge({ difference }: { difference: number | null | undefined }) {
  const state = differenceState(difference);
  const label = state === 'over' || state === 'short' ? signedMoney(difference!) : state === 'matched' ? '✓ Matched' : DIFF_LABEL[state];
  return <StatusBadge label={label} variant={DIFF_VARIANT[state]} />;
}

export function DsrStatusBadge({ status }: { status: DailySaleRecordStatus }) {
  return <StatusBadge label={DSR_STATUS_LABEL[status]} variant={DSR_STATUS_VARIANT[status]} />;
}

/** A dashed or amber notice card under the summary tiles (the web's `DailySaleNotices`). */
export function Notice({ tone, title, children }: { tone: 'muted' | 'warning'; title?: string; children: ReactNode }) {
  const theme = useAppTheme();
  const accent = tone === 'warning' ? theme.colors.warning : theme.colors.primary;
  return (
    <View
      style={[
        styles.notice,
        {
          borderColor: tone === 'warning' ? theme.colors.warning : theme.colors.cardBorder,
          borderStyle: tone === 'warning' ? 'solid' : 'dashed',
          borderRadius: theme.radii.md,
          backgroundColor: theme.colors.cardFill,
        },
      ]}>
      <Text style={[theme.typography.bodySmall, { color: accent, fontWeight: '700' }]}>{tone === 'warning' ? '⚠' : 'ⓘ'}</Text>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, flex: 1 }]}>
        {title ? <Text style={{ color: theme.colors.text, fontWeight: '700' }}>{title} </Text> : null}
        {children}
      </Text>
    </View>
  );
}

/** A compact action button for the board and the View screen — the web's small outline/primary buttons. */
export function ActionChip({
  icon,
  label,
  onPress,
  primary,
  danger,
  disabled,
  loading,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  primary?: boolean;
  danger?: boolean;
  disabled?: boolean;
  loading?: boolean;
}) {
  const theme = useAppTheme();
  const fg = primary ? theme.colors.primaryText : danger ? theme.colors.danger : theme.colors.text;
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!off }}
      disabled={off}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          borderRadius: theme.radii.md,
          borderColor: primary ? theme.colors.primary : theme.colors.border,
          backgroundColor: primary ? theme.colors.primary : theme.colors.surface,
          opacity: off ? 0.5 : pressed ? 0.85 : 1,
        },
      ]}>
      {loading ? <ActivityIndicator size="small" color={fg} /> : <Icon name={icon} size={14} color={fg} />}
      <Text style={[theme.typography.label, { color: fg, fontWeight: '700' }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  notice: { flexDirection: 'row', gap: 8, padding: 12, borderWidth: 1 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 12, borderWidth: 1 },
});
