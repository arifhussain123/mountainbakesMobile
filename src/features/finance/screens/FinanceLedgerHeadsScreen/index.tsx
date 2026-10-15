import { useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, Switch, Text, TextInput, View } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import {
  financeCan,
  useCreateLedgerHead,
  useLedgerHeads,
  useUpdateLedgerHead,
  type LedgerHead,
  type LedgerHeadType,
} from '@/api';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, EmptyState, ErrorState, FormBottomSheet, LoadingSkeleton, PrimaryButton, Screen } from '@/shared/ui';
import { mapErrorToMessage } from '@/shared/helpers';
import { useAuthStore } from '@/state';
import { styles } from './styles';

function TypeChip({ type }: { type: LedgerHeadType }) {
  const theme = useAppTheme();
  const color = type === 'income' ? theme.colors.success : theme.colors.danger;
  return (
    <View style={[styles.chip, { borderColor: color }]}>
      <Text style={[theme.typography.label, { color, fontWeight: '700' }]}>{type === 'income' ? 'Income' : 'Expense'}</Text>
    </View>
  );
}

/** mountainbakesFinance.html screens 16–17 — Ledger Heads / New Ledger Head. A head is never deleted, only deactivated. */
export function FinanceLedgerHeadsScreen() {
  const theme = useAppTheme();
  const role = useAuthStore((state) => state.user?.role);
  const canConfigure = financeCan(role, 'configure');

  const { data: heads, isLoading, error, refetch } = useLedgerHeads({ includeInactive: true });
  const create = useCreateLedgerHead();
  const update = useUpdateLedgerHead();

  const sheetRef = useRef<BottomSheetModal>(null);
  const [editing, setEditing] = useState<LedgerHead | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<LedgerHeadType>('expense');
  const [groupName, setGroupName] = useState('');

  const sorted = useMemo(
    () => [...(heads ?? [])].sort((a, b) => a.type.localeCompare(b.type) || a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    [heads],
  );

  const openCreate = () => {
    setEditing(null);
    setCode('');
    setName('');
    setType('expense');
    setGroupName('');
    sheetRef.current?.present();
  };

  const openEdit = (head: LedgerHead) => {
    setEditing(head);
    setName(head.name);
    setGroupName(head.groupName ?? '');
    sheetRef.current?.present();
  };

  const handleSave = () => {
    if (editing) {
      update.mutate(
        { id: editing.id, input: { name: name.trim(), groupName: groupName.trim() || null } },
        {
          onSuccess: () => sheetRef.current?.dismiss(),
          onError: (e) => Alert.alert('Could Not Save', mapErrorToMessage(e)),
        },
      );
    } else {
      create.mutate(
        { code: code.trim().toUpperCase(), name: name.trim(), type, groupName: groupName.trim() || null },
        {
          onSuccess: () => sheetRef.current?.dismiss(),
          onError: (e) => Alert.alert('Could Not Create', mapErrorToMessage(e)),
        },
      );
    }
  };

  const toggleActive = (head: LedgerHead) => {
    update.mutate(
      { id: head.id, input: { isActive: !head.isActive } },
      { onError: (e) => Alert.alert('Could Not Update', mapErrorToMessage(e)) },
    );
  };

  return (
    <Screen>
      <AppHeader title="Ledger Heads" subtitle="Chart of accounts" actions={[]} />
      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: theme.spacing.lg }}
        ListHeaderComponent={
          <View>
            {canConfigure ? (
              <View style={{ marginBottom: theme.spacing.md }}>
                <PrimaryButton label="+ New Ledger Head" onPress={openCreate} />
              </View>
            ) : null}
            {isLoading ? <LoadingSkeleton height={100} /> : null}
            {error ? <ErrorState message={mapErrorToMessage(error)} onRetry={() => void refetch()} /> : null}
          </View>
        }
        ListEmptyComponent={!isLoading && !error ? <EmptyState title="No Ledger Heads" message="No ledger heads are configured yet." /> : undefined}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => (canConfigure ? openEdit(item) : undefined)}
            style={[styles.row, { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.cardBorder, opacity: item.isActive ? 1 : 0.5 }]}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '600' }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <TypeChip type={item.type} />
              </View>
              <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 2 }]}>
                {item.code}
                {item.groupName ? ` · ${item.groupName}` : ''}
                {item.isSystem ? ' · System' : ''}
              </Text>
            </View>
            {canConfigure && !item.isSystem ? (
              <Switch value={item.isActive} onValueChange={() => toggleActive(item)} trackColor={{ true: theme.colors.primary }} />
            ) : null}
          </Pressable>
        )}
      />

      <FormBottomSheet
        title={editing ? 'Edit Ledger Head' : 'New Ledger Head'}
        onRequestClose={() => sheetRef.current?.dismiss()}
        ref={sheetRef}>
        {!editing ? (
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: theme.spacing.md }}>
            {(['income', 'expense'] as const).map((t) => {
              const active = t === type;
              return (
                <Pressable
                  key={t}
                  onPress={() => setType(t)}
                  style={[
                    styles.typeToggle,
                    { backgroundColor: active ? theme.colors.primary : theme.colors.surface, borderColor: theme.colors.border },
                  ]}>
                  <Text style={[theme.typography.body, { color: active ? theme.colors.primaryText : theme.colors.text, fontWeight: '600' }]}>
                    {t === 'income' ? 'Income' : 'Expense'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {!editing ? (
          <View style={{ marginBottom: theme.spacing.md }}>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>CODE</Text>
            <TextInput
              value={code}
              onChangeText={setCode}
              autoCapitalize="characters"
              placeholder="e.g. EXP-RENT"
              placeholderTextColor={theme.colors.textSecondary}
              style={[styles.input, { marginTop: 6, borderColor: theme.colors.border, color: theme.colors.text }]}
            />
          </View>
        ) : null}

        <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>NAME</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Office Rent"
          placeholderTextColor={theme.colors.textSecondary}
          style={[styles.input, { marginTop: 6, borderColor: theme.colors.border, color: theme.colors.text }]}
        />

        <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.md }]}>GROUP (OPTIONAL)</Text>
        <TextInput
          value={groupName}
          onChangeText={setGroupName}
          placeholder="e.g. Overheads"
          placeholderTextColor={theme.colors.textSecondary}
          style={[styles.input, { marginTop: 6, borderColor: theme.colors.border, color: theme.colors.text }]}
        />

        <View style={{ marginTop: theme.spacing.xl }}>
          <PrimaryButton
            label={editing ? 'Save Changes' : 'Create Ledger Head'}
            onPress={handleSave}
            loading={create.isPending || update.isPending}
            disabled={!name.trim() || (!editing && !code.trim())}
          />
        </View>
      </FormBottomSheet>
    </Screen>
  );
}
