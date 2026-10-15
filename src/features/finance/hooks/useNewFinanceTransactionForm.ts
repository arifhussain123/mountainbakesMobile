import { useState } from 'react';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import {
  discardAttachment,
  getBusinessDate,
  uploadAttachment,
  useCreateFinanceTransaction,
  type Attachment,
  type FinanceAccount,
  type FinancePaymentMethod,
  type LedgerHeadType,
} from '@/api';
import { mapErrorToMessage } from '@/shared/helpers';

const PHOTO_PICKER_OPTIONS = { mediaType: 'photo' as const, maxWidth: 1600, maxHeight: 1600, quality: 0.8 as const, includeBase64: false };

/** mountainbakesFinance.html screen 05 — New Entry. Branch/reference are optional server-side; left out of this form pass (company-wide, no reference) to keep scope to the fields every entry needs. */
export function useNewFinanceTransactionForm() {
  const create = useCreateFinanceTransaction();

  const [type, setType] = useState<LedgerHeadType>('expense');
  const [ledgerHeadId, setLedgerHeadId] = useState<string | null>(null);
  const [amountInput, setAmountInput] = useState('');
  const [account, setAccount] = useState<FinanceAccount>('cash');
  const [paymentMethod, setPaymentMethod] = useState<FinancePaymentMethod>('cash');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState<Attachment | null>(null);
  const [isPickingPhoto, setIsPickingPhoto] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const amount = Math.max(0, parseFloat(amountInput) || 0);
  const businessDate = getBusinessDate();

  const capturePhoto = async (source: 'camera' | 'gallery') => {
    setSubmitError(null);
    setIsPickingPhoto(true);
    try {
      const result = source === 'camera' ? await launchCamera(PHOTO_PICKER_OPTIONS) : await launchImageLibrary(PHOTO_PICKER_OPTIONS);
      const asset = result.assets?.[0];
      if (!asset?.uri) return;
      const attachment = await uploadAttachment('finance_transaction', { uri: asset.uri, type: asset.type ?? 'image/jpeg', fileName: asset.fileName ?? 'receipt.jpg' });
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

  const reset = () => {
    setType('expense');
    setLedgerHeadId(null);
    setAmountInput('');
    setAccount('cash');
    setPaymentMethod('cash');
    setDescription('');
    setNotes('');
    removePhoto();
    setSubmitError(null);
  };

  const canSubmit = !!ledgerHeadId && amount > 0 && description.trim().length >= 2 && !!photo && !isPickingPhoto;

  const submit = async (asDraft: boolean): Promise<boolean> => {
    if (!ledgerHeadId || amount <= 0 || description.trim().length < 2 || !photo) return false;
    setSubmitError(null);
    try {
      await create.mutateAsync({
        ledgerHeadId,
        description: description.trim(),
        amount,
        paymentMethod,
        account,
        businessDate,
        notes: notes.trim() || undefined,
        asDraft,
        attachmentIds: [photo.id],
      });
      return true;
    } catch (error) {
      setSubmitError(mapErrorToMessage(error));
      return false;
    }
  };

  return {
    type,
    setType,
    ledgerHeadId,
    setLedgerHeadId,
    amountInput,
    setAmountInput,
    amount,
    account,
    setAccount,
    paymentMethod,
    setPaymentMethod,
    description,
    setDescription,
    notes,
    setNotes,
    businessDate,
    photo,
    isPickingPhoto,
    capturePhoto,
    removePhoto,
    canSubmit,
    isSubmitting: create.isPending,
    submitError,
    submit,
    reset,
  };
}
