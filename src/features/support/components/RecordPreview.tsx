import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from 'react-native';
import { useEffect } from 'react';
import { useAppTheme } from '@/shared/theme';
import { Icon, ListThumb } from '@/shared/ui';
import { referenceTypeFor } from '../referenceTypes';
import type { SupportReference } from '@/api';

export interface RecordPreviewProps {
  reference: SupportReference;
  /** Shows "Open record" and wires it to the right detail/list screen — off in New Query's inline preview before submit (there's nothing synced yet to point a reader at in a flow that hasn't finished), on in Query Detail. */
  showOpenRecord?: boolean;
  /** Announced once when a lookup just found this reference ("Found: sale MB-004322, 400 rupees") — the brief's accessibility requirement. Omit when rendering an already-known snapshot (Query Detail), where nothing was just "found". */
  announceOnMount?: boolean;
}

/** The record summary card — shared by New Query's lookup result and Query Detail's frozen snapshot. */
export function RecordPreview({ reference, showOpenRecord, announceOnMount }: RecordPreviewProps) {
  const theme = useAppTheme();
  const referenceType = referenceTypeFor(reference.referenceId);

  useEffect(() => {
    if (!announceOnMount) return;
    const amountField = reference.fields.find((f) => /total|amount|price/i.test(f.label));
    AccessibilityInfo.announceForAccessibility(`Found: ${reference.title}${amountField ? `, ${amountField.value}` : ''}`);
  }, [announceOnMount, reference]);

  // 2026 redesign B25: the found record sits on a lavender tint card (light); dark keeps the glass card.
  const tint = theme.isDark
    ? { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.cardBorder }
    : { backgroundColor: '#EFEBFF', borderColor: '#E2DBFF' };

  return (
    <View style={[styles.card, tint]}>
      <View style={styles.titleRow}>
        <ListThumb icon={referenceType?.icon ?? 'file-list'} index={1} size={40} />
        <View style={styles.titleBlock}>
          <Text style={[styles.h3, { color: theme.colors.text }]} numberOfLines={2}>
            {reference.title}
          </Text>
          <Text style={[styles.xs, { color: theme.colors.textFaint }]} numberOfLines={1}>
            {[referenceType?.label, reference.referenceId].filter(Boolean).join(' · ')}
          </Text>
        </View>
      </View>
      <View style={styles.fields}>
        {reference.fields.map((field, index) => (
          <View
            key={field.label}
            style={[styles.fieldRow, index > 0 && { borderTopWidth: 1, borderTopColor: theme.isDark ? theme.colors.border : 'rgba(91, 72, 216, 0.10)' }]}>
            <Text style={[styles.sm, { color: theme.colors.textSecondary }]}>{field.label}</Text>
            <Text style={[styles.sm, styles.value, { color: theme.colors.text }]}>{field.value}</Text>
          </View>
        ))}
      </View>
      {showOpenRecord && referenceType ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open record for ${reference.referenceId}`}
          onPress={() => referenceType.openRecord(reference)}
          style={[styles.openRecordButton, { backgroundColor: theme.isDark ? theme.colors.border : theme.colors.surface }]}>
          <Text style={[styles.link, { color: theme.colors.primary }]}>Open record</Text>
          <Icon name="chevron-right" size={16} color={theme.colors.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 22, borderWidth: 1, padding: 16, gap: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  titleBlock: { flex: 1, minWidth: 0, gap: 2 },
  h3: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  xs: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  fields: {},
  fieldRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 8 },
  sm: { fontSize: 13, lineHeight: 18 },
  value: { flexShrink: 1, textAlign: 'right', fontWeight: '600', fontVariant: ['tabular-nums'] },
  link: { fontSize: 13, fontWeight: '700' },
  openRecordButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, minHeight: 44, borderRadius: 999 },
});
