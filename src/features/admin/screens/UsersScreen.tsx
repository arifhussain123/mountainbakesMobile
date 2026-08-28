import React, { useCallback, useMemo, useState } from 'react';
import { Alert, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';

import {
  MBCard,
  MBEmptyState,
  MBErrorState,
  MBFab,
  MBFilterChips,
  MBHeader,
  MBPressable,
  MBSkeletonList,
  MBSyncStatus,
} from '@/common/ui';
import { useSetUserActive, useUsers } from '@/api/hooks/useUsersApi';
import { roleLabel } from '@/common/constants/roleLabels';
import type { User, UserStatus } from '@/shared/types/user.types';
import { useAuthStore } from '@/state/authStore';
import { useTheme } from '@/common/theme/ThemeProvider';
import { contentColumn, space } from '@/common/theme/spacing';
import { dataAsOfFrom } from '@/common/helpers/dataAsOf';

/**
 * Accounts.
 *
 * Every route behind this screen is `requireRole('super_admin')`, applied once
 * on the router rather than per handler. The screen is reachable only from the
 * admin More list; that is convenience, and the server re-decides on every call.
 *
 * ---------------------------------------------------------------------------
 * Deactivate, never delete
 * ---------------------------------------------------------------------------
 * There is no destructive action here, and the wording says so. `DELETE
 * /api/users/:id` sets `status = 'inactive'` and bans the auth user; the row
 * stays, and so does every order, expense and audit entry pointing at it. A
 * button labelled "Delete" that leaves the account in the list is how somebody
 * concludes a departed employee can no longer sign in when they still can.
 *
 * Status filtering therefore defaults to Active — what the staff list *is* —
 * with Inactive and All reachable, because finding the account somebody
 * deactivated last month is a large part of why an admin opens this.
 */

const STATUS_FILTERS = [
  { key: 'active', label: 'Active' },
  { key: 'inactive', label: 'Inactive' },
  { key: 'all', label: 'All' },
] as const;

type StatusKey = (typeof STATUS_FILTERS)[number]['key'];

export function UsersScreen(): React.ReactElement {
  const theme = useTheme();
  const navigation = useNavigation<{ navigate: (screen: string, params?: object) => void }>();
  const signedInId = useAuthStore(s => s.claims?.userId ?? null);

  const [status, setStatus] = useState<StatusKey>('active');
  const [search, setSearch] = useState('');

  const users = useUsers(status === 'all' ? {} : { status: status as UserStatus });
  const setActive = useSetUserActive();

  /**
   * Filtered on the device, unlike Products.
   *
   * `GET /api/users` takes `status` and `role` as SQL predicates but has no
   * `search` parameter — there is no server-side name search to push this into.
   * Staff lists are tens of rows, not thousands, so narrowing here is honest;
   * doing the same to products would mean downloading the catalogue.
   */
  const rows = useMemo(() => {
    const all = users.data ?? [];
    const term = search.trim().toLowerCase();
    if (!term) return all;
    return all.filter(u =>
      [u.displayName, u.email, u.username, u.branchName ?? ''].some(field =>
        field.toLowerCase().includes(term),
      ),
    );
  }, [users.data, search]);

  const onToggleActive = useCallback(
    (user: User) => {
      const deactivating = user.status === 'active';

      // Locking yourself out is not recoverable from this screen — it would take
      // another admin, and on a small team there may not be one.
      if (deactivating && user.id === signedInId) {
        Alert.alert(
          'You cannot deactivate yourself',
          'Ask another Super Admin to do it, or you would be locked out of the app.',
        );
        return;
      }

      Alert.alert(
        deactivating ? 'Deactivate this account?' : 'Reactivate this account?',
        deactivating
          ? `${user.displayName} will no longer be able to sign in. Their records stay exactly as they are, and you can reactivate the account at any time.`
          : `${user.displayName} will be able to sign in again.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: deactivating ? 'Deactivate' : 'Reactivate',
            style: deactivating ? 'destructive' : 'default',
            onPress: () =>
              setActive.mutate(
                { id: user.id, active: !deactivating },
                {
                  onError: () =>
                    Alert.alert(
                      'Not changed',
                      'The account was not updated. Check your connection and try again.',
                    ),
                },
              ),
          },
        ],
      );
    },
    [setActive, signedInId],
  );

  /**
   * One handler for the whole list, not a closure per row. Wrapping these per
   * row gives `UserRow` two props that differ on every render, so its
   * memoisation never bails out and every visible row re-renders on each
   * keystroke of the search box.
   */
  const onOpen = useCallback(
    (user: User) => navigation.navigate('UserForm', { userId: user.id }),
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }: { item: User }) => (
      <UserRow
        user={item}
        isSelf={item.id === signedInId}
        onOpen={onOpen}
        onToggleActive={onToggleActive}
      />
    ),
    [onOpen, onToggleActive, signedInId],
  );

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader
        title="Users"
        dataAsOf={dataAsOfFrom(users.dataUpdatedAt)}
        subtitle={users.data ? `${rows.length} of ${users.data.length}` : undefined}
        search={{
          value: search,
          onChangeText: setSearch,
          placeholder: 'Search name, email or branch',
          testID: 'user-search',
        }}
        right={<MBSyncStatus />}
      />

      <View style={{ padding: theme.layout.screenPad }}>
        <MBFilterChips
          options={STATUS_FILTERS}
          selectedKey={status}
          onSelect={key => setStatus(key as StatusKey)}
          testIDPrefix="user-status"
        />
      </View>

      <UserList
        users={users}
        rows={rows}
        search={search}
        renderItem={renderItem}
        onClearSearch={() => setSearch('')}
      />

      <MBFab
        label="New user"
        onPress={() => navigation.navigate('UserForm', {})}
        testID="new-user"
      />
    </View>
  );
}

/** The screen states, kept together so none is forgotten. */
function UserList({
  users,
  rows,
  search,
  renderItem,
  onClearSearch,
}: {
  users: ReturnType<typeof useUsers>;
  rows: User[];
  search: string;
  renderItem: ({ item }: { item: User }) => React.ReactElement;
  onClearSearch: () => void;
}): React.ReactElement {
  if (users.isPending) return <MBSkeletonList rows={8} />;

  if (users.isError) {
    return <MBErrorState error={users.error} onRetry={users.refetch} retrying={users.isFetching} />;
  }

  if (rows.length === 0) {
    return search ? (
      <MBEmptyState
        title="No accounts match"
        message={`Nothing found for "${search}".`}
        actionLabel="Clear search"
        onAction={onClearSearch}
      />
    ) : (
      <MBEmptyState title="No accounts here" message="Nothing matches this status filter." />
    );
  }

  return (
    <FlashList
      data={rows}
      renderItem={renderItem}
      keyExtractor={item => item.id}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl refreshing={false} onRefresh={users.refetch} />
      }
    />
  );
}

/**
 * Memoised. This list re-renders on every keystroke of the search box; with
 * stable handlers none of the visible rows re-render with it. Theme changes
 * still reach it — context bypasses `memo`.
 */
const UserRow = React.memo(function UserRowView({
  user,
  isSelf,
  onOpen,
  onToggleActive,
}: {
  user: User;
  isSelf: boolean;
  onOpen: (user: User) => void;
  onToggleActive: (user: User) => void;
}): React.ReactElement {
  const theme = useTheme();
  const inactive = user.status !== 'active';
  const open = useCallback(() => onOpen(user), [onOpen, user]);
  const toggle = useCallback(() => onToggleActive(user), [onToggleActive, user]);

  return (
    <View style={contentColumn}>
      <MBCard>
        <MBPressable onPress={open} accessibilityRole="button">
          <View style={styles.rowHeader}>
            <Text
              style={[theme.type.bodyStrong, { color: theme.colors.text }]}
              numberOfLines={1}>
              {user.displayName}
              {isSelf ? ' (you)' : ''}
            </Text>
            <Text
              style={[
                theme.type.label,
                { color: inactive ? theme.colors.danger : theme.colors.success },
              ]}>
              {user.status}
            </Text>
          </View>

          <Text style={[theme.type.caption, { color: theme.colors.textMuted }]} numberOfLines={1}>
            {user.email}
          </Text>

          <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
            {roleLabel(user.role)}
            {user.branchName ? ` · ${user.branchName}` : ''}
            {/* A shift is set only on `branch_user` — the account that carries
                its manager's branch rather than one of its own. */}
            {user.shift ? ` · ${user.shift} shift` : ''}
          </Text>

          {user.mustChangePassword ? (
            <Text style={[theme.type.caption, { color: theme.colors.warning }]}>
              Must change password at next sign-in
            </Text>
          ) : null}
        </MBPressable>

        <View style={styles.actions}>
          <MBPressable
            onPress={toggle}
            accessibilityRole="button"
            testID={`toggle-${user.id}`}>
            <Text style={[theme.type.label, { color: theme.colors.accent }]}>
              {inactive ? 'Reactivate' : 'Deactivate'}
            </Text>
          </MBPressable>
        </View>
      </MBCard>
    </View>
  );
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { ...contentColumn, paddingHorizontal: space.lg, paddingBottom: space.xxl },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: space.sm,
    marginBottom: space.tight,
  },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: space.sm },
});
