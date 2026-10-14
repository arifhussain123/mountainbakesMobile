import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Icon } from '@/shared/ui';

export interface EventDemandItemRowProps {
  name: string;
  qty: number;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
}

export function EventDemandItemRow({ name, qty, onIncrement, onDecrement, onRemove }: EventDemandItemRowProps) {
  const theme = useAppTheme();

  return (
    <View style={[styles.row, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radii.md }]}>
      <Text style={[theme.typography.body, { color: theme.colors.text, flex: 1, fontWeight: '700' }]} numberOfLines={1}>
        {name}
      </Text>
      <View style={[styles.stepper, { borderColor: theme.colors.primary, borderRadius: theme.radii.sm }]}>
        <Pressable accessibilityRole="button" onPress={onDecrement} style={styles.stepperButton}>
          <Icon name="minus" size={14} color={theme.colors.textSecondary} />
        </Pressable>
        <Text style={[theme.typography.body, { color: theme.colors.text, minWidth: 26, textAlign: 'center' }]}>{qty}</Text>
        <Pressable accessibilityRole="button" onPress={onIncrement} style={styles.stepperButton}>
          <Icon name="plus" size={14} color={theme.colors.primary} />
        </Pressable>
      </View>
      <Pressable accessibilityRole="button" onPress={onRemove} style={styles.removeButton}>
        <Icon name="trash" size={15} color={theme.colors.danger} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, padding: 10, marginBottom: 8 },
  stepper: { flexDirection: 'row', alignItems: 'center', height: 34, borderWidth: 1 },
  stepperButton: { width: 30, alignItems: 'center', justifyContent: 'center' },
  removeButton: { width: 28, height: 34, alignItems: 'center', justifyContent: 'center' },
});
