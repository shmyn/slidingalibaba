import React, { useState } from 'react';
import { useAppStore } from '../store';
import { translations } from '../i18n';
import { loginWithGoogle, loginAnonymously, auth } from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { motion, AnimatePresence } from 'motion/react';

export const TitleScreen: React.FC = () => {
  const { language, setLanguage, setScreen, setUnlockedStages } = useAppStore();
  const t = translations[language];
  const [user, loading] = useAuthState(auth);
  const [showGuestWarning, setShowGuestWarning] = useState(false);

  const handleLogin = async () => {
    await loginWithGoogle();
  };

  const handleStartGame = () => {
    if (user?.isAnonymous) {
      setShowGuestWarning(true);
    } else {
      setScreen('chapter_select');
    }
  };

  const handleGuestLogin = async () => {
    setShowGuestWarning(false);
    if (!user) {
      await loginAnonymously();
    } else if (user.isAnonymous) {
      // Reset progress for new guest session
      setUnlockedStages({ 1: 1, 2: 1, 3: 1 });
    }
    setScreen('chapter_select');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-stone-900 text-amber-50 p-6 relative">
      <div className="absolute top-4 right-4 z-10">
        <select 
          value={language} 
          onChange={(e) => setLanguage(e.target.value as any)}
          className="bg-stone-800 text-amber-100 border border-amber-700/50 rounded-md px-3 py-1 outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="ko">한국어</option>
          <option value="en">English</option>
          <option value="ar">العربية</option>
          <option value="fr">Français</option>
          <option value="es">Español</option>
          <option value="zh">中文</option>
          <option value="ja">日本語</option>
        </select>
      </div>

      <div className="text-center mb-12">
        <h1 className="text-5xl md:text-6xl font-serif font-bold text-amber-500 drop-shadow-lg mb-4">
          {t.title}
        </h1>
        <p className="text-xl text-amber-200/80 tracking-widest uppercase">
          {t.subtitle}
        </p>
      </div>

      <div className="flex flex-col items-center space-y-6">
        {loading ? (
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        ) : user ? (
          <div className="flex flex-col items-center space-y-4">
            <p className="text-amber-100">Welcome, {user.displayName || 'Guest'}</p>
            <button 
              onClick={handleStartGame}
              className="px-8 py-4 bg-amber-600 hover:bg-amber-500 text-stone-900 font-bold rounded-xl text-xl transition-all shadow-lg shadow-amber-900/50 hover:scale-105 active:scale-95 w-full"
            >
              {t.start}
            </button>
            {user.email === 'shimyeeun04@gmail.com' && (
              <button 
                onClick={() => setScreen('dashboard')}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-900/50 hover:scale-105 active:scale-95 w-full flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Admin Dashboard
              </button>
            )}
            <button 
              onClick={() => auth.signOut()}
              className="px-6 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold rounded-lg transition-colors border border-stone-700 w-full"
            >
              {t.logout}
            </button>
          </div>
        ) : (
          <div className="flex flex-col space-y-4 w-full max-w-xs">
            <button 
              onClick={handleLogin}
              className="px-6 py-3 bg-white text-gray-800 font-semibold rounded-lg flex items-center justify-center space-x-3 hover:bg-gray-100 transition-colors shadow-md w-full"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span>{t.login}</span>
            </button>
            <button 
              onClick={() => setShowGuestWarning(true)}
              className="px-6 py-3 bg-stone-700 text-stone-200 font-semibold rounded-lg flex items-center justify-center space-x-3 hover:bg-stone-600 transition-colors shadow-md w-full"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>{t.guestLogin}</span>
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showGuestWarning && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-stone-800 border border-stone-700 p-6 rounded-2xl shadow-2xl max-w-sm w-full"
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-rose-500/20 text-rose-500 mb-4 mx-auto">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-center text-rose-400 mb-2">{t.guestWarningTitle}</h3>
              <p className="text-stone-300 text-center mb-6 text-sm leading-relaxed">
                {t.guestWarningDesc}
              </p>
              <div className="flex flex-col space-y-3">
                <button 
                  onClick={handleGuestLogin}
                  className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-stone-900 font-bold rounded-lg transition-colors"
                >
                  {t.continueAsGuest}
                </button>
                <button 
                  onClick={() => setShowGuestWarning(false)}
                  className="w-full py-3 bg-stone-700 hover:bg-stone-600 text-stone-200 font-bold rounded-lg transition-colors"
                >
                  {t.cancel}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
