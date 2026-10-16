import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from 'react-native';
import { useEffect } from 'react';
import { useAppTheme } from '@/shared/theme';
import { Card, Icon } from '@/shared/ui';
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

  return (
    <Card style={{ marginTop: 10 }}>
      <View style={styles.titleRow}>
        {referenceType ? <Icon name={referenceType.icon} size={18} color={theme.colors.primary} /> : null}
        <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700', marginLeft: 8, flex: 1 }]} numberOfLines={2}>
          {reference.title}
        </Text>
      </View>
      {reference.fields.map((field) => (
        <View key={field.label} style={styles.fieldRow}>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>{field.label}</Text>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '600' }]}>{field.value}</Text>
        </View>
      ))}
      {showOpenRecord && referenceType ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open record for ${reference.referenceId}`}
          onPress={() => referenceType.openRecord(reference)}
          style={[styles.openRecordButton, { borderColor: theme.colors.border, minHeight: 44 }]}>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.primary, fontWeight: '700' }]}>Open record</Text>
          <Icon name="chevron-right" size={16} color={theme.colors.primary} />
        </Pressable>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  fieldRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  openRecordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 12,
  },
});
