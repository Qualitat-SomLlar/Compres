import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AnalyticCode } from '../types';

export function useAnalyticCodes() {
  const [codes, setCodes] = useState<AnalyticCode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'analyticCodes'), orderBy('code', 'asc'));
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id,
        } as AnalyticCode));
        setCodes(data);
        setLoading(false);
      },
      (err) => {
        console.error("Error carregant codis analítics:", err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const addCode = async (data: Omit<AnalyticCode, 'id' | 'createdAt' | 'updatedAt'>) => {
    await addDoc(collection(db, 'analyticCodes'), {
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  };

  return { codes, loading, addCode };
}
