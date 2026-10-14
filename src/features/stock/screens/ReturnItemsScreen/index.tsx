import { useState } from 'react';
import { Alert, Image, Pressable, Text, TextInput, View } from 'react-native';
import { useAuthStore } from '@/state';
import { useAppTheme } from '@/shared/theme';
import { Icon, PrimaryButton, SecondaryButton } from '@/shared/ui';
import { formatDisplayDate, formatDisplayTime } from '@/shared/utils';
import type { Product } from '@/api';
import { ProductPickerModal, ReturnLineRow } from '../../components';
import { useReturnItemsForm } from '../../hooks';
import { styles } from './styles';

export interface ReturnItemsSheetContentProps {
  onClose: () => void;
}

/** branchApp.md screen 06 — Return Items, presented as a bottom sheet. */
export function ReturnItemsSheetContent({ onClose }: ReturnItemsSheetContentProps) {
  const theme = useAppTheme();
  const branchName = useAuthStore((state) => state.user?.branchName ?? '—');
  const form = useReturnItemsForm();
  const [pickerForKey, setPickerForKey] = useState<string | null>(null);

  const now = new Date().toISOString();

  const handleSelectProduct = (product: Product) => {
    if (pickerForKey) form.updateLine(pickerForKey, { product, qtyInput: '1' });
    setPickerForKey(null);
  };

  const handleSubmit = async () => {
    const ok = await form.submit();
    if (ok) {
      Alert.alert('Return saved', 'Your return has been sent to Production for review.', [{ text: 'OK', onPress: onClose }]);
    }
  };

  return (
    <View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>DATE</Text>
          <Text style={[theme.typography.body, { color: theme.colors.text, marginTop: 4 }]}>{formatDisplayDate(now.slice(0, 10))}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>TIME</Text>
          <Text style={[theme.typography.body, { color: theme.colors.text, marginTop: 4 }]}>{formatDisplayTime(now)}</Text>
        </View>
      </View>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 12 }]}>BRANCH</Text>
      <Text style={[theme.typography.body, { color: theme.colors.text, marginTop: 4 }]}>{branchName}</Text>

      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.lg }]}>ITEMS</Text>
      <View style={{ marginTop: 8 }}>
        {form.lines.map((line) => (
          <ReturnLineRow
            key={line.key}
            product={line.product}
            qty={line.qty}
            available={line.available}
            onPressSelect={() => setPickerForKey(line.key)}
            onIncrement={() => form.updateLine(line.key, { qtyInput: String(Math.min(line.available ?? 0, line.qty + 1)) })}
            onDecrement={() => form.updateLine(line.key, { qtyInput: String(Math.max(1, line.qty - 1)) })}
            onRemove={() => form.removeLine(line.key)}
          />
        ))}
        <SecondaryButton label="+ Add Item" onPress={form.addLine} />
      </View>

      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.lg }]}>RETURN REASON (OPTIONAL)</Text>
      <TextInput
        value={form.reason}
        onChangeText={form.setReason}
        placeholder="Damaged / unsold / expired…"
        placeholderTextColor={theme.colors.textSecondary}
        multiline
        style={[styles.reasonInput, { borderColor: theme.colors.border, color: theme.colors.text, marginTop: 6 }]}
      />

      <Text style={[theme.typography.label, { color: theme.colors.danger, marginTop: theme.spacing.lg }]}>RETURN PHOTO *</Text>
      {form.photo ? (
        <View style={[styles.photoPreview, { marginTop: 6 }]}>
          <Image source={{ uri: form.photo.url }} style={styles.photoImage} resizeMode="cover" />
          <Pressable accessibilityRole="button" onPress={form.removePhoto} style={[styles.photoRemove, { backgroundColor: theme.colors.background }]}>
            <Icon name="close" size={14} color={theme.colors.text} />
          </Pressable>
        </View>
      ) : (
        <View style={[styles.photoRow, { marginTop: 6 }]}>
          <Pressable
            accessibilityRole="button"
            onPress={() => void form.capturePhoto('camera')}
            disabled={form.isPickingPhoto}
            style={[styles.photoButton, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
            <Icon name="camera" size={16} color={theme.colors.text} />
            <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '700' }]}>Camera</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => void form.capturePhoto('gallery')}
            disabled={form.isPickingPhoto}
            style={[styles.photoButton, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
            <Icon name="image" size={16} color={theme.colors.text} />
            <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '700' }]}>Gallery</Text>
          </Pressable>
        </View>
      )}
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 4 }]}>Capture or upload a photo of the returned items.</Text>

      {form.submitError ? (
        <Text style={[theme.typography.bodySmall, { color: theme.colors.danger, marginTop: theme.spacing.md }]}>{form.submitError}</Text>
      ) : null}

      <View style={[styles.footer, { borderTopColor: theme.colors.border, backgroundColor: theme.colors.surface, marginTop: theme.spacing.lg }]}>
        <View style={styles.footerStatsRow}>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
            Products <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>{form.totalProducts}</Text>
          </Text>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
            Total units <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>{form.totalUnits}</Text>
          </Text>
        </View>
        <View style={styles.actionsRow}>
          <View style={{ flex: 1 }}>
            <SecondaryButton label="Cancel" onPress={onClose} />
          </View>
          <View style={{ flex: 1.4 }}>
            <PrimaryButton label="Save Return" onPress={() => void handleSubmit()} loading={form.isSubmitting} disabled={!form.canSubmit} />
          </View>
        </View>
      </View>

      <ProductPickerModal
        visible={pickerForKey !== null}
        products={form.products}
        stockByProductId={form.stockByProductId}
        onSelect={handleSelectProduct}
        onClose={() => setPickerForKey(null)}
      />
    </View>
  );
}
