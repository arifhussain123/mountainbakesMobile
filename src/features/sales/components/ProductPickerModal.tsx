import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '@/shared/theme';
import { Icon, SearchBar } from '@/shared/ui';
import { formatCurrency } from '@/shared/utils';
import type { Product } from '@/api';

export interface ProductPickerModalProps {
  visible: boolean;
  products: Product[];
  stockByProductId: Map<string, number>;
  onSelect: (product: Product) => void;
  onClose: () => void;
}

export function ProductPickerModal({ visible, products, stockByProductId, onSelect, onClose }: ProductPickerModalProps) {
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
          renderItem={({ item }) => {
            const available = stockByProductId.get(item.id) ?? 0;
            return (
              <Pressable
                accessibilityRole="button"
                onPress={() => onSelect(item)}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: theme.colors.border,
                }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[theme.typography.body, { color: theme.colors.text }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 2 }]}>
                    {formatCurrency(item.price)} · Available {available}
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />
      </SafeAreaView>
    </Modal>
  );
}
