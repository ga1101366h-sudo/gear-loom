"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  getFirebaseAuth,
  getFirebaseFirestore,
} from "@/lib/firebase/client";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
  TwitterAuthProvider,
  type User,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string, userId: string) => Promise<void>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithX: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const auth = getFirebaseAuth();
  const db = getFirebaseFirestore();

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u ?? null);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [auth]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (!auth) throw new Error("Firebase Auth が利用できません");
      await signInWithEmailAndPassword(auth, email, password);
    },
    [auth]
  );

  const signUp = useCallback(
    async (email: string, password: string, displayName: string, userId: string) => {
      if (!auth || !db) throw new Error("Firebase が利用できません");
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const uid = cred.user.uid;
      await setDoc(doc(db, "profiles", uid), {
        display_name: displayName || email.split("@")[0],
        user_id: userId.trim().toLowerCase(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    },
    [auth, db]
  );

  const signOut = useCallback(async () => {
    if (!auth) return;
    await firebaseSignOut(auth);
  }, [auth]);

  const sendPasswordReset = useCallback(
    async (email: string) => {
      if (!auth) throw new Error("Firebase Auth が利用できません");
      const actionCodeSettings = {
        url: `${typeof window !== "undefined" ? window.location.origin : ""}/login`,
        handleCodeInApp: true,
      };
      await sendPasswordResetEmail(auth, email, actionCodeSettings);
    },
    [auth]
  );

  const signInWithGoogle = useCallback(async () => {
    if (!auth) throw new Error("Firebase Auth が利用できません");
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    if (!db) return;
    const profileRef = doc(db, "profiles", result.user.uid);
    const snap = await getDoc(profileRef);
    if (!snap.exists()) {
      await setDoc(profileRef, {
        display_name: result.user.displayName || result.user.email?.split("@")[0] || "",
        user_id: null,
        avatar_url: result.user.photoURL ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  }, [auth, db]);

  const signInWithX = useCallback(async () => {
    if (!auth) throw new Error("Firebase Auth が利用できません");
    const provider = new TwitterAuthProvider();
    const result = await signInWithPopup(auth, provider);
    if (!db) return;
    const profileRef = doc(db, "profiles", result.user.uid);
    const snap = await getDoc(profileRef);
    if (!snap.exists()) {
      await setDoc(profileRef, {
        display_name: result.user.displayName || result.user.email?.split("@")[0] || "",
        user_id: null,
        avatar_url: result.user.photoURL ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  }, [auth, db]);

  const value: AuthContextValue = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    sendPasswordReset,
    signInWithGoogle,
    signInWithX,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx == null) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
