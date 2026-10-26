/**
 * @format
 */
import type { AppSettings, RestrictionRules } from '@/api/types';
import {
  RESTRICTION_GROUPS,
  canDecideRequest,
  canSaveGroup,
  decisionMessage,
  decisionReason,
  decisionReasonProblem,
  isGroupDirty,
  isGroupValid,
  cashBackdateError,
  lowSalesError,
  patchRule,
  pendingLimitError,
  ruleN,
  ruleNumberFrom,
  ruleNumberText,
  settingsFormFrom,
  settingsFormProblem,
  settingsPayload,
} from '@/features/admin/utils/adminSettingsActions';

const settings = {
  companyName: 'Mountain Bakes',
  currency: 'PKR',
  currencySymbol: 'Rs.',
  gstEnabled: true,
  gstRate: 16,
  receiptFooter: 'Thanks',
  businessStartTime: '08:00',
  businessClosingTime: '02:00',
  orderStartTime: '09:00',
  orderEndTime: '17:00',
  autoCloseBusiness: true,
  autoStockClosing: false,
  closingNotificationsEnabled: true,
  orderConfirmationsEnabled: false,
  eventNotificationsEnabled: false,
  geofencingEnabled: false,
  geofenceDefaultRadiusKm: 0.5,
  geofenceVerifyIntervalMin: 5,
  geofenceGpsTimeoutSec: 20,
  geofenceMaxPositionAgeSec: 300,
  geofenceRequireHighAccuracy: true,
  logoUrl: 'https://x/logo.png',
  updatedAt: '2026-10-20T00:00:00Z',
  // Server fields the phone type does not list — sent back as the web does.
  logoPath: 'settings/logo.png',
  updatedBy: 'u1',
  theme: 'dark',
} as AppSettings;

const rules = (): RestrictionRules => ({
  demand: {
    pendingLimit: { enabled: true, warnAt: 2, blockAt: 3 },
    backdated: { enabled: true, requireApproval: true },
    lowSales: { enabled: true, minSoldPercent: 30 },
  },
  sales: { hourly: { enabled: true, threshold: 2 } },
  production: { stockShortage: { enabled: true, allowAdminOverride: true } },
  cash: { dailyLimit: { enabled: true, limit: 3, allowExceptions: true }, backdate: { enabled: true, allowedDays: 1 } },
  ledger: { backdate: { enabled: true, allowedDays: 3 } },
  company: { shareIncome: { enabled: true, allowApproval: true } },
});

describe('settings form', () => {
  it('starts from the loaded settings, with the web defaults for missing values', () => {
    const f = settingsFormFrom(settings);
    expect(f.companyName).toBe('Mountain Bakes');
    expect(f.gstRate).toBe('16');
    expect(f.geofenceDefaultRadiusKm).toBe('0.5');
    const empty = settingsFormFrom({ gstEnabled: false, gstRate: 0 });
    expect(empty).toMatchObject({
      companyName: '',
      autoCloseBusiness: true,
      autoStockClosing: true,
      closingNotificationsEnabled: false,
      geofencingEnabled: false,
      geofenceRequireHighAccuracy: true,
      geofenceDefaultRadiusKm: '50',
      geofenceVerifyIntervalMin: '5',
      geofenceGpsTimeoutSec: '20',
      geofenceMaxPositionAgeSec: '300',
    });
  });

  it('sends the whole object minus the logo and stamps, with numbers converted as the web does', () => {
    const f = { ...settingsFormFrom(settings), gstRate: '', geofenceVerifyIntervalMin: 'abc', geofenceGpsTimeoutSec: ' 30 ', businessStartTime: ' 07:30 ' };
    const body = settingsPayload(settings, f);
    expect(body).not.toHaveProperty('logoUrl');
    expect(body).not.toHaveProperty('logoPath');
    expect(body).not.toHaveProperty('updatedAt');
    expect(body).not.toHaveProperty('updatedBy');
    expect(body.theme).toBe('dark');
    expect(body.gstRate).toBe(0);
    expect(body.geofenceVerifyIntervalMin).toBe(0);
    expect(body.geofenceGpsTimeoutSec).toBe(30);
    expect(body.geofenceDefaultRadiusKm).toBe(0.5);
    expect(body.businessStartTime).toBe('07:30');
    expect(body.autoStockClosing).toBe(false);
  });

  it('parses a decimal GST rate', () => {
    expect(settingsPayload(settings, { ...settingsFormFrom(settings), gstRate: '17.5' }).gstRate).toBe(17.5);
  });

  it('refuses a time that is not 24-hour HH:mm', () => {
    const f = settingsFormFrom(settings);
    expect(settingsFormProblem(f)).toBeNull();
    expect(settingsFormProblem({ ...f, orderEndTime: '5pm' })).toMatch(/^Order End Time:/);
    expect(settingsFormProblem({ ...f, businessStartTime: '24:00' })).toMatch(/^Business Start Time:/);
    expect(settingsFormProblem({ ...f, businessClosingTime: '' })).toMatch(/^Business Closing Time:/);
    expect(settingsFormProblem({ ...f, orderStartTime: '23:59' })).toBeNull();
  });
});

describe('restriction rules draft', () => {
  it('patches one rule and leaves the rest alone', () => {
    const saved = rules();
    const d = patchRule(saved, 'demand', 'pendingLimit', { warnAt: 1 });
    expect(d.demand.pendingLimit).toEqual({ enabled: true, warnAt: 1, blockAt: 3 });
    expect(d.demand.backdated).toBe(saved.demand.backdated);
    expect(d.sales).toBe(saved.sales);
    expect(isGroupDirty(d, saved, 'demand')).toBe(true);
    expect(isGroupDirty(d, saved, 'sales')).toBe(false);
  });

  it('ignores key order when comparing with the saved copy', () => {
    const saved = rules();
    const d = { ...saved, demand: { ...saved.demand, pendingLimit: { blockAt: 3, warnAt: 2, enabled: true } } };
    expect(isGroupDirty(d, saved, 'demand')).toBe(false);
  });

  it('validates each group with the API schema', () => {
    const r = rules();
    for (const g of RESTRICTION_GROUPS) expect(isGroupValid(r, g)).toBe(true);
    expect(isGroupValid(patchRule(r, 'demand', 'pendingLimit', { warnAt: 3 }), 'demand')).toBe(false);
    expect(isGroupValid(patchRule(r, 'demand', 'lowSales', { minSoldPercent: 0 }), 'demand')).toBe(false);
    expect(isGroupValid(patchRule(r, 'sales', 'hourly', { threshold: 1001 }), 'sales')).toBe(false);
    expect(isGroupValid(patchRule(r, 'cash', 'dailyLimit', { limit: Number.NaN }), 'cash')).toBe(false);
    expect(isGroupValid(patchRule(r, 'cash', 'backdate', { allowedDays: 0 }), 'cash')).toBe(true);
    expect(isGroupValid(patchRule(r, 'cash', 'backdate', { allowedDays: 30 }), 'cash')).toBe(true);
    expect(isGroupValid(patchRule(r, 'cash', 'backdate', { allowedDays: 31 }), 'cash')).toBe(false);
    expect(isGroupValid(patchRule(r, 'cash', 'backdate', { allowedDays: Number.NaN }), 'cash')).toBe(false);
    expect(cashBackdateError({ enabled: true, allowedDays: 3 })).toBeNull();
    expect(cashBackdateError({ enabled: true, allowedDays: 31 })).toBe('Enter a number of days from 0 to 30.');
    expect(isGroupValid(patchRule(r, 'ledger', 'backdate', { allowedDays: 0 }), 'ledger')).toBe(true);
    expect(isGroupValid(patchRule(r, 'ledger', 'backdate', { allowedDays: 366 }), 'ledger')).toBe(false);
  });

  it('lights Save only for a changed, valid group while nothing else saves', () => {
    const saved = rules();
    const d = patchRule(saved, 'sales', 'hourly', { threshold: 4 });
    expect(canSaveGroup(saved, saved, 'sales', null)).toBe(false);
    expect(canSaveGroup(d, saved, 'sales', null)).toBe(true);
    expect(canSaveGroup(d, saved, 'sales', 'demand')).toBe(false);
    expect(canSaveGroup(patchRule(saved, 'sales', 'hourly', { threshold: 0 }), saved, 'sales', null)).toBe(false);
  });

  it('holds number fields as the web NumberField does', () => {
    expect(Number.isNaN(ruleNumberFrom(''))).toBe(true);
    expect(ruleNumberFrom('7')).toBe(7);
    expect(ruleNumberFrom('7.9')).toBe(7);
    expect(ruleNumberFrom('-3')).toBe(0);
    expect(ruleNumberFrom('x')).toBe(0);
    expect(ruleNumberText(Number.NaN)).toBe('');
    expect(ruleNumberText(12)).toBe('12');
    expect(ruleN(Number.NaN)).toBe(0);
  });

  it('shows the two inline field errors', () => {
    expect(pendingLimitError({ enabled: true, warnAt: 2, blockAt: 3 })).toBeNull();
    expect(pendingLimitError({ enabled: true, warnAt: 3, blockAt: 3 })).toBe('Warning threshold must be lower than the blocking threshold.');
    expect(lowSalesError({ enabled: true, minSoldPercent: 100 })).toBeNull();
    expect(lowSalesError({ enabled: true, minSoldPercent: Number.NaN })).toBe('Enter a percentage between 1 and 100.');
  });
});

describe('restriction request decisions', () => {
  it('offers a decision only on a pending request', () => {
    expect(canDecideRequest({ status: 'pending' })).toBe(true);
    expect(canDecideRequest({ status: 'approved' })).toBe(false);
    expect(canDecideRequest({ status: 'rejected' })).toBe(false);
  });

  it('needs a reason to reject, not to approve', () => {
    expect(decisionReasonProblem('rejected', '  ')).toBe('Enter a reason before rejecting.');
    expect(decisionReasonProblem('rejected', 'No receipt')).toBeNull();
    expect(decisionReasonProblem('approved', '')).toBeNull();
  });

  it('sends a trimmed reason, or none', () => {
    expect(decisionReason('  ok  ')).toBe('ok');
    expect(decisionReason('   ')).toBeUndefined();
  });

  it('words the success as the web toast', () => {
    expect(decisionMessage({ requestNo: 'REQ-000141', approvalNo: 'APR-000421' }, 'approved')).toBe('REQ-000141 approved (APR-000421)');
  });
});
