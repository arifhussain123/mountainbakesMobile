import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '@/shared/theme';
import { Icon, SearchBar } from '@/shared/ui';
import type { Product } from '@/api';
import { includesTerm } from '@/shared/utils';

export interface ProductPickerModalProps {
  visible: boolean;
  products: Product[];
  stockByProductId: Map<string, number>;
  onSelect: (product: Product) => void;
  onClose: () => void;
}

/** Return Items' product picker — only products with stock on hand can be returned. */
export function ProductPickerModal({ visible, products, stockByProductId, onSelect, onClose }: ProductPickerModalProps) {
  const theme = useAppTheme();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const withStock = products.filter((p) => (stockByProductId.get(p.id) ?? 0) > 0);
    const term = search.trim().toLowerCase();
    if (!term) return withStock;
    return withStock.filter((p) => includesTerm(p.name, term));
  }, [products, stockByProductId, search]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: theme.spacing.lg }}>
          <Text style={[theme.typography.sectionTitle, { color: theme.colors.text }]}>Search Product</Text>
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
              <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 2 }]}>
                Available {stockByProductId.get(item.id) ?? 0}
              </Text>
            </Pressable>
          )}
          ListEmptyComponent={<Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>No stock available to return.</Text>}
        />
      </SafeAreaView>
    </Modal>
  );
}
