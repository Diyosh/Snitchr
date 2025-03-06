import { create } from 'zustand';

interface AppState {
    hasDetectionResult: boolean;
    setHasDetectionResult: (hasResult: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
    hasDetectionResult: false,
    setHasDetectionResult: (hasResult) => set({ hasDetectionResult: hasResult }),
}));
