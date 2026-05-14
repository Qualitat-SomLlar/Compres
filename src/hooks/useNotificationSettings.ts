import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { NotificationSetting } from '../types';

export function useNotificationSettings() {
  const [settings, setSettings] = useState<NotificationSetting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'notificationSettings'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id,
        } as NotificationSetting));
        setSettings(data);
        setLoading(false);
      },
      (err) => {
        console.error("Error carregant configuració de notificacions:", err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const updateSetting = async (id: string, data: Partial<NotificationSetting>) => {
    const docRef = doc(db, 'notificationSettings', id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString()
    });
  };

  return { settings, loading, updateSetting };
}
