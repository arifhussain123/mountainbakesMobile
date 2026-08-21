import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';

import {
  MBButton,
  MBCard,
  MBDataRow,
  MBEmptyState,
  MBErrorState,
  MBHeader,
  MBIcon,
  MBInput,
  MBModal,
  MBPressable,
  MBSearchBar,
  MBSkeletonList,
  MBSyncStatus,
  MBWriteOutcome,
  writeOutcomeCopy,
} from '@/components';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useProducts } from '@/hooks/useCatalog';
import { useCreateProductionOrder } from '@/hooks/useCreateProductionOrder';
import type { Product } from '@/shared/types/product.types';
import { businessDateStr } from '@/shared/utils/timezone';
import { formatQty } from '@/utils/money';
import { useTheme } from '@/theme/ThemeProvider';
import type { WriteOutcomeCopy, WriteSubject } from '@/components';
import { dataAsOfFrom } from '@/utils/dataAsOf';
import { contentColumn, layout, space } from '@/theme/spacing';
import { radius } from '@/theme/radius';
import { useOrderWindow } from '@/hooks/useOrderWindow';
import { useAuthStore } from '@/store/authStore';

/**
 * New production order — a branch's demand on central production.
 *
 * Two things the server insists on, both reflected here:
 *
 * - `requiredDate` is REQUIRED. A demand with no delivery date is exactly what
 *   the field exists to prevent, and the server will not default it: doing so
 *   would file a made-up commitment under the branch's name.
 * - `branchId` is NEVER sent. It is derived from the auth token server-side.
 *
 * Special (one-off, free-text) items and packing materials are part of the
 * schema but not built here yet — see the note at the bottom of the screen.
 */
/** One picked product: what it is, how many, and any note for Production. */
interface OrderLine {
  productId: string;
  name: string;
  qty: number;
  remark: string;
}

export function NewOrderScreen(): React.ReactElement {
  const theme = useTheme();
  const { createProductionOrder, isSaving } = useCreateProductionOrder();

  const [searchInput, setSearchInput] = useState('');
  const search = useDebouncedValue(searchInput.trim(), 300);
  /**
   * The basket, keyed by product.
   *
   * It carries the **name** as well as the quantity, and that is load-bearing
   * rather than convenient: the product list is filtered by a debounced
   * server-side search, so a branch that picks two rusks and then searches
   * "cake" no longer has the rusks in `products.data` at all. A review built
   * from the visible list would silently omit them. Selection captures what the
   * review needs at the moment it happens.
   *
   * Remarks live here too, per line, because the schema puts them there:
   * `ProductionOrderItemSchema.remarks` is on the item and there is no
   * order-level field. One shared box used to stamp its text onto every line, so
   * a note meant for one product ("thin icing") was submitted as an instruction
   * about all eight — asserting to Production something the branch never said.
   */
  const [lines, setLines] = useState<Record<string, OrderLine>>({});
  const [requiredDate, setRequiredDate] = useState(tomorrow());
  const [showReview, setShowReview] = useState(false);
  const orderWindow = useOrderWindow();
  // Read-only. `branchId` is never sent — the server derives it from the token —
  // but the person placing the order should see which shop it is filed under.
  const branchName = useAuthStore(s => s.claims?.branchName);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<WriteOutcomeCopy | null>(null);

  const products = useProducts({ search: search || undefined, isActive: true });

  const selected = useMemo(
    () => Object.values(lines).filter(line => line.qty > 0),
    [lines],
  );

  const setRemark = useCallback((productId: string, text: string) => {
    setLines(current => {
      const line = current[productId];
      return line ? { ...current, [productId]: { ...line, remark: text } } : current;
    });
  }, []);

  /**
   * Takes the id and the name rather than a `Product`, because the review edits
   * quantities too and by then the product is gone: its row may be filtered out
   * of `products.data` by the search, and an `OrderLine` is all that is left. A
   * cast back to `Product` there would be a lie about a value that only ever has
   * two of its fields.
   *
   * A quantity of zero removes the line — and with it any remark, which would
   * otherwise be resurrected by re-adding the product later.
   */
  const setQtyFor = useCallback((productId: string, name: string, qty: number) => {
    setLines(current => {
      if (qty <= 0) {
        const rest = { ...current };
        delete rest[productId];
        return rest;
      }
      const line = current[productId];
      return {
        ...current,
        [productId]: { productId, name, qty, remark: line?.remark ?? '' },
      };
    });
  }, []);

  /** The list's view of it: the whole product, so the name is captured at selection. */
  const setQty = useCallback(
    (product: Product, qty: number) => setQtyFor(product.id, product.name, qty),
    [setQtyFor],
  );

  const onSubmit = async () => {
    setError(null);

    if (selected.length === 0) {
      setError('Add at least one product.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(requiredDate)) {
      setError('Enter the required date as YYYY-MM-DD.');
      return;
    }
    // Checked against the user's own clock only. The server deliberately does
    // NOT re-check it: ordinary clock skew at the day boundary would otherwise
    // reject a legitimate demand.
    if (requiredDate < businessDateStr()) {
      setError('The required date cannot be in the past.');
      return;
    }
    /*
     * The order window, checked before anything is written.
     *
     * The server refuses a late demand either way, but this write is
     * offline-first: without the check, an order composed at 03:00 with no
     * signal is queued, drained hours later, refused, and parked as a failed
     * row — the branch believes it ordered, production never sees it, and the
     * only trace is a Sync Center entry someone has to notice.
     *
     * Not blocked while settings are still loading: guessing the window would
     * refuse a legitimate order on a slow connection, and the server is still
     * the authority.
     */
    if (!orderWindow.isLoading && !orderWindow.isOpen) {
      setError(
        `Orders can be placed between ${orderWindow.opensAt} and ${orderWindow.closesAt}. ` +
          `It is ${orderWindow.nowAt} now.`,
      );
      return;
    }

    try {
      const result = await createProductionOrder({
        items: selected.map(line => ({
          productId: line.productId,
          qty: line.qty,
          remarks: line.remark.trim(),
        })),
        requiredDate,
      });

      setLines({});
      setShowReview(false);
      setBanner(writeOutcomeCopy(result.outcome, ORDER_SUBJECT, result.reason));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit the order.');
    }
  };

  /**
   * `setQty` is passed whole rather than wrapped per row.
   *
   * A `qty => setQty(item.id, qty)` closure is a new function for every row on
   * every render, which defeats `ProductQtyRow`'s memoisation entirely: one
   * stepper tap changes `quantities`, and all ~200 visible-and-recycled rows
   * re-render because their `onChange` differs. Handing over the stable setter
   * means only the row whose `qty` actually moved re-renders.
   */
  const renderProduct = useCallback(
    ({ item }: { item: Product }) => (
      <ProductQtyRow product={item} qty={lines[item.id]?.qty ?? 0} onChange={setQty} />
    ),
    [lines, setQty],
  );

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader
        tone="brand"
        title="New order"
        subtitle="Demand on production"
        right={<MBSyncStatus />}
        dataAsOf={dataAsOfFrom(products.dataUpdatedAt)}
      />

      {banner ? (
        // Tapping the banner dismisses it. Without a role that affordance is
        // invisible to a screen reader, which otherwise reads the message and
        // gives no way to clear it. The label stays unset on purpose: the
        // banner text is the announcement, and a label here would replace it.
        <MBPressable
          onPress={() => setBanner(null)}
          accessibilityRole="button"
          accessibilityHint="Dismisses this message"
          // A full-width band pulling in at its edges reads as the message
          // shrinking rather than as a control answering a touch.
          feedback="opacity">
          <View style={{ marginHorizontal: theme.layout.screenPad }}>
            <MBWriteOutcome copy={banner} />
          </View>
        </MBPressable>
      ) : null}

      <View style={{ padding: theme.layout.screenPad, gap: theme.space.md }}>
        {/*
          Branch and the order window, stated rather than asked.
          `branchId` is never sent — the server derives it from the token — but
          the person filing a demand should see whose name it goes under, and the
          window is the rule their submit will be judged against, so it is worth
          knowing before they build a basket rather than after.
        */}
        <View style={styles.context}>
          <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
            {branchName ? `Ordering for ${branchName}` : 'Ordering for your branch'}
          </Text>
          {orderWindow.isLoading ? null : (
            <Text
              style={[
                theme.type.caption,
                { color: orderWindow.isOpen ? theme.colors.textMuted : theme.colors.offline },
              ]}>
              {orderWindow.isOpen
                ? `Orders open until ${orderWindow.closesAt} · ${orderWindow.nowAt} now`
                : `Orders closed · open ${orderWindow.opensAt}–${orderWindow.closesAt} · ${orderWindow.nowAt} now`}
            </Text>
          )}
        </View>

        <MBInput
          label="Required by"
          required
          value={requiredDate}
          onChangeText={setRequiredDate}
          placeholder="YYYY-MM-DD"
          autoCapitalize="none"
          hint="The date this delivery is needed"
          editable={!isSaving}
        />
        <MBSearchBar
          value={searchInput}
          onChangeText={setSearchInput}
          placeholder="Search product"
          searching={searchInput.trim() !== search}
          testID="order-product-search"
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

      <View
        style={[
          styles.footer,
          {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.border,
            padding: theme.layout.screenPad,
          },
        ]}>
        {/*
          Shown here only while the review is closed. The review has a footer of
          its own and a submit failure raises the message there, where the press
          happened; rendering it in both puts the same alert in the tree twice
          and a screen reader reads it twice. It stays behind after Back on
          purpose — every message this can carry except the window is about the
          required-by date, and that field is on this screen, not the review.
        */}
        {error && !showReview ? (
          <Text
            accessibilityRole="alert"
            style={[theme.type.caption, { color: theme.colors.danger }]}>
            {error}
          </Text>
        ) : null}
        <Text style={[theme.type.label, { color: theme.colors.textMuted }]}>
          {selected.length} {selected.length === 1 ? 'product' : 'products'} selected
        </Text>
        {/*
          Review, not submit.

          The quantities are scattered through a list that is hundreds of rows
          long and filtered by a search box, so a branch that searched "rusk",
          set three quantities, then searched "cake" and set two more had no way
          to see the demand it was about to commit. This write is offline-first
          and goes to central production: it is exactly the kind that must not be
          sent blind. Same shape as the till's "Review & pay".
        */}
        <MBButton
          label="Review order"
          onPress={() => setShowReview(true)}
          disabled={selected.length === 0}
          fullWidth
          testID="review-order"
        />
      </View>

      <MBModal
        visible={showReview}
        onRequestClose={() => setShowReview(false)}
        testID="order-review">
        <OrderReview
          lines={selected}
          requiredDate={requiredDate}
          branchName={branchName}
          isSaving={isSaving}
          error={error}
          onQty={setQtyFor}
          onRemark={setRemark}
          onBack={() => setShowReview(false)}
          onSubmit={onSubmit}
        />
      </MBModal>
    </View>
  );
}

/**
 * The review, and the last thing between a branch and a commitment.
 *
 * The spec's flow is Select → Quantity → Remarks → Review → Submit. Quantity is
 * set in the list because that is where the products are; everything else
 * happens here, so the branch reads back exactly what it is asking Production
 * to make before it asks. Nothing is recomputed on this screen — these are the
 * lines that will be sent, which is the only thing a review is worth showing.
 *
 * Quantities stay editable. A review that can only be accepted or abandoned
 * sends people back to hunt for a product in a filtered list to change a single
 * number, and the fastest correction is the one you can make where you noticed
 * the mistake.
 */
function OrderReview({
  lines,
  requiredDate,
  branchName,
  isSaving,
  error,
  onQty,
  onRemark,
  onBack,
  onSubmit,
}: {
  lines: readonly OrderLine[];
  requiredDate: string;
  branchName?: string | null;
  isSaving: boolean;
  error: string | null;
  onQty: (productId: string, name: string, qty: number) => void;
  onRemark: (productId: string, text: string) => void;
  onBack: () => void;
  onSubmit: () => void;
}): React.ReactElement {
  const theme = useTheme();
  const totalUnits = lines.reduce((n, line) => n + line.qty, 0);

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader title="Review order" subtitle="Check before submitting" onBack={onBack} />

      <ScrollView
        contentContainerStyle={[
          contentColumn,
          { padding: theme.layout.screenPad, gap: theme.space.md },
        ]}
        keyboardShouldPersistTaps="handled">
        <MBCard>
          <MBDataRow label="For" value={branchName ?? 'Your branch'} />
          <MBDataRow label="Required by" value={requiredDate} />
          <MBDataRow label="Products" value={String(lines.length)} />
          <MBDataRow label="Total units" value={formatQty(totalUnits)} />
        </MBCard>

        {lines.map(line => (
          <MBCard key={line.productId}>
            <View style={styles.reviewLine}>
              <Text
                numberOfLines={2}
                style={[theme.type.bodyStrong, styles.flex, { color: theme.colors.text }]}>
                {line.name}
              </Text>
              <Text style={[theme.type.money, { color: theme.colors.text }]}>
                {formatQty(line.qty)}
              </Text>
            </View>

            <View style={styles.reviewControls}>
              <MBPressable
                onPress={() => onQty(line.productId, line.name, line.qty - 1)}
                accessibilityRole="button"
                accessibilityLabel={`Decrease ${line.name}`}
                style={[styles.stepButton, { borderColor: theme.colors.border }]}>
                <MBIcon name="remove" size="action" color={theme.colors.text} />
              </MBPressable>
              <MBPressable
                onPress={() => onQty(line.productId, line.name, line.qty + 1)}
                accessibilityRole="button"
                accessibilityLabel={`Increase ${line.name}`}
                style={[styles.stepButton, { borderColor: theme.colors.border }]}>
                <MBIcon name="add" size="action" color={theme.colors.text} />
              </MBPressable>

              {/* Per line, matching the schema. Optional: most lines need none,
                  and an empty string is what the server defaults to anyway. */}
              <MBInput
                label="Note for Production"
                containerStyle={styles.flex}
                value={line.remark}
                onChangeText={text => onRemark(line.productId, text)}
                editable={!isSaving}
                testID={`remark-${line.productId}`}
              />
            </View>
          </MBCard>
        ))}
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.border,
            padding: theme.layout.screenPad,
          },
        ]}>
        {error ? (
          <Text
            accessibilityRole="alert"
            style={[theme.type.caption, { color: theme.colors.danger }]}>
            {error}
          </Text>
        ) : null}
        <MBButton
          label="Submit order"
          onPress={onSubmit}
          loading={isSaving}
          disabled={lines.length === 0}
          fullWidth
          testID="submit-order"
        />
      </View>
    </View>
  );
}

/**
 * One product with its quantity stepper.
 *
 * Memoised: the list re-renders on every keystroke and every stepper tap, and
 * with a stable `onChange` the only row that actually re-renders is the one
 * whose quantity changed. Theme changes still reach it — context bypasses
 * `memo`.
 */
const ProductQtyRow = React.memo(function ProductQtyRowView({
  product,
  qty,
  onChange,
}: {
  product: Product;
  qty: number;
  /** The whole product, so the caller can record its name at selection time. */
  onChange: (product: Product, qty: number) => void;
}): React.ReactElement {
  const theme = useTheme();
  const decrease = useCallback(() => onChange(product, qty - 1), [onChange, product, qty]);
  const increase = useCallback(() => onChange(product, qty + 1), [onChange, product, qty]);

  return (
    <MBCard>
      <View style={styles.row}>
        <View style={styles.rowMain}>
          <Text numberOfLines={1} style={[theme.type.bodyStrong, { color: theme.colors.text }]}>
            {product.name}
          </Text>
          <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>{product.sku}</Text>
        </View>

        <View style={styles.stepper}>
          <MBPressable
            onPress={decrease}
            disabled={qty === 0}
            accessibilityRole="button"
            accessibilityLabel={`Decrease ${product.name}`}
            style={[
              styles.stepButton,
              qty === 0 && styles.stepButtonDisabled,
              { borderColor: theme.colors.border },
            ]}>
            <MBIcon name="remove" size="action" color={theme.colors.text} />
          </MBPressable>

          <Text style={[theme.type.money, styles.qty, { color: theme.colors.text }]}>{qty}</Text>

          <MBPressable
            onPress={increase}
            accessibilityRole="button"
            accessibilityLabel={`Increase ${product.name}`}
            style={[styles.stepButton, { borderColor: theme.colors.border }]}>
            <MBIcon name="add" size="action" color={theme.colors.text} />
          </MBPressable>
        </View>
      </View>
    </MBCard>
  );
});

/** Tomorrow in business-date terms — the usual required-by date. */
function tomorrow(): string {
  const today = businessDateStr();
  const next = new Date(`${today}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
}

/** Module scope: a separator defined during render remounts the list each pass. */
function ListSeparator(): React.ReactElement {
  return <View style={styles.separator} />;
}

/**
 * Outcome → colour.
 *
 * `refused` is a third tone, not a variant of `queued`: the server rejected the
 * write (a 409 for insufficient stock, say) and it will never sync by itself.
 * Painting that amber alongside "it will sync automatically" is how a sale that
 * never landed goes unnoticed until the till is reconciled.
 */
/** Shared wording for a refused write. */
const ORDER_SUBJECT: WriteSubject = {
  noun: 'order',
  confirmed: 'Order submitted to production.',
  refusedNote: 'do not send it again',
};

const styles = StyleSheet.create({
  reviewLine: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  reviewControls: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space.sm,
    marginTop: space.sm,
  },
  context: { gap: space.hair },
  flex: { flex: 1 },
  // ...contentColumn caps the measure on a tablet. A list row is a label at
  // one edge and a value at the other; unconstrained on a 10" screen the two
  // end up a hand-span apart with nothing between them.
  listContent: { ...contentColumn, paddingHorizontal: space.lg, paddingBottom: space.xxl },
  separator: { height: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  rowMain: { flex: 1, gap: space.hair },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space.snug },
  stepButton: {
    width: layout.stepperSize,
    height: layout.stepperSize,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepButtonDisabled: { opacity: 0.4 },
  qty: { minWidth: 32, textAlign: 'center' },
  footer: { borderTopWidth: 1, gap: space.sm },
});
