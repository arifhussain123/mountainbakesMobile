import { memo } from 'react';
import { Linking, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import type { NotificationLog, NotificationRecipient } from '@/api';
import { useAppTheme } from '@/shared/theme';
import { Card, Icon } from '@/shared/ui';
import { ActionChip } from '@/features/admin/components';
import { formatPkMobile, spokenPhone } from '../utils/phone';
import { CHANNEL_LABEL, channelFlags, deliveryLabel, receivesLine } from '../utils/recipientRules';

export interface RecipientCardProps {
  recipient: NotificationRecipient;
  lastLog: NotificationLog | undefined;
  toggling: boolean;
  onToggleActive: (active: boolean) => void;
  onEdit: () => void;
  /** The web row's Remove (trash) button; the screen confirms first. Absent = not offered (offline copy). */
  onRemove?: () => void;
  removing?: boolean;
}

export const RecipientCard = memo(function RecipientCard({ recipient: r, lastLog, toggling, onToggleActive, onEdit, onRemove, removing }: RecipientCardProps) {
  const theme = useAppTheme();
  const flags = channelFlags(r.channel);
  const channels = (['sms', 'whatsapp'] as const).filter((c) => flags[c]);
  const last = lastLog ? deliveryLabel(lastLog) : 'Nothing sent yet';
  const lastColor = lastLog?.status === 'failed' ? theme.colors.danger : theme.colors.textSecondary;

  return (
    <Card style={[styles.card, !r.active && { opacity: 0.6 }]}>
      <View style={styles.head}>
        <Pressable
          style={{ flex: 1 }}
          onPress={onEdit}
          accessibilityRole="button"
          accessibilityLabel={`${r.recipientName}, receives ${receivesLine(r)}, ${channels.map((c) => CHANNEL_LABEL[c]).join(' and ')}, ${r.active ? 'active' : 'inactive'}, last: ${last}. Edit`}>
          <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>{r.recipientName}</Text>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 2 }]}>Receives: {receivesLine(r)}</Text>
        </Pressable>
        <View style={styles.toggle}>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{r.active ? 'Active' : 'Off'}</Text>
          <Switch
            value={r.active}
            disabled={toggling}
            onValueChange={onToggleActive}
            accessibilityLabel={`${r.active ? 'Deactivate' : 'Activate'} ${r.recipientName}`}
            trackColor={{ true: theme.colors.primary, false: theme.colors.cardBorder }}
          />
        </View>
      </View>

      <Pressable
        onPress={() => void Linking.openURL(`tel:${r.mobileNumber}`)}
        accessibilityRole="link"
        accessibilityLabel={`Call ${spokenPhone(r.mobileNumber)}`}
        style={styles.phone}>
        <Icon name="user" size={13} color={theme.colors.primary} />
        <Text style={[theme.typography.bodySmall, { color: theme.colors.primary, fontWeight: '700' }]}>{formatPkMobile(r.mobileNumber)}</Text>
      </Pressable>

      <View style={styles.chips}>
        {channels.map((c) => (
          <View key={c} style={[styles.chip, { borderColor: theme.colors.cardBorder }]}>
            <Text style={[theme.typography.label, { color: theme.colors.text, fontWeight: '600' }]}>{CHANNEL_LABEL[c]}</Text>
          </View>
        ))}
      </View>
      <View style={styles.foot}>
        <Text style={[theme.typography.label, { color: lastColor, flex: 1 }]}>Last: {last}</Text>
        {onRemove ? <ActionChip icon="trash" label="Remove" danger onPress={onRemove} loading={removing} /> : null}
      </View>
    </Card>
  );
});

const styles = StyleSheet.create({
  card: { marginBottom: 10 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  toggle: { alignItems: 'center', gap: 2 },
  phone: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, minHeight: 32, alignSelf: 'flex-start' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  chip: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  foot: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
});
