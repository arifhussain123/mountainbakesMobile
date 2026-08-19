import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { MBModal } from './MBModal';
import { MBButton } from '../common/MBButton';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * A decision that cannot be taken back, asked as a sheet.
 *
 * ---------------------------------------------------------------------------
 * Never `Alert.alert`
 * ---------------------------------------------------------------------------
 * The platform dialog cannot be themed, cannot hold an input, and — the part
 * that matters here — **blocks the JS thread's event loop on Android in a way
 * that has stranded automation and hidden a queued drain**. Everything this app
 * asks is themed and half of it needs a reason field, so a themed sheet is the
 * only presentation that covers all of it.
 *
 * ---------------------------------------------------------------------------
 * The confirm button is not the default
 * ---------------------------------------------------------------------------
 * `confirmVariant` is `danger` by default because that is what this is for.
 * The cancel action is a `ghost` and sits **first** in reading order, so the
 * cheap way out is the one the thumb reaches without aiming — a destructive
 * action should cost a deliberate movement.
 *
 * `confirmDisabled` exists for the case that is otherwise a trap: a withdrawal
 * that requires a reason. The button stays visibly present and unusable rather
 * than hidden, so the requirement is discoverable before the reason is typed
 * rather than after.
 */

export interface MBConfirmDialogProps {
  visible: boolean;
  title: string;
  /** What actually happens, in the reader's terms. Optional but rarely skippable. */
  message?: string;
  /** A reason field, or anything else the decision needs. */
  children?: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmVariant?: 'danger' | 'primary';
  confirmDisabled?: boolean;
  loading?: boolean;
  testID?: string;
}

export function MBConfirmDialog({
  visible,
  title,
  message,
  children,
  confirmLabel,
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  confirmVariant = 'danger',
  confirmDisabled,
  loading,
  testID,
}: MBConfirmDialogProps): React.ReactElement {
  const theme = useTheme();

  return (
    <MBModal visible={visible} onRequestClose={onCancel} presentation="sheet" testID={testID}>
      <Text style={[theme.type.h3, { color: theme.colors.text }]}>{title}</Text>

      {message ? (
        <Text style={[theme.type.body, { color: theme.colors.textMuted }]}>{message}</Text>
      ) : null}

      {children}

      <View style={styles.actions}>
        <MBButton label={cancelLabel} variant="ghost" onPress={onCancel} />
        <MBButton
          label={confirmLabel}
          variant={confirmVariant}
          onPress={onConfirm}
          disabled={confirmDisabled}
          loading={loading}
          testID={testID ? `${testID}-confirm` : undefined}
        />
      </View>
    </MBModal>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
});
