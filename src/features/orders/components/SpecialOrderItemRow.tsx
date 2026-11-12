import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Icon } from '@/shared/ui';

export interface SpecialOrderItemRowProps {
  name: string;
  qtyInput: string;
  onChangeName: (text: string) => void;
  onChangeQty: (text: string) => void;
  onRemove: () => void;
}

/**
 * branchApp.md screen 05 — one Special Order Items row. Unlike Packing
 * Materials (a picker over a fixed catalog), these are free-text, off-catalog
 * items — the design's own `pkRows`/`spRows` template is a plain text input
 * for the name, not a picker, so this mirrors that literally.
 */
export function SpecialOrderItemRow({ name, qtyInput, onChangeName, onChangeQty, onRemove }: SpecialOrderItemRowProps) {
  const theme = useAppTheme();

  return (
    <View style={styles.row}>
      <TextInput
        value={name}
        onChangeText={onChangeName}
        placeholder="Item name"
        placeholderTextColor={theme.colors.textFaint}
        style={[styles.nameInput, { borderColor: theme.colors.border, color: theme.colors.text, backgroundColor: theme.isDark ? theme.colors.cardFill : theme.colors.surface }]}
      />
      <TextInput
        value={qtyInput}
        onChangeText={onChangeQty}
        placeholder="Qty"
        placeholderTextColor={theme.colors.textFaint}
        keyboardType="numeric"
        style={[styles.qtyInput, { borderColor: theme.colors.border, color: theme.colors.text, backgroundColor: theme.isDark ? theme.colors.cardFill : theme.colors.surface }]}
      />
      <Pressable accessibilityRole="button" accessibilityLabel="Remove special order item" onPress={onRemove} style={[styles.removeButton, { backgroundColor: `${theme.colors.danger}14` }]}>
        <Icon name="trash" size={16} color={theme.colors.danger} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nameInput: { flex: 1, minWidth: 0, height: 44, borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 0, fontSize: 14, fontWeight: '500' },
  qtyInput: { width: 64, height: 44, borderWidth: 1.5, borderRadius: 14, textAlign: 'center', fontSize: 15, fontWeight: '600', paddingVertical: 0 },
  removeButton: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
