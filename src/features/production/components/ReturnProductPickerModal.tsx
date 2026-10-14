import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, SafeAreaView, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Icon, SearchBar } from '@/shared/ui';
import type { Product } from '@/api';

export interface ReturnProductPickerModalProps {
  visible: boolean;
  products: Product[];
  onSelect: (product: Product) => void;
  onClose: () => void;
}

/**
 * Recording a return has no "available" quantity to show (unlike a sale or
 * demand line) — this is name-only, unlike `@/features/sales/components`'
 * `ProductPickerModal`, which always shows an availability figure.
 */
export function ReturnProductPickerModal({ visible, products, onSelect, onClose }: ReturnProductPickerModalProps) {
  const theme = useAppTheme();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;
    return products.filter((p) => p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term));
  }, [products, search]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: theme.spacing.lg }}>
          <Text style={[theme.typography.sectionTitle, { color: theme.colors.text }]}>Select Product</Text>
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
              <Text style={[theme.typography.body, { color: theme.colors.text }]} numberOfLines={1}>
                {item.name}
              </Text>
            </Pressable>
          )}
        />
      </SafeAreaView>
    </Modal>
  );
}
