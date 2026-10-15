import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, SafeAreaView, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Icon, SearchBar } from '@/shared/ui';
import { formatDisplayDate } from '@/shared/utils';
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
    return demands.filter((d) => d.demandNumber.toLowerCase().includes(term));
  }, [demands, search]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: theme.spacing.lg }}>
          <Text style={[theme.typography.sectionTitle, { color: theme.colors.text }]}>Select Demand</Text>
          <Pressable accessibilityRole="button" onPress={onClose}>
            <Icon name="close" color={theme.colors.text} />
          </Pressable>
        </View>
        <View style={{ paddingHorizontal: theme.spacing.lg }}>
          <SearchBar value={search} onChangeText={setSearch} placeholder="Search demand…" />
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
              <Text style={[theme.typography.body, { color: theme.colors.text }]}>{item.demandNumber}</Text>
              <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 2 }]}>
                {formatDisplayDate(item.date)} · {item.status}
              </Text>
            </Pressable>
          )}
          ListEmptyComponent={<Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>No demands found.</Text>}
        />
      </SafeAreaView>
    </Modal>
  );
}
