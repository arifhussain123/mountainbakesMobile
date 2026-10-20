import type { ReactNode } from 'react';
import type { FinanceDashboardMetric } from '@/api/types';
import type { FinanceDrillTarget } from '@/features/finance';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Icon, type IconName } from '@/shared/ui';

/**
 * The Admin Dashboard's building blocks — the web's `KpiTile`,
 * `SectionHeading` and state panels (`dashboard/admin/sections.tsx`), laid
 * out two tiles across on a phone.
 */

/** Opens the source records behind a figure (the web's `drillTo`). */
export type DrillTo = (metric: FinanceDashboardMetric, extra?: Partial<FinanceDrillTarget>) => void;

export type KpiTone = 'accent' | 'share' | 'received' | 'ledger' | 'returns' | 'discount' | 'neutral';

function useToneColor(tone: KpiTone): string {
  const { colors } = useAppTheme();
  switch (tone) {
    case 'share':
      return colors.secondary;
    case 'received':
      return colors.success;
    case 'ledger':
      return colors.warning;
    case 'returns':
      return colors.danger;
    case 'discount':
      return colors.info;
    case 'neutral':
      return colors.textSecondary;
    default:
      return colors.primary;
  }
}

export function KpiTile({
  label,
  value,
  sub,
  icon,
  tone = 'accent',
  negative,
  onPress,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: IconName;
  tone?: KpiTone;
  negative?: boolean;
  /** Present only when the figure has source records to open. */
  onPress?: () => void;
}) {
  const theme = useAppTheme();
  const color = useToneColor(tone);
  const body = (
    <>
      <View style={styles.tileHead}>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary, fontWeight: '700', flex: 1 }]} numberOfLines={2}>
          {label}
        </Text>
        <View style={styles.iconWrap}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: color, opacity: 0.14, borderRadius: 10 }]} />
          <Icon name={icon} size={16} color={color} />
        </View>
      </View>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        style={[styles.value, { color: negative ? theme.colors.danger : theme.colors.text }]}>
        {value}
      </Text>
      {sub ? (
        <Text style={[styles.sub, { color: theme.colors.textFaint }]} numberOfLines={3}>
          {sub}
        </Text>
      ) : null}
      {onPress ? <Text style={[styles.drill, { color: theme.colors.primary }]}>View records ›</Text> : null}
    </>
  );
  const style = [styles.tile, { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.cardBorder, borderRadius: theme.radii.lg }];
  return onPress ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}${sub ? `, ${sub}` : ''}`}
      accessibilityHint="Opens the source records"
      onPress={onPress}
      style={({ pressed }) => [...style, pressed && { opacity: 0.7 }]}>
      {body}
    </Pressable>
  ) : (
    <View accessible accessibilityLabel={`${label}: ${value}${sub ? `, ${sub}` : ''}`} style={style}>
      {body}
    </View>
  );
}

/** Two tiles a row; an odd last tile takes the full width. */
export function KpiGrid({ children }: { children: ReactNode }) {
  return <View style={styles.grid}>{children}</View>;
}

export function DashSection({ title, sub, children, right }: { title: string; sub?: string; children?: ReactNode; right?: ReactNode }) {
  const theme = useAppTheme();
  return (
    <View style={{ gap: theme.spacing.md }}>
      <View style={styles.headRow}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text accessibilityRole="header" style={[theme.typography.sectionTitle, { color: theme.colors.text, fontWeight: '700' }]}>
            {title}
          </Text>
          {sub ? <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 2 }]}>{sub}</Text> : null}
        </View>
        {right}
      </View>
      {children}
    </View>
  );
}

/** One line of warning (or failure) with an optional Retry. */
export function Banner({ text, tone = 'danger', onRetry }: { text: string; tone?: 'danger' | 'warning'; onRetry?: () => void }) {
  const theme = useAppTheme();
  const color = tone === 'danger' ? theme.colors.danger : theme.colors.warning;
  return (
    <View accessibilityRole="alert" style={[styles.banner, { borderColor: color, borderRadius: theme.radii.md, backgroundColor: theme.colors.cardFill }]}>
      <Icon name="warning" size={16} color={color} />
      <Text style={[theme.typography.bodySmall, { color: theme.colors.text, flex: 1 }]}>{text}</Text>
      {onRetry ? <SmallButton label="Retry" onPress={onRetry} /> : null}
    </View>
  );
}

/** The web's centred StatePanel: a title, a sentence and one action. */
export function StatePanel({ title, body, actionLabel, onAction }: { title: string; body: string; actionLabel?: string; onAction?: () => void }) {
  const theme = useAppTheme();
  return (
    <View style={[styles.state, { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.cardBorder, borderRadius: theme.radii.lg }]}>
      <Text style={[theme.typography.cardTitle, { color: theme.colors.text, fontWeight: '700', textAlign: 'center' }]}>{title}</Text>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, textAlign: 'center' }]}>{body}</Text>
      {actionLabel && onAction ? <SmallButton label={actionLabel} onPress={onAction} /> : null}
    </View>
  );
}

/** A compact outlined button — Retry, Reset filters, Security. */
export function SmallButton({ label, onPress, icon }: { label: string; onPress: () => void; icon?: IconName }) {
  const theme = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [styles.small, { borderColor: theme.colors.cardBorder, borderRadius: theme.radii.sm, opacity: pressed ? 0.6 : 1 }]}>
      {icon ? <Icon name={icon} size={14} color={theme.colors.text} /> : null}
      <Text style={[theme.typography.label, { color: theme.colors.text, fontWeight: '700' }]}>{label}</Text>
    </Pressable>
  );
}

/** A small segmented toggle (Top 5 / Top 10, Today / This week / This month). */
export function Toggle<T extends string | number>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  const theme = useAppTheme();
  return (
    <View accessibilityRole="tablist" style={[styles.toggle, { backgroundColor: theme.colors.background, borderColor: theme.colors.cardBorder, borderRadius: theme.radii.sm }]}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.value)}
            style={[styles.toggleItem, { backgroundColor: active ? theme.colors.primary : 'transparent', borderRadius: theme.radii.sm - 2 }]}>
            <Text style={[theme.typography.label, { fontWeight: '700', color: active ? theme.colors.primaryText : theme.colors.textSecondary }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { flexGrow: 1, flexBasis: '45%', minWidth: 0, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 12, gap: 6 },
  tileHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  iconWrap: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: 19, fontWeight: '800', fontVariant: ['tabular-nums'] },
  sub: { fontSize: 11, lineHeight: 15 },
  drill: { fontSize: 11, fontWeight: '700' },
  headRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  state: { borderWidth: 1, paddingHorizontal: 20, paddingVertical: 32, alignItems: 'center', gap: 10 },
  small: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, paddingHorizontal: 12, minHeight: 32 },
  toggle: { flexDirection: 'row', borderWidth: 1, padding: 2, alignSelf: 'flex-start' },
  toggleItem: { minHeight: 32, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
});
