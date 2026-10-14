import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Icon } from '@/shared/ui';
import type { Product } from '@/api';

export interface ReturnLineRowProps {
  product: Product | null;
  qty: number;
  available: number | null;
  onPressSelect: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
}

/** branchApp.md screen 06 — one Return Items line: product, available qty, −/+ stepper. */
export function ReturnLineRow({ product, qty, available, onPressSelect, onIncrement, onDecrement, onRemove }: ReturnLineRowProps) {
  const theme = useAppTheme();
  const atLimit = available != null && qty >= available;

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radii.md }]}>
      <View style={styles.topRow}>
        <Pressable
          accessibilityRole="button"
          onPress={onPressSelect}
          style={[styles.productButton, { backgroundColor: theme.colors.background, borderRadius: theme.radii.sm }]}>
          <Text style={[theme.typography.body, { color: product ? theme.colors.text : theme.colors.textSecondary }]} numberOfLines={1}>
            {product ? product.name : 'Search product…'}
          </Text>
          <Icon name="chevron-down" size={14} color={theme.colors.textSecondary} />
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onRemove} style={styles.removeButton}>
          <Icon name="trash" size={16} color={theme.colors.danger} />
        </Pressable>
      </View>
      <View style={[styles.bottomRow, { marginTop: 10 }]}>
        <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
          Available <Text style={{ color: theme.colors.text, fontWeight: '700' }}>{available ?? '—'}</Text>
        </Text>
        <View style={[styles.stepper, { borderColor: atLimit ? theme.colors.warning : theme.colors.primary, borderRadius: theme.radii.sm }]}>
          <Pressable accessibilityRole="button" onPress={onDecrement} style={styles.stepperButton}>
            <Icon name="minus" size={14} color={theme.colors.textSecondary} />
          </Pressable>
          <Text style={[theme.typography.body, { color: theme.colors.text, minWidth: 24, textAlign: 'center' }]}>{qty}</Text>
          <Pressable accessibilityRole="button" onPress={onIncrement} disabled={atLimit} style={styles.stepperButton}>
            <Icon name="plus" size={14} color={atLimit ? theme.colors.textSecondary : theme.colors.primary} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, padding: 12, marginBottom: 8 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  productButton: { flex: 1, height: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 },
  removeButton: { width: 36, height: 40, alignItems: 'center', justifyContent: 'center' },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepper: { flexDirection: 'row', alignItems: 'center', height: 34, borderWidth: 1 },
  stepperButton: { width: 30, alignItems: 'center', justifyContent: 'center' },
});
