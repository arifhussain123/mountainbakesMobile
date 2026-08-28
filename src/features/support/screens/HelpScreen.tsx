import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';

import {
  MBButton,
  MBCard,
  MBEmptyState,
  MBErrorState,
  MBHeader,
  MBIcon,
  MBInput,
  MBListCard,
  MBListRow,
  MBModal,
  MBPressable,
  MBSectionHeader,
  MBSkeletonList,
} from '@/common/ui';
import {
  createSupportTicket,
  getSupportTickets,
  lookupSupportReference,
} from '@/api/services/supportService';
import { qk } from '@/api/queryKeys';
import type { SupportReference, SupportTicket } from '@/shared/types/support.types';
import { useAuthStore } from '@/state/authStore';
import { useNetworkStore } from '@/state/networkStore';
import { useTheme } from '@/common/theme/ThemeProvider';
import { contentColumn } from '@/common/theme/spacing';

/**
 * Help & Support — the branch and production end of the query queue.
 *
 * ---------------------------------------------------------------------------
 * A query is raised against one record, never in the abstract
 * ---------------------------------------------------------------------------
 * The form below asks for a reference ID first and resolves it before the
 * message box is worth typing in. That is the server's shape rather than a
 * choice made here: `POST /api/support` resolves the reference itself and
 * snapshots the record's figures onto the ticket, so an admin reading the query
 * a day later sees exactly what the raiser saw rather than whatever the row has
 * since become.
 *
 * The practical effect is that "the till is wrong" is not a ticket. "MB-000125
 * shows 1,250 and we took 1,205" is, and it is answerable.
 *
 * ---------------------------------------------------------------------------
 * Who may raise one, and why the button is conditional
 * ---------------------------------------------------------------------------
 * `POST /api/support` is `requireRole('branch_manager', 'production_user')`.
 * Everyone else — a `branch_user` shift account, the finance roles, and the
 * admin who answers these — may read their own tickets and may not raise one.
 *
 * So the button is offered only to the two roles that have it. Showing it to
 * everyone and letting the server refuse means an operator types a paragraph
 * describing a problem and loses it to a 403 on submit, which is both the worst
 * moment to find out and the moment they are least likely to try again.
 *
 * ---------------------------------------------------------------------------
 * This write does not queue, and that is deliberate
 * ---------------------------------------------------------------------------
 * The five offline-capable writes are the ones that record business the shop
 * actually did. A support query is a *message about* one of those, and it cannot
 * be written at all until the server has resolved and snapshotted the reference
 * — there is nothing to queue that would still be true an hour later. It fails
 * with an ordinary error and the button stays. The screen says so rather than
 * letting an offline operator discover it by pressing Submit.
 */

/**
 * The four reference prefixes the lookup understands, in the order a branch is
 * most likely to be asking about one.
 *
 * Printed rather than validated: the server owns which prefixes resolve and what
 * each one means, and a client-side pattern check would refuse a fifth the day
 * it is added.
 */
const REFERENCE_HINT = 'Sale MB-…, demand DMD-…, expense EXP-… or stock STK-…';

/** Short answers to the questions branches actually ask, in this app's words. */
const FAQ: readonly { q: string; a: string }[] = [
  {
    q: 'How do I work offline?',
    a: 'Just carry on. Sales, orders, expenses, demands and returns are saved on the phone and sent when the connection comes back. A saved-offline write says "Waiting to sync" — that is not a failure, and ringing it up again is how the same sale gets counted twice.',
  },
  {
    q: 'What does “Not accepted” mean?',
    a: 'The server considered the write and refused it — usually a closed business day, or stock that is not there. It is parked in the Sync Center waiting for a person, not for a connection, and it will never send on its own. Do not enter it again until it has been resolved there.',
  },
  {
    q: 'A sale is recorded wrong. What now?',
    a: 'Raise a query against its MB- number below. Nothing in this app can edit a sale after it is taken; an administrator applies the correction, and the trail of what changed stays on the ticket.',
  },
  {
    q: 'Why is a sale on yesterday’s figures?',
    a: 'The business day rolls at 2 AM, not midnight. Anything rung up between midnight and 2 AM belongs to the evening it was made, which is what the shift actually worked.',
  },
  {
    q: 'Why can I not see another branch?',
    a: 'Branch accounts are scoped to their own shop by the server, off the sign-in token. There is no setting for it here.',
  },
];

const STATUS_LABEL: Record<string, string> = {
  open: 'Open',
  resolved: 'Solved',
  rejected: 'Closed',
};

export function HelpScreen(): React.ReactElement {
  const theme = useTheme();
  const navigation = useNavigation<{ goBack: () => void }>();
  const role = useAuthStore(s => s.claims?.role);
  const isOnline = useNetworkStore(s => s.isOnline);

  // Mirrors requireRole('branch_manager', 'production_user') on POST /api/support.
  const canRaise = role === 'branch_manager' || role === 'production_user';

  const [composing, setComposing] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const tickets = useQuery({
    queryKey: qk.support.tickets(),
    queryFn: getSupportTickets,
  });

  const open = useMemo(
    () => (tickets.data ?? []).filter(t => t.status === 'open'),
    [tickets.data],
  );
  const settled = useMemo(
    () => (tickets.data ?? []).filter(t => t.status !== 'open'),
    [tickets.data],
  );

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader
        title="Help & support"
        subtitle={canRaise ? 'Queries you have raised' : undefined}
        onBack={() => navigation.goBack()}
      />

      {tickets.isPending ? (
        <MBSkeletonList rows={5} />
      ) : (
        <ScrollView
          contentContainerStyle={[
            contentColumn,
            { padding: theme.layout.screenPad, gap: theme.space.md },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={tickets.isFetching && !tickets.isPending}
              onRefresh={() => tickets.refetch()}
              tintColor={theme.colors.primary}
            />
          }>
          {tickets.isError ? (
            <MBErrorState
              error={tickets.error}
              onRetry={() => tickets.refetch()}
              retrying={tickets.isFetching}
            />
          ) : (
            <>
              <MBSectionHeader title="Your queries" />
              {open.length === 0 && settled.length === 0 ? (
                <MBEmptyState
                  title="Nothing raised"
                  message={
                    canRaise
                      ? 'Queries you raise against a sale, demand, expense or stock record appear here with the administrator’s answer.'
                      : 'Queries raised from this account would appear here. Raising one is a branch manager or production action.'
                  }
                  icon="help"
                />
              ) : (
                <MBListCard testID="support-tickets">
                  {[...open, ...settled].map(ticket => (
                    <TicketRow key={ticket.id} ticket={ticket} />
                  ))}
                </MBListCard>
              )}

              <MBSectionHeader title="Common questions" />
              <MBListCard testID="support-faq">
                {FAQ.map(item => (
                  <FaqRow
                    key={item.q}
                    item={item}
                    open={expanded === item.q}
                    onToggle={() => setExpanded(expanded === item.q ? null : item.q)}
                  />
                ))}
              </MBListCard>
            </>
          )}
        </ScrollView>
      )}

      {canRaise ? (
        <View
          style={[
            styles.footer,
            {
              padding: theme.layout.screenPad,
              borderTopColor: theme.colors.border,
              backgroundColor: theme.colors.surface,
              gap: theme.space.sm,
            },
          ]}>
          {!isOnline ? (
            /* Said before the button is pressed, not after. A query cannot be
               queued — the server has to resolve and snapshot the reference
               before there is a ticket at all — so an offline operator would
               otherwise type the whole thing and lose it. */
            <Text style={[theme.type.caption, { color: theme.colors.offline }]}>
              Raising a query needs a connection — the record has to be looked up before it can
              be attached.
            </Text>
          ) : null}
          <MBButton
            label="New query"
            onPress={() => setComposing(true)}
            disabled={!isOnline}
            fullWidth
            testID="new-query"
          />
        </View>
      ) : null}

      <NewQueryModal
        visible={composing}
        onClose={() => setComposing(false)}
      />
    </View>
  );
}

function TicketRow({ ticket }: { ticket: SupportTicket }): React.ReactElement {
  const answered = ticket.status !== 'open' && ticket.resolutionNote;
  return (
    <MBListRow
      title={ticket.referenceId}
      subtitle={answered ? ticket.resolutionNote! : ticket.message}
      icon="help"
      iconTone={ticket.status === 'open' ? 'warning' : 'success'}
      tag={{ label: STATUS_LABEL[ticket.status] ?? ticket.status }}
      accessibilityLabel={[
        `Query ${ticket.ticketNumber} on ${ticket.referenceId}`,
        STATUS_LABEL[ticket.status] ?? ticket.status,
        answered ? `Answer: ${ticket.resolutionNote}` : ticket.message,
      ].join('. ')}
    />
  );
}

/**
 * One question, expanding in place.
 *
 * In place rather than pushing a screen: every answer is two or three sentences,
 * and a stack push for a paragraph costs the reader their position in a list
 * they are scanning. `MBListRow` is not used here because its `onPress` implies
 * a chevron and a destination, and this goes nowhere.
 */
function FaqRow({
  item,
  open,
  onToggle,
}: {
  item: { q: string; a: string };
  open: boolean;
  onToggle: () => void;
}): React.ReactElement {
  const theme = useTheme();
  return (
    <MBPressable
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      accessibilityLabel={open ? `${item.q}. ${item.a}` : item.q}
      feedback="opacity"
      style={{ paddingVertical: theme.space.md, gap: theme.space.tight }}>
      <Text style={[theme.type.bodyStrong, { color: theme.colors.text }]}>{item.q}</Text>
      {open ? (
        <Text style={[theme.type.body, { color: theme.colors.textSubtle }]}>{item.a}</Text>
      ) : null}
    </MBPressable>
  );
}

/**
 * Raise a query: find the record, then say what is wrong with it.
 *
 * ---------------------------------------------------------------------------
 * The lookup is a separate, explicit step
 * ---------------------------------------------------------------------------
 * Submit is disabled until a reference has resolved, and the resolved detail is
 * shown before the message box. Two reasons, and the second is the important
 * one:
 *
 *   - The server will refuse a reference it cannot resolve, so failing here
 *     costs one tap instead of a lost paragraph.
 *   - **The raiser sees what the admin will see.** The ticket carries a snapshot
 *     of these exact figures. Someone who typed the wrong reference finds out
 *     while looking at a record that is not the one they meant, rather than
 *     after an admin has spent a day answering a question about it.
 */
function NewQueryModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}): React.ReactElement {
  const theme = useTheme();
  const queryClient = useQueryClient();

  const [ref, setRef] = useState('');
  const [message, setMessage] = useState('');
  const [reference, setReference] = useState<SupportReference | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setRef('');
    setMessage('');
    setReference(null);
    setLookupError(null);
  }, []);

  const lookup = useMutation({
    mutationFn: () => lookupSupportReference(ref),
    onSuccess: data => {
      setReference(data.reference);
      setLookupError(null);
    },
    onError: (error: Error) => {
      setReference(null);
      setLookupError(error.message);
    },
  });

  const submit = useMutation({
    mutationFn: () => createSupportTicket({ referenceId: ref, message }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.support.all() });
      reset();
      onClose();
    },
  });

  const canSubmit = reference !== null && message.trim().length >= 10 && !submit.isPending;

  return (
    <MBModal
      visible={visible}
      presentation="sheet"
      onRequestClose={() => {
        reset();
        onClose();
      }}
      testID="new-query-sheet">
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ gap: theme.space.md, paddingBottom: theme.space.lg }}>
        <View style={[styles.sheetHead, { gap: theme.space.md }]}>
          <Text
            accessibilityRole="header"
            style={[theme.type.h3, styles.flex, { color: theme.colors.text }]}>
            New query
          </Text>
          <MBPressable
            onPress={() => {
              reset();
              onClose();
            }}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close">
            <MBIcon name="close" size="action" color={theme.colors.textMuted} />
          </MBPressable>
        </View>
        <Text style={[theme.type.body, { color: theme.colors.textSubtle }]}>
          Find the record first. Its details are attached to the query, so the administrator sees
          the same figures you are looking at now.
        </Text>

        <View style={[styles.lookupRow, { gap: theme.space.sm }]}>
          <View style={styles.flex}>
            <MBInput
              label="Reference ID"
              value={ref}
              onChangeText={text => {
                setRef(text);
                // A stale resolution under a changed ID is how the wrong record
                // gets attached to the right complaint.
                setReference(null);
                setLookupError(null);
              }}
              placeholder="e.g. EXP-000012"
              hint={REFERENCE_HINT}
              autoCapitalize="characters"
              autoCorrect={false}
              testID="query-ref"
            />
          </View>
          <MBButton
            label="Find"
            onPress={() => lookup.mutate()}
            loading={lookup.isPending}
            disabled={ref.trim().length < 3}
            variant="secondary"
            testID="query-find"
          />
        </View>

        {lookupError ? (
          <Text
            accessibilityRole="alert"
            style={[theme.type.caption, { color: theme.colors.danger }]}>
            {lookupError}
          </Text>
        ) : null}

        {reference ? (
          <MBCard elevation={0} style={{ backgroundColor: theme.colors.primarySoft }}>
            <Text style={[theme.type.cardTitle, { color: theme.colors.text }]}>
              {reference.title}
            </Text>
            {reference.fields.map(field => (
              <Text
                key={`${field.label}:${field.value}`}
                style={[theme.type.caption, { color: theme.colors.textSubtle }]}>
                {field.label}: {field.value}
              </Text>
            ))}
          </MBCard>
        ) : null}

        <MBInput
          label="What looks wrong?"
          value={message}
          onChangeText={setMessage}
          placeholder="Describe the problem with this record"
          multiline
          numberOfLines={4}
          /* Ten characters, not one. "wrong" is a ticket an admin has to come
             back and ask about, which costs a round trip through a shift
             handover. Shown as an error rather than a hint once something has
             been typed: it is the reason Submit is still disabled. */
          {...(message.trim().length > 0 && message.trim().length < 10
            ? {
                error:
                  'A few more words — the administrator cannot see what you are looking at.',
              }
            : {})}
          editable={reference !== null}
          testID="query-message"
        />

        {submit.isError ? (
          <Text
            accessibilityRole="alert"
            style={[theme.type.caption, { color: theme.colors.danger }]}>
            {(submit.error as Error).message}
          </Text>
        ) : null}

        <MBButton
          label="Send to administrator"
          onPress={() => submit.mutate()}
          disabled={!canSubmit}
          loading={submit.isPending}
          fullWidth
          testID="query-submit"
        />
      </ScrollView>
    </MBModal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  lookupRow: { flexDirection: 'row', alignItems: 'flex-end' },
  sheetHead: { flexDirection: 'row', alignItems: 'center' },
  /* A rule rather than a shadow: the bar is pinned to the bottom of a scrolling
     screen, and `e2` there would put a second floating object beside the
     navigation bar it sits above. */
  footer: { borderTopWidth: 1 },
});
