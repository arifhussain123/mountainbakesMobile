import { useRef, useState } from 'react';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { discardAttachment, generateIdempotencyKey, uploadAttachment, useCreateCashTransfer } from '@/api';
import { mapErrorToMessage } from '@/shared/helpers';
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

/**
 * branchApp.md screen 08 — Cash Deposit. "Auto" (fill from the Daily Sale
 * Record) is deliberately not wired — that record doesn't exist yet (Slice 8);
 * manual entry only until then, per the implementation plan's own note.
 */
export function useCashDepositForm() {
  const createTransfer = useCreateCashTransfer();

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
  };
}
