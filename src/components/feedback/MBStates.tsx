import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { MBButton } from '@/components/common/MBButton';
import { ApiError } from '@/services/api/errors';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * The screen states every data screen must be able to render. A blank screen is
 * never an acceptable outcome — each of these says what happened and, where
 * possible, offers the way out.
 */

export function MBLoading({ label = 'Loading…' }: { label?: string }): React.ReactElement {
  const theme = useTheme();
  return (
    <View style={[styles.centered, { padding: theme.layout.screenPad }]}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={[theme.type.body, { color: theme.colors.textMuted }]}>{label}</Text>
    </View>
  );
}

export interface MBEmptyStateProps {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export function MBEmptyState({
  title,
  message,
  actionLabel,
  onAction,
  icon,
}: MBEmptyStateProps): React.ReactElement {
  const theme = useTheme();
  return (
    <View style={[styles.centered, { padding: theme.layout.screenPad, gap: theme.space.sm }]}>
      {icon}
      <Text style={[theme.type.h3, { color: theme.colors.text }]}>{title}</Text>
      {message ? (
        <Text style={[theme.type.body, styles.center, { color: theme.colors.textMuted }]}>
          {message}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <MBButton label={actionLabel} onPress={onAction} variant="secondary" size="md" />
      ) : null}
    </View>
  );
}

export interface MBErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  retrying?: boolean;
}

/**
 * Error state.
 *
 * Renders `ApiError.userMessage`, never the raw thrown text — a branch user
 * should see "You don't have permission to do this", not
 * "AxiosError: Request failed with status code 403". Retry is offered only when
 * retrying could actually change the outcome; re-sending a request the server
 * already rejected as invalid just wastes the user's time.
 */
export function MBErrorState({
  error,
  onRetry,
  retrying = false,
}: MBErrorStateProps): React.ReactElement {
  const theme = useTheme();

  const apiError = error instanceof ApiError ? error : null;
  const message = apiError
    ? apiError.userMessage
    : error instanceof Error
      ? error.message
      : 'Something went wrong.';

  const canRetry = Boolean(onRetry) && (apiError ? apiError.isRetryable : true);

  return (
    <View style={[styles.centered, { padding: theme.layout.screenPad, gap: theme.space.sm }]}>
      <Text style={[theme.type.h3, { color: theme.colors.danger }]}>Couldn't load this</Text>
      <Text style={[theme.type.body, styles.center, { color: theme.colors.textMuted }]}>
        {message}
      </Text>
      {canRetry ? (
        <MBButton
          label="Try again"
          onPress={onRetry}
          loading={retrying}
          variant="secondary"
          size="md"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  center: { textAlign: 'center' },
});
