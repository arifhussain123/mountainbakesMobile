import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { MBButton, MBFilterChips, MBHeader, MBInput } from '@/components';
import { roleLabel } from '@/constants/roleLabels';
import { useBranches } from '@/hooks/useCatalog';
import { useCreateUser, useResetUserPassword, useUpdateUser, useUsers } from '@/hooks/useUserAdmin';
import type { MoreStackParamList } from '@/navigation/types';
import { CreateUserSchema } from '@/shared/schemas/user.schemas';
import { BRANCH_SHIFTS, USER_ROLES, type UserRole } from '@/shared/types/user.types';
import { isBranchRole } from '@/navigation/roleNavigation';
import { useTheme } from '@/theme/ThemeProvider';
import { contentColumn } from '@/theme/spacing';

/**
 * Create or edit an account. One screen for both, like the product form, because
 * the fields overlap — and the ones that do NOT overlap are the interesting
 * part.
 *
 * ---------------------------------------------------------------------------
 * Identity is set once
 * ---------------------------------------------------------------------------
 * Email, username and password exist only when creating. `UpdateUserSchema`
 * accepts `displayName`, `phone`, `role`, `branchId`, `status` and `shift` —
 * and nothing else. Changing an email is changing which Supabase auth identity
 * an account IS; the server does not offer it here, and a field that silently
 * did nothing would be worse than its absence. Resetting a password is a
 * separate, audited action with its own route.
 *
 * ---------------------------------------------------------------------------
 * Branch and shift follow the role
 * ---------------------------------------------------------------------------
 * `CreateUserSchema` carries a refinement — a shift belongs only to a
 * `branch_user`, the shift account that borrows its manager's branch. The form
 * mirrors that by showing the field only for that role, so the refinement
 * becomes a thing you cannot do rather than an error you read after submitting.
 */

type FormRoute = RouteProp<MoreStackParamList, 'UserForm'>;

/** Create needs credentials; edit must never send them. */
const EditUserFormSchema = z.object({
  displayName: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(10, 'Invalid phone number'),
  role: z.enum(USER_ROLES),
  branchId: z.string().nullable(),
  shift: z.enum(BRANCH_SHIFTS).nullable().optional(),
});

type EditValues = z.infer<typeof EditUserFormSchema>;
type CreateValues = z.infer<typeof CreateUserSchema>;

const NO_BRANCH = 'none';

export function UserFormScreen(): React.ReactElement {
  const theme = useTheme();
  const route = useRoute<FormRoute>();
  const navigation = useNavigation<{ goBack: () => void }>();
  const userId = route.params?.userId;
  const isEdit = Boolean(userId);

  const branches = useBranches();
  const create = useCreateUser();
  const update = useUpdateUser();
  const resetPassword = useResetUserPassword();
  const [failed, setFailed] = useState<string | null>(null);

  // The list is already cached by the screen that navigated here, so this reads
  // from it rather than adding a second request for a row we hold.
  const existing = useUsers().data?.find(u => u.id === userId);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateValues | EditValues>({
    resolver: zodResolver(isEdit ? EditUserFormSchema : CreateUserSchema) as never,
    defaultValues: {
      displayName: '',
      phone: '',
      role: 'branch_manager',
      branchId: null,
      shift: null,
      ...(isEdit ? {} : { email: '', username: '', password: '' }),
    } as never,
  });

  const role = watch('role') as UserRole;
  const showShift = role === 'branch_user';
  const needsBranch = isBranchRole(role);

  useEffect(() => {
    if (!isEdit || !existing) return;
    reset({
      displayName: existing.displayName,
      phone: existing.phone,
      role: existing.role,
      branchId: existing.branchId,
      shift: existing.shift,
    } as never);
  }, [isEdit, existing, reset]);

  // A shift on anything but a shift account is rejected by the schema's
  // refinement. Clearing it as the role changes keeps the form from carrying a
  // value the user cannot see and cannot remove.
  useEffect(() => {
    if (!showShift) setValue('shift', null as never);
  }, [showShift, setValue]);

  const branchOptions = useMemo(
    () => [
      { key: NO_BRANCH, label: 'No branch' },
      ...(branches.data ?? []).map(b => ({ key: b.id, label: b.name })),
    ],
    [branches.data],
  );

  const onSubmit = useCallback(
    async (values: CreateValues | EditValues) => {
      setFailed(null);
      try {
        if (isEdit && userId) {
          const v = values as EditValues;
          await update.mutateAsync({
            id: userId,
            payload: {
              displayName: v.displayName,
              phone: v.phone,
              role: v.role,
              branchId: v.branchId,
              shift: v.shift ?? null,
            },
          });
        } else {
          await create.mutateAsync(values as CreateValues);
        }
        navigation.goBack();
      } catch (error) {
        setFailed(
          error instanceof Error ? error.message : 'The account was not saved. Try again.',
        );
      }
    },
    [create, update, isEdit, userId, navigation],
  );

  /**
   * A generated temporary password is shown ONCE, in the alert, and never
   * stored. This device's database is not encrypted; a credential written into
   * it would outlive the person reading it off the screen.
   */
  const onResetPassword = useCallback(() => {
    if (!userId) return;
    Alert.alert(
      'Reset this password?',
      'A temporary password is generated and shown once. The user must change it at their next sign-in.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            resetPassword.mutate(
              { id: userId, input: { generateTemp: true, sendEmail: false, forceChange: true } },
              {
                onSuccess: result =>
                  Alert.alert(
                    'Temporary password',
                    result.tempPassword
                      ? `${result.tempPassword}\n\nWrite this down now — it is not shown again and is not saved on this device.`
                      : 'The password was reset.',
                  ),
                onError: () =>
                  Alert.alert('Not reset', 'The password was not changed. Try again.'),
              },
            );
          },
        },
      ],
    );
  }, [resetPassword, userId]);

  const saving = create.isPending || update.isPending;

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader
        title={isEdit ? 'Edit user' : 'New user'}
        subtitle={isEdit ? existing?.email : undefined}
        onBack={navigation.goBack}
      />

      <ScrollView
        contentContainerStyle={[
          contentColumn,
          { padding: theme.layout.screenPad, gap: theme.space.md },
        ]}
        keyboardShouldPersistTaps="handled">
        {!isEdit ? (
          <>
            <Controller
              control={control}
              name={'email' as never}
              render={({ field }) => (
                <MBInput
                  label="Email"
                  required
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={String(field.value ?? '')}
                  onChangeText={field.onChange}
                  error={(errors as Record<string, { message?: string }>).email?.message}
                  testID="user-email"
                />
              )}
            />
            <Controller
              control={control}
              name={'username' as never}
              render={({ field }) => (
                <MBInput
                  label="Username"
                  required
                  autoCapitalize="none"
                  hint="Lowercase letters, numbers and underscores"
                  value={String(field.value ?? '')}
                  onChangeText={field.onChange}
                  error={(errors as Record<string, { message?: string }>).username?.message}
                  testID="user-username"
                />
              )}
            />
            <Controller
              control={control}
              name={'password' as never}
              render={({ field }) => (
                <MBInput
                  label="Password"
                  required
                  isPassword
                  value={String(field.value ?? '')}
                  onChangeText={field.onChange}
                  error={(errors as Record<string, { message?: string }>).password?.message}
                  testID="user-password"
                />
              )}
            />
          </>
        ) : null}

        <Controller
          control={control}
          name="displayName"
          render={({ field }) => (
            <MBInput
              label="Full name"
              required
              value={String(field.value ?? '')}
              onChangeText={field.onChange}
              error={errors.displayName?.message}
              testID="user-name"
            />
          )}
        />

        <Controller
          control={control}
          name="phone"
          render={({ field }) => (
            <MBInput
              label="Phone"
              required
              keyboardType="phone-pad"
              value={String(field.value ?? '')}
              onChangeText={field.onChange}
              error={errors.phone?.message}
              testID="user-phone"
            />
          )}
        />

        <View style={{ gap: theme.space.sm }}>
          <Text style={[theme.type.label, { color: theme.colors.textMuted }]}>Role</Text>
          <Controller
            control={control}
            name="role"
            render={({ field }) => (
              <MBFilterChips
                options={USER_ROLES.map(r => ({ key: r, label: roleLabel(r) }))}
                selectedKey={String(field.value)}
                onSelect={field.onChange}
                testIDPrefix="user-role"
              />
            )}
          />
        </View>

        {/* Shown only for the roles the server scopes to a branch. A finance or
            admin account carries no branch, and offering one would invite a
            value the API ignores. */}
        {needsBranch ? (
          <View style={{ gap: theme.space.sm }}>
            <Text style={[theme.type.label, { color: theme.colors.textMuted }]}>Branch</Text>
            <Controller
              control={control}
              name="branchId"
              render={({ field }) => (
                <MBFilterChips
                  options={branchOptions}
                  selectedKey={field.value ?? NO_BRANCH}
                  onSelect={key => field.onChange(key === NO_BRANCH ? null : key)}
                  tone="accent"
                  scroll
                  testIDPrefix="user-branch"
                />
              )}
            />
          </View>
        ) : null}

        {showShift ? (
          <View style={{ gap: theme.space.sm }}>
            <Text style={[theme.type.label, { color: theme.colors.textMuted }]}>Shift</Text>
            <Controller
              control={control}
              name="shift"
              render={({ field }) => (
                <MBFilterChips
                  options={BRANCH_SHIFTS.map(s => ({ key: s, label: s }))}
                  selectedKey={field.value ?? ''}
                  onSelect={field.onChange}
                  tone="accent"
                  testIDPrefix="user-shift"
                />
              )}
            />
          </View>
        ) : null}

        {failed ? (
          <Text style={[theme.type.caption, { color: theme.colors.danger }]}>{failed}</Text>
        ) : null}

        <MBButton
          label={isEdit ? 'Save changes' : 'Create account'}
          onPress={handleSubmit(onSubmit)}
          loading={saving}
          testID="save-user"
        />

        {isEdit ? (
          <MBButton
            label="Reset password"
            variant="secondary"
            onPress={onResetPassword}
            loading={resetPassword.isPending}
            testID="reset-password"
          />
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
