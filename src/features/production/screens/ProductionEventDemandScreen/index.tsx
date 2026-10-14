import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import {
  EVENT_STAGES,
  EVENT_STAGE_LABELS,
  useConsolidatedDemand,
  useEventDemands,
  useEventProductionStatus,
  useReviewEventDemand,
  useUpdateEventStage,
  type EventBranchDemand,
  type EventProductionStage,
} from '@/api';
import type { ProductionEventsStackParamList } from '@/navigation';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, Card, EmptyState, ErrorState, LoadingSkeleton, PrimaryButton, Screen, SecondaryButton, StatusBadge, type StatusVariant } from '@/shared/ui';
import { formatCurrency } from '@/shared/utils';
import { mapErrorToMessage } from '@/shared/helpers';
import { styles } from './styles';

const DEMAND_STATUS_LABEL: Record<EventBranchDemand['status'], string> = {
  draft: 'Draft',
  submitted: 'Awaiting Review',
  approved: 'Approved',
  rejected: 'Rejected',
  fulfilled: 'Fulfilled',
};

const DEMAND_STATUS_VARIANT: Record<EventBranchDemand['status'], StatusVariant> = {
  draft: 'neutral',
  submitted: 'warning',
  approved: 'success',
  rejected: 'danger',
  fulfilled: 'success',
};

const COMPLETION_STEPS = [0, 25, 50, 75, 100] as const;

/**
 * Production's own event detail — not a literal mountainbakesProduction.html frame
 * (screen 12 only shows the list + consolidation placeholder), but the screen that
 * frame's card taps into: review each branch's advance demand and track the four
 * manual preparation stages, using exactly the endpoints `mobile-production-plan.md`
 * confirmed for this role (`/:id/demands`, `/:id/demands/consolidated`,
 * `/:id/production-status`, `/demands/:demandId/review`).
 */
export function ProductionEventDemandScreen() {
  const theme = useAppTheme();
  const route = useRoute<RouteProp<ProductionEventsStackParamList, 'ProductionEventDemand'>>();
  const { eventId, eventName } = route.params;

  const demands = useEventDemands(eventId);
  const consolidated = useConsolidatedDemand(eventId);
  const production = useEventProductionStatus(eventId);
  const review = useReviewEventDemand(eventId);
  const updateStage = useUpdateEventStage(eventId);

  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const isLoading = demands.isLoading || consolidated.isLoading || production.isLoading;
  const firstError = demands.error ?? consolidated.error ?? production.error;

  const handleApprove = (demand: EventBranchDemand) => {
    setReviewingId(demand.id);
    review.mutate(
      { demandId: demand.id, input: { status: 'approved' } },
      { onSettled: () => setReviewingId(null), onError: (e) => Alert.alert('Could Not Approve', mapErrorToMessage(e)) },
    );
  };

  const handleReject = (demand: EventBranchDemand) => {
    Alert.alert('Reject Demand', `Reject ${demand.branchName ?? 'this branch'}'s advance demand?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: () => {
          setReviewingId(demand.id);
          review.mutate(
            { demandId: demand.id, input: { status: 'rejected' } },
            { onSettled: () => setReviewingId(null), onError: (e) => Alert.alert('Could Not Reject', mapErrorToMessage(e)) },
          );
        },
      },
    ]);
  };

  const handleSetStage = (stage: EventProductionStage, completionPercentage: number) => {
    updateStage.mutate(
      { stage, input: { completionPercentage } },
      { onError: (e) => Alert.alert('Could Not Update Stage', mapErrorToMessage(e)) },
    );
  };

  return (
    <Screen>
      <AppHeader title={eventName} subtitle="Branch demand & preparation" />
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg }}>
        {isLoading ? <LoadingSkeleton height={120} /> : null}
        {firstError ? <ErrorState message={mapErrorToMessage(firstError)} onRetry={() => { void demands.refetch(); void consolidated.refetch(); void production.refetch(); }} /> : null}

        {!isLoading && !firstError ? (
          <View style={{ gap: theme.spacing.lg }}>
            <View>
              <Text style={[theme.typography.sectionTitle, { color: theme.colors.text }]}>Preparation Stages</Text>
              <Card style={{ marginTop: theme.spacing.sm }}>
                {EVENT_STAGES.map((stage, index) => {
                  const row = production.data?.stages.find((s) => s.stage === stage);
                  const pct = row?.completionPercentage ?? 0;
                  return (
                    <View key={stage} style={index > 0 ? { marginTop: theme.spacing.md, paddingTop: theme.spacing.md, borderTopWidth: 1, borderTopColor: theme.colors.border } : undefined}>
                      <View style={styles.row}>
                        <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '600' }]}>{EVENT_STAGE_LABELS[stage]}</Text>
                        <Text style={[theme.typography.body, { color: theme.colors.primary, fontWeight: '700' }]}>{pct}%</Text>
                      </View>
                      <View style={[styles.progressTrack, { backgroundColor: theme.colors.border, borderRadius: theme.radii.pill }]}>
                        <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: theme.colors.primary, borderRadius: theme.radii.pill }]} />
                      </View>
                      <View style={[styles.stepsRow, { marginTop: theme.spacing.sm }]}>
                        {COMPLETION_STEPS.map((step) => {
                          const active = step === pct;
                          return (
                            <Pressable
                              key={step}
                              accessibilityRole="button"
                              onPress={() => handleSetStage(stage, step)}
                              disabled={updateStage.isPending}
                              style={[
                                styles.stepButton,
                                { backgroundColor: active ? theme.colors.primary : theme.colors.background, borderRadius: theme.radii.sm },
                              ]}>
                              <Text style={[theme.typography.label, { color: active ? theme.colors.primaryText : theme.colors.textSecondary }]}>{step}%</Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  );
                })}
              </Card>
            </View>

            <View>
              <Text style={[theme.typography.sectionTitle, { color: theme.colors.text }]}>Consolidated Demand</Text>
              {consolidated.data && consolidated.data.rows.length > 0 ? (
                <Card style={{ marginTop: theme.spacing.sm }}>
                  <View style={[styles.row, { paddingBottom: theme.spacing.sm, borderBottomWidth: 1, borderBottomColor: theme.colors.border }]}>
                    <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>PRODUCT</Text>
                    <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>REQUESTED</Text>
                  </View>
                  {consolidated.data.rows.map((row) => (
                    <View key={row.productId ?? row.productName} style={[styles.row, { paddingVertical: theme.spacing.sm, borderBottomWidth: 1, borderBottomColor: theme.colors.border }]}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '600' }]} numberOfLines={1}>{row.productName}</Text>
                        <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{row.branchCount} branch{row.branchCount === 1 ? '' : 'es'} · {formatCurrency(row.estimatedValue)}</Text>
                      </View>
                      <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>{row.requestedQty}</Text>
                    </View>
                  ))}
                </Card>
              ) : (
                <Card style={{ marginTop: theme.spacing.sm, borderStyle: 'dashed' }}>
                  <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>Nothing to consolidate yet</Text>
                  <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 4 }]}>
                    Once branches submit their advance demand it is rolled up here, product by product.
                  </Text>
                </Card>
              )}
            </View>

            <View>
              <Text style={[theme.typography.sectionTitle, { color: theme.colors.text }]}>Branch Demands</Text>
              {demands.data && demands.data.length > 0 ? (
                <View style={{ marginTop: theme.spacing.sm, gap: theme.spacing.sm }}>
                  {demands.data.map((demand) => (
                    <Card key={demand.id}>
                      <View style={styles.row}>
                        <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]} numberOfLines={1}>
                          {demand.branchName ?? 'Branch'}
                        </Text>
                        <StatusBadge label={DEMAND_STATUS_LABEL[demand.status]} variant={DEMAND_STATUS_VARIANT[demand.status]} />
                      </View>
                      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 4 }]}>
                        {demand.items.length} product{demand.items.length === 1 ? '' : 's'} · {demand.items.reduce((sum, i) => sum + i.qty, 0)} units requested
                      </Text>
                      {demand.status === 'submitted' ? (
                        <View style={[styles.actionsRow, { marginTop: theme.spacing.md }]}>
                          <View style={{ flex: 1 }}>
                            <SecondaryButton label="Reject" onPress={() => handleReject(demand)} loading={reviewingId === demand.id && review.isPending} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <PrimaryButton label="Approve" onPress={() => handleApprove(demand)} loading={reviewingId === demand.id && review.isPending} />
                          </View>
                        </View>
                      ) : null}
                    </Card>
                  ))}
                </View>
              ) : (
                <EmptyState title="No Demands Yet" message="No branch has submitted an advance demand for this event." />
              )}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
