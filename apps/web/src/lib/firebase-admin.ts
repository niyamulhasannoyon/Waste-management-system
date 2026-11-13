import fs from 'node:fs';
import path from 'node:path';
import {
  cert,
  getApp,
  getApps,
  initializeApp,
  type App,
  type ServiceAccount,
} from 'firebase-admin/app';
import { getAuth, type Auth, type DecodedIdToken } from 'firebase-admin/auth';

let adminApp: App | null = null;

export function getFirebaseAdminApp(): App {
  if (adminApp) {
    return adminApp;
  }
  const existing = getApps();
  if (existing.length > 0) {
    adminApp = existing[0]!;
    return adminApp;
  }

  // 1. Try inline JSON env var
  const inlineKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (inlineKey && inlineKey.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(inlineKey) as ServiceAccount;
      adminApp = initializeApp({
        credential: cert(parsed),
        projectId: parsed.projectId || 'clean-savar',
      });
      return adminApp;
    } catch (e) {
      console.warn('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY JSON:', e);
    }
  }

  // 2. Try file paths
  const candidatePaths = [
    inlineKey,
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
    path.resolve(process.cwd(), 'serviceAccountKey.json'),
    path.resolve(process.cwd(), '../api/serviceAccountKey.json'),
    path.resolve(process.cwd(), 'apps/api/serviceAccountKey.json'),
  ].filter(Boolean) as string[];

  for (const filePath of candidatePaths) {
    try {
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(fileContent) as ServiceAccount;
        adminApp = initializeApp({
          credential: cert(parsed),
          projectId: parsed.projectId || 'clean-savar',
        });
        return adminApp;
      }
    } catch (e) {
      console.warn(`Failed reading Firebase credentials from ${filePath}:`, e);
    }
  }

  // 3. Fallback to project ID default
  try {
    adminApp = initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'clean-savar',
    });
  } catch (e) {
    console.warn('Fallback Firebase Admin initialization:', e);
    adminApp = getApp();
  }

  return adminApp;
}

export function getFirebaseAdminAuth(): Auth {
  return getAuth(getFirebaseAdminApp());
}

/**
 * Standard Firebase Admin helper exposing `admin.auth().verifyIdToken(idToken)`
 */
export const admin = {
  auth: () => getFirebaseAdminAuth(),
  app: () => getFirebaseAdminApp(),
};

/**
 * Verifies a client-provided Firebase ID token and returns the decoded token.
 */
export async function verifyFirebaseIdToken(idToken: string): Promise<DecodedIdToken> {
  return await admin.auth().verifyIdToken(idToken);
}

export default admin;
