import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  getBusinessDate,
  useChangeSupportFigures,
  useEditSupportDemandItems,
  useEditSupportSaleItems,
  useSupportLiveReference,
  useSupportProducts,
  type PaymentMethod,
  type SupportReference,
  type SupportTicket,
} from '@/api';
import { mapErrorToMessage } from '@/shared/helpers';
import { useAppTheme } from '@/shared/theme';
import { DateField, Dropdown, Icon, LoadingSkeleton, SecondaryButton, TextField, type DropdownOption } from '@/shared/ui';
import { formatCurrency, formatDisplayDate } from '@/shared/utils';
import { ActionChip } from '../../components';
import {
  DEPOSIT_FIGURES,
  PRODUCTION_FIELDS,
  SALE_PAYMENT_LABEL,
  SALE_PAYMENT_METHODS,
  SALE_ROWS_PROBLEM,
  STOCK_FIELDS,
  canRefreshReference,
  demandDeltas,
  demandDraftRows,
  demandDuplicated,
  demandItemsPayload,
  demandProblem,
  demandSuccess,
  depositChangedFigures,
  depositCurrent,
  depositEdits,
  depositTotal,
  emptyDemandRow,
  emptySaleRow,
  fieldEditRows,
  fieldEdits,
  isPoolStockTicket,
  pickSaleProduct,
  productionCorrection,
  productionSuccess,
  saleDiscountTooBig,
  saleDraftRows,
  saleItemsPayload,
  saleLineTotal,
  salePreviewTotals,
  stockCorrection,
  stockSuccess,
  stockTargetsFrom,
  type DemandDraftRow,
  type DepositValues,
  type SaleDraftRow,
  type StockEditorState,
  type StockKey,
} from '../../utils/supportActions';
import { ReferenceDetail } from './components';
import { Hint, NumBox, Notice, Row, SheetButtons, formStyles } from './formBits';

/**
 * Web `ChangeDialog`'s editors for a Branches & Production query, each one a
 * form inside the Support Center's sheet. They start from the LIVE reference
 * (`/support/lookup`, scoped to the raiser's branch or the production pool) —
 * the snapshot on the ticket is from when the query was raised — and every
 * one of them resolves the query when it applies.
 */

export interface EditorProps {
  ticket: SupportTicket;
  onClose: () => void;
  /** Called after a successful write — closes the sheet and leaves the query. */
  onDone: () => void;
}

const money = (n: number) => formatCurrency(Number.isFinite(n) ? n : 0);
const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

/**
 * Re-reads the reference before an editor mounts, so the form is seeded from
 * the row as it stands now. Falls back to the snapshot when the read fails —
 * it is still a truthful record of the query.
 */
export function LiveReferenceGate({ ticket, label, children }: { ticket: SupportTicket; label: string; children: (reference: SupportReference | null) => ReactNode }) {
  const theme = useAppTheme();
  const pool = isPoolStockTicket(ticket);
  const enabled = canRefreshReference(ticket);
  const live = useSupportLiveReference(ticket.referenceId, { branchId: ticket.branchId ?? null, pool }, enabled);
  if (enabled && live.isLoading) {
    return (
      <View style={{ gap: 8 }}>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{label}</Text>
        <LoadingSkeleton height={160} />
      </View>
    );
  }
  return <>{children(live.data ?? ticket.referenceSnapshot)}</>;
}

function ProductPicker({ value, fallbackLabel, options, loading, onPick }: { value: string | null; fallbackLabel: string; options: DropdownOption<string>[]; loading: boolean; onPick: (id: string) => void }) {
  return <Dropdown options={options} value={value} onChange={onPick} placeholder={fallbackLabel || 'Search product…'} loading={loading} emptyLabel="No products found." />;
}

function NoteField({ value, onChangeText, label = 'Note (optional)', placeholder = 'Reason for the change' }: { value: string; onChangeText: (v: string) => void; label?: string; placeholder?: string }) {
  return <TextField label={label} value={value} onChangeText={onChangeText} multiline placeholder={placeholder} />;
}

function TotalLine({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  const theme = useAppTheme();
  return (
    <View style={formStyles.between}>
      <Text style={[bold ? theme.typography.body : theme.typography.bodySmall, { color: bold ? theme.colors.text : theme.colors.textSecondary, fontWeight: bold ? '700' : '400' }]}>{label}</Text>
      <Text style={[bold ? theme.typography.body : theme.typography.bodySmall, { color: bold ? theme.colors.primary : theme.colors.text, fontWeight: bold ? '700' : '600' }]}>{value}</Text>
    </View>
  );
}

// ─── Sale lines ─────────────────────────────────────────────────────────────

/** Web SaleItemsDialog: product / qty / rate / discount per line, add / remove lines, the tender — applied to the order, stock reconciled. */
export function SaleItemsEditor({ ticket, reference, onClose, onDone }: EditorProps & { reference: SupportReference }) {
  const theme = useAppTheme();
  const productsQ = useSupportProducts();
  const save = useEditSupportSaleItems();
  const [rows, setRows] = useState<SaleDraftRow[]>(() => saleDraftRows(reference.saleItems ?? [], 'live'));
  const [payment, setPayment] = useState<PaymentMethod | undefined>(reference.paymentMethod);
  const [note, setNote] = useState('');
  const seq = useRef(0);
  const products = useMemo(() => productsQ.data ?? [], [productsQ.data]);
  const options = useMemo(
    () => products.map((p) => ({ value: p.id, label: p.name, hint: p.sku, sublabel: `${p.categoryName ?? ''} · ${money(p.price)}` })),
    [products],
  );
  const totals = salePreviewTotals(rows, reference.saleTotals);
  const patch = (key: string, next: Partial<SaleDraftRow>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...next } : r)));

  const submit = () => {
    const items = saleItemsPayload(rows);
    if (!items) {
      Alert.alert('Check the Lines', SALE_ROWS_PROBLEM);
      return;
    }
    save.mutate(
      { id: ticket.id, items, ...(payment ? { paymentMethod: payment } : {}), note },
      {
        onSuccess: () => {
          Alert.alert('Sale Updated', 'Sale updated, stock adjusted & query resolved');
          onDone();
        },
        onError: (e) => Alert.alert('Could Not Update the Sale', mapErrorToMessage(e)),
      },
    );
  };

  return (
    <View>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginBottom: 8 }]}>
        The sale exactly as the branch sees it. Change a line’s product, quantity, rate, or discount, and the payment method. Edits apply to the order, its
        totals are recomputed and stock is reconciled automatically. The query is then resolved.
      </Text>
      <ReferenceDetail reference={reference} />
      {rows.map((r) => (
        <View key={r.key} style={[formStyles.box, { borderColor: theme.colors.border, borderRadius: theme.radii.md }]}>
          <ProductPicker
            value={r.productId}
            fallbackLabel={r.productName}
            options={options}
            loading={productsQ.isLoading}
            onPick={(id) => {
              const p = products.find((x) => x.id === id);
              if (p) patch(r.key, pickSaleProduct(r, p));
            }}
          />
          <Row>
            <View style={{ flex: 1 }}>
              <NumBox label="Qty" value={r.qty} onChangeText={(v) => patch(r.key, { qty: v })} />
            </View>
            <View style={{ flex: 1 }}>
              <NumBox label="Rate (each)" value={r.unitPrice} onChangeText={(v) => patch(r.key, { unitPrice: v })} />
            </View>
            <View style={{ flex: 1 }}>
              <NumBox label="Discount" value={r.discount} onChangeText={(v) => patch(r.key, { discount: v })} error={saleDiscountTooBig(r)} />
            </View>
          </Row>
          <View style={[formStyles.between, { marginTop: 8 }]}>
            <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '700' }]}>Amount {money(saleLineTotal(r))}</Text>
            <ActionChip icon="trash" label="Remove line" danger disabled={rows.length <= 1} onPress={() => setRows((rs) => rs.filter((x) => x.key !== r.key))} />
          </View>
        </View>
      ))}
      <View style={{ marginTop: 10, alignSelf: 'flex-start' }}>
        <ActionChip
          icon="plus"
          label="Add item"
          onPress={() => {
            seq.current += 1;
            setRows((rs) => [...rs, emptySaleRow(`new-${seq.current}`)]);
          }}
        />
      </View>
      {rows.some(saleDiscountTooBig) ? <Hint tone="danger">A line’s discount cannot be more than its qty × rate.</Hint> : null}

      <View style={[formStyles.box, { borderColor: theme.colors.border, borderRadius: theme.radii.md, gap: 4 }]}>
        <TotalLine label="Subtotal" value={money(totals.gross)} />
        <TotalLine label="Discount" value={`-${money(totals.discountTotal)}`} />
        {totals.delivery > 0 ? <TotalLine label="Delivery" value={money(totals.delivery)} /> : null}
        <TotalLine label="Government Tax" value={money(totals.taxAmount)} />
        <TotalLine label="Grand Total" value={money(totals.grandTotal)} bold />
        {reference.saleTotals && totals.grandTotal !== reference.saleTotals.grandTotal ? <Hint>Was {money(reference.saleTotals.grandTotal)}.</Hint> : null}
      </View>

      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 14, fontWeight: '700' }]}>Payment Method</Text>
      <View style={[formStyles.inline, { marginTop: 6 }]}>
        {SALE_PAYMENT_METHODS.map((m) => {
          const active = payment === m;
          return (
            <Pressable
              key={m}
              onPress={() => setPayment(m)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[
                styles.tender,
                { borderRadius: theme.radii.md, borderColor: active ? theme.colors.primary : theme.colors.border, backgroundColor: active ? `${theme.colors.primary}1A` : 'transparent' },
              ]}>
              <Text style={[theme.typography.bodySmall, { color: active ? theme.colors.primary : theme.colors.text, fontWeight: '600' }]}>{SALE_PAYMENT_LABEL[m]}</Text>
            </Pressable>
          );
        })}
      </View>
      {reference.paymentMethod && payment !== reference.paymentMethod ? <Hint>Was {SALE_PAYMENT_LABEL[reference.paymentMethod] ?? reference.paymentMethod}.</Hint> : null}

      <NoteField value={note} onChangeText={setNote} />
      <SheetButtons busy={save.isPending} label="Apply & Resolve" onCancel={onClose} onSave={submit} />
    </View>
  );
}

// ─── Demand lines ───────────────────────────────────────────────────────────

/** Web DemandItemsDialog: Requested and Approved per product; Approved is what moves stock, and only once the demand delivered. */
export function DemandItemsEditor({ ticket, reference, onClose, onDone, onDelete }: EditorProps & { reference: SupportReference; onDelete: (stockMoved: boolean) => void }) {
  const theme = useAppTheme();
  const productsQ = useSupportProducts();
  const save = useEditSupportDemandItems();
  const [rows, setRows] = useState<DemandDraftRow[]>(() => demandDraftRows(reference.demandItems ?? [], 'live'));
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const seq = useRef(0);
  const products = useMemo(() => productsQ.data ?? [], [productsQ.data]);
  const options = useMemo(() => products.map((p) => ({ value: p.id, label: p.name, hint: p.sku })), [products]);
  const stockMoved = reference.demandStockMoved === true;
  const deltas = demandDeltas(rows, reference.demandItems ?? []);
  const patch = (key: string, next: Partial<DemandDraftRow>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...next } : r)));

  const submit = () => {
    const problem = demandProblem(rows);
    if (problem) {
      Alert.alert('Check the Lines', problem);
      return;
    }
    save.mutate(
      { id: ticket.id, items: demandItemsPayload(rows), reason, note },
      {
        onSuccess: () => {
          Alert.alert('Demand Updated', demandSuccess(stockMoved, deltas.length));
          onDone();
        },
        onError: (e) => Alert.alert('Could Not Update the Demand', mapErrorToMessage(e)),
      },
    );
  };

  return (
    <View>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
        Requested is what the branch asked for. Approved is what Production granted — that is the figure that moves stock. Add or remove products, or change
        either quantity.
      </Text>
      {stockMoved ? (
        <Notice>
          This demand has already been delivered. Changing Approved moves real stock — the difference is applied to the branch and taken back out of the
          production pool.
        </Notice>
      ) : (
        <Notice tone="muted">
          This demand has not delivered yet, so no stock moves. Whatever Approved says here is what will be transferred when the branch verifies receipt.
        </Notice>
      )}
      {rows.map((r) => (
        <View key={r.key} style={[formStyles.box, { borderColor: theme.colors.border, borderRadius: theme.radii.md }]}>
          <ProductPicker
            value={r.productId || null}
            fallbackLabel={r.productName}
            options={options}
            loading={productsQ.isLoading}
            onPick={(id) => {
              const p = products.find((x) => x.id === id);
              if (p) patch(r.key, { productId: p.id, productName: p.name });
            }}
          />
          <Row>
            <View style={{ flex: 1 }}>
              <NumBox label="Requested" value={r.qty} onChangeText={(v) => patch(r.key, { qty: v })} keyboardType="number-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <NumBox label="Approved" value={r.approvedQty} onChangeText={(v) => patch(r.key, { approvedQty: v })} keyboardType="number-pad" />
            </View>
          </Row>
          <View style={{ marginTop: 8, alignSelf: 'flex-end' }}>
            <ActionChip icon="trash" label="Remove this product" danger onPress={() => setRows((rs) => rs.filter((x) => x.key !== r.key))} />
          </View>
        </View>
      ))}
      <View style={{ marginTop: 10, alignSelf: 'flex-start' }}>
        <ActionChip
          icon="plus"
          label="Add product"
          onPress={() => {
            seq.current += 1;
            setRows((rs) => [...rs, emptyDemandRow(`new-${seq.current}`)]);
          }}
        />
      </View>
      {demandDuplicated(rows) ? <Hint tone="danger">The same product is on more than one line — combine them.</Hint> : null}

      {stockMoved && deltas.length > 0 ? (
        <View style={[formStyles.box, { borderColor: theme.colors.border, borderRadius: theme.radii.md, gap: 4 }]}>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary, textTransform: 'uppercase' }]}>Stock that will move</Text>
          {deltas.map((d) => (
            <View key={d.productName} style={formStyles.between}>
              <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>{d.productName}</Text>
              <Text style={[theme.typography.bodySmall, { color: d.delta > 0 ? theme.colors.success : theme.colors.warning, fontWeight: '700' }]}>{signed(d.delta)}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <TextField label="Reason (kept on the demand)" value={reason} onChangeText={setReason} placeholder="Why this was corrected" />
      <NoteField label="Resolution note (sent to the raiser)" value={note} onChangeText={setNote} placeholder="What was done" />
      <SheetButtons busy={save.isPending} label="Save & resolve" onCancel={onClose} onSave={submit} />
      {/* Apart from the save actions on purpose: the one control here that cannot be undone. */}
      <View style={{ marginTop: 14 }}>
        <ActionChip icon="trash" label="Delete demand" danger disabled={save.isPending} onPress={() => onDelete(stockMoved)} />
      </View>
    </View>
  );
}

// ─── Branch stock ───────────────────────────────────────────────────────────

/**
 * Web StockFiguresDialog: each correctable figure set to what it should read;
 * Opening corrects yesterday's closing; Balance and Adjustment are one degree
 * of freedom (the toggle picks which one is typed).
 */
export function StockFiguresEditor({ ticket, reference, onClose, onDone }: EditorProps & { reference: SupportReference | null }) {
  const theme = useAppTheme();
  const figures = reference?.stockFigures ?? null;
  const productName = ticket.referenceSnapshot?.fields.find((f) => f.label === 'Product')?.value ?? ticket.referenceId;

  if (!ticket.branchId) {
    return (
      <View>
        <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
          This query was not raised from a branch, so there is no branch stock to correct. Resolve or reject it instead.
        </Text>
        <View style={{ marginTop: 18 }}>
          <SecondaryButton label="Close" onPress={onClose} />
        </View>
      </View>
    );
  }
  if (!figures) {
    return (
      <View>
        <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>Current stock is unavailable.</Text>
        <View style={{ marginTop: 18 }}>
          <SecondaryButton label="Close" onPress={onClose} />
        </View>
      </View>
    );
  }
  return <StockFiguresForm ticket={ticket} figures={figures} productName={productName} onClose={onClose} onDone={onDone} />;
}

function StockFiguresForm({ ticket, figures, productName, onClose, onDone }: EditorProps & { figures: NonNullable<SupportReference['stockFigures']>; productName: string }) {
  const theme = useAppTheme();
  const save = useChangeSupportFigures();
  const [state, setState] = useState<StockEditorState>(() => ({ targets: stockTargetsFrom(figures), residualMode: 'balance', balanceTouched: false, adjustmentTouched: false }));
  const [note, setNote] = useState('');
  const c = stockCorrection(figures, state);
  const inAdjustmentMode = state.residualMode === 'adjustment';

  const set = (key: StockKey, value: string) =>
    setState((s) => ({
      ...s,
      targets: { ...s.targets, [key]: value },
      balanceTouched: s.balanceTouched || key === 'balance',
      adjustmentTouched: s.adjustmentTouched || key === 'adjustment',
    }));
  const openingDelta = Number(state.targets.opening || 0) - figures.opening;

  const submit = () => {
    if (c.invalid) {
      Alert.alert('Check the Figures', 'Every figure must be 0 or more');
      return;
    }
    if (!c.changed) {
      Alert.alert('Nothing Changed', 'Change at least one figure');
      return;
    }
    save.mutate(
      { id: ticket.id, edits: c.edits, note },
      {
        onSuccess: (res) => {
          Alert.alert('Stock Corrected', stockSuccess(res));
          onDone();
        },
        onError: (e) => Alert.alert('Could Not Correct the Stock', mapErrorToMessage(e)),
      },
    );
  };

  return (
    <View>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
        {productName}
        {ticket.branchName ? ` · ${ticket.branchName}` : ''} — set each figure to what it should read. The branch’s stock is adjusted to match and the query is
        resolved.
      </Text>
      <View style={[formStyles.box, { borderColor: theme.colors.border, borderRadius: theme.radii.md, backgroundColor: theme.colors.cardFill }]}>
        <NumBox label="Opening Stock" hint={`now ${figures.opening} · carried from yesterday`} value={state.targets.opening} onChangeText={(v) => set('opening', v)} />
        {openingDelta !== 0 ? (
          <Hint tone="warning">
            This corrects yesterday’s closing, so the change is recorded on the previous business day. Today’s New / Sold / Returned are untouched; the balance
            moves by {signed(openingDelta)}.
          </Hint>
        ) : null}
        {figures.adjustment !== 0 ? <Hint>Adjustment so far {signed(figures.adjustment)} · earlier corrections today</Hint> : null}
      </View>
      {STOCK_FIELDS.map((f) => (
        <NumBox key={f.key} label={f.label} hint={`now ${figures[f.key]} · ${f.hint}`} value={state.targets[f.key]} onChangeText={(v) => set(f.key, v)} />
      ))}

      <View style={[formStyles.box, { borderColor: theme.colors.border, borderRadius: theme.radii.md }]}>
        <View style={formStyles.between}>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary, textTransform: 'uppercase', flexShrink: 1 }]}>Set the shelf count, or set the correction</Text>
          <View style={formStyles.inline}>
            <ActionChip icon="scales" label="Balance" primary={!inAdjustmentMode} onPress={() => setState((s) => ({ ...s, residualMode: 'balance' }))} />
            <ActionChip icon="pencil" label="Adjustment" primary={inAdjustmentMode} onPress={() => setState((s) => ({ ...s, residualMode: 'adjustment' }))} />
          </View>
        </View>
        <NumBox
          label="Balance"
          hint={`now ${figures.balance} · ${inAdjustmentMode ? 'follows the adjustment' : state.balanceTouched ? 'set by hand' : 'follows the figures above'}`}
          value={c.shownBalance}
          editable={!inAdjustmentMode}
          error={c.finalBalance < 0}
          onChangeText={(v) => set('balance', v)}
        />
        <NumBox
          label="Adjustment"
          hint={`now ${signed(figures.adjustment)} · ${inAdjustmentMode ? 'signed — may be negative' : 'follows the balance'}`}
          value={c.shownAdjustment}
          editable={inAdjustmentMode}
          keyboardType="numbers-and-punctuation"
          onChangeText={(v) => set('adjustment', v)}
        />
        <View style={{ marginTop: 8, alignSelf: 'flex-start' }}>
          <ActionChip
            icon="rotate-ccw"
            label="Clear"
            disabled={figures.adjustment === 0 && Number(state.targets.adjustment || 0) === 0}
            onPress={() =>
              setState((s) => ({ ...s, residualMode: 'adjustment', adjustmentTouched: true, targets: { ...s.targets, adjustment: '0' } }))
            }
          />
        </View>
        <Hint>Only today’s corrections. The column clears tomorrow on its own — the effect stays inside the balance that becomes tomorrow’s Opening.</Hint>
        {c.extraAdjustment !== 0 ? (
          <Hint>
            {inAdjustmentMode
              ? `Adjustment ${figures.adjustment} → ${c.finalAdjustment}, so Balance ${figures.balance} → ${c.finalBalance}.`
              : `Booked as an adjustment of ${signed(c.extraAdjustment)}.`}
          </Hint>
        ) : null}
        {c.finalBalance < 0 ? <Hint tone="danger">A branch balance cannot go below zero.</Hint> : null}
      </View>
      <Hint>
        Correcting Sold moves stock only — it does not change the day’s takings or payment method. For a sale recorded wrongly, raise the query against its
        sale ID (MB-…) instead, which corrects the order, its total and its tender along with the stock.
      </Hint>
      <NoteField value={note} onChangeText={setNote} placeholder="Reason for the correction" />
      <SheetButtons busy={save.isPending} label="Apply & Resolve" onCancel={onClose} onSave={submit} />
    </View>
  );
}

// ─── Production pool ────────────────────────────────────────────────────────

/** Web ProductionStockFiguresDialog: the day-scoped pool row; Total Stock follows, a negative balance is warned about, not refused. */
export function ProductionStockEditor({ ticket, reference, onClose, onDone }: EditorProps & { reference: SupportReference | null }) {
  const theme = useAppTheme();
  const save = useChangeSupportFigures();
  const figures = reference?.productionFigures ?? null;
  const [edited, setEdited] = useState<Record<string, string>>({});
  const [note, setNote] = useState('');
  const productName = reference?.fields.find((f) => f.label === 'Product')?.value ?? ticket.referenceId;

  if (!figures) {
    return (
      <View>
        <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>Current pool figures are unavailable.</Text>
        <View style={{ marginTop: 18 }}>
          <SecondaryButton label="Close" onPress={onClose} />
        </View>
      </View>
    );
  }
  const c = productionCorrection(figures, edited);

  const submit = () => {
    if (c.invalid) {
      Alert.alert('Check the Figures', 'Prepared, Approved and Sold must each be 0 or more');
      return;
    }
    if (!c.changed) {
      Alert.alert('Nothing Changed', 'Change at least one figure');
      return;
    }
    save.mutate(
      { id: ticket.id, edits: c.edits, note },
      {
        onSuccess: (res) => {
          Alert.alert('Production Stock Corrected', productionSuccess(res));
          onDone();
        },
        onError: (e) => Alert.alert('Could Not Correct the Production Stock', mapErrorToMessage(e)),
      },
    );
  };

  return (
    <View>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
        {productName} · central production pool — set each figure to what it should read. The pool is adjusted to match and the query is resolved.
      </Text>
      <View style={[formStyles.box, { borderColor: theme.colors.border, borderRadius: theme.radii.md, backgroundColor: theme.colors.cardFill, gap: 4 }]}>
        <TotalLine label="Total Stock" value={`${figures.totalStock} · opening + prepared today`} />
        {figures.adjustment !== 0 ? <TotalLine label="Adjustment so far" value={`${signed(figures.adjustment)} · earlier corrections today`} /> : null}
      </View>
      {PRODUCTION_FIELDS.map((f) => (
        <NumBox
          key={f.key}
          label={f.label}
          hint={`now ${figures[f.figure]} · ${f.hint}`}
          value={c.values[f.key] ?? ''}
          onChangeText={(v) => setEdited((p) => ({ ...p, [f.key]: v }))}
        />
      ))}
      <NumBox
        label="Today's Balance"
        hint={`now ${figures.balance} · ${c.balanceTouched ? 'set by hand' : 'follows the figures above'}`}
        value={c.shownBalance}
        keyboardType="numbers-and-punctuation"
        error={c.finalBalance < 0}
        onChangeText={(v) => setEdited((p) => ({ ...p, balance: v }))}
      />
      {c.extraAdjustment !== 0 ? <Hint>Booked as an adjustment of {signed(c.extraAdjustment)}.</Hint> : null}
      {c.finalBalance < 0 ? (
        <Hint tone="warning">
          This leaves the day negative — production still to do before what has already gone out is covered. Allowed, and flagged in red on the Production
          Stock page, but check it is really what the shelf says.
        </Hint>
      ) : null}
      <Hint>
        Correcting Sold moves pool stock only — it does not change the counter sale, its total or its tender. Production counter sales are not editable from
        here, so answer the sale query in words and correct its stock effect above.
      </Hint>
      <NoteField value={note} onChangeText={setNote} placeholder="Reason for the correction" />
      <SheetButtons busy={save.isPending} label="Apply & Resolve" onCancel={onClose} onSave={submit} />
    </View>
  );
}

// ─── Cash deposit ───────────────────────────────────────────────────────────

/** Web CashDepositDialog: Cash / Easypaisa / Bank / Fuel Charges, the deposit note and its date; the Total follows. */
export function CashDepositEditor({ ticket, reference, onClose, onDone, onDelete }: EditorProps & { reference: SupportReference | null; onDelete: () => void }) {
  const theme = useAppTheme();
  const save = useChangeSupportFigures();
  const current = useMemo(() => depositCurrent(reference), [reference]);
  const [values, setValues] = useState<DepositValues>(current);
  const [note, setNote] = useState('');
  const today = useMemo(() => getBusinessDate(), []);
  const editable = (reference?.editableFields?.length ?? 0) > 0;
  const approved = reference?.cashTransferApproved === true;
  const changed = depositChangedFigures(values.figures, current);
  const dateChanged = values.date.trim() !== '' && values.date.trim() !== current.date;

  const submit = () => {
    const built = depositEdits(values, current, today);
    if ('error' in built) {
      Alert.alert('Check the Deposit', built.error);
      return;
    }
    save.mutate(
      { id: ticket.id, edits: built.edits, note },
      {
        onSuccess: () => {
          Alert.alert('Deposit Corrected', 'Cash deposit corrected & query resolved');
          onDone();
        },
        onError: (e) => Alert.alert('Could Not Apply the Change', mapErrorToMessage(e)),
      },
    );
  };

  return (
    <View>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
        {reference?.title ?? 'Cash deposit'}. Changes are written to the deposit and the query is resolved.
      </Text>
      {!editable ? (
        <>
          <Hint>This deposit can no longer be corrected — it was rejected or deleted. Reply from View instead.</Hint>
          <View style={{ marginTop: 18 }}>
            <SecondaryButton label="Close" onPress={onClose} />
          </View>
        </>
      ) : (
        <>
          <View style={{ marginTop: 16 }}>
            <DateField label="Date" value={values.date} onChange={(v) => setValues((p) => ({ ...p, date: v }))} maximumDate={today} />
          </View>
          {dateChanged && current.date ? <Hint>Was {formatDisplayDate(current.date)}.</Hint> : null}
          {DEPOSIT_FIGURES.map((f) => (
            <View key={f.key}>
              <NumBox label={f.label} value={values.figures[f.key]} onChangeText={(v) => setValues((p) => ({ ...p, figures: { ...p.figures, [f.key]: v } }))} />
              {changed.includes(f.key) ? <Hint>Was {money(Number(current.figures[f.key]))}.</Hint> : null}
            </View>
          ))}
          <View style={[formStyles.box, { borderColor: theme.colors.border, borderRadius: theme.radii.md, backgroundColor: theme.colors.cardFill }]}>
            <TotalLine label="Total Amount (Cash + Easypaisa + Bank)" value={money(depositTotal(values.figures))} bold />
          </View>
          <TextField label="Deposit note" value={values.note} onChangeText={(v) => setValues((p) => ({ ...p, note: v }))} placeholder="Note on the deposit" />
          {approved && (changed.length > 0 || dateChanged) ? (
            <Notice>
              This deposit is approved and booked in the Daily Ledger.
              {changed.length > 0 ? ' Applying corrects its receipts in place — they keep their numbers and nothing is reversed.' : ''}
              {dateChanged ? ' Changing the date moves its receipts to the new date — nothing is reversed.' : ''}
            </Notice>
          ) : null}
          <NoteField value={note} onChangeText={setNote} />
          <SheetButtons busy={save.isPending} label="Apply & Resolve" onCancel={onClose} onSave={submit} />
          <View style={{ marginTop: 14 }}>
            <ActionChip icon="trash" label="Delete data" danger disabled={save.isPending} onPress={onDelete} />
          </View>
        </>
      )}
    </View>
  );
}

// ─── Flat fields ────────────────────────────────────────────────────────────

/** Web FieldEditDialog: an expense's amount / description written live, or a recorded correction for manual follow-up. */
export function FieldEditor({ ticket, onClose, onDone }: EditorProps) {
  const theme = useAppTheme();
  const save = useChangeSupportFigures();
  const { rows, isLiveEdit } = useMemo(() => fieldEditRows(ticket.referenceSnapshot), [ticket.referenceSnapshot]);
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(rows.map((r) => [r.key, r.value])));
  const [note, setNote] = useState('');

  const submit = () => {
    const edits = fieldEdits(rows, values);
    if (Object.keys(edits).length === 0) {
      Alert.alert('Nothing Changed', 'Change at least one value');
      return;
    }
    save.mutate(
      { id: ticket.id, edits, note },
      {
        onSuccess: (res) => {
          Alert.alert('Query Resolved', res.applied ? 'Figures updated & query resolved' : 'Correction recorded & query resolved');
          onDone();
        },
        onError: (e) => Alert.alert('Could Not Apply the Change', mapErrorToMessage(e)),
      },
    );
  };

  return (
    <View>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
        {isLiveEdit
          ? 'Edits are written directly to the record and the query is resolved.'
          : 'This reference has no directly correctable figure, so the change is recorded on the ticket for manual follow-up.'}
      </Text>
      {rows.map((r) => (
        <TextField key={r.key} label={r.label} value={values[r.key] ?? ''} editable={r.editable} onChangeText={(v) => setValues((p) => ({ ...p, [r.key]: v }))} />
      ))}
      <NoteField value={note} onChangeText={setNote} />
      <SheetButtons busy={save.isPending} label="Apply & Resolve" onCancel={onClose} onSave={submit} />
    </View>
  );
}

/** Web NothingToChangeDialog — a reference with no figure that can be written back. */
export function NothingToChange({ cashDeposit, onClose }: { cashDeposit: boolean; onClose: () => void }) {
  const theme = useAppTheme();
  return (
    <View>
      <View style={formStyles.inline}>
        <Icon name="info" size={16} color={theme.colors.textSecondary} />
        <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, flex: 1 }]}>
          This reference is informational only — there is no figure here that can be written back. Use Mark Resolved or Reject to answer the query.
          {cashDeposit ? ' This cash deposit was rejected, so it is final — nothing was booked for it. The branch records a new deposit instead.' : ''}
        </Text>
      </View>
      <View style={{ marginTop: 18 }}>
        <SecondaryButton label="Close" onPress={onClose} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tender: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9 },
});
