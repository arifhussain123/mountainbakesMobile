import { useRef, useState } from 'react';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { openDrawer } from '@/navigation';
import { AppHeader, FilterChipRow, FormBottomSheet, Screen, type FilterChipOption } from '@/shared/ui';
import { ActiveSessionsTab } from './security/ActiveSessionsTab';
import { FailedLoginsTab } from './security/FailedLoginsTab';
import { LoginHistoryTab } from './security/LoginHistoryTab';
import { SessionDetail } from './security/SessionDetail';

type Tab = 'active' | 'history' | 'failed';
const TABS: FilterChipOption<Tab>[] = [
  { value: 'active', label: 'Active Sessions' },
  { value: 'history', label: 'Login History' },
  { value: 'failed', label: 'Failed Logins' },
];

/**
 * Security — the web `/security` page, read side: Active Sessions (the live
 * roster, grouped by account), Login History (every sign-in that worked) and
 * Failed Logins (every one that did not). Super Admin only, so the Failed
 * Logins tab is always shown. One "Session detail" sheet serves both session
 * tabs. Signing a session out is a web action and is not offered here yet.
 */
export function SecurityScreen() {
  const [tab, setTab] = useState<Tab>('active');
  const [viewId, setViewId] = useState<string | null>(null);
  const sheet = useRef<BottomSheetModal>(null);

  const onView = (id: string) => {
    setViewId(id);
    sheet.current?.present();
  };
  const tabs = <FilterChipRow options={TABS} value={tab} onChange={setTab} />;

  return (
    <Screen>
      <AppHeader
        title="Security"
        subtitle="Who is signed in, from where, and on what. Locations are resolved from the sign-in IP address and are approximate."
        actions={[{ icon: 'menu', onPress: openDrawer, accessibilityLabel: 'Open menu' }]}
      />
      {tab === 'active' ? <ActiveSessionsTab header={tabs} onView={onView} /> : null}
      {tab === 'history' ? <LoginHistoryTab header={tabs} onView={onView} /> : null}
      {tab === 'failed' ? <FailedLoginsTab header={tabs} /> : null}
      <FormBottomSheet ref={sheet} title="Session detail" onRequestClose={() => sheet.current?.dismiss()} onDismiss={() => setViewId(null)}>
        {viewId ? <SessionDetail sessionId={viewId} /> : null}
      </FormBottomSheet>
    </Screen>
  );
}
