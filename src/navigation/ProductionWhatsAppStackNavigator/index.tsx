import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  PurchaseBillEntryScreen,
  PurchaseConversationsScreen,
  PurchaseDemandDetailScreen,
  PurchaseDemandFormScreen,
  PurchaseQuotationEntryScreen,
  PurchaseReceiptScreen,
  PurchaseThreadScreen,
  WhatsAppPurchasingScreen,
} from '@/features/purchasing';
import { Routes } from '../routes';
import type { ProductionWhatsAppStackParamList } from '../types';

const Stack = createNativeStackNavigator<ProductionWhatsAppStackParamList>();

/** WhatsApp Purchasing — demands to outside suppliers, their quotations, bills, receipts and payments, and the conversations. */
export function ProductionWhatsAppStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={Routes.PRODUCTION_WHATSAPP_LIST} component={WhatsAppPurchasingScreen} />
      <Stack.Screen name={Routes.PRODUCTION_WHATSAPP_DEMAND_FORM} component={PurchaseDemandFormScreen} />
      <Stack.Screen name={Routes.PRODUCTION_WHATSAPP_DEMAND_DETAIL} component={PurchaseDemandDetailScreen} />
      <Stack.Screen name={Routes.PRODUCTION_WHATSAPP_QUOTATION_ENTRY} component={PurchaseQuotationEntryScreen} />
      <Stack.Screen name={Routes.PRODUCTION_WHATSAPP_BILL_ENTRY} component={PurchaseBillEntryScreen} />
      <Stack.Screen name={Routes.PRODUCTION_WHATSAPP_RECEIPT} component={PurchaseReceiptScreen} />
      <Stack.Screen name={Routes.PRODUCTION_WHATSAPP_CONVERSATIONS} component={PurchaseConversationsScreen} />
      <Stack.Screen name={Routes.PRODUCTION_WHATSAPP_THREAD} component={PurchaseThreadScreen} />
    </Stack.Navigator>
  );
}
