import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Icon, ListThumb } from '@/shared/ui';
import { formatCurrency } from '@/shared/utils';

export interface EventDemandItemRowProps {
  name: string;
  qty: number;
  /** Current unit price — the "Rs. X each" line is hidden when it is unknown (0). */
  unitPrice: number;
  /** Row index — picks the thumb's pastel; rows after the first get a hairline above. */
  index: number;
  disabled?: boolean;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
}

/** "Cream Puff" → "CP". */
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
}

/** Redesign B19 — one product row of the advance demand: pastel initials, name over "Rs. X each", a −/qty/+ stepper box and remove. */
export function EventDemandItemRow({ name, qty, unitPrice, index, disabled, onIncrement, onDecrement, onRemove }: EventDemandItemRowProps) {
  const theme = useAppTheme();
  const border = theme.colors.border;

  return (
    <View style={[styles.row, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: border }]}>
      <ListThumb text={initials(name)} index={index} />
      <View style={styles.body}>
        <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={1}>
          {name}
        </Text>
        {unitPrice > 0 ? <Text style={[styles.xs, { color: theme.colors.textFaint }]}>{formatCurrency(unitPrice)} each</Text> : null}
      </View>
      <View style={[styles.stepper, { borderColor: border, backgroundColor: theme.colors.cardFill, opacity: disabled ? 0.5 : 1 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Decrease ${name}`} disabled={disabled} onPress={onDecrement} style={styles.stepperButton}>
          <Icon name="minus" size={14} color={theme.colors.textSecondary} />
        </Pressable>
        <View style={[styles.qtyCell, { borderColor: border }]}>
          <Text style={[styles.qty, { color: theme.colors.text }]}>{qty}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={`Increase ${name}`} disabled={disabled} onPress={onIncrement} style={styles.stepperButton}>
          <Icon name="plus" size={14} color={theme.colors.primary} />
        </Pressable>
      </View>
      {disabled ? null : (
        <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${name}`} onPress={onRemove} hitSlop={6} style={styles.removeButton}>
          <Icon name="trash" size={15} color={theme.colors.danger} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  body: { flex: 1, minWidth: 0, gap: 2 },
  name: { fontSize: 14, lineHeight: 20, fontWeight: '600', letterSpacing: -0.2 },
  xs: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  stepper: { flexDirection: 'row', alignItems: 'center', height: 38, borderWidth: 1.5, borderRadius: 13 },
  stepperButton: { width: 34, height: '100%', alignItems: 'center', justifyContent: 'center' },
  qtyCell: { minWidth: 36, height: '100%', paddingHorizontal: 4, borderLeftWidth: 1, borderRightWidth: 1, alignItems: 'center', justifyContent: 'center' },
  qty: { fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] },
  removeButton: { width: 24, height: 38, alignItems: 'center', justifyContent: 'center' },
});
