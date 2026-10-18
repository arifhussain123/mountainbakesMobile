import { useRef, useState } from 'react';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import {
  discardAttachment,
  generateIdempotencyKey,
  getBusinessDate,
  uploadAttachment,
  useCreateEmployeeAdvance,
  type Attachment,
  type FinanceAccount,
  type FinanceEmployee,
  type FinancePaymentMethod,
} from '@/api';
import { mapErrorToMessage } from '@/shared/helpers';

const PHOTO_PICKER_OPTIONS = { mediaType: 'photo' as const, maxWidth: 1600, maxHeight: 1600, quality: 0.8 as const, includeBase64: false };

/** mountainbakesFinance.html screen 08 — New Advance. */
export function useNewEmployeeAdvanceForm() {
  const create = useCreateEmployeeAdvance();

  const [employee, setEmployee] = useState<FinanceEmployee | null>(null);
  const [advanceInput, setAdvanceInput] = useState('0');
  const [bonusInput, setBonusInput] = useState('0');
  const [loanInput, setLoanInput] = useState('0');
  const [account, setAccount] = useState<FinanceAccount>('cash');
  const [paymentMethod, setPaymentMethod] = useState<FinancePaymentMethod>('cash');
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState<Attachment | null>(null);
  const [isPickingPhoto, setIsPickingPhoto] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const idempotencyKeyRef = useRef(generateIdempotencyKey('finance_advance'));

  const businessDate = getBusinessDate();
  const advance = Math.max(0, parseFloat(advanceInput) || 0);
  const bonus = Math.max(0, parseFloat(bonusInput) || 0);
  const loan = Math.max(0, parseFloat(loanInput) || 0);
  const total = Math.round((advance + bonus + loan) * 100) / 100;

  const capturePhoto = async (source: 'camera' | 'gallery') => {
    setSubmitError(null);
    setIsPickingPhoto(true);
    try {
      const result = source === 'camera' ? await launchCamera(PHOTO_PICKER_OPTIONS) : await launchImageLibrary(PHOTO_PICKER_OPTIONS);
      const asset = result.assets?.[0];
      if (!asset?.uri) return;
      const attachment = await uploadAttachment('finance_transaction', { uri: asset.uri, type: asset.type ?? 'image/jpeg', fileName: asset.fileName ?? 'advance.jpg' });
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
    setEmployee(null);
    setAdvanceInput('0');
    setBonusInput('0');
    setLoanInput('0');
    setAccount('cash');
    setPaymentMethod('cash');
    setNotes('');
    removePhoto();
    idempotencyKeyRef.current = generateIdempotencyKey('finance_advance');
  };

  const canSubmit = !!employee && total > 0 && !!photo && !isPickingPhoto;

  const submit = async (asDraft: boolean): Promise<boolean> => {
    if (!employee || total <= 0 || !photo) return false;
    setSubmitError(null);
    try {
      await create.mutateAsync({
        input: {
          employeeId: employee.id,
          businessDate,
          advanceAmount: advance,
          bonusAmount: bonus,
          loanAmount: loan,
          paymentMethod,
          account,
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
    employee,
    setEmployee,
    advanceInput,
    setAdvanceInput,
    bonusInput,
    setBonusInput,
    loanInput,
    setLoanInput,
    total,
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
