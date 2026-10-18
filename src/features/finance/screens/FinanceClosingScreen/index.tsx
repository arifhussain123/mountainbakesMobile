import { useState } from 'react';
import { View } from 'react-native';
import { AppHeader, FilterChipRow, Screen } from '@/shared/ui';
import { BranchSalesTab } from './BranchSalesTab';
import { LedgerClosingTab } from './LedgerClosingTab';
import { styles } from './styles';

type ClosingTab = 'sales' | 'ledger';

const TABS = [
  { value: 'sales' as const, label: 'Branch Sales' },
  { value: 'ledger' as const, label: 'Ledger Closing' },
];

/**
 * mountainbakesFinance.html screen 18 — Daily Closing, as two tabs like the web
 * (DailyClosingPage.tsx): Branch Sales checks what each branch took against the
 * money received; Ledger Closing signs the ledger off. Neither feeds the other.
 */
export function FinanceClosingScreen() {
  const [tab, setTab] = useState<ClosingTab>('sales');

  return (
    <Screen>
      <AppHeader title="Daily Closing" subtitle="Branch sales against deposits, then sign the day off" actions={[]} />
      <View style={styles.tabs}>
        <FilterChipRow options={TABS} value={tab} onChange={setTab} />
      </View>
      <View style={{ flex: 1 }}>{tab === 'sales' ? <BranchSalesTab /> : <LedgerClosingTab />}</View>
    </Screen>
  );
}
