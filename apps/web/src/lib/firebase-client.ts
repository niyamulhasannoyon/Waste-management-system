import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInWithPopup,
  signOut,
  type Auth,
  type ConfirmationResult,
  type User,
  type UserCredential,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    'AIzaSyDmtm5aMTFvBdFdkfreu1u6s3jv8ktL1I0',
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'clean-savar'}.firebaseapp.com`,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'clean-savar',
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'clean-savar'}.firebasestorage.app`,
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '343627195981',
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ||
    '1:343627195981:android:0300823af4895b8c05de04',
};

export function isFirebaseClientConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.apiKey.trim().length > 0);
}

export function getFirebaseClientApp(): FirebaseApp {
  if (getApps().length > 0) {
    return getApp();
  }
  return initializeApp(firebaseConfig);
}

export function getFirebaseAuth(): Auth {
  const app = getFirebaseClientApp();
  return getAuth(app);
}

export async function signInWithGoogle(): Promise<UserCredential> {
  const auth = getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  provider.addScope('email');
  provider.addScope('profile');
  if (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
    provider.setCustomParameters({
      prompt: 'select_account',
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    });
  } else {
    provider.setCustomParameters({
      prompt: 'select_account',
    });
  }
  return await signInWithPopup(auth, provider);
}

export async function signOutFirebaseUser(): Promise<void> {
  const auth = getFirebaseAuth();
  await signOut(auth);
}

export type { User };

export function subscribeToFirebaseUser(callback: (user: User | null) => void) {
  const auth = getFirebaseAuth();
  return onAuthStateChanged(auth, callback);
}

export function createRecaptchaVerifier(
  containerOrButtonId: string,
  callbacks?: {
    onSuccess?: () => void;
    onExpired?: () => void;
  },
): RecaptchaVerifier {
  const auth = getFirebaseAuth();
  return new RecaptchaVerifier(auth, containerOrButtonId, {
    size: 'invisible',
    callback: () => {
      callbacks?.onSuccess?.();
    },
    'expired-callback': () => {
      callbacks?.onExpired?.();
    },
  });
}

export async function sendFirebasePhoneOtp(
  phoneE164: string,
  verifier: RecaptchaVerifier,
): Promise<ConfirmationResult> {
  const auth = getFirebaseAuth();
  return await signInWithPhoneNumber(auth, phoneE164, verifier);
}
