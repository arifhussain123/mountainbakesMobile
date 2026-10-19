import { StyleSheet, Text, View } from 'react-native';
import type { MessagingProviderStatus } from '@/api';
import { useAppTheme } from '@/shared/theme';
import { Icon } from '@/shared/ui';

export interface ProviderBannerProps {
  provider: MessagingProviderStatus | undefined;
}

/**
 * Test mode is the server's log provider: every send is written to the server
 * log and recorded as "sent", but nothing reaches a phone. Said plainly
 * wherever a send is possible. While the status is unknown, nothing is claimed.
 */
export function ProviderBanner({ provider }: ProviderBannerProps) {
  const theme = useAppTheme();
  if (!provider) return null;

  if (!provider.live) {
    return (
      <View style={[styles.banner, { backgroundColor: `${theme.colors.warning}1A`, borderColor: theme.colors.warning }]} accessibilityRole="alert">
        <Icon name="warning" size={16} color={theme.colors.warning} />
        <View style={{ flex: 1 }}>
          <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>Test mode</Text>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.text, marginTop: 2 }]}>
            Messages are logged but not delivered. A server admin must add Twilio credentials.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.banner, { backgroundColor: `${theme.colors.success}1A`, borderColor: theme.colors.success }]}>
      <Icon name="check" size={16} color={theme.colors.success} />
      <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '700', flex: 1 }]}>
        Live · sending through {provider.provider === 'twilio' ? 'Twilio' : provider.provider} · up to {provider.retry.maxAttempts} attempts per message
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderWidth: 1, borderRadius: 12, padding: 12 },
});
