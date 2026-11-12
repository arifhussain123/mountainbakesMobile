import { useMemo, useRef, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { CashDepositSheetContent } from '@/features/cash';
import { RequestDiscountSheetContent } from '@/features/discounts';
import { ReturnItemsSheetContent } from '@/features/stock';
import { useAuthStore } from '@/state';
import { tintFill, useAppTheme } from '@/shared/theme';
import { Card, FormBottomSheet, InfoBanner, MiniStat, PrimaryButton, SearchBar, SecondaryButton, SmallButton } from '@/shared/ui';
import { formatCurrency, formatDisplayDate, formatDisplayTime } from '@/shared/utils';
import { getBusinessDate } from '@/api';
import type { PackingMaterial } from '@/api';
import type { OrderMetaItem } from '../../components';
import {
  OrderMetaGrid,
  PackingMaterialPickerModal,
  PackingMaterialRow,
  ProductQtyRow,
  QuickActionRow,
  RequiredDateField,
  SpecialOrderItemRow,
} from '../../components';
import { useCreateOrderForm } from '../../hooks';
import { styles } from './styles';

export interface CreateOrderSheetContentProps {
  onClose: () => void;
}

/** branchApp.md screen 05 "Create New Production Order" — a client-only estimate of the branch's initials, since no `branchCode` field exists on `SessionUser` yet. */
function deriveBranchCode(branchName: string): string {
  if (!branchName || branchName === '—') return '—';
  const initials = branchName
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
  return (initials.slice(0, 4) || branchName.slice(0, 3).toUpperCase()) || '—';
}

/** 2026 redesign B05 — Create New Production Order, presented as a bottom sheet. */
export function CreateOrderSheetContent({ onClose }: CreateOrderSheetContentProps) {
  const theme = useAppTheme();
  const form = useCreateOrderForm();
  const user = useAuthStore((state) => state.user);
  const [packingPickerKey, setPackingPickerKey] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState('');

  // A view filter only — quantities stay in `form.qtyByProductId`, so a product
  // hidden by the search keeps whatever was entered for it.
  const visibleProducts = useMemo(() => {
    const term = productSearch.trim().toLowerCase();
    if (!term) return form.products;
    return form.products.filter(
      (p) => p.name.toLowerCase().includes(term) || (p.categoryName ?? '').toLowerCase().includes(term),
    );
  }, [form.products, productSearch]);

  const returnItemsSheetRef = useRef<BottomSheetModal>(null);
  const discountSheetRef = useRef<BottomSheetModal>(null);
  const cashDepositSheetRef = useRef<BottomSheetModal>(null);

  // Lets the numeric keyboard's "Next"/"Done" key jump straight to the next
  // product's qty field instead of just dismissing the keyboard — same
  // ref-chaining pattern as Stock Check's `CountRow`/`QtyStepper`.
  const qtyInputRefs = useRef<Record<string, React.RefObject<any>>>({});
  const getQtyInputRef = (productId: string): React.RefObject<any> => {
    qtyInputRefs.current[productId] ??= { current: null };
    return qtyInputRefs.current[productId]!;
  };

  const handleSelectMaterial = (material: PackingMaterial) => {
    if (packingPickerKey) form.updatePackingRow(packingPickerKey, { material });
    setPackingPickerKey(null);
  };

  const handleSubmit = async () => {
    const ok = await form.submit();
    if (ok) {
      Alert.alert(
        form.wasQueuedOffline ? 'Saved' : 'Order submitted',
        form.wasQueuedOffline
          ? "Saved, will submit when you're online."
          : 'Your production order has been submitted.',
        [{ text: 'OK', onPress: onClose }],
      );
    }
  };

  const handleSaveDraft = async () => {
    const ok = await form.saveDraft();
    Alert.alert(
      ok ? 'Draft saved' : 'Could not save draft',
      ok ? 'Your in-progress order has been saved on this device.' : 'Something went wrong saving this draft. Please try again.',
    );
  };

  const now = new Date();
  const branchName = user?.branchName ?? '—';
  const branchCode = deriveBranchCode(branchName);
  const orderedBy = user?.displayName ?? user?.username ?? user?.email ?? '—';

  const metaItems: OrderMetaItem[] = [
    { key: 'branch', icon: 'building', label: 'Branch', value: branchName },
    { key: 'branchCode', icon: 'hash', label: 'Branch Code', value: branchCode },
    { key: 'date', icon: 'calendar', label: 'Date', value: formatDisplayDate(getBusinessDate()) },
    { key: 'time', icon: 'clock', label: 'Time', value: formatDisplayTime(now.toISOString()) },
    { key: 'orderNo', icon: 'hash', label: 'Order No.', value: 'Pending' },
    { key: 'orderedBy', icon: 'user', label: 'Ordered By', value: orderedBy },
  ];

  return (
    <View>
      <QuickActionRow
        onPressReturnItems={() => returnItemsSheetRef.current?.present()}
        onPressDiscount={() => discountSheetRef.current?.present()}
        onPressCashDeposit={() => cashDepositSheetRef.current?.present()}
      />

      <View style={styles.gapMd}>
        <OrderMetaGrid items={metaItems} />
      </View>

      <View style={styles.gapMd}>
        <SearchBar value={productSearch} onChangeText={setProductSearch} placeholder="Search products…" />
      </View>

      <Card style={[styles.listCard, styles.gapMd]}>
        {visibleProducts.length === 0 ? (
          <Text style={[theme.typography.bodySmall, styles.emptyList, { color: theme.colors.textFaint }]}>
            {form.products.length === 0 ? 'No products to order yet.' : 'No products match this search.'}
          </Text>
        ) : (
          visibleProducts.map((product, index) => (
            <ProductQtyRow
              key={product.id}
              first={index === 0}
              inputRef={getQtyInputRef(product.id)}
              product={product}
              qtyInput={form.qtyByProductId[product.id] ?? ''}
              availableQty={form.stockByProductId.get(product.id) ?? null}
              onChangeQty={(text) => form.setProductQty(product.id, text)}
              returnKeyType={index < visibleProducts.length - 1 ? 'next' : 'done'}
              onSubmitEditing={() => {
                const next = visibleProducts[index + 1];
                if (next) getQtyInputRef(next.id).current?.focus();
              }}
            />
          ))
        )}
      </Card>

      {form.packingRows.length > 0 ? (
        <View style={[styles.extraBlock, styles.gapMd]}>
          <Text style={[styles.label, { color: theme.colors.text }]}>
            Packing materials <Text style={{ color: theme.colors.textFaint }}>(optional)</Text>
          </Text>
          {form.packingRows.map((row) => (
            <PackingMaterialRow
              key={row.key}
              material={row.material}
              qtyInput={row.qtyInput}
              onPressSelect={() => setPackingPickerKey(row.key)}
              onChangeQty={(text) => form.updatePackingRow(row.key, { qtyInput: text })}
              onRemove={() => form.removePackingRow(row.key)}
            />
          ))}
        </View>
      ) : null}

      {form.specialOrderRows.length > 0 ? (
        <View style={[styles.extraBlock, styles.gapMd]}>
          <Text style={[styles.label, { color: theme.colors.text }]}>
            Special order items <Text style={{ color: theme.colors.textFaint }}>(optional)</Text>
          </Text>
          {form.specialOrderRows.map((row) => (
            <SpecialOrderItemRow
              key={row.key}
              name={row.name}
              qtyInput={row.qtyInput}
              onChangeName={(text) => form.updateSpecialOrderRow(row.key, { name: text })}
              onChangeQty={(text) => form.updateSpecialOrderRow(row.key, { qtyInput: text })}
              onRemove={() => form.removeSpecialOrderRow(row.key)}
            />
          ))}
        </View>
      ) : null}

      <View style={[styles.grid2, styles.gapMd]}>
        <SmallButton label="Packing material" icon="plus" size="sm" onPress={form.addPackingRow} style={styles.flex1} />
        <SmallButton label="Special order item" icon="plus" size="sm" onPress={form.addSpecialOrderRow} style={styles.flex1} />
      </View>

      <View style={[styles.field, styles.gapLg]}>
        <Text style={[styles.label, { color: theme.colors.text }]}>
          Required date <Text style={{ color: theme.colors.primary }}>*</Text>
        </Text>
        <RequiredDateField value={form.requiredDate} onChange={form.setRequiredDate} error={form.requiredDateError} />
        <Text style={[styles.help, { color: theme.colors.textFaint }]}>
          Choose when you need this delivered — the order cannot be submitted without it.
        </Text>
      </View>

      {form.submitError ? (
        <InfoBanner kind="bad" style={styles.gapMd}>
          {form.submitError}
        </InfoBanner>
      ) : null}

      <View style={[styles.totals, styles.gapLg, { backgroundColor: tintFill(theme) }]}>
        <MiniStat label="Products" value={String(form.totalProducts)} />
        <MiniStat label="Quantity" value={String(form.totalQty)} />
        <MiniStat label="Amount" value={formatCurrency(form.totalAmount)} style={styles.amount} />
      </View>

      <View style={[styles.actionsRow, styles.gapLg]}>
        <View style={styles.flex1}>
          <SecondaryButton label="Clear" onPress={form.clear} />
        </View>
        <View style={styles.flex1}>
          <SecondaryButton label="Save Draft" onPress={() => void handleSaveDraft()} loading={form.isSavingDraft} />
        </View>
        <View style={styles.submit}>
          <PrimaryButton label="Submit Order" onPress={() => void handleSubmit()} loading={form.isSubmitting} disabled={!form.canSubmit} />
        </View>
      </View>

      <PackingMaterialPickerModal
        visible={packingPickerKey !== null}
        materials={form.packingMaterials}
        onSelect={handleSelectMaterial}
        onClose={() => setPackingPickerKey(null)}
      />

      <FormBottomSheet ref={returnItemsSheetRef} title="Return Items" onRequestClose={() => returnItemsSheetRef.current?.dismiss()}>
        <ReturnItemsSheetContent onClose={() => returnItemsSheetRef.current?.dismiss()} />
      </FormBottomSheet>
      <FormBottomSheet ref={discountSheetRef} title="Request Discount" onRequestClose={() => discountSheetRef.current?.dismiss()}>
        <RequestDiscountSheetContent />
      </FormBottomSheet>
      <FormBottomSheet
        ref={cashDepositSheetRef}
        title="Cash Deposit"
        subtitle="Finance approves it and posts the receipt"
        onRequestClose={() => cashDepositSheetRef.current?.dismiss()}>
        <CashDepositSheetContent onClose={() => cashDepositSheetRef.current?.dismiss()} />
      </FormBottomSheet>
    </View>
  );
}
