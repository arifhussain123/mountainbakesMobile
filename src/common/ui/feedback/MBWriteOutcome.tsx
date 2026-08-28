import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/common/theme/ThemeProvider';
import { space } from '@/common/theme/spacing';
import type { WriteOutcome } from '@/api/sync/writeOutcome';

/**
 * What someone is told after pressing Save, in one place for every write.
 *
 * ---------------------------------------------------------------------------
 * Why the offline case gets three lines and the others get one
 * ---------------------------------------------------------------------------
 * A confirmed write needs no explanation — the thing the person expected to
 * happen happened. A **queued** one is the opposite: nothing they can see has
 * changed on the server, they may have no signal, and the honest report is a
 * small amount of unfamiliar news. So it answers the three questions someone
 * standing at a counter actually has, in the order they have them:
 *
 *   what happened   → "Saved offline"
 *   is it safe      → "…stored on this device…"
 *   what happens now→ "…syncs on its own when the connection returns."
 *                     plus an explicit status, because "will sync" is a promise
 *                     and a status is a fact about right now.
 *
 * The alternative — a one-line "Saved offline" — reads as a *failure* to a
 * cashier who has never seen it before, and the recovery from that belief is
 * ringing the sale up a second time.
 *
 * ---------------------------------------------------------------------------
 * The rule this exists to hold
 * ---------------------------------------------------------------------------
 * **A queued transaction is never reported as saved**, and a **refused** one is
 * never reported as queued. Both wordings are the same defect pointing in
 * opposite directions: one invites a duplicate, the other guarantees nobody
 * looks at a sale the server threw away. `writeOutcomeCopy` is a pure function
 * so that rule is asserted directly, without rendering anything.
 *
 * There is deliberately still **no success screen** — see `docs/screen-patterns.md`.
 * A queued write has no server reference to put on one.
 */

export interface WriteSubject {
  /** Lower-case noun for the offline sentence: "sale", "expense", "order". */
  noun: string;
  /** Shown verbatim when the server confirmed inside the drain. */
  confirmed: string;
  /**
   * An extra truth for the queued case, when "saved" could still be misread as
   * "done" — a stock return is saved but the units have not moved.
   */
  queuedNote?: string;
  /** How the refused line warns against re-entry: "do not ring it up again". */
  refusedNote: string;
}

export interface WriteOutcomeCopy {
  tone: 'ok' | 'queued' | 'refused';
  title: string;
  detail?: string;
  /** Present tense, and only where the outcome is genuinely still in motion. */
  status?: string;
}

export function writeOutcomeCopy(
  outcome: WriteOutcome,
  subject: WriteSubject,
  reason?: string,
): WriteOutcomeCopy {
  if (outcome === 'synced') {
    return { tone: 'ok', title: subject.confirmed };
  }

  if (outcome === 'refused') {
    return {
      tone: 'refused',
      title: 'Not accepted',
      // The server's own words: they name the products that were short, which
      // is the only part of this a person can act on.
      detail: `${reason ?? `The server refused this ${subject.noun}.`} It is saved and waiting in Sync Center — ${subject.refusedNote}.`,
      // No status line. A refused write is not waiting for anything; it is
      // waiting for *someone*, and calling that "waiting to sync" is the lie
      // this whole module exists to avoid.
    };
  }

  return {
    tone: 'queued',
    title: 'Saved offline',
    detail:
      `Your ${subject.noun} is stored on this device and syncs on its own when the connection returns.` +
      (subject.queuedNote ? ` ${subject.queuedNote}` : ''),
    status: 'Waiting to sync',
  };
}

const TONE = {
  ok: { bg: 'successBg', fg: 'success' },
  // Offline is a warning, not an error — the same call MBOfflineBanner makes.
  // Branch staff are offline routinely; a red alarm every time would train them
  // to ignore the one that matters.
  queued: { bg: 'warningBg', fg: 'warning' },
  refused: { bg: 'dangerBg', fg: 'danger' },
} as const;

export interface MBWriteOutcomeProps {
  copy: WriteOutcomeCopy;
  /** Omit for a card that stays put; pass to make the whole band dismissible. */
  testID?: string;
}

export function MBWriteOutcome({ copy, testID }: MBWriteOutcomeProps): React.ReactElement {
  const theme = useTheme();
  const tone = TONE[copy.tone];
  const fg = theme.colors[tone.fg];

  // One announcement, not three. The title, detail and status are separate
  // Views so they can be styled apart, but a screen reader that stopped on each
  // would read a status line stripped of the sentence that gives it meaning.
  const spoken = [copy.title, copy.detail, copy.status && `Status: ${copy.status}`]
    .filter(Boolean)
    .join('. ');

  return (
    <View
      testID={testID}
      style={[
        styles.band,
        { borderRadius: theme.radius.md, backgroundColor: theme.colors[tone.bg] },
      ]}>
      <Text accessibilityRole="alert" accessibilityLabel={spoken} style={[theme.type.label, { color: fg }]}>
        {copy.title}
      </Text>

      {copy.detail ? (
        <Text accessible={false} style={[theme.type.caption, { color: fg }]}>
          {copy.detail}
        </Text>
      ) : null}

      {copy.status ? (
        <Text accessible={false} style={[theme.type.caption, styles.status, { color: fg }]}>
          Status: {copy.status}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  band: { padding: space.md, gap: space.xs },
  // Set apart from the sentence above it: a status is a different kind of
  // statement from a description, and reads as one when it is not run together.
  status: { opacity: 0.85 },
});
