import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAuth, type Auth } from "firebase-admin/auth";

// Initialized lazily so that importing this module never touches Firebase.
// cert() throws when FIREBASE_ADMIN_* env vars are absent, which breaks
// `next build` page-data collection for any route that imports this module
// in environments without admin credentials configured (e.g. the
// deploy-preview workflow before secrets are set — same class of bug as
// the client SDK's lazy init in firebase/client.ts).
function adminApp(): App {
  if (getApps().length > 0) return getApps()[0];

  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

export function adminDb(): Firestore {
  return getFirestore(adminApp());
}

export function adminAuth(): Auth {
  return getAuth(adminApp());
}
