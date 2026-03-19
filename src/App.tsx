import React, { useEffect } from 'react';
import { useAppStore } from './store';
import { TitleScreen } from './components/TitleScreen';
import { ChapterSelect } from './components/ChapterSelect';
import { StageSelect } from './components/StageSelect';
import { PuzzleBoard } from './components/PuzzleBoard';
import { Dashboard } from './components/Dashboard';
import { auth, db } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export default function App() {
  const { screen, setUnlockedStages, setScreen } = useAppStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && !user.isAnonymous) {
        try {
          const userRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const data = userSnap.data();
            if (data.unlockedStages) {
              setUnlockedStages(data.unlockedStages);
            }
          }
        } catch (error) {
          console.error("Failed to fetch user data", error);
        }
      } else {
        // Reset to default for guests or logged out users
        setUnlockedStages({ 1: 1, 2: 1, 3: 1 });
        if (!user) {
          setScreen('title');
        }
      }
    });

    return () => unsubscribe();
  }, [setUnlockedStages, setScreen]);

  return (
    <div className="font-sans antialiased">
      {screen === 'title' && <TitleScreen />}
      {screen === 'chapter_select' && <ChapterSelect />}
      {screen === 'stage_select' && <StageSelect />}
      {screen === 'puzzle' && <PuzzleBoard />}
      {screen === 'dashboard' && <Dashboard />}
    </div>
  );
}
