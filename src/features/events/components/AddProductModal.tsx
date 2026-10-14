import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, SafeAreaView, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Icon, SearchBar } from '@/shared/ui';
import type { Product } from '@/api';

export interface AddProductModalProps {
  visible: boolean;
  products: Product[];
  excludeIds: Set<string>;
  onSelect: (product: Product) => void;
  onClose: () => void;
}

/** branchApp.md screen 19 — add a product to the advance demand. */
export function AddProductModal({ visible, products, excludeIds, onSelect, onClose }: AddProductModalProps) {
  const theme = useAppTheme();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const available = products.filter((p) => !excludeIds.has(p.id));
    const term = search.trim().toLowerCase();
    if (!term) return available;
    return available.filter((p) => p.name.toLowerCase().includes(term));
  }, [products, excludeIds, search]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: theme.spacing.lg }}>
          <Text style={[theme.typography.sectionTitle, { color: theme.colors.text }]}>Add Product</Text>
          <Pressable accessibilityRole="button" onPress={onClose}>
            <Icon name="close" color={theme.colors.text} />
          </Pressable>
        </View>
        <View style={{ paddingHorizontal: theme.spacing.lg }}>
          <SearchBar value={search} onChangeText={setSearch} placeholder="Search products…" />
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
              <Text style={[theme.typography.body, { color: theme.colors.text }]}>{item.name}</Text>
            </Pressable>
          )}
          ListEmptyComponent={<Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>No products found.</Text>}
        />
      </SafeAreaView>
    </Modal>
  );
}
