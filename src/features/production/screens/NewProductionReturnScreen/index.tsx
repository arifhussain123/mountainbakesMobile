import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useBranches, useCreateProductionReturn, useProducts } from '@/api';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, Icon, PrimaryButton, Screen } from '@/shared/ui';
import { mapErrorToMessage } from '@/shared/helpers';
import type { BranchSummary, Product } from '@/api';
import { BranchPickerModal, ReturnProductPickerModal } from '../../components';
import { styles } from './styles';

/**
 * mountainbakesProduction.html screen 10's own "+ Record Return" — Production
 * noting a return it received directly, with no branch screen involved
 * (`source: null` server-side; see `ProductionReturn.source`).
 */
export function NewProductionReturnScreen() {
  const theme = useAppTheme();
  const navigation = useNavigation();
  const branches = useBranches();
  const products = useProducts();
  const createReturn = useCreateProductionReturn();

  const [branch, setBranch] = useState<BranchSummary | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [qty, setQty] = useState(1);
  const [reason, setReason] = useState('');
  const [branchPickerVisible, setBranchPickerVisible] = useState(false);
  const [productPickerVisible, setProductPickerVisible] = useState(false);

  const canSubmit = !!branch && !!product && qty > 0 && reason.trim().length > 0 && !createReturn.isPending;

  const handleSubmit = async () => {
    if (!branch || !product) return;
    try {
      await createReturn.mutateAsync({ branchId: branch.id, productId: product.id, qty, reason: reason.trim() });
      Alert.alert('Return recorded', 'The return has been added to the review queue.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (error) {
      Alert.alert('Could not save', mapErrorToMessage(error));
    }
  };

  return (
    <Screen>
      <AppHeader title="Record Return" subtitle="A return Production received directly" />
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: theme.spacing.lg }} keyboardShouldPersistTaps="handled">
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>BRANCH</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setBranchPickerVisible(true)}
            style={[styles.pickerButton, { marginTop: 6, borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
            <Text style={[theme.typography.body, { color: branch ? theme.colors.text : theme.colors.textSecondary }]} numberOfLines={1}>
              {branch ? branch.name : 'Select branch…'}
            </Text>
            <Icon name="chevron-down" size={14} color={theme.colors.textSecondary} />
          </Pressable>

          <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.lg }]}>PRODUCT</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setProductPickerVisible(true)}
            style={[styles.pickerButton, { marginTop: 6, borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
            <Text style={[theme.typography.body, { color: product ? theme.colors.text : theme.colors.textSecondary }]} numberOfLines={1}>
              {product ? product.name : 'Select product…'}
            </Text>
            <Icon name="chevron-down" size={14} color={theme.colors.textSecondary} />
          </Pressable>

          <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.lg }]}>QUANTITY</Text>
          <View style={[styles.stepper, { borderColor: theme.colors.border, marginTop: 6 }]}>
            <Pressable onPress={() => setQty((q) => Math.max(1, q - 1))} style={styles.stepperButton}>
              <Text style={[theme.typography.body, { color: theme.colors.textSecondary }]}>−</Text>
            </Pressable>
            <Text style={[theme.typography.body, { color: theme.colors.text, minWidth: 40, textAlign: 'center' }]}>{qty}</Text>
            <Pressable onPress={() => setQty((q) => q + 1)} style={styles.stepperButton}>
              <Text style={[theme.typography.body, { color: theme.colors.primary }]}>+</Text>
            </Pressable>
          </View>

          <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.lg }]}>REASON</Text>
          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder="Why was this returned?"
            placeholderTextColor={theme.colors.textSecondary}
            multiline
            style={[styles.input, { marginTop: 6, height: 72, paddingTop: 10, borderColor: theme.colors.border, color: theme.colors.text }]}
          />
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
          <PrimaryButton label="Record Return" onPress={() => void handleSubmit()} loading={createReturn.isPending} disabled={!canSubmit} />
        </View>
      </KeyboardAvoidingView>

      <BranchPickerModal
        visible={branchPickerVisible}
        branches={branches.data?.branches ?? []}
        onSelect={(b) => {
          setBranch(b);
          setBranchPickerVisible(false);
        }}
        onClose={() => setBranchPickerVisible(false)}
      />
      <ReturnProductPickerModal
        visible={productPickerVisible}
        products={products.data?.products ?? []}
        onSelect={(p) => {
          setProduct(p);
          setProductPickerVisible(false);
        }}
        onClose={() => setProductPickerVisible(false)}
      />
    </Screen>
  );
}
