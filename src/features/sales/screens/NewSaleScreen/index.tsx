import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useHideTabBarOnFocus } from '@/navigation/tabBar/useTabBarVisibility';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, PrimaryButton, Screen, SecondaryButton } from '@/shared/ui';
import { formatCurrency } from '@/shared/utils';
import type { Product } from '@/api';
import { PaymentMethodPicker, ProductPickerModal, ProductPickerRow } from '../../components';
import { useNewSaleForm } from '../../hooks';
import { styles } from './styles';

export function NewSaleScreen() {
  useHideTabBarOnFocus();
  const theme = useAppTheme();
  const navigation = useNavigation();
  const form = useNewSaleForm();
  const [pickerForKey, setPickerForKey] = useState<string | null>(null);

  const handleSelectProduct = (product: Product) => {
    if (pickerForKey) form.updateLine(pickerForKey, { product });
    setPickerForKey(null);
  };

  const handleSubmit = async () => {
    const ok = await form.submit();
    if (ok) {
      Alert.alert('Sale saved', 'The sale was recorded successfully.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    }
  };

  return (
    <Screen>
      <AppHeader title="New Sale" />
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: theme.spacing.lg }} keyboardShouldPersistTaps="handled">
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>CUSTOMER (OPTIONAL)</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
            <TextInput
              value={form.customerName}
              onChangeText={form.setCustomerName}
              placeholder="Walking Customer"
              placeholderTextColor={theme.colors.textSecondary}
              style={[styles.input, { flex: 1, borderColor: theme.colors.border, color: theme.colors.text }]}
            />
            <TextInput
              value={form.customerPhone}
              onChangeText={form.setCustomerPhone}
              placeholder="Mobile (optional)"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="phone-pad"
              style={[styles.input, { flex: 1, borderColor: theme.colors.border, color: theme.colors.text }]}
            />
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: theme.spacing.lg }}>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>ITEMS</Text>
          </View>
          <View style={{ marginTop: 8 }}>
            {form.lines.map((line) => (
              <ProductPickerRow
                key={line.key}
                product={line.product}
                qty={line.qty}
                discountInput={line.discountInput}
                availableQty={line.product ? form.stockByProductId.get(line.product.id) ?? 0 : null}
                lineAmount={line.amount}
                onPressSelect={() => setPickerForKey(line.key)}
                onIncrement={() => form.updateLine(line.key, { qty: line.qty + 1 })}
                onDecrement={() => form.updateLine(line.key, { qty: Math.max(1, line.qty - 1) })}
                onChangeDiscount={(text) => form.updateLine(line.key, { discountInput: text })}
                onRemove={() => form.removeLine(line.key)}
              />
            ))}
            <SecondaryButton label="+ Add Item" onPress={form.addLine} />
          </View>

          <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.lg }]}>PAYMENT METHOD</Text>
          <View style={{ marginTop: 8 }}>
            <PaymentMethodPicker value={form.paymentMethod} onChange={form.setPaymentMethod} />
          </View>

          {form.paymentMethod === 'cash' ? (
            <View style={{ marginTop: theme.spacing.md }}>
              <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Received Cash</Text>
              <TextInput
                value={form.receivedCash}
                onChangeText={form.setReceivedCash}
                placeholder="0"
                keyboardType="numeric"
                style={[styles.input, { marginTop: 6, borderColor: theme.colors.border, color: theme.colors.text }]}
              />
            </View>
          ) : null}

          {form.insufficientStock ? (
            <View style={{ marginTop: theme.spacing.md, backgroundColor: `${theme.colors.danger}1A`, borderRadius: theme.radii.md, padding: theme.spacing.md }}>
              <Text style={[theme.typography.body, { color: theme.colors.danger, fontWeight: '700' }]}>Insufficient Stock</Text>
              {form.insufficientStock.map((detail) => (
                <Text key={detail.productId} style={[theme.typography.bodySmall, { color: theme.colors.danger, marginTop: 4 }]}>
                  {detail.productName} — Available: {detail.available} / Requested: {detail.requested}
                </Text>
              ))}
            </View>
          ) : form.submitError ? (
            <Text style={[theme.typography.bodySmall, { color: theme.colors.danger, marginTop: theme.spacing.md }]}>{form.submitError}</Text>
          ) : null}
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
          <View style={styles.totalsRow}>
            <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>Subtotal</Text>
            <Text style={[theme.typography.bodySmall, { color: theme.colors.text }]}>{formatCurrency(form.subtotal)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>Discount</Text>
            <Text style={[theme.typography.bodySmall, { color: theme.colors.text }]}>-{formatCurrency(form.discountTotal)}</Text>
          </View>
          <View style={[styles.totalsRow, { marginTop: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: theme.colors.border }]}>
            <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>Grand Total</Text>
            <Text style={[theme.typography.cardTitle, { color: theme.colors.primary }]}>{formatCurrency(form.grandTotal)}</Text>
          </View>
          {form.changeDue != null ? (
            <View style={styles.totalsRow}>
              <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>Change</Text>
              <Text style={[theme.typography.bodySmall, { color: form.changeDue < 0 ? theme.colors.danger : theme.colors.success, fontWeight: '700' }]}>
                {form.changeDue < 0 ? `Short ${formatCurrency(-form.changeDue)}` : formatCurrency(form.changeDue)}
              </Text>
            </View>
          ) : null}
          <View style={{ marginTop: theme.spacing.md }}>
            <PrimaryButton label="Save Sale" onPress={() => void handleSubmit()} loading={form.isSubmitting} disabled={!form.canSubmit} />
          </View>
        </View>
      </KeyboardAvoidingView>

      <ProductPickerModal
        visible={pickerForKey !== null}
        products={form.products}
        stockByProductId={form.stockByProductId}
        onSelect={handleSelectProduct}
        onClose={() => setPickerForKey(null)}
      />
    </Screen>
  );
}
