import { useRef, useState } from 'react';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import type { SecuritySession } from '@/api';
import { AppHeader, FilterChipRow, FormBottomSheet, Screen, type FilterChipOption } from '@/shared/ui';
import { ActiveSessionsTab } from './security/ActiveSessionsTab';
import { FailedLoginsTab } from './security/FailedLoginsTab';
import { LoginHistoryTab } from './security/LoginHistoryTab';
import { SessionDetail } from './security/SessionDetail';
import { useRevokeSheet } from './security/revokeSheet';
import { useAdminHeaderActions } from '../components/useAdminHeaderActions';

type Tab = 'active' | 'history' | 'failed';
const TABS: FilterChipOption<Tab>[] = [
  { value: 'active', label: 'Active Sessions' },
  { value: 'history', label: 'Login History' },
  { value: 'failed', label: 'Failed Logins' },
];

/**
 * Security — the web `/security` page: Active Sessions (the live roster,
 * grouped by account), Login History (every sign-in that worked) and Failed
 * Logins (every one that did not). Super Admin only, so the Failed Logins tab
 * is always shown and every Sign out is offered. One "Session detail" sheet
 * and one Sign-out sheet serve both session tabs, as on the web.
 */
export function SecurityScreen() {
  const headerActions = useAdminHeaderActions();
  const [tab, setTab] = useState<Tab>('active');
  const [viewId, setViewId] = useState<string | null>(null);
  const sheet = useRef<BottomSheetModal>(null);
  const revoke = useRevokeSheet();

  const onView = (id: string) => {
    setViewId(id);
    sheet.current?.present();
  };
  const onRevoke = (session: SecuritySession) => revoke.open({ session, mode: 'one' });
  const onRevokeAll = (session: SecuritySession, sessionCount: number) => revoke.open({ session, mode: 'all', sessionCount });
  const tabs = <FilterChipRow options={TABS} value={tab} onChange={setTab} />;

  return (
    <Screen>
      <AppHeader
        title="Security"
        subtitle="Who is signed in, from where, and on what. Locations are resolved from the sign-in IP address and are approximate."
        actions={headerActions}
      />
      {tab === 'active' ? <ActiveSessionsTab header={tabs} onView={onView} onRevoke={onRevoke} onRevokeAll={onRevokeAll} /> : null}
      {tab === 'history' ? <LoginHistoryTab header={tabs} onView={onView} onRevoke={onRevoke} /> : null}
      {tab === 'failed' ? <FailedLoginsTab header={tabs} /> : null}
      <FormBottomSheet ref={sheet} title="Session detail" onRequestClose={() => sheet.current?.dismiss()} onDismiss={() => setViewId(null)}>
        {viewId ? (
          <SessionDetail
            sessionId={viewId}
            onRevoke={(session) => {
              // Closed first, so the confirmation is not stacked on the detail it came from.
              sheet.current?.dismiss();
              onRevoke(session);
            }}
          />
        ) : null}
      </FormBottomSheet>
      {revoke.element}
    </Screen>
  );
}
