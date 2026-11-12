import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '@/shared/theme';
import { Icon, IconButton, ListThumb, SearchBar } from '@/shared/ui';
import { formatCurrency } from '@/shared/utils';
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
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.text }]}>Add Product</Text>
          <IconButton icon="close" accessibilityLabel="Close" onPress={onClose} />
        </View>
        <View style={{ paddingHorizontal: 20 }}>
          <SearchBar value={search} onChangeText={setSearch} placeholder="Search products…" />
        </View>
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: theme.spacing.sm }}
          renderItem={({ item, index }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() => onSelect(item)}
              style={[styles.row, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border }]}>
              <ListThumb text={initials(item.name)} index={index} />
              <View style={styles.body}>
                <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={1}>
                  {item.name}
                </Text>
                {item.price > 0 ? <Text style={[styles.xs, { color: theme.colors.textFaint }]}>{formatCurrency(item.price)} each</Text> : null}
              </View>
              <Icon name="plus" size={18} color={theme.colors.primary} />
            </Pressable>
          )}
          ListEmptyComponent={<Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>No products found.</Text>}
        />
      </SafeAreaView>
    </Modal>
  );
}

/** "Cream Puff" → "CP". */
function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '600', letterSpacing: -0.4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  body: { flex: 1, minWidth: 0, gap: 2 },
  name: { fontSize: 14, lineHeight: 20, fontWeight: '600', letterSpacing: -0.2 },
  xs: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
});
