import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FINANCE_ACCOUNT_LABELS, type FinanceAccount, type LedgerEntryStatus, type LedgerHeadType } from '@/api';
import { useAppTheme } from '@/shared/theme';
import { Dropdown, FilterChipRow, Icon, SearchBar, TextField, type DropdownOption, type FilterChipOption } from '@/shared/ui';
import { formatDisplayDate, type DateRange } from '@/shared/utils';

export const ALL = 'all';

export interface LedgerFilterState {
  range: DateRange;
  branchId: string;
  ledgerHeadId: string;
  type: LedgerHeadType | typeof ALL;
  account: FinanceAccount | typeof ALL;
  status: LedgerEntryStatus | typeof ALL;
  minAmount: string;
  maxAmount: string;
  search: string;
}

export function defaultLedgerFilters(today: string): LedgerFilterState {
  return {
    range: { from: today, to: today },
    branchId: ALL,
    ledgerHeadId: ALL,
    type: ALL,
    account: ALL,
    status: ALL,
    minAmount: '',
    maxAmount: '',
    search: '',
  };
}

const TYPE_OPTIONS: FilterChipOption<LedgerFilterState['type']>[] = [
  { value: ALL, label: 'All types' },
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expense' },
];
const ACCOUNT_OPTIONS: FilterChipOption<LedgerFilterState['account']>[] = [
  { value: ALL, label: 'All accounts' },
  { value: 'cash', label: FINANCE_ACCOUNT_LABELS.cash },
  { value: 'bank', label: FINANCE_ACCOUNT_LABELS.bank },
];
const STATUS_OPTIONS: FilterChipOption<LedgerFilterState['status']>[] = [
  { value: ALL, label: 'All statuses' },
  { value: 'posted', label: 'Posted' },
  { value: 'locked', label: 'Locked' },
  { value: 'reversed', label: 'Reversed' },
];

/** How many of the "more" filters (not date / branch / search) are set. */
function moreCount(f: LedgerFilterState): number {
  return [f.ledgerHeadId !== ALL, f.type !== ALL, f.account !== ALL, f.status !== ALL, f.minAmount.trim() !== '' || f.maxAmount.trim() !== ''].filter(
    Boolean,
  ).length;
}

export interface LedgerFiltersProps {
  value: LedgerFilterState;
  onChange: (next: LedgerFilterState) => void;
  onOpenDates: () => void;
  onClearAll: () => void;
  branchOptions: DropdownOption<string>[];
  headOptions: DropdownOption<string>[];
  headsLoading: boolean;
  /** True when anything differs from the defaults. */
  dirty: boolean;
}

/**
 * The web FilterBar for the ledger: Date range and Branch on the bar, the rest
 * (Ledger Head, Type, Account, Status, Amount range) behind "More filters",
 * plus the voucher search.
 */
export function LedgerFilters({ value, onChange, onOpenDates, onClearAll, branchOptions, headOptions, headsLoading, dirty }: LedgerFiltersProps) {
  const theme = useAppTheme();
  const [open, setOpen] = useState(false);
  const set = <K extends keyof LedgerFilterState>(key: K, v: LedgerFilterState[K]) => onChange({ ...value, [key]: v });
  const count = moreCount(value);
  const { from, to } = value.range;
  const label = (k: string) => <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginBottom: 4 }]}>{k}</Text>;

  return (
    <View style={{ gap: 10 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Choose date range"
        onPress={onOpenDates}
        style={[styles.field, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface, borderRadius: theme.radii.md }]}>
        <Icon name="calendar" size={16} color={theme.colors.textSecondary} />
        <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>Date</Text>
        <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '600', flex: 1 }]} numberOfLines={1}>
          {from === to ? formatDisplayDate(from) : `${formatDisplayDate(from)} – ${formatDisplayDate(to)}`}
        </Text>
        <Icon name="chevron-down" size={16} color={theme.colors.textSecondary} />
      </Pressable>

      <Dropdown options={branchOptions} value={value.branchId} onChange={(v) => set('branchId', v)} placeholder="Branch" />

      <SearchBar value={value.search} onChangeText={(t) => set('search', t)} placeholder="Voucher no, description, head or branch…" />

      <View style={styles.bar}>
        <Pressable accessibilityRole="button" onPress={() => setOpen((o) => !o)} hitSlop={8} style={styles.more}>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.primary, fontWeight: '600' }]}>
            {open ? 'Hide filters' : 'More filters'}
            {count > 0 ? ` (${count})` : ''}
          </Text>
          <Icon name="chevron-down" size={14} color={theme.colors.primary} />
        </Pressable>
        {dirty ? (
          <Pressable accessibilityRole="button" onPress={onClearAll} hitSlop={8}>
            <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, fontWeight: '600' }]}>Clear all</Text>
          </Pressable>
        ) : null}
      </View>

      {open ? (
        <View style={{ gap: 10 }}>
          <View>
            {label('Ledger Head')}
            <Dropdown options={headOptions} value={value.ledgerHeadId} onChange={(v) => set('ledgerHeadId', v)} loading={headsLoading} placeholder="Ledger Head" />
          </View>
          <View>
            {label('Type')}
            <FilterChipRow options={TYPE_OPTIONS} value={value.type} onChange={(v) => set('type', v)} />
          </View>
          <View>
            {label('Account')}
            <FilterChipRow options={ACCOUNT_OPTIONS} value={value.account} onChange={(v) => set('account', v)} />
          </View>
          <View>
            {label('Status')}
            <FilterChipRow options={STATUS_OPTIONS} value={value.status} onChange={(v) => set('status', v)} />
          </View>
          <View style={styles.amounts}>
            <View style={{ flex: 1 }}>
              <TextField label="Min amount" value={value.minAmount} onChangeText={(t) => set('minAmount', t)} keyboardType="decimal-pad" placeholder="0" />
            </View>
            <View style={{ flex: 1 }}>
              <TextField label="Max amount" value={value.maxAmount} onChangeText={(t) => set('maxAmount', t)} keyboardType="decimal-pad" placeholder="Any" />
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { height: 46, borderWidth: 1, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  more: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  amounts: { flexDirection: 'row', gap: 10 },
});
