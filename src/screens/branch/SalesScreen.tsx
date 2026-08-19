import React, { useCallback, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';

import {
  MBButton,
  MBCard,
  MBEmptyState,
  MBErrorState,
  MBHeader,
  MBInput,
  MBSearchBar,
  MBSkeletonList,
  MBSyncStatus,
} from '@/components';
import { useCart } from '@/hooks/useCart';
import { useCatalogSettings } from '@/hooks/useCatalogSettings';
import { useCreateSale } from '@/hooks/useCreateSale';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useProducts } from '@/hooks/useCatalog';
import { PAYMENT_METHOD_VALUES } from '@/shared/schemas/order.schemas';
import type { Product } from '@/shared/types/product.types';
import { useTheme } from '@/theme/ThemeProvider';
import { formatCurrency, parseCurrency } from '@/utils/money';
import { cashReturned, lineGross, resolveDiscount } from '@/utils/saleTotals';

/**
 * Point of sale.
 *
 * Optimised for speed: search, tap to add, adjust in the cart, pay. Branch staff
 * run this dozens of times a day, so nothing is behind a submenu.
 *
 * The running total is a PREVIEW. The request carries only product, quantity and
 * discount — the server resolves prices and returns its own snapshot, so a price
 * change mid-sale cannot print a stale rate.
 */
export function SalesScreen(): React.ReactElement {
  const theme = useTheme();
  const settings = useCatalogSettings();
  const cart = useCart(settings.tax);

  const [searchInput, setSearchInput] = useState('');
  const search = useDebouncedValue(searchInput.trim(), 300);
  const [showCheckout, setShowCheckout] = useState(false);
  const [banner, setBanner] = useState<{ tone: 'ok' | 'queued'; text: string } | null>(null);

  const products = useProducts({ search: search || undefined, isActive: true });

  const onAdd = useCallback(
    (product: Product) => {
      cart.addProduct(product);
      setBanner(null);
    },
    [cart],
  );

  const renderProduct = useCallback(
    ({ item }: { item: Product }) => (
      <Pressable onPress={() => onAdd(item)} accessibilityRole="button">
        <MBCard accessibilityLabel={`Add ${item.name}`}>
          <View style={styles.productRow}>
            <View style={styles.productMain}>
              <Text numberOfLines={1} style={[theme.type.bodyStrong, { color: theme.colors.text }]}>
                {item.name}
              </Text>
              <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
                {item.sku}
              </Text>
            </View>
            <Text style={[theme.type.money, { color: theme.colors.text }]}>
              {formatCurrency(item.price, settings.currencySymbol)}
            </Text>
          </View>
        </MBCard>
      </Pressable>
    ),
    [onAdd, theme, settings.currencySymbol],
  );

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader title="New sale" right={<MBSyncStatus />} />

      {banner ? (
        <Pressable onPress={() => setBanner(null)}>
          <View
            style={[
              styles.banner,
              {
                marginHorizontal: theme.layout.screenPad,
                borderRadius: theme.radius.md,
                backgroundColor:
                  banner.tone === 'ok' ? theme.colors.successBg : theme.colors.warningBg,
              },
            ]}>
            <Text
              accessibilityRole="alert"
              style={[
                theme.type.label,
                { color: banner.tone === 'ok' ? theme.colors.success : theme.colors.warning },
              ]}>
              {banner.text}
            </Text>
          </View>
        </Pressable>
      ) : null}

      <View style={{ padding: theme.layout.screenPad }}>
        <MBSearchBar
          value={searchInput}
          onChangeText={setSearchInput}
          placeholder="Search product to add"
          searching={searchInput.trim() !== search}
          testID="sale-product-search"
        />
      </View>

      <View style={styles.flex}>
        {products.isPending ? (
          <MBSkeletonList rows={6} />
        ) : products.isError ? (
          <MBErrorState error={products.error} onRetry={() => products.refetch()} />
        ) : (products.data ?? []).length === 0 ? (
          <MBEmptyState title="No products match" message="Try a different name or code." />
        ) : (
          <FlashList
            data={products.data ?? []}
            renderItem={renderProduct}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={ListSeparator}
            keyboardShouldPersistTaps="handled"
          />
        )}
      </View>

      {!cart.isEmpty ? (
        <View
          style={[
            styles.cartBar,
            {
              backgroundColor: theme.colors.surface,
              borderTopColor: theme.colors.border,
              padding: theme.layout.screenPad,
            },
          ]}>
          <View style={styles.cartSummary}>
            <Text style={[theme.type.label, { color: theme.colors.textMuted }]}>
              {cart.itemCount} {cart.itemCount === 1 ? 'item' : 'items'}
            </Text>
            <Text style={[theme.type.money, { color: theme.colors.text }]}>
              {formatCurrency(cart.totals.grandTotal, settings.currencySymbol)}
            </Text>
          </View>
          <MBButton
            label="Review & pay"
            onPress={() => setShowCheckout(true)}
            testID="review-and-pay"
          />
        </View>
      ) : null}

      <Modal
        visible={showCheckout}
        animationType="slide"
        onRequestClose={() => setShowCheckout(false)}>
        <Checkout
          cart={cart}
          currencySymbol={settings.currencySymbol}
          onCancel={() => setShowCheckout(false)}
          onDone={outcome => {
            setShowCheckout(false);
            cart.clear();
            setSearchInput('');
            setBanner(
              outcome === 'synced'
                ? { tone: 'ok', text: 'Sale completed.' }
                : {
                    tone: 'queued',
                    text: 'Saved offline — it will sync automatically when you reconnect.',
                  },
            );
          }}
        />
      </Modal>
    </View>
  );
}

function Checkout({
  cart,
  currencySymbol,
  onCancel,
  onDone,
}: {
  cart: ReturnType<typeof useCart>;
  currencySymbol?: string;
  onCancel: () => void;
  onDone: (outcome: 'synced' | 'queued') => void;
}): React.ReactElement {
  const theme = useTheme();
  const { createSale, isSaving } = useCreateSale();

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] =
    useState<(typeof PAYMENT_METHOD_VALUES)[number]>('cash');
  const [receivedCashText, setReceivedCashText] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const receivedCash = parseCurrency(receivedCashText);
  const isCash = paymentMethod === 'cash';
  const change = cashReturned(receivedCash, cart.totals.grandTotal);
  const shortOnCash = isCash && receivedCashText.trim() !== '' && change < 0;

  const onConfirm = async () => {
    setError(null);
    if (shortOnCash) {
      setError('The cash received does not cover the total.');
      return;
    }

    try {
      const result = await createSale({
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        items: cart.toOrderItems(),
        paymentMethod,
        // Only meaningful for cash; the server validates it covers the total.
        ...(isCash && receivedCashText.trim() ? { receivedCash } : {}),
        notes: notes.trim(),
      });
      onDone(result.outcome);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not record the sale.');
    }
  };

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader title="Review & pay" onBack={onCancel} />
      <ScrollView
        contentContainerStyle={{ padding: theme.layout.screenPad, gap: theme.space.lg }}
        keyboardShouldPersistTaps="handled">
        {cart.lines.map(line => (
          <MBCard key={line.productId}>
            <View style={styles.productRow}>
              <Text style={[theme.type.bodyStrong, styles.flex, { color: theme.colors.text }]}>
                {line.productName}
              </Text>
              <Text style={[theme.type.mono, { color: theme.colors.textMuted }]}>
                {formatCurrency(line.unitPrice, currencySymbol)}
              </Text>
            </View>

            <View style={styles.lineControls}>
              <View style={styles.stepper}>
                <Pressable
                  onPress={() => cart.setQty(line.productId, line.qty - 1)}
                  accessibilityRole="button"
                  accessibilityLabel={`Decrease ${line.productName}`}
                  style={[styles.stepButton, { borderColor: theme.colors.border }]}>
                  <Text style={[theme.type.h3, { color: theme.colors.text }]}>−</Text>
                </Pressable>
                <Text style={[theme.type.money, { color: theme.colors.text }]}>{line.qty}</Text>
                <Pressable
                  onPress={() => cart.setQty(line.productId, line.qty + 1)}
                  accessibilityRole="button"
                  accessibilityLabel={`Increase ${line.productName}`}
                  style={[styles.stepButton, { borderColor: theme.colors.border }]}>
                  <Text style={[theme.type.h3, { color: theme.colors.text }]}>+</Text>
                </Pressable>
              </View>

              <MBInput
                label="Discount"
                numeric
                containerStyle={styles.flex}
                defaultValue=""
                keyboardType="default"
                // Accepts "10%" or a flat amount; only the resolved rupee figure
                // is stored, because the server's schema knows only numbers.
                hint="e.g. 50 or 10%"
                onChangeText={text =>
                  cart.setDiscount(line.productId, resolveDiscount(text, lineGross(line)))
                }
              />
            </View>
          </MBCard>
        ))}

        <MBCard>
          <TotalRow label="Subtotal" value={cart.totals.grossSubtotal} symbol={currencySymbol} />
          {cart.totals.discountTotal > 0 ? (
            <TotalRow
              label="Discount"
              value={-cart.totals.discountTotal}
              symbol={currencySymbol}
            />
          ) : null}
          {cart.totals.taxAmount > 0 ? (
            <TotalRow label="Government Tax" value={cart.totals.taxAmount} symbol={currencySymbol} />
          ) : null}
          <TotalRow label="Grand Total" value={cart.totals.grandTotal} symbol={currencySymbol} strong />
          <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
            Final amounts are confirmed by the server.
          </Text>
        </MBCard>

        <View style={styles.group}>
          <Text style={[theme.type.label, { color: theme.colors.textMuted }]}>Payment method</Text>
          <View style={styles.chips}>
            {/* Four branch methods. 'staff' is production-counter only. */}
            {PAYMENT_METHOD_VALUES.map(option => {
              const selected = option === paymentMethod;
              return (
                <Pressable
                  key={option}
                  onPress={() => setPaymentMethod(option)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={[
                    styles.chip,
                    {
                      borderRadius: theme.radius.pill,
                      backgroundColor: selected ? theme.colors.primary : theme.colors.surface,
                      borderColor: selected ? theme.colors.primary : theme.colors.border,
                    },
                  ]}>
                  <Text
                    style={[
                      theme.type.label,
                      { color: selected ? theme.colors.onPrimary : theme.colors.text },
                    ]}>
                    {option}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {isCash ? (
          <>
            <MBInput
              label="Cash received"
              numeric
              keyboardType="decimal-pad"
              value={receivedCashText}
              onChangeText={setReceivedCashText}
              error={shortOnCash ? 'Less than the grand total' : undefined}
              editable={!isSaving}
            />
            {receivedCashText.trim() && change >= 0 ? (
              <TotalRow label="Change" value={change} symbol={currencySymbol} />
            ) : null}
          </>
        ) : null}

        <MBInput
          label="Customer name"
          value={customerName}
          onChangeText={setCustomerName}
          editable={!isSaving}
        />
        <MBInput
          label="Mobile number"
          value={customerPhone}
          onChangeText={setCustomerPhone}
          keyboardType="phone-pad"
          editable={!isSaving}
        />
        <MBInput label="Notes" value={notes} onChangeText={setNotes} editable={!isSaving} />

        {error ? (
          <Text accessibilityRole="alert" style={[theme.type.body, { color: theme.colors.danger }]}>
            {error}
          </Text>
        ) : null}

        <MBButton
          label="Confirm sale"
          onPress={onConfirm}
          loading={isSaving}
          disabled={cart.isEmpty}
          fullWidth
          testID="confirm-sale"
        />
      </ScrollView>
    </View>
  );
}

function TotalRow({
  label,
  value,
  symbol,
  strong = false,
}: {
  label: string;
  value: number;
  symbol?: string;
  strong?: boolean;
}): React.ReactElement {
  const theme = useTheme();
  return (
    <View style={styles.totalRow}>
      <Text style={[strong ? theme.type.bodyStrong : theme.type.body, { color: theme.colors.text }]}>
        {label}
      </Text>
      <Text style={[strong ? theme.type.money : theme.type.body, { color: theme.colors.text }]}>
        {formatCurrency(value, symbol)}
      </Text>
    </View>
  );
}

/** Module scope: a separator defined during render remounts the list each pass. */
function ListSeparator(): React.ReactElement {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  banner: { padding: 12 },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  separator: { height: 8 },
  productRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  productMain: { flex: 1, gap: 2 },
  cartBar: { borderTopWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  cartSummary: { flex: 1, gap: 2 },
  lineControls: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginTop: 12 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 3 },
  group: { gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    height: 40,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
