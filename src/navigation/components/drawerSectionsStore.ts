import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface DrawerSectionsState {
  /** userId → open sections, most recently opened last. */
  expandedByUser: Record<string, string[]>;
  setExpanded: (userId: string, expanded: string[]) => void;
}

/** Which drawer sections each user left open — a UI preference, persisted like the accent colour. */
export const useDrawerSectionsStore = create<DrawerSectionsState>()(
  persist(
    (set) => ({
      expandedByUser: {},
      setExpanded: (userId, expanded) => set((state) => ({ expandedByUser: { ...state.expandedByUser, [userId]: expanded } })),
    }),
    { name: 'mountainbakes.drawer.expandedSections', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
