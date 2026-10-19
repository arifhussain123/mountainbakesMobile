import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Icon, type IconName } from '@/shared/ui';
import type { Product } from '@/api';
import type { ReturnLinePhoto } from '../hooks/useReturnItemsForm';

export interface ReturnLineRowProps {
  product: Product | null;
  qty: number;
  available: number | null;
  /** The same product is already on an earlier line. */
  isDuplicate?: boolean;
  photo: ReturnLinePhoto | null;
  /** A capture problem (too large, could not be read…) to show under the photo buttons. */
  photoError?: string | null;
  /** True once Save was tapped while this line still has no usable photo. */
  showPhotoRequired?: boolean;
  /** No product chosen yet, or the picker is already open. */
  photoDisabled?: boolean;
  onPressSelect: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
  onTakePhoto: () => void;
  onPickPhoto: () => void;
  onOpenPhoto: () => void;
  onRetakePhoto: () => void;
  onRemovePhoto: () => void;
  onRetryUpload: () => void;
  onLayout?: (event: LayoutChangeEvent) => void;
}

/** What the photo is doing, in words and an icon — never colour alone. */
function describePhoto(photo: ReturnLinePhoto): { icon: IconName; text: string; tone: 'text' | 'warning' | 'danger' | 'success' } {
  switch (photo.status) {
    case 'uploading':
      return { icon: 'refresh', text: photo.progress != null ? `Uploading… ${Math.round(photo.progress * 100)}%` : 'Uploading…', tone: 'text' };
    case 'uploaded':
      return { icon: 'check', text: 'Photo uploaded', tone: 'success' };
    case 'saved_locally':
      return { icon: 'clock', text: 'Saved on this phone — uploads when online', tone: 'warning' };
    default:
      return { icon: 'warning', text: photo.error ? `Upload failed: ${photo.error}` : 'Upload failed', tone: 'danger' };
  }
}

/** branchApp.md screen 06 — one Return Items line: product, available qty, −/+ stepper, and this product's own photo. */
export function ReturnLineRow({
  product,
  qty,
  available,
  isDuplicate = false,
  photo,
  photoError,
  showPhotoRequired = false,
  photoDisabled = false,
  onPressSelect,
  onIncrement,
  onDecrement,
  onRemove,
  onTakePhoto,
  onPickPhoto,
  onOpenPhoto,
  onRetakePhoto,
  onRemovePhoto,
  onRetryUpload,
  onLayout,
}: ReturnLineRowProps) {
  const theme = useAppTheme();
  const atLimit = available != null && qty >= available;
  const overAvailable = available != null && qty > available;
  const productName = product?.name ?? 'this product';
  const status = photo ? describePhoto(photo) : null;
  const toneColor = (tone: 'text' | 'warning' | 'danger' | 'success') =>
    tone === 'danger' ? theme.colors.danger : tone === 'warning' ? theme.colors.warning : tone === 'success' ? theme.colors.success : theme.colors.textSecondary;
  const canRetry = photo?.status === 'failed' || photo?.status === 'saved_locally';

  return (
    <View
      onLayout={onLayout}
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: showPhotoRequired || isDuplicate ? theme.colors.danger : theme.colors.border,
          borderRadius: theme.radii.md,
        },
      ]}>
      <View style={styles.topRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={product ? `Product: ${product.name}. Change product` : 'Choose a product'}
          onPress={onPressSelect}
          style={[styles.productButton, { backgroundColor: theme.colors.background, borderRadius: theme.radii.sm }]}>
          <Text style={[theme.typography.body, { color: product ? theme.colors.text : theme.colors.textSecondary }]} numberOfLines={1}>
            {product ? product.name : 'Search product…'}
          </Text>
          <Icon name="chevron-down" size={14} color={theme.colors.textSecondary} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`Delete ${productName} line`} onPress={onRemove} style={styles.removeButton}>
          <Icon name="trash" size={16} color={theme.colors.danger} />
        </Pressable>
      </View>
      {isDuplicate ? (
        <View style={styles.messageRow}>
          <Icon name="warning" size={12} color={theme.colors.danger} />
          <Text style={[theme.typography.label, { color: theme.colors.danger }]}>Already on this return — change or delete this line</Text>
        </View>
      ) : null}

      <View style={[styles.bottomRow, { marginTop: 10 }]}>
        <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
          Available <Text style={{ color: theme.colors.text, fontWeight: '700' }}>{available ?? '—'}</Text>
        </Text>
        <View style={[styles.stepper, { borderColor: atLimit ? theme.colors.warning : theme.colors.primary, borderRadius: theme.radii.sm }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Decrease return quantity" onPress={onDecrement} style={styles.stepperButton}>
            <Icon name="minus" size={14} color={theme.colors.textSecondary} />
          </Pressable>
          <Text accessibilityLabel={`Return quantity ${qty}`} style={[theme.typography.body, { color: theme.colors.text, minWidth: 24, textAlign: 'center' }]}>
            {qty}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Increase return quantity"
            accessibilityState={{ disabled: atLimit }}
            onPress={onIncrement}
            disabled={atLimit}
            style={styles.stepperButton}>
            <Icon name="plus" size={14} color={atLimit ? theme.colors.textSecondary : theme.colors.primary} />
          </Pressable>
        </View>
      </View>
      {overAvailable ? (
        <View style={styles.messageRow}>
          <Icon name="warning" size={12} color={theme.colors.danger} />
          <Text style={[theme.typography.label, { color: theme.colors.danger }]}>More than the {available} available</Text>
        </View>
      ) : null}

      <View style={[styles.photoArea, { borderTopColor: theme.colors.border }]}>
        {photo ? (
          <View style={styles.photoRow}>
            <Pressable
              accessibilityRole="imagebutton"
              accessibilityLabel={`Photo of returned ${productName}. Open full screen`}
              onPress={onOpenPhoto}
              style={[styles.thumb, { borderColor: theme.colors.border, borderRadius: theme.radii.sm }]}>
              <Image source={{ uri: photo.previewUri }} style={styles.thumbImage} resizeMode="cover" accessibilityIgnoresInvertColors />
              {photo.status === 'uploading' ? (
                <View style={styles.thumbOverlay}>
                  <ActivityIndicator color="#FFFFFF" />
                </View>
              ) : null}
            </Pressable>
            <View style={styles.photoBody}>
              {status ? (
                <View style={styles.statusRow} accessibilityLiveRegion="polite">
                  <Icon name={status.icon} size={12} color={toneColor(status.tone)} />
                  <Text style={[theme.typography.label, styles.flexShrink, { color: toneColor(status.tone) }]} numberOfLines={2}>
                    {status.text}
                  </Text>
                </View>
              ) : null}
              <View style={styles.photoActions}>
                {canRetry ? (
                  <Pressable accessibilityRole="button" accessibilityLabel={`Retry upload of the ${productName} photo`} onPress={onRetryUpload} style={styles.linkButton}>
                    <Text style={[theme.typography.label, styles.bold, { color: theme.colors.primary }]}>Retry</Text>
                  </Pressable>
                ) : null}
                <Pressable accessibilityRole="button" accessibilityLabel={`Retake the ${productName} photo`} onPress={onRetakePhoto} disabled={photoDisabled} style={styles.linkButton}>
                  <Text style={[theme.typography.label, styles.bold, { color: theme.colors.text }]}>Retake</Text>
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel={`Remove the ${productName} photo`} onPress={onRemovePhoto} style={styles.linkButton}>
                  <Text style={[theme.typography.label, styles.bold, { color: theme.colors.danger }]}>Remove</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.photoButtonsRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Take a photo of returned ${productName}`}
              accessibilityState={{ disabled: photoDisabled }}
              onPress={onTakePhoto}
              disabled={photoDisabled}
              style={[styles.photoButton, { borderColor: theme.colors.border, backgroundColor: theme.colors.background, opacity: photoDisabled ? 0.5 : 1 }]}>
              <Icon name="camera" size={15} color={theme.colors.text} />
              <Text style={[theme.typography.bodySmall, styles.bold, { color: theme.colors.text }]}>Camera</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Choose a photo of returned ${productName} from the gallery`}
              accessibilityState={{ disabled: photoDisabled }}
              onPress={onPickPhoto}
              disabled={photoDisabled}
              style={[styles.photoButton, { borderColor: theme.colors.border, backgroundColor: theme.colors.background, opacity: photoDisabled ? 0.5 : 1 }]}>
              <Icon name="image" size={15} color={theme.colors.text} />
              <Text style={[theme.typography.bodySmall, styles.bold, { color: theme.colors.text }]}>Gallery</Text>
            </Pressable>
          </View>
        )}
        {!product ? (
          <Text style={[theme.typography.label, styles.mt6, { color: theme.colors.textFaint }]}>Choose a product, then add its photo.</Text>
        ) : null}
        {photoError ? (
          <View style={styles.messageRow}>
            <Icon name="warning" size={12} color={theme.colors.danger} />
            <Text style={[theme.typography.label, styles.flexShrink, { color: theme.colors.danger }]}>{photoError}</Text>
          </View>
        ) : null}
        {showPhotoRequired ? (
          <View style={styles.messageRow} accessibilityLiveRegion="polite">
            <Icon name="warning" size={12} color={theme.colors.danger} />
            <Text style={[theme.typography.label, styles.bold, { color: theme.colors.danger }]}>Photo required</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, padding: 12, marginBottom: 8 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  productButton: { flex: 1, height: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 },
  removeButton: { width: 36, height: 40, alignItems: 'center', justifyContent: 'center' },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepper: { flexDirection: 'row', alignItems: 'center', height: 34, borderWidth: 1 },
  stepperButton: { width: 30, alignItems: 'center', justifyContent: 'center' },
  messageRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  photoArea: { marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  photoButtonsRow: { flexDirection: 'row', gap: 8 },
  photoButton: { flex: 1, height: 40, borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  photoRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  thumb: { width: 64, height: 64, borderWidth: 1, overflow: 'hidden' },
  thumbImage: { width: '100%', height: '100%' },
  thumbOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  photoBody: { flex: 1, minWidth: 0 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  photoActions: { flexDirection: 'row', gap: 4, marginTop: 4 },
  linkButton: { minHeight: 32, paddingHorizontal: 6, justifyContent: 'center' },
  flexShrink: { flexShrink: 1 },
  bold: { fontWeight: '700' },
  mt6: { marginTop: 6 },
});
