import { useState } from 'react';
import { lookupSupportReference, useCreateSupportTicket } from '@/api';
import { mapErrorToMessage } from '@/shared/helpers';
import type { SupportReference } from '@/api';

/** branchApp.md screen 25 — New Query: look up a reference, then describe the issue. */
export function useNewQueryForm() {
  const createTicket = useCreateSupportTicket();

  const [referenceId, setReferenceId] = useState('');
  const [reference, setReference] = useState<SupportReference | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [message, setMessage] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const lookup = async () => {
    const ref = referenceId.trim();
    if (!ref) return;
    setIsLookingUp(true);
    setLookupError(null);
    setReference(null);
    try {
      const found = await lookupSupportReference(ref);
      setReference(found);
    } catch (error) {
      setLookupError(mapErrorToMessage(error));
    } finally {
      setIsLookingUp(false);
    }
  };

  const canSubmit = !!reference && message.trim().length >= 3 && !createTicket.isPending;

  const submit = async (): Promise<boolean> => {
    if (!canSubmit || !reference) return false;
    setSubmitError(null);
    try {
      await createTicket.mutateAsync({ referenceId: reference.referenceId, message: message.trim() });
      return true;
    } catch (error) {
      setSubmitError(mapErrorToMessage(error));
      return false;
    }
  };

  return {
    referenceId,
    setReferenceId,
    reference,
    lookupError,
    isLookingUp,
    lookup,
    message,
    setMessage,
    canSubmit,
    isSubmitting: createTicket.isPending,
    submitError,
    submit,
  };
}
