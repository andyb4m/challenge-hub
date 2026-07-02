"use client";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  GoogleAuthProvider,
  type User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  firebaseAuth,
  firestoreDb,
  firebaseStorage,
} from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { buildNewUser } from "@/lib/auth/user-doc";
import type { User } from "@/types";

function userRef(uid: string) {
  return doc(firestoreDb(), COLLECTIONS.users, uid);
}

/**
 * Creates the users/{uid} document if it doesn't exist yet, merging any
 * overrides (e.g. the display name chosen at registration) either way.
 * Safe to call multiple times and from concurrent code paths.
 */
export async function ensureUserDocument(
  authUser: FirebaseUser,
  overrides: Partial<Pick<User, "displayName" | "photoURL">> = {}
): Promise<void> {
  const refDoc = userRef(authUser.uid);
  const snap = await getDoc(refDoc);
  if (!snap.exists()) {
    await setDoc(refDoc, { ...buildNewUser(authUser), ...overrides });
  } else if (Object.keys(overrides).length > 0) {
    await setDoc(refDoc, overrides, { merge: true });
  }
}

export async function registerWithEmail(
  displayName: string,
  email: string,
  password: string
): Promise<void> {
  const cred = await createUserWithEmailAndPassword(firebaseAuth(), email, password);
  await updateProfile(cred.user, { displayName });
  await ensureUserDocument(cred.user, { displayName });
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<void> {
  await signInWithEmailAndPassword(firebaseAuth(), email, password);
}

export async function signInWithGoogle(): Promise<void> {
  const cred = await signInWithPopup(firebaseAuth(), new GoogleAuthProvider());
  await ensureUserDocument(cred.user);
}

export async function signOutUser(): Promise<void> {
  await signOut(firebaseAuth());
}

export async function updateDisplayName(
  authUser: FirebaseUser,
  displayName: string
): Promise<void> {
  await updateProfile(authUser, { displayName });
  await updateDoc(userRef(authUser.uid), { displayName });
}

export async function uploadProfilePhoto(
  authUser: FirebaseUser,
  file: File
): Promise<string> {
  const photoRef = ref(firebaseStorage(), `users/${authUser.uid}/profile`);
  await uploadBytes(photoRef, file, { contentType: file.type });
  const photoURL = await getDownloadURL(photoRef);
  await updateProfile(authUser, { photoURL });
  await updateDoc(userRef(authUser.uid), { photoURL });
  return photoURL;
}

export async function disconnectStrava(uid: string): Promise<void> {
  await updateDoc(userRef(uid), { strava: null });
}

/** Maps Firebase Auth error codes to messages fit for showing to users. */
export function friendlyAuthError(err: unknown): string {
  const code =
    typeof err === "object" && err !== null && "code" in err
      ? String((err as { code: unknown }).code)
      : "";

  switch (code) {
    case "auth/email-already-in-use":
      return "An account with this email already exists. Try signing in instead.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Incorrect email or password.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Sign-in was cancelled.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    default:
      return "Something went wrong. Please try again.";
  }
}
