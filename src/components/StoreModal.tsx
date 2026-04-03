import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store';
import { auth, db } from '../firebase';
import { doc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { translations } from '../i18n';

interface StoreModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StoreModal: React.FC<StoreModalProps> = ({ isOpen, onClose }) => {
  const { carpets, setCarpets, language, currentChapter, currentStage } = useAppStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [purchaseSuccessAmount, setPurchaseSuccessAmount] = useState<number | null>(null);
  
  const t = translations[language];

  const handlePurchase = async (amount: number) => {
    setIsProcessing(true);
    
    // Simulate payment processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsProcessing(false);
    setPurchaseSuccessAmount(amount);
  };

  const handleConfirmPurchase = async () => {
    if (!purchaseSuccessAmount) return;
    
    const newCarpets = carpets + purchaseSuccessAmount;
    setCarpets(newCarpets);
    
    const user = auth.currentUser;
    if (user && !user.isAnonymous) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          carpets: newCarpets
        });
        
        let cost = 0;
        if (purchaseSuccessAmount === 5) cost = 1200;
        if (purchaseSuccessAmount === 12) cost = 2500;
        if (purchaseSuccessAmount === 30) cost = 5900;
        
        await addDoc(collection(db, `users/${user.uid}/transactions`), {
          uid: user.uid,
          type: 'purchase',
          amount: purchaseSuccessAmount,
          costKrw: cost,
          chapterId: currentChapter || 0,
          stageId: currentStage || 0,
          timestamp: serverTimestamp()
        });
      } catch (error) {
        console.error("Failed to update carpets", error);
      }
    }
    
    alert(`양탄자 ${purchaseSuccessAmount}개가 지급되었습니다! 🧞‍♂️✨\n(You received ${purchaseSuccessAmount} carpets!)`);
    setPurchaseSuccessAmount(null);
    onClose();
  };

  const handleCancelPurchase = () => {
    setPurchaseSuccessAmount(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-stone-800 border border-amber-900/50 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative overflow-hidden"
          >
            {isProcessing && (
              <div className="absolute inset-0 bg-stone-900/90 z-10 flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-amber-400 font-bold animate-pulse">{t.processing}</p>
              </div>
            )}
            
            {purchaseSuccessAmount ? (
              <div className="text-center py-4">
                <h3 className="text-2xl font-bold text-amber-400 mb-4">{t.thankYou}</h3>
                <p className="text-stone-300 mb-6 leading-relaxed whitespace-pre-line">
                  {t.demoMessage.replace('{n}', purchaseSuccessAmount.toString())}
                </p>
                <div className="flex gap-3">
                  <button 
                    onClick={handleCancelPurchase} 
                    className="flex-1 py-3 bg-stone-700 hover:bg-stone-600 text-white font-bold rounded-lg transition-colors text-sm"
                  >
                    {t.cancelPayment}
                  </button>
                  <button 
                    onClick={handleConfirmPurchase} 
                    className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg transition-colors text-sm"
                  >
                    {t.proceedPayment}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-serif text-amber-500 font-bold">{t.store}</h2>
                  <button onClick={onClose} className="text-stone-400 hover:text-white text-xl">&times;</button>
                </div>
                
                <div className="bg-stone-900/50 rounded-xl p-4 mb-6 flex items-center justify-between border border-stone-700">
                  <span className="text-stone-300">{t.ownedCarpets}</span>
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-xl">
                    <span>🧞‍♂️</span> {carpets}
                  </div>
                </div>
                
                <div className="space-y-3">
                  <button 
                    onClick={() => handlePurchase(5)}
                    className="w-full bg-stone-700 hover:bg-stone-600 border border-stone-600 rounded-xl p-4 flex justify-between items-center transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🧞‍♂️</span>
                      <span className="font-bold text-stone-200">{t.carpetPack.replace('{n}', '5')}</span>
                    </div>
                    <span className="bg-amber-600 text-white px-3 py-1 rounded-full font-bold text-sm">₩1,200</span>
                  </button>
                  
                  <button 
                    onClick={() => handlePurchase(12)}
                    className="w-full bg-stone-700 hover:bg-stone-600 border border-stone-600 rounded-xl p-4 flex justify-between items-center transition-colors relative overflow-hidden"
                  >
                    <div className="absolute -right-6 top-2 bg-rose-500 text-white text-[10px] font-bold px-8 py-1 rotate-45">BEST</div>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🧞‍♂️</span>
                      <span className="font-bold text-stone-200">{t.carpetPack.replace('{n}', '12')}</span>
                    </div>
                    <span className="bg-amber-600 text-white px-3 py-1 rounded-full font-bold text-sm">₩2,500</span>
                  </button>
                  
                  <button 
                    onClick={() => handlePurchase(30)}
                    className="w-full bg-stone-700 hover:bg-stone-600 border border-stone-600 rounded-xl p-4 flex justify-between items-center transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🧞‍♂️</span>
                      <span className="font-bold text-stone-200">{t.carpetPack.replace('{n}', '30')}</span>
                    </div>
                    <span className="bg-amber-600 text-white px-3 py-1 rounded-full font-bold text-sm">₩5,900</span>
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
