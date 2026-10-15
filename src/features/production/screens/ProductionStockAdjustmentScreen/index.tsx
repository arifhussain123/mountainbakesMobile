import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useProductionStock, useProducts } from '@/api';
import { ProductPickerModal } from '@/features/sales/components';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, Icon, PrimaryButton, Screen } from '@/shared/ui';
import { PRODUCTION_ADJUSTMENT_LABELS, PRODUCTION_ADJUSTMENT_TYPES } from '@/api';
import type { Product, ProductionAdjustmentType } from '@/api';
import { useProductionAdjustmentForm, type AdjustmentDirection } from '../../hooks';
import { styles } from './styles';

const DIRECTION_OPTIONS: { value: AdjustmentDirection; label: string }[] = [
  { value: 'out', label: 'Remove from Pool (−)' },
  { value: 'in', label: 'Add to Pool (+)' },
];

/** mountainbakesProduction.html screen 07's own "Adjustment" action — an authorised, signed correction. */
export function ProductionStockAdjustmentScreen() {
  const theme = useAppTheme();
  const navigation = useNavigation();
  const form = useProductionAdjustmentForm();
  const products = useProducts();
  const stock = useProductionStock();
  const [pickerVisible, setPickerVisible] = useState(false);

  const stockByProductId = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of stock.data?.rows ?? []) map.set(row.productId, row.balance);
    return map;
  }, [stock.data]);

  const handleSelectProduct = (product: Product) => {
    form.setProduct(product);
    setPickerVisible(false);
  };

  const handleSubmit = async () => {
    const ok = await form.submit();
    if (ok && form.result) {
      Alert.alert(
        'Adjustment recorded',
        `Pool balance: ${form.result.before} → ${form.result.after}`,
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    }
  };

  return (
    <Screen>
      <AppHeader title="Adjustment" subtitle="A signed correction, not a balance edit — every change stays in the audit trail." />
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: theme.spacing.lg }} keyboardShouldPersistTaps="handled">
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>PRODUCT</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setPickerVisible(true)}
            style={[styles.productButton, { marginTop: 6, borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
            <Text style={[theme.typography.body, { color: form.product ? theme.colors.text : theme.colors.textSecondary }]} numberOfLines={1}>
              {form.product ? form.product.name : 'Search product…'}
            </Text>
            <Icon name="chevron-down" size={14} color={theme.colors.textSecondary} />
          </Pressable>

          <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.lg }]}>ADJUSTMENT TYPE</Text>
          <View style={[styles.chipsRow, { marginTop: 6 }]}>
            {PRODUCTION_ADJUSTMENT_TYPES.map((type: ProductionAdjustmentType) => {
              const active = type === form.adjustmentType;
              return (
                <Pressable
                  key={type}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => form.setAdjustmentType(type)}
                  style={[
                    styles.chip,
                    { backgroundColor: active ? theme.colors.primary : theme.colors.surface, borderColor: active ? theme.colors.primary : theme.colors.border },
                  ]}>
                  <Text style={[theme.typography.bodySmall, { color: active ? theme.colors.primaryText : theme.colors.text, fontWeight: '600' }]}>
                    {PRODUCTION_ADJUSTMENT_LABELS[type]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.lg }]}>DIRECTION</Text>
          <View style={[styles.chipsRow, { marginTop: 6 }]}>
            {DIRECTION_OPTIONS.map((option) => {
              const active = option.value === form.direction;
              const isRemove = option.value === 'out';
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => form.setDirection(option.value)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active ? (isRemove ? theme.colors.danger : theme.colors.success) : theme.colors.surface,
                      borderColor: active ? (isRemove ? theme.colors.danger : theme.colors.success) : theme.colors.border,
                    },
                  ]}>
                  <Text style={[theme.typography.bodySmall, { color: active ? theme.colors.primaryText : theme.colors.text, fontWeight: '600' }]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.lg }]}>QUANTITY</Text>
          <TextInput
            value={form.qtyInput}
            onChangeText={(text) => form.setQtyInput(text.replace(/[^0-9]/g, ''))}
            placeholder="0"
            placeholderTextColor={theme.colors.textSecondary}
            keyboardType="numeric"
            style={[styles.input, { marginTop: 6, borderColor: theme.colors.border, color: theme.colors.text }]}
          />
          {form.product ? (
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 6 }]}>
              Current pool balance: {stockByProductId.get(form.product.id) ?? 0}
            </Text>
          ) : null}

          <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.lg }]}>REASON (REQUIRED)</Text>
          <TextInput
            value={form.reason}
            onChangeText={form.setReason}
            placeholder="Why is this correction being made?"
            placeholderTextColor={theme.colors.textSecondary}
            multiline
            style={[styles.input, { marginTop: 6, height: 72, paddingTop: 10, borderColor: theme.colors.border, color: theme.colors.text }]}
          />

          <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.md }]}>REMARKS (OPTIONAL)</Text>
          <TextInput
            value={form.remarks}
            onChangeText={form.setRemarks}
            placeholder="Optional note"
            placeholderTextColor={theme.colors.textSecondary}
            style={[styles.input, { marginTop: 6, borderColor: theme.colors.border, color: theme.colors.text }]}
          />

          {form.submitError ? (
            <Text style={[theme.typography.bodySmall, { color: theme.colors.danger, marginTop: theme.spacing.md }]}>{form.submitError}</Text>
          ) : null}
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
          <PrimaryButton label="Record Adjustment" onPress={() => void handleSubmit()} loading={form.isSubmitting} disabled={!form.canSubmit} />
        </View>
      </KeyboardAvoidingView>

      <ProductPickerModal
        visible={pickerVisible}
        products={products.data?.products ?? []}
        stockByProductId={stockByProductId}
        onSelect={handleSelectProduct}
        onClose={() => setPickerVisible(false)}
      />
    </Screen>
  );
}
