import { useRef, useState } from 'react';
import { Alert, Linking, Pressable, Text, TextInput, View } from 'react-native';
import { useAuthStore } from '@/state';
import { tintFill, useAppTheme } from '@/shared/theme';
import { Icon, InfoBanner, ListThumb, MiniStat, PhotoViewer, PrimaryButton, SecondaryButton, useFormBottomSheetScroll, type IconName } from '@/shared/ui';
import { formatDisplayDate, formatDisplayTime } from '@/shared/utils';
import type { Product } from '@/api';
import { ProductPickerModal, ReturnLineRow, ReturnPhotoConfirmModal } from '../../components';
import { useReturnItemsForm, type CapturePhotoOutcome, type ReturnPhotoSource } from '../../hooks';
import { styles } from './styles';

export interface ReturnItemsSheetContentProps {
  onClose: () => void;
}

/** 2026 redesign B06 — Return Items, presented as a bottom sheet. One photo per returned product. */
export function ReturnItemsSheetContent({ onClose }: ReturnItemsSheetContentProps) {
  const theme = useAppTheme();
  const branchName = useAuthStore((state) => state.user?.branchName ?? '—');
  const form = useReturnItemsForm();
  const sheetScroll = useFormBottomSheetScroll();
  const [pickerForKey, setPickerForKey] = useState<string | null>(null);
  const [viewingKey, setViewingKey] = useState<string | null>(null);
  // Where each line sits in the sheet, for "scroll to the first line missing a photo".
  // The list sits inside the Items field (under its label), so its top is the field's y plus the list's y within it.
  const itemsFieldTop = useRef(0);
  const itemsListTop = useRef(0);
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
      if (top != null) sheetScroll?.scrollTo(itemsFieldTop.current + itemsListTop.current + top - 12);
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

  const fieldFill = theme.isDark ? theme.colors.cardFill : theme.colors.surface;
  const readOnlyField = (label: string, value: string, icon: IconName) => (
    <View style={[styles.field, styles.flex1]}>
      <Text style={[styles.label, { color: theme.colors.text }]}>{label}</Text>
      <View style={[styles.input, { backgroundColor: fieldFill, borderColor: theme.colors.border }]}>
        <Icon name={icon} size={20} color={theme.colors.textFaint} />
        <Text style={[styles.inputText, { color: theme.colors.text }]} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.body}>
      <View style={styles.grid2}>
        {readOnlyField('Date', formatDisplayDate(now.slice(0, 10)), 'calendar')}
        {readOnlyField('Time', formatDisplayTime(now), 'clock')}
      </View>

      <View
        style={styles.field}
        onLayout={(e) => {
          itemsFieldTop.current = e.nativeEvent.layout.y;
        }}>
        <Text style={[styles.label, { color: theme.colors.text }]}>
          Items <Text style={{ color: theme.colors.textFaint }}>· one photo each</Text>
        </Text>
        <View
          onLayout={(e) => {
            itemsListTop.current = e.nativeEvent.layout.y;
          }}>
          {form.lines.map((line, index) => (
            <ReturnLineRow
              key={line.key}
              index={index}
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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add another product"
            onPress={form.addLine}
            style={({ pressed }) => [
              styles.addRow,
              { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.cardBorder, opacity: pressed ? 0.8 : 1 },
            ]}>
            <ListThumb icon="plus" index={form.lines.length} />
            <Text style={[styles.addText, { color: theme.colors.primary }]}>Add another product</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: theme.colors.text }]}>
          Return reason <Text style={{ color: theme.colors.textFaint }}>(optional)</Text>
        </Text>
        <TextInput
          value={form.reason}
          onChangeText={form.setReason}
          placeholder="Damaged / unsold / expired…"
          placeholderTextColor={theme.colors.textFaint}
          multiline
          style={[styles.reasonInput, { borderColor: theme.colors.border, color: theme.colors.text, backgroundColor: fieldFill }]}
        />
      </View>

      {form.submitError ? <InfoBanner kind="bad">{form.submitError}</InfoBanner> : null}

      <View style={[styles.totals, { backgroundColor: tintFill(theme) }]}>
        <MiniStat label="Products" value={String(form.totalProducts)} style={styles.half} />
        <MiniStat label="Total units" value={String(form.totalUnits)} style={styles.half} />
        <MiniStat
          label="Photos"
          value={`${form.photosReady} of ${form.photosTotal}`}
          valueColor={form.photosReady < form.photosTotal ? theme.colors.danger : undefined}
          style={styles.half}
        />
        <MiniStat label="Branch" value={branchName} style={styles.half} />
      </View>

      {footerHint ? <Text style={[styles.hint, { color: theme.colors.textFaint }]}>{footerHint}</Text> : null}

      <View style={styles.actionsRow}>
        <View style={styles.flex1}>
          <SecondaryButton label="Cancel" onPress={onClose} />
        </View>
        <View style={styles.save}>
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
