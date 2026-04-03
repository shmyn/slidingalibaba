import React, { useEffect, useState, useRef } from 'react';
import { useAppStore } from '../store';
import { translations } from '../i18n';
import { getPuzzle } from '../data/puzzles';
import { createInitialBoard, shuffleBoard, isSolved, getValidMoves, Tile } from '../utils/puzzleLogic';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from '../firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, getDoc, collectionGroup, query, where, getDocs } from 'firebase/firestore';

import { StoreModal } from './StoreModal';

export const PuzzleBoard: React.FC = () => {
  const { language, setScreen, currentChapter, currentStage, unlockNextStage, unlockedStages, setStage, carpets, setCarpets, nickname } = useAppStore();
  const t = translations[language];
  const puzzle = getPuzzle(currentChapter!, currentStage!);

  const [board, setBoard] = useState<Tile[]>([]);
  const [moves, setMoves] = useState(0);
  const [timeLeft, setTimeLeft] = useState(puzzle?.timeLimit || 0);
  const [freezeTimeLeft, setFreezeTimeLeft] = useState(0);
  const [status, setStatus] = useState<'playing' | 'success' | 'failed' | 'skipped' | 'abandoned' | 'restarted' | 'shuffling'>('shuffling');
  const [firstMoveTime, setFirstMoveTime] = useState<number | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  
  const startTimeRef = useRef<number>(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (!puzzle || !auth.currentUser) return;
      try {
        const runsRef = collectionGroup(db, 'runs');
        // Use only one where clause to avoid composite index requirement, filter the rest client-side
        const q = query(runsRef, where('status', '==', 'completed'));
        const snapshot = await getDocs(q);
        
        const runs = snapshot.docs
          .map(d => d.data())
          .filter(d => d.chapterId === puzzle.chapter && d.stageId === puzzle.stage && !d.isAnonymous);
          
        const sorted = runs.sort((a, b) => a.durationMs - b.durationMs).slice(0, 5);
        setLeaderboard(sorted);
      } catch (error) {
        console.error("Failed to fetch leaderboard", error);
      }
    };
    fetchLeaderboard();
  }, [puzzle]);

  useEffect(() => {
    if (puzzle) {
      const initial = createInitialBoard(puzzle.word, puzzle.gridSize);
      setBoard(initial);
      setTimeLeft(puzzle.timeLimit);
      setMoves(0);
      setStatus('shuffling');
      setFirstMoveTime(null);
    }
  }, [puzzle]);

  useEffect(() => {
    if (status === 'shuffling' && puzzle) {
      let count = 0;
      const maxShuffles = puzzle.gridSize === 3 ? 40 : 80;
      let currentBoard = createInitialBoard(puzzle.word, puzzle.gridSize);

      const shuffleInterval = setInterval(() => {
        const emptyIndex = currentBoard.findIndex(t => t.isEmpty);
        const validMoves = getValidMoves(emptyIndex, puzzle.gridSize);
        const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];

        const newBoard = [...currentBoard];
        [newBoard[emptyIndex], newBoard[randomMove]] = [newBoard[randomMove], newBoard[emptyIndex]];
        currentBoard = newBoard;
        setBoard(newBoard);

        count++;
        if (count >= maxShuffles) {
          clearInterval(shuffleInterval);
          setStatus('playing');
          startTimeRef.current = Date.now();
        }
      }, 30);

      return () => clearInterval(shuffleInterval);
    }
  }, [status, puzzle]);

  useEffect(() => {
    if (status === 'playing') {
      if (freezeTimeLeft > 0) {
        timerRef.current = setTimeout(() => setFreezeTimeLeft(prev => prev - 1), 1000);
      } else if (timeLeft > 0) {
        timerRef.current = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
      } else if (timeLeft === 0) {
        handleGameEnd('failed_time');
      }
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timeLeft, freezeTimeLeft, status]);

  const handleGameEnd = async (endStatus: 'completed' | 'failed_time' | 'skipped' | 'abandoned' | 'restarted', finalMoves?: number) => {
    setStatus(endStatus === 'completed' ? 'success' : endStatus === 'failed_time' ? 'failed' : endStatus === 'skipped' ? 'skipped' : endStatus === 'restarted' ? 'restarted' : 'abandoned');
    if (timerRef.current) clearTimeout(timerRef.current);

    const user = auth.currentUser;
    if (!user || !puzzle) return;

    const durationMs = Date.now() - startTimeRef.current;
    const actualMoves = finalMoves !== undefined ? finalMoves : moves;

    try {
      // Record telemetry for EVERYONE (including guests)
      await addDoc(collection(db, `users/${user.uid}/runs`), {
        uid: user.uid,
        nickname: nickname || 'Guest',
        isAnonymous: user.isAnonymous,
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

      // Update user progress if completed or skipped
      if (endStatus === 'completed' || endStatus === 'skipped') {
        unlockNextStage(puzzle.chapter, puzzle.stage);
        
        // Only save progress to Firestore for non-anonymous users
        if (!user.isAnonymous) {
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
      setBoard(initial);
      setTimeLeft(puzzle.timeLimit);
      setFreezeTimeLeft(0);
      setMoves(0);
      setStatus('shuffling');
      setFirstMoveTime(null);
    }
  };

  const handleFreeze = async () => {
    if (carpets >= 1 && freezeTimeLeft === 0) {
      setCarpets(carpets - 1);
      setFreezeTimeLeft(30);
      const user = auth.currentUser;
      if (user && !user.isAnonymous) {
        try {
          await updateDoc(doc(db, 'users', user.uid), {
            carpets: carpets - 1
          });
          await addDoc(collection(db, `users/${user.uid}/transactions`), {
            uid: user.uid,
            type: 'use_freeze',
            amount: -1,
            chapterId: puzzle?.chapter || 0,
            stageId: puzzle?.stage || 0,
            timeRatio: puzzle ? timeLeft / puzzle.timeLimit : 0,
            timestamp: serverTimestamp()
          });
        } catch (error) {
          console.error("Failed to update carpets", error);
        }
      }
    } else if (freezeTimeLeft > 0) {
      alert(t.freezeInUse);
    } else {
      alert(t.notEnoughCarpets);
    }
  };

  const handleSkip = async () => {
    if (carpets >= 2) {
      setCarpets(carpets - 2);
      const user = auth.currentUser;
      if (user && !user.isAnonymous) {
        try {
          await updateDoc(doc(db, 'users', user.uid), {
            carpets: carpets - 2
          });
          await addDoc(collection(db, `users/${user.uid}/transactions`), {
            uid: user.uid,
            type: 'use_skip',
            amount: -2,
            chapterId: puzzle?.chapter || 0,
            stageId: puzzle?.stage || 0,
            timeRatio: puzzle ? timeLeft / puzzle.timeLimit : 0,
            timestamp: serverTimestamp()
          });
        } catch (error) {
          console.error("Failed to update carpets", error);
        }
      }
      handleGameEnd('skipped');
    } else {
      alert(t.skipCost);
    }
  };

  const handleShare = () => {
    const duration = ((Date.now() - startTimeRef.current) / 1000).toFixed(1);
    const text = t.shareText
      .replace('{name}', nickname || 'Guest')
      .replace('{c}', puzzle?.chapter?.toString() || '')
      .replace('{s}', puzzle?.stage?.toString() || '')
      .replace('{t}', duration)
      .replace('{url}', window.location.href);
    
    if (navigator.share) {
      navigator.share({
        title: 'Sliding Alibaba Clear!',
        text: text,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(text);
      alert(t.copied);
    }
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
          className="text-stone-400 hover:text-white transition-colors whitespace-nowrap"
        >
          &larr; {t.back}
        </button>
        <h2 className="text-xl md:text-2xl font-serif text-amber-500 text-center mx-2">
          {t.chapter} {currentChapter} - {t.stage} {currentStage}
        </h2>
        <button 
          onClick={() => setIsStoreOpen(true)}
          className="flex items-center gap-2 text-amber-400 font-bold bg-stone-800/80 px-3 py-1 rounded-full border border-amber-900/50 hover:bg-stone-700 transition-colors whitespace-nowrap"
        >
          <span className="text-lg">🧞‍♂️</span> {carpets}
        </button>
      </div>

      <div className="w-full max-w-5xl flex flex-col md:flex-row gap-8 items-start justify-center">
        <div className="w-full max-w-md flex flex-col items-center">
          <div className="w-full bg-stone-800/80 p-4 rounded-xl border border-stone-700 mb-6 text-center shadow-lg">
            <h3 className="text-sm text-stone-400 uppercase tracking-widest mb-1">{t.targetWord}</h3>
            <p className="text-2xl md:text-3xl font-serif font-bold text-amber-400 tracking-widest mb-2 break-all">
              {puzzle.word}
            </p>
            {language !== 'en' && puzzle.meanings[language] && (
              <p className="text-stone-300 text-sm md:text-base bg-stone-900/50 inline-block px-4 py-1 rounded-full break-keep">
                {puzzle.meanings[language]}
              </p>
            )}
          </div>

          <div className="w-full flex flex-col mb-6 bg-stone-800/50 p-4 rounded-xl border border-stone-700">
            <div className="flex justify-between items-end mb-2">
              <div className="flex flex-col">
                <span className="text-stone-400 text-sm">{t.timeRemaining}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-xl font-mono font-bold ${timeLeft <= 5 && freezeTimeLeft === 0 ? 'text-rose-500 animate-pulse' : 'text-amber-400'}`}>
                    {timeLeft}s
                  </span>
                  {freezeTimeLeft > 0 && (
                    <span className="text-cyan-400 text-sm font-bold animate-pulse">❄️ {freezeTimeLeft}s</span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-stone-400 text-sm">{t.moves}</span>
                <span className="text-xl font-mono font-bold text-stone-200">{moves}</span>
              </div>
            </div>
            
            <div className="w-full h-3 bg-stone-900 rounded-full overflow-hidden border border-stone-700">
              <motion.div
                className={`h-full ${freezeTimeLeft > 0 ? 'bg-cyan-500' : barColor}`}
                initial={{ width: '100%' }}
                animate={{ width: `${timePercentage}%` }}
                transition={{ duration: 1, ease: "linear" }}
              />
            </div>
          </div>

          <div className="w-full aspect-square bg-stone-800 p-2 rounded-xl border-4 border-amber-900/50 shadow-2xl shadow-amber-900/20 mb-8 relative">
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
              {status !== 'playing' && status !== 'shuffling' && status !== 'abandoned' && (
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
                    {status === 'success' && (
                      <button 
                        onClick={handleShare}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 text-sm md:text-base"
                      >
                        {t.shareBtn}
                      </button>
                    )}
                    {(status === 'success' || status === 'skipped') && currentStage! < 9 && (
                      <button 
                        onClick={() => {
                          setScreen('stage_select');
                          setTimeout(() => setStage(currentStage! + 1), 0);
                        }}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors text-sm md:text-base"
                      >
                        {t.nextStage}
                      </button>
                    )}
                    <button 
                      onClick={handleRestart}
                      className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg transition-colors text-sm md:text-base"
                    >
                      {t.restart}
                    </button>
                    <button 
                      onClick={() => setScreen('stage_select')}
                      className="w-full py-3 bg-stone-700 hover:bg-stone-600 text-white font-bold rounded-lg transition-colors text-sm md:text-base"
                    >
                      {t.back}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex space-x-2 md:space-x-4 w-full justify-center">
            <button 
              onClick={handleFreeze}
              disabled={status === 'shuffling' || carpets < 1 || freezeTimeLeft > 0}
              className="flex-1 md:flex-none px-2 md:px-4 py-2 bg-stone-800 hover:bg-stone-700 text-cyan-400 rounded-lg transition-colors border border-stone-700 flex items-center justify-center gap-1 md:gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-xs md:text-sm whitespace-nowrap"
            >
              {t.freezeItem}
            </button>
            <button 
              onClick={handleRestart}
              disabled={status === 'shuffling'}
              className="flex-1 md:flex-none px-2 md:px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg transition-colors border border-stone-700 disabled:opacity-50 disabled:cursor-not-allowed text-xs md:text-sm whitespace-nowrap"
            >
              {t.restart}
            </button>
            <button 
              onClick={handleSkip}
              disabled={status === 'shuffling' || carpets < 2}
              className="flex-1 md:flex-none px-2 md:px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg transition-colors border border-stone-700 flex items-center justify-center gap-1 md:gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-xs md:text-sm whitespace-nowrap"
            >
              {t.skip} (🧞‍♂️ 2)
            </button>
          </div>
        </div>

        <div className="w-full md:w-64 flex flex-col gap-4">
          <div className="w-full bg-stone-800/50 rounded-xl border border-stone-700 p-4 flex flex-col">
            <h3 className="text-amber-500 font-serif font-bold text-lg mb-4 flex items-center gap-2">
              {t.hallOfFame}
            </h3>
            <div className="flex flex-col gap-3">
              {leaderboard.length === 0 ? (
                <p className="text-stone-500 text-sm text-center py-4">{t.noRecords}</p>
              ) : (
                leaderboard.map((run, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-stone-900/50 p-2 rounded-lg border border-stone-700/50">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold w-4 text-center ${idx === 0 ? 'text-amber-400' : idx === 1 ? 'text-stone-300' : idx === 2 ? 'text-amber-700' : 'text-stone-500'}`}>
                        {idx + 1}
                      </span>
                      <span className="text-stone-200 text-sm truncate max-w-[100px]">{run.nickname || 'Player'}</span>
                    </div>
                    <span className="text-amber-500 font-mono text-sm">{(run.durationMs / 1000).toFixed(1)}s</span>
                  </div>
                ))
              )}
            </div>
          </div>
          
          {auth.currentUser?.isAnonymous && (
            <div className="w-full bg-stone-900/80 rounded-xl border border-stone-700 p-4 text-center">
              <p className="text-stone-400 text-sm mb-3 break-keep">{t.guestPrompt}</p>
              <button 
                onClick={() => setScreen('title')} 
                className="w-full py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-600/50 font-bold rounded-lg transition-colors text-sm whitespace-nowrap"
              >
                {t.loginToRank}
              </button>
            </div>
          )}
        </div>
      </div>
      
      <StoreModal isOpen={isStoreOpen} onClose={() => setIsStoreOpen(false)} />
    </div>
  );
};
