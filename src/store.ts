import { create } from 'zustand';

export type Screen = 'title' | 'chapter_select' | 'stage_select' | 'puzzle' | 'dashboard';
export type Language = 'ko' | 'en' | 'ar' | 'fr' | 'es' | 'zh' | 'ja';

interface AppState {
  screen: Screen;
  language: Language;
  currentChapter: number | null;
  currentStage: number | null;
  unlockedStages: Record<number, number>;
  
  setScreen: (screen: Screen) => void;
  setLanguage: (lang: Language) => void;
  setChapter: (chapter: number) => void;
  setStage: (stage: number) => void;
  setUnlockedStages: (stages: Record<number, number>) => void;
  unlockNextStage: (chapter: number, stage: number) => void;
}

export const useAppStore = create<AppState>((set) => ({
  screen: 'title',
  language: 'ko',
  currentChapter: null,
  currentStage: null,
  unlockedStages: { 1: 1, 2: 1, 3: 1 },
  
  setScreen: (screen) => set({ screen }),
  setLanguage: (language) => set({ language }),
  setChapter: (chapter) => set({ currentChapter: chapter }),
  setStage: (stage) => set({ currentStage: stage }),
  setUnlockedStages: (stages) => set({ unlockedStages: stages }),
  unlockNextStage: (chapter, stage) => set((state) => {
    const currentUnlocked = state.unlockedStages[chapter] || 1;
    if (stage >= currentUnlocked && stage < 9) {
      return {
        unlockedStages: {
          ...state.unlockedStages,
          [chapter]: stage + 1
        }
      };
    }
    return state;
  })
}));
