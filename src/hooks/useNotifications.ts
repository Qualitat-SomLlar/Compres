import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, query, where, orderBy, updateDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AppNotification } from '../types';

export function useNotifications(userId?: string) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId)
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const notifs = snapshot.docs
          .map(doc => ({
            ...doc.data(),
            id: doc.id
          } as AppNotification))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        setNotifications(notifs);
        setUnreadCount(notifs.filter(n => !n.read).length);
      },
      (error) => {
        console.error("Error a useNotifications:", error);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  const addNotification = async (notif: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => {
    await addDoc(collection(db, 'notifications'), {
      ...notif,
      read: false,
      createdAt: new Date().toISOString()
    });
  };

  const markAsRead = async (id: string) => {
    const docRef = doc(db, 'notifications', id);
    await updateDoc(docRef, { read: true });
  };

  const markAllAsRead = async () => {
    const batch = writeBatch(db);
    notifications.filter(n => !n.read).forEach(n => {
      const docRef = doc(db, 'notifications', n.id);
      batch.update(docRef, { read: true });
    });
    await batch.commit();
  };

  return {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead
  };
}
