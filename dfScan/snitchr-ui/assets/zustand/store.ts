import { create } from 'zustand';

interface AppState {
  hasDetectionResult: boolean;
  imageUri: string | null; 
  setHasDetectionResult: (value: boolean) => void;
  setImageUri: (uri: string | null) => void;
  resetStore: () => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  setDarkMode: (value: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  hasDetectionResult: false,
  imageUri: null,

  setHasDetectionResult: (value) => set({ hasDetectionResult: value }),
  setImageUri: (uri) => set({ imageUri: uri }),

  resetStore: () =>
    set({
      hasDetectionResult: false,
      imageUri: null,
    }),

  darkMode: false,
  toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
  setDarkMode: (value) => set({ darkMode: value }),
}));
