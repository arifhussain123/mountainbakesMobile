/**
 * @format
 */
import type { AdminBranch, BranchLocationRow } from '@/api/types';
import {
  SHARE_PCT_ERROR,
  branchFormFromBranch,
  branchPayload,
  canSaveLocation,
  emptyBranchForm,
  formShareSplit,
  formatCoordinate,
  geofenceToggle,
  initialLocationForm,
  locationPayload,
  locationSummary,
  radiusPresetValue,
  sanitizeRadius,
  type BranchFormValues,
  type LocationFormValues,
} from '@/features/admin/utils/branchActions';

const form = (over: Partial<BranchFormValues> = {}): BranchFormValues => ({
  name: 'Alabad',
  location: 'Alamdar Road',
  phone: '03001234567',
  address: 'Main Alabad Road',
  city: 'Quetta',
  dailyBudget: '',
  weeklyBudget: '5000',
  monthlyBudget: '20000',
  companySharePct: '',
  ...over,
});

const branch = (over: Partial<AdminBranch> = {}) =>
  ({
    id: 'b1',
    name: 'Alabad',
    slug: 'alabad',
    location: 'Alamdar Road',
    phone: '03001234567',
    address: 'Main Alabad Road',
    city: 'Quetta',
    isActive: true,
    companySharePct: null,
    ...over,
  }) as AdminBranch;

describe('branch form', () => {
  it('starts Add from the web defaults', () => {
    expect(emptyBranchForm()).toMatchObject({ name: '', city: 'Karachi', companySharePct: '' });
  });

  it('seeds Edit from the row, a default-split branch with a blank share', () => {
    expect(branchFormFromBranch(branch({ dailyBudget: 100 }))).toMatchObject({ name: 'Alabad', dailyBudget: '100', weeklyBudget: '0', companySharePct: '' });
    expect(branchFormFromBranch(branch({ companySharePct: 70 })).companySharePct).toBe('70');
  });

  it('sends the whole form; blank budget is 0 and blank share is null (inherit)', () => {
    expect(branchPayload(form())).toEqual({
      input: {
        name: 'Alabad',
        location: 'Alamdar Road',
        phone: '03001234567',
        address: 'Main Alabad Road',
        city: 'Quetta',
        dailyBudget: 0,
        weeklyBudget: 5000,
        monthlyBudget: 20000,
        companySharePct: null,
      },
    });
    expect(branchPayload(form({ companySharePct: ' 72.5 ' }))).toMatchObject({ input: { companySharePct: 72.5 } });
    expect(branchPayload(form({ companySharePct: '0' }))).toMatchObject({ input: { companySharePct: 0 } });
  });

  it('applies CreateBranchSchema minimums with its messages', () => {
    const r = branchPayload(form({ name: 'A', phone: '123', address: 'abc', city: '' }));
    expect(r).toEqual({
      fieldErrors: {
        name: 'Branch name is required',
        phone: 'Invalid phone number',
        address: 'Address is required',
        city: 'City is required',
      },
    });
  });

  it('rejects a negative or unparseable budget', () => {
    expect(branchPayload(form({ dailyBudget: '-1', monthlyBudget: 'x' }))).toEqual({
      fieldErrors: { dailyBudget: 'Daily Budget must be 0 or more', monthlyBudget: 'Monthly Budget must be 0 or more' },
    });
  });

  it('rejects a share outside 0–100 with the web toast', () => {
    expect(branchPayload(form({ companySharePct: '101' }))).toEqual({ error: SHARE_PCT_ERROR });
    expect(branchPayload(form({ companySharePct: 'abc' }))).toEqual({ error: SHARE_PCT_ERROR });
  });

  it('previews the split: blank follows the default, a number is an override', () => {
    expect(formShareSplit('', 75)).toEqual({ companySharePct: 75, branchSharePct: 25, isOverride: false });
    expect(formShareSplit('60', 75)).toEqual({ companySharePct: 60, branchSharePct: 40, isOverride: true });
  });
});

const row = (over: Partial<BranchLocationRow> = {}): BranchLocationRow => ({
  branchId: 'b1',
  branchName: 'Alabad',
  branchAddress: 'Main Alabad Road',
  branchIsActive: true,
  location: null,
  ...over,
});

const loc = (over: Partial<LocationFormValues> = {}): LocationFormValues => ({
  latitude: '30.1798',
  longitude: '66.975',
  address: 'Main Alabad Road',
  radiusKm: '5',
  googlePlaceId: null,
  ...over,
});

describe('branch location form', () => {
  it('seeds a missing location with the branch address and the 50 KM default', () => {
    expect(initialLocationForm(row())).toEqual({ latitude: '', longitude: '', address: 'Main Alabad Road', radiusKm: '50', googlePlaceId: null });
  });

  it('seeds an existing location and keeps its place id', () => {
    const r = row({ location: { latitude: 30.1, longitude: 66.9, radiusKm: 10, isActive: true, address: 'Shop 4', googlePlaceId: 'pid' } });
    expect(initialLocationForm(r)).toEqual({ latitude: '30.1', longitude: '66.9', address: 'Shop 4', radiusKm: '10', googlePlaceId: 'pid' });
  });

  it('gates Save like the web', () => {
    expect(canSaveLocation(loc())).toBe(true);
    expect(canSaveLocation(loc({ latitude: '' }))).toBe(false);
    expect(canSaveLocation(loc({ latitude: '91' }))).toBe(false);
    expect(canSaveLocation(loc({ longitude: '-181' }))).toBe(false);
    expect(canSaveLocation(loc({ address: ' ab ' }))).toBe(false);
    expect(canSaveLocation(loc({ radiusKm: '0' }))).toBe(false);
    expect(canSaveLocation(loc({ radiusKm: '500.1' }))).toBe(false);
    expect(canSaveLocation(loc({ radiusKm: '500' }))).toBe(true);
  });

  it('builds the PUT body with numbers and a trimmed address', () => {
    expect(locationPayload(loc({ address: '  Shop 4  ', googlePlaceId: 'pid' }))).toEqual({
      latitude: 30.1798,
      longitude: 66.975,
      address: 'Shop 4',
      radiusKm: 5,
      googlePlaceId: 'pid',
    });
    expect(locationPayload(loc({ radiusKm: '' }))).toBeNull();
  });

  it('matches radius presets and strips non-numeric radius input', () => {
    expect(radiusPresetValue('25')).toBe('25');
    expect(radiusPresetValue('7.5')).toBe('custom');
    expect(sanitizeRadius('12a.5 km')).toBe('12.5');
  });

  it('writes a device fix with seven decimals and summarises the radius', () => {
    expect(formatCoordinate(30.17981234567)).toBe('30.1798123');
    expect(locationSummary(loc())).toBe('Sales allowed within 5.0 KM of this point.');
    expect(locationSummary(loc({ radiusKm: '0.5' }))).toBe('Sales allowed within 500 m of this point.');
    expect(locationSummary(loc({ longitude: '' }))).toBe('No location selected yet.');
  });

  it('offers Enable / Disable only for a configured location', () => {
    expect(geofenceToggle(row())).toBeNull();
    const enforced = row({ location: { latitude: 1, longitude: 1, radiusKm: 5, isActive: true } });
    expect(geofenceToggle(enforced)).toEqual({ isActive: false, label: 'Disable', success: 'Geofence disabled for Alabad' });
    const off = row({ location: { latitude: 1, longitude: 1, radiusKm: 5, isActive: false } });
    expect(geofenceToggle(off)).toEqual({ isActive: true, label: 'Enable', success: 'Geofence enabled for Alabad' });
  });
});
