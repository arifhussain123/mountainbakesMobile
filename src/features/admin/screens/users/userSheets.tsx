import { useRef, useState } from 'react';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import {
  useBranches,
  useChangeUserEmail,
  useCreateUser,
  useResetUserPassword,
  useUpdateUser,
  type AdminUser,
  type AdminUserStatus,
  type ChangeUserEmailInput,
  type CreateUserInput,
  type UserRole,
} from '@/api';
import { mapErrorToMessage } from '@/shared/helpers';
import { useAppTheme } from '@/shared/theme';
import { Dropdown, FormBottomSheet, Icon, PasswordField, PrimaryButton, SecondaryButton, TextField } from '@/shared/ui';
import { MONO } from '../../components/AdminDetail';
import {
  CREATE_ROLE_OPTIONS,
  USER_STATUS_OPTIONS,
  createUserBody,
  editRoleOptions,
  editUserBody,
  isBranchRole,
  resetPasswordOutcome,
  resetPasswordProblem,
  validateChangeEmail,
  validateCreateUser,
  validateEditUser,
  type ChangeEmailField,
  type CreateUserField,
  type EditUserField,
  type FieldErrors,
} from '../../utils/systemActions';

/** Web: `role.replace('_', ' ')`, capitalised. */
const roleText = (role: string) =>
  role
    .replace('_', ' ')
    .split(' ')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');

function useBranchOptions() {
  const q = useBranches();
  return { options: (q.data?.branches ?? []).map((b) => ({ value: b.id, label: b.name })), loading: q.isLoading };
}

function FieldLabel({ text }: { text: string }) {
  const theme = useAppTheme();
  return <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 14, marginBottom: 6 }]}>{text}</Text>;
}

function Buttons({ busy, label, onCancel, onSave, cancelLabel = 'Cancel' }: { busy: boolean; label: string; onCancel: () => void; onSave: () => void; cancelLabel?: string }) {
  return (
    <View style={styles.buttons}>
      <View style={{ flex: 1 }}>
        <SecondaryButton label={cancelLabel} onPress={onCancel} disabled={busy} />
      </View>
      <View style={{ flex: 1.4 }}>
        <PrimaryButton label={label} onPress={onSave} loading={busy} />
      </View>
    </View>
  );
}

function UserHead({ user }: { user: AdminUser }) {
  const theme = useAppTheme();
  return (
    <View style={[styles.head, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radii.md }]}>
      <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>{user.displayName || '—'}</Text>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{user.email}</Text>
      <Text style={[theme.typography.label, { color: theme.colors.text, marginTop: 2 }]}>
        Role: {roleText(user.role)}
        {user.branchName ? ` · ${user.branchName}` : ''}
      </Text>
    </View>
  );
}

/** Web "Create User": the schema's rules field by field; a branch only for a branch role. */
function CreateUserForm({ onClose }: { onClose: () => void }) {
  const create = useCreateUser();
  const branches = useBranchOptions();
  const [v, setV] = useState<CreateUserInput>({ email: '', displayName: '', phone: '', username: '', password: '', role: 'branch_manager', branchId: null });
  const [errors, setErrors] = useState<FieldErrors<CreateUserField>>({});

  const set = <K extends keyof CreateUserInput>(key: K, value: CreateUserInput[K]) => {
    setV((p) => ({ ...p, [key]: value }));
    if (errors[key as CreateUserField]) setErrors((p) => ({ ...p, [key]: undefined }));
  };

  const save = () => {
    const found = validateCreateUser(v);
    setErrors(found);
    if (Object.keys(found).length) return;
    create.mutate(createUserBody(v), {
      onSuccess: () => {
        Alert.alert('User Created', 'User created');
        onClose();
      },
      onError: (e) => Alert.alert('Could Not Create User', mapErrorToMessage(e)),
    });
  };

  return (
    <View>
      <TextField label="Full Name" value={v.displayName} onChangeText={(t) => set('displayName', t)} placeholder="Ahmed Khan" error={errors.displayName} />
      <TextField
        label="Email"
        value={v.email}
        onChangeText={(t) => set('email', t)}
        placeholder="ahmed@mountainbakes.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        error={errors.email}
      />
      <TextField label="Phone" value={v.phone} onChangeText={(t) => set('phone', t)} placeholder="03001234567" keyboardType="phone-pad" error={errors.phone} />
      <TextField
        label="Username"
        value={v.username}
        onChangeText={(t) => set('username', t)}
        placeholder="gulshan01"
        autoCapitalize="none"
        autoCorrect={false}
        error={errors.username}
      />
      <PasswordField
        label="Password"
        value={v.password}
        onChangeText={(t) => set('password', t)}
        placeholder="Min 8 characters"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="new-password"
        textContentType="newPassword"
        error={errors.password}
      />
      <FieldLabel text="Role" />
      <Dropdown<UserRole>
        options={CREATE_ROLE_OPTIONS}
        value={v.role}
        onChange={(role) => setV((p) => ({ ...p, role, branchId: isBranchRole(role) ? p.branchId : null }))}
      />
      {isBranchRole(v.role) ? (
        <>
          <FieldLabel text="Branch" />
          <Dropdown options={branches.options} value={v.branchId} onChange={(id) => set('branchId', id)} placeholder="Select branch" loading={branches.loading} />
        </>
      ) : null}
      <Buttons busy={create.isPending} label="Create User" onCancel={onClose} onSave={save} />
    </View>
  );
}

/** Web `EditUserDialog`: name, phone, status, role and branch, sent together. */
function EditUserForm({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const update = useUpdateUser();
  const branches = useBranchOptions();
  const [displayName, setDisplayName] = useState(user.displayName ?? '');
  const [phone, setPhone] = useState(user.phone ?? '');
  const [role, setRole] = useState<UserRole>(user.role);
  const [branchId, setBranchId] = useState<string | null>(user.branchId);
  const [status, setStatus] = useState<AdminUserStatus>(user.status);
  const [errors, setErrors] = useState<FieldErrors<EditUserField>>({});

  const save = () => {
    const found = validateEditUser({ displayName, phone });
    setErrors(found);
    if (Object.keys(found).length) return;
    update.mutate(
      { id: user.id, input: editUserBody({ displayName, phone, role, branchId, status }) },
      {
        onSuccess: () => {
          Alert.alert('User Updated', 'User updated');
          onClose();
        },
        onError: (e) => Alert.alert('Could Not Update User', mapErrorToMessage(e)),
      },
    );
  };

  return (
    <View>
      <TextField label="Full Name" value={displayName} onChangeText={setDisplayName} error={errors.displayName} />
      <TextField label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" error={errors.phone} />
      <FieldLabel text="Status" />
      <Dropdown<AdminUserStatus> options={USER_STATUS_OPTIONS} value={status} onChange={setStatus} />
      <FieldLabel text="Role" />
      <Dropdown<UserRole>
        options={editRoleOptions(user.role)}
        value={role}
        onChange={(r) => {
          setRole(r);
          if (!isBranchRole(r)) setBranchId(null);
        }}
      />
      {isBranchRole(role) ? (
        <>
          <FieldLabel text="Branch" />
          <Dropdown options={branches.options} value={branchId} onChange={setBranchId} placeholder="Select branch" loading={branches.loading} />
        </>
      ) : null}
      <Buttons busy={update.isPending} label="Save" onCancel={onClose} onSave={save} />
    </View>
  );
}

function ToggleRow({ label, desc, value, onChange }: { label: string; desc: string; value: boolean; onChange: (v: boolean) => void }) {
  const theme = useAppTheme();
  return (
    <View style={styles.toggle}>
      <View style={{ flex: 1 }}>
        <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '700' }]}>{label}</Text>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{desc}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} accessibilityLabel={label} trackColor={{ true: theme.colors.primary, false: theme.colors.cardBorder }} />
    </View>
  );
}

/**
 * Web `ResetPasswordDialog`. A temporary password comes back once and is
 * shown here, selectable, until Done — it is never stored or logged.
 */
function ResetPasswordForm({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const theme = useAppTheme();
  const reset = useResetUserPassword();
  const [generateTemp, setGenerateTemp] = useState(true);
  const [sendEmail, setSendEmail] = useState(false);
  const [forceChange, setForceChange] = useState(true);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const save = () => {
    const problem = resetPasswordProblem(generateTemp, sendEmail);
    if (problem) {
      Alert.alert('Choose One', problem);
      return;
    }
    reset.mutate(
      { id: user.id, input: { generateTemp, sendEmail, forceChange } },
      {
        onSuccess: (res) => {
          const outcome = resetPasswordOutcome(res, sendEmail);
          Alert.alert(outcome.warning ? 'Password Reset, No Email Sent' : 'Password Reset', outcome.message);
          if (res.tempPassword) setTempPassword(res.tempPassword);
          else onClose();
        },
        onError: (e) => Alert.alert('Could Not Reset the Password', mapErrorToMessage(e)),
      },
    );
  };

  return (
    <View>
      <UserHead user={user} />
      {tempPassword ? (
        <View>
          <View style={[styles.reveal, { borderColor: theme.colors.warning, backgroundColor: `${theme.colors.warning}14`, borderRadius: theme.radii.md }]}>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
              Temporary password (shown once — copy it now and share it securely):
            </Text>
            <Text selectable style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700', marginTop: 6 }, MONO]}>
              {tempPassword}
            </Text>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 6 }]}>Press and hold the password to copy it.</Text>
          </View>
          <View style={styles.buttons}>
            <View style={{ flex: 1 }}>
              <PrimaryButton label="Done" onPress={onClose} />
            </View>
          </View>
        </View>
      ) : (
        <View>
          <ToggleRow label="Generate temporary password" desc="Sets a new random password immediately." value={generateTemp} onChange={setGenerateTemp} />
          <ToggleRow label="Send reset email" desc="Emails the user a password-reset link." value={sendEmail} onChange={setSendEmail} />
          <ToggleRow label="Force change on next login" desc="User must set a new password before using the app." value={forceChange} onChange={setForceChange} />
          <Buttons busy={reset.isPending} label="Save" onCancel={onClose} onSave={save} />
        </View>
      )}
    </View>
  );
}

/**
 * Web `ChangeEmailDialog`: the fields, then a review of exactly what will be
 * sent. A refusal from the server goes back to the fields with its reason.
 */
function ChangeEmailForm({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const theme = useAppTheme();
  const change = useChangeUserEmail();
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<FieldErrors<ChangeEmailField>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, setPending] = useState<ChangeUserEmailInput | null>(null);
  const branch = user.branchName || 'No branch';
  const name = user.displayName || user.email;

  const edit = (field: ChangeEmailField, setter: (t: string) => void) => (t: string) => {
    setter(t);
    setServerError(null);
    if (errors[field]) setErrors((p) => ({ ...p, [field]: undefined }));
  };

  const review = () => {
    const result = validateChangeEmail({ email, confirmEmail, reason }, user.email);
    if ('errors' in result) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setServerError(null);
    setPending(result.input);
  };

  const confirm = () => {
    if (!pending || change.isPending) return;
    change.mutate(
      { id: user.id, input: pending },
      {
        onSuccess: (res) => {
          Alert.alert(`Email address updated successfully for ${name}.`, `They now sign in with ${res.email}.`);
          onClose();
        },
        onError: (e) => {
          setServerError(mapErrorToMessage(e));
          setPending(null);
        },
      },
    );
  };

  if (pending) {
    return (
      <View>
        <View style={[styles.head, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radii.md, gap: 8 }]}>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.text }]}>
            Change the sign-in email for <Text style={{ fontWeight: '700' }}>{name}</Text> (<Text style={{ fontWeight: '700' }}>{branch}</Text>)?
          </Text>
          <View style={styles.inline}>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary, textDecorationLine: 'line-through' }]}>{user.email}</Text>
            <Icon name="chevron-right" size={13} color={theme.colors.textSecondary} />
            <Text style={[theme.typography.label, { color: theme.colors.text, fontWeight: '700' }]}>{pending.email}</Text>
          </View>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
            From now on they sign in with the new address. The old one stops working for sign-in straight away.
          </Text>
        </View>
        <Buttons busy={change.isPending} label="Yes, change email" cancelLabel="Back" onCancel={() => setPending(null)} onSave={confirm} />
      </View>
    );
  }

  return (
    <View>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
        The same account, with a new sign-in address. The password, branch and all existing records stay as they are.
      </Text>
      <View style={[styles.head, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radii.md, marginTop: 10 }]}>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>User · Branch</Text>
        <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '700' }]} numberOfLines={1}>
          {name} · {branch}
        </Text>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 6 }]}>Current email address</Text>
        <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>{user.email}</Text>
      </View>
      <TextField
        label="New email address"
        value={email}
        onChangeText={edit('email', setEmail)}
        placeholder="name@mountainbakes.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        error={errors.email}
      />
      <TextField
        label="Confirm new email address"
        value={confirmEmail}
        onChangeText={edit('confirmEmail', setConfirmEmail)}
        placeholder="Type it again"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        error={errors.confirmEmail}
      />
      <TextField
        label="Reason (optional)"
        value={reason}
        onChangeText={edit('reason', setReason)}
        placeholder="Saved with the change in User Activity"
        multiline
        maxLength={300}
        error={errors.reason}
      />
      {serverError ? (
        <View style={[styles.serverError, { borderColor: `${theme.colors.danger}55`, backgroundColor: `${theme.colors.danger}14`, borderRadius: theme.radii.md }]}>
          <Text accessibilityRole="alert" style={[theme.typography.bodySmall, { color: theme.colors.danger }]}>
            {serverError}
          </Text>
        </View>
      ) : null}
      <Buttons busy={false} label="Confirm Email Change" onCancel={onClose} onSave={review} />
    </View>
  );
}

export type UserSheet = { kind: 'create' } | { kind: 'edit'; user: AdminUser } | { kind: 'reset'; user: AdminUser } | { kind: 'email'; user: AdminUser };

const TITLE: Record<UserSheet['kind'], string> = {
  create: 'Create User',
  edit: 'Edit user',
  reset: 'Reset password',
  email: 'Change email address',
};

/**
 * One bottom sheet for every Users form. `open(sheet)` presents it; the form
 * is mounted only while it is open, so each opening starts clean — and a
 * revealed temporary password is gone the moment the sheet closes.
 */
export function useUserSheet() {
  const ref = useRef<BottomSheetModal>(null);
  const [sheet, setSheet] = useState<UserSheet | null>(null);
  const close = () => ref.current?.dismiss();

  const open = (next: UserSheet) => {
    setSheet(next);
    ref.current?.present();
  };

  const element = (
    <FormBottomSheet
      ref={ref}
      title={sheet ? TITLE[sheet.kind] : ''}
      subtitle={sheet?.kind === 'reset' ? 'Reset this user’s password and (optionally) email them a link.' : undefined}
      onRequestClose={close}
      onDismiss={() => setSheet(null)}>
      {sheet?.kind === 'create' ? <CreateUserForm onClose={close} /> : null}
      {sheet?.kind === 'edit' ? <EditUserForm user={sheet.user} onClose={close} /> : null}
      {sheet?.kind === 'reset' ? <ResetPasswordForm user={sheet.user} onClose={close} /> : null}
      {sheet?.kind === 'email' ? <ChangeEmailForm user={sheet.user} onClose={close} /> : null}
    </FormBottomSheet>
  );

  return { open, element };
}

const styles = StyleSheet.create({
  head: { borderWidth: 1, padding: 12 },
  inline: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 18 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 },
  reveal: { borderWidth: 1, padding: 12, marginTop: 14 },
  serverError: { borderWidth: 1, padding: 10, marginTop: 10 },
});
