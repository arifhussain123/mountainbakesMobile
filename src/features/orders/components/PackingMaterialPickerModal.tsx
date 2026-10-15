import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, SafeAreaView, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Icon, SearchBar } from '@/shared/ui';
import type { PackingMaterial } from '@/api';

export interface PackingMaterialPickerModalProps {
  visible: boolean;
  materials: PackingMaterial[];
  onSelect: (material: PackingMaterial) => void;
  onClose: () => void;
}

export function PackingMaterialPickerModal({ visible, materials, onSelect, onClose }: PackingMaterialPickerModalProps) {
  const theme = useAppTheme();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return materials;
    return materials.filter((m) => m.materialName.toLowerCase().includes(term));
  }, [materials, search]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: theme.spacing.lg }}>
          <Text style={[theme.typography.sectionTitle, { color: theme.colors.text }]}>Select Packing Material</Text>
          <Pressable accessibilityRole="button" onPress={onClose}>
            <Icon name="close" color={theme.colors.text} />
          </Pressable>
        </View>
        <View style={{ paddingHorizontal: theme.spacing.lg }}>
          <SearchBar value={search} onChangeText={setSearch} placeholder="Search packing materials…" />
        </View>
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: theme.spacing.lg }}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() => onSelect(item)}
              style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
              <Text style={[theme.typography.body, { color: theme.colors.text }]}>{item.materialName}</Text>
            </Pressable>
          )}
          ListEmptyComponent={
            <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>No packing materials found.</Text>
          }
        />
      </SafeAreaView>
    </Modal>
  );
}
