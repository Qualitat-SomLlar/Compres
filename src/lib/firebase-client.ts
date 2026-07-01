import { getApps, initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');

let messaging: import("firebase/messaging").Messaging | null = null;
try {
  messaging = getMessaging(app);
} catch (e) {
  console.log("Firebase messaging not supported or configured incorrectly.", e);
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
