import { initializeApp } from "firebase/app";
import { initializeFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBt0kBGzcofhGdDpBfRazd4ZL4PBkALCP0",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "som-llar-compres.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "som-llar-compres",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "som-llar-compres.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "533552017979",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:533552017979:web:09c375cbc78c5f57eda21e"
};

const requiredConfigKeys: (keyof typeof firebaseConfig)[] = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId'
];

for (const key of requiredConfigKeys) {
  if (!firebaseConfig[key]) {
    console.error(`Error: La configuració de Firebase no té definit ${key}.`);
  }
}

export const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});
export const auth = getAuth(app);
export const storage = getStorage(app);
