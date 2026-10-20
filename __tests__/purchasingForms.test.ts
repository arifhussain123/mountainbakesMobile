/**
 * @format
 */
import type { PurchaseDemand, PurchaseDemandDetail, Quotation } from '@/api/purchasingTypes';
import { demandFormFromDemand, emptyDemandForm, emptyDemandLine, toDemandInput, validateDemandForm, type DemandFormState } from '@/features/purchasing/utils/demandForm';
import {
  billDifferencesPreview,
  billFormFromQuotation,
  billTotalPreview,
  quotationFormFromDemand,
  quotationTotalPreview,
  receiptFormFromDetail,
  stockItemForBillLine,
  substituteLine,
  toBillInput,
  toQuotationInput,
  toReceiptInput,
  validateBillForm,
  validateQuotationForm,
  validateReceiptForm,
  withAvailability,
} from '@/features/purchasing/utils/entryForms';
import {
  billRoom,
  creditRepaymentRoom,
  deliveryFormFrom,
  emptyPaymentForm,
  emptySupplierForm,
  paidOnError,
  paymentRoom,
  reasonError,
  toDeliveryInput,
  toPaymentInput,
  toSupplierInput,
  validateCreditForm,
  validateDeliveryForm,
  validatePaymentForm,
  validateSupplierForm,
  emptyCreditForm,
} from '@/features/purchasing/utils/moneyForms';
import { formatQty, lineTotalPreview, parseMoney, parseQuantity, sumMoney, trimOrNull } from '@/features/purchasing/utils/numbers';
import { connectionInfo, eventLabel, messageError, replyWindowUntil } from '@/features/purchasing/utils/purchasingFormat';
import { canonicalJson, describeApiError, isConflict, keyForBody } from '@/features/purchasing/utils/submission';

describe('numbers — the schema rules for money and quantity', () => {
  it('parses quantities with at most 3 decimals, above zero unless allowed', () => {
    expect(parseQuantity('10')).toEqual({ ok: true, value: 10 });
    expect(parseQuantity('1.25')).toEqual({ ok: true, value: 1.25 });
    expect(parseQuantity('1,000')).toEqual({ ok: true, value: 1000 });
    expect(parseQuantity('1.2345')).toEqual({ ok: false, error: 'Quantity can have at most 3 decimal places' });
    expect(parseQuantity('0')).toEqual({ ok: false, error: 'Enter a quantity above zero' });
    expect(parseQuantity('0', { allowZero: true })).toEqual({ ok: true, value: 0 });
    expect(parseQuantity('-2').ok).toBe(false);
    expect(parseQuantity('abc').ok).toBe(false);
    expect(parseQuantity('').ok).toBe(false);
  });

  it('parses money with at most 2 decimals', () => {
    expect(parseMoney('1200.5')).toEqual({ ok: true, value: 1200.5 });
    expect(parseMoney('1.234')).toEqual({ ok: false, error: 'Amount can have at most 2 decimal places' });
    expect(parseMoney('0', { positive: true })).toEqual({ ok: false, error: 'Enter an amount above zero' });
    expect(parseMoney('200000000').ok).toBe(false);
  });

  it('previews line totals and sums in paisa, without float noise', () => {
    expect(lineTotalPreview(8, 150.25)).toBe(1202);
    expect(lineTotalPreview(0.3, 0.1)).toBe(0.03);
    expect(sumMoney([0.1, 0.2])).toBe(0.3);
  });

  it('formats a quantity with its unit and trims blank text to null', () => {
    expect(formatQty(8, 'kg')).toBe('8 kg');
    expect(formatQty(0.3333, 'l')).toBe('0.333 l');
    expect(formatQty(null)).toBe('-');
    expect(trimOrNull('  ')).toBeNull();
    expect(trimOrNull(' x ')).toBe('x');
  });
});

const supplier = { id: '11111111-1111-4111-8111-111111111111', name: 'Punjab Flour', whatsappNumber: '+923001234567' };

function filledForm(): DemandFormState {
  const form = emptyDemandForm('2026-10-25');
  return {
    ...form,
    supplier,
    priority: 'urgent',
    lines: [
      { ...emptyDemandLine(), itemName: ' Flour ', qty: '10', unit: 'kg', note: '' },
      { ...emptyDemandLine(), itemId: '22222222-2222-4222-8222-222222222222', itemCode: 'ING-1', itemName: 'Butter', qty: '5', unit: 'kg', note: ' salted ' },
    ],
  };
}

describe('demand form → DemandInput', () => {
  it('flags every missing piece on its own field', () => {
    const form = { ...emptyDemandForm('2026-10-25'), requiredDate: '' };
    const errors = validateDemandForm(form);
    const line = form.lines[0]!;
    expect(errors.supplier).toBe('Choose a supplier');
    expect(errors.requiredDate).toBeDefined();
    expect(errors[`line.${line.key}.itemName`]).toBe('Enter the item name');
    expect(errors[`line.${line.key}.qty`]).toBeDefined();
    expect(errors[`line.${line.key}.unit`]).toBe('Choose a unit');
  });

  it('requires the credit amount only for Loan / Credit', () => {
    const form = filledForm();
    expect(validateDemandForm(form)).toEqual({});
    expect(validateDemandForm({ ...form, paymentPreference: 'credit' }).creditAmount).toBe('Enter the credit amount requested');
    expect(validateDemandForm({ ...form, paymentPreference: 'credit', creditAmount: '5000' })).toEqual({});
  });

  it('maps to the request body, trimming text and sending credit fields only with credit', () => {
    const form = { ...filledForm(), creditAmount: '5000', creditTerms: '30 days' };
    expect(toDemandInput(form)).toEqual({
      supplierId: supplier.id,
      priority: 'urgent',
      requiredDate: '2026-10-25',
      notes: null,
      deliveryInstructions: null,
      paymentPreference: 'cash',
      creditReference: null,
      creditAmountRequested: null,
      creditTerms: null,
      creditDueDate: null,
      creditNotes: null,
      items: [
        { itemId: null, itemName: 'Flour', itemCode: null, requestedQty: 10, unit: 'kg', note: null },
        { itemId: '22222222-2222-4222-8222-222222222222', itemName: 'Butter', itemCode: 'ING-1', requestedQty: 5, unit: 'kg', note: 'salted' },
      ],
    });
    const credit = toDemandInput({ ...form, paymentPreference: 'credit' });
    expect(credit.creditAmountRequested).toBe(5000);
    expect(credit.creditTerms).toBe('30 days');
  });

  it('round-trips a saved draft back into the form', () => {
    const saved = {
      supplierId: supplier.id,
      supplierName: supplier.name,
      supplierWhatsapp: supplier.whatsappNumber,
      priority: 'normal',
      requiredDate: '2026-11-01',
      notes: 'Back gate',
      deliveryInstructions: null,
      paymentPreference: 'credit',
      creditReference: null,
      creditAmountRequested: 1500.5,
      creditTerms: null,
      creditDueDate: null,
      creditNotes: null,
      items: [
        { id: 'b', lineNo: 2, itemId: null, itemName: 'Sugar', itemCode: null, requestedQty: 2.5, unit: 'kg', note: null },
        { id: 'a', lineNo: 1, itemId: null, itemName: 'Eggs', itemCode: null, requestedQty: 30, unit: 'dozen', note: null },
      ],
    } as unknown as PurchaseDemand;
    const form = demandFormFromDemand(saved);
    expect(form.lines.map((l) => [l.itemName, l.qty, l.unit])).toEqual([
      ['Eggs', '30', 'dozen'],
      ['Sugar', '2.5', 'kg'],
    ]);
    expect(form.creditAmount).toBe('1500.5');
    expect(toDemandInput(form).items[0]!.requestedQty).toBe(30);
  });
});

const demand = {
  items: [
    { id: 'di-flour', lineNo: 1, itemId: 'stock-flour', itemName: 'Flour', itemCode: null, requestedQty: 10, unit: 'kg', note: null },
    { id: 'di-butter', lineNo: 2, itemId: null, itemName: 'Butter', itemCode: null, requestedQty: 5, unit: 'kg', note: null },
  ],
} as unknown as PurchaseDemandDetail;

describe('quotation entered for the supplier', () => {
  it('prefills one available line per requested item, and enforces availability rules', () => {
    const form = quotationFormFromDemand(demand);
    expect(form.lines.map((l) => [l.itemName, l.availability, l.availableQty])).toEqual([
      ['Flour', 'available', '10'],
      ['Butter', 'available', '5'],
    ]);
    // No rates yet.
    expect(Object.keys(validateQuotationForm(form))).toHaveLength(2);

    const [flour, butter] = form.lines as [(typeof form.lines)[0], (typeof form.lines)[0]];
    const partialFlour = { ...withAvailability(flour, 'partial'), availableQty: '8', unitRate: '150' };
    const noButter = { ...withAvailability(butter, 'unavailable') };
    expect(noButter.availableQty).toBe('0');
    const margarine = { ...substituteLine(butter), itemName: 'Margarine', availableQty: '5', unitRate: '600' };
    const filled = { ...form, lines: [partialFlour, noButter, margarine], deliveryCharge: '250' };
    expect(validateQuotationForm(filled)).toEqual({});
    expect(quotationTotalPreview(filled)).toBe(8 * 150 + 5 * 600 + 250);
    expect(toQuotationInput(filled)).toEqual({
      items: [
        { demandItemId: 'di-flour', substituteForDemandItemId: null, itemName: 'Flour', unit: 'kg', availableQty: 8, unitRate: 150, availability: 'partial', note: null },
        { demandItemId: 'di-butter', substituteForDemandItemId: null, itemName: 'Butter', unit: 'kg', availableQty: 0, unitRate: 0, availability: 'unavailable', note: null },
        { demandItemId: null, substituteForDemandItemId: 'di-butter', itemName: 'Margarine', unit: 'kg', availableQty: 5, unitRate: 600, availability: 'substitute', note: null },
      ],
      deliveryCharge: 250,
      estimatedDeliveryDate: null,
      deliveryNotes: null,
      notes: null,
    });
  });

  it('refuses a partial line that offers all of it, and a substitute with no name', () => {
    const form = quotationFormFromDemand(demand);
    const flour = { ...withAvailability(form.lines[0]!, 'partial'), availableQty: '10', unitRate: '1' };
    const sub = { ...substituteLine(form.lines[1]!), availableQty: '1', unitRate: '1' };
    const errors = validateQuotationForm({ ...form, lines: [flour, sub] });
    expect(errors[`line.${flour.key}.availableQty`]).toMatch(/less than requested/);
    expect(errors[`line.${sub.key}.itemName`]).toBe('Enter the item name');
  });
});

const quotation = {
  id: 'q1',
  version: 1,
  deliveryCharge: 300,
  items: [
    { id: 'qi-flour', lineNo: 1, demandItemId: 'di-flour', itemName: 'Flour', unit: 'kg', availableQty: 8, unitRate: 150, availability: 'partial' },
    { id: 'qi-butter', lineNo: 2, demandItemId: 'di-butter', itemName: 'Butter', unit: 'kg', availableQty: 5, unitRate: 1200.5, availability: 'available' },
    { id: 'qi-none', lineNo: 3, demandItemId: null, itemName: 'Yeast', unit: 'g', availableQty: 0, unitRate: 0, availability: 'unavailable' },
  ],
} as unknown as Quotation;

describe('bill entered for the supplier', () => {
  it('starts exactly as the approved quotation, leaving out what was not available', () => {
    const form = billFormFromQuotation(quotation, '2026-10-20');
    expect(form.lines.map((l) => l.itemName)).toEqual(['Flour', 'Butter']);
    expect(validateBillForm(form).supplierBillNo).toBe('Enter the bill number');
    const filled = { ...form, supplierBillNo: 'PFD-5521' };
    expect(validateBillForm(filled)).toEqual({});
    expect(billDifferencesPreview(filled)).toEqual([]);
    expect(billTotalPreview(filled)).toBe(8 * 150 + 6002.5 + 300);
    expect(toBillInput(filled)).toEqual({
      supplierBillNo: 'PFD-5521',
      invoiceDate: '2026-10-20',
      deliveryDate: null,
      items: [
        { quotationItemId: 'qi-flour', qty: 8, unitRate: 150 },
        { quotationItemId: 'qi-butter', qty: 5, unitRate: 1200.5 },
      ],
      deliveryCharge: 300,
      discount: 0,
      otherCharges: 0,
      otherChargesNote: null,
      supplierPaymentMethod: null,
      supplierStatedPaid: 0,
      notes: null,
    });
  });

  it('lists every difference from the quotation before saving', () => {
    const form = billFormFromQuotation(quotation, '2026-10-20');
    const [flour, butter] = form.lines as [(typeof form.lines)[0], (typeof form.lines)[0]];
    const changed = { ...form, supplierBillNo: 'B1', otherCharges: '50', discount: '100', lines: [{ ...flour, unitRate: '160' }, { ...butter, included: false }] };
    expect(billDifferencesPreview(changed)).toEqual(['Flour: rate 150 → 160', 'Butter: left off the bill', 'Other charges 50']);
    expect(billTotalPreview(changed)).toBe(8 * 160 + 300 + 50 - 100);
    expect(toBillInput(changed).items).toEqual([{ quotationItemId: 'qi-flour', qty: 8, unitRate: 160 }]);
    expect(validateBillForm({ ...changed, lines: [{ ...flour, included: false }, { ...butter, included: false }] }).lines).toBeDefined();
  });
});

const detail = {
  items: demand.items,
  quotations: [quotation],
  bills: [
    {
      id: 'bill1',
      status: 'approved',
      items: [
        { id: 'bi-flour', quotationItemId: 'qi-flour', itemName: 'Flour', unit: 'kg', qty: 8, unitRate: 150, lineTotal: 1200 },
        { id: 'bi-butter', quotationItemId: 'qi-butter', itemName: 'Butter', unit: 'kg', qty: 5, unitRate: 1200.5, lineTotal: 6002.5 },
      ],
    },
  ],
  receiptProgress: [
    { billItemId: 'bi-flour', itemName: 'Flour', unit: 'kg', billed: 8, received: 5, damaged: 1, outstanding: 3 },
    { billItemId: 'bi-butter', itemName: 'Butter', unit: 'kg', billed: 5, received: 0, damaged: 0, outstanding: 5 },
  ],
} as unknown as PurchaseDemandDetail;

describe('goods receipt', () => {
  it('finds the demand\'s catalog item behind a bill line, and fixes it', () => {
    expect(stockItemForBillLine(detail, 'bi-flour')).toEqual({ id: 'stock-flour', name: 'Flour' });
    expect(stockItemForBillLine(detail, 'bi-butter')).toBeNull();
    const form = receiptFormFromDetail(detail);
    expect(form.lines.map((l) => [l.itemName, l.received, l.itemId, l.itemFixed])).toEqual([
      ['Flour', '3', 'stock-flour', true],
      ['Butter', '5', null, false],
    ]);
  });

  it('refuses more than is owed, damage above received, and a line with no stock item', () => {
    const form = receiptFormFromDetail(detail);
    const [flour, butter] = form.lines as [(typeof form.lines)[0], (typeof form.lines)[0]];
    const errors = validateReceiptForm({ ...form, lines: [{ ...flour, received: '4' }, { ...butter, received: '2', damaged: '3' }] });
    expect(errors['line.bi-flour.received']).toBe('Only 3 kg is still owed');
    expect(errors['line.bi-butter.damaged']).toBe('Damaged cannot exceed received');
    expect(errors['line.bi-butter.itemId']).toBe('Choose the stock item');
  });

  it('sends only lines that arrived; a final receipt may send none', () => {
    const form = receiptFormFromDetail(detail);
    const [flour, butter] = form.lines as [(typeof form.lines)[0], (typeof form.lines)[0]];
    const lines = [{ ...flour, received: '2', damaged: '' }, { ...butter, received: '0' }];
    expect(validateReceiptForm({ ...form, lines })).toEqual({});
    expect(toReceiptInput({ ...form, lines, notes: ' short ' })).toEqual({
      items: [{ billItemId: 'bi-flour', itemId: 'stock-flour', receivedQty: 2, damagedQty: 0, note: null }],
      final: false,
      notes: 'short',
    });
    const none = [{ ...flour, received: '0' }, { ...butter, received: '0' }];
    expect(validateReceiptForm({ ...form, lines: none }).lines).toBeDefined();
    expect(validateReceiptForm({ ...form, lines: none, final: true })).toEqual({});
  });
});

describe('payment and credit limits (the server\'s rules, said first)', () => {
  const money = {
    totals: { billTotal: 7502.5 },
    payments: [
      { amount: 1000, status: 'posted', creditId: null },
      { amount: 500, status: 'pending_approval', creditId: null },
      { amount: 400, status: 'rejected', creditId: null },
      { amount: 200, status: 'pending_approval', creditId: 'c1' },
    ],
    credits: [{ id: 'c1', status: 'active', requestedAmount: 3000, approvedAmount: 2500, outstanding: 2500 }],
  } as unknown as PurchaseDemandDetail;

  it('leaves the bill less direct payments and credit for a direct payment', () => {
    expect(billRoom(money)).toBe(7502.5 - 1000 - 500 - 2500);
    expect(billRoom({ ...money, totals: { ...money.totals, billTotal: null } } as unknown as PurchaseDemandDetail)).toBeNull();
  });

  it("leaves a credit's outstanding less pending repayments for a repayment", () => {
    expect(creditRepaymentRoom(money, 'c1')).toBe(2300);
    expect(paymentRoom(money, 'c1')).toBe(2300);
    expect(paymentRoom(money, null)).toBe(3502.5);
  });

  it('validates a payment: amount within room, reference for non-cash, paidOn not future nor before the demand', () => {
    const form = { ...emptyPaymentForm('2026-10-20', 3502.5), method: 'easypaisa' as const };
    const limits = { room: 3502.5, today: '2026-10-20', earliest: '2026-10-18' };
    expect(form.amount).toBe('3502.5');
    expect(validatePaymentForm(form, limits)).toEqual({ referenceNo: 'Enter the transaction reference' });
    expect(validatePaymentForm({ ...form, referenceNo: 'TID1', amount: '4000' }, limits).amount).toMatch(/Only 3,502.5 is left/);
    expect(paidOnError('2026-10-21', '2026-10-20', '2026-10-18')).toMatch(/future/);
    expect(paidOnError('2026-10-17', '2026-10-20', '2026-10-18')).toMatch(/before the demand/);
    expect(paidOnError('2026-10-19', '2026-10-20', '2026-10-18')).toBeNull();
    expect(toPaymentInput({ ...form, referenceNo: ' TID1 ', notes: '' })).toEqual({
      method: 'easypaisa',
      amount: 3502.5,
      referenceNo: 'TID1',
      paidOn: '2026-10-20',
      notes: null,
      creditId: null,
    });
  });

  it('validates a credit request against the room left', () => {
    expect(validateCreditForm(emptyCreditForm(null), 100).amount).toBe('Enter the credit amount');
    expect(validateCreditForm({ ...emptyCreditForm(null), amount: '150' }, 100).amount).toMatch(/Only 100/);
    expect(validateCreditForm({ ...emptyCreditForm(null), amount: '100' }, 100)).toEqual({});
  });
});

describe('delivery, supplier and reasons', () => {
  it('needs a service name for Other and who received it once delivered', () => {
    const form = deliveryFormFrom(null);
    expect(form.provider).toBe('bykea');
    expect(validateDeliveryForm({ ...form, provider: 'other' }).providerName).toBe('Name the service');
    expect(validateDeliveryForm({ ...form, status: 'delivered' }).receivedByName).toBe('Enter who received it');
    expect(toDeliveryInput({ ...form, bookingReference: 'BYK-88', estimatedFee: '350', status: 'dispatched', providerName: 'ignored' })).toEqual({
      provider: 'bykea',
      providerName: null,
      bookingReference: 'BYK-88',
      estimatedFee: 350,
      actualFee: null,
      feePaidBy: 'mountain_bakes',
      pickupDetails: null,
      deliveryNotes: null,
      status: 'dispatched',
      receivedByName: null,
    });
  });

  it("refuses a supplier without WhatsApp consent or a usable number", () => {
    const form = { ...emptySupplierForm(), name: 'Ali Traders', whatsappNumber: '0300 1234567' };
    expect(validateSupplierForm(form).optIn).toMatch(/agreed/);
    expect(validateSupplierForm({ ...form, whatsappNumber: '12ab', optIn: true }).whatsappNumber).toBeDefined();
    expect(validateSupplierForm({ ...form, optIn: true })).toEqual({});
    expect(toSupplierInput({ ...form, optIn: true, optInSource: ' In person ' })).toMatchObject({ name: 'Ali Traders', whatsappNumber: '0300 1234567', whatsappOptIn: true, whatsappOptInSource: 'In person', phone: null });
  });

  it('asks for a reason of 3+ characters, a note of 1+', () => {
    expect(reasonError('ok')).toBe('Give a reason');
    expect(reasonError('Too high')).toBeNull();
    expect(reasonError('x', 1)).toBeNull();
    expect(reasonError(' ', 1)).toBe('Write a note');
  });
});

describe('submission keys', () => {
  it('reuses the key for the same body in any key order, and mints a new one for an edited body', () => {
    let n = 0;
    const mint = () => `key-${++n}`;
    const first = keyForBody(null, { a: 1, b: [1, { c: 2, d: undefined }] }, mint);
    expect(first.key).toBe('key-1');
    expect(keyForBody(first, { b: [1, { c: 2 }], a: 1 }, mint)).toBe(first);
    expect(keyForBody(first, { a: 2, b: [1, { c: 2 }] }, mint).key).toBe('key-2');
    expect(canonicalJson({ z: 1, a: { y: null, b: 'x' } })).toBe('{"a":{"b":"x","y":null},"z":1}');
  });

  it("shows the server's sentence, plus each field of a validation error", () => {
    const fallback = (e: unknown) => (e as { message: string }).message;
    expect(describeApiError({ status: 409, message: 'That demand changed.' }, fallback)).toBe('That demand changed.');
    expect(
      describeApiError({ status: 400, message: 'Validation error', details: [{ field: 'items.1.requestedQty', message: 'Enter a quantity above zero' }, { field: 'paidOn', message: 'Cannot be in the future' }] }, fallback),
    ).toBe('Line 2: Enter a quantity above zero\nPaid on: Cannot be in the future');
    expect(isConflict({ status: 409, message: 'x' })).toBe(true);
    expect(isConflict(new Error('x'))).toBe(false);
  });
});

describe('labels', () => {
  it('says test mode plainly and never needs a secret', () => {
    const info = connectionInfo({ provider: 'mock', state: 'mock', missing: [], outbox: { pending: 0, failed: 0 } } as never);
    expect(info.isTestMode).toBe(true);
    expect(info.detail).toMatch(/Test mode, no real WhatsApp messages are sent/);
    expect(connectionInfo({ provider: 'meta', state: 'configuration_required', missing: ['A', 'B'] } as never).detail).toMatch(/2 settings missing/);
  });

  it('opens the reply window for 24 h after the last inbound message', () => {
    const now = new Date('2026-10-20T12:00:00Z');
    expect(replyWindowUntil(null, [], now)).toBeNull();
    expect(replyWindowUntil(null, [{ direction: 'inbound', createdAt: '2026-10-19T13:00:00Z' }], now)?.toISOString()).toBe('2026-10-20T13:00:00.000Z');
    expect(replyWindowUntil(null, [{ direction: 'inbound', createdAt: '2026-10-19T11:00:00Z' }], now)).toBeNull();
    expect(replyWindowUntil(null, [{ direction: 'outbound', createdAt: '2026-10-20T11:00:00Z' }], now)).toBeNull();
    expect(replyWindowUntil('2026-10-20T15:00:00Z', [], now)?.toISOString()).toBe('2026-10-20T15:00:00.000Z');
  });

  it('humanises events and message errors', () => {
    expect(eventLabel('quotation_submitted')).toBe('Quotation submitted');
    expect(messageError({ errorCode: '131026', errorTitle: 'Message undeliverable', errorDetail: null })).toBe('Message undeliverable (code 131026)');
    expect(messageError({ errorCode: null, errorTitle: null, errorDetail: null })).toBeNull();
  });
});
