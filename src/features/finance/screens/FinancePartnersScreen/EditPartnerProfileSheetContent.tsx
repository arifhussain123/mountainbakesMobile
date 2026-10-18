import { useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { generateIdempotencyKey, useUpdateFinancePartner, type FinancePartner, type PartnerType } from '@/api';
import { useAppTheme } from '@/shared/theme';
import { PrimaryButton } from '@/shared/ui';
import { mapErrorToMessage } from '@/shared/helpers';
import { styles } from './styles';

export interface EditPartnerProfileSheetContentProps {
  partner: FinancePartner;
  onClose: () => void;
}

/** mountainbakesFinance.html screen 14 — Partner Detail (profile fields; name/sharePct are fixed at seed time). */
export function EditPartnerProfileSheetContent({ partner, onClose }: EditPartnerProfileSheetContentProps) {
  const theme = useAppTheme();
  const update = useUpdateFinancePartner();
  const keyRef = useRef(generateIdempotencyKey(`finance_partner_${partner.id}`));

  const [fatherName, setFatherName] = useState(partner.fatherName ?? '');
  const [contactNumber, setContactNumber] = useState(partner.contactNumber ?? '');
  const [emergencyNumber, setEmergencyNumber] = useState(partner.emergencyNumber ?? '');
  const [address, setAddress] = useState(partner.address ?? '');
  const [partnerType, setPartnerType] = useState<PartnerType | null>(partner.partnerType);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSave = () => {
    setSubmitError(null);
    update.mutate(
      {
        id: partner.id,
        input: {
          fatherName: fatherName.trim() || null,
          contactNumber: contactNumber.trim() || null,
          emergencyNumber: emergencyNumber.trim() || null,
          address: address.trim() || null,
          partnerType,
        },
        idempotencyKey: keyRef.current,
      },
      { onSuccess: onClose, onError: (e) => setSubmitError(mapErrorToMessage(e)) },
    );
  };

  return (
    <View>
      <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>{partner.name}</Text>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 2 }]}>{partner.partnerCode} · {partner.sharePct}% share</Text>

      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.lg }]}>TYPE</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
        {(['founder', 'co_founder'] as PartnerType[]).map((t) => {
          const active = t === partnerType;
          return (
            <Pressable
              key={t}
              onPress={() => setPartnerType(t)}
              style={[styles.typeToggle, { backgroundColor: active ? theme.colors.primary : theme.colors.surface, borderColor: theme.colors.border }]}>
              <Text style={[theme.typography.body, { color: active ? theme.colors.primaryText : theme.colors.text, fontWeight: '600' }]}>
                {t === 'founder' ? 'Founder' : 'Co-Founder'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.md }]}>FATHER'S NAME</Text>
      <TextInput
        value={fatherName}
        onChangeText={setFatherName}
        placeholderTextColor={theme.colors.textSecondary}
        style={[styles.input, { marginTop: 6, borderColor: theme.colors.border, color: theme.colors.text }]}
      />

      <View style={{ flexDirection: 'row', gap: 10, marginTop: theme.spacing.md }}>
        <View style={{ flex: 1 }}>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>CONTACT</Text>
          <TextInput
            value={contactNumber}
            onChangeText={setContactNumber}
            keyboardType="phone-pad"
            placeholderTextColor={theme.colors.textSecondary}
            style={[styles.input, { marginTop: 6, borderColor: theme.colors.border, color: theme.colors.text }]}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>EMERGENCY</Text>
          <TextInput
            value={emergencyNumber}
            onChangeText={setEmergencyNumber}
            keyboardType="phone-pad"
            placeholderTextColor={theme.colors.textSecondary}
            style={[styles.input, { marginTop: 6, borderColor: theme.colors.border, color: theme.colors.text }]}
          />
        </View>
      </View>

      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.md }]}>ADDRESS</Text>
      <TextInput
        value={address}
        onChangeText={setAddress}
        multiline
        placeholderTextColor={theme.colors.textSecondary}
        style={[styles.input, { marginTop: 6, height: 60, paddingTop: 10, borderColor: theme.colors.border, color: theme.colors.text }]}
      />

      {submitError ? <Text style={[theme.typography.bodySmall, { color: theme.colors.danger, marginTop: theme.spacing.md }]}>{submitError}</Text> : null}

      <View style={{ marginTop: theme.spacing.xl }}>
        <PrimaryButton label="Save Details" onPress={handleSave} loading={update.isPending} />
      </View>
    </View>
  );
}
