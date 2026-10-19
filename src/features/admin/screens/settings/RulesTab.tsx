import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { RestrictionGroup, RestrictionRulesState } from '@/api';
import { useAppTheme } from '@/shared/theme';
import { Card } from '@/shared/ui';
import { CodeTag, MONO, Pill, ReadOnlySwitch, formatDateTime } from '../../components/AdminDetail';
import { addDaysToDateStr, ladderRange, restrictionDmy, time12 } from './restrictionFormat';

const OFF = 'Disabled — no restriction applied';

type Tone = 'ok' | 'warn' | 'block';

/**
 * Restriction Rules → Rules, read-only: the six groups with the web's names,
 * codes, descriptions, ladders and "Current configuration" lines, showing
 * the saved values. Changing and saving a group is a web action this phase.
 */
export function RulesTab({ state }: { state: RestrictionRulesState }) {
  const theme = useAppTheme();
  const r = state.rules;
  const dp = r.demand.pendingLimit;
  const bd = r.demand.backdated;
  const cs = r.demand.lowSales;
  const hs = r.sales.hourly;
  const ps = r.production.stockShortage;
  const cd = r.cash.dailyLimit;
  const lg = r.ledger.backdate;
  const co = r.company.shareIncome;
  const closes = time12(state.closingTime);
  const today = restrictionDmy(state.businessDate);
  const lgFrom = restrictionDmy(addDaysToDateStr(state.businessDate, -lg.allowedDays));

  const status = (g: RestrictionGroup) => {
    const at = state.saved[g]?.updatedAt;
    return at ? `Saved ${formatDateTime(at)}` : 'Using defaults';
  };

  return (
    <View style={{ gap: 14 }}>
      <Group title="Demand Restrictions" shownIn="New Demand popup" status={status('demand')}>
        <Rule
          name="Pending verification limit"
          code="DEMAND_PENDING_LIMIT"
          description="Counts a branch's demands in the Awaiting Verification status: sent by Production, not yet verified as received by the branch. Their demand numbers are listed in the popup when blocked."
          enabled={dp.enabled}
          summary={dp.enabled ? `Warn at ${dp.warnAt} awaiting verification · block new demands at ${dp.blockAt}+` : OFF}>
          <Field label="Warning threshold" value={`${dp.warnAt} awaiting`} />
          <Field label="Blocking threshold" value={`${dp.blockAt} awaiting`} />
          <Ladder
            steps={[
              { range: ladderRange(0, dp.warnAt - 1), text: 'Allowed', tone: 'ok' },
              { range: ladderRange(dp.warnAt, dp.blockAt - 1), text: 'Warning', tone: 'warn' },
              { range: `${dp.blockAt}+`, text: 'Blocked', tone: 'block' },
            ]}
          />
        </Rule>
        <Rule
          name="Backdated demand"
          code="BACKDATED_DEMAND"
          description="A demand dated before the current business date is held until Admin approves it. Approval is one-time and tied to that demand."
          enabled={bd.enabled}
          summary={bd.enabled ? (bd.requireApproval ? 'Backdated demands held for Admin approval' : 'Backdated demands blocked') : OFF}>
          <Option label="Requires Admin approval" value={bd.requireApproval} />
        </Rule>
        <Rule
          name="Low sales after closing"
          code="LOW_SALES_AFTER_CLOSING"
          description="After the branch closing time, a new demand is blocked if the sold share of applicable opening/available stock is below the minimum. Uses the existing stock calculation."
          enabled={cs.enabled}
          summary={cs.enabled ? `After ${closes}, block new demand if less than ${cs.minSoldPercent}% of stock sold` : OFF}>
          <Field label="Closing time" value={`${closes} from Business Hours`} />
          <Field label="Minimum sold percentage" value={`${cs.minSoldPercent} %`} />
        </Rule>
      </Group>

      <Group title="Sales Restrictions" shownIn="New Sale popup" status={status('sales')}>
        <Rule
          name="Hourly sales activity"
          code="HOURLY_SALES_LIMIT"
          description={`Counts the completed sales a branch has recorded in the current business hour, determined by the server in ${state.timezone} time. Device clocks are ignored. While the count is below the required number, the popup shows a warning. The counter resets each hour.`}
          enabled={hs.enabled}
          summary={hs.enabled ? `Warn while a branch has fewer than ${hs.threshold} sales in the current hour · sales are never blocked` : OFF}>
          <Field label="Required sales" value={`${hs.threshold} sales / hour`} />
          <Ladder
            steps={[
              { range: ladderRange(0, hs.threshold - 1), text: 'Warning', tone: 'warn' },
              { range: `${hs.threshold}+`, text: 'Normal', tone: 'ok' },
            ]}
          />
        </Rule>
      </Group>

      <Group title="Production Restrictions" shownIn="Production Demand popup" status={status('production')}>
        <Rule
          name="Production stock less than demand"
          code="PRODUCTION_STOCK_SHORTAGE"
          description="On Submit for Verification, every product on the demand is compared with the available production stock. If any product is short, the demand is not submitted and the popup lists each short product with its Less Qty (demand − available stock). Adding stock clears the shortage; it never approves the demand. Uses the existing stock calculation."
          enabled={ps.enabled}
          summary={
            ps.enabled
              ? `Block Submit for Verification while any product is short · ${ps.allowAdminOverride ? 'Admin can override' : 'no override, stock must be added'}`
              : OFF
          }>
          <Option label="Admin may approve a short demand" value={ps.allowAdminOverride} />
          <Ladder
            steps={[
              { range: 'Stock ≥ Demand', text: 'Allowed', tone: 'ok' },
              { range: 'Stock < Demand', text: 'Blocked', tone: 'block' },
            ]}
          />
        </Rule>
      </Group>

      <Group title="Cash Deposit Restrictions" shownIn="Cash Deposit popup" status={status('cash')}>
        <Rule
          name="Daily forward limit"
          code="CASH_DEPOSIT_LIMIT"
          description="Counts cash-deposit transactions forwarded per branch per business date. Each uses the existing server-generated CT number."
          enabled={cd.enabled}
          summary={cd.enabled ? `${cd.limit} deposits per business day${cd.allowExceptions ? ' · Admin exceptions allowed' : ' · no exceptions'}` : OFF}>
          <Field label="Maximum per business day" value={`${cd.limit} transactions`} />
          <Option label="Allow one-time Admin exceptions" value={cd.allowExceptions} />
        </Rule>
      </Group>

      <Group title="Ledger Restrictions" shownIn="Ledger Entry popup" status={status('ledger')}>
        <Rule
          name="Back-entry period"
          code="LEDGER_BACKDATE"
          description="Entries within the period are saved directly. Older entries are held until Admin approves; the ledger entry is not created before then."
          enabled={lg.enabled}
          summary={lg.enabled ? `${lg.allowedDays} days direct · older requires Admin approval` : OFF}>
          <Field label="Allowed back entry" value={`${lg.allowedDays} days`} />
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

      <Group title="Company Share Restrictions" shownIn="Income popup" status={status('company')}>
        <Rule
          name="Company Share as income"
          code="COMPANY_SHARE_INCOME"
          description="Company Share is received through Branch Cash Deposit. Selecting it as an Income category is held for Admin approval."
          enabled={co.enabled}
          summary={co.enabled ? (co.allowApproval ? 'Direct entry blocked · Admin approval required' : 'Direct entry always blocked') : OFF}>
          <View style={[styles.fixedRow, { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.border }]}>
            <Text style={[theme.typography.label, { color: theme.colors.text, fontWeight: '700' }]}>Direct income entry</Text>
            <Pill label="Blocked" tone="danger" />
          </View>
          <Option label="Allow via Admin approval" value={co.allowApproval} />
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

function Group({ title, shownIn, status, children }: { title: string; shownIn: string; status: string; children: ReactNode }) {
  const theme = useAppTheme();
  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <View style={{ padding: 14, gap: 2 }}>
        <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]} accessibilityRole="header">
          {title}
        </Text>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Shown in: {shownIn}</Text>
        <Text style={[theme.typography.label, { color: theme.colors.textFaint }]}>{status}</Text>
      </View>
      {children}
    </Card>
  );
}

function Rule({ name, code, description, enabled, summary, children }: { name: string; code: string; description: string; enabled: boolean; summary: string; children: ReactNode }) {
  const theme = useAppTheme();
  return (
    <View style={[styles.rule, { borderTopColor: theme.colors.border }]}>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '700' }]}>{name}</Text>
          <CodeTag code={code} />
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <ReadOnlySwitch value={enabled} label={name} />
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{enabled ? 'Enabled' : 'Disabled'}</Text>
        </View>
      </View>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>{description}</Text>
      <View style={{ gap: 8, opacity: enabled ? 1 : 0.45 }}>{children}</View>
      <Text style={[theme.typography.label, { color: theme.colors.text }]}>
        <Text style={{ color: theme.colors.textSecondary }}>Current configuration: </Text>
        {summary}
      </Text>
    </View>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.field}>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, flex: 1 }]}>{label}</Text>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '700' }]}>{value}</Text>
    </View>
  );
}

function Option({ label, value }: { label: string; value: boolean }) {
  const theme = useAppTheme();
  return (
    <View style={styles.field}>
      <ReadOnlySwitch value={value} label={label} />
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
  ladder: { flexDirection: 'row', borderWidth: 1, borderRadius: 8, overflow: 'hidden', alignSelf: 'flex-start' },
  step: { paddingHorizontal: 10, paddingVertical: 6, minWidth: 72, gap: 1 },
  infoBox: { borderWidth: 1, borderRadius: 8, padding: 10, gap: 3 },
  fixedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 8, padding: 10 },
});
