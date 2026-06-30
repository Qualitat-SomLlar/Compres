import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
// @ts-ignore
import firebaseConfig from '../../firebase-applet-config.json' with { type: "json" };

if (!getApps().length) {
  initializeApp({
    credential: applicationDefault(),
    projectId: firebaseConfig.projectId,
  });
}

export const adminAuth = getAuth();
export const adminDb = getFirestore(undefined, firebaseConfig.firestoreDatabaseId || '(default)');
