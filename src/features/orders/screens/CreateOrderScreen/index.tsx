import { useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Icon, PrimaryButton, SecondaryButton } from '@/shared/ui';
import { formatCurrency } from '@/shared/utils';
import type { PackingMaterial } from '@/api';
import { PackingMaterialPickerModal, PackingMaterialRow, ProductQtyRow } from '../../components';
import { useCreateOrderForm } from '../../hooks';
import { styles } from './styles';

export interface CreateOrderSheetContentProps {
  onClose: () => void;
}

/** branchApp.md screen 05 — Create New Production Order, presented as a bottom sheet. */
export function CreateOrderSheetContent({ onClose }: CreateOrderSheetContentProps) {
  const theme = useAppTheme();
  const form = useCreateOrderForm();
  const [packingPickerKey, setPackingPickerKey] = useState<string | null>(null);
  const [packingOpen, setPackingOpen] = useState(true);

  const handleSelectMaterial = (material: PackingMaterial) => {
    if (packingPickerKey) form.updatePackingRow(packingPickerKey, { material });
    setPackingPickerKey(null);
  };

  const handleSubmit = async () => {
    const ok = await form.submit();
    if (ok) {
      Alert.alert('Order submitted', 'Your production order has been submitted.', [{ text: 'OK', onPress: onClose }]);
    }
  };

  return (
    <View>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>PRODUCTS</Text>
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

      <Text style={[theme.typography.label, { color: theme.colors.danger, marginTop: theme.spacing.lg }]}>REQUIRED DATE *</Text>
      <TextInput
        value={form.requiredDate}
        onChangeText={form.setRequiredDate}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={theme.colors.textSecondary}
        style={[styles.dateInput, { borderColor: theme.colors.border, color: theme.colors.text, marginTop: 6 }]}
      />
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 4 }]}>
        Choose when you need this delivered — the order cannot be submitted without it.
      </Text>

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
    </View>
  );
}
