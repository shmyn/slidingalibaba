import React from 'react';
import { useAppStore } from '../store';
import { translations } from '../i18n';
import { motion } from 'motion/react';
import { Lock, Unlock } from 'lucide-react';

export const StageSelect: React.FC = () => {
  const { language, setScreen, currentChapter, setStage, unlockedStages } = useAppStore();
  const t = translations[language];

  const handleSelect = (stage: number) => {
    setStage(stage);
    setScreen('puzzle');
  };

  const unlockedCount = unlockedStages[currentChapter!] || 1;

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 p-8 flex flex-col items-center">
      <div className="w-full max-w-4xl flex justify-between items-center mb-12">
        <button 
          onClick={() => setScreen('chapter_select')}
          className="text-stone-400 hover:text-white transition-colors"
        >
          &larr; {t.back}
        </button>
        <h2 className="text-3xl font-serif text-amber-500">{t.chapter} {currentChapter} - {t.selectStage}</h2>
        <div className="w-16"></div>
      </div>

      <div className="grid grid-cols-3 gap-6 w-full max-w-2xl">
        {Array.from({ length: 9 }).map((_, i) => {
          const stage = i + 1;
          const isUnlocked = stage <= unlockedCount;
          
          return (
            <motion.button
              key={stage}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => isUnlocked && handleSelect(stage)}
              disabled={!isUnlocked}
              className={`relative flex flex-col items-center justify-center aspect-square rounded-2xl border-2 transition-all ${
                isUnlocked 
                  ? 'bg-amber-900/40 border-amber-500/50 hover:bg-amber-800/60 hover:scale-105 cursor-pointer shadow-lg shadow-amber-900/20' 
                  : 'bg-stone-800/50 border-stone-700 cursor-not-allowed opacity-60'
              }`}
            >
              <span className={`text-4xl font-bold font-serif ${isUnlocked ? 'text-amber-400' : 'text-stone-500'}`}>
                {stage}
              </span>
              <div className="absolute top-3 right-3">
                {isUnlocked ? (
                  <Unlock className="w-4 h-4 text-amber-500/50" />
                ) : (
                  <Lock className="w-4 h-4 text-stone-500" />
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
