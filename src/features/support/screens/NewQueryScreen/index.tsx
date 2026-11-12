import { useRef } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { goBack, openQueryDetail, Routes, type RootStackParamList } from '@/navigation';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, InfoBanner, PrimaryButton, Screen, SecondaryButton } from '@/shared/ui';
import { IssueStarterChips, RecentRecordsSheet, RecordPreview, ReferenceIdField } from '../../components';
import { useNewQueryForm } from '../../hooks';
import { ISSUE_MESSAGE_MIN_LENGTH } from '../../schemas';

/** branchApp.md screen 25 — New Query, as its own pushed/modal screen (promoted from the earlier bottom-sheet MVP so it can hold a lookup preview, "Pick from recent" and issue-starter chips without feeling cramped). */
export function NewQueryScreen() {
  const theme = useAppTheme();
  const route = useRoute<RouteProp<RootStackParamList, typeof Routes.NEW_QUERY>>();
  const recentSheetRef = useRef<BottomSheetModal>(null);
  const form = useNewQueryForm({ prefillReferenceId: route.params?.prefillReferenceId });

  const hasUnsavedInput = form.referenceId.trim().length > 0 || form.message.trim().length > 0;

  const handleCancel = () => {
    if (!hasUnsavedInput) {
      goBack();
      return;
    }
    Alert.alert('Discard this query?', "You've started typing — this won't be saved.", [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: goBack },
    ]);
  };

  const handleSubmit = async () => {
    const ok = await form.submit();
    if (ok) {
      Alert.alert('Query Sent', 'Your query has been sent to Admin.', [{ text: 'OK', onPress: goBack }]);
    }
  };

  const fieldBorder = theme.isDark ? theme.colors.border : '#E6E1FA';

  return (
    // 2026 redesign B25: the New query sheet's pale lavender surface (light); dark keeps the app background.
    <Screen glow="none" style={theme.isDark ? undefined : { backgroundColor: SHEET_BG }}>
      <AppHeader title="New query" actions={[{ icon: 'close', onPress: handleCancel, accessibilityLabel: 'Cancel' }]} />
      <ScrollView style={styles.flex} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={[styles.p, { color: theme.colors.textSecondary }]}>
          Search a record's ID — its details load automatically, so admin sees exactly what you mean.
        </Text>

        <ReferenceIdField
          value={form.referenceId}
          onChangeText={form.setReferenceId}
          onFind={() => void form.lookup()}
          onOpenRecent={() => recentSheetRef.current?.present()}
          isLookingUp={form.isLookingUp}
          error={form.lookupError ?? undefined}
        />

        {form.duplicateTicket ? (
          <InfoBanner kind="warn">
            <Text style={[styles.bannerText, { color: theme.colors.warning }]}>
              You already have an open query on {form.duplicateTicket.referenceId}.
            </Text>
            <Pressable accessibilityRole="button" onPress={() => openQueryDetail(form.duplicateTicket!.id)} style={styles.bannerLink}>
              <Text style={[styles.link, { color: theme.colors.primary }]}>Open existing query</Text>
            </Pressable>
          </InfoBanner>
        ) : null}

        {form.reference ? <RecordPreview reference={form.reference} announceOnMount /> : null}

        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
            Describe the issue<Text style={{ color: theme.colors.danger }}> *</Text>
          </Text>
          <IssueStarterChips onPick={(starter) => form.setMessage(form.message ? `${form.message} ${starter}` : starter)} />
          <TextInput
            value={form.message}
            onChangeText={form.setMessage}
            placeholder="What looks wrong with this record?"
            placeholderTextColor={theme.colors.textFaint}
            multiline
            accessibilityLabel="Describe the issue"
            style={[styles.area, { borderColor: fieldBorder, backgroundColor: theme.colors.cardFill, color: theme.colors.text }]}
          />
          <Text style={[styles.help, { color: theme.colors.textFaint }]}>
            {form.message.trim().length}/{ISSUE_MESSAGE_MIN_LENGTH} minimum
          </Text>
        </View>

        {form.submitError ? <InfoBanner kind="bad">{form.submitError}</InfoBanner> : null}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: theme.colors.border, backgroundColor: theme.isDark ? theme.colors.background : theme.colors.surface }]}>
        <View style={styles.flex}>
          <SecondaryButton label="Cancel" onPress={handleCancel} />
        </View>
        <View style={styles.flex}>
          <PrimaryButton label="Submit to admin" onPress={() => void handleSubmit()} loading={form.isSubmitting} disabled={!form.canSubmit} />
        </View>
      </View>

      <RecentRecordsSheet
        ref={recentSheetRef}
        onPick={(referenceId) => {
          form.setReferenceId(referenceId);
          recentSheetRef.current?.dismiss();
          void form.lookup(referenceId);
        }}
        onRequestClose={() => recentSheetRef.current?.dismiss()}
      />
    </Screen>
  );
}

const SHEET_BG = '#F7F5FF';

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { paddingHorizontal: 20, paddingBottom: 24, gap: 14 },
  p: { fontSize: 15, lineHeight: 21 },
  bannerText: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  bannerLink: { marginTop: 4, minHeight: 36, justifyContent: 'center' },
  link: { fontSize: 13, fontWeight: '700' },
  field: { gap: 8 },
  label: { fontSize: 12, lineHeight: 16, fontWeight: '700' },
  area: { minHeight: 110, borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 12, fontSize: 15, textAlignVertical: 'top' },
  help: { fontSize: 12, lineHeight: 17 },
  footer: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, borderTopWidth: 1 },
});
