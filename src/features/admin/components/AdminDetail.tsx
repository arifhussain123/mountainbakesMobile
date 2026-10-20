import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { format, isValid, parseISO } from 'date-fns';
import { useAppTheme } from '@/shared/theme';
import { Dropdown, Icon, type DropdownOption } from '@/shared/ui';

/**
 * Small read-only building blocks the Super Admin Users, Security, Database
 * Backup and Settings screens share: label/value rows, section headings,
 * coloured pills, notice boxes and a labelled filter dropdown. Nothing here
 * writes — they only lay out what an endpoint returned.
 */

/** `20 Oct 2026, 02:11 AM` — the web's `formatDateTime` (`dd MMM yyyy, hh:mm a`); `—` when missing. */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = parseISO(iso);
  return isValid(d) ? format(d, 'dd MMM yyyy, hh:mm a') : '—';
}

/** `20 Oct 2026` from an ISO timestamp or a `YYYY-MM-DD` date. */
export function formatDateOnly(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = parseISO(iso);
  return isValid(d) ? format(d, 'dd MMM yyyy') : '—';
}

/** `08:45 PM`. */
export function formatClock(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = parseISO(iso);
  return isValid(d) ? format(d, 'hh:mm a') : '—';
}

/** First letter of each word upper-cased, `_` read as a space: `super_admin` → `Super Admin`. */
export function titleCase(raw: string | null | undefined): string {
  if (!raw) return '—';
  return raw
    .replace(/_/g, ' ')
    .split(' ')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

export const MONO = { fontFamily: 'monospace' } as const;

export interface DetailRow {
  label: string;
  value: ReactNode;
  mono?: boolean;
}

/** Label on the left, value on the right, hairline between rows. Falsy rows are skipped. */
export function DetailRows({ rows }: { rows: (DetailRow | null | false | undefined)[] }) {
  const theme = useAppTheme();
  return (
    <View>
      {rows.filter((r): r is DetailRow => !!r).map((row) => (
        <View key={row.label} style={[styles.row, { borderBottomColor: theme.colors.border }]}>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, flexShrink: 0, maxWidth: '45%' }]}>{row.label}</Text>
          {typeof row.value === 'string' || typeof row.value === 'number' ? (
            <Text
              selectable
              style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '600', flex: 1, textAlign: 'right' }, row.mono ? MONO : null]}>
              {row.value}
            </Text>
          ) : (
            <View style={{ flex: 1, alignItems: 'flex-end' }}>{row.value}</View>
          )}
        </View>
      ))}
    </View>
  );
}

/** An upper-case group heading inside a detail sheet (USER, SESSION, …). */
export function DetailHeading({ title }: { title: string }) {
  const theme = useAppTheme();
  return (
    <Text style={[theme.typography.label, { color: theme.colors.textFaint, marginTop: theme.spacing.md, letterSpacing: 0.5 }]} accessibilityRole="header">
      {title.toUpperCase()}
    </Text>
  );
}

export type PillTone = 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'danger' | 'neutral';

/** A rounded label in one of the theme's tones — role pills, state badges, results. */
export function Pill({ label, tone }: { label: string; tone: PillTone }) {
  const theme = useAppTheme();
  const color = {
    primary: theme.colors.primary,
    secondary: theme.colors.secondary,
    info: theme.colors.info,
    success: theme.colors.success,
    warning: theme.colors.warning,
    danger: theme.colors.danger,
    neutral: theme.colors.textSecondary,
  }[tone];
  return (
    <View style={[styles.pill, { backgroundColor: `${color}1A`, borderRadius: theme.radii.pill }]}>
      <Text style={[styles.pillText, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/** A grey monospace tag — rule codes, request types. */
export function CodeTag({ code }: { code: string }) {
  const theme = useAppTheme();
  return (
    <View style={[styles.code, { backgroundColor: theme.colors.border }]}>
      <Text style={[{ fontSize: 10.5, color: theme.colors.textSecondary }, MONO]}>{code}</Text>
    </View>
  );
}

/** A tinted box for a banner or a note: amber warnings, red errors, grey information. */
export function NoticeBox({ tone, title, children }: { tone: 'warning' | 'danger' | 'info' | 'neutral'; title?: string; children?: ReactNode }) {
  const theme = useAppTheme();
  const color = { warning: theme.colors.warning, danger: theme.colors.danger, info: theme.colors.info, neutral: theme.colors.textSecondary }[tone];
  return (
    <View style={[styles.notice, { backgroundColor: `${color}14`, borderColor: `${color}55`, borderRadius: theme.radii.md }]}>
      {tone === 'neutral' ? null : <Icon name={tone === 'info' ? 'info' : 'warning'} size={16} color={color} />}
      <View style={{ flex: 1, gap: 2 }}>
        {title ? <Text style={[theme.typography.bodySmall, { color, fontWeight: '700' }]}>{title}</Text> : null}
        {typeof children === 'string' ? <Text style={[theme.typography.bodySmall, { color: theme.colors.text }]}>{children}</Text> : children}
      </View>
    </View>
  );
}

/** A read-only switch: the saved on/off state, shown the way the web settings form shows it. */
export function ReadOnlySwitch({ value, label }: { value: boolean; label: string }) {
  const theme = useAppTheme();
  return (
    <Switch
      value={value}
      disabled
      accessibilityLabel={`${label}: ${value ? 'on' : 'off'}`}
      trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
      thumbColor={theme.colors.surface}
    />
  );
}

export const ALL = 'all';

/** A filter dropdown with a small label above it; the first option is "everything". */
export function FilterSelect<T extends string>({
  label,
  allLabel,
  options,
  value,
  onChange,
}: {
  label: string;
  allLabel: string;
  options: DropdownOption<T>[];
  value: T | typeof ALL;
  onChange: (value: T | typeof ALL) => void;
}) {
  const theme = useAppTheme();
  const all: DropdownOption<T | typeof ALL>[] = [{ value: ALL, label: allLabel }, ...options];
  return (
    <View style={{ gap: 4 }}>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{label}</Text>
      <Dropdown<T | typeof ALL> options={all} value={value} onChange={onChange} />
    </View>
  );
}

/** "More filters" — folds the less-used filters away, like the web's filter drawer. */
export function MoreFilters({ open, onToggle, activeCount, children }: { open: boolean; onToggle: () => void; activeCount: number; children: ReactNode }) {
  const theme = useAppTheme();
  return (
    <View style={{ gap: 10 }}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={onToggle} style={styles.more}>
        <Text style={[theme.typography.label, { color: theme.colors.primary, fontWeight: '700' }]}>
          {open ? 'Fewer filters' : 'More filters'}
          {activeCount > 0 ? ` (${activeCount})` : ''}
        </Text>
        <Icon name={open ? 'chevron-down' : 'chevron-right'} size={14} color={theme.colors.primary} />
      </Pressable>
      {open ? children : null}
    </View>
  );
}

/** A tappable date-range field: shows the range, or the placeholder; long-press-free clear button. */
export function DateRangeField({ label, range, placeholder, onPress, onClear }: { label: string; range: { from: string; to: string } | null; placeholder: string; onPress: () => void; onClear: () => void }) {
  const theme = useAppTheme();
  return (
    <View style={{ gap: 4 }}>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{label}</Text>
      <View style={[styles.dateField, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${range ? `${range.from} to ${range.to}` : placeholder}`} onPress={onPress} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icon name="calendar" size={16} color={theme.colors.textSecondary} />
          <Text style={[theme.typography.body, { color: range ? theme.colors.text : theme.colors.textSecondary, flex: 1 }]} numberOfLines={1}>
            {range ? (range.from === range.to ? formatDateOnly(range.from) : `${formatDateOnly(range.from)} – ${formatDateOnly(range.to)}`) : placeholder}
          </Text>
        </Pressable>
        {range ? (
          <Pressable accessibilityRole="button" accessibilityLabel={`Clear ${label}`} onPress={onClear} hitSlop={8}>
            <Icon name="close" size={16} color={theme.colors.textSecondary} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  pill: { paddingHorizontal: 9, paddingVertical: 3, alignSelf: 'flex-start' },
  pillText: { fontSize: 10, fontWeight: '700' },
  code: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start' },
  notice: { flexDirection: 'row', gap: 8, padding: 12, borderWidth: 1 },
  more: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingVertical: 4 },
  dateField: { height: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
});
