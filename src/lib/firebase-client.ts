import { getApps, initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

let app, messaging: import("firebase/messaging").Messaging | null = null;
let db: import("firebase/firestore").Firestore | null = null;

try {
  app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
  messaging = getMessaging(app);
  db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');
} catch (e) {
  console.log("Firebase no configurat correctament. Assegura't de posar les teves credencials a src/lib/firebase-client.ts", e);
}

export { messaging, db };

export const requestFirebaseNotificationPermission = async () => {
  if (!messaging) return null;
  console.log('Requesting notification permission...');
  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    console.log('Notification permission granted.');
    // Get token
    try {
      const currentToken = await getToken(messaging, {
        vapidKey: 'YOUR_PUBLIC_VAPID_KEY_HERE' // You can leave this out for basic setups, but recommended for web
      });
      if (currentToken) {
        return currentToken;
      } else {
        console.log('No registration token available. Request permission to generate one.');
      }
    } catch (err) {
      console.log('An error occurred while retrieving token. ', err);
    }
  } else {
    console.log('Unable to get permission to notify.');
  }
  return null;
};

export const onMessageListener = () =>
  new Promise((resolve) => {
    if (!messaging) return;
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });
