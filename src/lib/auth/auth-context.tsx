"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { firebaseAuth, firestoreDb } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { ensureUserDocument } from "@/lib/auth/service";
import type { User } from "@/types";

interface AuthContextValue {
  /** The raw Firebase Auth user, or null when signed out. */
  user: FirebaseUser | null;
  /** The Firestore users/{uid} profile document, kept live via onSnapshot. */
  profile: User | null;
  /** True until the initial auth state has resolved. */
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(firebaseAuth(), (firebaseUser) => {
      unsubscribeProfile?.();
      unsubscribeProfile = null;

      setUser(firebaseUser);

      if (!firebaseUser) {
        setProfile(null);
        setLoading(false);
        return;
      }

      // Create the profile doc on first sign-in (covers Google one-click flow)
      ensureUserDocument(firebaseUser).catch((err) => {
        console.error("Failed to ensure user document", err);
      });

      unsubscribeProfile = onSnapshot(
        doc(firestoreDb(), COLLECTIONS.users, firebaseUser.uid),
        (snap) => {
          setProfile(snap.exists() ? (snap.data() as User) : null);
          setLoading(false);
        },
        (err) => {
          console.error("Profile snapshot failed", err);
          setProfile(null);
          setLoading(false);
        }
      );
    });

    return () => {
      unsubscribeAuth();
      unsubscribeProfile?.();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
