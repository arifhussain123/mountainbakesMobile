import { useRef, useState } from 'react';
import { generateIdempotencyKey, getBusinessDate, useCreateEmployee } from '@/api';
import { mapErrorToMessage } from '@/shared/helpers';

/** mountainbakesFinance.html screen 09 — Add Employee. */
export function useAddEmployeeForm() {
  const create = useCreateEmployee();

  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [designation, setDesignation] = useState('');
  const [baseSalaryInput, setBaseSalaryInput] = useState('');
  const [phone, setPhone] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const idempotencyKeyRef = useRef(generateIdempotencyKey('finance_employee'));

  const canSubmit = name.trim().length >= 2 && department.trim().length >= 1 && designation.trim().length >= 1;

  const submit = async (): Promise<boolean> => {
    if (!canSubmit) return false;
    setSubmitError(null);
    try {
      await create.mutateAsync({
        input: {
          name: name.trim(),
          department: department.trim(),
          designation: designation.trim(),
          baseSalary: Math.max(0, parseFloat(baseSalaryInput) || 0),
          phone: phone.trim() || undefined,
          joinedOn: getBusinessDate(),
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
    name,
    setName,
    department,
    setDepartment,
    designation,
    setDesignation,
    baseSalaryInput,
    setBaseSalaryInput,
    phone,
    setPhone,
    canSubmit,
    isSubmitting: create.isPending,
    submitError,
    submit,
  };
}
