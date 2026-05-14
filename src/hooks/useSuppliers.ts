import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Supplier } from '../types';

export function useSuppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Ordenem en memòria per evitar errors si no hi ha índexs a Firestore
    const q = query(collection(db, 'suppliers'));
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id,
        } as Supplier)).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setSuppliers(data);
        setLoading(false);
      },
      (err) => {
        console.error("Error carregant proveïdors:", err);
        setError("No s'han pogut carregar els proveïdors.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const addSupplier = async (supplier: Omit<Supplier, 'id'>) => {
    const docRef = await addDoc(collection(db, 'suppliers'), {
      ...supplier,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    return docRef.id;
  };

  const updateSupplier = async (id: string, data: Partial<Supplier>) => {
    const docRef = doc(db, 'suppliers', id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString()
    });
  };

  const deleteSupplier = async (id: string) => {
    await deleteDoc(doc(db, 'suppliers', id));
  };

  return { suppliers, loading, error, addSupplier, updateSupplier, deleteSupplier };
}
