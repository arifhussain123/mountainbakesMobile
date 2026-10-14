import { Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, PrimaryButton, Screen } from '@/shared/ui';
import { useAuthStore } from '@/state';

/**
 * mountainbakesFinance.html — placeholder shell for finance roles
 * (finance_admin/finance_manager/accountant/finance_auditor). 23 screens are
 * scoped in `docs/mobile-finance-plan.md`; none are built yet. This exists so
 * a finance login lands somewhere coherent rather than an "unsupported role"
 * wall, which is reserved for roles this app never intends to serve
 * (super_admin).
 */
export function FinanceDrawerNavigator() {
  const theme = useAppTheme();
  const logout = useAuthStore((state) => state.logout);

  return (
    <Screen>
      <AppHeader title="Finance" subtitle="Coming soon" />
      <View style={{ flex: 1, justifyContent: 'center', padding: theme.spacing.lg, gap: theme.spacing.md }}>
        <Text style={[theme.typography.body, { color: theme.colors.text, textAlign: 'center' }]}>
          The Finance app isn't built yet in this phase. See docs/mobile-finance-plan.md for the scoped screen list.
        </Text>
        <PrimaryButton label="Sign Out" onPress={() => void logout()} />
      </View>
    </Screen>
  );
}
