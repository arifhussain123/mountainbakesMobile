import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import {
  MBFilterChips,
  MBHeader,
  MBModal,
  MBSearchBar,
  MBSyncStatus,
} from '@/common/ui';
import { useCategories, useProducts, useStock } from '@/api/hooks/useCatalogApi';
import type { SaleOutcome } from '@/api/hooks/useSalesApi';
import { dataAsOfFrom } from '@/common/helpers/dataAsOf';
import { toNumber } from '@/common/utils/money';
import { useTheme } from '@/common/theme/ThemeProvider';
import { useAuthStore } from '@/state/authStore';

import {
  SalePayment,
  SaleProductList,
  SaleReceipt,
  SaleSummaryBar,
} from '@/common/till';
import { PAYMENT_METHOD_VALUES } from '@/shared/schemas/order.schemas';
import { ALL_CATEGORIES, useNewSale, type SaleCompletion } from '../hooks';

/**
 * Point of sale — the branch's create action, a modal over the day's register
 * (`SalesScreen`). v6, screen 07b, as a **two-stage till**.
 *
 * ```
 * items    search → tap a product to add → cart lines with qty and discount
 * payment  recap → customer → method → cash pad → Save / Save & share
 * ```
 *
 * The mock draws this as one long sheet: a product dropdown, a qty box, an "Add
 * item" pill, then everything else below it. Counter work is tap-driven — one
 * tap is one unit — so the price list is the primary surface, and taking cash
 * gets a stage of its own because it needs the room: a keypad-sized field and
 * the notes that were handed over. The running total and the single forward
 * action stay in a sticky `SaleSummaryBar` on both stages, so the cashier's next
 * tap is always in the same place.
 *
 * This screen is composition and a stage switch. Every rule lives in
 * `useNewSale`.
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
 *
 * ---------------------------------------------------------------------------
 * The running total is a preview
 * ---------------------------------------------------------------------------
 * The request carries only product, quantity and discount. The server resolves
 * prices, recomputes every total with its own tax settings, and returns its own
 * snapshot — so a price change mid-sale cannot print a stale rate, and the
 * figures here are marked as estimates because the server may legitimately
 * disagree with them.
 */
export function NewSaleScreen(): React.ReactElement {
  const theme = useTheme();
  const navigation = useNavigation<{
    goBack: () => void;
    navigate: (screen: string, params?: object) => void;
  }>();

  const form = useNewSale();
  const { cart } = form;
  const branchName = useAuthStore(s => s.claims?.branchName);

  const products = useProducts({
    search: form.search || undefined,
    categoryId: form.categoryId === ALL_CATEGORIES ? undefined : form.categoryId,
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
   * What is actually on the shelf.
   *
   * A branch role is scoped server-side, so this sends no branchId, and it reads
   * through the SQLite mirror — the balances are there for a phone that has been
   * offline all shift.
   *
   * **Advisory, never a gate.** The server is the only authority on stock and
   * refuses an overdraw with a 409; blocking the sale here would stop a cashier
   * selling something that is physically in front of them because a balance is
   * stale. What the row buys instead is that the refusal is *foreseeable* at the
   * counter — it shows what is left and how many are already rung up — rather
   * than surfacing hours later as a parked row in Sync Center.
   */
  const stock = useStock();
  const availability = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of stock.data?.rows ?? []) map.set(r.productId, toNumber(r.balance));
    return map;
  }, [stock.data]);

  /** Units per product already in the cart, for the price list's own rows. */
  const inCart = useMemo(() => {
    const map = new Map<string, number>();
    for (const line of cart.lines) map.set(line.productId, line.qty);
    return map;
  }, [cart.lines]);

  const [receipt, setReceipt] = useState<SaleCompletion | null>(null);

  /**
   * Leave, handing the register the outcome.
   *
   * `navigate` rather than `goBack` because the params ARE the message — a
   * `goBack` cannot carry one.
   */
  const leaveWith = useCallback(
    (outcome: SaleOutcome, reason?: string) => {
      navigation.navigate('SalesList', { outcome, ...(reason ? { reason } : {}) });
    },
    [navigation],
  );

  const onSave = useCallback(async () => {
    const done = await form.save();
    if (done) leaveWith(done.outcome, done.reason);
  }, [form, leaveWith]);

  /**
   * Save, then offer the slip — **unless the server refused it**.
   *
   * A refused sale did not happen: it is parked in Sync Center waiting for a
   * person, and printing a slip for it is how a customer walks out holding proof
   * of a sale the business has no record of. That case leaves exactly as Save
   * does, so the refusal is read on the register with everything that follows
   * from it.
   */
  const onSaveAndShare = useCallback(async () => {
    const done = await form.saveAndShare();
    if (!done) return;
    if (done.outcome === 'refused') {
      leaveWith(done.outcome, done.reason);
      return;
    }
    setReceipt(done);
  }, [form, leaveWith]);

  const onSlipDone = useCallback(() => {
    const done = receipt;
    setReceipt(null);
    if (done) leaveWith(done.outcome, done.reason);
  }, [leaveWith, receipt]);

  const items = form.stage === 'items';

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader
        title={items ? 'New sale' : 'Payment'}
        {...(items ? {} : { subtitle: `${cart.itemCount} ${cart.itemCount === 1 ? 'item' : 'items'}` })}
        /* Back means one step, not one screen: from payment it returns to the
           items stage with the cart intact, and only from items does it leave
           the till. A single arrow doing the obvious thing beats a second
           control in the summary bar doing the same job. */
        onBack={items ? () => navigation.goBack() : form.toItems}
        right={<MBSyncStatus />}
        /* The POS is the screen most likely to be used offline for hours, and
           the catalogue behind it is cached. A price that changed on another
           device this morning is invisible here until something asks, so the
           till says how old its prices are. */
        dataAsOf={dataAsOfFrom(products.dataUpdatedAt)}
      />

      {items ? (
        <>
          <View
            style={{
              paddingHorizontal: theme.layout.screenPad,
              paddingTop: theme.layout.screenPad,
            }}>
            <MBSearchBar
              value={form.searchInput}
              onChangeText={form.setSearchInput}
              /* Name or code. The server searches both (`name.ilike` OR
                 `sku.ilike`), and so does the offline mirror, so a cashier
                 reading a code off a tray finds the product either way. */
              placeholder="Search name or code"
              searching={form.searchInput.trim() !== form.search}
              testID="sale-product-search"
            />
          </View>

          {/*
            The second way to narrow, for the regulars nobody types the name of.
            A horizontal scroller rather than a wrapping block: categories are
            unbounded, and a filter that grows to three lines pushes the products
            themselves off a till screen that already carries a search field and
            a summary bar.
          */}
          {categoryChips.length > 1 ? (
            <MBFilterChips
              options={categoryChips}
              selectedKey={form.categoryId}
              onSelect={form.setCategoryId}
              scroll
              testIDPrefix="sale-category"
            />
          ) : null}

          <View style={styles.flex}>
            <SaleProductList
              products={products.data ?? []}
              availability={availability}
              inCart={inCart}
              lines={cart.lines}
              {...(form.currencySymbol ? { currencySymbol: form.currencySymbol } : {})}
              onAdd={cart.addProduct}
              onQty={cart.setQty}
              onDiscountPct={cart.setDiscountPct}
              onRemove={cart.remove}
              isPending={products.isPending}
              isError={products.isError}
              error={products.error}
              isRefreshing={products.isFetching && !products.isPending}
              onRefresh={() => products.refetch()}
            />
          </View>

          <SaleSummaryBar
            itemCount={cart.itemCount}
            total={cart.totals.grandTotal}
            {...(form.currencySymbol ? { currencySymbol: form.currencySymbol } : {})}
            error={form.error}
            disabled={cart.isEmpty}
            onCharge={form.toPayment}
          />
        </>
      ) : (
        <>
          <View style={styles.flex}>
            <SalePayment
              lines={cart.lines}
              totals={cart.totals}
              {...(form.currencySymbol ? { currencySymbol: form.currencySymbol } : {})}
              /* Four methods, not five. `staff` is the production counter's own
                 and takes no money; `PAYMENT_METHOD_VALUES` not containing it is
                 what makes both `/api/orders/pos` and this screen reject an
                 unpaid hand-out with no extra check. */
              methods={PAYMENT_METHOD_VALUES}
              paymentMethod={form.paymentMethod}
              onPaymentMethod={form.setPaymentMethod}
              {...(form.isCash
                ? {
                    cash: {
                      value: form.receivedText,
                      onChangeText: form.setReceivedText,
                      onAddNote: form.addCash,
                      onExact: form.setExact,
                      returned: form.returned,
                      stillDue: form.stillDue,
                      ...(form.currencySymbol
                        ? { currencySymbol: form.currencySymbol }
                        : {}),
                      disabled: form.busy !== null,
                    },
                  }
                : {})}
              customerName={form.customerName}
              onCustomerName={form.setCustomerName}
              customerPhone={form.customerPhone}
              onCustomerPhone={form.setCustomerPhone}
              notes={form.notes}
              onNotes={form.setNotes}
              disabled={form.busy !== null}
            />
          </View>

          <SaleSummaryBar
            itemCount={cart.itemCount}
            total={cart.totals.grandTotal}
            {...(form.currencySymbol ? { currencySymbol: form.currencySymbol } : {})}
            error={form.error}
            disabled={!form.canFinish}
            busy={form.busy}
            onSave={onSave}
            onSaveAndShare={onSaveAndShare}
          />
        </>
      )}

      <MBModal
        visible={receipt !== null}
        onRequestClose={onSlipDone}
        testID="sale-slip">
        {receipt ? (
          <SaleReceipt sale={receipt} branchName={branchName} onDone={onSlipDone} />
        ) : null}
      </MBModal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
