import React, { useEffect, useState, useRef } from 'react';
import { useAppStore } from '../store';
import { translations } from '../i18n';
import { getPuzzle } from '../data/puzzles';
import { createInitialBoard, shuffleBoard, isSolved, getValidMoves, Tile } from '../utils/puzzleLogic';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from '../firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, getDoc } from 'firebase/firestore';

export const PuzzleBoard: React.FC = () => {
  const { language, setScreen, currentChapter, currentStage, unlockNextStage, unlockedStages, setStage } = useAppStore();
  const t = translations[language];
  const puzzle = getPuzzle(currentChapter!, currentStage!);

  const [board, setBoard] = useState<Tile[]>([]);
  const [moves, setMoves] = useState(0);
  const [timeLeft, setTimeLeft] = useState(puzzle?.timeLimit || 0);
  const [status, setStatus] = useState<'playing' | 'success' | 'failed' | 'skipped' | 'abandoned' | 'restarted'>('playing');
  const [firstMoveTime, setFirstMoveTime] = useState<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (puzzle) {
      const initial = createInitialBoard(puzzle.word, puzzle.gridSize);
      setBoard(shuffleBoard(initial, puzzle.gridSize, 1000));
      setTimeLeft(puzzle.timeLimit);
      setMoves(0);
      setStatus('playing');
      setFirstMoveTime(null);
      startTimeRef.current = Date.now();
    }
  }, [puzzle]);

  useEffect(() => {
    if (status === 'playing' && timeLeft > 0) {
      timerRef.current = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (status === 'playing' && timeLeft === 0) {
      handleGameEnd('failed_time');
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timeLeft, status]);

  const handleGameEnd = async (endStatus: 'completed' | 'failed_time' | 'skipped' | 'abandoned' | 'restarted', finalMoves?: number) => {
    setStatus(endStatus === 'completed' ? 'success' : endStatus === 'failed_time' ? 'failed' : endStatus === 'skipped' ? 'skipped' : endStatus === 'restarted' ? 'restarted' : 'abandoned');
    if (timerRef.current) clearTimeout(timerRef.current);

    const user = auth.currentUser;
    if (!user || !puzzle) return;

    // Skip Firestore for anonymous users
    if (user.isAnonymous) {
      if (endStatus === 'completed') {
        unlockNextStage(puzzle.chapter, puzzle.stage);
      }
      return;
    }

    const durationMs = Date.now() - startTimeRef.current;
    const actualMoves = finalMoves !== undefined ? finalMoves : moves;

    try {
      // Record telemetry
      await addDoc(collection(db, `users/${user.uid}/runs`), {
        uid: user.uid,
        chapterId: puzzle.chapter,
        stageId: puzzle.stage,
        status: endStatus,
        startedAt: new Date(startTimeRef.current),
        endedAt: serverTimestamp(),
        durationMs,
        firstMoveTimeMs: firstMoveTime,
        moveCount: actualMoves,
        gridSize: puzzle.gridSize
      });

      // Update user progress if completed
      if (endStatus === 'completed') {
        unlockNextStage(puzzle.chapter, puzzle.stage);
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const currentUnlocked = userSnap.data().unlockedStages || {};
          const currentChapterUnlocked = currentUnlocked[puzzle.chapter] || 1;
          
          if (puzzle.stage >= currentChapterUnlocked && puzzle.stage < 9) {
            await updateDoc(userRef, {
              [`unlockedStages.${puzzle.chapter}`]: puzzle.stage + 1
            });
          }
        }
      }
    } catch (error) {
      console.error("Error saving telemetry", error);
    }
  };

  const handleTileClick = (index: number) => {
    if (status !== 'playing' || !puzzle) return;

    const emptyIndex = board.findIndex(t => t.isEmpty);
    const validMoves = getValidMoves(emptyIndex, puzzle.gridSize);

    if (validMoves.includes(index)) {
      if (moves === 0) {
        setFirstMoveTime(Date.now() - startTimeRef.current);
      }

      const newBoard = [...board];
      const temp = newBoard[emptyIndex];
      newBoard[emptyIndex] = newBoard[index];
      newBoard[index] = temp;

      setBoard(newBoard);
      setMoves(prev => prev + 1);

      if (isSolved(newBoard, puzzle.word)) {
        handleGameEnd('completed', moves + 1);
      }
    }
  };

  const handleRestart = () => {
    if (status === 'playing') {
      handleGameEnd('restarted');
    }
    if (puzzle) {
      const initial = createInitialBoard(puzzle.word, puzzle.gridSize);
      setBoard(shuffleBoard(initial, puzzle.gridSize, 1000));
      setTimeLeft(puzzle.timeLimit);
      setMoves(0);
      setStatus('playing');
      setFirstMoveTime(null);
      startTimeRef.current = Date.now();
    }
  };

  const handleSkip = () => {
    handleGameEnd('skipped');
  };

  const handleBack = () => {
    if (status === 'playing') {
      handleGameEnd('abandoned');
    }
    setScreen('stage_select');
  };

  if (!puzzle) return null;

  const gridClass = puzzle.gridSize === 2 ? 'grid-cols-2' : puzzle.gridSize === 3 ? 'grid-cols-3' : 'grid-cols-4';
  const timePercentage = (timeLeft / puzzle.timeLimit) * 100;
  let barColor = 'bg-emerald-500';
  if (timePercentage < 50) barColor = 'bg-amber-500';
  if (timePercentage < 20) barColor = 'bg-rose-500';

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-2xl flex justify-between items-center mb-6">
        <button 
          onClick={handleBack}
          className="text-stone-400 hover:text-white transition-colors"
        >
          &larr; {t.back}
        </button>
        <h2 className="text-2xl font-serif text-amber-500">
          {t.chapter} {currentChapter} - {t.stage} {currentStage}
        </h2>
        <div className="w-16"></div>
      </div>

      <div className="w-full max-w-md bg-stone-800/80 p-4 rounded-xl border border-stone-700 mb-6 text-center shadow-lg">
        <h3 className="text-sm text-stone-400 uppercase tracking-widest mb-1">{t.targetWord}</h3>
        <p className="text-2xl md:text-3xl font-serif font-bold text-amber-400 tracking-widest mb-2">
          {puzzle.word}
        </p>
        {language !== 'en' && puzzle.meanings[language] && (
          <p className="text-stone-300 text-sm md:text-base bg-stone-900/50 inline-block px-4 py-1 rounded-full">
            {puzzle.meanings[language]}
          </p>
        )}
      </div>

      <div className="w-full max-w-md flex flex-col mb-6 bg-stone-800/50 p-4 rounded-xl border border-stone-700">
        <div className="flex justify-between items-end mb-2">
          <div className="flex flex-col">
            <span className="text-stone-400 text-sm">{t.timeRemaining}</span>
            <span className={`text-xl font-mono font-bold ${timeLeft <= 5 ? 'text-rose-500 animate-pulse' : 'text-amber-400'}`}>
              {timeLeft}s
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-stone-400 text-sm">{t.moves}</span>
            <span className="text-xl font-mono font-bold text-stone-200">{moves}</span>
          </div>
        </div>
        
        <div className="w-full h-3 bg-stone-900 rounded-full overflow-hidden border border-stone-700">
          <motion.div
            className={`h-full ${barColor}`}
            initial={{ width: '100%' }}
            animate={{ width: `${timePercentage}%` }}
            transition={{ duration: 1, ease: "linear" }}
          />
        </div>
      </div>

      <div className="w-full max-w-md aspect-square bg-stone-800 p-2 rounded-xl border-4 border-amber-900/50 shadow-2xl shadow-amber-900/20 mb-8 relative">
        <div className={`grid ${gridClass} gap-2 w-full h-full`}>
          {board.map((tile, index) => (
            <motion.div
              key={tile.id}
              layout
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              onClick={() => handleTileClick(index)}
              className={`
                flex items-center justify-center rounded-lg text-3xl md:text-5xl font-bold font-serif
                ${tile.isEmpty 
                  ? 'bg-transparent' 
                  : 'bg-gradient-to-br from-amber-200 to-amber-500 text-amber-950 cursor-pointer shadow-md hover:brightness-110 border border-amber-300'
                }
              `}
            >
              {!tile.isEmpty && tile.char}
            </motion.div>
          ))}
        </div>

        <AnimatePresence>
          {status !== 'playing' && status !== 'abandoned' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-stone-900/80 backdrop-blur-sm rounded-lg flex flex-col items-center justify-center p-6 z-10"
            >
              <h3 className={`text-4xl font-bold mb-6 ${status === 'success' ? 'text-emerald-400' : status === 'failed' ? 'text-rose-500' : 'text-stone-400'}`}>
                {status === 'success' ? t.success : status === 'failed' ? t.failed : t.skip}
              </h3>
              
              <div className="flex flex-col space-y-3 w-full max-w-xs">
                {status === 'success' && currentStage! < 9 && (
                  <button 
                    onClick={() => {
                      setScreen('stage_select');
                      setTimeout(() => setStage(currentStage! + 1), 0);
                    }}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors"
                  >
                    {t.nextStage}
                  </button>
                )}
                <button 
                  onClick={handleRestart}
                  className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg transition-colors"
                >
                  {t.restart}
                </button>
                <button 
                  onClick={() => setScreen('stage_select')}
                  className="w-full py-3 bg-stone-700 hover:bg-stone-600 text-white font-bold rounded-lg transition-colors"
                >
                  {t.back}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex space-x-4">
        <button 
          onClick={handleRestart}
          className="px-6 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg transition-colors border border-stone-700"
        >
          {t.restart}
        </button>
        <button 
          onClick={handleSkip}
          className="px-6 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg transition-colors border border-stone-700"
        >
          {t.skip}
        </button>
      </div>
    </div>
  );
};
