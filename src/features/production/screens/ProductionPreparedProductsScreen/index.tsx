import { useMemo, useState } from 'react';
import { Alert, FlatList, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { usePrepareProduction, useProductionStock } from '@/api';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, EmptyState, ErrorState, LoadingSkeleton, PrimaryButton, Screen, SecondaryButton } from '@/shared/ui';
import { mapErrorToMessage } from '@/shared/helpers';
import { styles } from './styles';
import { useHideTabBarOnFocus } from '@/navigation/tabBar/useTabBarVisibility';

/** mountainbakesProduction.html screen 08 — Today's Prepared Products: ADDS to what today already holds. */
export function ProductionPreparedProductsScreen() {
  const theme = useAppTheme();
  useHideTabBarOnFocus();
  const navigation = useNavigation();
  const stock = useProductionStock();
  const prepare = usePrepareProduction();

  const [inputs, setInputs] = useState<Record<string, string>>({});

  const rows = useMemo(() => stock.data?.rows ?? [], [stock.data]);

  const totalPreparedToday = useMemo(() => rows.reduce((sum, r) => sum + r.preparedToday, 0), [rows]);

  const items = useMemo(
    () =>
      rows
        .map((r) => ({ productId: r.productId, qty: parseInt(inputs[r.productId] ?? '', 10) || 0 }))
        .filter((i) => i.qty > 0),
    [rows, inputs],
  );

  const totalAdding = items.reduce((sum, i) => sum + i.qty, 0);
  const canSubmit = items.length > 0 && !prepare.isPending;

  const handleClear = () => setInputs({});

  const handleSave = async () => {
    try {
      await prepare.mutateAsync({ items });
      Alert.alert('Saved', "Today's prepared products were recorded.", [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (error) {
      Alert.alert('Could not save', mapErrorToMessage(error));
    }
  };

  return (
    <Screen>
      <AppHeader title="Today's Prepared" subtitle="Enter the quantity prepared. Every figure is added to what today already holds." />

      {stock.isLoading ? <LoadingSkeleton height={160} /> : null}
      {stock.error ? <ErrorState message={mapErrorToMessage(stock.error)} onRetry={() => void stock.refetch()} /> : null}

      {!stock.isLoading && !stock.error ? (
        <>
          <View style={[styles.columnHeader, { borderBottomColor: theme.colors.border }]}>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary, flex: 1 }]}>PRODUCT</Text>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary, width: 44, textAlign: 'center' }]}>TODAY</Text>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary, width: 58, textAlign: 'center' }]}>ADD QTY</Text>
          </View>
          <FlatList
            data={rows}
            keyExtractor={(item) => item.productId}
            ListEmptyComponent={<EmptyState title="No Products" message="No products are configured yet." />}
            renderItem={({ item }) => (
              <View style={[styles.row, { borderBottomColor: theme.colors.border }]}>
                <View style={styles.productCol}>
                  <Text style={[theme.typography.body, { color: theme.colors.text }]} numberOfLines={1}>
                    {item.productName}
                  </Text>
                  <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 2 }]}>
                    {item.categoryName ?? item.stockCode}
                  </Text>
                </View>
                <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, width: 44, textAlign: 'center' }]}>
                  {item.preparedToday}
                </Text>
                <TextInput
                  value={inputs[item.productId] ?? ''}
                  onChangeText={(text) => setInputs((prev) => ({ ...prev, [item.productId]: text.replace(/[^0-9]/g, '') }))}
                  placeholder="0"
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="numeric"
                  style={[styles.qtyInput, { borderColor: theme.colors.border, color: theme.colors.text, backgroundColor: theme.colors.surface }]}
                />
              </View>
            )}
          />
        </>
      ) : null}

      <View style={[styles.footer, { borderTopColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
        <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
          Adding <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>+{totalAdding}</Text> to {totalPreparedToday} already
          prepared today → <Text style={{ color: theme.colors.text, fontWeight: '700' }}>{totalPreparedToday + totalAdding}</Text>
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: theme.spacing.sm }}>
          <View style={{ flex: 1 }}>
            <SecondaryButton label="Clear" onPress={handleClear} />
          </View>
          <View style={{ flex: 1.3 }}>
            <PrimaryButton label="Save" onPress={() => void handleSave()} loading={prepare.isPending} disabled={!canSubmit} />
          </View>
        </View>
      </View>
    </Screen>
  );
}
