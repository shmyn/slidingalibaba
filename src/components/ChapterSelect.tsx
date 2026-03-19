import React from 'react';
import { useAppStore } from '../store';
import { translations } from '../i18n';
import { motion } from 'motion/react';

export const ChapterSelect: React.FC = () => {
  const { language, setScreen, setChapter } = useAppStore();
  const t = translations[language];

  const chapters = [
    { id: 1, title: `${t.chapter} 1`, desc: t.chapter1Desc, color: 'bg-emerald-900/80 border-emerald-500' },
    { id: 2, title: `${t.chapter} 2`, desc: t.chapter2Desc, color: 'bg-amber-900/80 border-amber-500' },
    { id: 3, title: `${t.chapter} 3`, desc: t.chapter3Desc, color: 'bg-rose-900/80 border-rose-500' },
  ];

  const handleSelect = (id: number) => {
    setChapter(id);
    setScreen('stage_select');
  };

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 p-8 flex flex-col items-center">
      <div className="w-full max-w-4xl flex justify-between items-center mb-12">
        <button 
          onClick={() => setScreen('title')}
          className="text-stone-400 hover:text-white transition-colors"
        >
          &larr; {t.back}
        </button>
        <h2 className="text-3xl font-serif text-amber-500">{t.selectChapter}</h2>
        <div className="w-16"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-4xl">
        {chapters.map((chapter, i) => (
          <motion.button
            key={chapter.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => handleSelect(chapter.id)}
            className={`flex flex-col items-center justify-center p-12 rounded-2xl border-2 ${chapter.color} hover:scale-105 transition-transform shadow-xl`}
          >
            <span className="text-4xl font-bold mb-4">{chapter.title}</span>
            <span className="text-stone-300">{chapter.desc}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
};
