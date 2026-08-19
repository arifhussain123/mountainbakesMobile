import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  MBButton,
  MBCard,
  MBCheckbox,
  MBErrorState,
  MBHeader,
  MBInput,
  MBSkeletonList,
} from '@/components';
import { useSettings } from '@/hooks/useCatalog';
import { useUpdateSettings } from '@/hooks/useSettingsAdmin';
import type { UpdateSettingsInput } from '@/shared/schemas/settings.schemas';
import { UpdateSettingsSchema } from '@/shared/schemas/settings.schemas';
import type { AppSettings } from '@/shared/types/settings.types';
import { useTheme } from '@/theme/ThemeProvider';
import { contentColumn, space } from '@/theme/spacing';

/**
 * Business settings.
 *
 * ---------------------------------------------------------------------------
 * Only what changed is sent
 * ---------------------------------------------------------------------------
 * `PUT /api/settings` writes exactly the fields present in the body, merging
 * them into a singleton row. Sending the whole object would therefore write back
 * every value this screen happened to load — silently reverting another admin's
 * edit to a section nobody here touched. The draft is diffed against what the
 * server last returned and only the difference is submitted.
 *
 * ---------------------------------------------------------------------------
 * These values are not cosmetic
 * ---------------------------------------------------------------------------
 * `gstRate` and `gstEnabled` decide the tax on every sale in every branch, and
 * `currencySymbol` renders on every receipt. Saving is confirmed rather than
 * immediate, and validation runs against the SAME schema the server validates
 * with — `UpdateSettingsSchema`, from the mirrored `src/shared` — so a rate of
 * 120% is refused here with the server's own message rather than after a
 * round trip.
 *
 * The 2 AM business-day rollover is NOT here and cannot be: it is a fixed
 * constant in `@mb/shared/utils/timezone`, relied on by the device, the server
 * and every report. The hours below drive order-window enforcement and the
 * automatic closing job, which is a different thing.
 */

/** The fields this screen edits, in the order they are shown. */
const TEXT_FIELDS = [
  { key: 'companyName', label: 'Company name' },
  { key: 'currency', label: 'Currency code', hint: 'e.g. PKR' },
  { key: 'currencySymbol', label: 'Currency symbol', hint: 'Shown on every receipt' },
  { key: 'receiptFooter', label: 'Receipt footer' },
] as const;

const TIME_FIELDS = [
  { key: 'businessStartTime', label: 'Business opens' },
  { key: 'businessClosingTime', label: 'Business closes' },
  { key: 'orderStartTime', label: 'Orders open' },
  { key: 'orderEndTime', label: 'Orders close' },
] as const;

const TOGGLES = [
  { key: 'gstEnabled', label: 'Charge GST', hint: 'Applied to the net subtotal, after discount' },
  { key: 'autoCloseBusiness', label: 'Close the business day automatically' },
  { key: 'autoStockClosing', label: 'Close stock automatically' },
  {
    key: 'closingNotificationsEnabled',
    label: 'Send closing summaries',
    hint: 'The 2 AM WhatsApp/SMS summary',
  },
  {
    key: 'orderConfirmationsEnabled',
    label: 'Send order confirmations',
    hint: 'Bills real messages to real customer numbers',
  },
  {
    key: 'eventNotificationsEnabled',
    label: 'Send event reminders',
    hint: 'Scheduled Special Event reminders',
  },
] as const;

type Draft = Partial<UpdateSettingsInput>;

export function SettingsScreen(): React.ReactElement {
  const theme = useTheme();
  const settings = useSettings();
  const update = useUpdateSettings();

  const [draft, setDraft] = useState<Draft>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Discard local edits whenever the server's copy changes underneath, so the
  // screen never shows a draft built on a value that has since moved.
  useEffect(() => {
    setDraft({});
    setErrors({});
  }, [settings.dataUpdatedAt]);

  const saved = settings.data;

  const valueOf = useCallback(
    <K extends keyof AppSettings>(key: K): AppSettings[K] | undefined =>
      (draft as Partial<AppSettings>)[key] ?? saved?.[key],
    [draft, saved],
  );

  const setField = useCallback((key: string, value: unknown) => {
    setDraft(prev => ({ ...prev, [key]: value }));
  }, []);

  /**
   * The diff, which is what gets sent.
   *
   * A field the user typed into and then restored is not a change, so it is
   * dropped here rather than written back identically — a no-op PUT still counts
   * as an edit in the audit trail and still invalidates every cached settings
   * read in the app.
   */
  const patch = useMemo(() => {
    if (!saved) return {};
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(draft)) {
      if (value !== undefined && value !== (saved as unknown as Record<string, unknown>)[key]) {
        out[key] = value;
      }
    }
    return out;
  }, [draft, saved]);

  const dirty = Object.keys(patch).length > 0;

  const onSave = useCallback(() => {
    // The server's own schema, so a bad value is refused with the server's
    // message before a request is made.
    const parsed = UpdateSettingsSchema.safeParse(patch);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (typeof field === 'string') next[field] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});

    Alert.alert(
      'Save these settings?',
      'They apply to every branch immediately, including the tax on new sales.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: () =>
            update.mutate(parsed.data, {
              onSuccess: () => setDraft({}),
              onError: error =>
                Alert.alert(
                  'Not saved',
                  error instanceof Error
                    ? error.message
                    : 'The settings were not changed. Try again.',
                ),
            }),
        },
      ],
    );
  }, [patch, update]);

  if (settings.isPending) return <MBSkeletonList rows={8} />;
  if (settings.isError) {
    return (
      <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
        <MBHeader title="Settings" />
        <MBErrorState
          error={settings.error}
          onRetry={settings.refetch}
          retrying={settings.isFetching}
        />
      </View>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader
        title="Settings"
        subtitle={dirty ? 'Unsaved changes' : 'Applies to every branch'}
      />

      <ScrollView
        contentContainerStyle={[
          contentColumn,
          { padding: theme.layout.screenPad, gap: theme.space.md, paddingBottom: space.xxl },
        ]}
        keyboardShouldPersistTaps="handled">
        <Section title="Business">
          {TEXT_FIELDS.map(field => (
            <MBInput
              key={field.key}
              label={field.label}
              hint={'hint' in field ? field.hint : undefined}
              value={String(valueOf(field.key) ?? '')}
              onChangeText={text => setField(field.key, text)}
              error={errors[field.key]}
              testID={`setting-${field.key}`}
            />
          ))}
        </Section>

        <Section title="Tax">
          <MBInput
            label="GST rate (%)"
            numeric
            keyboardType="decimal-pad"
            hint="Whole percent, e.g. 17"
            value={String(valueOf('gstRate') ?? 0)}
            onChangeText={text => setField('gstRate', Number(text.replace(/[^0-9.]/g, '')) || 0)}
            error={errors.gstRate}
            testID="setting-gstRate"
          />
        </Section>

        <Section title="Hours">
          {TIME_FIELDS.map(field => (
            <MBInput
              key={field.key}
              label={field.label}
              hint="24-hour, HH:mm"
              placeholder="08:00"
              value={String(valueOf(field.key) ?? '')}
              onChangeText={text => setField(field.key, text)}
              error={errors[field.key]}
              testID={`setting-${field.key}`}
            />
          ))}
        </Section>

        <Section title="Automation and messages">
          {TOGGLES.map(toggle => (
            <MBCheckbox
              key={toggle.key}
              label={toggle.label}
              hint={'hint' in toggle ? toggle.hint : undefined}
              checked={Boolean(valueOf(toggle.key))}
              onChange={next => setField(toggle.key, next)}
              testID={`setting-${toggle.key}`}
            />
          ))}
        </Section>

        <MBButton
          label={dirty ? 'Save changes' : 'No changes'}
          onPress={onSave}
          disabled={!dirty}
          loading={update.isPending}
          testID="save-settings"
        />
      </ScrollView>
    </View>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): React.ReactElement {
  const theme = useTheme();
  return (
    <MBCard>
      <Text style={[theme.type.label, { color: theme.colors.textMuted, marginBottom: space.sm }]}>
        {title}
      </Text>
      <View style={{ gap: theme.space.md }}>{children}</View>
    </MBCard>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
