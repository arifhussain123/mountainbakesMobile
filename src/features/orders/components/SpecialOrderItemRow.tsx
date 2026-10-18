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
        placeholderTextColor={theme.colors.textSecondary}
        style={[styles.nameInput, { borderColor: theme.colors.border, color: theme.colors.text, borderRadius: theme.radii.sm }]}
      />
      <TextInput
        value={qtyInput}
        onChangeText={onChangeQty}
        placeholder="Qty"
        placeholderTextColor={theme.colors.textSecondary}
        keyboardType="numeric"
        style={[styles.qtyInput, { borderColor: theme.colors.border, color: theme.colors.text, borderRadius: theme.radii.sm }]}
      />
      <Pressable accessibilityRole="button" onPress={onRemove} style={styles.removeButton}>
        <Icon name="close" size={16} color={theme.colors.danger} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nameInput: { flex: 1, minWidth: 0, height: 38, borderWidth: 1, paddingHorizontal: 12, fontSize: 12, fontWeight: '600' },
  qtyInput: { width: 56, height: 38, borderWidth: 1, textAlign: 'center' },
  removeButton: { width: 32, height: 38, alignItems: 'center', justifyContent: 'center' },
});
