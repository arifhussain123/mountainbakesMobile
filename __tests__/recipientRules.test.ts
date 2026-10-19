/**
 * @format
 */
import type { NotificationRecipient } from '@/api';
import { formatPkMobile, normalisePkMobile } from '@/features/recipients/utils/phone';
import {
  channelFlags,
  channelFrom,
  coverageOf,
  deliveryLabel,
  departmentFor,
  findDuplicate,
  lastClosedBusinessDay,
  latestLogByRecipient,
  messagesPerRun,
  receivesLine,
  receivesOf,
} from '@/features/recipients/utils/recipientRules';

describe('normalisePkMobile', () => {
  it.each([
    ['03431102663', '+923431102663'],
    ['0343 1102663', '+923431102663'],
    ['0343-110-2663', '+923431102663'],
    ['+923431102663', '+923431102663'],
    ['+92 343 1102663', '+923431102663'],
    ['923431102663', '+923431102663'],
    ['00923431102663', '+923431102663'],
    ['3431102663', '+923431102663'],
    ['+92 0343 1102663', '+923431102663'],
  ])('accepts %s', (input, e164) => {
    expect(normalisePkMobile(input)).toEqual({ ok: true, e164 });
  });

  it('rejects a number one digit short, saying how many it has', () => {
    // Mohsin Abbas in Partner Detail: 0343112663 — 10 digits.
    expect(normalisePkMobile('0343112663')).toEqual({ ok: false, error: 'A mobile number has 11 digits (03XX XXXXXXX) — this has 10.' });
    expect(normalisePkMobile('034311026631').ok).toBe(false);
  });

  it('rejects landlines and other countries', () => {
    expect(normalisePkMobile('051 1234567')).toEqual({ ok: false, error: 'This looks like a landline. Use a mobile number (03XX XXXXXXX).' });
    expect(normalisePkMobile('+92 51 1234567').ok).toBe(false);
    expect(normalisePkMobile('+44 7700 900123')).toEqual({ ok: false, error: 'Only Pakistani mobile numbers (+92) are supported.' });
  });

  it('rejects empty and non-digit input', () => {
    expect(normalisePkMobile('  ').ok).toBe(false);
    expect(normalisePkMobile('0300-ABC-4567').ok).toBe(false);
    expect(normalisePkMobile('03+001234567').ok).toBe(false);
  });

  it('formats E.164 for display', () => {
    expect(formatPkMobile('+923431102663')).toBe('+92 343 1102663');
    expect(formatPkMobile('+441234')).toBe('+441234');
  });
});

function recipient(over: Partial<NotificationRecipient>): NotificationRecipient {
  return {
    id: 'r1',
    branchId: 'b1',
    branchName: 'Committee Chowk Branch',
    department: null,
    recipientName: 'Mohsin Abbas',
    mobileNumber: '+923431102663',
    channel: 'whatsapp',
    active: true,
    createdAt: '2026-10-01T00:00:00.000Z',
    ...over,
  };
}

describe('receives', () => {
  it('reads branch, company and production recipients', () => {
    expect(receivesOf(recipient({}))).toBe('branch');
    expect(receivesOf(recipient({ branchId: null, department: 'admin' }))).toBe('company');
    expect(receivesOf(recipient({ branchId: null, department: 'production' }))).toBe('production');
    expect(receivesLine(recipient({}))).toBe('Committee Chowk Branch');
    expect(receivesLine(recipient({ branchId: null, department: 'admin' }))).toBe('All branches');
    expect(departmentFor('company')).toBe('admin');
    expect(departmentFor('branch')).toBeNull();
  });
});

describe('channels', () => {
  it('maps the two checkboxes to the stored channel and back', () => {
    expect(channelFrom({ sms: true, whatsapp: true })).toBe('both');
    expect(channelFrom({ sms: true, whatsapp: false })).toBe('sms');
    expect(channelFrom({ sms: false, whatsapp: true })).toBe('whatsapp');
    expect(channelFrom({ sms: false, whatsapp: false })).toBeNull();
    expect(channelFlags('both')).toEqual({ sms: true, whatsapp: true });
    expect(channelFlags('sms')).toEqual({ sms: true, whatsapp: false });
  });
});

describe('findDuplicate', () => {
  const list = [
    recipient({ id: 'a' }),
    recipient({ id: 'b', branchId: null, branchName: null, department: 'admin' }),
    recipient({ id: 'c', branchId: 'b2', mobileNumber: '+923001234567', active: false }),
  ];

  it('catches the same number on the same branch summary', () => {
    expect(findDuplicate(list, { mobileNumber: '+923431102663', branchId: 'b1', department: null })?.id).toBe('a');
  });

  it('catches the same number on the company summary', () => {
    expect(findDuplicate(list, { mobileNumber: '+923431102663', branchId: null, department: 'admin' })?.id).toBe('b');
  });

  it('allows the same number on a different summary, and catches inactive duplicates', () => {
    expect(findDuplicate(list, { mobileNumber: '+923431102663', branchId: 'b2', department: null })).toBeNull();
    expect(findDuplicate(list, { mobileNumber: '+923431102663', branchId: null, department: 'production' })).toBeNull();
    expect(findDuplicate(list, { mobileNumber: '+923001234567', branchId: 'b2', department: null })?.id).toBe('c');
  });

  it('ignores the recipient being edited', () => {
    expect(findDuplicate(list, { mobileNumber: '+923431102663', branchId: 'b1', department: null }, 'a')).toBeNull();
  });
});

describe('coverage and message count', () => {
  const branches = [
    { id: 'b1', name: 'Committee Chowk Branch', isActive: true },
    { id: 'b2', name: 'Alabad Branch', isActive: true },
    { id: 'b3', name: 'Closed Branch', isActive: false },
  ];
  const list = [
    recipient({ id: 'a', channel: 'both' }),
    recipient({ id: 'b', branchId: 'b2', active: false }),
    recipient({ id: 'c', branchId: null, branchName: null, department: 'admin' }),
  ];

  it('counts active recipients per active branch, uncovered first', () => {
    const c = coverageOf(branches, list);
    expect(c.branches).toEqual([
      { branchId: 'b2', branchName: 'Alabad Branch', count: 0 },
      { branchId: 'b1', branchName: 'Committee Chowk Branch', count: 1 },
    ]);
    expect(c.company).toBe(1);
    expect(c.production).toBe(0);
  });

  it('counts a night’s messages: reports × channels, company = every branch + production + company', () => {
    // a: 1 report × 2 channels; b inactive; c: (2 branches + 2) × 1.
    expect(messagesPerRun(list, 2)).toBe(2 + 4);
  });
});

describe('delivery labels', () => {
  const base = { sentAt: '2026-10-19T21:00:00.000Z', createdAt: '2026-10-19T21:00:00.000Z', errorMessage: null };

  it('never claims delivery from a test-mode log', () => {
    expect(deliveryLabel({ ...base, provider: 'log', status: 'sent' })).toBe('Logged only · test mode');
  });

  it('says why a send failed, in words', () => {
    expect(deliveryLabel({ ...base, provider: 'twilio', status: 'failed', errorMessage: 'Message failed (Twilio 63016)' })).toBe(
      'Failed: WhatsApp needs an approved template',
    );
    expect(deliveryLabel({ ...base, provider: 'twilio', status: 'failed', errorMessage: 'The To number is invalid (Twilio 21211)' })).toBe('Failed: invalid number');
    expect(deliveryLabel({ ...base, provider: 'twilio', status: 'failed', errorMessage: null })).toBe('Failed: no reason given');
  });

  it('shows a row still waiting on the provider as Pending', () => {
    expect(deliveryLabel({ ...base, provider: 'twilio', status: 'pending', sentAt: null })).toBe('Pending');
  });

  it('says "Sent", not "Delivered", for a live send', () => {
    expect(deliveryLabel({ ...base, provider: 'twilio', status: 'sent' })).toMatch(/^Sent /);
  });

  it('keeps each recipient’s newest row', () => {
    const logs = [
      { id: '2', recipientId: 'a' },
      { id: '1', recipientId: 'a' },
      { id: '3', recipientId: null },
    ] as never[];
    const m = latestLogByRecipient(logs);
    expect(m.get('a')).toEqual({ id: '2', recipientId: 'a' });
    expect(m.size).toBe(1);
  });

  it('defaults the send to the day before today', () => {
    expect(lastClosedBusinessDay('2026-11-01')).toBe('2026-10-31');
  });
});
