/**
 * @format
 */
import React from 'react';
import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { queryClient, queryKeys } from '@/api';
import type { SessionUser } from '@/api';
import { DrawerContent } from '@/navigation/DrawerNavigator/DrawerContent';
import { ThemeProvider } from '@/shared/theme';
import { useAuthStore } from '@/state';

const user = (role: SessionUser['role'], branchName: string | null): SessionUser => ({
  id: 'u1',
  email: 'someone@example.com',
  displayName: 'Test User',
  username: null,
  role,
  branchId: branchName ? 'b1' : null,
  branchName,
  mustChangePassword: false,
});

function renderDrawerFor(sessionUser: SessionUser): string[] {
  useAuthStore.setState({ status: 'signedIn', user: sessionUser, accessToken: 't' });
  const props = {
    navigation: { navigate: jest.fn(), closeDrawer: jest.fn() },
    state: { index: 0, routes: [{ key: 'tabs', name: 'Tabs' }] },
    descriptors: {},
  } as unknown as DrawerContentComponentProps;
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    renderer = ReactTestRenderer.create(
      <ThemeProvider>
        <DrawerContent {...props} />
      </ThemeProvider>,
    );
  });
  const texts = renderer.root.findAllByType(Text).map((t) => [t.props.children].flat().join(''));
  act(() => renderer.unmount());
  return texts;
}

describe('the drawer, per server role', () => {
  afterEach(() => queryClient.clear());

  it('a Branch Manager sees the Branch menu and their own branch — no Production screens', () => {
    const texts = renderDrawerFor(user('branch_manager', 'Committee Chowk'));
    expect(texts).toEqual(expect.arrayContaining(['Branch Manager', 'Committee Chowk', 'MAIN', 'MONEY', 'New Orders', 'Cash Deposits', 'Branch Closing']));
    for (const label of ['Production Stock', 'Branch Stock', 'Returns', 'Production User', 'Production · All branches', 'OVERVIEW', 'WORK']) {
      expect(texts).not.toContain(label);
    }
  });

  it('a Production User sees the Production menu across all branches — no Branch screens', () => {
    const texts = renderDrawerFor(user('production_user', null));
    expect(texts).toEqual(
      expect.arrayContaining(['Production User', 'Production · All branches', 'OVERVIEW', 'WORK', 'PLANNING', 'INSIGHTS', 'SUPPORT']),
    );
    const menu = ['Dashboard', 'Orders', 'Sales', 'Production Stock', 'Branch Stock', 'Returns', 'Discounts', 'Events', 'Reports', 'Help Desk'];
    // Exactly the 10 items, in the web's order (Appearance/Logout follow under Settings).
    expect(texts.filter((t) => menu.includes(t))).toEqual(menu);
    for (const label of ['New Orders', 'Cash Deposits', 'Shop Expenses', 'Branch Closing', 'Daily Sale Record', 'Return Stock', 'No branch assigned']) {
      expect(texts).not.toContain(label);
    }
  });

  it("a Production User's menu shows the awaiting-review counts as badges", () => {
    queryClient.setQueryData(queryKeys.productionReturnsAwaitingCount(), 7);
    const texts = renderDrawerFor(user('production_user', null));
    expect(texts).toContain('7');
  });
});
