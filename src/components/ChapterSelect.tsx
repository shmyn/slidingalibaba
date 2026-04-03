import React, { useState } from 'react';
import { useAppStore } from '../store';
import { translations } from '../i18n';
import { motion } from 'motion/react';
import { StoreModal } from './StoreModal';
import { auth, db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';

export const ChapterSelect: React.FC = () => {
  const { language, setScreen, setChapter, carpets, nickname, setNickname } = useAppStore();
  const t = translations[language];
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [newNickname, setNewNickname] = useState(nickname);

  const chapters = [
    { id: 1, title: `${t.chapter} 1`, desc: t.chapter1Desc, color: 'bg-emerald-900/80 border-emerald-500' },
    { id: 2, title: `${t.chapter} 2`, desc: t.chapter2Desc, color: 'bg-amber-900/80 border-amber-500' },
    { id: 3, title: `${t.chapter} 3`, desc: t.chapter3Desc, color: 'bg-rose-900/80 border-rose-500' },
  ];

  const handleSelect = (id: number) => {
    setChapter(id);
    setScreen('stage_select');
  };

  const handleSaveNickname = async () => {
    if (!newNickname.trim()) return;
    setNickname(newNickname.trim());
    setIsEditingNickname(false);
    
    const user = auth.currentUser;
    if (user && !user.isAnonymous) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          nickname: newNickname.trim()
        });
      } catch (error) {
        console.error("Failed to update nickname", error);
      }
    }
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
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {isEditingNickname ? (
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  value={newNickname}
                  onChange={(e) => setNewNickname(e.target.value)}
                  className="bg-stone-800 border border-stone-600 rounded px-2 py-1 text-sm w-24 text-white"
                  maxLength={15}
                  autoFocus
                />
                <button onClick={handleSaveNickname} className="text-emerald-400 text-sm font-bold">OK</button>
              </div>
            ) : (
              <button onClick={() => setIsEditingNickname(true)} className="text-stone-300 hover:text-white text-sm flex items-center gap-1">
                {nickname} ✏️
              </button>
            )}
          </div>
          <button 
            onClick={() => setIsStoreOpen(true)}
            className="flex items-center gap-2 text-amber-400 font-bold bg-stone-800/80 px-3 py-1 rounded-full border border-amber-900/50 hover:bg-stone-700 transition-colors cursor-pointer"
          >
            <span className="text-lg">🧞‍♂️</span> {carpets} <span className="text-stone-400 text-sm ml-1">+</span>
          </button>
        </div>
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
      
      <StoreModal isOpen={isStoreOpen} onClose={() => setIsStoreOpen(false)} />
    </div>
  );
};
