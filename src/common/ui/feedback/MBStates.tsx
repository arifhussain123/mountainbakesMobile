import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { MBIllustration, type IllustrationKey } from '@/assets/illustrations';
import { MBButton } from '@/common/ui/common/MBButton';
import { MBIcon } from '@/common/ui/common/MBIcon';
import type { IconKey } from '@/common/constants/navigationIcons';
import { ApiError } from '@/api/errors';
import { useTheme } from '@/common/theme/ThemeProvider';
import { space } from '@/common/theme/spacing';

/**
 * The screen states every data screen must be able to render. A blank screen is
 * never an acceptable outcome — each of these says what happened and, where
 * possible, offers the way out.
 */

export function MBLoading({ label = 'Loading…' }: { label?: string }): React.ReactElement {
  const theme = useTheme();
  return (
    <View style={[styles.centered, { padding: theme.layout.screenPad }]}>
      <ActivityIndicator size="large" color={theme.colors.accent} />
      <Text style={[theme.type.body, { color: theme.colors.textMuted }]}>{label}</Text>
    </View>
  );
}

export interface MBEmptyStateProps {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  /**
   * An `IconKey`, not a node.
   *
   * A `ReactNode` here was an escape hatch around the whole icon system: a
   * caller could pass a raw Lucide component at whatever pixel size it liked,
   * and the `emptyState` token would go on being the one size nothing used.
   * Taking a key means the family and the size are decided here.
   *
   * Ignored when `illustration` is set — see below.
   */
  icon?: IconKey;
  /**
   * A branded drawing instead of an icon, for the empty states a user actually
   * lands on and reads (no orders yet, no sales yet, nothing on the shelf).
   *
   * Prefer this on a **first-run or end-of-list** empty state, where the screen
   * is otherwise bare and the drawing carries the tone. Keep `icon` for empty
   * states inside a dense screen — a filtered list with no matches, say — where
   * a 160dp illustration would be the loudest thing on the page.
   *
   * It wins over `icon` rather than rendering both: two competing marks above
   * one sentence is the mismatch this set exists to avoid.
   */
  illustration?: IllustrationKey;
}

export function MBEmptyState({
  title,
  message,
  actionLabel,
  onAction,
  icon,
  illustration,
}: MBEmptyStateProps): React.ReactElement {
  const theme = useTheme();
  return (
    <View style={[styles.centered, { padding: theme.layout.screenPad, gap: theme.space.sm }]}>
      {illustration ? (
        <MBIllustration name={illustration} />
      ) : icon ? (
        <MBIcon name={icon} size="emptyState" color={theme.colors.textMuted} />
      ) : null}
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

  /**
   * Being offline is not a failure, and it should not be drawn like one.
   *
   * Every write in this app succeeds locally whether or not there is a network,
   * so a cracked-biscuit error state over "no connection" tells the user their
   * work is lost when it is queued and safe. The offline drawing and the warning
   * palette say "waiting", which is what is actually true.
   */
  const isOffline = apiError?.kind === 'offline' || apiError?.kind === 'network';

  return (
    <View style={[styles.centered, { padding: theme.layout.screenPad, gap: theme.space.sm }]}>
      <MBIllustration name={isOffline ? 'offline' : 'error'} />
      <Text style={[theme.type.h3, { color: isOffline ? theme.colors.text : theme.colors.danger }]}>
        {isOffline ? "You're offline" : "Couldn't load this"}
      </Text>
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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
  },
  center: { textAlign: 'center' },
});
