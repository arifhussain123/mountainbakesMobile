import { formatCurrency, formatDisplayDate, formatDisplayTime } from '@/shared/utils';
import type { Order } from '@/api';

const PAYMENT_LABEL: Record<string, string> = {
  cash: 'Cash',
  easypaisa: 'Easypaisa',
  foodpanda: 'Foodpanda',
  bank_account: 'Bank Account',
};

/**
 * Plain-text receipt for the Share sheet — the same "closest honest
 * equivalent without a new native dependency" pattern as Production's POP
 * Print (`ProductionOrderDetailScreen`): there is no thermal/Bluetooth
 * printer SDK anywhere in this app's dependencies, and the web client itself
 * removed its WebUSB/Serial printer integration. This is not the till
 * receipt printer — it hands the text to whatever app the user picks
 * (including, on most Android devices, a system "Print" service).
 */
export function buildSaleReceiptText(order: Order): string {
  const lines = order.items.map((item) => {
    const parts = [`${item.productName} x${item.qty}`, formatCurrency(item.lineTotal)];
    return item.discount > 0 ? `${parts[0]}  (-${formatCurrency(item.discount)} disc.)  ${parts[1]}` : parts.join('  ');
  });

  const out = [
    'Mountain Bakes',
    order.branchName,
    `${order.orderNumber} · ${formatDisplayDate(order.businessDate)} ${formatDisplayTime(order.createdAt)}`,
    order.customerName ? `Customer: ${order.customerName}` : null,
    order.customerPhone ? `Mobile: ${order.customerPhone}` : null,
    '',
    ...lines,
    '',
    `Subtotal          ${formatCurrency(order.subtotal)}`,
    order.discountTotal > 0 ? `Discount         -${formatCurrency(order.discountTotal)}` : null,
    order.taxAmount > 0 ? `Government Tax    ${formatCurrency(order.taxAmount)}` : null,
    `Grand Total       ${formatCurrency(order.grandTotal)}`,
    `Payment           ${PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod}`,
    order.receivedCash != null ? `Received Cash     ${formatCurrency(order.receivedCash)}` : null,
    order.cashReturned != null ? `Change Returned   ${formatCurrency(order.cashReturned)}` : null,
    order.notes ? `\nNotes: ${order.notes}` : null,
    '',
    'Thank you for your order!',
  ];

  return out.filter((line) => line !== null).join('\n');
}
