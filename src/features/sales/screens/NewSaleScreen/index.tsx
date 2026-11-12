import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { format } from 'date-fns';
import { useHideTabBarOnFocus } from '@/navigation/tabBar';
import { useAppTheme } from '@/shared/theme';
import { Card, InfoBanner, PrimaryButton, Screen, TextField } from '@/shared/ui';
import { formatCurrency } from '@/shared/utils';
import { useAuthStore } from '@/state';
import type { Product } from '@/api';
import { Eyebrow, FLAT_CARD, PaymentMethodPicker, ProductPickerModal, ProductPickerRow, RoundIconButton, SmallButton, TYPE } from '../../components';
import { useNewSaleForm } from '../../hooks';
import { styles } from './styles';

/** Redesign `10 New Sale` — a full-screen POS form; the per-item discount lives on each line. */
export function NewSaleScreen() {
  useHideTabBarOnFocus();
  const theme = useAppTheme();
  const navigation = useNavigation();
  const form = useNewSaleForm();
  const branchName = useAuthStore((state) => state.user?.branchName ?? null);
  const [pickerForKey, setPickerForKey] = useState<string | null>(null);
  const openedAt = useMemo(() => format(new Date(), 'HH:mm'), []);

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
      <View style={styles.appBar}>
        <RoundIconButton icon="chevron-left" onPress={() => navigation.goBack()} accessibilityLabel="Back" />
        <View style={styles.appBarText}>
          <Text accessibilityRole="header" style={[TYPE.h2, { color: theme.colors.text }]}>
            New sale
          </Text>
          <Text style={[TYPE.xs, { color: theme.colors.textFaint }]} numberOfLines={1}>
            {branchName ? `${openedAt} · ${branchName}` : openedAt}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View>
            <Eyebrow>Customer (optional)</Eyebrow>
            <View style={styles.grid2}>
              <View style={styles.cell}>
                <TextField label="Name" value={form.customerName} onChangeText={form.setCustomerName} placeholder="Walking Customer" />
              </View>
              <View style={styles.cell}>
                <TextField
                  label="Mobile"
                  value={form.customerPhone}
                  onChangeText={form.setCustomerPhone}
                  placeholder="03xx xxxxxxx"
                  keyboardType="phone-pad"
                />
              </View>
            </View>
          </View>

          <View>
            <View style={styles.between}>
              <Eyebrow>Items</Eyebrow>
              {/* In the header, as on the web: a new line appears directly under it, never off-screen below a long list. */}
              <SmallButton kind="soft" icon="plus" label="Add item" onPress={form.addLine} />
            </View>
            <View style={styles.items}>
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
            </View>
          </View>

          <View style={styles.section}>
            <Eyebrow>Payment method</Eyebrow>
            <PaymentMethodPicker value={form.paymentMethod} onChange={form.setPaymentMethod} />
            {form.paymentMethod === 'cash' ? (
              <TextField label="Received cash" value={form.receivedCash} onChangeText={form.setReceivedCash} placeholder="0" keyboardType="numeric" />
            ) : null}
          </View>

          {form.insufficientStock ? (
            <InfoBanner kind="bad">
              <Text style={[styles.bannerTitle, { color: theme.colors.danger }]}>Insufficient Stock</Text>
              {form.insufficientStock.map((detail) => (
                <Text key={detail.productId} style={[TYPE.sm, { color: theme.colors.danger, marginTop: 2 }]}>
                  {detail.productName} — Available: {detail.available} / Requested: {detail.requested}
                </Text>
              ))}
            </InfoBanner>
          ) : form.submitError ? (
            <InfoBanner kind="bad">{form.submitError}</InfoBanner>
          ) : null}

          <Card style={[FLAT_CARD, styles.sum]}>
            <SumRow label="Subtotal" value={formatCurrency(form.subtotal)} />
            <SumRow label="Discount" value={form.discountTotal > 0 ? `− ${formatCurrency(form.discountTotal)}` : formatCurrency(0)} />
            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
            <View style={styles.between}>
              <Text style={[styles.grandLabel, { color: theme.colors.text }]}>Grand total</Text>
              <Text style={[styles.grandValue, { color: theme.colors.text }]}>{formatCurrency(form.grandTotal)}</Text>
            </View>
            {form.changeDue != null ? (
              <SumRow
                label={form.changeDue < 0 ? 'Cash short' : 'Cash returned'}
                value={formatCurrency(Math.abs(form.changeDue))}
                valueColor={form.changeDue < 0 ? theme.colors.danger : theme.colors.success}
              />
            ) : null}
          </Card>
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
          <PrimaryButton label="Save Sale" onPress={() => void handleSubmit()} loading={form.isSubmitting} disabled={!form.canSubmit} />
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

function SumRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.between}>
      <Text style={[styles.sumLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.sumValue, { color: valueColor ?? theme.colors.text }]}>{value}</Text>
    </View>
  );
}
