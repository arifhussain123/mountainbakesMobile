import { StyleSheet, Text, View } from 'react-native';
import type { MonthlyCashTransferSummary } from '@/api';
import { useAppTheme, type PastelTone } from '@/shared/theme';
import { ErrorState, HeroSurface, LoadingSkeleton, type IconName } from '@/shared/ui';
import { mapErrorToMessage } from '@/shared/helpers';
import { formatMonthToDateLine, formatSummaryWindow } from '@/shared/utils';
import { HERO_TYPE, HeroMini, KpiTile, useHeroInk } from '@/features/sales/components';
import { buildCashTransferSummaryTiles, type CashSummaryTile, type CashSummaryTone } from '../cashTransferSummary';

export interface MonthlyCashTransferSummaryCardProps {
  summary: MonthlyCashTransferSummary | undefined;
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
}

/** "27,900" — the hero's four `mini` figures drop the "Rs." so they fit across a phone. */
const plain = (n: number) => (Math.round(n * 100) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 });

const KPI_ICON: Partial<Record<CashSummaryTile['key'], IconName>> = { pending: 'clock', approved: 'check', rejected: 'close' };

/**
 * The month-to-date Cash Transfer summary at the top of Cash Transfers
 * (redesign `15 Cash Transfers`), with the same eight server figures as the
 * web's Branch → Cash Transfer Details: Total Transferred on the violet hero
 * with its Cash / Easypaisa / Bank split and the separate Fuel figure, then
 * Finance's decision — Awaiting Finance and Approved as pastel kpi tiles, and
 * Rejected beside them once there is any. It always covers this branch's
 * business month to date and never follows the list's filters or search. A
 * failure here leaves the list working: it only replaces this block.
 */
export function MonthlyCashTransferSummaryCard({ summary, isLoading, error, onRetry }: MonthlyCashTransferSummaryCardProps) {
  const theme = useAppTheme();
  const { ink, muted } = useHeroInk();
  const toneColor: Record<CashSummaryTone, string> = {
    neutral: theme.colors.text,
    success: theme.colors.success,
    warning: theme.colors.warning,
    danger: theme.colors.danger,
  };

  if (error && !summary) {
    return <ErrorState message={mapErrorToMessage(error)} onRetry={onRetry} />;
  }

  const tiles = summary ? buildCashTransferSummaryTiles(summary) : [];
  const byKey = (key: CashSummaryTile['key']) => tiles.find((t) => t.key === key);
  const total = byKey('transferred');
  const t = summary?.totals;
  const decisions = (['pending', 'approved', 'rejected'] as const)
    .map(byKey)
    .filter((tile): tile is CashSummaryTile => !!tile && (tile.key !== 'rejected' || (t?.rejected.count ?? 0) > 0));

  return (
    <View style={styles.wrap}>
      <Text style={[theme.typography.label, { color: theme.colors.textFaint }]}>
        {summary ? `This month · ${formatSummaryWindow(summary.from, summary.to)}` : 'This month'}
      </Text>

      {isLoading || !summary || !t || !total ? (
        <LoadingSkeleton height={180} />
      ) : (
        <>
          <HeroSurface style={styles.hero} accessible accessibilityLabel={`${total.label}: ${total.value}, ${total.sub}`}>
            <Text style={[HERO_TYPE.eyebrow, { color: muted }]}>{total.label}</Text>
            <Text style={[HERO_TYPE.amount, { color: ink }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              {total.value}
            </Text>
            <Text style={[HERO_TYPE.sm, { color: muted }]}>{total.sub}</Text>
            <View style={styles.miniRow}>
              <HeroMini label="Cash" value={plain(t.cash.amount)} />
              <HeroMini label="Easypaisa" value={plain(t.easypaisa.amount)} />
              <HeroMini label="Bank" value={plain(t.bank.amount)} />
              <HeroMini label="Fuel" value={plain(t.fuel.amount)} />
            </View>
          </HeroSurface>

          <View style={styles.grid}>
            {decisions.map((tile, index) => (
              <KpiTile
                key={tile.key}
                tone={(index % 5) as PastelTone}
                label={tile.label}
                value={tile.value}
                sub={tile.sub}
                icon={KPI_ICON[tile.key]}
                valueColor={toneColor[tile.tone]}
                style={styles.cell}
              />
            ))}
          </View>
        </>
      )}

      {summary ? (
        <Text style={[theme.typography.label, { color: theme.colors.textFaint }]}>
          {formatMonthToDateLine(summary.from)} · Approved transfers are confirmed by Finance. Fuel is booked separately, not part of the total.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  hero: { gap: 8 },
  miniRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  cell: { flexBasis: '47%', flexGrow: 1 },
});
