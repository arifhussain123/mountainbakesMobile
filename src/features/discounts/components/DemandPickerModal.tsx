import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { designType, useAppTheme } from '@/shared/theme';
import { Icon, IconButton, ListThumb, SearchBar } from '@/shared/ui';
import { formatDisplayDate, includesTerm } from '@/shared/utils';
import type { ProductionOrder } from '@/api';

export interface DemandPickerModalProps {
  visible: boolean;
  demands: ProductionOrder[];
  onSelect: (demand: ProductionOrder) => void;
  onClose: () => void;
}

/** Request Discount's demand picker — a claim is always raised against one of the branch's own demands. */
export function DemandPickerModal({ visible, demands, onSelect, onClose }: DemandPickerModalProps) {
  const theme = useAppTheme();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return demands;
    // Demand # or date, as the web's demand search matches.
    return demands.filter((d) => includesTerm(d.demandNumber, term) || includesTerm(d.date, term));
  }, [demands, search]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: theme.spacing.lg }}>
          <Text style={[designType.h2, { color: theme.colors.text }]}>Select Demand</Text>
          <IconButton icon="close" onPress={onClose} accessibilityLabel="Close" />
        </View>
        <View style={{ paddingHorizontal: theme.spacing.lg }}>
          <SearchBar value={search} onChangeText={setSearch} placeholder="Search demand…" />
        </View>
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: theme.spacing.lg }}
          renderItem={({ item, index }) => (
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
              <ListThumb icon="orders" index={index} />
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <Text style={[designType.h3s, { color: theme.colors.text }]}>{item.demandNumber}</Text>
                <Text style={[designType.xs, { color: theme.colors.textFaint }]}>
                  {formatDisplayDate(item.date)} · {item.status}
                </Text>
              </View>
              <Icon name="chevron-right" size={18} color={theme.colors.textFaint} />
            </Pressable>
          )}
          ListEmptyComponent={<Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>No demands found.</Text>}
        />
      </SafeAreaView>
    </Modal>
  );
}
