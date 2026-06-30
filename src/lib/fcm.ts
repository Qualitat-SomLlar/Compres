import { initializeApp, getApps } from 'firebase-admin/app';
import { getMessaging, MulticastMessage } from 'firebase-admin/messaging';
import { getFirestore, collection, query, where, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase.ts';

// Check if Firebase admin is initialized
if (!getApps().length) {
  // Try to initialize. It will try to use GOOGLE_APPLICATION_CREDENTIALS or default app engine credentials
  try {
    initializeApp();
    console.log('Firebase Admin initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK:', error);
  }
}

export async function sendPushNotification(userId: string, title: string, body: string, url?: string) {
  if (!getApps().length) {
    console.log(`[FCM Mock] Push to user ${userId} | Title: ${title} | Body: ${body}`);
    return;
  }

  try {
    const tokensRef = collection(db, 'userFcmTokens');
    const q = query(tokensRef, where('userId', '==', userId));
    const tokenSnap = await getDocs(q);
    
    if (tokenSnap.empty) {
      console.log(`No FCM tokens found for user ${userId}`);
      return;
    }

    const tokens = tokenSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));
    const invalidTokens: string[] = [];

    const message: MulticastMessage = {
      notification: {
        title,
        body,
      },
      tokens: tokens.map((t) => t.token),
      webpush: url ? {
        fcmOptions: {
          link: url
        }
      } : undefined
    };

    const response = await getMessaging().sendEachForMulticast(message);
    
    // Check for failed tokens (e.g. unregistered)
    response.responses.forEach((res, idx) => {
      if (!res.success) {
        if (res.error?.code === 'messaging/invalid-registration-token' ||
            res.error?.code === 'messaging/registration-token-not-registered') {
          invalidTokens.push(tokens[idx].id);
        }
      }
    });

    if (invalidTokens.length > 0) {
      for (const id of invalidTokens) {
         await deleteDoc(doc(db, 'userFcmTokens', id));
      }
    }

  } catch (error) {
    console.error(`Failed to send push notification to user ${userId}:`, error);
  }
}
