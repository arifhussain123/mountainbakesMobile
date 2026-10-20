import { useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import {
  useChangeProductPrice,
  useCreatePackingMaterial,
  useCreateProduct,
  useProductCategories,
  useUpdatePackingMaterial,
  useUpdateProduct,
  type CatalogProduct,
  type PackingMaterial,
} from '@/api';
import { RequiredDateField } from '@/features/orders/components';
import { mapErrorToMessage } from '@/shared/helpers';
import { useAppTheme } from '@/shared/theme';
import { Dropdown, FormBottomSheet, PrimaryButton, SecondaryButton, TextField, type DropdownOption } from '@/shared/ui';
import { formatRsCompact } from '../../utils/catalogFormat';
import {
  initialPackingMaterialValues,
  initialProductValues,
  karachiCalendarDate,
  packingMaterialPayload,
  priceChangeOutcome,
  priceChangePayload,
  productFormPayload,
  type ProductFormErrors,
} from '../../utils/productsActions';

function Buttons({ busy, label, onCancel, onSave }: { busy: boolean; label: string; onCancel: () => void; onSave: () => void }) {
  return (
    <View style={styles.buttons}>
      <View style={{ flex: 1 }}>
        <SecondaryButton label="Cancel" onPress={onCancel} disabled={busy} />
      </View>
      <View style={{ flex: 1.4 }}>
        <PrimaryButton label={label} onPress={onSave} loading={busy} />
      </View>
    </View>
  );
}

function Hint({ children, danger }: { children: string; danger?: boolean }) {
  const theme = useAppTheme();
  return <Text style={[theme.typography.label, { color: danger ? theme.colors.danger : theme.colors.textSecondary, marginTop: 6 }]}>{children}</Text>;
}

/**
 * Web `ProductForm`: add, or edit with the Active switch. The price is set
 * once on Add; on Edit it is shown locked — Change Price records history and
 * an effective date. Field errors show under each field after a Save attempt.
 */
function ProductForm({ product, onClose }: { product: CatalogProduct | null; onClose: () => void }) {
  const theme = useAppTheme();
  const create = useCreateProduct();
  const update = useUpdateProduct();
  const categoriesQ = useProductCategories();
  const [values, setValues] = useState(() => initialProductValues(product));
  const [errors, setErrors] = useState<ProductFormErrors>({});
  const set = (patch: Partial<typeof values>) => setValues((v) => ({ ...v, ...patch }));
  const busy = create.isPending || update.isPending;

  const categoryOptions = useMemo<DropdownOption[]>(
    () => (categoriesQ.data?.categories ?? []).map((c) => ({ value: c.id, label: c.name })),
    [categoriesQ.data],
  );

  const save = () => {
    const built = productFormPayload(values, product ? 'edit' : 'create');
    if ('errors' in built) {
      setErrors(built.errors);
      return;
    }
    setErrors({});
    const onError = (e: unknown) => Alert.alert('Could Not Save the Product', mapErrorToMessage(e));
    if ('update' in built && product) {
      update.mutate(
        { id: product.id, input: built.update },
        {
          onSuccess: () => {
            Alert.alert('Saved', 'Product updated');
            onClose();
          },
          onError,
        },
      );
    } else if ('create' in built) {
      create.mutate(built.create, {
        onSuccess: () => {
          Alert.alert('Added', 'Product created');
          onClose();
        },
        onError,
      });
    }
  };

  return (
    <View>
      <TextField label="Product Name" value={values.name} onChangeText={(name) => set({ name })} placeholder="Chocolate Cake" error={errors.name} />
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, fontWeight: '700', marginTop: 14, marginBottom: 6 }]}>Category</Text>
      <Dropdown
        options={categoryOptions}
        value={values.categoryId || null}
        onChange={(categoryId) => set({ categoryId })}
        placeholder="Select category"
        loading={categoriesQ.isLoading}
        emptyLabel="No categories yet — add one under Categories"
      />
      {categoriesQ.isError ? <Hint danger>Could not load categories</Hint> : null}
      {errors.categoryId ? <Hint danger>{errors.categoryId}</Hint> : null}
      <TextField label="SKU" value={values.sku} onChangeText={(sku) => set({ sku })} placeholder="CAKE-001" autoCapitalize="characters" error={errors.sku} />
      <TextField
        label="Selling Price (Rs.)"
        value={values.price}
        onChangeText={(price) => set({ price })}
        placeholder="2500"
        keyboardType="decimal-pad"
        editable={!product}
        error={errors.price}
      />
      {product ? <Hint>Use the Change Price action to update pricing — it records history and an effective date.</Hint> : null}
      <TextField
        label="Cost Price (Rs.)"
        value={values.costPrice}
        onChangeText={(costPrice) => set({ costPrice })}
        placeholder="1800"
        keyboardType="decimal-pad"
        error={errors.costPrice}
      />
      <TextField label="Description" value={values.description} onChangeText={(description) => set({ description })} placeholder="Optional description…" />
      {product ? (
        <View style={[styles.switchRow, { borderColor: theme.colors.border, borderRadius: theme.radii.md }]}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '700' }]}>Active</Text>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 2 }]}>
              Inactive products stay in the catalog but are hidden from ordering.
            </Text>
          </View>
          <Switch
            value={values.isActive}
            onValueChange={(isActive) => set({ isActive })}
            accessibilityLabel="Active"
            trackColor={{ true: theme.colors.primary, false: theme.colors.cardBorder }}
          />
        </View>
      ) : null}
      <Buttons busy={busy} label={product ? 'Update Product' : 'Add Product'} onCancel={onClose} onSave={save} />
    </View>
  );
}

/** Web `ChangePriceDialog`: new price, effective date (Karachi today by default) and a reason. */
function ChangePriceForm({ product, onClose }: { product: CatalogProduct; onClose: () => void }) {
  const theme = useAppTheme();
  const change = useChangeProductPrice();
  const [newPrice, setNewPrice] = useState(String(product.price ?? ''));
  const [effectiveDate, setEffectiveDate] = useState(() => karachiCalendarDate());
  const [reason, setReason] = useState('');

  const save = () => {
    const built = priceChangePayload(newPrice, effectiveDate, reason);
    if ('error' in built) {
      Alert.alert('Check the Price Change', built.error);
      return;
    }
    change.mutate(
      { id: product.id, input: built.input },
      {
        onSuccess: (res) => {
          const { title, message } = priceChangeOutcome(res, effectiveDate);
          Alert.alert(title, message);
          onClose();
        },
        onError: (e) => Alert.alert('Could Not Change the Price', mapErrorToMessage(e)),
      },
    );
  };

  return (
    <View>
      <View style={[styles.head, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radii.md }]}>
        <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>{product.name}</Text>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 2 }]}>
          Current price: <Text style={{ color: theme.colors.text, fontWeight: '700' }}>{formatRsCompact(Number(product.price ?? 0))}</Text>
        </Text>
      </View>
      <TextField label="New Price (Rs.)" value={newPrice} onChangeText={setNewPrice} placeholder="1200" keyboardType="decimal-pad" />
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, fontWeight: '700', marginTop: 14, marginBottom: 6 }]}>Effective Date</Text>
      <RequiredDateField value={effectiveDate} onChange={setEffectiveDate} />
      <Hint>Today or earlier applies now; a future date activates at 2 AM on that day. Past sales are never affected.</Hint>
      <TextField label="Reason" value={reason} onChangeText={setReason} placeholder="e.g. Supplier price increase" multiline maxLength={500} />
      <Buttons busy={change.isPending} label="Save Price Change" onCancel={onClose} onSave={save} />
    </View>
  );
}

/** Web `PackingMaterialForm`: code, category, name, description — no price and no cost, by design. */
function PackingMaterialForm({ material, onClose }: { material: PackingMaterial | null; onClose: () => void }) {
  const create = useCreatePackingMaterial();
  const update = useUpdatePackingMaterial();
  const [values, setValues] = useState(() => initialPackingMaterialValues(material));
  const set = (patch: Partial<typeof values>) => setValues((v) => ({ ...v, ...patch }));
  const busy = create.isPending || update.isPending;

  const save = () => {
    const built = packingMaterialPayload(values);
    if ('error' in built) {
      Alert.alert('Check the Packing Material', built.error);
      return;
    }
    const name = built.input.materialName;
    // A taken code comes back as a 409 with a readable message.
    const onError = (e: unknown) => Alert.alert('Could Not Save the Packing Material', mapErrorToMessage(e));
    if (material) {
      update.mutate(
        { id: material.id, input: built.input },
        {
          onSuccess: () => {
            Alert.alert('Saved', `${name} updated`);
            onClose();
          },
          onError,
        },
      );
    } else {
      create.mutate(built.input, {
        onSuccess: () => {
          Alert.alert('Added', `${name} added`);
          onClose();
        },
        onError,
      });
    }
  };

  return (
    <View>
      <TextField
        label="Code"
        value={values.materialCode}
        onChangeText={(materialCode) => set({ materialCode })}
        placeholder="PACK-016"
        autoCapitalize="characters"
        autoCorrect={false}
      />
      <TextField label="Category" value={values.category} onChangeText={(category) => set({ category })} placeholder="Shoppers, Boxes, Consumables…" />
      <TextField label="Packing Material" value={values.materialName} onChangeText={(materialName) => set({ materialName })} placeholder="1 Pound Cake Box" />
      <TextField
        label="Description (optional)"
        value={values.description}
        onChangeText={(description) => set({ description })}
        placeholder="Any notes…"
        multiline
      />
      <Buttons busy={busy} label={material ? 'Save Changes' : 'Add Packing Material'} onCancel={onClose} onSave={save} />
    </View>
  );
}

export type ProductsSheet =
  | { kind: 'product'; product: CatalogProduct | null }
  | { kind: 'price'; product: CatalogProduct }
  | { kind: 'material'; material: PackingMaterial | null };

function titleOf(sheet: ProductsSheet | null): string {
  if (!sheet) return '';
  if (sheet.kind === 'product') return sheet.product ? 'Edit Product' : 'Add Product';
  if (sheet.kind === 'price') return 'Change Price';
  return sheet.material ? 'Edit Packing Material' : 'Add Packing Material';
}

/**
 * One bottom sheet for every Products form. `open(sheet)` presents it; the
 * form is mounted only while it is open, so each opening starts clean.
 */
export function useProductsSheet() {
  const ref = useRef<BottomSheetModal>(null);
  const [sheet, setSheet] = useState<ProductsSheet | null>(null);
  const close = () => ref.current?.dismiss();

  const open = (next: ProductsSheet) => {
    setSheet(next);
    ref.current?.present();
  };

  const element = (
    <FormBottomSheet ref={ref} title={titleOf(sheet)} onRequestClose={close} onDismiss={() => setSheet(null)}>
      {sheet?.kind === 'product' ? <ProductForm product={sheet.product} onClose={close} /> : null}
      {sheet?.kind === 'price' ? <ChangePriceForm product={sheet.product} onClose={close} /> : null}
      {sheet?.kind === 'material' ? <PackingMaterialForm material={sheet.material} onClose={close} /> : null}
    </FormBottomSheet>
  );

  return { open, element };
}

const styles = StyleSheet.create({
  head: { borderWidth: 1, padding: 12, marginBottom: 4 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, padding: 12, marginTop: 14 },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 18 },
});
