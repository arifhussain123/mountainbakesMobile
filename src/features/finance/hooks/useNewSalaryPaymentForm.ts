import { useRef, useState } from 'react';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import {
  discardAttachment,
  generateIdempotencyKey,
  getBusinessDate,
  uploadAttachment,
  useCreateSalaryPayment,
  useEmployeeAdvanceSummary,
  type Attachment,
  type FinanceAccount,
  type FinanceEmployee,
  type FinancePaymentMethod,
} from '@/api';
import { mapErrorToMessage } from '@/shared/helpers';

const PHOTO_PICKER_OPTIONS = { mediaType: 'photo' as const, maxWidth: 1600, maxHeight: 1600, quality: 0.8 as const, includeBase64: false };

/** mountainbakesFinance.html screen 07 — New Payslip. Salary month fixed to the current business month and payment date to today — no date-picker library in this app yet. */
export function useNewSalaryPaymentForm() {
  const create = useCreateSalaryPayment();

  const [employee, setEmployee] = useState<FinanceEmployee | null>(null);
  const [grossInput, setGrossInput] = useState('');
  const [bonusInput, setBonusInput] = useState('0');
  const [deductionInput, setDeductionInput] = useState('0');
  const [account, setAccount] = useState<FinanceAccount>('cash');
  const [paymentMethod, setPaymentMethod] = useState<FinancePaymentMethod>('cash');
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState<Attachment | null>(null);
  const [isPickingPhoto, setIsPickingPhoto] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [recoverAdvanceIds, setRecoverAdvanceIds] = useState<string[]>([]);
  const idempotencyKeyRef = useRef(generateIdempotencyKey('finance_salary'));

  const advanceSummary = useEmployeeAdvanceSummary(employee?.id ?? '');

  const businessDate = getBusinessDate();
  const salaryMonth = businessDate.slice(0, 7);

  const gross = Math.max(0, parseFloat(grossInput) || 0);
  const bonus = Math.max(0, parseFloat(bonusInput) || 0);
  const deduction = Math.max(0, parseFloat(deductionInput) || 0);
  const net = Math.round((gross + bonus - deduction) * 100) / 100;

  const toggleAdvance = (advanceId: string) => {
    setRecoverAdvanceIds((ids) => (ids.includes(advanceId) ? ids.filter((i) => i !== advanceId) : [...ids, advanceId]));
  };

  const capturePhoto = async (source: 'camera' | 'gallery') => {
    setSubmitError(null);
    setIsPickingPhoto(true);
    try {
      const result = source === 'camera' ? await launchCamera(PHOTO_PICKER_OPTIONS) : await launchImageLibrary(PHOTO_PICKER_OPTIONS);
      const asset = result.assets?.[0];
      if (!asset?.uri) return;
      const attachment = await uploadAttachment('finance_transaction', { uri: asset.uri, type: asset.type ?? 'image/jpeg', fileName: asset.fileName ?? 'payslip.jpg' });
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
    setGrossInput('');
    setBonusInput('0');
    setDeductionInput('0');
    setAccount('cash');
    setPaymentMethod('cash');
    setNotes('');
    setRecoverAdvanceIds([]);
    removePhoto();
    idempotencyKeyRef.current = generateIdempotencyKey('finance_salary');
  };

  const canSubmit = !!employee && net > 0 && !!photo && !isPickingPhoto;

  const submit = async (asDraft: boolean): Promise<boolean> => {
    if (!employee || net <= 0 || !photo) return false;
    setSubmitError(null);
    try {
      await create.mutateAsync({
        input: {
          employeeId: employee.id,
          salaryMonth,
          grossSalary: gross,
          bonus,
          deductions: deduction,
          paymentDate: businessDate,
          paymentMethod,
          account,
          notes: notes.trim() || undefined,
          asDraft,
          recoverAdvanceIds,
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
    grossInput,
    setGrossInput,
    bonusInput,
    setBonusInput,
    deductionInput,
    setDeductionInput,
    net,
    account,
    setAccount,
    paymentMethod,
    setPaymentMethod,
    notes,
    setNotes,
    salaryMonth,
    businessDate,
    photo,
    isPickingPhoto,
    capturePhoto,
    removePhoto,
    advanceSummary: advanceSummary.data,
    recoverAdvanceIds,
    toggleAdvance,
    canSubmit,
    isSubmitting: create.isPending,
    submitError,
    submit,
    reset,
  };
}
