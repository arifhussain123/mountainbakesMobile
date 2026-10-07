import React, { useCallback, useMemo, useState } from 'react';
import { Image, Linking, StyleSheet, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';

import {
  MBButton,
  MBCard,
  MBConfirmDialog,
  MBEmptyState,
  MBHeader,
  MBIcon,
  MBInput,
  MBPhotoPicker,
  MBPressable,
  MBSkeletonList,
  MBWriteOutcome,
  writeOutcomeCopy,
} from '@/common/ui';
import { useStock } from '@/api/hooks/useCatalogApi';
import { useCreateStockReturn, type CreateStockReturnResult } from '@/api/hooks/useReturnsApi';
import type { StockRow } from '@/shared/types/stock.types';
import { useTheme } from '@/common/theme/ThemeProvider';
import type { WriteSubject } from '@/common/ui';
import { formatQty } from '@/common/utils/money';
import { formatBusinessDate } from '@/common/helpers/businessDay';
import { businessDateStr } from '@/shared/utils/timezone';
import {
  PHOTO_MESSAGES,
  pickReturnPhoto,
  type LocalPhoto,
  type PhotoSource,
} from '@/common/utils/image/returnPhoto';

/**
 * Hand unsold or damaged stock back to production.
 *
 * ---------------------------------------------------------------------------
 * The picker is the stock list, on purpose
 * ---------------------------------------------------------------------------
 * A branch returning at close of day is answering "what is left on the shelf",
 * and the balance is the number they are reconciling against. Choosing from a
 * plain product list would mean picking blind and finding out at submit that the
 * branch does not hold that many — which is the one failure the server's
 * pre-validation pass exists to catch, and the one this screen can avoid asking
 * about.
 *
 * Only products with a balance are offered. You cannot return what you do not
 * have, and the quantity is capped at what the branch holds.
 *
 * ---------------------------------------------------------------------------
 * Many products, one submission
 * ---------------------------------------------------------------------------
 * `POST /api/stock/return` takes an array: a branch closing out hands back
 * everything unsold at once, and Production wants one notification for that
 * rather than one per line. One row per product — two rows for the same product
 * each pass the balance check alone and overdraw together, which the shared
 * schema refuses.
 *
 * ---------------------------------------------------------------------------
 * Select → quantity → reason → CONFIRM → server
 * ---------------------------------------------------------------------------
 * The confirm is a step, not a formality, because of what the server does on
 * the other side. `commit_branch_return` appends a `stock_history` row and then
 * moves `stock.balance` in the same transaction — the movement IS the record,
 * and the ledger is append-only. Nothing here can take a return back: reversing
 * one means an admin running `apply_stock_correction`, which appends a further
 * compensating movement. So the last cheap moment to catch a miscount is before
 * this sheet is confirmed, and that is why it names every product and its count
 * rather than showing a total the reader cannot check.
 *
 * ---------------------------------------------------------------------------
 * One photo, required, for the whole return
 * ---------------------------------------------------------------------------
 * Production decides on a return it cannot see, so the branch sends a picture
 * of what it is handing back — one per submission, not one per product. The
 * server refuses a return without it (`photo_required`), and finding that out
 * from a refusal hours later, after a night offline, is the wrong moment: the
 * button stays disabled, and says why, until a photo is chosen.
 *
 * Nothing uploads when the photo is picked. It is shrunk by the picker, held
 * as a local file, and travels in the same queued row as the return — see
 * `useCreateStockReturn` and `api/sync/returnPhotoStep.ts`.
 *
 * The sheet stays up while the write is in flight. `MBConfirmDialog` carries the
 * spinner, so the confirm cannot be tapped twice — and a double tap here is not
 * a double render, it is a second batch of units off the shelf.
 */

export function StockReturnScreen(): React.ReactElement {
  const theme = useTheme();
  const navigation = useNavigation<{ goBack: () => void }>();

  const stock = useStock();
  const { createReturn, isSaving } = useCreateStockReturn();

  /**
   * The business day this return will be booked to.
   *
   * ---------------------------------------------------------------------------
   * Why it is on the screen at all
   * ---------------------------------------------------------------------------
   * The day rolls at **02:00 Asia/Karachi**, not midnight, and the date is
   * captured on the *device* — `writeOffline` stamps `businessDateStr()` as the
   * row is created, so a return raised at 21:00 with no signal and drained at
   * 07:00 still belongs to the evening it was made. That is the right behaviour
   * and it is also the one nobody can see: between midnight and 02:00 the phone
   * says one calendar date and the ledger will file the return under the
   * previous one. A branch closing out a late shift is exactly the person
   * standing here at that hour.
   *
   * ---------------------------------------------------------------------------
   * Recomputed every render, deliberately not memoised
   * ---------------------------------------------------------------------------
   * `useMemo(…, [])` would freeze this at mount, which is precisely the bug it
   * would look like a fix for: a screen open across 02:00 would keep naming
   * yesterday while the write lands on today. There is no dependency that
   * changes at the rollover, so the honest version is a bare call — it
   * re-evaluates on every stepper tap, which is as live as this needs to be.
   *
   * The authoritative value is still the one on the record: `writeOffline`
   * stamps its own at write time, and `ReturnOutcome` reports **that** rather
   * than recomputing. If a shift crosses the rollover mid-count the two differ,
   * and the one that matters is the one that was stored.
   */
  const businessDate = businessDateStr();

  const [qtyById, setQtyById] = useState<Record<string, number>>({});
  const [reason, setReason] = useState('');
  const [result, setResult] = useState<CreateStockReturnResult | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [photo, setPhoto] = useState<LocalPhoto | null>(null);
  const [picking, setPicking] = useState(false);
  const [photoError, setPhotoError] = useState<{ message: string; canOpenSettings: boolean } | null>(
    null,
  );

  /**
   * Run the picker and take its answer.
   *
   * `pickReturnPhoto` never throws — every failure is a typed result — so
   * there is no catch here to forget. A cancel changes nothing at all: the
   * photo already chosen stays, and no error appears for someone who simply
   * backed out of the camera.
   */
  const onPickPhoto = useCallback(async (source: PhotoSource) => {
    setPicking(true);
    try {
      const picked = await pickReturnPhoto(source);
      if (picked.status === 'cancelled') return;
      if (picked.status === 'error') {
        setPhotoError({ message: picked.message, canOpenSettings: picked.canOpenSettings });
        return;
      }
      setPhotoError(null);
      setPhoto(picked.photo);
    } finally {
      setPicking(false);
    }
  }, []);

  const onRemovePhoto = useCallback(() => {
    setPhoto(null);
    setPhotoError(null);
  }, []);

  const openSettings = useCallback(() => {
    // Best-effort: a device that refuses the intent leaves the message on
    // screen, which still says what is needed.
    Linking.openSettings().catch(() => {});
  }, []);

  const available = useMemo(
    () => (stock.data?.rows ?? []).filter(row => row.balance > 0),
    [stock.data?.rows],
  );

  const items = useMemo(
    () =>
      Object.entries(qtyById)
        .filter(([, qty]) => qty > 0)
        .map(([productId, qty]) => ({ productId, qty })),
    [qtyById],
  );

  const setQty = useCallback((row: StockRow, next: number) => {
    // Clamped to the branch's own balance. The server refuses an overdraw
    // anyway; catching it here means the branch is told before they submit
    // rather than after a round trip that may be a day late.
    const clamped = Math.max(0, Math.min(next, row.balance));
    setQtyById(current => ({ ...current, [row.productId]: clamped }));
  }, []);

  /**
   * `setQty` is handed over whole rather than wrapped per row.
   *
   * A `next => setQty(row, next)` closure is a new function for every row on
   * every render, which defeats `ReturnLine`'s memoisation entirely — the same
   * trap the POS and New Order lists were pulled out of. The row takes the
   * stable setter and passes its own row back in.
   */
  const renderLine = useCallback(
    ({ item }: { item: StockRow }) => (
      <ReturnLine row={item} qty={qtyById[item.productId] ?? 0} onChange={setQty} />
    ),
    [qtyById, setQty],
  );

  const onConfirm = useCallback(async () => {
    // The button is disabled without a photo; this is the same rule held at
    // the point the write is made, where it cannot be routed around.
    if (items.length === 0 || !photo) return;

    let outcome: CreateStockReturnResult;
    try {
      outcome = await createReturn({ items, reason, photo });
    } catch {
      // Thrown before anything was queued — in practice the photo could not be
      // copied into app storage. Nothing was written and no stock moved, so
      // the form stays as it is and the photo field says what to do.
      setConfirming(false);
      setPhotoError({ message: PHOTO_MESSAGES.unprocessable, canOpenSettings: false });
      return;
    }
    setResult(outcome);
    // The sheet stays up for the whole write rather than closing on tap, so the
    // spinner is on the button that was pressed and a second tap is impossible
    // while units are moving. Closing first would put the confirm back under a
    // thumb that is still travelling.
    setConfirming(false);
    // Only a return the server accepted is finished. A queued or refused one
    // stays on screen with its lines intact, so nothing has to be retyped.
    if (outcome.outcome === 'synced') {
      setQtyById({});
      // The reason described THIS return. Carrying it to the next one silently
      // mislabels a different batch of stock.
      setReason('');
      // And so did the photo. It is on the server now; the device copy the
      // queue held has already been removed by the drain.
      setPhoto(null);
      setPhotoError(null);
    }
  }, [createReturn, items, reason, photo]);

  const totalUnits = items.reduce((sum, item) => sum + item.qty, 0);

  // The confirm names the products rather than counting them: "3 products" is
  // not something a person can check against the crate in their hands.
  const confirmLines = useMemo(() => {
    const nameById = new Map(available.map(row => [row.productId, row.productName]));
    return items.map(item => ({
      productId: item.productId,
      name: nameById.get(item.productId) ?? item.productId,
      qty: item.qty,
    }));
  }, [available, items]);

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader
        tone="brand"
        title="Return stock"
        /* The day it books to, next to where it goes. `formatBusinessDate`
           rather than `businessDateLabel`: "Today" is the word this screen
           cannot use, because between midnight and 02:00 the business day and
           the calendar day disagree and the whole reason the date is here is
           that disagreement. */
        subtitle={`Back to production · ${formatBusinessDate(businessDate, { weekday: true })}`}
        onBack={() => navigation.goBack()}
      />

      {result ? <ReturnOutcome result={result} /> : null}

      {stock.isPending ? (
        <MBSkeletonList rows={6} />
      ) : available.length === 0 ? (
        <MBEmptyState
          title="Nothing to return"
          message="This branch holds no stock today."
          icon="stock"
        />
      ) : (
        /*
         * Virtualised, and the Reason field rides in the footer.
         *
         * This was a mapped `ScrollView`, so every product the branch holds
         * stock in mounted before the first one was on screen — at close of day
         * that is most of the catalogue. Worse, the Reason input lived in the
         * same scroller and the same component state, so **every keystroke in
         * it re-rendered every product row**: typing "unsold at close" was
         * seventeen full-list renders on the phone least able to afford them.
         *
         * `ListFooterComponent` keeps the field at the end of the list where it
         * was, while FlashList mounts only what is visible and the memoised row
         * ignores a reason it does not read.
         */
        <FlashList
          data={available}
          renderItem={renderLine}
          keyExtractor={keyOfRow}
          contentContainerStyle={{ padding: theme.layout.screenPad }}
          ItemSeparatorComponent={LineSeparator}
          keyboardShouldPersistTaps="handled"
          ListFooterComponent={
            /* The photo field sits here for the reason Reason does: it is form
               state the product rows never read, and in the footer a change to
               it re-renders no memoised row. */
            <View style={{ paddingTop: theme.space.md, gap: theme.space.lg }}>
              <MBPhotoPicker
                title="Return Photo"
                helperText="Capture or upload a photo of the returned item"
                required
                photoUri={photo?.uri ?? null}
                onPick={onPickPhoto}
                onRemove={onRemovePhoto}
                busy={picking || isSaving}
                error={photoError?.message}
                errorActionLabel={photoError?.canOpenSettings ? 'Open settings' : undefined}
                onErrorAction={photoError?.canOpenSettings ? openSettings : undefined}
                testID="return-photo"
              />
              <MBInput
                label="Reason"
                value={reason}
                onChangeText={setReason}
                placeholder="Unsold at close, damaged, …"
                multiline
                testID="return-reason"
              />
            </View>
          }
        />
      )}

      {items.length > 0 ? (
        <View
          style={[
            styles.bar,
            {
              backgroundColor: theme.colors.surface,
              borderTopColor: theme.colors.border,
              padding: theme.layout.screenPad,
            },
          ]}>
          <View style={styles.barRow}>
            <View style={styles.summary}>
              <Text style={[theme.type.label, { color: theme.colors.textMuted }]}>
                {items.length} {items.length === 1 ? 'product' : 'products'}
              </Text>
              <Text style={[theme.type.number, { color: theme.colors.text }]}>
                {formatQty(totalUnits)} units
              </Text>
            </View>
            <MBButton
              label="Return to production"
              onPress={() => setConfirming(true)}
              disabled={isSaving || !photo}
              testID="submit-return"
            />
          </View>
          {/* A disabled button with no reason is a dead end, and the field that
              unblocks it is at the far end of the list — possibly a screen and
              a half of products away. */}
          {!photo ? (
            <Text
              testID="return-photo-required"
              style={[theme.type.caption, { color: theme.colors.textMuted }]}>
              Add a photo of the returned items to continue.
            </Text>
          ) : null}
        </View>
      ) : null}

      {/* Step 4. The stock has not moved until this is confirmed. */}
      <MBConfirmDialog
        visible={confirming}
        title={`Return ${formatQty(totalUnits)} ${totalUnits === 1 ? 'unit' : 'units'}?`}
        message="These units leave this branch and go back into the production pool. A return is a stock movement, not an edit — undoing it needs an admin correction, so check the count against what is in your hands."
        confirmLabel="Return stock"
        cancelLabel="Go back"
        confirmVariant="primary"
        onCancel={() => setConfirming(false)}
        onConfirm={onConfirm}
        loading={isSaving}
        testID="confirm-return">
        <View style={styles.confirmLines}>
          {confirmLines.map(line => (
            <View key={line.productId} style={styles.confirmLine}>
              <Text
                numberOfLines={1}
                style={[theme.type.body, styles.flex, { color: theme.colors.text }]}>
                {line.name}
              </Text>
              <Text style={[theme.type.number, { color: theme.colors.text }]}>
                {formatQty(line.qty)}
              </Text>
            </View>
          ))}
          {/* The day the units come off, on the last screen that can still stop
              them. The confirm already names every product rather than counting
              them, for the same reason: what is checkable here is not checkable
              once `commit_branch_return` has appended its movement. */}
          <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
            Books to {formatBusinessDate(businessDate, { weekday: true })}
          </Text>
          {/* The picture that goes with it, on the last screen that can still
              change it: Production reviews the return against this photo. */}
          {photo ? (
            <View style={[styles.confirmPhoto, { gap: theme.space.md }]}>
              <Image
                source={{ uri: photo.uri }}
                resizeMethod="resize"
                resizeMode="cover"
                accessibilityRole="image"
                accessibilityLabel="Return photo"
                testID="confirm-return-photo"
                style={[
                  styles.confirmThumb,
                  {
                    borderRadius: theme.radius.sm,
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.surfaceSunken,
                  },
                ]}
              />
              <Text style={[theme.type.caption, styles.flex, { color: theme.colors.textMuted }]}>
                This photo is sent with the return.
              </Text>
            </View>
          ) : null}
          {reason.trim().length > 0 ? (
            <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
              Reason: {reason.trim()}
            </Text>
          ) : (
            // Not a blocker — the server defaults it to '' — but Production reads
            // this to tell unsold from damaged, so its absence is worth seeing
            // before confirming rather than discovering on the other end.
            <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
              No reason given.
            </Text>
          )}
        </View>
      </MBConfirmDialog>
    </View>
  );
}

/**
 * What actually happened, in the server's terms.
 *
 * A queued return has moved **no units** — the branch still holds them — and a
 * refused one never will without a person. Saying "saved" for either is how a
 * shelf and a system stop agreeing.
 */
const RETURN_SUBJECT: WriteSubject = {
  noun: 'return',
  confirmed: 'Returned to production.',
  // "Saved" reads as "done" on a stock screen, and the units are still on the
  // branch's shelf. This is the sentence that keeps a shelf and a system
  // agreeing while the queue drains.
  // The photo is named because it is the part people doubt: a return they can
  // picture being queued, a picture they took a minute ago less so.
  queuedNote:
    'The return and its photo are both saved offline and will sync automatically. The stock has not moved yet.',
  refusedNote: 'do not send it again',
};

function ReturnOutcome({ result }: { result: CreateStockReturnResult }): React.ReactElement {
  const theme = useTheme();

  return (
    <MBCard>
      <MBWriteOutcome
        copy={writeOutcomeCopy(result.outcome, RETURN_SUBJECT, result.reason)}
      />
      {/*
        The business day the record carries, read off the row rather than
        recomputed.

        This is the figure that matters on a **queued** return: the units have
        not moved, the row may not drain for hours, and the date it will land on
        was fixed when it was written — not when it sends. Recomputing here would
        show the day of the drain, which is the one reading that makes a
        correctly-dated return look wrong (and a wrongly-dated one look right).
      */}
      <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
        Booked to {formatBusinessDate(result.businessDate, { weekday: true })}
      </Text>
      {/* The only identifier a queued or refused return has: no server reference
          exists for it yet. It is what to quote when someone goes looking. */}
      <Text style={[theme.type.mono, { color: theme.colors.textMuted }]} selectable>
        {result.clientOperationId}
      </Text>
    </MBCard>
  );
}

/**
 * One product with its return stepper.
 *
 * Memoised: the screen re-renders on every stepper tap and every keystroke in
 * the Reason field, and with a stable `onChange` the only row that actually
 * re-renders is the one whose quantity moved. Theme changes still reach it —
 * context bypasses `memo`.
 */
const ReturnLine = React.memo(function ReturnLineView({
  row,
  qty,
  onChange,
}: {
  row: StockRow;
  qty: number;
  /** The whole row, so the caller keeps one stable setter for the whole list. */
  onChange: (row: StockRow, next: number) => void;
}): React.ReactElement {
  const theme = useTheme();
  const decrease = useCallback(() => onChange(row, qty - 1), [onChange, row, qty]);
  const increase = useCallback(() => onChange(row, qty + 1), [onChange, row, qty]);

  return (
    <MBCard accessibilityLabel={`${row.productName}, ${formatQty(row.balance)} on hand`}>
      <View style={styles.line}>
        <View style={styles.lineMain}>
          <Text numberOfLines={1} style={[theme.type.bodyStrong, { color: theme.colors.text }]}>
            {row.productName}
          </Text>
          <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
            {formatQty(row.balance)} on hand · {row.stockCode}
          </Text>
        </View>

        <View style={styles.stepper}>
          <MBPressable
            onPress={decrease}
            disabled={qty <= 0}
            accessibilityRole="button"
            accessibilityLabel={`Return one fewer ${row.productName}`}
            style={[styles.step, { borderColor: theme.colors.border, borderRadius: theme.radius.md }]}>
            <MBIcon name="remove" size="action" color={theme.colors.text} />
          </MBPressable>

          <Text style={[theme.type.number, styles.qty, { color: theme.colors.text }]}>{qty}</Text>

          <MBPressable
            onPress={increase}
            disabled={qty >= row.balance}
            accessibilityRole="button"
            accessibilityLabel={`Return one more ${row.productName}`}
            style={[styles.step, { borderColor: theme.colors.border, borderRadius: theme.radius.md }]}>
            <MBIcon name="add" size="action" color={theme.colors.text} />
          </MBPressable>
        </View>
      </View>
    </MBCard>
  );
});

/** Module scope: a separator defined during render remounts the list each pass. */
function LineSeparator(): React.ReactElement {
  return <View style={styles.separator} />;
}

const keyOfRow = (row: StockRow): string => row.productId;

const styles = StyleSheet.create({
  separator: { height: 8 },
  flex: { flex: 1 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  lineMain: { flex: 1, gap: 2 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  step: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  qty: { minWidth: 28, textAlign: 'center' },
  bar: { gap: 8, borderTopWidth: 1 },
  barRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  summary: { gap: 2 },
  confirmLines: { gap: 8 },
  confirmPhoto: { flexDirection: 'row', alignItems: 'center' },
  confirmThumb: { width: 56, height: 56, borderWidth: 1 },
  confirmLine: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 },
});
