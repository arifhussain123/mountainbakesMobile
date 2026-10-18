import { useRef, useState } from 'react';
import { Alert } from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import {
  discardAttachment,
  generateIdempotencyKey,
  getBusinessDate,
  uploadAttachment,
  useCashTransfers,
  useCreateCashTransfer,
  useDailySaleRecords,
} from '@/api';
import { mapErrorToMessage } from '@/shared/helpers';
import { formatCurrency } from '@/shared/utils';
import type { Attachment } from '@/api';

const PHOTO_PICKER_OPTIONS = {
  mediaType: 'photo' as const,
  maxWidth: 1600,
  maxHeight: 1600,
  quality: 0.8 as const,
  includeBase64: false,
};

function parseAmount(raw: string): number {
  return Math.max(0, parseFloat(raw) || 0);
}

/** Blank for zero (a 0 field reads as "not entered", matching the web's own `amountText`), otherwise 2dp, trailing zeros trimmed. */
function amountInputText(amount: number): string {
  if (amount <= 0) return '';
  const rounded = Math.round(amount * 100) / 100;
  return String(rounded);
}

/**
 * branchApp.md screen 08 — Cash Deposit. "Auto" fills from the branch's own
 * Daily Sale Record for today, ported from the web's `CashDepositModal.tsx`:
 * cash = max(0, expectedCashInHand) ("Cash on Table"), easypaisa =
 * autoEasypaisa, bank = autoBank. Foodpanda has no channel field — it's a
 * hint only, keyed into Easypaisa by hand, never auto-filled. Auto refuses
 * outright (never subtracts) once any non-rejected transfer already exists
 * for today — there's no backend "already deposited" figure, so this is
 * computed here via the same-day transfers list, matching the web's guard.
 */
export function useCashDepositForm() {
  const createTransfer = useCreateCashTransfer();
  const today = getBusinessDate();

  const dailySaleQuery = useDailySaleRecords({ from: today, to: today });
  const todayTransfersQuery = useCashTransfers({ from: today, to: today, limit: 10 });

  const [cashInput, setCashInput] = useState('');
  const [easypaisaInput, setEasypaisaInput] = useState('');
  const [bankInput, setBankInput] = useState('');
  const [fuelInput, setFuelInput] = useState('');
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState<Attachment | null>(null);
  const [isPickingPhoto, setIsPickingPhoto] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const idempotencyKeyRef = useRef(generateIdempotencyKey('cash_transfer'));

  const cashAmount = parseAmount(cashInput);
  const easypaisaAmount = parseAmount(easypaisaInput);
  const bankAmount = parseAmount(bankInput);
  const fuelCharges = parseAmount(fuelInput);
  const totalAmount = Math.round((cashAmount + easypaisaAmount + bankAmount) * 100) / 100;

  // "Payment proof photo is required" (CreateCashTransferSchema) whenever any
  // money beyond fuel is claimed — a fuel-only deposit may go without one.
  const photoRequired = totalAmount > 0;

  const record = dailySaleQuery.data?.records[0];
  const existingTransferToday = todayTransfersQuery.data?.transfers.find((t) => t.status !== 'rejected');

  const handleAutoFill = () => {
    if (existingTransferToday) {
      Alert.alert('Auto-fill unavailable', `${existingTransferToday.transferNo} already covers this date — enter this deposit's amounts by hand.`);
      return;
    }
    if (!record) {
      Alert.alert('Auto-fill unavailable', 'No Daily Sale Record found for this date.');
      return;
    }
    setCashInput(amountInputText(Math.max(0, record.expectedCashInHand)));
    setEasypaisaInput(amountInputText(record.autoEasypaisa));
    setBankInput(amountInputText(record.autoBank));
  };

  const autoFillDisabled = dailySaleQuery.isLoading || todayTransfersQuery.isLoading || !!existingTransferToday;

  // "Encourage correct splits" (Phase 2) — a soft, non-blocking hint, never
  // shown once Easypaisa/Bank already have something entered, and only when
  // the day's record actually shows money in a channel the branch left at 0.
  const splitHint =
    record && cashAmount > 0 && easypaisaAmount === 0 && bankAmount === 0 && record.autoEasypaisa > 0
      ? `Today's sales include Easypaisa ${formatCurrency(record.autoEasypaisa)}. Use Auto to split it correctly.`
      : record && cashAmount > 0 && easypaisaAmount === 0 && bankAmount === 0 && record.autoBank > 0
        ? `Today's sales include Bank ${formatCurrency(record.autoBank)}. Use Auto to split it correctly.`
        : null;

  const capturePhoto = async (source: 'camera' | 'gallery') => {
    setSubmitError(null);
    setIsPickingPhoto(true);
    try {
      const result = source === 'camera' ? await launchCamera(PHOTO_PICKER_OPTIONS) : await launchImageLibrary(PHOTO_PICKER_OPTIONS);
      const asset = result.assets?.[0];
      if (!asset?.uri) return;
      const attachment = await uploadAttachment('cash_transfer', {
        uri: asset.uri,
        type: asset.type ?? 'image/jpeg',
        fileName: asset.fileName ?? 'deposit.jpg',
      });
      setPhoto(attachment);
    } catch (error) {
      setSubmitError(mapErrorToMessage(error));
    } finally {
      setIsPickingPhoto(false);
    }
  };

  const removePhoto = () => {
    if (photo) void discardAttachment(photo.id).catch(() => {});
    setPhoto(null);
  };

  const hasAnyAmount = totalAmount > 0 || fuelCharges > 0;
  const canSubmit = hasAnyAmount && (!photoRequired || !!photo) && !createTransfer.isPending && !isPickingPhoto;

  const clear = () => {
    setCashInput('');
    setEasypaisaInput('');
    setBankInput('');
    setFuelInput('');
    setNote('');
    removePhoto();
    setSubmitError(null);
  };

  const submit = async (): Promise<boolean> => {
    if (!canSubmit) return false;
    setSubmitError(null);
    try {
      await createTransfer.mutateAsync({
        input: {
          cashAmount,
          easypaisaAmount,
          bankAmount,
          fuelCharges,
          totalAmount,
          note: note.trim() || undefined,
          attachmentIds: photo ? [photo.id] : [],
        },
        idempotencyKey: idempotencyKeyRef.current,
      });
      return true;
    } catch (error) {
      setSubmitError(mapErrorToMessage(error));
      return false;
    }
  };

  return {
    cashInput,
    setCashInput,
    easypaisaInput,
    setEasypaisaInput,
    bankInput,
    setBankInput,
    fuelInput,
    setFuelInput,
    note,
    setNote,
    totalAmount,
    photoRequired,
    photo,
    isPickingPhoto,
    capturePhoto,
    removePhoto,
    canSubmit,
    isSubmitting: createTransfer.isPending,
    submitError,
    submit,
    clear,
    handleAutoFill,
    autoFillDisabled,
    splitHint,
  };
}
