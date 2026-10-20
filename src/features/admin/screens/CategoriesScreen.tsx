import { useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useCreateCategory, useProductCategories, useRemoveCategory, useRenameCategory, type ProductCategory } from '@/api';
import { mapErrorToMessage } from '@/shared/helpers';
import { FormBottomSheet, PrimaryButton, SecondaryButton, TextField } from '@/shared/ui';
import { ActionChip, AdminListScreen, AdminRow } from '../components';
import { canSaveCategoryName, removeCategoryPrompt } from '../utils/catalogActions';

/**
 * Web `/categories`: each category's name with an Active/Inactive badge, in
 * sort order, with the web's three actions — Add (the name field above the
 * list), Edit (rename, in a sheet) and Remove (a soft delete after a confirm;
 * the category leaves the list since only active ones are listed).
 */
export function CategoriesScreen() {
  const q = useProductCategories();
  const create = useCreateCategory();
  const remove = useRemoveCategory();
  const [newName, setNewName] = useState('');
  const [removingId, setRemovingId] = useState<string | null>(null);
  const edit = useRenameSheet();

  const add = () => {
    if (!canSaveCategoryName(newName)) return;
    create.mutate(newName, {
      onSuccess: () => {
        setNewName('');
        Alert.alert('Added', 'Category added.');
      },
      onError: (e) => Alert.alert('Could Not Add Category', mapErrorToMessage(e)),
    });
  };

  const confirmRemove = (cat: ProductCategory) =>
    Alert.alert('Remove Category', removeCategoryPrompt(cat.name), [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          setRemovingId(cat.id);
          remove.mutate(cat.id, {
            onSuccess: () => Alert.alert('Removed', `${cat.name} removed.`),
            onError: (e) => Alert.alert('Could Not Remove Category', mapErrorToMessage(e)),
            onSettled: () => setRemovingId(null),
          });
        },
      },
    ]);

  return (
    <>
      <AdminListScreen<ProductCategory>
        title="Categories"
        subtitle="Manage product categories"
        header={
          <View style={styles.addRow}>
            <View style={{ flex: 1 }}>
              <TextField
                label="New category"
                value={newName}
                onChangeText={setNewName}
                placeholder="New category name…"
                returnKeyType="done"
                onSubmitEditing={add}
              />
            </View>
            <View style={styles.addButton}>
              <ActionChip icon="plus" label="Add" primary onPress={add} loading={create.isPending} disabled={!canSaveCategoryName(newName)} />
            </View>
          </View>
        }
        data={q.data?.categories ?? []}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => (
          <AdminRow title={item.name} badge={{ label: item.isActive ? 'Active' : 'Inactive', variant: item.isActive ? 'success' : 'neutral' }}>
            <View style={styles.actions}>
              <ActionChip icon="pencil" label="Edit" onPress={() => edit.open(item)} />
              <ActionChip icon="trash" label="Remove" danger onPress={() => confirmRemove(item)} loading={removingId === item.id} />
            </View>
          </AdminRow>
        )}
        isLoading={q.isLoading}
        error={q.error}
        refreshing={q.isRefetching}
        onRefresh={() => void q.refetch()}
        emptyTitle="No categories"
      />
      {edit.element}
    </>
  );
}

/** The web's inline rename (input + Save / Cancel), as a sheet that starts from the current name. */
function RenameForm({ category, onClose }: { category: ProductCategory; onClose: () => void }) {
  const rename = useRenameCategory();
  const [name, setName] = useState(category.name);

  const save = () =>
    rename.mutate(
      { id: category.id, name },
      {
        onSuccess: () => {
          Alert.alert('Updated', 'Category updated.');
          onClose();
        },
        onError: (e) => Alert.alert('Could Not Update Category', mapErrorToMessage(e)),
      },
    );

  return (
    <View>
      <TextField label="Name" value={name} onChangeText={setName} autoFocus returnKeyType="done" />
      <View style={styles.buttons}>
        <View style={{ flex: 1 }}>
          <SecondaryButton label="Cancel" onPress={onClose} disabled={rename.isPending} />
        </View>
        <View style={{ flex: 1.4 }}>
          <PrimaryButton label="Save" onPress={save} loading={rename.isPending} disabled={!canSaveCategoryName(name)} />
        </View>
      </View>
    </View>
  );
}

function useRenameSheet() {
  const ref = useRef<BottomSheetModal>(null);
  const [category, setCategory] = useState<ProductCategory | null>(null);
  const close = () => ref.current?.dismiss();

  const open = (next: ProductCategory) => {
    setCategory(next);
    ref.current?.present();
  };

  const element = (
    <FormBottomSheet ref={ref} title="Edit Category" subtitle={category?.name} onRequestClose={close} onDismiss={() => setCategory(null)}>
      {category ? <RenameForm category={category} onClose={close} /> : null}
    </FormBottomSheet>
  );

  return { open, element };
}

const styles = StyleSheet.create({
  addRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  /** The input's own 52dp height, so the chip sits level with it. */
  addButton: { height: 52, justifyContent: 'center' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 18 },
});
