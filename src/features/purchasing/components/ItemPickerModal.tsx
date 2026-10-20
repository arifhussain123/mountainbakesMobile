import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PURCHASE_UNITS, useCreatePurchaseItem, usePurchaseItems, type PurchaseItem, type PurchaseUnit } from '@/api';
import { useDebouncedValue } from '@/shared/hooks';
import { mapErrorToMessage } from '@/shared/helpers';
import { useAppTheme } from '@/shared/theme';
import { EmptyState, ErrorState, Icon, PrimaryButton, SearchBar } from '@/shared/ui';
import { useSubmission } from '../hooks';
import { formatQty } from '../utils/numbers';
import { ChoiceChips, FieldLabel } from './FormParts';

export interface ItemPickerModalProps {
  visible: boolean;
  title?: string;
  /** Prefills the search (and the name of a new catalog item). */
  initialSearch?: string;
  initialUnit?: PurchaseUnit | null;
  /**
   * Only items stocked in this unit, and a new item gets it too — a goods
   * receipt line must go to an active catalog item with the bill line's unit
   * (the API refuses anything else).
   */
  lockUnit?: PurchaseUnit | null;
  /** Shown above the list, e.g. why the list is filtered. */
  hint?: string;
  onSelect: (item: PurchaseItem) => void;
  onClose: () => void;
}

const UNIT_OPTIONS = PURCHASE_UNITS.map((u) => ({ value: u, label: u }));

/**
 * The ingredient catalog (`GET /purchasing/items`), with stock on hand, plus
 * "add to catalog" for an item that is not in it yet — a goods receipt needs a
 * catalog item to put stock against.
 */
export function ItemPickerModal({ visible, title = 'Choose Stock Item', initialSearch = '', initialUnit = null, lockUnit = null, hint, onSelect, onClose }: ItemPickerModalProps) {
  const theme = useAppTheme();
  const [search, setSearch] = useState(initialSearch);
  const [newUnit, setNewUnit] = useState<PurchaseUnit | null>(initialUnit);
  const [createError, setCreateError] = useState<string | null>(null);
  const term = useDebouncedValue(search).trim();
  const items = usePurchaseItems(term, { enabled: visible });
  const create = useCreatePurchaseItem();
  const submission = useSubmission('purchase_item_create');

  useEffect(() => {
    if (visible) {
      setSearch(initialSearch);
      setNewUnit(lockUnit ?? initialUnit);
      setCreateError(null);
    }
  }, [visible, initialSearch, initialUnit, lockUnit]);

  const rows = (items.data ?? []).filter((i) => i.isActive && (!lockUnit || i.unit === lockUnit));
  const exact = rows.some((i) => i.name.trim().toLowerCase() === search.trim().toLowerCase() && (!newUnit || i.unit === newUnit));
  const canCreate = search.trim().length > 0 && !exact;

  const addToCatalog = async () => {
    if (!newUnit) {
      setCreateError('Choose the unit it is stocked in');
      return;
    }
    const input = { name: search.trim(), unit: newUnit };
    setCreateError(null);
    const outcome = await submission.run(input, () => create.mutateAsync(input));
    if (outcome.kind === 'done') onSelect(outcome.value);
    else if (outcome.kind === 'failed') setCreateError(outcome.message);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: theme.spacing.lg }}>
          <Text style={[theme.typography.sectionTitle, { color: theme.colors.text }]}>{title}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} hitSlop={10}>
            <Icon name="close" color={theme.colors.text} />
          </Pressable>
        </View>
        <View style={{ paddingHorizontal: theme.spacing.lg }}>
          <SearchBar value={search} onChangeText={setSearch} placeholder="Search ingredients…" />
          {hint ? <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 8 }]}>{hint}</Text> : null}
        </View>
        {items.isLoading ? <ActivityIndicator style={{ marginTop: 24 }} color={theme.colors.primary} /> : null}
        {items.error ? (
          <View style={{ padding: theme.spacing.lg }}>
            <ErrorState message={mapErrorToMessage(items.error)} onRetry={() => void items.refetch()} />
          </View>
        ) : null}
        <FlatList
          data={rows}
          keyExtractor={(i) => i.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: theme.spacing.lg }}
          ListHeaderComponent={
            canCreate ? (
              <View style={{ marginBottom: theme.spacing.md, padding: theme.spacing.md, borderRadius: theme.radii.md, borderWidth: 1, borderColor: theme.colors.cardBorder }}>
                <Text style={[theme.typography.bodySmall, { color: theme.colors.text }]}>
                  Add “{search.trim()}” to the ingredient catalog
                </Text>
                {lockUnit ? (
                  <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 6 }]}>Stocked in {lockUnit}</Text>
                ) : (
                  <>
                    <FieldLabel required style={{ marginTop: 10 }}>
                      Unit
                    </FieldLabel>
                    <ChoiceChips options={UNIT_OPTIONS} value={newUnit} onChange={setNewUnit} />
                  </>
                )}
                {createError ? <Text style={[theme.typography.label, { color: theme.colors.danger, marginTop: 6 }]}>{createError}</Text> : null}
                <View style={{ marginTop: 10 }}>
                  <PrimaryButton label="Add to Catalog" onPress={() => void addToCatalog()} loading={submission.pending} />
                </View>
              </View>
            ) : undefined
          }
          ListEmptyComponent={!items.isLoading && !items.error && !canCreate ? <EmptyState title="No Items" message="Type a name to find or add an ingredient." /> : undefined}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${item.name}, ${item.unit}, ${formatQty(item.balance, item.unit)} in stock`}
              onPress={() => onSelect(item)}
              style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border, flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={[theme.typography.body, { color: theme.colors.text }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
                  {[item.itemCode, item.category].filter(Boolean).join(' · ')}
                </Text>
              </View>
              <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>{formatQty(item.balance, item.unit)} in stock</Text>
            </Pressable>
          )}
        />
      </SafeAreaView>
    </Modal>
  );
}
