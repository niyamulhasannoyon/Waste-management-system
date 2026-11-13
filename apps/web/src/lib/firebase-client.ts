import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type Auth,
  type ConfirmationResult,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'clean-savar'}.firebaseapp.com`,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'clean-savar',
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'clean-savar'}.firebasestorage.app`,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
};

export function isFirebaseClientConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY.trim().length > 0,
  );
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
