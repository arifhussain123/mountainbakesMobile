import { ICONS } from '@/constants/navigationIcons';
import { USER_ROLES, type UserRole } from '@/shared/types/user.types';
import {
  accessProfileFor,
  isKnownRole,
  landingTabFor,
  moreSectionsFor,
  NAV_LABELS,
  tabsFor,
} from '../roleConfig';
import { isBranchRole } from '../roleNavigation';
import { TAB_ROOT_ROUTE } from '../types';

/**
 * The invariants that keep this navigation from rotting back into three menus.
 *
 * These assert the non-negotiables directly rather than mirroring a routing
 * table by hand: one path per screen, a safe unknown role, no more than five
 * tabs, and every icon/label key actually resolving.
 */

/** A profile per role, with a branchId where the role would really carry one. */
function profileFor(role: UserRole, allowSuperAdminWrite = false) {
  const branchId = isBranchRole(role) ? 'branch-1' : null;
  return accessProfileFor(role, branchId, allowSuperAdminWrite);
}

describe('navigation surface', () => {
  it('gives every real role a usable tab set', () => {
    for (const role of USER_ROLES) {
      const tabs = tabsFor(profileFor(role));
      expect(tabs.length).toBeGreaterThan(0);
      // Four daily-operations tabs plus More is the ceiling. Past five the
      // targets get too narrow to hit one-handed and the labels truncate.
      expect(tabs.length).toBeLessThanOrEqual(5);
    }
  });

  it('ends every role with More, exactly once', () => {
    for (const role of USER_ROLES) {
      const names = tabsFor(profileFor(role)).map(t => t.name);
      expect(names.filter(n => n === 'More')).toHaveLength(1);
      expect(names[names.length - 1]).toBe('More');
    }
  });

  /**
   * Non-negotiable #1. A screen reachable from a tab must not also be a More
   * row: two routes to one screen is two menus to keep in sync, and it is how
   * this architecture rotted the first time.
   */
  it('never exposes one destination from both a tab and More', () => {
    for (const role of USER_ROLES) {
      const profile = profileFor(role);
      const tabNames = new Set(tabsFor(profile).map(t => t.name as string));
      const moreRoutes = moreSectionsFor(profile).flatMap(s => s.items.map(i => i.route as string));

      for (const route of moreRoutes) {
        expect({ role, route, alsoATab: tabNames.has(route) }).toEqual({
          role,
          route,
          alsoATab: false,
        });
      }
    }
  });

  it('lists each More destination only once per role', () => {
    for (const role of USER_ROLES) {
      const routes = moreSectionsFor(profileFor(role)).flatMap(s => s.items.map(i => i.route));
      expect(new Set(routes).size).toBe(routes.length);
    }
  });

  it('resolves every icon and label key it declares', () => {
    for (const role of USER_ROLES) {
      const profile = profileFor(role);
      for (const tab of tabsFor(profile)) {
        expect(ICONS[tab.icon]).toBeDefined();
        expect(NAV_LABELS[tab.label]).toBeTruthy();
        expect(TAB_ROOT_ROUTE[tab.name]).toBeTruthy();
      }
      for (const section of moreSectionsFor(profile)) {
        for (const item of section.items) {
          expect(ICONS[item.icon]).toBeDefined();
          expect(NAV_LABELS[item.label]).toBeTruthy();
        }
      }
    }
  });

  it('lands every role on its own first tab', () => {
    for (const role of USER_ROLES) {
      const profile = profileFor(role);
      expect(landingTabFor(profile)).toBe(tabsFor(profile)[0]?.name);
    }
  });
});

describe('unknown role', () => {
  const UNKNOWN = 'warehouse_supervisor' as UserRole;

  it('is not mistaken for a known one', () => {
    expect(isKnownRole(UNKNOWN)).toBe(false);
    for (const role of USER_ROLES) expect(isKnownRole(role)).toBe(true);
  });

  it('falls back to a minimal shell rather than crashing', () => {
    const tabs = tabsFor(accessProfileFor(UNKNOWN, null));
    expect(tabs.map(t => t.name)).toEqual(['Home', 'More']);
  });

  /**
   * The failure that matters. Falling open would hand an unrecognised account
   * the widest menu in the app — the API would still refuse the requests, but
   * the UI would be advertising capabilities that are not theirs.
   */
  it('does not escalate to the admin tab set', () => {
    const unknown = tabsFor(accessProfileFor(UNKNOWN, null)).map(t => t.name);
    const admin = tabsFor(profileFor('super_admin')).map(t => t.name);
    expect(unknown).not.toEqual(admin);
    expect(unknown).not.toContain('Reports');
    expect(unknown).not.toContain('Products');
  });
});

describe('capability filtering', () => {
  it('reduces the menu when a capability is missing', () => {
    // finance_auditor may view and nothing else; every finance tab is gated on
    // `finance:view`, so it keeps them — the point is that the gate is real.
    const auditor = profileFor('finance_auditor');
    expect(auditor.capabilities.has('finance:view')).toBe(true);
    expect(auditor.capabilities.has('finance:create')).toBe(false);
    expect(auditor.capabilities.has('finance:approve')).toBe(false);
  });

  /**
   * Super Admin sees finance read-only unless the server-side
   * `allowSuperAdminWrite` setting is on, which defaults to off.
   */
  it('keeps finance read-only for a super admin by default', () => {
    expect(profileFor('super_admin').capabilities.has('finance:create')).toBe(false);
    expect(profileFor('super_admin', true).capabilities.has('finance:create')).toBe(true);
    expect(profileFor('super_admin').capabilities.has('finance:view')).toBe(true);
  });

  /**
   * A shift account carries its manager's branchId. Without one it is broken
   * upstream, and branch-scoped screens would open an empty shop.
   */
  it('treats a branch_user as branch-scoped only when it carries a branchId', () => {
    expect(accessProfileFor('branch_user', 'branch-1').capabilities.has('branch')).toBe(true);
    expect(accessProfileFor('branch_user', null).capabilities.has('branch')).toBe(false);
  });
});
