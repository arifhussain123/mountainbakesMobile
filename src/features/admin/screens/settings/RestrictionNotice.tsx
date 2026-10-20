import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { MONO } from '../../components/AdminDetail';
import type { Restriction, RestrictionSeverity } from '../../utils/restrictionPreview';

/**
 * The one notice a popup shows for a Restriction Rule — the web's
 * `RestrictionNotice`: a warning, a block, "Admin approval required" or
 * "Admin Approved", drawn from the restriction exactly as composed (title,
 * paragraphs, demand / CT numbers, shortage table, sold meter, stats, the
 * admin's reason). It decides nothing and adds no wording of its own.
 */

const LEVEL: Record<RestrictionSeverity, { level: string; glyph: string }> = {
  warning: { level: 'WARNING', glyph: '!' },
  blocking: { level: 'BLOCKING', glyph: '!' },
  admin_approval_required: { level: 'ADMIN APPROVAL REQUIRED', glyph: '?' },
  approved: { level: 'APPROVED', glyph: '✓' },
  info: { level: 'INFO', glyph: 'i' },
};

export function RestrictionNotice({ restriction: r, children }: { restriction: Restriction; children?: ReactNode }) {
  const theme = useAppTheme();
  const tone = {
    warning: theme.colors.warning,
    blocking: theme.colors.danger,
    admin_approval_required: theme.colors.info,
    approved: theme.colors.success,
    info: theme.colors.textSecondary,
  }[r.severity];
  const { level, glyph } = LEVEL[r.severity];
  const body = [theme.typography.bodySmall, { color: theme.colors.text }];
  const inset = { backgroundColor: theme.colors.background, borderRadius: 8 };

  return (
    <View
      // A block is announced at once; a warning waits its turn.
      accessibilityRole={r.severity === 'blocking' || r.severity === 'admin_approval_required' ? 'alert' : 'summary'}
      style={[styles.box, { backgroundColor: `${tone}14`, borderColor: `${tone}66` }]}>
      <View style={[styles.dot, { backgroundColor: tone }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Text style={styles.glyph}>{glyph}</Text>
      </View>
      <View style={styles.content}>
        <View style={{ gap: 2 }}>
          <Text style={[styles.level, { color: tone }]}>{level}</Text>
          <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>{r.title}</Text>
        </View>

        {r.messages.map((m) => (
          <Text key={m} style={body}>
            {m}
          </Text>
        ))}

        {r.list && r.list.length > 0 ? (
          <View style={styles.chips}>
            {r.list.map((item) => (
              <View key={item} style={[styles.chip, { borderColor: `${tone}66`, backgroundColor: theme.colors.background }]}>
                <Text style={[{ fontSize: 12, fontWeight: '600', color: theme.colors.text }, MONO]}>{item}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {r.shortages && r.shortages.length > 0 ? (
          <View style={[inset, { paddingVertical: 4 }]}>
            <View style={styles.tr}>
              {['Product', 'Required Qty', 'Available Qty', 'Less Qty'].map((h, i) => (
                <Text key={h} style={[styles.td, i === 0 ? styles.tdFirst : null, { color: theme.colors.textSecondary, fontSize: 11 }]}>
                  {h}
                </Text>
              ))}
            </View>
            {r.shortages.map((s) => (
              <View key={s.productName} style={[styles.tr, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border }]}>
                <Text style={[styles.td, styles.tdFirst, { color: theme.colors.text, fontWeight: '600' }]}>{s.productName}</Text>
                <Text style={[styles.td, { color: theme.colors.text }]}>{s.required}</Text>
                <Text style={[styles.td, { color: theme.colors.text }]}>{s.available}</Text>
                <Text style={[styles.td, { color: tone, fontWeight: '700' }]}>{s.short}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {r.after?.map((m) => (
          <Text key={m} style={body}>
            {m}
          </Text>
        ))}

        {r.meter ? (
          <View
            accessible
            accessibilityLabel={`${r.meter.value}% sold, ${r.meter.required}% required`}
            style={[styles.meter, { borderColor: `${tone}66`, backgroundColor: theme.colors.background }]}>
            <View style={[styles.meterFill, { backgroundColor: tone, width: `${Math.min(r.meter.value, 100)}%` }]} />
            <View style={[styles.meterMark, { backgroundColor: theme.colors.text, left: `${Math.min(r.meter.required, 100)}%` }]} />
          </View>
        ) : null}

        {r.stats && r.stats.length > 0 ? (
          <View style={[inset, { paddingHorizontal: 12, paddingVertical: 10, gap: 6 }]}>
            {r.stats.map((s) => (
              <View key={s.label} style={styles.stat}>
                <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{s.label}</Text>
                <Text style={[theme.typography.label, { color: theme.colors.text, fontWeight: '700' }]}>{s.value}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {r.reason ? (
          <View style={[inset, { paddingHorizontal: 12, paddingVertical: 10, gap: 2 }]}>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Reason</Text>
            <Text style={body}>{r.reason}</Text>
          </View>
        ) : null}

        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', gap: 12, padding: 14, borderWidth: 1, borderRadius: 10 },
  dot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  glyph: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  content: { flex: 1, minWidth: 0, gap: 8 },
  level: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  tr: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 6 },
  td: { flex: 1, fontSize: 12, textAlign: 'center' },
  tdFirst: { flex: 1.6, textAlign: 'left' },
  meter: { height: 8, borderRadius: 4, borderWidth: 1, overflow: 'visible' },
  meterFill: { position: 'absolute', top: 0, bottom: 0, left: 0, borderRadius: 4 },
  meterMark: { position: 'absolute', top: -4, bottom: -4, width: 2 },
  stat: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
});
