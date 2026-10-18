import { useEffect, useRef, useState } from 'react';
import { generateIdempotencyKey, isApiError, lookupSupportReference, useCreateSupportTicket, useSupportTickets } from '@/api';
import { mapErrorToMessage } from '@/shared/helpers';
import { useNetworkStatus } from '@/shared/hooks';
import { findOpenTicketForReference } from '../utils/duplicateCheck';
import { parseReferenceId, ISSUE_MESSAGE_MIN_LENGTH } from '../schemas';
import type { SupportReference, SupportTicket } from '@/api';

export interface UseNewQueryFormOptions {
  /** Prefilled from "Report an issue" — already a valid, normalized reference ID, so this skips straight to looking it up. */
  prefillReferenceId?: string;
}

/** branchApp.md screen 25 — New Query: look up a reference, then describe the issue. */
export function useNewQueryForm({ prefillReferenceId }: UseNewQueryFormOptions = {}) {
  const createTicket = useCreateSupportTicket();
  const { data: ticketsData } = useSupportTickets();
  const { isOffline } = useNetworkStatus();

  const [referenceId, setReferenceId] = useState(prefillReferenceId ?? '');
  const [reference, setReference] = useState<SupportReference | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [message, setMessage] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [duplicateTicket, setDuplicateTicket] = useState<SupportTicket | null>(null);

  // Minted once per mounted form and reused on every retry of the same
  // submission attempt — a dropped connection mid-submit must never post twice.
  const idempotencyKeyRef = useRef(generateIdempotencyKey('support_ticket'));

  const lookup = async (overrideRef?: string) => {
    const parsed = parseReferenceId(overrideRef ?? referenceId);
    setDuplicateTicket(null);
    if (!parsed.success) {
      setLookupError(parsed.error);
      setReference(null);
      return;
    }
    setReferenceId(parsed.value);

    const tickets = ticketsData?.tickets ?? [];
    const existingOpen = findOpenTicketForReference(tickets, parsed.value);
    if (existingOpen) setDuplicateTicket(existingOpen);

    if (isOffline) {
      // The brief's explicit offline state: still allow submitting without a
      // preview rather than blocking the whole flow on connectivity.
      setLookupError("Can't look this up offline. You can still submit; Admin will check the ID.");
      setReference(null);
      return;
    }

    setIsLookingUp(true);
    setLookupError(null);
    setReference(null);
    try {
      const found = await lookupSupportReference(parsed.value);
      setReference(found);
    } catch (error) {
      setLookupError(
        isApiError(error) && error.status === 404 ? 'No record with this ID in your branch.' : mapErrorToMessage(error),
      );
    } finally {
      setIsLookingUp(false);
    }
  };

  // A prefilled reference (from "Report an issue") is already known-valid —
  // look it up immediately so the preview shows without the user pressing Find.
  useEffect(() => {
    if (prefillReferenceId) void lookup(prefillReferenceId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillReferenceId]);

  const referenceIdValid = parseReferenceId(referenceId).success;
  const canSubmit = referenceIdValid && message.trim().length >= ISSUE_MESSAGE_MIN_LENGTH && !createTicket.isPending;

  const submit = async (): Promise<boolean> => {
    const parsed = parseReferenceId(referenceId);
    if (!parsed.success || message.trim().length < ISSUE_MESSAGE_MIN_LENGTH || createTicket.isPending) return false;
    setSubmitError(null);
    try {
      await createTicket.mutateAsync({
        input: { referenceId: parsed.value, message: message.trim() },
        idempotencyKey: idempotencyKeyRef.current,
        reference,
      });
      return true;
    } catch (error) {
      setSubmitError(mapErrorToMessage(error));
      return false;
    }
  };

  return {
    referenceId,
    setReferenceId,
    referenceIdValid,
    reference,
    lookupError,
    isLookingUp,
    lookup,
    duplicateTicket,
    message,
    setMessage,
    canSubmit,
    isSubmitting: createTicket.isPending,
    submitError,
    submit,
  };
}
