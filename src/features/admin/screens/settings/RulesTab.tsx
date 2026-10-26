import { useState, type ReactNode } from 'react';
import { Alert, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSaveRestrictionGroup, type RestrictionGroup, type RestrictionRules, type RestrictionRulesState, type SaveRestrictionGroupInput } from '@/api';
import { mapErrorToMessage } from '@/shared/helpers';
import { useAppTheme } from '@/shared/theme';
import { Card } from '@/shared/ui';
import { ActionChip } from '../../components';
import { CodeTag, MONO, Pill, formatDateTime } from '../../components/AdminDetail';
import {
  canSaveGroup,
  isGroupDirty,
  cashBackdateError,
  lowSalesError,
  patchRule,
  pendingLimitError,
  ruleN as n,
  ruleNumberFrom,
  ruleNumberText,
} from '../../utils/adminSettingsActions';
import { addDaysToDateStr, ladderRange, restrictionDmy, time12 } from './restrictionFormat';

const OFF = 'Disabled — no restriction applied';

type Tone = 'ok' | 'warn' | 'block';

/**
 * Restriction Rules → Rules — the web `RulesTab`: the six groups with the
 * web's names, codes, descriptions, ladders and "Current configuration"
 * lines, edited in a draft. Each group is saved on its own (`PUT
 * /api/restrictions/rules/:group`) — a group the admin did not touch is never
 * sent — and its Save is lit only when the group changed and passes the
 * API's own schema, so a save the screen allows is not refused.
 */
export function RulesTab({ state }: { state: RestrictionRulesState }) {
  const theme = useAppTheme();
  const save = useSaveRestrictionGroup();
  const [draft, setDraft] = useState<RestrictionRules>(state.rules);
  const [saving, setSaving] = useState<RestrictionGroup | null>(null);

  function patch<G extends RestrictionGroup, R extends keyof RestrictionRules[G]>(group: G, rule: R, change: Partial<RestrictionRules[G][R]>) {
    setDraft((d) => patchRule(d, group, rule, change));
  }

  const dirty = (g: RestrictionGroup) => isGroupDirty(draft, state.rules, g);
  const status = (g: RestrictionGroup) => {
    if (dirty(g)) return 'Unsaved changes';
    const at = state.saved[g]?.updatedAt;
    return at ? `Saved ${formatDateTime(at)}` : 'Using defaults';
  };

  const saveGroup = (g: RestrictionGroup) => {
    if (!canSaveGroup(draft, state.rules, g, saving)) return;
    setSaving(g);
    save.mutate({ group: g, config: draft[g] } as SaveRestrictionGroupInput, {
      // Take the server's copy of THIS group; other groups keep their drafts.
      onSuccess: (next) => {
        setDraft((d) => ({ ...d, [g]: next.rules?.[g] ?? d[g] }));
        Alert.alert('Saved', 'Rules saved');
      },
      onError: (e) => Alert.alert('Could Not Save the Rules', mapErrorToMessage(e)),
      onSettled: () => setSaving(null),
    });
  };

  const saveButton = (g: RestrictionGroup, label: string) => (
    <ActionChip icon="check" label={saving === g ? 'Saving…' : label} primary onPress={() => saveGroup(g)} loading={saving === g} disabled={!canSaveGroup(draft, state.rules, g, saving)} />
  );

  const { pendingLimit: dp, backdated: bd, lowSales: cs } = draft.demand;
  const hs = draft.sales.hourly;
  const ps = draft.production.stockShortage;
  const cd = draft.cash.dailyLimit;
  const cb = draft.cash.backdate;
  const lg = draft.ledger.backdate;
  const co = draft.company.shareIncome;
  const dpErr = pendingLimitError(dp);
  const csErr = lowSalesError(cs);
  const cbErr = cashBackdateError(cb);
  const closes = time12(state.closingTime);
  const today = restrictionDmy(state.businessDate);
  const lgFrom = restrictionDmy(addDaysToDateStr(state.businessDate, -n(lg.allowedDays)));
  const cbFrom = restrictionDmy(addDaysToDateStr(state.businessDate, -n(cb.allowedDays)));

  return (
    <View style={{ gap: 14 }}>
      <Group title="Demand Restrictions" shownIn="New Demand popup" status={status('demand')} dirty={dirty('demand')} footer={saveButton('demand', 'Save demand rules')}>
        <Rule
          name="Pending verification limit"
          code="DEMAND_PENDING_LIMIT"
          description="Counts a branch's demands in the Awaiting Verification status: sent by Production, not yet verified as received by the branch. Their demand numbers are listed in the popup when blocked."
          enabled={dp.enabled}
          onEnabled={(v) => patch('demand', 'pendingLimit', { enabled: v })}
          error={dpErr}
          summary={dp.enabled ? `Warn at ${n(dp.warnAt)} awaiting verification · block new demands at ${n(dp.blockAt)}+` : OFF}>
          <NumberField label="Warning threshold" unit="awaiting" value={dp.warnAt} onChange={(v) => patch('demand', 'pendingLimit', { warnAt: v })} />
          <NumberField label="Blocking threshold" unit="awaiting" value={dp.blockAt} onChange={(v) => patch('demand', 'pendingLimit', { blockAt: v })} />
          <Ladder
            steps={[
              { range: ladderRange(0, n(dp.warnAt) - 1), text: 'Allowed', tone: 'ok' },
              { range: ladderRange(n(dp.warnAt), n(dp.blockAt) - 1), text: 'Warning', tone: 'warn' },
              { range: `${n(dp.blockAt)}+`, text: 'Blocked', tone: 'block' },
            ]}
          />
        </Rule>
        <Rule
          name="Backdated demand"
          code="BACKDATED_DEMAND"
          description="A demand dated before the current business date is held until Admin approves it. Approval is one-time and tied to that demand."
          enabled={bd.enabled}
          onEnabled={(v) => patch('demand', 'backdated', { enabled: v })}
          summary={bd.enabled ? (bd.requireApproval ? 'Backdated demands held for Admin approval' : 'Backdated demands blocked') : OFF}>
          <Option label="Requires Admin approval" value={bd.requireApproval} onChange={(v) => patch('demand', 'backdated', { requireApproval: v })} />
        </Rule>
        <Rule
          name="Low sales after closing"
          code="LOW_SALES_AFTER_CLOSING"
          description="After the branch closing time, a new demand is blocked if the sold share of applicable opening/available stock is below the minimum. Uses the existing stock calculation."
          enabled={cs.enabled}
          onEnabled={(v) => patch('demand', 'lowSales', { enabled: v })}
          error={csErr}
          summary={cs.enabled ? `After ${closes}, block new demand if less than ${n(cs.minSoldPercent)}% of stock sold` : OFF}>
          <Field label="Closing time" value={`${closes} from Business Hours`} />
          <NumberField label="Minimum sold percentage" unit="%" value={cs.minSoldPercent} onChange={(v) => patch('demand', 'lowSales', { minSoldPercent: v })} />
        </Rule>
      </Group>

      <Group title="Sales Restrictions" shownIn="New Sale popup" status={status('sales')} dirty={dirty('sales')} footer={saveButton('sales', 'Save sales rules')}>
        <Rule
          name="Hourly sales activity"
          code="HOURLY_SALES_LIMIT"
          description={`Counts the completed sales a branch has recorded in the current business hour, determined by the server in ${state.timezone} time. Device clocks are ignored. While the count is below the required number, the popup shows a warning. The counter resets each hour.`}
          enabled={hs.enabled}
          onEnabled={(v) => patch('sales', 'hourly', { enabled: v })}
          summary={hs.enabled ? `Warn while a branch has fewer than ${n(hs.threshold)} sales in the current hour · sales are never blocked` : OFF}>
          <NumberField label="Required sales" unit="sales / hour" value={hs.threshold} onChange={(v) => patch('sales', 'hourly', { threshold: v })} />
          <Ladder
            steps={[
              { range: ladderRange(0, n(hs.threshold) - 1), text: 'Warning', tone: 'warn' },
              { range: `${n(hs.threshold)}+`, text: 'Normal', tone: 'ok' },
            ]}
          />
        </Rule>
      </Group>

      <Group
        title="Production Restrictions"
        shownIn="Production Demand popup"
        status={status('production')}
        dirty={dirty('production')}
        footer={saveButton('production', 'Save production rules')}>
        <Rule
          name="Production stock less than demand"
          code="PRODUCTION_STOCK_SHORTAGE"
          description="On Submit for Verification, every product on the demand is compared with the available production stock. If any product is short, the demand is not submitted and the popup lists each short product with its Less Qty (demand − available stock). Adding stock clears the shortage; it never approves the demand. Uses the existing stock calculation."
          enabled={ps.enabled}
          onEnabled={(v) => patch('production', 'stockShortage', { enabled: v })}
          summary={
            ps.enabled
              ? `Block Submit for Verification while any product is short · ${ps.allowAdminOverride ? 'Admin can override' : 'no override, stock must be added'}`
              : OFF
          }>
          <Option label="Admin may approve a short demand" value={ps.allowAdminOverride} onChange={(v) => patch('production', 'stockShortage', { allowAdminOverride: v })} />
          <Ladder
            steps={[
              { range: 'Stock ≥ Demand', text: 'Allowed', tone: 'ok' },
              { range: 'Stock < Demand', text: 'Blocked', tone: 'block' },
            ]}
          />
        </Rule>
      </Group>

      <Group title="Cash Deposit Restrictions" shownIn="Cash Deposit popup" status={status('cash')} dirty={dirty('cash')} footer={saveButton('cash', 'Save')}>
        <Rule
          name="Daily forward limit"
          code="CASH_DEPOSIT_LIMIT"
          description="Counts cash-deposit transactions forwarded per branch per business date. Each uses the existing server-generated CT number."
          enabled={cd.enabled}
          onEnabled={(v) => patch('cash', 'dailyLimit', { enabled: v })}
          summary={cd.enabled ? `${n(cd.limit)} deposits per business day${cd.allowExceptions ? ' · Admin exceptions allowed' : ' · no exceptions'}` : OFF}>
          <NumberField label="Maximum per business day" unit="transactions" value={cd.limit} onChange={(v) => patch('cash', 'dailyLimit', { limit: v })} />
          <Option label="Allow one-time Admin exceptions" value={cd.allowExceptions} onChange={(v) => patch('cash', 'dailyLimit', { allowExceptions: v })} />
        </Rule>
        <Rule
          name="Back-date entries"
          code="CASH_DEPOSIT_BACKDATE"
          description="How many days before the business date a deposit may be dated. 0 allows today only. Older deposits are refused."
          enabled={cb.enabled}
          onEnabled={(v) => patch('cash', 'backdate', { enabled: v })}
          error={cbErr}
          summary={
            cb.enabled
              ? n(cb.allowedDays) === 0
                ? 'Today only'
                : `Up to ${n(cb.allowedDays)} ${n(cb.allowedDays) === 1 ? 'day' : 'days'} back`
              : 'Disabled — the 7-day sync window applies'
          }>
          <NumberField label="Back-date entries" unit="days" value={cb.allowedDays} onChange={(v) => patch('cash', 'backdate', { allowedDays: v })} />
          <View style={[styles.infoBox, { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.border }]}>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>With business date {today}</Text>
            <Text style={[theme.typography.label, { color: theme.colors.text }]}>
              <Text style={{ fontWeight: '700' }}>Allowed: </Text>
              <Text style={MONO}>
                {cbFrom} → {today}
              </Text>
            </Text>
          </View>
        </Rule>
      </Group>

      <Group title="Ledger Restrictions" shownIn="Ledger Entry popup" status={status('ledger')} dirty={dirty('ledger')} footer={saveButton('ledger', 'Save')}>
        <Rule
          name="Back-entry period"
          code="LEDGER_BACKDATE"
          description="Entries within the period are saved directly. Older entries are held until Admin approves; the ledger entry is not created before then."
          enabled={lg.enabled}
          onEnabled={(v) => patch('ledger', 'backdate', { enabled: v })}
          summary={lg.enabled ? `${n(lg.allowedDays)} days direct · older requires Admin approval` : OFF}>
          <NumberField label="Allowed back entry" unit="days" value={lg.allowedDays} onChange={(v) => patch('ledger', 'backdate', { allowedDays: v })} />
          <View style={[styles.infoBox, { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.border }]}>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>With business date {today}</Text>
            <Text style={[theme.typography.label, { color: theme.colors.text }]}>
              <Text style={{ fontWeight: '700' }}>Direct: </Text>
              <Text style={MONO}>
                {lgFrom} → {today}
              </Text>
            </Text>
            <Text style={[theme.typography.label, { color: theme.colors.text }]}>
              <Text style={{ fontWeight: '700' }}>Needs approval: </Text>
              <Text style={MONO}>before {lgFrom}</Text>
            </Text>
          </View>
        </Rule>
      </Group>

      <Group title="Company Share Restrictions" shownIn="Income popup" status={status('company')} dirty={dirty('company')} footer={saveButton('company', 'Save')}>
        <Rule
          name="Company Share as income"
          code="COMPANY_SHARE_INCOME"
          description="Company Share is received through Branch Cash Deposit. Selecting it as an Income category is held for Admin approval."
          enabled={co.enabled}
          onEnabled={(v) => patch('company', 'shareIncome', { enabled: v })}
          summary={co.enabled ? (co.allowApproval ? 'Direct entry blocked · Admin approval required' : 'Direct entry always blocked') : OFF}>
          <View style={[styles.fixedRow, { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.border }]}>
            <Text style={[theme.typography.label, { color: theme.colors.text, fontWeight: '700' }]}>Direct income entry</Text>
            <Pill label="Blocked" tone="danger" />
          </View>
          <Option label="Allow via Admin approval" value={co.allowApproval} onChange={(v) => patch('company', 'shareIncome', { allowApproval: v })} />
        </Rule>
      </Group>

      <Card style={{ gap: 10 }}>
        <Fact title="Server enforced" text="Every rule is re-evaluated by the API. Client-sent branch, user, date or approval values are ignored." />
        <Fact title="Offline" text={'Restricted actions show “Verification Required” in the popup. Cached results are never authoritative.'} />
        <Fact title="Admin only" text="Branch users cannot view or change these settings. All changes are written to the audit log." />
      </Card>
    </View>
  );
}

function Group({ title, shownIn, status, dirty, footer, children }: { title: string; shownIn: string; status: string; dirty: boolean; footer: ReactNode; children: ReactNode }) {
  const theme = useAppTheme();
  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <View style={{ padding: 14, gap: 2 }}>
        <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]} accessibilityRole="header">
          {title}
        </Text>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Shown in: {shownIn}</Text>
        <Text style={[theme.typography.label, { color: dirty ? theme.colors.warning : theme.colors.textFaint, fontWeight: dirty ? '600' : undefined }]}>{status}</Text>
      </View>
      {children}
      <View style={[styles.footer, { borderTopColor: theme.colors.border, backgroundColor: theme.colors.cardFill }]}>{footer}</View>
    </Card>
  );
}

function Rule({
  name,
  code,
  description,
  enabled,
  onEnabled,
  error,
  summary,
  children,
}: {
  name: string;
  code: string;
  description: string;
  enabled: boolean;
  onEnabled: (v: boolean) => void;
  error?: string | null;
  summary: string;
  children: ReactNode;
}) {
  const theme = useAppTheme();
  return (
    <View style={[styles.rule, { borderTopColor: theme.colors.border }]}>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '700' }]}>{name}</Text>
          <CodeTag code={code} />
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <EditSwitch value={enabled} onChange={onEnabled} label={`${name} enabled`} />
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{enabled ? 'Enabled' : 'Disabled'}</Text>
        </View>
      </View>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>{description}</Text>
      <View style={{ gap: 8, opacity: enabled ? 1 : 0.45 }}>{children}</View>
      {error ? (
        <Text accessibilityRole="alert" style={[theme.typography.label, { color: theme.colors.danger, fontWeight: '600' }]}>
          {error}
        </Text>
      ) : null}
      <Text style={[theme.typography.label, { color: theme.colors.text }]}>
        <Text style={{ color: theme.colors.textSecondary }}>Current configuration: </Text>
        {summary}
      </Text>
    </View>
  );
}

function EditSwitch({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  const theme = useAppTheme();
  return (
    <Switch
      value={value}
      onValueChange={onChange}
      accessibilityLabel={label}
      trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
      thumbColor={theme.colors.surface}
    />
  );
}

/** A read-only fact inside a rule (the closing time comes from Business Hours). */
function Field({ label, value }: { label: string; value: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.field}>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, flex: 1 }]}>{label}</Text>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '700' }]}>{value}</Text>
    </View>
  );
}

/** The web `NumberField`: a whole number (blank while emptied) and its unit. */
function NumberField({ label, unit, value, onChange }: { label: string; unit: string; value: number; onChange: (v: number) => void }) {
  const theme = useAppTheme();
  return (
    <View style={styles.field}>
      <Text style={[theme.typography.label, { color: theme.colors.text, fontWeight: '600', flex: 1 }]}>{label}</Text>
      <TextInput
        value={ruleNumberText(value)}
        onChangeText={(t) => onChange(ruleNumberFrom(t))}
        keyboardType="number-pad"
        accessibilityLabel={label}
        style={[styles.number, { borderColor: theme.colors.border, color: theme.colors.text, borderRadius: theme.radii.md }]}
      />
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, minWidth: 40 }]}>{unit}</Text>
    </View>
  );
}

function Option({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  const theme = useAppTheme();
  return (
    <View style={styles.field}>
      <EditSwitch value={value} onChange={onChange} label={label} />
      <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '600', flex: 1 }]}>{label}</Text>
    </View>
  );
}

function Ladder({ steps }: { steps: { range: string; text: string; tone: Tone }[] }) {
  const theme = useAppTheme();
  const color = { ok: theme.colors.success, warn: theme.colors.warning, block: theme.colors.danger };
  return (
    <View style={[styles.ladder, { borderColor: theme.colors.border }]}>
      {steps.map((s) => (
        <View key={`${s.range}-${s.text}`} style={[styles.step, { backgroundColor: `${color[s.tone]}1A` }]}>
          <Text style={[{ fontSize: 11, color: color[s.tone] }, MONO]}>{s.range}</Text>
          <Text style={{ fontSize: 11.5, fontWeight: '700', color: color[s.tone] }}>{s.text}</Text>
        </View>
      ))}
    </View>
  );
}

function Fact({ title, text }: { title: string; text: string }) {
  const theme = useAppTheme();
  return (
    <View style={{ gap: 2 }}>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '700' }]}>{title}</Text>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  rule: { borderTopWidth: StyleSheet.hairlineWidth, padding: 14, gap: 8 },
  field: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  number: { borderWidth: 1, width: 72, height: 36, paddingHorizontal: 10, paddingVertical: 0, textAlign: 'right' },
  ladder: { flexDirection: 'row', borderWidth: 1, borderRadius: 8, overflow: 'hidden', alignSelf: 'flex-start' },
  step: { paddingHorizontal: 10, paddingVertical: 6, minWidth: 72, gap: 1 },
  infoBox: { borderWidth: 1, borderRadius: 8, padding: 10, gap: 3 },
  fixedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 8, padding: 10 },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', justifyContent: 'flex-end' },
});
