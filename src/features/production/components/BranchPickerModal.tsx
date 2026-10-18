import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '@/shared/theme';
import { Icon, SearchBar } from '@/shared/ui';
import type { BranchSummary } from '@/api';

export interface BranchPickerModalProps {
  visible: boolean;
  branches: BranchSummary[];
  onSelect: (branch: BranchSummary) => void;
  onClose: () => void;
}

/** Production's own branch picker — Return Items/Discounts (Branch) never needed one, since those screens are scoped to the signed-in branch. */
export function BranchPickerModal({ visible, branches, onSelect, onClose }: BranchPickerModalProps) {
  const theme = useAppTheme();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return branches;
    return branches.filter((b) => b.name.toLowerCase().includes(term));
  }, [branches, search]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: theme.spacing.lg }}>
          <Text style={[theme.typography.sectionTitle, { color: theme.colors.text }]}>Select Branch</Text>
          <Pressable accessibilityRole="button" onPress={onClose}>
            <Icon name="close" color={theme.colors.text} />
          </Pressable>
        </View>
        <View style={{ paddingHorizontal: theme.spacing.lg }}>
          <SearchBar value={search} onChangeText={setSearch} placeholder="Search branches…" />
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
