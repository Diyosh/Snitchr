import { create } from 'zustand';

interface AppState {
  hasDetectionResult: boolean;
  setHasDetectionResult: (value: boolean) => void;
  resetStore: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  hasDetectionResult: false,
  setHasDetectionResult: (value) => set({ hasDetectionResult: value }),
  resetStore: () => set({ hasDetectionResult: false }),
}));
