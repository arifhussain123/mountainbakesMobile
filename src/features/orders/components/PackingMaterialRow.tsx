import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Icon } from '@/shared/ui';
import type { PackingMaterial } from '@/api';

export interface PackingMaterialRowProps {
  material: PackingMaterial | null;
  qtyInput: string;
  onPressSelect: () => void;
  onChangeQty: (text: string) => void;
  onRemove: () => void;
}

export function PackingMaterialRow({ material, qtyInput, onPressSelect, onChangeQty, onRemove }: PackingMaterialRowProps) {
  const theme = useAppTheme();

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        onPress={onPressSelect}
        style={[styles.selectButton, { backgroundColor: theme.isDark ? theme.colors.cardFill : theme.colors.surface, borderColor: theme.colors.border }]}>
        <Text style={[styles.value, { color: material ? theme.colors.text : theme.colors.textFaint }]} numberOfLines={1}>
          {material ? material.materialName : 'Select material…'}
        </Text>
        <Icon name="chevron-down" size={16} color={theme.colors.textFaint} />
      </Pressable>
      <TextInput
        value={qtyInput}
        onChangeText={onChangeQty}
        placeholder="Qty"
        placeholderTextColor={theme.colors.textFaint}
        keyboardType="numeric"
        style={[styles.qtyInput, { borderColor: theme.colors.border, color: theme.colors.text, backgroundColor: theme.isDark ? theme.colors.cardFill : theme.colors.surface }]}
      />
      <Pressable accessibilityRole="button" accessibilityLabel="Remove packing material" onPress={onRemove} style={[styles.removeButton, { backgroundColor: `${theme.colors.danger}14` }]}>
        <Icon name="trash" size={16} color={theme.colors.danger} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  selectButton: { flex: 1, minWidth: 0, height: 44, borderWidth: 1.5, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14 },
  value: { flex: 1, fontSize: 14, fontWeight: '500' },
  qtyInput: { width: 64, height: 44, borderWidth: 1.5, borderRadius: 14, textAlign: 'center', fontSize: 15, fontWeight: '600', paddingVertical: 0 },
  removeButton: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
