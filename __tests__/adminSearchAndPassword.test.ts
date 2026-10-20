/**
 * @format
 */
import type { RestrictionRulesState } from '@/api/types';
import { backupLinkMessage, LOGO_MAX_BYTES, LOGO_SIZE_MESSAGE, LOGO_TYPE_MESSAGE, logoFileProblem } from '@/features/admin/utils/adminFilesActions';
import { COUNTER_ORDER_NOTE, globalSearchEmptyText, globalSearchTarget } from '@/features/admin/utils/globalSearch';
import { buildPreview, pickRestriction, PREVIEW_SCENARIOS, type Restriction } from '@/features/admin/utils/restrictionPreview';
import {
  canSubmitPasswordChange,
  changePasswordProblem,
  isStrongPassword,
  passwordScore,
  passwordStrengthTone,
} from '@/features/auth/passwordPolicy';
import { Routes } from '@/navigation/routes';

// ─── Global Search ───────────────────────────────────────────────────────────

describe('globalSearchTarget', () => {
  it('opens Products for a product and for a packing material (web /products)', () => {
    expect(globalSearchTarget({ type: 'product', href: '/products/p1' })).toEqual({ kind: 'screen', screen: Routes.SUPER_ADMIN_PRODUCTS });
    expect(globalSearchTarget({ type: 'packingMaterial', href: '/products' })).toEqual({ kind: 'screen', screen: Routes.SUPER_ADMIN_PRODUCTS });
  });

  it('opens Customers for a customer', () => {
    expect(globalSearchTarget({ type: 'customer', href: '/customers/c1' })).toEqual({ kind: 'screen', screen: Routes.SUPER_ADMIN_CUSTOMERS });
  });

  it('cannot open a counter order, and says why', () => {
    expect(globalSearchTarget({ type: 'order', href: '/orders/o1' })).toEqual({ kind: 'unavailable', note: COUNTER_ORDER_NOTE });
  });

  it('falls back to the href when the type is unknown, and to unavailable when neither is known', () => {
    expect(globalSearchTarget({ type: 'other', href: '/customers/c1?x=1' })).toEqual({ kind: 'screen', screen: Routes.SUPER_ADMIN_CUSTOMERS });
    expect(globalSearchTarget({ type: 'other', href: '/nowhere' }).kind).toBe('unavailable');
  });
});

describe('globalSearchEmptyText', () => {
  it('follows the web dialog: too short, searching, nothing found, or nothing to say', () => {
    expect(globalSearchEmptyText('a', { loading: false, resultCount: 0 })).toBe('Type at least 2 characters to search');
    expect(globalSearchEmptyText(' ab ', { loading: true, resultCount: 0 })).toBe('Searching…');
    expect(globalSearchEmptyText('ab', { loading: false, resultCount: 0 })).toBe('No results found for "ab"');
    expect(globalSearchEmptyText('ab', { loading: false, resultCount: 2 })).toBeNull();
  });
});

// ─── Forced password change ──────────────────────────────────────────────────

describe('password policy', () => {
  it('scores the five rules and needs all of them', () => {
    expect(passwordScore('')).toBe(0);
    expect(passwordScore('abcdefgh')).toBe(2);
    expect(isStrongPassword('Abcdef1!')).toBe(true);
    expect(isStrongPassword('Abcdefg1')).toBe(false);
  });

  it('bands the meter as the web does', () => {
    expect(passwordStrengthTone(1)).toBe('danger');
    expect(passwordStrengthTone(3)).toBe('warning');
    expect(passwordStrengthTone(4)).toBe('success');
  });

  it("gives ChangePasswordSchema's first message", () => {
    expect(changePasswordProblem('short', 'short')).toBe('At least 8 characters');
    expect(changePasswordProblem('abcdefgh1!', 'abcdefgh1!')).toBe('One uppercase letter');
    expect(changePasswordProblem('Abcdefgh!', 'Abcdefgh!')).toBe('One number');
    expect(changePasswordProblem('Abcdefg1!', 'Abcdefg1?')).toBe('Passwords do not match');
    expect(changePasswordProblem('Abcdefg1!', 'Abcdefg1!')).toBeNull();
  });

  it('enables Update Password only for a strong, matching password while idle', () => {
    expect(canSubmitPasswordChange('Abcdefg1!', 'Abcdefg1!', false)).toBe(true);
    expect(canSubmitPasswordChange('Abcdefg1!', 'Abcdefg1!', true)).toBe(false);
    expect(canSubmitPasswordChange('Abcdefg1!', 'nope', false)).toBe(false);
  });
});

// ─── Settings logo + backup download ─────────────────────────────────────────

describe('logoFileProblem', () => {
  it('accepts the four types the server stores, up to 2 MB', () => {
    expect(logoFileProblem({ type: 'image/png', fileSize: 1000 })).toBeNull();
    expect(logoFileProblem({ type: 'image/svg+xml', fileSize: null })).toBeNull();
    expect(logoFileProblem({ type: 'image/heic', fileSize: 1000 })).toBe(LOGO_TYPE_MESSAGE);
    expect(logoFileProblem({ type: undefined })).toBe(LOGO_TYPE_MESSAGE);
    expect(logoFileProblem({ type: 'image/jpeg', fileSize: LOGO_MAX_BYTES })).toBeNull();
    expect(logoFileProblem({ type: 'image/jpeg', fileSize: LOGO_MAX_BYTES + 1 })).toBe(LOGO_SIZE_MESSAGE);
  });
});

describe('backupLinkMessage', () => {
  it("is the web's toast", () => {
    expect(backupLinkMessage({ fileName: 'daily.dump.gz', expiresInSeconds: 300 })).toBe('Download link for daily.dump.gz is valid for 5 minutes');
  });
});

// ─── Restriction Rules → Popup Preview ───────────────────────────────────────

const state = (over: Partial<RestrictionRulesState['rules']> = {}): RestrictionRulesState => ({
  rules: {
    demand: {
      pendingLimit: { enabled: true, warnAt: 2, blockAt: 3 },
      backdated: { enabled: true, requireApproval: true },
      lowSales: { enabled: true, minSoldPercent: 30 },
    },
    sales: { hourly: { enabled: true, threshold: 3 } },
    production: { stockShortage: { enabled: true, allowAdminOverride: true } },
    cash: { dailyLimit: { enabled: true, limit: 2, allowExceptions: true } },
    ledger: { backdate: { enabled: true, allowedDays: 3 } },
    company: { shareIncome: { enabled: true, allowApproval: true } },
    ...over,
  },
  saved: {} as RestrictionRulesState['saved'],
  businessDate: '2026-10-20',
  timezone: 'Asia/Karachi',
  closingTime: '02:00',
  pendingRequests: 0,
});

describe('Popup Preview', () => {
  it('offers the web’s 16 scenarios, each key once', () => {
    expect(PREVIEW_SCENARIOS).toHaveLength(16);
    expect(new Set(PREVIEW_SCENARIOS.map((s) => s.key)).size).toBe(16);
  });

  it('blocks a fourth demand with the real numbers, and the server refuses it with a 409', () => {
    const p = buildPreview('demandBlock', state());
    expect(p.restriction?.severity).toBe('blocking');
    expect(p.restriction?.list).toEqual(['#DMD-002201', '#DMD-002202', '#DMD-002203']);
    expect(p.check.allowed).toBe(false);
    expect(p.submitDisabled).toBe(true);
    expect(p.endpointLabel).toBe('Server response · /api/production-orders · 409, in details');
    expect(p.fields).toEqual([['Branch', 'Gulberg'], ['Required date', '20-10-2026']]);
  });

  it('warns but allows at the warn threshold', () => {
    const p = buildPreview('demandWarn', state());
    expect(p.restriction?.severity).toBe('warning');
    expect(p.check.allowed).toBe(true);
    expect(p.submitDisabled).toBe(false);
  });

  it('walks a backdated demand through its approval states', () => {
    const none = buildPreview('bd-none', state());
    expect(none.restriction?.severity).toBe('admin_approval_required');
    expect(none.restriction?.stats).toEqual([
      { label: 'Requested', value: '18-10-2026' },
      { label: 'Current', value: '20-10-2026' },
    ]);
    expect(buildPreview('bd-pending', state()).restriction?.title).toBe('Waiting for Admin Approval');
    expect(buildPreview('bd-rejected', state()).restriction?.reason).toBe('Already fulfilled from an earlier demand.');
    const approved = buildPreview('bd-approved', state());
    expect(approved.restriction?.severity).toBe('approved');
    expect(approved.check.allowed).toBe(true);
  });

  it('blocks outright when backdated approvals are switched off', () => {
    const p = buildPreview('bd-none', state({ demand: { ...state().rules.demand, backdated: { enabled: true, requireApproval: false } } }));
    expect(p.restriction?.severity).toBe('blocking');
    expect(p.restriction?.messages[1]).toBe('Backdated demands are not allowed. Please contact Admin.');
  });

  it('works the low-sales sample out under the saved minimum', () => {
    const r = buildPreview('lowSales', state()).restriction;
    expect(r?.meter).toEqual({ value: 21.6, required: 30 });
    expect(r?.stats?.[1]).toEqual({ label: 'Sold', value: '91' });
  });

  it('shows nothing for a rule that is switched off', () => {
    const p = buildPreview('production', state({ production: { stockShortage: { enabled: false, allowAdminOverride: true } } }));
    expect(p.restriction).toBeNull();
    expect(p.check).toEqual({ allowed: true, restriction: null });
    expect(p.submitDisabled).toBe(false);
  });

  it('words the cash limit with the CT numbers', () => {
    const r = buildPreview('cash', state()).restriction;
    expect(r?.messages[0]).toBe('Your 2 allowed cash-deposit transactions for today have already been forwarded.');
    expect(r?.list).toEqual(['CT-000171', 'CT-000172']);
    expect(r?.canRequestApproval).toBe(true);
  });

  it('holds a ledger entry past the back-entry window for Admin', () => {
    const r = buildPreview('ledger-none', state()).restriction;
    expect(r?.severity).toBe('admin_approval_required');
    expect(r?.stats?.find((s) => s.label === 'Days back')?.value).toBe('7');
    expect(r?.stats?.find((s) => s.label === 'Allowed from')?.value).toBe('17-10-2026');
  });

  it('sends nothing when offline', () => {
    const p = buildPreview('offline', state());
    expect(p.offline).toBe(true);
    expect(p.json.startsWith('// No response')).toBe(true);
    expect(p.submitDisabled).toBe(true);
    expect(p.endpointLabel).toBe('Server response · /api/production-orders');
  });

  it('falls back to the first scenario for an unknown key', () => {
    expect(buildPreview('nope', state()).scenario.key).toBe(PREVIEW_SCENARIOS[0]!.key);
  });

  it('picks the most severe restriction but decides over all of them', () => {
    const warn = { severity: 'warning' } as Restriction;
    const block = { severity: 'blocking' } as Restriction;
    expect(pickRestriction([warn, block, null])).toEqual({ allowed: false, restriction: block });
    expect(pickRestriction([warn])).toEqual({ allowed: true, restriction: warn });
  });
});
