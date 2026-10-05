import { useCallback, useMemo, useRef, useState } from 'react';

import { writeOutcomeCopy, type WriteOutcomeCopy, type WriteSubject } from '@/common/ui';
import { round2 } from '@/common/utils/money';
import { CreateSpecialOrderSchema } from '@/shared';

import { useCreateSpecialOrder, type SpecialOrderDraftItem } from './useCreateSpecialOrder';

/**
 * Everything the Special Order screen holds: the rows, their messages, the
 * total and the one submit path.
 *
 * The screen that uses this is composition only, for the reason
 * `useProductionOrderForm` gives — the rules below (which row counts, what an
 * amount of zero means, what stops a write from being queued) are the parts
 * that go wrong quietly.
 */

/**
 * One row as it is being typed.
 *
 * Every field is the TEXT in its box, not a parsed number. "Nothing entered"
 * and "0 entered" are different answers for the amount — 0 is a replacement
 * made free of charge — and a number cannot hold the first of them.
 */
export interface SpecialOrderRow {
  /** Stable across edits and deletes, so a row keeps its own inputs. */
  key: string;
  name: string;
  qty: string;
  amount: string;
  description: string;
}

export type SpecialOrderField = 'name' | 'qty' | 'amount' | 'description';

/** The three messages, worded exactly as the server's schema words them. */
export const SPECIAL_ORDER_MESSAGES = {
  name: 'Please enter the item name.',
  qty: 'Please enter quantity.',
  amount: 'Please enter the Special Order amount.',
} as const;

/** Shared wording for the outcome banner. */
const SPECIAL_ORDER_SUBJECT: WriteSubject = {
  noun: 'Special Order',
  // Only ever shown for `synced` — the one outcome in which Production has it.
  confirmed: 'Special Order sent to Production.',
  queuedTitle: 'Special Order Saved Offline',
  refusedNote: 'do not send it again',
};

/** A whole number above zero, or null. `3.5`, `0` and `abc` are all nothing. */
export function parseSpecialOrderQty(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const qty = Number(trimmed);
  return Number.isSafeInteger(qty) && qty > 0 ? qty : null;
}

/**
 * A number of at least zero with at most two decimals, or null.
 *
 * Read off the text rather than off `Number(text)`: an empty box is `0` to
 * `Number`, which would file an amount nobody typed, and a third decimal would
 * be rounded into an amount other than the one that was agreed.
 */
export function parseSpecialOrderAmount(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  const amount = Number(trimmed);
  return Number.isFinite(amount) ? amount : null;
}

/** A row nobody has typed into. It is ignored rather than reported. */
export function isUntouchedSpecialOrderRow(row: SpecialOrderRow): boolean {
  return (
    row.name.trim() === '' &&
    row.qty.trim() === '' &&
    row.amount.trim() === '' &&
    row.description.trim() === ''
  );
}

/** What is wrong with a started row, in the order its fields are laid out. */
export function validateSpecialOrderRow(row: SpecialOrderRow): string[] {
  const messages: string[] = [];
  if (row.name.trim() === '') messages.push(SPECIAL_ORDER_MESSAGES.name);
  if (parseSpecialOrderQty(row.qty) === null) messages.push(SPECIAL_ORDER_MESSAGES.qty);
  // `=== null`, never falsy: an amount of 0 is valid.
  if (parseSpecialOrderAmount(row.amount) === null) messages.push(SPECIAL_ORDER_MESSAGES.amount);
  return messages;
}

export interface SpecialOrderForm {
  rows: SpecialOrderRow[];
  addRow: () => void;
  removeRow: (key: string) => void;
  setField: (key: string, field: SpecialOrderField, value: string) => void;

  /** Messages per row key. Empty until a submit has been attempted. */
  rowErrors: Record<string, string[]>;
  /** Σ of the amounts entered so far. Never multiplied by a quantity. */
  total: number;

  /** Anything that is about the order as a whole rather than one row. */
  error: string | null;
  banner: WriteOutcomeCopy | null;
  dismissBanner: () => void;

  busy: boolean;
  submit: () => Promise<void>;
}

export function useSpecialOrderForm(): SpecialOrderForm {
  const { createSpecialOrder } = useCreateSpecialOrder();

  const nextKey = useRef(0);
  const blankRow = useCallback((): SpecialOrderRow => {
    nextKey.current += 1;
    return { key: `row-${nextKey.current}`, name: '', qty: '', amount: '', description: '' };
  }, []);

  // One empty row to start: the form is usable without pressing Add row first,
  // and an untouched row costs nothing because it is never sent.
  const [rows, setRows] = useState<SpecialOrderRow[]>(() => [blankRow()]);
  const [attempted, setAttempted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<WriteOutcomeCopy | null>(null);
  const [busy, setBusy] = useState(false);

  /** The ref decides, the state draws — see `useProductionOrderForm`. */
  const busyRef = useRef(false);

  const addRow = useCallback(() => setRows(current => [...current, blankRow()]), [blankRow]);

  const removeRow = useCallback(
    (key: string) => setRows(current => current.filter(row => row.key !== key)),
    [],
  );

  const setField = useCallback(
    (key: string, field: SpecialOrderField, value: string) =>
      setRows(current =>
        current.map(row => (row.key === key ? { ...row, [field]: value } : row)),
      ),
    [],
  );

  /**
   * Shown only once a submit has been attempted — a message on a row someone is
   * still typing reads as the form being broken rather than incomplete. After
   * that it follows the text, so a message clears as its field is fixed.
   */
  const rowErrors = useMemo(() => {
    const map: Record<string, string[]> = {};
    if (!attempted) return map;
    for (const row of rows) {
      if (isUntouchedSpecialOrderRow(row)) continue;
      const messages = validateSpecialOrderRow(row);
      if (messages.length > 0) map[row.key] = messages;
    }
    return map;
  }, [attempted, rows]);

  /**
   * The plain sum of the row amounts.
   *
   * An amount is agreed for the whole row, so nothing here multiplies by `qty`.
   * A box that does not yet hold a valid amount adds nothing rather than `NaN`.
   */
  const total = useMemo(
    () => round2(rows.reduce((sum, row) => sum + (parseSpecialOrderAmount(row.amount) ?? 0), 0)),
    [rows],
  );

  const dismissBanner = useCallback(() => setBanner(null), []);

  const submit = useCallback(async () => {
    if (busyRef.current) return;
    setError(null);
    setAttempted(true);

    const started = rows.filter(row => !isUntouchedSpecialOrderRow(row));
    // The rows carry these messages themselves, under the fields they are about.
    if (started.some(row => validateSpecialOrderRow(row).length > 0)) return;

    const items: SpecialOrderDraftItem[] = started.map(row => ({
      name: row.name.trim(),
      qty: parseSpecialOrderQty(row.qty) ?? 0,
      amount: parseSpecialOrderAmount(row.amount) ?? 0,
      description: row.description.trim(),
      // No camera and no upload in this app, so there is never a request photo.
      attachmentIds: [],
    }));

    /*
     * The server's own schema, before anything is written.
     *
     * This write is offline-first, so a payload the server can never accept
     * would otherwise be queued, drained hours later, refused, and parked as a
     * failed row — the branch believing it ordered and Production never seeing
     * it. It also catches what the row checks do not: no rows at all, an amount
     * past the column's range, more rows than one order may carry.
     */
    const parsed = CreateSpecialOrderSchema.safeParse({ items });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'This Special Order cannot be sent as it is.');
      return;
    }

    busyRef.current = true;
    setBusy(true);

    try {
      const result = await createSpecialOrder({ items });

      // Whatever the server made of it, this form is done with it — including a
      // refusal, which is now waiting for a person in Sync Center and must not
      // be sitting here to be sent a second time.
      setRows([blankRow()]);
      setAttempted(false);
      setBanner(writeOutcomeCopy(result.outcome, SPECIAL_ORDER_SUBJECT, result.reason));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the Special Order.');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [blankRow, createSpecialOrder, rows]);

  return {
    rows,
    addRow,
    removeRow,
    setField,
    rowErrors,
    total,
    error,
    banner,
    dismissBanner,
    busy,
    submit,
  };
}
