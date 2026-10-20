import type {
  BillDifference,
  BillStatus,
  PurchaseDeliveryStatus,
  PurchaseDemandStatus,
  PurchasePaymentStatus,
  PurchasePriority,
  QuotationAvailability,
  QuotationStatus,
  SupplierCreditStatus,
  SupplierPaymentStatus,
  WhatsAppConnectionStatus,
  WhatsAppConversation,
  WhatsAppMatchStatus,
  WhatsAppMessage,
  WhatsAppMessageStatus,
} from '@/api/purchasingTypes';
import type { StatusVariant } from '@/shared/ui';

/**
 * Labels and badge colours for WhatsApp Purchasing, in one place so the list,
 * the detail and Finance's queue never disagree. Pure (type-only imports).
 */

export const DEMAND_STATUS_VARIANT: Record<PurchaseDemandStatus, StatusVariant> = {
  draft: 'neutral',
  verified: 'info',
  awaiting_supplier: 'warning',
  quotation_received: 'violet',
  changes_requested: 'warning',
  rejected: 'danger',
  awaiting_supplier_bill: 'info',
  bill_submitted: 'violet',
  awaiting_delivery: 'info',
  partially_received: 'warning',
  received: 'success',
  cancelled: 'neutral',
};

export const PRIORITY_LABEL: Record<PurchasePriority, string> = { urgent: 'Urgent', normal: 'Normal' };
export const PRIORITY_VARIANT: Record<PurchasePriority, StatusVariant> = { urgent: 'danger', normal: 'neutral' };

export const PAYMENT_STATUS_LABEL: Record<PurchasePaymentStatus, string> = {
  unpaid: 'Unpaid',
  partially_paid: 'Partly paid',
  paid: 'Paid',
};
export const PAYMENT_STATUS_VARIANT: Record<PurchasePaymentStatus, StatusVariant> = {
  unpaid: 'warning',
  partially_paid: 'info',
  paid: 'success',
};

export const DELIVERY_STATUS_LABEL: Record<PurchaseDeliveryStatus, string> = {
  not_booked: 'Not booked',
  booked: 'Booked',
  dispatched: 'Dispatched',
  delivered: 'Delivered',
};
export const DELIVERY_STATUS_VARIANT: Record<PurchaseDeliveryStatus, StatusVariant> = {
  not_booked: 'neutral',
  booked: 'info',
  dispatched: 'warning',
  delivered: 'success',
};

export const QUOTATION_STATUS_LABEL: Record<QuotationStatus, string> = {
  submitted: 'Awaiting decision',
  changes_requested: 'Changes requested',
  approved: 'Approved',
  rejected: 'Rejected',
  superseded: 'Superseded',
};
export const QUOTATION_STATUS_VARIANT: Record<QuotationStatus, StatusVariant> = {
  submitted: 'violet',
  changes_requested: 'warning',
  approved: 'success',
  rejected: 'danger',
  superseded: 'neutral',
};

export const BILL_STATUS_LABEL: Record<BillStatus, string> = { submitted: 'Awaiting decision', approved: 'Approved', rejected: 'Rejected' };
export const BILL_STATUS_VARIANT: Record<BillStatus, StatusVariant> = { submitted: 'violet', approved: 'success', rejected: 'danger' };

export const AVAILABILITY_LABEL: Record<QuotationAvailability, string> = {
  available: 'Available',
  partial: 'Partial',
  unavailable: 'Unavailable',
  substitute: 'Substitute',
};
export const AVAILABILITY_VARIANT: Record<QuotationAvailability, StatusVariant> = {
  available: 'success',
  partial: 'warning',
  unavailable: 'danger',
  substitute: 'info',
};

export const SUPPLIER_PAYMENT_STATUS_LABEL: Record<SupplierPaymentStatus, string> = {
  pending_approval: 'Waiting for Finance',
  posted: 'Posted',
  rejected: 'Rejected',
  reversed: 'Reversed',
};
export const SUPPLIER_PAYMENT_STATUS_VARIANT: Record<SupplierPaymentStatus, StatusVariant> = {
  pending_approval: 'warning',
  posted: 'success',
  rejected: 'danger',
  reversed: 'neutral',
};

export const CREDIT_STATUS_LABEL: Record<SupplierCreditStatus, string> = {
  pending_approval: 'Waiting for Finance',
  active: 'Active',
  settled: 'Settled',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};
export const CREDIT_STATUS_VARIANT: Record<SupplierCreditStatus, StatusVariant> = {
  pending_approval: 'warning',
  active: 'info',
  settled: 'success',
  rejected: 'danger',
  cancelled: 'neutral',
};

export const MESSAGE_STATUS_LABEL: Record<WhatsAppMessageStatus, string> = {
  queued: 'Queued',
  accepted: 'Accepted',
  sent: 'Sent',
  delivered: 'Delivered',
  read: 'Read',
  failed: 'Failed',
  received: 'Received',
};
export const MESSAGE_STATUS_VARIANT: Record<WhatsAppMessageStatus, StatusVariant> = {
  queued: 'neutral',
  accepted: 'info',
  sent: 'info',
  delivered: 'success',
  read: 'success',
  failed: 'danger',
  received: 'violet',
};

export const MATCH_STATUS_LABEL: Record<WhatsAppMatchStatus, string> = {
  matched: 'Matched',
  unmatched: 'Unmatched',
  assigned: 'Assigned',
  dismissed: 'Dismissed',
};

export const DIFFERENCE_FIELD_LABEL: Record<BillDifference['field'], string> = {
  quantity: 'Quantity',
  rate: 'Rate',
  delivery_charge: 'Delivery charge',
  other_charges: 'Other charges',
};

/** `quotation_submitted` → `Quotation submitted` — the timeline's event names are the server's snake_case. */
export function eventLabel(event: string): string {
  const words = event.replace(/[_.]+/g, ' ').trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : event;
}

export interface ConnectionInfo {
  title: string;
  detail: string;
  variant: StatusVariant;
  /** Test mode: nothing really goes to WhatsApp. */
  isTestMode: boolean;
}

/** The connection panel's headline. Never shows a secret — the server sends none. */
export function connectionInfo(status: WhatsAppConnectionStatus): ConnectionInfo {
  if (status.provider === 'mock' || status.state === 'mock') {
    return {
      title: 'Test mode',
      detail: 'Test mode, no real WhatsApp messages are sent. Demands, quotations and bills still work end to end.',
      variant: 'warning',
      isTestMode: true,
    };
  }
  switch (status.state) {
    case 'connected':
      return {
        title: 'Connected',
        detail: status.displayPhoneNumber ? `Sending from ${status.displayPhoneNumber}.` : 'The Production WhatsApp number is connected.',
        variant: 'success',
        isTestMode: false,
      };
    case 'awaiting_webhook':
      return {
        title: 'Waiting for WhatsApp',
        detail: 'Configured, but WhatsApp has not called back yet. Messages can be sent; replies will not arrive until it does.',
        variant: 'info',
        isTestMode: false,
      };
    case 'configuration_required':
    default:
      return {
        title: 'Setup needed',
        detail:
          status.missing.length > 0
            ? `Ask an admin to finish the WhatsApp setup (${status.missing.length} setting${status.missing.length === 1 ? '' : 's'} missing).`
            : 'Ask an admin to finish the WhatsApp setup.',
        variant: 'danger',
        isTestMode: false,
      };
  }
}

/** The WhatsApp 24-hour customer-service window. */
export const REPLY_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Until when a free-text reply is allowed: the later of what the conversation
 * row said when listed and 24 h after the newest inbound message loaded since
 * (a supplier who writes while the thread is open reopens the window). `null`
 * when it is closed or never opened. The server re-checks either way.
 */
export function replyWindowUntil(
  conversationWindow: string | null | undefined,
  messages: Pick<WhatsAppMessage, 'direction' | 'createdAt'>[],
  now: Date = new Date(),
): Date | null {
  let until = conversationWindow ? new Date(conversationWindow).getTime() : 0;
  for (const m of messages) {
    if (m.direction !== 'inbound') continue;
    const t = new Date(m.createdAt).getTime() + REPLY_WINDOW_MS;
    if (Number.isFinite(t) && t > until) until = t;
  }
  return Number.isFinite(until) && until > now.getTime() ? new Date(until) : null;
}

/** Who a conversation is with, best name first. */
export function conversationTitle(c: Pick<WhatsAppConversation, 'supplierName' | 'profileName' | 'waId'>): string {
  return c.supplierName ?? c.profileName ?? `+${c.waId}`;
}

/** What a message says — its text, or the template it went as. */
export function messageText(m: Pick<WhatsAppMessage, 'body' | 'templateName' | 'type'>): string {
  if (m.body && m.body.trim()) return m.body;
  if (m.templateName) return `Template: ${m.templateName}`;
  return `(${m.type} message)`;
}

/** A failed message's error, as one line. */
export function messageError(m: Pick<WhatsAppMessage, 'errorCode' | 'errorTitle' | 'errorDetail'>): string | null {
  const parts = [m.errorTitle, m.errorDetail].filter((p): p is string => !!p && !!p.trim());
  if (parts.length === 0 && !m.errorCode) return null;
  const text = parts.join(' — ') || 'Not delivered';
  return m.errorCode ? `${text} (code ${m.errorCode})` : text;
}
