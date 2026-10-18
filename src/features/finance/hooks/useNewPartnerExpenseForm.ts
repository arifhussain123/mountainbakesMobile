import { useRef, useState } from 'react';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import {
  discardAttachment,
  generateIdempotencyKey,
  getBusinessDate,
  uploadAttachment,
  useCreatePartnerExpense,
  type Attachment,
  type FinanceAccount,
  type FinancePartner,
  type FinancePaymentMethod,
  type PartnerTxnKind,
} from '@/api';
import { mapErrorToMessage } from '@/shared/helpers';

const PHOTO_PICKER_OPTIONS = { mediaType: 'photo' as const, maxWidth: 1600, maxHeight: 1600, quality: 0.8 as const, includeBase64: false };

/** mountainbakesFinance.html screen 13 — New Partner Advance / Draw. */
export function useNewPartnerExpenseForm(initialKind: PartnerTxnKind) {
  const create = useCreatePartnerExpense();

  const [partner, setPartner] = useState<FinancePartner | null>(null);
  const [txnKind, setTxnKind] = useState<PartnerTxnKind>(initialKind);
  const [amountInput, setAmountInput] = useState('');
  const [account, setAccount] = useState<FinanceAccount>('cash');
  const [paymentMethod, setPaymentMethod] = useState<FinancePaymentMethod>('cash');
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState<Attachment | null>(null);
  const [isPickingPhoto, setIsPickingPhoto] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const idempotencyKeyRef = useRef(generateIdempotencyKey('finance_partner_expense'));

  const businessDate = getBusinessDate();
  const amount = Math.max(0, parseFloat(amountInput) || 0);

  const capturePhoto = async (source: 'camera' | 'gallery') => {
    setSubmitError(null);
    setIsPickingPhoto(true);
    try {
      const result = source === 'camera' ? await launchCamera(PHOTO_PICKER_OPTIONS) : await launchImageLibrary(PHOTO_PICKER_OPTIONS);
      const asset = result.assets?.[0];
      if (!asset?.uri) return;
      const attachment = await uploadAttachment('finance_transaction', { uri: asset.uri, type: asset.type ?? 'image/jpeg', fileName: asset.fileName ?? 'partner.jpg' });
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
    setPartner(null);
    setAmountInput('');
    setAccount('cash');
    setPaymentMethod('cash');
    setNotes('');
    removePhoto();
    idempotencyKeyRef.current = generateIdempotencyKey('finance_partner_expense');
  };

  const canSubmit = !!partner && amount > 0 && !!photo && !isPickingPhoto;

  const submit = async (asDraft: boolean): Promise<boolean> => {
    if (!partner || amount <= 0 || !photo) return false;
    setSubmitError(null);
    try {
      await create.mutateAsync({
        input: {
          partnerId: partner.id,
          txnKind,
          amount,
          paymentMethod,
          account,
          businessDate,
          notes: notes.trim() || undefined,
          asDraft,
          attachmentIds: [photo.id],
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
    partner,
    setPartner,
    txnKind,
    setTxnKind,
    amountInput,
    setAmountInput,
    amount,
    account,
    setAccount,
    paymentMethod,
    setPaymentMethod,
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
