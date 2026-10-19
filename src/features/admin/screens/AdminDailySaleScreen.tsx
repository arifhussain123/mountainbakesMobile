import { useMemo, useState } from 'react';
import { getBusinessDate, getBusinessMonthStart, useBranches, useDailySaleRecords, type DailySaleRecord, type DailySaleRecordStatus } from '@/api';
import { FilterChipRow, type FilterChipOption, type StatusVariant } from '@/shared/ui';
import { formatCount, formatCurrency, formatDisplayDate } from '@/shared/utils';
import { AdminListScreen, AdminRow, SummaryTiles } from '../components';

type Month = 'this' | 'last';
const MONTH_OPTIONS: FilterChipOption<Month>[] = [
  { value: 'this', label: 'This month' },
  { value: 'last', label: 'Last month' },
];
const ALL = 'all';

const STATUS_LABEL: Record<DailySaleRecordStatus, string> = {
  open: 'Open',
  pending_verification: 'Pending',
  verified: 'Verified',
  locked: 'Locked',
  amended: 'Amended',
};
const STATUS_VARIANT: Record<DailySaleRecordStatus, StatusVariant> = {
  open: 'warning',
  pending_verification: 'info',
  verified: 'success',
  locked: 'neutral',
  amended: 'violet',
};

function monthWindow(month: Month): { from: string; to: string } {
  const today = getBusinessDate();
  const thisStart = getBusinessMonthStart();
  if (month === 'this') return { from: thisStart, to: today };
  const [y, m] = thisStart.split('-').map(Number);
  const prevY = m === 1 ? y - 1 : y;
  const prevM = m === 1 ? 12 : m - 1;
  const lastDay = new Date(Date.UTC(prevY, prevM, 0)).getUTCDate();
  const mm = String(prevM).padStart(2, '0');
  return { from: `${prevY}-${mm}-01`, to: `${prevY}-${mm}-${String(lastDay).padStart(2, '0')}` };
}

/**
 * Daily Sale Records for every branch (or one), one card per branch per day,
 * newest first. Super admin reads them consolidated — the server returns
 * every branch when no branch is named. Read-only here: counting and
 * verifying stay with the branch screen and the web.
 */
export function AdminDailySaleScreen() {
  const [month, setMonth] = useState<Month>('this');
  const [branchId, setBranchId] = useState<string>(ALL);
  const branchesQ = useBranches();
  const range = monthWindow(month);
  const q = useDailySaleRecords({ ...range, ...(branchId === ALL ? {} : { branchId }) });

  const branchOptions = useMemo<FilterChipOption<string>[]>(
    () => [{ value: ALL, label: 'All branches' }, ...(branchesQ.data?.branches ?? []).map((b) => ({ value: b.id, label: b.name }))],
    [branchesQ.data],
  );
  const records = useMemo(
    () =>
      [...(q.data?.records ?? [])].sort((a, b) => b.businessDate.localeCompare(a.businessDate) || a.branchName.localeCompare(b.branchName)),
    [q.data],
  );
  const s = q.data?.summary;
  const companyShare = records.reduce((n, r) => n + (Number(r.companyShare) || 0), 0);

  return (
    <AdminListScreen<DailySaleRecord>
      title="Daily Sale Records"
      subtitle={`${formatDisplayDate(range.from)} – ${formatDisplayDate(range.to)} · read-only`}
      data={records}
      keyExtractor={(r) => `${r.branchId}:${r.businessDate}`}
      renderItem={({ item }) => {
        const counted = item.manualCash !== null || item.manualEasypaisa !== null || item.manualBank !== null;
        return (
          <AdminRow
            title={`${item.branchName} · ${formatDisplayDate(item.businessDate)}`}
            lines={[
              `${formatCount(item.orderCount)} orders · company share ${formatCurrency(item.companyShare)}`,
              `Cash ${formatCurrency(item.autoCash)} · Easypaisa ${formatCurrency(item.autoEasypaisa)} · Bank ${formatCurrency(item.autoBank)}`,
              counted ? `Difference ${formatCurrency(item.overallDifference)}` : 'Not counted yet',
            ]}
            value={formatCurrency(item.autoTotalSale)}
            badge={item.id === null ? { label: 'No record', variant: 'neutral' } : { label: STATUS_LABEL[item.status], variant: STATUS_VARIANT[item.status] }}
          />
        );
      }}
      isLoading={q.isLoading}
      error={q.error}
      refreshing={q.isRefetching}
      onRefresh={() => void q.refetch()}
      emptyTitle="No Sale Records"
      emptyMessage="Days with sales appear here."
      header={
        <>
          <FilterChipRow options={MONTH_OPTIONS} value={month} onChange={setMonth} />
          <FilterChipRow options={branchOptions} value={branchId} onChange={setBranchId} />
          {s ? (
            <SummaryTiles
              tiles={[
                { label: 'Total sale', value: formatCurrency(s.totalSale) },
                { label: 'Company share', value: formatCurrency(companyShare) },
                { label: 'Difference', value: formatCurrency(s.difference), tone: s.difference < 0 ? 'danger' : undefined },
                { label: 'Days not counted', value: formatCount(s.uncounted), tone: s.uncounted > 0 ? 'warning' : undefined },
              ]}
            />
          ) : null}
        </>
      }
    />
  );
}
