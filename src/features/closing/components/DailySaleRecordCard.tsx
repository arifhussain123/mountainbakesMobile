import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Card, StatusBadge, type StatusVariant } from '@/shared/ui';
import { formatCurrency, formatDisplayDate } from '@/shared/utils';
import type { DailySaleRecord } from '@/api';

export interface DailySaleRecordCardProps {
  record: DailySaleRecord;
  isGenerating: boolean;
  onGenerate: () => void;
  onOpenManualFeed: () => void;
  onVerify: () => void;
  isVerifying: boolean;
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

/** branchApp.md screen 21 — one business day's takings against what was counted. */
export function DailySaleRecordCard({ record, isGenerating, onGenerate, onOpenManualFeed, onVerify, isVerifying }: DailySaleRecordCardProps) {
  const theme = useAppTheme();
  const notGenerated = record.id === null;
  const hasCount = record.manualCash !== null || record.manualEasypaisa !== null || record.manualBank !== null;
  const diff = record.overallDifference;

  return (
    <Card style={{ marginBottom: 10 }}>
      <View style={styles.row}>
        <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>{formatDisplayDate(record.businessDate)}</Text>
        {!notGenerated ? <StatusBadge label={STATUS_LABEL[record.status]} variant={STATUS_VARIANT[record.status]} /> : null}
      </View>
      <View style={[styles.row, { marginTop: 10 }]}>
        <View>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>TOTAL SALE</Text>
          <Text style={[theme.typography.body, { color: theme.colors.text, marginTop: 2, fontWeight: '700' }]}>
            {formatCurrency(record.autoTotalSale)}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>COMPANY SHARE</Text>
          <Text style={[theme.typography.body, { color: theme.colors.danger, marginTop: 2, fontWeight: '700' }]}>
            {formatCurrency(record.companyShare)}
          </Text>
        </View>
      </View>
      <View style={[styles.grid, { marginTop: 10 }]}>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
          Cash <Text style={{ color: theme.colors.text, fontWeight: '700' }}>{formatCurrency(record.autoCash)}</Text>
        </Text>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
          Easypaisa <Text style={{ color: theme.colors.text, fontWeight: '700' }}>{formatCurrency(record.autoEasypaisa)}</Text>
        </Text>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
          Expense <Text style={{ color: theme.colors.text, fontWeight: '700' }}>{formatCurrency(record.expenseTotal)}</Text>
        </Text>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
          On Table <Text style={{ color: theme.colors.text, fontWeight: '700' }}>{formatCurrency(record.expectedCashInHand)}</Text>
        </Text>
      </View>
      <View style={[styles.footerRow, { marginTop: 10, borderTopColor: theme.colors.border }]}>
        {hasCount ? (
          <View style={[styles.diffPill, { backgroundColor: diff === 0 ? `${theme.colors.success}1A` : `${theme.colors.danger}1A` }]}>
            <Text style={[theme.typography.label, { color: diff === 0 ? theme.colors.success : theme.colors.danger, fontWeight: '700' }]}>
              {diff === 0 ? 'Matched' : diff > 0 ? `${formatCurrency(diff)} over` : `${formatCurrency(-diff)} short`}
            </Text>
          </View>
        ) : (
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Not counted yet</Text>
        )}
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {notGenerated ? (
            <Pressable
              accessibilityRole="button"
              onPress={onGenerate}
              disabled={isGenerating}
              style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}>
              <Text style={[theme.typography.label, { color: theme.colors.primaryText, fontWeight: '700' }]}>
                {isGenerating ? 'Generating…' : 'Generate'}
              </Text>
            </Pressable>
          ) : (
            <>
              {record.status === 'open' || record.status === 'pending_verification' ? (
                <Pressable accessibilityRole="button" onPress={onOpenManualFeed} style={[styles.actionButton, { backgroundColor: theme.colors.border }]}>
                  <Text style={[theme.typography.label, { color: theme.colors.text, fontWeight: '700' }]}>Manual Feed</Text>
                </Pressable>
              ) : null}
              {record.status === 'pending_verification' ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={onVerify}
                  disabled={isVerifying}
                  style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}>
                  <Text style={[theme.typography.label, { color: theme.colors.primaryText, fontWeight: '700' }]}>
                    {isVerifying ? 'Verifying…' : 'Verify'}
                  </Text>
                </Pressable>
              ) : null}
            </>
          )}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTopWidth: 1 },
  diffPill: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 9 },
  actionButton: { height: 30, paddingHorizontal: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
