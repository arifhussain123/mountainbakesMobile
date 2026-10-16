import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { flushOfflineQueue, clearOfflineQueue } from '@/api';
import { useAppTheme } from '@/shared/theme';
import { Icon, PillButton, SecondaryButton } from '@/shared/ui';
import { useNetworkStatus } from '@/shared/hooks';

export interface SignOutSheetProps {
  visible: boolean;
  pendingCount: number;
  failedCount: number;
  onSignOut: () => void;
  onClose: () => void;
}

/**
 * Confirms sign-out, and — when the sync queue is non-empty — makes the
 * consequence explicit before it happens: signing out deletes those entries
 * from the phone (CLAUDE.md Section 37's "never silently lose a transaction"
 * rule applies to leaving just as much as to going offline).
 */
export function SignOutSheet({ visible, pendingCount, failedCount, onSignOut, onClose }: SignOutSheetProps) {
  const theme = useAppTheme();
  const { isOffline } = useNetworkStatus();
  const [isSyncing, setIsSyncing] = useState(false);
  const unsynced = pendingCount + failedCount;

  if (!visible) return null;

  const handleSyncNow = async () => {
    setIsSyncing(true);
    try {
      await flushOfflineQueue();
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSignOutAnyway = async () => {
    if (unsynced > 0) await clearOfflineQueue();
    onSignOut();
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: theme.colors.background, borderColor: theme.colors.border, borderRadius: theme.radii.lg }]}
          onPress={(e) => e.stopPropagation()}>
          <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>Sign out?</Text>

          {unsynced > 0 ? (
            <View style={[styles.warningBox, { backgroundColor: `${theme.colors.warning}17`, borderColor: `${theme.colors.warning}48` }]}>
              <Icon name="warning" size={16} color={theme.colors.warning} />
              <Text style={[theme.typography.bodySmall, { color: theme.colors.text, flex: 1 }]}>
                You have {unsynced} change{unsynced === 1 ? '' : 's'} that haven't synced. Signing out will delete {unsynced === 1 ? 'it' : 'them'}{' '}
                from this phone.
              </Text>
            </View>
          ) : (
            <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: theme.spacing.sm }]}>
              You'll need to sign in again to use the app.
            </Text>
          )}

          <View style={{ marginTop: theme.spacing.lg, gap: theme.spacing.sm }}>
            {unsynced > 0 && !isOffline ? (
              <PillButton label={isSyncing ? 'Syncing…' : 'Sync now'} onPress={() => void handleSyncNow()} disabled={isSyncing} />
            ) : null}
            <SecondaryButton label="Cancel" onPress={onClose} />
            <Pressable
              accessibilityRole="button"
              onPress={() => void handleSignOutAnyway()}
              style={[styles.dangerButton, { borderColor: theme.colors.danger }]}>
              <Text style={[theme.typography.body, { color: theme.colors.danger, fontWeight: '700' }]}>
                {unsynced > 0 ? 'Sign out anyway' : 'Sign out'}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  sheet: { width: '100%', maxWidth: 400, borderWidth: 1, padding: 20 },
  warningBox: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', borderWidth: 1, borderRadius: 12, padding: 10, marginTop: 12 },
  dangerButton: { height: 48, borderWidth: 1.5, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
