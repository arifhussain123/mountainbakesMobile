import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { MBCard } from '@/common/ui';
import { space } from '@/common/theme/spacing';
import { useTheme } from '@/common/theme/ThemeProvider';

export interface OrderMetaGridProps {
  branchName?: string | null;
  orderedBy?: string | null;
  /** The business day this demand is being RAISED on — not the required date. */
  businessDate: string;
  /** Karachi 'HH:mm'. The clock the order window is judged against. */
  time: string;
}

/**
 * The facts about this demand that nobody types.
 *
 * ---------------------------------------------------------------------------
 * Stated, not asked
 * ---------------------------------------------------------------------------
 * Every cell here is derived from the session or the clock, and each is on
 * screen for a reason a branch can act on:
 *
 * - **Branch** — `branchId` is never sent (the server derives it from the
 *   token), but the person filing a demand should see whose name it goes under.
 *   `branch_user` is a shift account carrying its manager's branch, so on that
 *   account this is the only place the shop is named.
 * - **Ordered by** — the account, not the person, and that is the honest
 *   version: a shared shift account files under one name whoever is holding the
 *   phone.
 * - **Business day / Time** — Karachi, not the device. The day rolls at 02:00,
 *   and the order window is judged against this clock rather than the phone's.
 * - **Order no.** — deliberately not generated here. The server assigns it, and
 *   an order number invented on the device would be a second identity for a
 *   demand that already has one (`client_operation_id`), shown to someone who
 *   would then quote it to Production.
 *
 * v6's grid also carries a branch *code*. There is no such value in the session
 * claims and fetching the branch record for one cell is a request whose only
 * answer is decoration, so the cell is left out rather than filled with the
 * branch UUID.
 */
export function OrderMetaGrid({
  branchName,
  orderedBy,
  businessDate,
  time,
}: OrderMetaGridProps): React.ReactElement {
  return (
    <MBCard>
      <View style={styles.grid}>
        <MetaCell label="Branch" value={branchName ?? 'Your branch'} />
        <MetaCell label="Ordered by" value={orderedBy ?? 'This account'} />
        <MetaCell label="Business day" value={businessDate} numeric />
        <MetaCell label="Time" value={time} numeric />
        <MetaCell label="Order no." value="Assigned on submit" muted />
      </View>
    </MBCard>
  );
}

/**
 * Two per row on a phone, and it grows to three on a tablet without a
 * breakpoint: `flexBasis: '45%'` with `flexWrap` fits two at 360dp and three
 * once the card is wide enough, which is the whole of what a media query would
 * have decided.
 */
function MetaCell({
  label,
  value,
  numeric = false,
  muted = false,
}: {
  label: string;
  value: string;
  numeric?: boolean;
  muted?: boolean;
}): React.ReactElement {
  const theme = useTheme();

  return (
    <View style={styles.cell}>
      <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>{label}</Text>
      <Text
        numberOfLines={1}
        style={[
          numeric ? theme.type.number : theme.type.bodyStrong,
          { color: muted ? theme.colors.textSubtle : theme.colors.text },
        ]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: space.md, columnGap: space.md },
  cell: { flexGrow: 1, flexBasis: '45%', gap: space.hair },
});
