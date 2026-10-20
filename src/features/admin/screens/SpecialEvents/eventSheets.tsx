import { useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import {
  EVENT_CATEGORY_LABELS,
  EVENT_PRIORITY_LABELS,
  EVENT_STAGE_LABELS,
  getBusinessDate,
  useAdminUpdateEventStage,
  useBranches,
  useCreateSpecialEvent,
  useSpecialEvent,
  useUpdateSpecialEvent,
  type AdminSpecialEvent,
  type EventCalendarSystem,
  type EventCategory,
  type EventPriority,
  type EventProductionStatusRow,
} from '@/api';
import { mapErrorToMessage } from '@/shared/helpers';
import { useAppTheme } from '@/shared/theme';
import { Checkbox, DateField, Dropdown, ErrorState, FormBottomSheet, LoadingSkeleton, PrimaryButton, SecondaryButton, TextField } from '@/shared/ui';
import { formatDisplayDate } from '@/shared/utils';
import {
  CALENDAR_SYSTEMS,
  CALENDAR_SYSTEM_LABEL,
  NTH_LABELS,
  STAGE_PRESETS,
  WEEKDAY_NAMES,
  buildEventInput,
  clampStagePercent,
  eventDatePreview,
  hijriSkipsYear,
  initialEventForm,
  stageDirty,
  toggleBranchId,
  type EventFormValues,
} from '../../utils/eventActions';
import { HIJRI_MONTHS, formatHijriFor } from './eventModel';

const CATEGORY_OPTIONS = (Object.entries(EVENT_CATEGORY_LABELS) as [EventCategory, string][]).map(([value, label]) => ({ value, label }));
const PRIORITY_OPTIONS = (Object.entries(EVENT_PRIORITY_LABELS) as [EventPriority, string][]).map(([value, label]) => ({ value, label }));
const CALENDAR_OPTIONS = CALENDAR_SYSTEMS.map((value) => ({ value, label: CALENDAR_SYSTEM_LABEL[value] }));
const HIJRI_MONTH_OPTIONS = HIJRI_MONTHS.map((name, i) => ({ value: String(i + 1), label: `${i + 1}. ${name}` }));
const NTH_OPTIONS = NTH_LABELS.map((label, i) => ({ value: String(i + 1), label }));
const WEEKDAY_OPTIONS = WEEKDAY_NAMES.map((label, i) => ({ value: String(i), label }));

function FieldLabel({ text }: { text: string }) {
  const theme = useAppTheme();
  return <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 14, marginBottom: 6 }]}>{text}</Text>;
}

function Hint({ text, tone }: { text: string; tone?: 'warning' }) {
  const theme = useAppTheme();
  return <Text style={[theme.typography.label, { color: tone === 'warning' ? theme.colors.warning : theme.colors.textSecondary, marginTop: 6 }]}>{text}</Text>;
}

function SwitchRow({ label, hint, value, onChange }: { label: string; hint: string; value: boolean; onChange: (v: boolean) => void }) {
  const theme = useAppTheme();
  return (
    <View style={styles.switchRow}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '700' }]}>{label}</Text>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 2 }]}>{hint}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} accessibilityLabel={label} trackColor={{ true: theme.colors.primary, false: theme.colors.cardBorder }} />
    </View>
  );
}

function Buttons({ busy, label, onCancel, onSave, disabled }: { busy: boolean; label: string; onCancel: () => void; onSave: () => void; disabled?: boolean }) {
  return (
    <View style={styles.buttons}>
      <View style={{ flex: 1 }}>
        <SecondaryButton label="Cancel" onPress={onCancel} disabled={busy} />
      </View>
      <View style={{ flex: 1.4 }}>
        <PrimaryButton label={label} onPress={onSave} loading={busy} disabled={disabled} />
      </View>
    </View>
  );
}

/**
 * Web `EventFormDialog`: create or edit one event. The "estimated date" box is
 * a live PREVIEW computed on the phone; the date actually stored is whatever
 * the server resolves on save.
 */
function EventForm({ event, onClose }: { event: AdminSpecialEvent | null; onClose: () => void }) {
  const theme = useAppTheme();
  const create = useCreateSpecialEvent();
  const update = useUpdateSpecialEvent();
  const branchesQ = useBranches();
  const [v, setV] = useState<EventFormValues>(() => initialEventForm(event, Number(getBusinessDate().slice(0, 4))));
  const set = <K extends keyof EventFormValues>(key: K, value: EventFormValues[K]) => setV((p) => ({ ...p, [key]: value }));

  const preview = useMemo(() => eventDatePreview(v), [v]);
  const confirmed = v.confirmedDate.trim();
  const effective = confirmed || preview.date;
  const effectiveHijri = effective ? formatHijriFor(effective) : null;
  const busy = create.isPending || update.isPending;
  const branches = branchesQ.data?.branches ?? [];

  const save = () => {
    const built = buildEventInput(v);
    if ('error' in built) {
      Alert.alert('Check the Event', built.error);
      return;
    }
    const onError = (e: unknown) => Alert.alert('Could Not Save the Event', mapErrorToMessage(e));
    if (event) {
      update.mutate(
        { id: event.id, input: built.input },
        {
          onSuccess: () => {
            Alert.alert('Event Updated', 'Event updated');
            onClose();
          },
          onError,
        },
      );
    } else {
      create.mutate(built.input, {
        onSuccess: () => {
          Alert.alert('Event Created', 'Event created — reminders scheduled');
          onClose();
        },
        onError,
      });
    }
  };

  const system = v.calendarSystem;
  const num = { keyboardType: 'number-pad' as const };

  return (
    <View>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Reminders are scheduled automatically once the date resolves.</Text>
      <TextField label="Event Name" value={v.name} onChangeText={(t) => set('name', t)} placeholder="Eid-ul-Fitr" />

      <FieldLabel text="CATEGORY" />
      <Dropdown options={CATEGORY_OPTIONS} value={v.category} onChange={(c) => set('category', c)} />
      <FieldLabel text="EXPECTED DEMAND LEVEL" />
      <Dropdown options={PRIORITY_OPTIONS} value={v.priority} onChange={(p) => set('priority', p)} />
      <FieldLabel text="CALENDAR" />
      <Dropdown<EventCalendarSystem> options={CALENDAR_OPTIONS} value={system} onChange={(s) => set('calendarSystem', s)} />
      <TextField label="Year" value={v.eventYear} onChangeText={(t) => set('eventYear', t)} {...num} />

      {system === 'hijri' || system === 'hijri_last_weekday' ? (
        <>
          <FieldLabel text="HIJRI MONTH" />
          <Dropdown
            options={HIJRI_MONTH_OPTIONS}
            value={v.hijriMonth ? String(v.hijriMonth) : null}
            onChange={(m) => set('hijriMonth', Number(m))}
            placeholder="Select month"
          />
        </>
      ) : null}
      {system === 'hijri' ? <TextField label="Hijri Day" value={v.hijriDay} onChangeText={(t) => set('hijriDay', t)} placeholder="1–30" {...num} /> : null}
      {system === 'gregorian' ? (
        <>
          <TextField label="Month" value={v.gregorianMonth} onChangeText={(t) => set('gregorianMonth', t)} placeholder="1–12" {...num} />
          <TextField label="Day" value={v.gregorianDay} onChangeText={(t) => set('gregorianDay', t)} placeholder="1–31" {...num} />
        </>
      ) : null}
      {system === 'gregorian_nth_weekday' ? (
        <>
          <TextField label="Month" value={v.gregorianMonth} onChangeText={(t) => set('gregorianMonth', t)} placeholder="1–12" {...num} />
          <FieldLabel text="OCCURRENCE" />
          <Dropdown
            options={NTH_OPTIONS}
            value={v.nthWeekday ? String(v.nthWeekday) : null}
            onChange={(n) => set('nthWeekday', Number(n))}
            placeholder="Which one"
          />
        </>
      ) : null}
      {system === 'gregorian_nth_weekday' || system === 'hijri_last_weekday' ? (
        <>
          <FieldLabel text={system === 'hijri_last_weekday' ? 'LAST WHICH WEEKDAY' : 'WEEKDAY'} />
          <Dropdown
            options={WEEKDAY_OPTIONS}
            value={v.weekday !== null ? String(v.weekday) : null}
            onChange={(w) => set('weekday', Number(w))}
            placeholder="Select weekday"
          />
          {system === 'hijri_last_weekday' ? (
            <Hint text="e.g. the last Friday of Ramadan (Jumuat-ul-Wida). The day number moves each year, because the month is 29 or 30 days depending on the year." />
          ) : null}
        </>
      ) : null}
      {system === 'gregorian_nth_weekday' ? (
        <>
          <TextField
            label="Shift by (days)"
            value={v.anchorOffsetDays}
            onChangeText={(t) => set('anchorOffsetDays', t)}
            keyboardType="numbers-and-punctuation"
          />
          <Hint text="Black Friday is the 4th Thursday of November shifted +1; Cyber Monday +4." />
        </>
      ) : null}

      <View style={[styles.preview, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface, borderRadius: theme.radii.md }]}>
        <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '700' }]}>
          {effective
            ? formatDisplayDate(effective)
            : preview.deviceCannotResolve
              ? 'Resolved from the Umm al-Qura calendar on save'
              : 'Date cannot be resolved yet'}
        </Text>
        {effective ? (
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 2 }]}>
            {effectiveHijri ? `${effectiveHijri} · ` : ''}
            {confirmed ? 'confirmed' : 'estimated'}
          </Text>
        ) : null}
        {system === 'hijri' && !confirmed ? (
          <Hint text="Calculated from the Umm al-Qura calendar. Pakistan announces on moon sighting and may differ by a day or two — set a confirmed date once it is announced." />
        ) : null}
        {hijriSkipsYear(v, preview) ? (
          <Hint
            tone="warning"
            text={`This Hijri date does not fall in ${v.eventYear} — a Hijri year is ~354 days, so some anniversaries skip a Gregorian year. Try an adjacent year.`}
          />
        ) : null}
      </View>

      <View style={{ marginTop: 16 }}>
        <DateField label="Confirmed Date (optional)" value={v.confirmedDate} onChange={(t) => set('confirmedDate', t)} onClear={() => set('confirmedDate', '')} placeholder="Not confirmed" />
      </View>
      <Hint text="Overrides the estimate everywhere." />
      <TextField label="Duration (days)" value={v.durationDays} onChangeText={(t) => set('durationDays', t)} {...num} />
      <TextField label="First Reminder (days before)" value={v.reminderLeadDays} onChangeText={(t) => set('reminderLeadDays', t)} {...num} />
      <Hint text="How much warning this event needs. 30 for Eid-ul-Adha, 7 for a minor occasion. Production is reminded a week earlier again." />
      <TextField label="Demand Due (days before)" value={v.demandLeadDays} onChangeText={(t) => set('demandLeadDays', t)} {...num} />
      <Hint text="Branches must submit by this many days before the event." />
      <TextField label="Event Type" value={v.eventType} onChangeText={(t) => set('eventType', t)} placeholder="Religious Festival" />
      <TextField label="Description" value={v.description} onChangeText={(t) => set('description', t)} placeholder="Optional planning notes…" multiline />

      <View style={[styles.box, { borderColor: theme.colors.border, borderRadius: theme.radii.md }]}>
        <SwitchRow
          label="Recurs every year"
          hint="Next year's occurrence is created automatically from this anchor."
          value={v.isRecurring}
          onChange={(r) => set('isRecurring', r)}
        />
      </View>
      <View style={[styles.box, { borderColor: theme.colors.border, borderRadius: theme.radii.md }]}>
        <SwitchRow
          label="Applies to all branches"
          hint="Turn off to target specific branches only."
          value={v.appliesToAllBranches}
          onChange={(a) => set('appliesToAllBranches', a)}
        />
        {!v.appliesToAllBranches ? (
          <View style={{ marginTop: 8 }}>
            {branchesQ.isLoading ? <LoadingSkeleton height={80} /> : null}
            {!branchesQ.isLoading && branches.length === 0 ? <Hint text="No branches available." /> : null}
            {branches.map((branch) => {
              const selected = v.branchIds.includes(branch.id);
              return (
                <Pressable
                  key={branch.id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  onPress={() => set('branchIds', toggleBranchId(v.branchIds, branch.id))}
                  style={styles.branchRow}>
                  <Checkbox checked={selected} onChange={() => set('branchIds', toggleBranchId(v.branchIds, branch.id))} accessibilityLabel={branch.name} />
                  <Text style={[theme.typography.bodySmall, { color: theme.colors.text, flex: 1 }]}>{branch.name}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>

      <Buttons busy={busy} label={event ? 'Update Event' : 'Create Event'} onCancel={onClose} onSave={save} />
    </View>
  );
}

/**
 * Edit always seeds from the event DETAIL: the list rows carry no `branchIds`,
 * so seeding from a list row would save an empty branch list over a targeted
 * event's real one.
 */
function EditEventForm({ eventId, onClose }: { eventId: string; onClose: () => void }) {
  const q = useSpecialEvent(eventId);
  if (q.isLoading) return <LoadingSkeleton height={240} />;
  if (q.error || !q.data) return <ErrorState message={q.error ? mapErrorToMessage(q.error) : 'Event not found.'} onRetry={() => void q.refetch()} />;
  return <EventForm event={q.data.event as AdminSpecialEvent} onClose={onClose} />;
}

/**
 * Web `ProductionReadinessPanel`'s editable StageCard: five presets, the
 * percentage (clamped 0–100) and an optional remark. Save is enabled once
 * something differs from the server's values.
 */
function StageForm({ eventId, stage, onClose }: { eventId: string; stage: EventProductionStatusRow; onClose: () => void }) {
  const theme = useAppTheme();
  const updateStage = useAdminUpdateEventStage(eventId);
  const [percentage, setPercentage] = useState(stage.completionPercentage);
  const [percentText, setPercentText] = useState(String(stage.completionPercentage));
  const [remarks, setRemarks] = useState(stage.remarks ?? '');
  const label = EVENT_STAGE_LABELS[stage.stage] ?? stage.stage;

  const pick = (n: number) => {
    setPercentage(n);
    setPercentText(String(n));
  };

  const save = () => {
    updateStage.mutate(
      { stage: stage.stage, input: { completionPercentage: percentage, remarks } },
      {
        onSuccess: () => {
          Alert.alert('Stage Updated', `${label} updated`);
          onClose();
        },
        onError: (e) => Alert.alert('Could Not Update the Stage', mapErrorToMessage(e)),
      },
    );
  };

  return (
    <View>
      <View style={styles.presets}>
        {STAGE_PRESETS.map((preset) => {
          const on = percentage === preset;
          return (
            <Pressable
              key={preset}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => pick(preset)}
              style={[
                styles.preset,
                { borderRadius: theme.radii.md, borderColor: on ? theme.colors.primary : theme.colors.border, backgroundColor: on ? theme.colors.primary : 'transparent' },
              ]}>
              <Text style={[theme.typography.bodySmall, { color: on ? theme.colors.primaryText : theme.colors.text, fontWeight: '700' }]}>{preset}%</Text>
            </Pressable>
          );
        })}
      </View>
      <TextField
        label="Completion %"
        value={percentText}
        onChangeText={(t) => {
          setPercentText(t);
          setPercentage(clampStagePercent(t));
        }}
        onBlur={() => setPercentText(String(percentage))}
        keyboardType="number-pad"
      />
      <TextField label="Remarks" value={remarks} onChangeText={setRemarks} placeholder="Optional note…" />
      <Buttons busy={updateStage.isPending} label="Save" onCancel={onClose} onSave={save} disabled={!stageDirty(stage, percentage, remarks)} />
    </View>
  );
}

export type EventSheet =
  | { kind: 'new' }
  | { kind: 'edit'; eventId: string }
  | { kind: 'stage'; eventId: string; stage: EventProductionStatusRow };

function titleOf(sheet: EventSheet | null): string {
  if (!sheet) return '';
  if (sheet.kind === 'new') return 'New Special Event';
  if (sheet.kind === 'edit') return 'Edit Event';
  return EVENT_STAGE_LABELS[sheet.stage.stage] ?? 'Update Stage';
}

/**
 * One bottom sheet for every Special Events admin form. `open(sheet)` presents
 * it; the form is mounted only while it is open, so each opening starts clean.
 */
export function useEventSheet() {
  const ref = useRef<BottomSheetModal>(null);
  const [sheet, setSheet] = useState<EventSheet | null>(null);
  const close = () => ref.current?.dismiss();

  const open = (next: EventSheet) => {
    setSheet(next);
    ref.current?.present();
  };

  const element = (
    <FormBottomSheet
      ref={ref}
      title={titleOf(sheet)}
      subtitle={sheet?.kind === 'stage' ? 'Production readiness' : undefined}
      onRequestClose={close}
      onDismiss={() => setSheet(null)}>
      {sheet?.kind === 'new' ? <EventForm event={null} onClose={close} /> : null}
      {sheet?.kind === 'edit' ? <EditEventForm eventId={sheet.eventId} onClose={close} /> : null}
      {sheet?.kind === 'stage' ? <StageForm eventId={sheet.eventId} stage={sheet.stage} onClose={close} /> : null}
    </FormBottomSheet>
  );

  return { open, element };
}

const styles = StyleSheet.create({
  buttons: { flexDirection: 'row', gap: 10, marginTop: 18 },
  preview: { borderWidth: 1, padding: 12, marginTop: 14 },
  box: { borderWidth: 1, padding: 12, marginTop: 12 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  branchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  presets: { flexDirection: 'row', gap: 6 },
  preset: { flex: 1, minHeight: 44, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
