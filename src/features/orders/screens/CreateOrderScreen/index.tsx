import { useRef, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { CashDepositSheetContent } from '@/features/cash';
import { RequestDiscountSheetContent } from '@/features/discounts';
import { ReturnItemsSheetContent } from '@/features/stock';
import { useAuthStore } from '@/state';
import { useAppTheme } from '@/shared/theme';
import { FormBottomSheet, Icon, PrimaryButton, SecondaryButton } from '@/shared/ui';
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

/** branchApp.md screen 05 — Create New Production Order, presented as a bottom sheet. */
export function CreateOrderSheetContent({ onClose }: CreateOrderSheetContentProps) {
  const theme = useAppTheme();
  const form = useCreateOrderForm();
  const user = useAuthStore((state) => state.user);
  const [packingPickerKey, setPackingPickerKey] = useState<string | null>(null);
  const [packingOpen, setPackingOpen] = useState(true);
  const [specialOpen, setSpecialOpen] = useState(false);

  const returnItemsSheetRef = useRef<BottomSheetModal>(null);
  const discountSheetRef = useRef<BottomSheetModal>(null);
  const cashDepositSheetRef = useRef<BottomSheetModal>(null);

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

      <View style={{ marginTop: theme.spacing.md }}>
        <OrderMetaGrid items={metaItems} />
      </View>

      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.lg }]}>PRODUCTS</Text>
      <View style={[styles.tableHeader, { borderBottomColor: theme.colors.border }]}>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary, flex: 1 }]}>PRODUCT</Text>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary, width: 40, textAlign: 'center' }]}>STOCK</Text>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary, width: 54, textAlign: 'right' }]}>RATE</Text>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary, width: 50, textAlign: 'center' }]}>QTY</Text>
      </View>
      {form.products.map((product) => (
        <ProductQtyRow
          key={product.id}
          product={product}
          qtyInput={form.qtyByProductId[product.id] ?? ''}
          availableQty={form.stockByProductId.get(product.id) ?? null}
          onChangeQty={(text) => form.setProductQty(product.id, text)}
        />
      ))}

      <Pressable onPress={() => setPackingOpen((v) => !v)} style={[styles.sectionHeader, { marginTop: theme.spacing.lg }]}>
        <Icon name="box" size={15} color={theme.colors.textSecondary} />
        <Text style={[theme.typography.body, { color: theme.colors.text, flex: 1, fontWeight: '700' }]}>
          Packing Materials <Text style={{ color: theme.colors.textSecondary, fontWeight: '400' }}>(Optional)</Text>
        </Text>
        <Icon name="chevron-down" size={14} color={theme.colors.textSecondary} />
      </Pressable>
      {packingOpen ? (
        <View style={{ marginTop: 8, gap: 8 }}>
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
          <SecondaryButton label="+ Add Packing Material" onPress={form.addPackingRow} />
        </View>
      ) : null}

      <Pressable onPress={() => setSpecialOpen((v) => !v)} style={[styles.sectionHeader, { marginTop: theme.spacing.lg }]}>
        <Icon name="sparkle" size={15} color={theme.colors.textSecondary} />
        <Text style={[theme.typography.body, { color: theme.colors.text, flex: 1, fontWeight: '700' }]}>
          Special Order Items <Text style={{ color: theme.colors.textSecondary, fontWeight: '400' }}>(Optional)</Text>
        </Text>
        <Icon name="chevron-down" size={14} color={theme.colors.textSecondary} />
      </Pressable>
      {specialOpen ? (
        <View style={{ marginTop: 8, gap: 8 }}>
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
          <SecondaryButton label="+ Add Special Order Item" onPress={form.addSpecialOrderRow} />
        </View>
      ) : null}

      <View style={{ marginTop: theme.spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name="calendar" size={13} color={theme.colors.textSecondary} />
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary, letterSpacing: 1 }]}>
            REQUIRED DATE <Text style={{ color: theme.colors.danger }}>*</Text>
          </Text>
        </View>
        <View style={{ marginTop: 6 }}>
          <RequiredDateField value={form.requiredDate} onChange={form.setRequiredDate} error={form.requiredDateError} />
        </View>
        <Text style={[theme.typography.label, { color: theme.colors.textFaint, marginTop: 5 }]}>
          Choose when you need this delivered — the order cannot be submitted without it.
        </Text>
      </View>

      {form.submitError ? (
        <Text style={[theme.typography.bodySmall, { color: theme.colors.danger, marginTop: theme.spacing.md }]}>{form.submitError}</Text>
      ) : null}

      <View style={[styles.footer, { borderTopColor: theme.colors.border, backgroundColor: theme.colors.surface, marginTop: theme.spacing.lg }]}>
        <View style={styles.totalsRow}>
          <View>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>PRODUCTS</Text>
            <Text style={[theme.typography.cardTitle, { color: theme.colors.primary }]}>{form.totalProducts}</Text>
          </View>
          <View>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>QUANTITY</Text>
            <Text style={[theme.typography.cardTitle, { color: theme.colors.primary }]}>{form.totalQty}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>AMOUNT</Text>
            <Text style={[theme.typography.cardTitle, { color: theme.colors.primary }]}>{formatCurrency(form.totalAmount)}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: theme.spacing.md }}>
          <View style={{ flex: 1 }}>
            <SecondaryButton label="Clear" onPress={form.clear} />
          </View>
          <View style={{ flex: 1 }}>
            <SecondaryButton label="Save Draft" onPress={() => void handleSaveDraft()} loading={form.isSavingDraft} />
          </View>
          <View style={{ flex: 1.3 }}>
            <PrimaryButton label="Submit Order" onPress={() => void handleSubmit()} loading={form.isSubmitting} disabled={!form.canSubmit} />
          </View>
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
