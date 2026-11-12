import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { AccentFill, Card, MiniStat, Pill, type PillKind, StatusBadge, type StatusVariant } from '@/shared/ui';
import { formatCurrency, formatDisplayDate, formatDisplayTime } from '@/shared/utils';
import type { DailySaleRecord } from '@/api';

export interface DailySaleRecordCardProps {
  record: DailySaleRecord;
  isGenerating: boolean;
  onGenerate: () => void;
  onOpenManualFeed: () => void;
  /** Opens Day Detail — absent (undefined) for a not-yet-generated day, which has nothing to show. */
  onOpenDetail?: () => void;
}

const STATUS_LABEL: Record<DailySaleRecord['status'], string> = {
  open: 'Open',
  pending_verification: 'Pending Verification',
  verified: 'Verified',
  locked: 'Locked',
  amended: 'Amended',
};

const STATUS_VARIANT: Record<DailySaleRecord['status'], StatusVariant> = {
  open: 'warning',
  pending_verification: 'info',
  verified: 'success',
  locked: 'neutral',
  amended: 'neutral',
};

/** "Mon 12 Oct". */
function dayLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return formatDisplayDate(iso);
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).replace(',', '');
}

/** Bare amount for the dense mini grid ("19,750"); the hero and detail carry the "Rs." form. */
function bare(amount: number): string {
  return formatCurrency(amount).replace(/^Rs\.?\s*/, '');
}

/**
 * branchApp.md screen 21 — one business day's takings against what was
 * counted (redesign B21): the day and generated time over its status, a
 * lavender grid of the day's figures, then the difference pill and the day's
 * actions (Generate / Manual feed / Open).
 */
export function DailySaleRecordCard({ record, isGenerating, onGenerate, onOpenManualFeed, onOpenDetail }: DailySaleRecordCardProps) {
  const theme = useAppTheme();
  const notGenerated = record.id === null;
  const hasCount = record.manualCash !== null || record.manualEasypaisa !== null || record.manualBank !== null;
  const diff = record.overallDifference;

  const accessibilityLabel = notGenerated
    ? `${formatDisplayDate(record.businessDate)}, not generated yet`
    : [
        formatDisplayDate(record.businessDate),
        `total sale ${record.autoTotalSale.toLocaleString()} rupees`,
        `cash on table ${record.expectedCashInHand.toLocaleString()}`,
        hasCount ? `counted, ${Math.abs(diff).toLocaleString()} ${diff >= 0 ? 'over' : 'short'}` : 'not counted',
        STATUS_LABEL[record.status],
      ].join(', ');

  const canOpenDetail = !notGenerated && !!onOpenDetail;
  const canFeed = !notGenerated && (record.status === 'open' || record.status === 'pending_verification');

  const diffPill: { label: string; kind: PillKind } = !hasCount
    ? { label: 'Not counted yet', kind: 'neutral' }
    : diff === 0
      ? { label: 'No difference', kind: 'ok' }
      : diff > 0
        ? { label: `${formatCurrency(diff)} over`, kind: 'warn' }
        : { label: `${formatCurrency(-diff)} short`, kind: 'bad' };

  const minis: { label: string; value: number; color?: string }[] = [
    { label: 'Total sale', value: record.autoTotalSale },
    { label: 'Company share', value: record.companyShare },
    { label: 'Branch share', value: record.branchShare, color: theme.colors.success },
    { label: 'Cash', value: record.autoCash },
    { label: 'Easypaisa', value: record.autoEasypaisa },
    ...(record.autoFoodpanda !== 0 ? [{ label: 'Foodpanda', value: record.autoFoodpanda }] : []),
    ...(record.autoBank !== 0 ? [{ label: 'Bank', value: record.autoBank }] : []),
    { label: 'Expense', value: record.cashExpense },
    { label: 'On table', value: record.expectedCashInHand, color: record.expectedCashInHand < 0 ? theme.colors.danger : undefined },
    { label: 'Discount', value: record.discount },
  ];

  const smallButton = [styles.xsButton, { borderColor: theme.colors.border, backgroundColor: theme.isDark ? 'transparent' : theme.colors.surface }];

  return (
    <Pressable
      accessibilityRole={canOpenDetail ? 'button' : undefined}
      disabled={!canOpenDetail}
      onPress={canOpenDetail ? onOpenDetail : undefined}>
      <Card accessible accessibilityLabel={accessibilityLabel} style={styles.card}>
        <View style={styles.between}>
          <View style={styles.grow}>
            <Text style={[styles.h3, { color: theme.colors.text }]}>{dayLabel(record.businessDate)}</Text>
            <Text style={[styles.xs, { color: theme.colors.textFaint }]}>
              {notGenerated ? 'Not generated yet' : `${formatDisplayTime(record.generatedAt)} · Generated`}
            </Text>
          </View>
          {!notGenerated ? <StatusBadge label={STATUS_LABEL[record.status]} variant={STATUS_VARIANT[record.status]} /> : null}
        </View>

        {!notGenerated ? (
          <View style={[styles.grid, { backgroundColor: theme.isDark ? theme.colors.border : '#EEF0F8' }]}>
            {minis.map((m) => (
              <MiniStat key={m.label} label={m.label} value={bare(m.value)} valueColor={m.color} style={styles.mini} />
            ))}
          </View>
        ) : null}

        <View style={styles.between}>
          {notGenerated ? <View /> : <Pill label={diffPill.label} kind={diffPill.kind} />}
          <View style={styles.actions}>
            {notGenerated ? (
              <Pressable
                accessibilityRole="button"
                onPress={onGenerate}
                disabled={isGenerating}
                style={[styles.xsButton, styles.primary, { backgroundColor: theme.colors.primary, opacity: isGenerating ? 0.6 : 1 }]}>
                <AccentFill borderRadius={11} />
                <Text style={[styles.xsLabel, { color: theme.colors.primaryText }]}>{isGenerating ? 'Generating…' : 'Generate'}</Text>
              </Pressable>
            ) : null}
            {canFeed ? (
              <Pressable accessibilityRole="button" onPress={onOpenManualFeed} style={smallButton}>
                <Text style={[styles.xsLabel, { color: theme.colors.text }]}>Manual feed</Text>
              </Pressable>
            ) : null}
            {canOpenDetail ? (
              <Pressable accessibilityRole="button" onPress={onOpenDetail} style={smallButton}>
                <Text style={[styles.xsLabel, { color: theme.colors.text }]}>Open</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12, gap: 12, shadowOpacity: 0, elevation: 0 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  grow: { flex: 1, minWidth: 0, gap: 2 },
  h3: { fontSize: 17, lineHeight: 22, fontWeight: '600', letterSpacing: -0.2 },
  xs: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 10, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12 },
  mini: { flex: 0, width: '33.333%', paddingRight: 6 },
  actions: { flexDirection: 'row', gap: 6 },
  xsButton: { height: 32, paddingHorizontal: 12, borderRadius: 11, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  primary: { borderWidth: 0 },
  xsLabel: { fontSize: 12, fontWeight: '600' },
});
