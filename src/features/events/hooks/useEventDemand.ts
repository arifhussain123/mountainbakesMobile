import { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import {
  getMyEventDemand,
  saveEventDemand,
  submitEventDemand,
} from '@/api/services/eventsService';
import { qk } from '@/api/queryKeys';
import { ApiError } from '@/api/errors';
import { isBranchRole } from '@/navigation/roleNavigation';
import { useAuthStore } from '@/state/authStore';
import type { EventBranchDemand, SpecialEventView } from '@/shared/types/special-event.types';

import { demandStatusFor, type DemandStatus } from '../helpers/demandState';

/**
 * One branch's advance demand for one event: what it is now, and the two ways
 * to change it.
 *
 * ---------------------------------------------------------------------------
 * This write is live, not queued, and that is the endpoint's doing
 * ---------------------------------------------------------------------------
 * Every other write in this app goes through `writeOffline()` and the sync
 * queue. This one cannot: `POST /:id/demands` is not among the five operations
 * the server carries `idempotent()` for, so a queued retry has no dedupe behind
 * it. What makes that survivable rather than dangerous is that the route
 * **upserts** one demand per (event, branch) — a repeat edits the same row
 * instead of raising a second demand — so the failure mode a queue exists to
 * prevent is not available here anyway.
 *
 * The consequence is the same one `ProductionSalesScreen` carries: with no
 * connection there is nothing to save, and the screen has to say so before
 * somebody types a demand they cannot keep.
 */

export interface EventDemandLine {
  productId: string;
  productName: string;
  qty: number;
  remarks: string;
}

export type DemandBusy = 'save' | 'submit' | null;

export interface EventDemandForm {
  demand: EventBranchDemand | null;
  status: DemandStatus;
  lines: EventDemandLine[];
  isLoading: boolean;
  isError: boolean;

  setQty: (line: Omit<EventDemandLine, 'qty' | 'remarks'>, qty: number) => void;
  setRemark: (productId: string, text: string) => void;

  busy: DemandBusy;
  error: string | null;
  /** Set after a save or submit lands, for the screen to confirm in its own words. */
  outcome: 'saved' | 'submitted' | null;
  dismissOutcome: () => void;

  save: () => Promise<void>;
  submit: () => Promise<void>;
}

export function useEventDemand(event: SpecialEventView | null): EventDemandForm {
  const role = useAuthStore(s => s.claims?.role);
  const enabled = Boolean(event) && (role ? isBranchRole(role) : false);
  const queryClient = useQueryClient();

  const eventId = event?.id ?? '';

  const query = useQuery({
    queryKey: qk.events.myDemand(eventId),
    queryFn: () => getMyEventDemand(eventId),
    enabled,
  });

  /**
   * Local edits, keyed by product id and seeded from the server's copy.
   *
   * `null` means "nothing typed yet on this event", which is what makes the
   * seeding below happen once rather than on every render — and what makes
   * switching events start clean instead of carrying the last event's
   * quantities across, since the hook is re-created per event.
   */
  const [edits, setEdits] = useState<Record<string, EventDemandLine> | null>(null);

  const lines = useMemo<EventDemandLine[]>(() => {
    if (edits) return Object.values(edits).filter(l => l.qty > 0);
    return (query.data?.items ?? []).map(item => ({
      productId: item.productId ?? '',
      productName: item.productName,
      qty: item.qty,
      remarks: item.remarks ?? '',
    }));
  }, [edits, query.data]);

  const status = useMemo(
    () => demandStatusFor({ demandDueDate: event?.demandDueDate ?? null }, query.data),
    [event?.demandDueDate, query.data],
  );

  const [busy, setBusy] = useState<DemandBusy>(null);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<'saved' | 'submitted' | null>(null);

  const seed = useCallback((): Record<string, EventDemandLine> => {
    const map: Record<string, EventDemandLine> = {};
    for (const line of lines) map[line.productId] = line;
    return map;
  }, [lines]);

  const setQty = useCallback(
    (line: Omit<EventDemandLine, 'qty' | 'remarks'>, qty: number) => {
      setEdits(current => {
        const base = current ?? seed();
        if (qty <= 0) {
          // Zero removes the line rather than storing it, so "how many products"
          // is the key count and a removed line takes its remark with it.
          if (!base[line.productId]) return base;
          const rest = { ...base };
          delete rest[line.productId];
          return rest;
        }
        const existing = base[line.productId];
        return {
          ...base,
          [line.productId]: { ...line, qty, remarks: existing?.remarks ?? '' },
        };
      });
    },
    [seed],
  );

  const setRemark = useCallback(
    (productId: string, text: string) => {
      setEdits(current => {
        const base = current ?? seed();
        const line = base[productId];
        return line ? { ...base, [productId]: { ...line, remarks: text } } : base;
      });
    },
    [seed],
  );

  const dismissOutcome = useCallback(() => setOutcome(null), []);

  const save = useCallback(async () => {
    if (busy || !event) return;
    if (lines.length === 0) {
      setError('Add at least one product before saving.');
      return;
    }
    setBusy('save');
    setError(null);
    try {
      await saveEventDemand(event.id, {
        items: lines.map(l => ({
          productId: l.productId,
          qty: l.qty,
          ...(l.remarks.trim() ? { remarks: l.remarks.trim() } : {}),
        })),
      });
      await queryClient.invalidateQueries({ queryKey: qk.events.myDemand(event.id) });
      setEdits(null);
      setOutcome('saved');
    } catch (err) {
      /*
       * The server's own words on a 409, not a generic failure. Both of its
       * refusals here say something the branch has to act on and could not have
       * known — the deadline passed, or the demand is no longer editable — and
       * "could not save" would send someone to check their connection instead.
       */
      setError(
        err instanceof ApiError && err.status === 409
          ? err.message
          : 'Could not save this demand. Please try again.',
      );
    } finally {
      setBusy(null);
    }
  }, [busy, event, lines, queryClient]);

  const submit = useCallback(async () => {
    if (busy || !event) return;
    const demandId = query.data?.id;
    if (!demandId) {
      setError('Save the demand before sending it to Production.');
      return;
    }
    setBusy('submit');
    setError(null);
    try {
      await submitEventDemand(event.id, demandId);
      await queryClient.invalidateQueries({ queryKey: qk.events.myDemand(event.id) });
      setEdits(null);
      setOutcome('submitted');
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 409
          ? err.message
          : 'Could not send this demand. Please try again.',
      );
    } finally {
      setBusy(null);
    }
  }, [busy, event, query.data?.id, queryClient]);

  return {
    demand: query.data ?? null,
    status,
    lines,
    isLoading: enabled && query.isPending,
    isError: query.isError,
    setQty,
    setRemark,
    busy,
    error,
    outcome,
    dismissOutcome,
    save,
    submit,
  };
}
