import { useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useRevokeAllSessions, useRevokeSession, type SecuritySession } from '@/api';
import { mapErrorToMessage } from '@/shared/helpers';
import { useAuthStore } from '@/state';
import { useAppTheme } from '@/shared/theme';
import { FormBottomSheet, PrimaryButton, SecondaryButton, TextField } from '@/shared/ui';
import { DetailRows } from '../../components/AdminDetail';
import { formatDevice, revokeAllCounts, revokeExplanation, revokeReason, revokeSuccess } from '../../utils/systemActions';
import { formatLocation } from './sessionFormat';

export interface RevokeTarget {
  /** The session being ended, or — in 'all' mode — one belonging to the account. */
  session: SecuritySession;
  mode: 'one' | 'all';
  /** Live sessions on the account; only the roster knows it, so it is absent from the history. */
  sessionCount?: number;
}

/**
 * Web `RevokeSessionDialog`: one confirmation for both actions — one session,
 * or every session for an account — naming the staff code, device and
 * location (or the arithmetic) before asking. The optional reason goes to the
 * audit log. Mounted only while open, so a reason never carries over to a
 * different session.
 */
function RevokeForm({ target, onClose }: { target: RevokeTarget; onClose: () => void }) {
  const theme = useAppTheme();
  const me = useAuthStore((s) => s.user?.id);
  const revokeOne = useRevokeSession();
  const revokeAll = useRevokeAllSessions();
  const [reason, setReason] = useState('');
  const { session, mode, sessionCount } = target;
  const pending = revokeOne.isPending || revokeAll.isPending;
  // Clearing your OWN account: the server keeps the session you are using, so the arithmetic says so.
  const own = session.userId != null && session.userId === me;

  const submit = () => {
    const why = revokeReason(reason);
    const handlers = {
      onSuccess: (result: { revoked: number; authSessionsEnded: number }) => {
        const { title, message } = revokeSuccess(result);
        Alert.alert(title, message);
        onClose();
      },
      onError: (e: unknown) => Alert.alert('Could Not Sign That Session Out', mapErrorToMessage(e)),
    };
    if (mode === 'all') {
      if (!session.userId) return;
      revokeAll.mutate({ userId: session.userId, reason: why }, handlers);
    } else {
      revokeOne.mutate({ sessionId: session.id, reason: why }, handlers);
    }
  };

  const counts = sessionCount !== undefined ? revokeAllCounts(sessionCount, own) : null;

  return (
    <View>
      <DetailRows
        rows={[
          { label: 'Mountain Bakes ID', value: session.userCode ?? session.userName, mono: true },
          { label: 'Name', value: session.userName },
          mode === 'one' ? { label: 'Device', value: formatDevice(session) } : null,
          mode === 'one' ? { label: 'Location', value: formatLocation(session) } : null,
          mode === 'all' && counts ? { label: 'Active sessions', value: String(sessionCount) } : null,
          mode === 'all' && counts?.keepsThisOne ? { label: 'This session', value: 'Kept' } : null,
          mode === 'all' && counts ? { label: 'Signed out', value: String(counts.signedOut) } : null,
        ]}
      />
      <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 12 }]}>{revokeExplanation(mode, own)}</Text>
      <TextField
        label="Reason (optional)"
        value={reason}
        onChangeText={setReason}
        maxLength={300}
        multiline
        placeholder="Recorded in the audit log — e.g. 'device reported lost'"
      />
      <View style={styles.buttons}>
        <View style={{ flex: 1 }}>
          <SecondaryButton label="Cancel" onPress={onClose} disabled={pending} />
        </View>
        <View style={{ flex: 1.4 }}>
          <PrimaryButton label={mode === 'all' ? 'Sign out all' : 'Sign out'} onPress={submit} loading={pending} />
        </View>
      </View>
    </View>
  );
}

/** The one Sign-out sheet both session tabs and the detail sheet open. */
export function useRevokeSheet() {
  const ref = useRef<BottomSheetModal>(null);
  const [target, setTarget] = useState<RevokeTarget | null>(null);
  const close = () => ref.current?.dismiss();

  const open = (next: RevokeTarget) => {
    setTarget(next);
    ref.current?.present();
  };

  const element = (
    <FormBottomSheet
      ref={ref}
      title={target?.mode === 'all' ? 'Sign out all other sessions?' : 'Sign out this session?'}
      onRequestClose={close}
      onDismiss={() => setTarget(null)}>
      {target ? <RevokeForm key={`${target.session.id}:${target.mode}`} target={target} onClose={close} /> : null}
    </FormBottomSheet>
  );

  return { open, element };
}

const styles = StyleSheet.create({
  buttons: { flexDirection: 'row', gap: 10, marginTop: 18 },
});
