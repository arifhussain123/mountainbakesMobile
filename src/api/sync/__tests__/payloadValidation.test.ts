import { optionalBusinessDate } from '@/shared/schemas/business-date.schemas';
import { CreateExpenseSchema } from '@/shared/schemas/expense.schemas';
import {
  CreateOrderSchema,
  CreatePosSaleSchema,
  CreateProductionSaleSchema,
} from '@/shared/schemas/order.schemas';
import { CreateProductionOrderSchema } from '@/shared/schemas/production-order.schemas';
import { CreateBranchReturnSchema } from '@/shared/schemas/production-ops.schemas';
import { endpointFor } from '../endpoints';

/**
 * Validation of what this app actually queues.
 *
 * The write hooks are typed against the shared input types but do **not**
 * validate at runtime — a payload goes into SQLite and the queue as given, and
 * the server is the first thing to judge it. Offline that judgement can arrive
 * hours later, by which point the transaction parks as `failed` and a person has
 * to work out what a shift entered wrongly.
 *
 * These run the payload shapes the app builds through the SAME Zod schemas the
 * server validates with — `src/shared/` is byte-identical to
 * `mountainbakes-server/src/shared/`, so this is the server's own answer, not a
 * local approximation. What it catches is drift: a field renamed on one side, an
 * enum that gained a value in the server tree and not here, a required key the
 * app never sends.
 */

const BUSINESS_DATE = '2026-08-18';

describe('expense', () => {
  it('accepts what useCreateExpense queues', () => {
    const payload = {
      category: 'Utilities',
      description: 'Electricity bill',
      paymentMethod: 'cash',
      amount: 4500,
      remarks: '',
    };
    expect(CreateExpenseSchema.safeParse(payload).success).toBe(true);
  });

  it('rejects a non-positive amount', () => {
    const base = {
      category: 'Utilities',
      description: 'Electricity bill',
      paymentMethod: 'cash',
      remarks: '',
    };
    expect(CreateExpenseSchema.safeParse({ ...base, amount: 0 }).success).toBe(false);
    expect(CreateExpenseSchema.safeParse({ ...base, amount: -100 }).success).toBe(false);
  });

  it('rejects an empty category or description', () => {
    const base = { paymentMethod: 'cash', amount: 100, remarks: '' };
    expect(
      CreateExpenseSchema.safeParse({ ...base, category: '', description: 'x' }).success,
    ).toBe(false);
    expect(
      CreateExpenseSchema.safeParse({ ...base, category: 'x', description: '' }).success,
    ).toBe(false);
  });

  /** Expenses take `cash` or `easypaisa` only — narrower than an order's list. */
  it('rejects a payment method an order allows but an expense does not', () => {
    const payload = {
      category: 'Utilities',
      description: 'x',
      paymentMethod: 'foodpanda',
      amount: 100,
      remarks: '',
    };
    expect(CreateExpenseSchema.safeParse(payload).success).toBe(false);
  });

  it('defaults remarks so an omitted field is not an undefined column', () => {
    const parsed = CreateExpenseSchema.safeParse({
      category: 'Utilities',
      description: 'x',
      paymentMethod: 'cash',
      amount: 100,
    });
    expect(parsed.success && parsed.data.remarks).toBe('');
  });
});

describe('POS sale', () => {
  const sale = {
    branchId: 'b-1',
    customerName: '',
    customerPhone: '',
    items: [{ productId: 'p-1', qty: 2, discount: 0 }],
    paymentMethod: 'cash',
    notes: '',
  };

  it('accepts what useCreateSale queues', () => {
    expect(CreatePosSaleSchema.safeParse(sale).success).toBe(true);
  });

  it('requires at least one item — an empty basket is not a sale', () => {
    expect(CreatePosSaleSchema.safeParse({ ...sale, items: [] }).success).toBe(false);
  });

  it('requires a whole positive quantity', () => {
    for (const qty of [0, -1, 1.5]) {
      const bad = { ...sale, items: [{ productId: 'p-1', qty, discount: 0 }] };
      expect(CreatePosSaleSchema.safeParse(bad).success).toBe(false);
    }
  });

  it('rejects a negative discount', () => {
    const bad = { ...sale, items: [{ productId: 'p-1', qty: 1, discount: -50 }] };
    expect(CreatePosSaleSchema.safeParse(bad).success).toBe(false);
  });

  /**
   * The line carries no price. The device cannot tell the server what it
   * charged, which is what makes a price change between opening the form and
   * saving impossible to misprint — and is also why the price-drift conflict
   * exists rather than a client-side fix.
   */
  it('carries no unit price — money is the server to decide', () => {
    const parsed = CreatePosSaleSchema.safeParse(sale);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(Object.keys(parsed.data.items[0]!).sort()).toEqual(['discount', 'productId', 'qty']);
    }
  });

  /**
   * `staff` is a production-counter payment method. A branch POS sale must never
   * offer it — the same tab name resolves to different screens by role, and this
   * is the schema-level half of that rule.
   */
  it('refuses the staff payment method a branch sale must not offer', () => {
    expect(CreatePosSaleSchema.safeParse({ ...sale, paymentMethod: 'staff' }).success).toBe(false);
    // ...while the production sale schema accepts it, given a comment.
    const productionSale = CreateProductionSaleSchema.safeParse({
      items: [{ productId: 'p-1', qty: 1, discount: 0 }],
      paymentMethod: 'staff',
      customerName: '',
      customerPhone: '',
      notes: 'Night shift — 2 rusk packets, approved by branch manager',
    });
    expect(productionSale.success).toBe(true);
  });

  /**
   * A staff sale takes no money and is excluded from every revenue total, so the
   * comment is the only record of who took what and why. An empty one would make
   * the sale unauditable.
   */
  it('requires a comment on a staff sale, which takes no money', () => {
    const withoutComment = CreateProductionSaleSchema.safeParse({
      items: [{ productId: 'p-1', qty: 1, discount: 0 }],
      paymentMethod: 'staff',
      customerName: '',
      customerPhone: '',
      notes: '   ',
    });
    expect(withoutComment.success).toBe(false);

    // A cash sale needs no such note.
    const cash = CreateProductionSaleSchema.safeParse({
      items: [{ productId: 'p-1', qty: 1, discount: 0 }],
      paymentMethod: 'cash',
      customerName: '',
      customerPhone: '',
      notes: '',
    });
    expect(cash.success).toBe(true);
  });
});

describe('customer order', () => {
  it('requires a customer, unlike a POS sale', () => {
    const withoutCustomer = {
      branchId: 'b-1',
      items: [{ productId: 'p-1', qty: 1, discount: 0 }],
      paymentMethod: 'cash',
      deliveryCharges: 0,
      notes: '',
    };
    expect(CreateOrderSchema.safeParse(withoutCustomer).success).toBe(false);
    expect(
      CreateOrderSchema.safeParse({ ...withoutCustomer, customerId: 'c-1' }).success,
    ).toBe(true);
  });
});

describe('stock return', () => {
  it('accepts what useCreateStockReturn queues', () => {
    const payload = { items: [{ productId: 'p-1', qty: 3 }] };
    expect(CreateBranchReturnSchema.safeParse(payload).success).toBe(true);
  });

  it('requires at least one line', () => {
    expect(CreateBranchReturnSchema.safeParse({ items: [] }).success).toBe(false);
  });

  /**
   * The one input that can drive a branch negative through rows each valid on
   * its own: the balance check is per row, so "Vanilla Cake 5" twice against a
   * balance of 6 passes twice and takes 10.
   */
  it('rejects the same product twice on one return', () => {
    const duplicated = {
      items: [
        { productId: 'p-1', qty: 5 },
        { productId: 'p-1', qty: 5 },
      ],
    };
    expect(CreateBranchReturnSchema.safeParse(duplicated).success).toBe(false);
  });
});

describe('production demand', () => {
  const demand = {
    items: [{ productId: 'p-1', qty: 10, remarks: '' }],
    requiredDate: '2026-08-20',
  };

  it('accepts what useCreateProductionOrder queues', () => {
    expect(CreateProductionOrderSchema.safeParse(demand).success).toBe(true);
  });

  it('requires a delivery date — a demand with none is what the field exists to stop', () => {
    const withoutDate = { items: demand.items };
    expect(CreateProductionOrderSchema.safeParse(withoutDate).success).toBe(false);
  });

  it('refuses a demand that asks for nothing at all', () => {
    expect(
      CreateProductionOrderSchema.safeParse({ items: [], requiredDate: '2026-08-20' }).success,
    ).toBe(false);
  });

  it('accepts a demand of only packing materials', () => {
    const packingOnly = {
      items: [],
      packingItems: [{ packingMaterialId: 'pm-1', qty: 4 }],
      requiredDate: '2026-08-20',
    };
    expect(CreateProductionOrderSchema.safeParse(packingOnly).success).toBe(true);
  });
});

/**
 * The business date the DEVICE captured, which is the field the whole offline
 * design turns on. The server bounds it; the shape is checked by this schema.
 */
describe('business date', () => {
  it('accepts a well-formed Karachi date', () => {
    expect(optionalBusinessDate.safeParse(BUSINESS_DATE).success).toBe(true);
  });

  it('is optional, because the web app never sends it', () => {
    expect(optionalBusinessDate.safeParse(undefined).success).toBe(true);
  });

  it('rejects anything that is not YYYY-MM-DD', () => {
    for (const bad of ['18-08-2026', '2026/08/18', '2026-8-18', 'today', '']) {
      expect(optionalBusinessDate.safeParse(bad).success).toBe(false);
    }
  });

  /**
   * `new Date('2026-02-31')` does not fail — it rolls over into March. Only the
   * round trip back to a string catches a date that does not exist, and a
   * silently rolled-over date files a transaction on the wrong day.
   */
  it('rejects a date that does not exist rather than rolling it over', () => {
    expect(optionalBusinessDate.safeParse('2026-02-31').success).toBe(false);
    expect(optionalBusinessDate.safeParse('2026-13-01').success).toBe(false);
    expect(optionalBusinessDate.safeParse('2026-04-31').success).toBe(false);
    // A real leap day still passes.
    expect(optionalBusinessDate.safeParse('2028-02-29').success).toBe(true);
    // ...and a fake one does not.
    expect(optionalBusinessDate.safeParse('2026-02-29').success).toBe(false);
  });
});

/**
 * Where validation meets the sync layer.
 *
 * The drain merges the queued business date into the payload under a field name
 * that differs per endpoint — `date` on expenses, `businessDate` everywhere
 * else. Sending the wrong key is SILENTLY IGNORED by the server, which is
 * exactly how a queued 9pm transaction lands on the following day with nothing
 * appearing to fail. These pin that the merged payload still validates, and that
 * the mistake really is silent rather than caught.
 */
describe('the merged payload the drain sends', () => {
  it('names the date field per endpoint', () => {
    expect(endpointFor('expense', 'create')!.businessDateField).toBe('date');
    for (const entity of ['sale', 'order', 'production_order', 'stock_movement'] as const) {
      expect(endpointFor(entity, 'create')!.businessDateField).toBe('businessDate');
    }
  });

  it('still validates once the expense date is merged in', () => {
    const queued = {
      category: 'Utilities',
      description: 'Electricity bill',
      paymentMethod: 'cash',
      amount: 4500,
      remarks: '',
    };
    const field = endpointFor('expense', 'create')!.businessDateField;
    const sent = { ...queued, [field]: BUSINESS_DATE };

    const parsed = CreateExpenseSchema.safeParse(sent);
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.date).toBe(BUSINESS_DATE);
  });

  it('still validates once the sale business date is merged in', () => {
    const queued = {
      branchId: 'b-1',
      customerName: '',
      customerPhone: '',
      items: [{ productId: 'p-1', qty: 2, discount: 0 }],
      paymentMethod: 'cash',
      notes: '',
    };
    const field = endpointFor('sale', 'create')!.businessDateField;
    const sent = { ...queued, [field]: BUSINESS_DATE };

    const parsed = CreatePosSaleSchema.safeParse(sent);
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.businessDate).toBe(BUSINESS_DATE);
  });

  /**
   * The failure mode itself. An expense sent with `businessDate` instead of
   * `date` PASSES validation — the schema strips the unknown key — and the
   * server then stamps the day the request arrived. Nothing errors. This is the
   * reason the field name is declared per endpoint rather than assumed.
   */
  it('shows why the wrong key is dangerous: it validates, and the date vanishes', () => {
    const wrong = {
      category: 'Utilities',
      description: 'Electricity bill',
      paymentMethod: 'cash',
      amount: 4500,
      remarks: '',
      businessDate: BUSINESS_DATE, // wrong key for this endpoint
    };

    const parsed = CreateExpenseSchema.safeParse(wrong);
    expect(parsed.success).toBe(true);
    // No error — and no date. The transaction would be filed on the wrong day.
    expect(parsed.success && parsed.data.date).toBeUndefined();
  });

  /**
   * A gap, recorded as it actually behaves rather than as it ought to.
   *
   * The four endpoints taking `businessDate` use `optionalBusinessDate`, which
   * round-trips the date through `Date` and rejects one that does not exist.
   * `CreateExpenseSchema.date` is an independent field that only regex-checks
   * the SHAPE, so `2026-02-31` passes here and rolls over to 3 March when the
   * server parses it — the same silent mis-dating the other schema exists to
   * prevent.
   *
   * Not reachable from the normal flow: `businessDateStr()` always yields a real
   * date. It is reachable through `writeOffline`'s `businessDate` override, the
   * documented corrections/backdating path.
   *
   * Asserted as-is deliberately. Fixing it means editing a shared schema
   * identically in all three trees, which is a decision to take rather than a
   * change to slip into a test run — and a test asserting the fix while the code
   * says otherwise would just fail.
   */
  it('does NOT reject an impossible expense date — expense.date only checks shape', () => {
    const sent = {
      category: 'Utilities',
      description: 'x',
      paymentMethod: 'cash',
      amount: 100,
      remarks: '',
      date: '2026-02-31',
    };
    expect(CreateExpenseSchema.safeParse(sent).success).toBe(true);

    // The field the other four endpoints use would have caught it.
    expect(optionalBusinessDate.safeParse('2026-02-31').success).toBe(false);
  });

  it('rejects a malformed expense date, which the regex does catch', () => {
    const sent = {
      category: 'Utilities',
      description: 'x',
      paymentMethod: 'cash',
      amount: 100,
      remarks: '',
      date: '31-02-2026',
    };
    expect(CreateExpenseSchema.safeParse(sent).success).toBe(false);
  });
});
