import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, signInAnonymously, setPersistence, browserSessionPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export const loginAnonymously = async () => {
  try {
    // 게스트 로그인은 브라우저 세션(창을 닫으면 초기화)으로 설정
    await setPersistence(auth, browserSessionPersistence);
    const result = await signInAnonymously(auth);
    const user = result.user;
    
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        isAnonymous: true,
        displayName: 'Guest',
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
        unlockedStages: {
          "1": 1,
          "2": 1,
          "3": 1
        }
      });
    } else {
      await updateDoc(userRef, {
        lastLoginAt: serverTimestamp()
      });
    }
  } catch (error) {
    console.error("Anonymous login failed", error);
  }
};

export const loginWithGoogle = async () => {
  try {
    // 구글 로그인은 로컬(브라우저를 닫아도 유지)로 설정
    await setPersistence(auth, browserLocalPersistence);
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    
    // Check if user exists, if not create
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
        unlockedStages: {
          "1": 1,
          "2": 1,
          "3": 1
        }
      });
    } else {
      await updateDoc(userRef, {
        lastLoginAt: serverTimestamp()
      });
    }
  } catch (error) {
    console.error("Login failed", error);
  }
};

export const logout = () => signOut(auth);
