import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { designType, useAppTheme } from '@/shared/theme';
import { Icon, IconButton, ListThumb, SearchBar } from '@/shared/ui';
import { formatCurrency } from '@/shared/utils';
import type { Product } from '@/api';

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

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
          <Text style={[designType.h2, { color: theme.colors.text }]}>Search Product</Text>
          <IconButton icon="close" onPress={onClose} accessibilityLabel="Close" />
        </View>
        <View style={{ paddingHorizontal: theme.spacing.lg }}>
          <SearchBar value={search} onChangeText={setSearch} placeholder="Search products…" />
        </View>
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: theme.spacing.lg }}
          renderItem={({ item, index }) => {
            const available = stockByProductId.get(item.id) ?? 0;
            return (
              <Pressable
                accessibilityRole="button"
                onPress={() => onSelect(item)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingVertical: 12,
                  borderTopWidth: index === 0 ? 0 : 1,
                  borderTopColor: theme.colors.border,
                }}>
                <ListThumb text={initials(item.name)} index={index} />
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <Text style={[designType.h3s, { color: theme.colors.text }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={[designType.xs, { color: available > 0 ? theme.colors.textFaint : theme.colors.danger }]}>
                    {formatCurrency(item.price)} · Available {available}
                  </Text>
                </View>
                <Icon name="chevron-right" size={18} color={theme.colors.textFaint} />
              </Pressable>
            );
          }}
        />
      </SafeAreaView>
    </Modal>
  );
}
