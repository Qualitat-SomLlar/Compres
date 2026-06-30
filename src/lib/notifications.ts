import { sendEmail } from "./email.ts";
import { sendPushNotification } from "./fcm.ts";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "./firebase.ts";

export async function notifyUsersByRole(role: string, title: string, body: string, url: string) {
  try {
    const q = query(collection(db, 'users'), where('role', '==', role));
    const snap = await getDocs(q);
    const targetUsers = snap.docs.map(d => ({ id: d.id, ...d.data() as any }));
    
    for (const user of targetUsers) {
      // Send FCM push notification
      await sendPushNotification(user.id, title, body, url);
      
      // Send Email
      if (user.email) {
        await sendEmail(
          user.email,
          title,
          `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
            <div style="background: #2563eb; color: #fff; padding: 16px 24px;">
              <h2 style="margin: 0; font-size: 18px;">${title}</h2>
            </div>
            <div style="padding: 24px; color: #334155; line-height: 1.5;">
              <p style="margin-top: 0;">Hola ${user.displayName || 'Usuari/a'},</p>
              <p>${body}</p>
              <div style="margin-top: 24px;">
                <a href="${url}" style="display: inline-block; background: #2563eb; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: bold;">Veure a la plataforma</a>
              </div>
            </div>
            <div style="background: #f8fafc; padding: 12px 24px; text-align: center; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0;">
              Aquest és un missatge automàtic de la Plataforma de Compres.
            </div>
          </div>
          `
        );
      }
    }
  } catch (error) {
    console.error("Error notifying users by role:", error);
  }
}
