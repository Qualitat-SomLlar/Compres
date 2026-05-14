import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Worker } from '../types';

export function useWorkers() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'workers'), orderBy('fullName', 'asc'));
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id,
        } as Worker));
        setWorkers(data);
        setLoading(false);
      },
      (err) => {
        console.error("Error carregant treballadors:", err);
        setError("No s'han pogut carregar els treballadors.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const addWorker = async (worker: Omit<Worker, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const docRef = await addDoc(collection(db, 'workers'), {
      ...worker,
      createdAt: now,
      updatedAt: now
    });
    return docRef.id;
  };

  const updateWorker = async (id: string, data: Partial<Worker>) => {
    const docRef = doc(db, 'workers', id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString()
    });
  };

  const deleteWorker = async (id: string) => {
    await deleteDoc(doc(db, 'workers', id));
  };

  return { workers, loading, error, addWorker, updateWorker, deleteWorker };
}
