import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Icon, type IconName, ListThumb, SmallButton } from '@/shared/ui';
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
  /** Position in the list — picks the thumbnail's pastel. */
  index?: number;
}

/** "Banana Bread" → "BB" for the row's pastel thumbnail. */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
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
  index = 0,
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
          backgroundColor: theme.colors.cardFill,
          borderColor: showPhotoRequired || isDuplicate ? theme.colors.danger : theme.colors.cardBorder,
        },
      ]}>
      <View style={styles.topRow}>
        {product ? <ListThumb text={initials(product.name)} index={index} /> : <ListThumb icon="search" index={index} />}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={product ? `Product: ${product.name}. Change product` : 'Choose a product'}
          onPress={onPressSelect}
          style={styles.productButton}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: product ? theme.colors.text : theme.colors.textFaint }]} numberOfLines={1}>
              {product ? product.name : 'Search product…'}
            </Text>
            <Icon name="chevron-down" size={14} color={theme.colors.textFaint} />
          </View>
          <Text style={[styles.xs, { color: theme.colors.textFaint }]}>{available ?? '—'} available</Text>
        </Pressable>
        <View style={[styles.stepper, { borderColor: atLimit ? theme.colors.warning : theme.colors.border, backgroundColor: theme.isDark ? 'transparent' : theme.colors.surface }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Decrease return quantity" onPress={onDecrement} style={styles.stepperButton}>
            <Icon name="minus" size={14} color={theme.colors.textSecondary} />
          </Pressable>
          <Text
            accessibilityLabel={`Return quantity ${qty}`}
            style={[styles.stepperValue, { color: theme.colors.text, borderColor: theme.colors.border }]}>
            {qty}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Increase return quantity"
            accessibilityState={{ disabled: atLimit }}
            onPress={onIncrement}
            disabled={atLimit}
            style={styles.stepperButton}>
            <Icon name="plus" size={14} color={atLimit ? theme.colors.textFaint : theme.colors.primary} />
          </Pressable>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={`Delete ${productName} line`} onPress={onRemove} hitSlop={6} style={styles.removeButton}>
          <Icon name="trash" size={16} color={theme.colors.danger} />
        </Pressable>
      </View>
      {isDuplicate ? (
        <View style={styles.messageRow}>
          <Icon name="warning" size={12} color={theme.colors.danger} />
          <Text style={[theme.typography.label, { color: theme.colors.danger }]}>Already on this return — change or delete this line</Text>
        </View>
      ) : null}
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
              style={[styles.thumb, { borderColor: theme.colors.border }]}>
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
            <SmallButton
              label="Camera"
              icon="camera"
              kind="soft"
              size="sm"
              accessibilityLabel={`Take a photo of returned ${productName}`}
              disabled={photoDisabled}
              onPress={onTakePhoto}
              style={styles.flex1}
            />
            <SmallButton
              label="Gallery"
              icon="image"
              size="sm"
              accessibilityLabel={`Choose a photo of returned ${productName} from the gallery`}
              disabled={photoDisabled}
              onPress={onPickPhoto}
              style={styles.flex1}
            />
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
  card: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  productButton: { flex: 1, minWidth: 0, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  name: { flexShrink: 1, fontSize: 14, lineHeight: 20, fontWeight: '600', letterSpacing: -0.2 },
  xs: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  // The redesign's `.stepper`: one 1.5-hairline box, −/qty/+ segments, the plus in the accent.
  stepper: { flexDirection: 'row', alignItems: 'stretch', height: 36, borderWidth: 1.5, borderRadius: 13, overflow: 'hidden' },
  stepperButton: { width: 30, alignItems: 'center', justifyContent: 'center' },
  stepperValue: {
    minWidth: 32,
    paddingHorizontal: 4,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    textAlign: 'center',
    textAlignVertical: 'center',
    lineHeight: 33,
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  removeButton: { width: 28, height: 36, alignItems: 'center', justifyContent: 'center' },
  messageRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  photoArea: { marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  photoButtonsRow: { flexDirection: 'row', gap: 8 },
  photoRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  thumb: { width: 64, height: 64, borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  thumbImage: { width: '100%', height: '100%' },
  thumbOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  photoBody: { flex: 1, minWidth: 0 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  photoActions: { flexDirection: 'row', gap: 4, marginTop: 4 },
  linkButton: { minHeight: 32, paddingHorizontal: 6, justifyContent: 'center' },
  flex1: { flex: 1 },
  flexShrink: { flexShrink: 1 },
  bold: { fontWeight: '700' },
  mt6: { marginTop: 6 },
});
