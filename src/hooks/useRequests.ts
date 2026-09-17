import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, addDoc, doc, updateDoc, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { PurchaseRequest, RequestStatus } from '../types';

export function useRequests() {
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'purchaseRequests'), orderBy('createdAt', 'desc'));
    
    setLoading(true);
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const reqs: PurchaseRequest[] = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id,
        } as PurchaseRequest));
        setRequests(reqs);
        setLoading(false);
        setError(null);
      }, 
      (err) => {
        console.error('Error carregant sol·licituds Firestore:', err);
        setError('Error de connexió a la base de dades');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const getRequestById = (id: string) => {
    return requests.find(r => r.id === id);
  };

  const addRequest = async (newRequest: Omit<PurchaseRequest, 'id' | 'createdAt' | 'updatedAt'>) => {
    const year = new Date().getFullYear();
    const prefix = `PR-${year}-`;
    
    // Calculem el següent número correlatiu
    let maxNumber = 0;
    requests.forEach(r => {
      if (r.code && r.code.startsWith(prefix)) {
        const numPart = parseInt(r.code.replace(prefix, ''), 10);
        if (!isNaN(numPart) && numPart > maxNumber) {
          maxNumber = numPart;
        }
      }
    });

    const nextCode = newRequest.code || `${prefix}${String(maxNumber + 1).padStart(3, '0')}`;

    const requestData = {
      ...newRequest,
      code: nextCode,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const docRef = await addDoc(collection(db, 'purchaseRequests'), requestData);
    return { id: docRef.id, ...requestData } as PurchaseRequest;
  };

  const updateRequest = async (id: string, data: Partial<PurchaseRequest>) => {
    const docRef = doc(db, 'purchaseRequests', id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString()
    });
  };

  // KPIs i càlculs
  const stats = useMemo(() => {
    return {
      totalSpend: requests.reduce((acc, curr) => acc + curr.estimatedAmount, 0),
      pendingApprovals: requests.filter(r => r.status.includes('pendent')).length,
      urgentCount: requests.filter(r => r.urgency === 'alta' || r.urgency === 'critica').length,
      totalRequests: requests.length,
      approvedCount: requests.filter(r => r.status === 'aprovada').length,
    };
  }, [requests]);

  return {
    requests,
    loading,
    error,
    stats,
    getRequestById,
    addRequest,
    updateRequest
  };
}
