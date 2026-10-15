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
        style={[styles.selectButton, { backgroundColor: theme.colors.background, borderColor: theme.colors.border, borderRadius: theme.radii.sm }]}>
        <Text style={[theme.typography.bodySmall, { color: material ? theme.colors.text : theme.colors.textSecondary }]} numberOfLines={1}>
          {material ? material.materialName : 'Select material…'}
        </Text>
      </Pressable>
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
  selectButton: { flex: 1, height: 38, borderWidth: 1, justifyContent: 'center', paddingHorizontal: 12 },
  qtyInput: { width: 56, height: 38, borderWidth: 1, textAlign: 'center' },
  removeButton: { width: 32, height: 38, alignItems: 'center', justifyContent: 'center' },
});
