import { useRef, useState } from 'react';
import { Alert, Linking, Text, TextInput, View } from 'react-native';
import { useAuthStore } from '@/state';
import { useAppTheme } from '@/shared/theme';
import { PhotoViewer, PrimaryButton, SecondaryButton, useFormBottomSheetScroll } from '@/shared/ui';
import { formatDisplayDate, formatDisplayTime } from '@/shared/utils';
import type { Product } from '@/api';
import { ProductPickerModal, ReturnLineRow, ReturnPhotoConfirmModal } from '../../components';
import { useReturnItemsForm, type CapturePhotoOutcome, type ReturnPhotoSource } from '../../hooks';
import { styles } from './styles';

export interface ReturnItemsSheetContentProps {
  onClose: () => void;
}

/** branchApp.md screen 06 — Return Items, presented as a bottom sheet. One photo per returned product. */
export function ReturnItemsSheetContent({ onClose }: ReturnItemsSheetContentProps) {
  const theme = useAppTheme();
  const branchName = useAuthStore((state) => state.user?.branchName ?? '—');
  const form = useReturnItemsForm();
  const sheetScroll = useFormBottomSheetScroll();
  const [pickerForKey, setPickerForKey] = useState<string | null>(null);
  const [viewingKey, setViewingKey] = useState<string | null>(null);
  // Where each line sits in the sheet, for "scroll to the first line missing a photo".
  const itemsTop = useRef(0);
  const lineTops = useRef(new Map<string, number>());

  const now = new Date().toISOString();
  const pendingLine = form.pendingPhoto ? form.lines.find((l) => l.key === form.pendingPhoto!.lineKey) : null;
  const viewingLine = viewingKey ? form.lines.find((l) => l.key === viewingKey) : null;

  const handleSelectProduct = (product: Product) => {
    if (pickerForKey) form.updateLine(pickerForKey, { product, qtyInput: '1' });
    setPickerForKey(null);
  };

  // Permission is asked by the OS only when Camera is tapped; a refusal is explained here, with a way round it.
  const explainOutcome = (lineKey: string, source: ReturnPhotoSource, outcome: CapturePhotoOutcome) => {
    if (outcome === 'permission_denied') {
      Alert.alert(
        source === 'camera' ? 'Camera access is off' : 'Photo access is off',
        source === 'camera'
          ? 'Mountain Bakes needs the camera to photograph returned items. Choose a photo from the Gallery instead, or turn camera access on in Settings.'
          : 'Mountain Bakes needs photo access to attach a picture of returned items. Turn it on in Settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          ...(source === 'camera' ? [{ text: 'Use Gallery', onPress: () => void capture(lineKey, 'gallery') }] : []),
          { text: 'Open Settings', onPress: () => void Linking.openSettings() },
        ],
      );
    } else if (outcome === 'camera_unavailable') {
      Alert.alert('No camera available', 'This phone has no camera the app can use. Choose a photo from the Gallery instead.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Use Gallery', onPress: () => void capture(lineKey, 'gallery') },
      ]);
    }
  };

  const capture = async (lineKey: string, source: ReturnPhotoSource) => {
    const outcome = await form.capturePhoto(lineKey, source);
    explainOutcome(lineKey, source, outcome);
  };

  const retakePending = async () => {
    const pending = form.pendingPhoto;
    if (!pending) return;
    const outcome = await form.retakePendingPhoto();
    explainOutcome(pending.lineKey, pending.source, outcome);
  };

  const handleSubmit = async () => {
    const outcome = await form.submit();
    if (outcome.status === 'blocked' && outcome.firstMissingPhotoKey) {
      const top = lineTops.current.get(outcome.firstMissingPhotoKey);
      if (top != null) sheetScroll?.scrollTo(itemsTop.current + top - 12);
    } else if (outcome.status === 'saved') {
      Alert.alert('Return saved', 'Your return has been sent to Production for review.', [{ text: 'OK', onPress: onClose }]);
    } else if (outcome.status === 'queued') {
      Alert.alert(
        'Saved on this phone',
        "There's no connection right now. The return and its photos will be sent automatically when you're back online — you can see it under Return Stock.",
        [{ text: 'OK', onPress: onClose }],
      );
    }
  };

  const footerHint = form.isUploading
    ? 'Waiting for photos to finish uploading…'
    : form.blockedOnlyByPhotos
      ? 'Every product needs its own photo.'
      : form.isOffline
        ? "You're offline — Save keeps the return on this phone and sends it when you're back online."
        : null;

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

      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.lg }]}>ITEMS · ONE PHOTO EACH</Text>
      <View
        style={{ marginTop: 8 }}
        onLayout={(e) => {
          itemsTop.current = e.nativeEvent.layout.y;
        }}>
        {form.lines.map((line) => (
          <ReturnLineRow
            key={line.key}
            product={line.product}
            qty={line.qty}
            available={line.available}
            isDuplicate={line.isDuplicate}
            photo={line.photo}
            photoError={form.captureErrors[line.key] ?? null}
            showPhotoRequired={form.showPhotoErrors && form.missingPhotoKeys.includes(line.key)}
            photoDisabled={!line.product || form.isPickingPhoto}
            onLayout={(e) => lineTops.current.set(line.key, e.nativeEvent.layout.y)}
            onPressSelect={() => setPickerForKey(line.key)}
            onIncrement={() => form.updateLine(line.key, { qtyInput: String(Math.min(line.available ?? 0, line.qty + 1)) })}
            onDecrement={() => form.updateLine(line.key, { qtyInput: String(Math.max(1, line.qty - 1)) })}
            onRemove={() => {
              lineTops.current.delete(line.key);
              form.removeLine(line.key);
            }}
            onTakePhoto={() => void capture(line.key, 'camera')}
            onPickPhoto={() => void capture(line.key, 'gallery')}
            onOpenPhoto={() => setViewingKey(line.key)}
            onRetakePhoto={() => void capture(line.key, line.photo?.source ?? 'camera')}
            onRemovePhoto={() => form.removePhoto(line.key)}
            onRetryUpload={() => form.retryUpload(line.key)}
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
          <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
            Photos{' '}
            <Text style={{ color: form.photosReady < form.photosTotal ? theme.colors.danger : theme.colors.primary, fontWeight: '700' }}>
              {form.photosReady} of {form.photosTotal}
            </Text>
          </Text>
        </View>
        {footerHint ? <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 6 }]}>{footerHint}</Text> : null}
        <View style={styles.actionsRow}>
          <View style={{ flex: 1 }}>
            <SecondaryButton label="Cancel" onPress={onClose} />
          </View>
          <View style={{ flex: 1.4 }}>
            <PrimaryButton
              label="Save Return"
              onPress={() => void handleSubmit()}
              loading={form.isSubmitting}
              // Missing photos only: still tappable, so the tap can scroll to the line that needs one.
              inactive={form.blockedOnlyByPhotos}
              disabled={!form.canSubmit && !form.blockedOnlyByPhotos}
            />
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

      <ReturnPhotoConfirmModal
        uri={form.pendingPhoto?.previewUri ?? null}
        productName={pendingLine?.product?.name ?? 'this product'}
        onUse={form.confirmPendingPhoto}
        onRetake={() => void retakePending()}
        onCancel={form.discardPendingPhoto}
      />

      <PhotoViewer
        visible={!!viewingLine?.photo}
        uri={viewingLine?.photo?.previewUri ?? null}
        accessibilityLabel={`Photo of returned ${viewingLine?.product?.name ?? 'product'}`}
        onClose={() => setViewingKey(null)}
      />
    </View>
  );
}
