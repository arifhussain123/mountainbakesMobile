import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { monthLong, shiftMonth } from '@/features/finance';
import { useAppTheme } from '@/shared/theme';
import { Card, Dropdown } from '@/shared/ui';
import { pad2 } from '../../utils/dashboardModel';

/** How far back the month picker reaches — the web's MONTHS_BACK. */
const MONTHS_BACK = 24;

export interface DashboardFilterChange {
  month?: string;
  branchId?: string;
  from?: number;
  to?: number;
}

/**
 * The web Admin Dashboard's filter row — Month, Year, Branch and a day range
 * — as one compact card. A month change resets the day range to the full month
 * (the caller does that, as the web's `setFilter` does).
 */
export function FilterCard({
  month,
  currentMonth,
  branchId,
  branches,
  dayFrom,
  dayTo,
  daysInMonth,
  onChange,
}: {
  month: string;
  currentMonth: string;
  branchId: string;
  branches: { id: string; name: string; isActive: boolean }[] | null;
  dayFrom: number;
  dayTo: number;
  daysInMonth: number;
  onChange: (next: DashboardFilterChange) => void;
}) {
  const theme = useAppTheme();
  const monthOptions = useMemo(() => Array.from({ length: MONTHS_BACK }, (_, i) => shiftMonth(currentMonth, -i)), [currentMonth]);
  const year = month.slice(0, 4);
  const years = [...new Set(monthOptions.map((m) => m.slice(0, 4)))];
  const days = Array.from({ length: daysInMonth }, (_, i) => ({ value: String(i + 1), label: pad2(i + 1) }));

  const label = (text: string) => <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginBottom: 4 }]}>{text}</Text>;

  return (
    <Card style={{ gap: theme.spacing.sm }}>
      <View style={styles.row}>
        <View style={styles.cell}>
          {label('Month')}
          <Dropdown
            value={month.slice(5)}
            options={monthOptions
              .filter((m) => m.startsWith(year))
              .map((m) => ({ value: m.slice(5), label: `${monthLong(m).split(' ')[0]}${m === currentMonth ? ' (current)' : ''}` }))}
            onChange={(mm) => onChange({ month: `${year}-${mm}` })}
          />
        </View>
        <View style={[styles.cell, { flex: 0.7 }]}>
          {label('Year')}
          <Dropdown
            value={year}
            options={years.map((y) => ({ value: y, label: y }))}
            onChange={(y) => {
              const inYear = monthOptions.filter((m) => m.startsWith(y));
              onChange({ month: inYear.find((m) => m.slice(5) === month.slice(5)) ?? inYear[0]! });
            }}
          />
        </View>
      </View>
      <View>
        {label('Branch')}
        <Dropdown
          value={branchId}
          loading={!branches}
          options={[
            { value: '', label: 'All Branches' },
            ...(branches ?? []).map((b) => ({ value: b.id, label: `${b.name}${b.isActive ? '' : ' (inactive)'}` })),
          ]}
          onChange={(id) => onChange({ branchId: id })}
        />
      </View>
      <View style={styles.row}>
        <View style={styles.cell}>
          {label('From day')}
          <Dropdown value={String(dayFrom)} options={days} onChange={(v) => onChange({ from: Number(v), to: Math.max(Number(v), dayTo) })} />
        </View>
        <View style={styles.cell}>
          {label('To day')}
          <Dropdown value={String(dayTo)} options={days} onChange={(v) => onChange({ to: Number(v), from: Math.min(dayFrom, Number(v)) })} />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  cell: { flex: 1, minWidth: 0 },
});
