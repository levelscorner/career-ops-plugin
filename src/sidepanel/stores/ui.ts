import { create } from 'zustand';

interface UiState {
  theme: 'light' | 'dark' | 'auto';
  commandPaletteOpen: boolean;
  setTheme: (theme: 'light' | 'dark' | 'auto') => void;
  toggleCommandPalette: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  theme: 'auto',
  commandPaletteOpen: false,
  setTheme: (theme) => set({ theme }),
  toggleCommandPalette: () =>
    set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen })),
}));
