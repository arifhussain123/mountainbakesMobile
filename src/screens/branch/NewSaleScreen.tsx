import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';

import {
  MBButton,
  MBCard,
  MBEmptyState,
  MBErrorState,
  MBHeader,
  MBIcon,
  MBInput,
  MBMoney,
  MBPressable,
  MBFilterChips,
  MBSearchBar,
  MBSkeletonList,
  MBSyncStatus,
  MBSelect,
  MBModal,
} from '@/components';
import { useCart } from '@/hooks/useCart';
import { useCatalogSettings } from '@/hooks/useCatalogSettings';
import { useCreateSale, type SaleOutcome } from '@/hooks/useCreateSale';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useCategories, useProducts, useStock } from '@/hooks/useCatalog';
import { PAYMENT_METHOD_VALUES } from '@/shared/schemas/order.schemas';
import { stockLevel, type StockLevel } from '@/shared/utils/stock';
import type { Product } from '@/shared/types/product.types';
import { useTheme } from '@/theme/ThemeProvider';
import { formatCurrency, formatQty, parseCurrency, toNumber } from '@/utils/money';
import { cashReturned, lineGross, resolveDiscount } from '@/utils/saleTotals';
import { dataAsOfFrom } from '@/utils/dataAsOf';
import { contentColumn, layout, space } from '@/theme/spacing';
import { radius } from '@/theme/radius';

/**
 * Point of sale — the branch's create action, presented as a modal over the
 * day's register (`SalesScreen`).
 *
 * Optimised for speed: search, tap to add, adjust in the cart, pay. Branch staff
 * run this dozens of times a day, so nothing is behind a submenu.
 *
 * The running total is a PREVIEW. The request carries only product, quantity and
 * discount — the server resolves prices and returns its own snapshot, so a price
 * change mid-sale cannot print a stale rate.
 *
 * ---------------------------------------------------------------------------
 * The outcome is reported on the register, not here
 * ---------------------------------------------------------------------------
 * A finished sale dismisses this modal and hands `SalesList` the write's
 * outcome, which draws the banner. That is not tidiness: the three-outcome rule
 * exists so a cashier can tell a completed sale from a queued one from a refused
 * one, and the screen those three things have consequences on is the register —
 * a queued sale appears there marked as waiting, a refused one does not appear
 * at all. Reporting it on a form that is about to close would put the answer on
 * the one surface that cannot show what follows from it.
 */
/** The catalogue-wide chip. Not a category id, so it can never collide with one. */
const ALL_CATEGORIES = 'all';

export function NewSaleScreen(): React.ReactElement {
  const theme = useTheme();
  const navigation = useNavigation<{
    goBack: () => void;
    navigate: (screen: string, params?: object) => void;
  }>();
  const settings = useCatalogSettings();
  const cart = useCart(settings.tax);

  const [searchInput, setSearchInput] = useState('');
  const search = useDebouncedValue(searchInput.trim(), 300);
  const [showCheckout, setShowCheckout] = useState(false);

  const [categoryId, setCategoryId] = useState(ALL_CATEGORIES);

  const products = useProducts({
    search: search || undefined,
    categoryId: categoryId === ALL_CATEGORIES ? undefined : categoryId,
    isActive: true,
  });

  const categories = useCategories();
  const categoryChips = useMemo(
    () => [
      { key: ALL_CATEGORIES, label: 'All' },
      ...(categories.data ?? []).map(c => ({ key: c.id, label: c.name })),
    ],
    [categories.data],
  );

  /**
   * What is actually on the shelf, for the till.
   *
   * A branch role is scoped server-side, so this sends no branchId, and it reads
   * through the SQLite mirror — the balances are there for a phone that has been
   * offline all shift.
   *
   * **Advisory, never a gate.** The server is the only authority on stock and
   * refuses an overdraw with a 409; blocking the sale here would stop a cashier
   * selling something that is physically in front of them because a balance is
   * stale. What this buys is that the refusal is *foreseeable* at the counter
   * rather than surfacing hours later as a parked row in Sync Center.
   */
  const stock = useStock();

  const availability = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of stock.data?.rows ?? []) map.set(r.productId, toNumber(r.balance));
    return map;
  }, [stock.data]);

  /**
   * `cart.addProduct` rather than `cart`.
   *
   * The setter is stable for the life of the screen; the cart object changes
   * whenever a line does. Depending on the object would make this callback new
   * after every tap, which makes `renderProduct` new, which re-renders every
   * visible product row — on the screen where a cashier taps fastest.
   */
  const addProduct = cart.addProduct;

  const onAdd = useCallback((product: Product) => addProduct(product), [addProduct]);

  const renderProduct = useCallback(
    ({ item }: { item: Product }) => (
      <SaleProductRow
        product={item}
        currencySymbol={settings.currencySymbol}
        /**
         * `undefined` means "not known", which is NOT the same as zero and must
         * never be drawn as "out of stock" — that would stop a cashier selling
         * something they are holding, on a device whose stock has simply never
         * been mirrored.
         */
        available={availability.get(item.id)}
        onAdd={onAdd}
      />
    ),
    [onAdd, settings.currencySymbol, availability],
  );

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader
        onBack={() => navigation.goBack()}
        title="New sale"
        right={<MBSyncStatus />}
        /* The POS is the screen most likely to be used offline for hours, and
           the catalogue behind it is cached. A price that changed on another
           device this morning is invisible here until something asks, so the
           till says how old its prices are. */
        dataAsOf={dataAsOfFrom(products.dataUpdatedAt)}
      />

      <View style={{ paddingHorizontal: theme.layout.screenPad, paddingTop: theme.layout.screenPad }}>
        <MBSearchBar
          value={searchInput}
          onChangeText={setSearchInput}
          /* Name or code. The server searches both (`name.ilike` OR
             `sku.ilike`), and so does the offline mirror, so a cashier reading
             a code off a tray finds the product the same way either way. */
          placeholder="Search name or code"
          searching={searchInput.trim() !== search}
          testID="sale-product-search"
        />
      </View>

      {/*
        The second way to narrow, for the regulars nobody types the name of.
        A horizontal scroller rather than a wrapping block: categories are
        unbounded, and a filter that grows to three lines pushes the products
        themselves off a till screen that already carries a search field and a
        cart bar.
      */}
      {categoryChips.length > 1 ? (
        <MBFilterChips
          options={categoryChips}
          selectedKey={categoryId}
          onSelect={setCategoryId}
          scroll
          testIDPrefix="sale-category"
        />
      ) : null}

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
            /* The catalogue is cached and can be hours old on a phone that has
               been offline through a shift — a price or a new product changed on
               another device is invisible until something asks. The cart is
               untouched by a refetch, so pulling costs nothing mid-sale. */
            refreshControl={
              <RefreshControl
                refreshing={products.isFetching && !products.isPending}
                onRefresh={() => products.refetch()}
                tintColor={theme.colors.primary}
              />
            }
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
            {/* The server recomputes this from the line items with its own tax
                settings; this device is working from cached AppSettings. Marked
                as what it is until the sale comes back confirmed. */}
            <MBMoney
              value={cart.totals.grandTotal}
              symbol={settings.currencySymbol}
              estimate
              testID="cart-total"
            />
          </View>
          <MBButton
            label="Review & pay"
            onPress={() => setShowCheckout(true)}
            testID="review-and-pay"
          />
        </View>
      ) : null}

      <MBModal visible={showCheckout} onRequestClose={() => setShowCheckout(false)}>
        <Checkout
          cart={cart}
          currencySymbol={settings.currencySymbol}
          onCancel={() => setShowCheckout(false)}
          /**
           * Close the checkout, empty the cart, and leave — the register is
           * where the outcome is read. `navigate` rather than `goBack` because
           * the params ARE the message: `goBack` cannot carry one.
           */
          onDone={(outcome, reason) => {
            setShowCheckout(false);
            cart.clear();
            setSearchInput('');
            navigation.navigate('SalesList', { outcome, ...(reason ? { reason } : {}) });
          }}
        />
      </MBModal>
    </View>
  );
}

/**
 * One tappable product in the till's list.
 *
 * Memoised, and at module scope rather than inline in `renderProduct`, because
 * this list re-renders on every keystroke of the search box and every change to
 * the cart. With stable props none of the visible rows re-render at all — the
 * theme still reaches them, because context bypasses `memo`.
 */
/** Availability wording. A word as well as a colour — never colour alone. */
const AVAILABILITY_LABEL: Record<StockLevel, (qty: number) => string> = {
  out: () => 'Out of stock',
  critical: qty => `${formatQty(qty)} left`,
  moderate: qty => `${formatQty(qty)} left`,
  healthy: qty => `${formatQty(qty)} in stock`,
};

const SaleProductRow = React.memo(function SaleProductRowView({
  product,
  currencySymbol,
  available,
  onAdd,
}: {
  product: Product;
  currencySymbol?: string;
  /** Balance on the shelf, or `undefined` when the device has never been told. */
  available?: number;
  onAdd: (product: Product) => void;
}): React.ReactElement {
  const theme = useTheme();
  // Bound here so the caller can pass one stable handler for the whole list.
  const press = useCallback(() => onAdd(product), [onAdd, product]);

  const level = available === undefined ? null : stockLevel(available);
  const availabilityColor: Record<StockLevel, string> = {
    out: theme.colors.danger,
    critical: theme.colors.danger,
    moderate: theme.colors.warning,
    healthy: theme.colors.textMuted,
  };

  return (
    <MBPressable
      onPress={press}
      accessibilityRole="button"
      /* Spoken as one thing: what it is, what it costs, and what is left. A
         cashier using a screen reader should not have to hunt for the third. */
      accessibilityLabel={`Add ${product.name}, ${formatCurrency(product.price, currencySymbol)}${
        level ? `, ${AVAILABILITY_LABEL[level](available ?? 0)}` : ''
      }`}>
      <MBCard>
        <View style={styles.productRow}>
          <View style={styles.productMain}>
            <Text numberOfLines={1} style={[theme.type.bodyStrong, { color: theme.colors.text }]}>
              {product.name}
            </Text>
            <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
              {product.sku}
            </Text>
          </View>

          <View style={styles.productPrice}>
            <MBMoney value={product.price} symbol={currencySymbol} />
            {/*
              Nothing at all when the balance is unknown. Drawing "0" or "Out of
              stock" for a device that has simply never mirrored stock would stop
              a cashier selling what is physically in front of them — the one
              failure this must not have. Stock is advisory here either way: the
              server is the only authority and refuses an overdraw with a 409.
            */}
            {level ? (
              <Text style={[theme.type.caption, { color: availabilityColor[level] }]}>
                {AVAILABILITY_LABEL[level](available ?? 0)}
              </Text>
            ) : null}
          </View>
        </View>
      </MBCard>
    </MBPressable>
  );
});

function Checkout({
  cart,
  currencySymbol,
  onCancel,
  onDone,
}: {
  cart: ReturnType<typeof useCart>;
  currencySymbol?: string;
  onCancel: () => void;
  onDone: (outcome: SaleOutcome, reason?: string) => void;
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
      onDone(result.outcome, result.reason);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not record the sale.');
    }
  };

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader title="Review & pay" onBack={onCancel} />
      <ScrollView
        contentContainerStyle={[
          contentColumn,
          { padding: theme.layout.screenPad, gap: theme.space.lg },
        ]}
        keyboardShouldPersistTaps="handled">
        {cart.lines.map(line => (
          <MBCard key={line.productId}>
            <View style={styles.productRow}>
              <Text style={[theme.type.bodyStrong, styles.flex, { color: theme.colors.text }]}>
                {line.productName}
              </Text>
              <MBMoney
                value={line.unitPrice}
                size="sm"
                color={theme.colors.textMuted}
                symbol={currencySymbol}
              />
            </View>

            <View style={styles.lineControls}>
              <View style={styles.stepper}>
                <MBPressable
                  onPress={() => cart.setQty(line.productId, line.qty - 1)}
                  accessibilityRole="button"
                  accessibilityLabel={`Decrease ${line.productName}`}
                  style={[styles.stepButton, { borderColor: theme.colors.border }]}>
                  <MBIcon name="remove" size="action" color={theme.colors.text} />
                </MBPressable>
                <Text style={[theme.type.money, { color: theme.colors.text }]}>{line.qty}</Text>
                <MBPressable
                  onPress={() => cart.setQty(line.productId, line.qty + 1)}
                  accessibilityRole="button"
                  accessibilityLabel={`Increase ${line.productName}`}
                  style={[styles.stepButton, { borderColor: theme.colors.border }]}>
                  <MBIcon name="add" size="action" color={theme.colors.text} />
                </MBPressable>
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
            <TotalRow label="Discount" value={-cart.totals.discountTotal} symbol={currencySymbol} />
          ) : null}
          {cart.totals.taxAmount > 0 ? (
            <TotalRow
              label="Government Tax"
              value={cart.totals.taxAmount}
              symbol={currencySymbol}
            />
          ) : null}
          <TotalRow
            label="Grand Total"
            value={cart.totals.grandTotal}
            symbol={currencySymbol}
            strong
          />
          <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
            Final amounts are confirmed by the server.
          </Text>
        </MBCard>

        {/* Four branch methods. 'staff' is production-counter only. */}
        <MBSelect
          label="Payment method"
          options={PAYMENT_METHOD_VALUES}
          value={paymentMethod}
          onChange={setPaymentMethod}
          testIDPrefix="payment"
        />

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
      <Text
        style={[strong ? theme.type.bodyStrong : theme.type.body, { color: theme.colors.text }]}>
        {label}
      </Text>
      <MBMoney value={value} size={strong ? 'md' : 'sm'} symbol={symbol} />
    </View>
  );
}

/** Module scope: a separator defined during render remounts the list each pass. */
function ListSeparator(): React.ReactElement {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  productPrice: { alignItems: 'flex-end', gap: space.hair },
  flex: { flex: 1 },
  // ...contentColumn caps the measure on a tablet. A list row is a label at
  // one edge and a value at the other; unconstrained on a 10" screen the two
  // end up a hand-span apart with nothing between them.
  listContent: { ...contentColumn, paddingHorizontal: space.lg, paddingBottom: space.xxl },
  separator: { height: 8 },
  productRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  productMain: { flex: 1, gap: space.hair },
  cartBar: {
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  cartSummary: { flex: 1, gap: space.hair },
  lineControls: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space.md,
    marginTop: space.md,
  },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  stepButton: {
    width: layout.stepperSize,
    height: layout.stepperSize,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: space.md,
    paddingVertical: space.hair,
  },
  group: { gap: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    height: 40,
    paddingHorizontal: space.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
