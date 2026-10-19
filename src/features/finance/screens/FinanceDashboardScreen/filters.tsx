import { forwardRef, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { colors as fin } from '../../theme';
import { useAppTheme } from '@/shared/theme';
import { FormBottomSheet, Icon, PrimaryButton, SecondaryButton } from '@/shared/ui';
import {
  dayRangeLabel,
  daysInMonth,
  defaultFilter,
  monthLong,
  monthOptions,
  resolveFilter,
  shiftMonth,
  type DashboardFilter,
} from '../../utils/dashboardModel';
import { BAND } from './parts';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

type Branch = { id: string; name: string; isActive: boolean };

/**
 * The navy filter card from the design file: Month / Year / Days / Branch,
 * each a chip that opens the one filter sheet, with ‹ › to step the month and
 * CSV / Reset beside them.
 */
export function FilterCard({
  filter,
  currentMonth,
  branchName,
  onOpen,
  onStepMonth,
  onExport,
  onReset,
  exportDisabled,
}: {
  filter: DashboardFilter;
  currentMonth: string;
  branchName: string;
  onOpen: () => void;
  onStepMonth: (by: -1 | 1) => void;
  onExport: () => void;
  onReset: () => void;
  exportDisabled: boolean;
}) {
  const theme = useAppTheme();
  const r = resolveFilter(filter);
  const oldest = monthOptions(currentMonth).at(-1)!;
  const chips = [
    { k: 'MONTH', v: `${MONTH_NAMES[Number(filter.month.slice(5, 7)) - 1]}${filter.month === currentMonth ? ' (current)' : ''}` },
    { k: 'YEAR', v: filter.month.slice(0, 4) },
    { k: 'DAYS', v: dayRangeLabel(r) },
    { k: 'BRANCH', v: branchName },
  ];
  const arrow = (by: -1 | 1, disabled: boolean) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={by < 0 ? 'Previous month' : 'Next month'}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => onStepMonth(by)}
      hitSlop={8}
      style={[styles.arrow, { opacity: disabled ? 0.35 : 1 }]}>
      <Icon name={by < 0 ? 'chevron-left' : 'chevron-right'} size={18} color={BAND.ink} />
    </Pressable>
  );
  return (
    <View style={[styles.card, { backgroundColor: BAND.overall, borderRadius: theme.radii.lg, marginBottom: theme.spacing.md }]}>
      <View style={styles.monthRow}>
        {arrow(-1, filter.month <= oldest)}
        <Text accessibilityRole="header" numberOfLines={1} style={[styles.monthTitle, { color: BAND.ink }]}>
          {monthLong(filter.month)}
        </Text>
        {arrow(1, filter.month >= currentMonth)}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {chips.map((c) => (
          <Pressable
            key={c.k}
            accessibilityRole="button"
            accessibilityLabel={`${c.k.toLowerCase()}: ${c.v}. Opens the filters.`}
            onPress={onOpen}
            style={[styles.chip, { backgroundColor: 'rgba(255,255,255,.08)', borderColor: 'rgba(255,255,255,.14)' }]}>
            <Text style={[styles.chipKey, { color: '#A39A92' }]}>{c.k}</Text>
            <Text numberOfLines={1} style={[styles.chipValue, { color: BAND.ink }]}>
              {c.v} <Text style={{ color: '#857B73' }}>▾</Text>
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Export CSV"
          accessibilityState={{ disabled: exportDisabled }}
          disabled={exportDisabled}
          onPress={onExport}
          style={[styles.action, { backgroundColor: fin.accent, opacity: exportDisabled ? 0.45 : 1 }]}>
          <Text style={[styles.actionText, { color: fin.onAccent }]}>CSV</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Reset filters" onPress={onReset} style={[styles.action, { borderWidth: 1, borderColor: 'rgba(255,255,255,.2)' }]}>
          <Text style={[styles.actionText, { color: BAND.ink }]}>Reset</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Choice({ label, selected, onPress, muted }: { label: string; selected: boolean; onPress: () => void; muted?: boolean }) {
  const theme = useAppTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[
        styles.choice,
        { borderColor: selected ? fin.accent : theme.colors.cardBorder, backgroundColor: selected ? `${fin.accent}22` : theme.colors.cardFill, borderRadius: theme.radii.pill },
      ]}>
      <Text style={[styles.choiceText, { color: selected ? fin.accent : muted ? theme.colors.textSecondary : theme.colors.text }]}>{label}</Text>
    </Pressable>
  );
}

function DayStepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  const theme = useAppTheme();
  const btn = (delta: -1 | 1) => {
    const disabled = delta < 0 ? value <= min : value >= max;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${delta < 0 ? 'Decrease' : 'Increase'} ${label}`}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() => onChange(value + delta)}
        style={[styles.stepBtn, { borderColor: theme.colors.cardBorder, opacity: disabled ? 0.35 : 1 }]}>
        <Icon name={delta < 0 ? 'minus' : 'plus'} size={16} color={theme.colors.text} />
      </Pressable>
    );
  };
  return (
    <View style={{ flex: 1 }} accessible={false}>
      <Text style={[styles.sheetLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
      <View style={styles.stepRow}>
        {btn(-1)}
        <Text accessibilityLiveRegion="polite" style={[styles.stepValue, { color: theme.colors.text }]}>
          {String(value).padStart(2, '0')}
        </Text>
        {btn(1)}
      </View>
    </View>
  );
}

/**
 * All four filters in one sheet, edited as a draft: nothing reloads until
 * Apply. Changing the month resets the days to the whole month (as the web
 * does); a year switch keeps the month number when that month is offered.
 */
export const FilterSheet = forwardRef<
  BottomSheetModal,
  { value: DashboardFilter; currentMonth: string; branches: Branch[]; onApply: (f: DashboardFilter) => void; onClose: () => void }
>(function FilterSheet({ value, currentMonth, branches, onApply, onClose }, ref) {
  const theme = useAppTheme();
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const months = monthOptions(currentMonth);
  const years = [...new Set(months.map((m) => m.slice(0, 4)))];
  const year = draft.month.slice(0, 4);
  const inYear = months.filter((m) => m.startsWith(year)).sort();
  const nd = daysInMonth(draft.month);
  const r = resolveFilter(draft);
  const setMonth = (month: string) => setDraft((d) => ({ ...d, month, dayFrom: 1, dayTo: 31 }));

  return (
    <FormBottomSheet ref={ref} title="Filters" subtitle="Month, days and branch" onRequestClose={onClose} snapPoints={['85%']} onDismiss={() => setDraft(value)}>
      <Text style={[styles.sheetLabel, { color: theme.colors.textSecondary }]}>YEAR</Text>
      <View style={styles.wrap} accessibilityRole="radiogroup">
        {years.map((y) => (
          <Choice
            key={y}
            label={y}
            selected={y === year}
            onPress={() => {
              const same = `${y}-${draft.month.slice(5, 7)}`;
              setMonth(months.includes(same) ? same : months.find((m) => m.startsWith(y))!);
            }}
          />
        ))}
      </View>

      <Text style={[styles.sheetLabel, { color: theme.colors.textSecondary, marginTop: theme.spacing.lg }]}>MONTH</Text>
      <View style={styles.wrap} accessibilityRole="radiogroup">
        {inYear.map((m) => (
          <Choice key={m} label={`${MONTH_NAMES[Number(m.slice(5, 7)) - 1]!.slice(0, 3)}${m === currentMonth ? ' (current)' : ''}`} selected={m === draft.month} onPress={() => setMonth(m)} />
        ))}
      </View>

      <Text style={[styles.sheetLabel, { color: theme.colors.textSecondary, marginTop: theme.spacing.lg }]}>DAYS · {dayRangeLabel(r)}</Text>
      <View style={{ flexDirection: 'row', gap: theme.spacing.lg, marginTop: 6 }}>
        <DayStepper label="From day" value={r.from} min={1} max={nd} onChange={(n) => setDraft((d) => ({ ...d, dayFrom: n, dayTo: Math.max(n, Math.min(d.dayTo, nd)) }))} />
        <DayStepper label="To day" value={r.to} min={1} max={nd} onChange={(n) => setDraft((d) => ({ ...d, dayTo: n, dayFrom: Math.min(Math.min(d.dayFrom, nd), n) }))} />
      </View>
      {!r.fullMonth ? (
        <Pressable accessibilityRole="button" onPress={() => setDraft((d) => ({ ...d, dayFrom: 1, dayTo: 31 }))} style={{ marginTop: 8 }}>
          <Text style={{ color: fin.accent, fontWeight: '700', fontSize: 13 }}>Use the full month</Text>
        </Pressable>
      ) : null}

      <Text style={[styles.sheetLabel, { color: theme.colors.textSecondary, marginTop: theme.spacing.lg }]}>BRANCH</Text>
      <View style={styles.wrap} accessibilityRole="radiogroup">
        <Choice label="All Branches" selected={!draft.branchId} onPress={() => setDraft((d) => ({ ...d, branchId: null }))} />
        {branches.map((b) => (
          <Choice key={b.id} label={b.isActive ? b.name : `${b.name} (inactive)`} muted={!b.isActive} selected={draft.branchId === b.id} onPress={() => setDraft((d) => ({ ...d, branchId: b.id }))} />
        ))}
      </View>

      <View style={{ flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.xl }}>
        <View style={{ flex: 1 }}>
          <SecondaryButton label="Reset" onPress={() => setDraft(defaultFilter(currentMonth))} />
        </View>
        <View style={{ flex: 1 }}>
          <PrimaryButton label="Apply" onPress={() => onApply(draft)} />
        </View>
      </View>
    </FormBottomSheet>
  );
});

/** Clamp a month step to the picker's window. */
export function stepMonth(month: string, by: -1 | 1, currentMonth: string): string {
  const next = shiftMonth(month, by);
  const oldest = monthOptions(currentMonth).at(-1)!;
  return next > currentMonth ? currentMonth : next < oldest ? oldest : next;
}

const styles = StyleSheet.create({
  card: { padding: 14, gap: 12 },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  monthTitle: { fontSize: 17, fontWeight: '800', flex: 1, textAlign: 'center' },
  arrow: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,.08)' },
  chip: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 7, minWidth: 92 },
  chipKey: { fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  chipValue: { fontSize: 13, fontWeight: '700', marginTop: 2 },
  actions: { flexDirection: 'row', gap: 8 },
  action: { flex: 1, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  actionText: { fontSize: 13, fontWeight: '800' },
  sheetLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  choice: { minHeight: 36, paddingHorizontal: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  choiceText: { fontSize: 13, fontWeight: '700' },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  stepBtn: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  stepValue: { fontSize: 18, fontWeight: '800', minWidth: 28, textAlign: 'center', fontVariant: ['tabular-nums'] },
});
