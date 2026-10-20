import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import {
  getBusinessDate,
  useActivateUser,
  useBranches,
  useDeactivateUser,
  useDeleteUser,
  useUserActivity,
  useUsersDataPages,
  usersExportParams,
  type AdminUser,
  type AdminUserStatus,
  type UserAuditLog,
  type UserRole,
} from '@/api';
import { useDebouncedValue } from '@/shared/hooks';
import { mapErrorToMessage } from '@/shared/helpers';
import { useAppTheme } from '@/shared/theme';
import { Card, DateRangeSheet, FilterChipRow, FormBottomSheet, SearchBar, type FilterChipOption } from '@/shared/ui';
import { formatDisplayDate, resolveDateRangePreset, type DateRange } from '@/shared/utils';
import { format, isValid, parseISO } from 'date-fns';
import { ActionChip, ActiveFilterChips, AdminListScreen, SortControl } from '../components';
import { useDataTableExport } from '../components/ExportSheet';
import { activeChips, chipLabel, rangeChipLabel, searchChipLabel, toSortParam, type SortField, type SortState } from '../utils/listControls';
import { deactivatePrompt, deletePrompt, userToggleAction } from '../utils/systemActions';
import { useUserSheet } from './users/userSheets';
import {
  ALL,
  DateRangeField,
  DetailRows,
  FilterSelect,
  MONO,
  MoreFilters,
  Pill,
  formatDateTime,
  titleCase,
  type PillTone,
} from '../components/AdminDetail';

type Tab = 'all' | 'activity';
const TABS: FilterChipOption<Tab>[] = [
  { value: 'all', label: 'All Users' },
  { value: 'activity', label: 'User Activity' },
];

const ROLES: UserRole[] = ['super_admin', 'branch_manager', 'production_user', 'finance_admin', 'finance_manager', 'accountant', 'finance_auditor'];
/** The web's options: every role with `_` read as a space, lower-case. */
const ROLE_OPTIONS = ROLES.map((r) => ({ value: r, label: r.replace(/_/g, ' ') }));

type StatusFilter = AdminUserStatus | typeof ALL;
const STATUS_OPTIONS: FilterChipOption<StatusFilter>[] = [
  { value: ALL, label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
];

/** The web table's sortable columns (User, Role, Branch, Status — Username and Phone do not sort), sorted by the server. */
const SORT_FIELDS: SortField<AdminUser>[] = [
  { key: 'displayName', label: 'User', kind: 'text' },
  { key: 'role', label: 'Role', kind: 'text' },
  { key: 'branchName', label: 'Branch', kind: 'text' },
  { key: 'status', label: 'Status', kind: 'text' },
];

/** The web's role colours: Super Admin primary, Branch Manager secondary, Production blue, every finance role one green. */
const ROLE_TONE: Record<UserRole, PillTone> = {
  super_admin: 'primary',
  branch_manager: 'secondary',
  production_user: 'info',
  finance_admin: 'success',
  finance_manager: 'success',
  accountant: 'success',
  finance_auditor: 'success',
};

/** Web: `role.replace('_', ' ')`, capitalised. */
const roleText = (role: string) => titleCase(role.replace('_', ' '));
const statusText = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : '—');

const ACTION_LABELS: Record<string, string> = {
  password_reset: 'Reset Password',
  password_changed: 'Changed Password',
  user_created: 'Created User',
  user_updated: 'Updated User',
  user_activated: 'Activated User',
  user_deactivated: 'Deactivated User',
  user_deleted: 'Deleted User',
  branch_location_updated: 'Updated Branch Location',
  branch_location_removed: 'Removed Branch Location',
  return_created: 'Raised Return',
  return_revised: 'Corrected Return',
};

/** `Oct 20, 2026, 02:11 AM` — the activity feed's own stamp. */
function activityWhen(iso: string): string {
  const d = parseISO(iso);
  return isValid(d) ? format(d, 'MMM dd, yyyy, hh:mm a') : iso;
}

/**
 * Users — the web `/users` page. "All Users" is the web table
 * (`/api/data/users`: searched, filtered and paged by the server) as cards;
 * tapping one opens the web's "User details", which carries the web row
 * menu: Edit, Reset Password, Change Email Address, Deactivate / Activate and
 * Delete. "+ Add User" sits above the list; the web's sortable columns and
 * active-filter chips sit under the filters. "User Activity" is the audit feed.
 */
export function UsersScreen() {
  const [tab, setTab] = useState<Tab>('all');
  const tabs = <FilterChipRow options={TABS} value={tab} onChange={setTab} />;
  return tab === 'all' ? <AllUsers tabs={tabs} /> : <UserActivity tabs={tabs} />;
}

function AllUsers({ tabs }: { tabs: ReactNode }) {
  const theme = useAppTheme();
  const [search, setSearch] = useState('');
  const term = useDebouncedValue(search.trim());
  const [role, setRole] = useState<UserRole | typeof ALL>(ALL);
  const [status, setStatus] = useState<StatusFilter>(ALL);
  const [branchId, setBranchId] = useState<string>(ALL);
  const [lastLogin, setLastLogin] = useState<DateRange | null>(null);
  const [sort, setSort] = useState<SortState | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const dateSheet = useRef<BottomSheetModal>(null);
  const detailSheet = useRef<BottomSheetModal>(null);
  const forms = useUserSheet();
  const deactivate = useDeactivateUser();
  const activate = useActivateUser();
  const remove = useDeleteUser();
  const today = getBusinessDate();

  const query = useMemo(
    () => ({
      search: term || undefined,
      role: role === ALL ? undefined : role,
      status: status === ALL ? undefined : status,
      branchId: branchId === ALL ? undefined : branchId,
      lastLoginFrom: lastLogin?.from,
      lastLoginTo: lastLogin?.to,
      sort: toSortParam(sort),
    }),
    [term, role, status, branchId, lastLogin, sort],
  );
  const q = useUsersDataPages(query);
  const branchesQ = useBranches();
  const users = useMemo(() => q.data?.pages.flatMap((p) => p.data) ?? [], [q.data]);
  const total = q.data?.pages[0]?.total;
  const branchOptions = useMemo(() => (branchesQ.data?.branches ?? []).map((b) => ({ value: b.id, label: b.name })), [branchesQ.data]);
  const filtered = !!(term || role !== ALL || status !== ALL || branchId !== ALL || lastLogin);

  const chips = activeChips([
    !!term && { key: 'search', label: searchChipLabel(term), onRemove: () => setSearch('') },
    role !== ALL && { key: 'role', label: chipLabel('Role', role.replace(/_/g, ' ')), onRemove: () => setRole(ALL) },
    status !== ALL && {
      key: 'status',
      label: chipLabel('Status', STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status),
      onRemove: () => setStatus(ALL),
    },
    branchId !== ALL && {
      key: 'branchId',
      label: chipLabel('Branch', branchOptions.find((o) => o.value === branchId)?.label ?? 'Branch'),
      onRemove: () => setBranchId(ALL),
    },
    !!lastLogin && {
      key: 'lastLoginAt',
      label: rangeChipLabel('Last login', lastLogin.from, lastLogin.to, formatDisplayDate),
      onRemove: () => setLastLogin(null),
    },
  ]);
  const clearAll = () => {
    setSearch('');
    setRole(ALL);
    setStatus(ALL);
    setBranchId(ALL);
    setLastLogin(null);
  };

  const open = (u: AdminUser) => {
    setSelected(u);
    detailSheet.current?.present();
  };

  /** Closed first, so a form never stacks on the details it was opened from. */
  const openForm = (kind: 'edit' | 'reset' | 'email', u: AdminUser) => {
    detailSheet.current?.dismiss();
    forms.open({ kind, user: u });
  };

  const afterWrite = (title: string, message: string) => {
    detailSheet.current?.dismiss();
    Alert.alert(title, message);
  };

  const toggleStatus = (u: AdminUser) => {
    const name = u.displayName || u.email;
    if (userToggleAction(u.status) === 'activate') {
      activate.mutate(u.id, {
        onSuccess: () => afterWrite('User Activated', `${name} activated`),
        onError: (e) => Alert.alert('Could Not Activate User', mapErrorToMessage(e)),
      });
      return;
    }
    Alert.alert('Deactivate User', deactivatePrompt(name), [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Deactivate',
        style: 'destructive',
        onPress: () =>
          deactivate.mutate(u.id, {
            onSuccess: () => afterWrite('User Deactivated', `${name} deactivated`),
            onError: (e) => Alert.alert('Could Not Deactivate User', mapErrorToMessage(e)),
          }),
      },
    ]);
  };

  const confirmDelete = (u: AdminUser) => {
    const name = u.displayName || u.email;
    Alert.alert('Delete User', deletePrompt(name), [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          remove.mutate(u.id, {
            onSuccess: () => afterWrite('User Deleted', `${name} deleted`),
            onError: (e) => Alert.alert('Could Not Delete User', mapErrorToMessage(e)),
          }),
      },
    ]);
  };

  // The web table's Export menu: CSV of the loaded rows or of every result (the server caps "all").
  const exportUi = useDataTableExport(
    {
      resource: 'users',
      fileName: 'mountain-bakes-users',
      params: usersExportParams(query),
      pageSize: 20,
      loadedPages: q.data?.pages.length ?? 0,
      loadedRows: users.length,
      total,
    },
    'Export Users',
  );

  return (
    <>
      <AdminListScreen<AdminUser>
        title="Users"
        subtitle={total === undefined ? 'Loading…' : `${total.toLocaleString()} total users`}
        data={users}
        keyExtractor={(u) => u.id}
        renderItem={({ item }) => <UserCard user={item} onPress={() => open(item)} />}
        isLoading={q.isLoading}
        error={q.error}
        refreshing={q.isRefetching && !q.isFetchingNextPage}
        onRefresh={() => void q.refetch()}
        onEndReached={() => {
          if (q.hasNextPage && !q.isFetchingNextPage) void q.fetchNextPage();
        }}
        loadingMore={q.isFetchingNextPage}
        emptyTitle="No users found"
        emptyMessage={filtered ? 'Nothing matches these filters.' : undefined}
        header={
          <>
            {tabs}
            <View style={{ alignSelf: 'flex-start', flexDirection: 'row', gap: 8 }}>
              <ActionChip icon="plus" label="Add User" primary onPress={() => forms.open({ kind: 'create' })} />
              {exportUi.chip}
            </View>
            <SearchBar value={search} onChangeText={setSearch} placeholder="Search name, email, username, code…" />
            <FilterSelect<UserRole> label="Role" allLabel="All Roles" options={ROLE_OPTIONS} value={role} onChange={(v) => setRole(v as UserRole | typeof ALL)} />
            <View style={{ gap: 4 }}>
              <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Status</Text>
              <FilterChipRow options={STATUS_OPTIONS} value={status} onChange={setStatus} />
            </View>
            <MoreFilters open={moreOpen} onToggle={() => setMoreOpen((o) => !o)} activeCount={(branchId !== ALL ? 1 : 0) + (lastLogin ? 1 : 0)}>
              <FilterSelect label="Branch" allLabel="All Branches" options={branchOptions} value={branchId} onChange={setBranchId} />
              <DateRangeField label="Last login" range={lastLogin} placeholder="Any time" onPress={() => dateSheet.current?.present()} onClear={() => setLastLogin(null)} />
            </MoreFilters>
            <SortControl fields={SORT_FIELDS} value={sort} onChange={setSort} defaultLabel="Newest first" />
            <ActiveFilterChips chips={chips} onClearAll={clearAll} />
          </>
        }
      />
      {exportUi.element}
      <DateRangeSheet
        ref={dateSheet}
        today={today}
        value={lastLogin ?? resolveDateRangePreset('last7', today)}
        onApply={setLastLogin}
        onRequestClose={() => dateSheet.current?.dismiss()}
      />
      <FormBottomSheet ref={detailSheet} title="User details" onRequestClose={() => detailSheet.current?.dismiss()} snapPoints={['75%']}>
        {selected ? (
          <UserDetails
            user={selected}
            actions={
              <View style={styles.actions}>
                <ActionChip icon="pencil" label="Edit" onPress={() => openForm('edit', selected)} />
                <ActionChip icon="lock" label="Reset Password" onPress={() => openForm('reset', selected)} />
                <ActionChip icon="send" label="Change Email Address" onPress={() => openForm('email', selected)} />
                {userToggleAction(selected.status) === 'deactivate' ? (
                  <ActionChip icon="close" label="Deactivate" danger onPress={() => toggleStatus(selected)} loading={deactivate.isPending} />
                ) : (
                  <ActionChip icon="check" label="Activate" onPress={() => toggleStatus(selected)} loading={activate.isPending} />
                )}
                <ActionChip icon="trash" label="Delete" danger onPress={() => confirmDelete(selected)} loading={remove.isPending} />
              </View>
            }
          />
        ) : null}
      </FormBottomSheet>
      {forms.element}
    </>
  );
}

function UserCard({ user, onPress }: { user: AdminUser; onPress: () => void }) {
  const theme = useAppTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${user.displayName ?? user.email}, ${roleText(user.role)}, ${statusText(user.status)}`}>
      <Card style={styles.card}>
        <View style={styles.cardRow}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]} numberOfLines={1}>
              {user.displayName || '—'}
            </Text>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {user.email}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <Pill label={roleText(user.role)} tone={ROLE_TONE[user.role] ?? 'neutral'} />
            <Pill label={statusText(user.status)} tone={user.status === 'active' ? 'primary' : 'neutral'} />
          </View>
        </View>
        <View style={styles.meta}>
          <Meta label="Username" value={user.username || '—'} mono />
          <Meta label="Branch" value={user.branchName || '—'} />
          <Meta label="Phone" value={user.phone || '—'} />
        </View>
      </Card>
    </Pressable>
  );
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  const theme = useAppTheme();
  return (
    <View style={{ flexBasis: '30%', flexGrow: 1, minWidth: 90 }}>
      <Text style={[theme.typography.label, { color: theme.colors.textFaint }]}>{label}</Text>
      <Text style={[theme.typography.label, { color: theme.colors.text }, mono ? MONO : null]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

/** The web's "User details" dialog, with the row menu's actions under it. */
function UserDetails({ user, actions }: { user: AdminUser; actions: ReactNode }) {
  const theme = useAppTheme();
  return (
    <View style={{ gap: 12 }}>
      <View style={styles.cardRow}>
        <View style={{ flex: 1 }}>
          <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>{user.displayName || '—'}</Text>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{user.email}</Text>
        </View>
        <Pill label={statusText(user.status)} tone={user.status === 'active' ? 'primary' : 'neutral'} />
      </View>
      <DetailRows
        rows={[
          { label: 'Email', value: user.email },
          { label: 'Username', value: user.username || '—' },
          { label: 'Phone', value: user.phone || '—' },
          { label: 'Role', value: roleText(user.role) },
          { label: 'Branch', value: user.branchName || '—' },
          { label: 'Created', value: formatDateTime(user.createdAt) },
          { label: 'Last login', value: formatDateTime(user.lastLoginAt) },
          { label: 'Last password reset', value: formatDateTime(user.lastPasswordReset) },
          { label: 'Reset by', value: user.passwordResetByName || '—' },
        ]}
      />
      {actions}
    </View>
  );
}

function UserActivity({ tabs }: { tabs: ReactNode }) {
  const q = useUserActivity();
  return (
    <AdminListScreen<UserAuditLog>
      title="Users"
      subtitle="User Activity"
      data={q.data?.logs ?? []}
      keyExtractor={(l) => l.id}
      renderItem={({ item }) => <ActivityCard log={item} />}
      isLoading={q.isLoading}
      error={q.error}
      refreshing={q.isRefetching}
      onRefresh={() => void q.refetch()}
      emptyTitle="No activity recorded yet."
      header={tabs}
    />
  );
}

function ActivityCard({ log }: { log: UserAuditLog }) {
  const theme = useAppTheme();
  const line = (label: string, value: string, bold?: boolean) => (
    <Text style={[theme.typography.bodySmall, { color: theme.colors.text }]}>
      <Text style={{ color: theme.colors.textSecondary }}>{label}: </Text>
      <Text style={bold ? { fontWeight: '700' } : null}>{value}</Text>
    </Text>
  );
  return (
    <Card style={styles.card}>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{activityWhen(log.createdAt)}</Text>
      <View style={{ marginTop: 4, gap: 2 }}>
        {line('Admin', log.adminName)}
        {line('Action', ACTION_LABELS[log.action] ?? log.action, true)}
        {log.targetUserName ? line('User', `${log.targetUserName}${log.targetUserRole ? ` (${roleText(log.targetUserRole)})` : ''}`) : null}
        {log.details ? <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{log.details}</Text> : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14 },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
});
