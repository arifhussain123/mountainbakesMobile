import { useRef } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { goBack, openQueryDetail, Routes, type RootStackParamList } from '@/navigation';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, PillButton, Screen } from '@/shared/ui';
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

  return (
    <Screen>
      <AppHeader title="New Query" actions={[{ icon: 'close', onPress: handleCancel, accessibilityLabel: 'Cancel' }]} />
      <View style={{ flex: 1, paddingHorizontal: theme.spacing.lg }}>
        <ReferenceIdField
          value={form.referenceId}
          onChangeText={form.setReferenceId}
          onFind={() => void form.lookup()}
          onOpenRecent={() => recentSheetRef.current?.present()}
          isLookingUp={form.isLookingUp}
          error={form.lookupError ?? undefined}
        />

        {form.duplicateTicket ? (
          <View style={{ marginTop: 10, padding: theme.spacing.md, borderRadius: theme.radii.md, borderWidth: 1, borderColor: theme.colors.warning, backgroundColor: `${theme.colors.warning}1A` }}>
            <Text style={[theme.typography.bodySmall, { color: theme.colors.warning, fontWeight: '700' }]}>
              You already have an open query on {form.duplicateTicket.referenceId}.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => openQueryDetail(form.duplicateTicket!.id)}
              style={{ marginTop: 8, minHeight: 36, justifyContent: 'center' }}>
              <Text style={[theme.typography.bodySmall, { color: theme.colors.primary, fontWeight: '700' }]}>Open existing query</Text>
            </Pressable>
          </View>
        ) : null}

        {form.reference ? <RecordPreview reference={form.reference} announceOnMount /> : null}

        <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.lg, fontWeight: '700' }]}>
          DESCRIBE THE ISSUE
        </Text>
        <View style={{ marginTop: 8 }}>
          <IssueStarterChips onPick={(starter) => form.setMessage(form.message ? `${form.message} ${starter}` : starter)} />
        </View>
        <TextInput
          value={form.message}
          onChangeText={form.setMessage}
          placeholder="What looks wrong with this record?"
          placeholderTextColor={theme.colors.textFaint}
          multiline
          accessibilityLabel="Describe the issue"
          style={{
            marginTop: 10,
            minHeight: 110,
            borderWidth: 1,
            borderRadius: theme.radii.lg,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.cardFill,
            color: theme.colors.text,
            padding: 12,
            textAlignVertical: 'top',
          }}
        />
        <Text style={[theme.typography.label, { color: theme.colors.textFaint, marginTop: 4 }]}>
          {form.message.trim().length}/{ISSUE_MESSAGE_MIN_LENGTH} minimum
        </Text>

        {form.submitError ? (
          <Text style={[theme.typography.bodySmall, { color: theme.colors.danger, marginTop: theme.spacing.md }]}>{form.submitError}</Text>
        ) : null}

        <View style={{ marginTop: theme.spacing.lg, marginBottom: theme.spacing.lg }}>
          <PillButton label="Submit to Admin" onPress={() => void handleSubmit()} loading={form.isSubmitting} disabled={!form.canSubmit} />
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
