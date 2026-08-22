import { warmCaches, resolveProfile } from '@/services/boot/bootSequence';
import { queryClient } from '@/services/query/queryClient';
import { qk } from '@/services/query/queryKeys';
import { accessProfileFor } from '@/navigation/roleConfig';
import { useAuthStore } from '@/store/authStore';
import type { UserRole } from '@/shared/types/user.types';

/**
 * The cache warm.
 *
 * The failure this guards against is silent by construction: a warm that fills a
 * key the screens do not read still resolves, still logs nothing, and still
 * leaves every screen fetching from scratch — a step that costs a round of
 * requests and buys nothing, while looking like it worked. So what is asserted
 * is the KEYS, against `qk` — the same source the hooks build theirs from.
 */

function keysWarmedFor(role: UserRole, branchId: string | null) {
  const prefetch = jest
    .spyOn(queryClient, 'prefetchQuery')
    .mockImplementation(() => Promise.resolve());

  warmCaches(accessProfileFor(role, branchId, false));

  const keys = prefetch.mock.calls.map(([options]) => options.queryKey);
  prefetch.mockRestore();
  return keys;
}

describe('what gets warmed', () => {
  it('fills the exact keys the catalogue screens read', () => {
    const keys = keysWarmedFor('branch_manager', 'branch-1');

    expect(keys).toContainEqual(qk.categories.all());
    expect(keys).toContainEqual(qk.settings());
    // The unfiltered list — the one a screen opens on, and the only one that is
    // safe to mirror. A filtered fetch is a slice of the catalogue.
    expect(keys).toContainEqual(qk.products.list({}));
  });

  /**
   * A branch role is scoped server-side and sends no branchId, so the mirror is
   * read under its own branch while the request carries none. Warming the wrong
   * one of those two fills a key `useStock` will never look at.
   */
  it('keys branch stock the way useStock does', () => {
    const keys = keysWarmedFor('branch_manager', 'branch-1');
    expect(keys).toContainEqual(qk.stock.byBranch('branch-1', 'today'));
  });

  /**
   * `useBranches` disables itself for a branch role — the server scopes it and
   * there is no branch filter to draw. Warming it would be a request whose
   * answer is discarded on every launch.
   */
  it('skips the branch list for a branch role', () => {
    expect(keysWarmedFor('branch_manager', 'branch-1')).not.toContainEqual(qk.branches.all());
    expect(keysWarmedFor('super_admin', null)).toContainEqual(qk.branches.all());
  });

  /**
   * An admin has no implicit branch, so there is no stock read to warm — the
   * screen's own query stays disabled until a branch is chosen.
   */
  it('warms no stock without a branch', () => {
    const keys = keysWarmedFor('super_admin', null);
    expect(keys.some(key => key[0] === 'stock')).toBe(false);
  });

  it('warms nothing at all when signed out', () => {
    const prefetch = jest
      .spyOn(queryClient, 'prefetchQuery')
      .mockImplementation(() => Promise.resolve());

    warmCaches(null);

    expect(prefetch).not.toHaveBeenCalled();
    prefetch.mockRestore();
  });
});

describe('the profile step', () => {
  const initial = useAuthStore.getState();
  afterEach(() => useAuthStore.setState(initial, true));

  it('is null when signed out', () => {
    useAuthStore.setState({ claims: null });
    expect(resolveProfile()).toBeNull();
  });

  it('derives role and branch from the session, not from a fetch', () => {
    useAuthStore.setState({
      claims: {
        userId: 'u1',
        role: 'branch_manager',
        branchId: 'branch-1',
        branchName: 'Skardu',
        email: 'a@b.c',
        mustChangePassword: false,
      },
    });

    expect(resolveProfile()).toMatchObject({ role: 'branch_manager', branchId: 'branch-1' });
  });

  /**
   * A build that predates a `user_role` the server is issuing gets the minimal
   * shell and a warning — never a crash, and never the admin set.
   */
  it('falls back to the minimal shell on a role it does not know', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    useAuthStore.setState({
      claims: {
        userId: 'u1',
        role: 'quartermaster' as UserRole,
        branchId: null,
        branchName: null,
        email: 'a@b.c',
        mustChangePassword: false,
      },
    });

    const profile = resolveProfile();

    expect(profile?.capabilities.size).toBe(0);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
