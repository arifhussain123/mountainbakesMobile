import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Card, StatusBadge, type StatusVariant } from '@/shared/ui';

export interface AdminRowProps {
  title: string;
  /** Lines under the title, each its own row; falsy entries are skipped. */
  lines?: (string | null | undefined | false)[];
  badge?: { label: string; variant: StatusVariant };
  /** Right-aligned figure, e.g. a price or a total. */
  value?: string;
  children?: ReactNode;
}

/** One card in a Super Admin list: title, detail lines, an optional status and figure. */
export function AdminRow({ title, lines, badge, value, children }: AdminRowProps) {
  const theme = useAppTheme();
  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]} numberOfLines={2}>
            {title}
          </Text>
          {(lines ?? []).filter(Boolean).map((line, i) => (
            <Text key={i} style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 2 }]} numberOfLines={2}>
              {line}
            </Text>
          ))}
        </View>
        <View style={styles.side}>
          {value ? <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>{value}</Text> : null}
          {badge ? <StatusBadge label={badge.label} variant={badge.variant} /> : null}
        </View>
      </View>
      {children}
    </Card>
  );
}

export interface SummaryTile {
  label: string;
  value: string;
  tone?: 'danger' | 'success' | 'warning';
}

/** A row of 2–4 count tiles above a list. */
export function SummaryTiles({ tiles }: { tiles: SummaryTile[] }) {
  const theme = useAppTheme();
  const toneColor = { danger: theme.colors.danger, success: theme.colors.success, warning: theme.colors.warning };
  return (
    <View style={styles.tiles}>
      {tiles.map((t) => (
        <Card key={t.label} style={styles.tile}>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {t.label}
          </Text>
          <Text style={[theme.typography.kpi, { color: t.tone ? toneColor[t.tone] : theme.colors.text, marginTop: 2 }]} numberOfLines={1}>
            {t.value}
          </Text>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  side: { alignItems: 'flex-end', gap: 6, maxWidth: '45%' },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: { flexGrow: 1, flexBasis: '45%', padding: 12 },
});
