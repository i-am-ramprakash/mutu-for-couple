import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, OAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAlXFc0vJXUk33woh89I5AjxaM_BA9tuQc",
  authDomain: "mutu-forcouple.firebaseapp.com",
  projectId: "mutu-forcouple",
  storageBucket: "mutu-forcouple.firebasestorage.app",
  messagingSenderId: "765750689556",
  appId: "1:765750689556:web:8152c02878f80da8040c01",
  measurementId: "G-K9QFV1Q0QB"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export const signInWithGoogle = () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    return signInWithPopup(auth, provider);
};

export const signInWithApple = () => {
    const provider = new OAuthProvider('apple.com');
    return signInWithPopup(auth, provider);
};

export { signInWithEmailAndPassword, createUserWithEmailAndPassword };
