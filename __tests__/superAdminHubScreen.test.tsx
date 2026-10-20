/**
 * @format
 */
import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { queryClient } from '@/api';
import { Routes } from '@/navigation/routes';
import { SuperAdminHubScreen } from '@/navigation/SuperAdminDrawerNavigator/SuperAdminHubScreen';
import { ThemeProvider } from '@/shared/theme';
import { useAuthStore } from '@/state';

const mockNavigation = { navigate: jest.fn(), closeDrawer: jest.fn() };
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
}));
// The header's Search / Appearance / bell buttons are not what this screen is about.
jest.mock('@/features/admin', () => ({ useAdminHeaderActions: () => [] }));

function render(hubKey: string): ReactTestRenderer.ReactTestRenderer {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    renderer = ReactTestRenderer.create(
      <ThemeProvider>
        <SuperAdminHubScreen hubKey={hubKey} />
      </ThemeProvider>,
    );
  });
  return renderer;
}

const textsOf = (r: ReactTestRenderer.ReactTestRenderer) => r.root.findAllByType(Text).map((t) => [t.props.children].flat().join(''));

describe('Super Admin group pages', () => {
  beforeEach(() => {
    useAuthStore.setState({
      status: 'signedIn',
      accessToken: 't',
      user: { id: 'u1', email: 'a@b.c', displayName: 'Admin', username: null, role: 'super_admin', branchId: null, branchName: null, mustChangePassword: false },
    });
    mockNavigation.navigate.mockClear();
  });
  afterEach(() => queryClient.clear());

  it("lists Finance's twelve pages under the web's three finance sections", () => {
    const r = render('financeHub');
    const texts = textsOf(r);
    expect(texts).toEqual(expect.arrayContaining(['Finance', '12 pages', 'FINANCE', 'PAYROLL & PARTNERS', 'FINANCE SETUP & REVIEW']));
    expect(texts.filter((t) => ['Finance Ledger', 'Payroll', 'Salary Ledger', 'Audit Trail', 'Finance Settings'].includes(t))).toEqual([
      'Finance Ledger',
      'Payroll',
      'Salary Ledger',
      'Audit Trail',
      'Finance Settings',
    ]);
    act(() => r.unmount());
  });

  it('lists a one-section group without a section label, and a tap opens the page its old drawer row did', () => {
    const r = render('catalogHub');
    const texts = textsOf(r);
    expect(texts).toEqual(expect.arrayContaining(['Catalog', '4 pages', 'Products', 'Categories', 'Price List', 'Price History']));
    expect(texts).not.toContain('CATALOG');
    const [priceHistory] = r.root.findAll((n) => n.props.accessibilityLabel === 'Price History' && typeof n.props.onPress === 'function');
    act(() => priceHistory!.props.onPress());
    expect(mockNavigation.navigate).toHaveBeenCalledWith(Routes.PRICE_HISTORY_STACK, undefined);
    act(() => r.unmount());
  });
});
