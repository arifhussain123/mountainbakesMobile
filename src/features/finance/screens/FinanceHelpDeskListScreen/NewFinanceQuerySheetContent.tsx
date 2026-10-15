import { useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import {
  FINANCE_QUERY_TYPES,
  FINANCE_QUERY_TYPE_LABELS,
  generateIdempotencyKey,
  useCreateFinanceTicket,
  useLookupFinanceTicketReference,
  type FinanceQueryType,
  type FinanceTicketReferenceLookup,
} from '@/api';
import { useAppTheme } from '@/shared/theme';
import { PrimaryButton, SecondaryButton } from '@/shared/ui';
import { mapErrorToMessage } from '@/shared/helpers';
import { styles } from './styles';

export interface NewFinanceQuerySheetContentProps {
  onClose: () => void;
  onCreated: () => void;
}

/** mountainbakesFinance.html screen 22 — Finance New Query. Reference-first: the server auto-fills subject/queryType/amount from the resolved record when one is found. */
export function NewFinanceQuerySheetContent({ onClose, onCreated }: NewFinanceQuerySheetContentProps) {
  const theme = useAppTheme();
  const lookup = useLookupFinanceTicketReference();
  const create = useCreateFinanceTicket();
  const keyRef = useRef(generateIdempotencyKey('finance_ticket'));

  const [referenceNo, setReferenceNo] = useState('');
  const [reference, setReference] = useState<FinanceTicketReferenceLookup | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [queryType, setQueryType] = useState<FinanceQueryType>('other');
  const [description, setDescription] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleFind = () => {
    if (!referenceNo.trim()) return;
    setLookupError(null);
    lookup.mutate(referenceNo.trim(), {
      onSuccess: (ref) => setReference(ref),
      onError: (e) => {
        setReference(null);
        setLookupError(mapErrorToMessage(e));
      },
    });
  };

  const canSubmit = description.trim().length >= 3 && (!!reference || (subject.trim().length >= 3 && !!queryType));

  const handleSubmit = async (asDraft: boolean) => {
    if (!canSubmit) return;
    setSubmitError(null);
    try {
      await create.mutateAsync({
        input: {
          referenceNo: reference ? reference.referenceNo : undefined,
          subject: reference ? undefined : subject.trim(),
          queryType: reference ? undefined : queryType,
          description: description.trim(),
          draft: asDraft,
        },
        idempotencyKey: keyRef.current,
      });
      onCreated();
      onClose();
    } catch (error) {
      setSubmitError(mapErrorToMessage(error));
    }
  };

  return (
    <View>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
        Search a ledger voucher (RV-/PV-/FV-…), branch income (INC-…), transaction (FTX-…), salary (SAL-…), advance (ADV-…), partner expense (PEX-…), branch share
        (BSP-…), sale (MB-…) or cash transfer (CT-…) ID. Its details load automatically — or describe the issue without one.
      </Text>

      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.md }]}>REFERENCE ID (OPTIONAL)</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
        <TextInput
          value={referenceNo}
          onChangeText={setReferenceNo}
          autoCapitalize="characters"
          placeholder="e.g. PV-000012"
          placeholderTextColor={theme.colors.textSecondary}
          style={[styles.input, { flex: 1, borderColor: theme.colors.primary, color: theme.colors.text }]}
        />
        <Pressable
          onPress={handleFind}
          disabled={lookup.isPending || !referenceNo.trim()}
          style={{ height: 46, paddingHorizontal: 16, borderRadius: 12, backgroundColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '700' }]}>{lookup.isPending ? '…' : 'Find'}</Text>
        </Pressable>
      </View>

      {lookupError ? <Text style={[theme.typography.bodySmall, { color: theme.colors.danger, marginTop: 8 }]}>{lookupError}</Text> : null}

      {reference ? (
        <View style={{ marginTop: theme.spacing.md, borderRadius: theme.radii.md, borderWidth: 1, borderColor: theme.colors.border, padding: 12 }}>
          <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>{reference.label}</Text>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 2 }]}>{reference.referenceNo}</Text>
        </View>
      ) : (
        <View>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.md }]}>SUBJECT</Text>
          <TextInput
            value={subject}
            onChangeText={setSubject}
            placeholder="Short summary"
            placeholderTextColor={theme.colors.textSecondary}
            style={[styles.input, { marginTop: 6, borderColor: theme.colors.border, color: theme.colors.text }]}
          />
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.md }]}>QUERY TYPE</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
            {FINANCE_QUERY_TYPES.map((t) => {
              const active = t === queryType;
              return (
                <Pressable
                  key={t}
                  onPress={() => setQueryType(t)}
                  style={{
                    height: 30,
                    paddingHorizontal: 10,
                    borderRadius: 15,
                    borderWidth: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                    borderColor: theme.colors.border,
                  }}>
                  <Text style={[theme.typography.label, { color: active ? theme.colors.primaryText : theme.colors.text }]}>{FINANCE_QUERY_TYPE_LABELS[t]}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.md }]}>DESCRIBE THE ISSUE</Text>
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder="What went wrong?"
        placeholderTextColor={theme.colors.textSecondary}
        multiline
        style={[styles.input, { marginTop: 6, height: 90, paddingTop: 10, borderColor: theme.colors.border, color: theme.colors.text }]}
      />

      {submitError ? <Text style={[theme.typography.bodySmall, { color: theme.colors.danger, marginTop: theme.spacing.md }]}>{submitError}</Text> : null}

      <View style={[styles.actionsRow, { marginTop: theme.spacing.lg }]}>
        <View style={{ flex: 1 }}>
          <SecondaryButton label="Save as Draft" onPress={() => void handleSubmit(true)} loading={create.isPending} disabled={!canSubmit} />
        </View>
        <View style={{ flex: 1.3 }}>
          <PrimaryButton label="Submit to Admin" onPress={() => void handleSubmit(false)} loading={create.isPending} disabled={!canSubmit} />
        </View>
      </View>
    </View>
  );
}
