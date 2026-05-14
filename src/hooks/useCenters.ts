import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { DestinationCenter } from '../types';

export function useCenters() {
  const [centers, setCenters] = useState<DestinationCenter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Ordenem en memòria per evitar errors si no hi ha índexs a Firestore
    const q = query(collection(db, 'centers'));
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id,
        } as DestinationCenter)).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setCenters(data);
        setLoading(false);
      },
      (err) => {
        console.error("Error carregant centres:", err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const addCenter = async (data: Omit<DestinationCenter, 'id' | 'createdAt' | 'updatedAt'>) => {
    await addDoc(collection(db, 'centers'), {
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  };

  const updateCenter = async (id: string, data: Partial<DestinationCenter>) => {
    const docRef = doc(db, 'centers', id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString()
    });
  };

  const deleteCenter = async (id: string) => {
    const docRef = doc(db, 'centers', id);
    await deleteDoc(docRef);
  };

  return { centers, loading, addCenter, updateCenter, deleteCenter };
}
