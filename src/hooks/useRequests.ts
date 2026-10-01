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
    const normalizeStatus = (rawStatus: any): RequestStatus => {
      const s = String(rawStatus || '').toLowerCase().trim();
      if (s === 'autorizado' || s === 'aprobada') return 'aprovada';
      if (s === 'pendiente' || s === 'pendent') return 'pendent_coordinacio';
      if (s === 'rechazado' || s === 'rebutjada') return 'rebutjada';
      if (s === 'borrador') return 'esborrany';
      return (rawStatus as RequestStatus) || 'pendent_coordinacio';
    };

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const reqs: PurchaseRequest[] = snapshot.docs.map(doc => {
          const raw = doc.data() as any;
          const estimated = Number(raw.estimatedAmount ?? raw.importeEstimado ?? 0);
          const final = raw.finalAmount !== undefined && raw.finalAmount !== null ? Number(raw.finalAmount) : undefined;
          
          return {
            ...raw,
            id: String(doc.id),
            code: raw.code || `PR-${doc.id.slice(0, 6).toUpperCase()}`,
            itemDescription: raw.itemDescription || raw.detalles || raw.description || 'Sol·licitud de compra',
            estimatedAmount: isNaN(estimated) ? 0 : estimated,
            finalAmount: final !== undefined && !isNaN(final) ? final : undefined,
            status: normalizeStatus(raw.status),
            areaId: raw.areaId || 'social',
            analyticCode: raw.analyticCode || raw.codigoAnalitico || '',
            createdAt: raw.createdAt || new Date().toISOString(),
            updatedAt: raw.updatedAt || new Date().toISOString(),
            createdByUserId: raw.createdByUserId || String(raw.requesterId || ''),
            createdByUserName: raw.createdByUserName || 'Usuari Som Llar',
            createdByUserEmail: raw.createdByUserEmail || '',
            requestingTechnicianId: raw.requestingTechnicianId || String(raw.requesterId || ''),
            requestingTechnicianName: raw.requestingTechnicianName || raw.requesterName || 'Tècnic/a',
            requestingTechnicianEmail: raw.requestingTechnicianEmail || '',
            requiresThreeQuotes: !!(raw.requiresThreeQuotes || (estimated > 5000)),
            urgency: raw.urgency || 'normal',
            attachmentsCount: Number(raw.attachmentsCount || 0),
            quotesCount: Number(raw.quotesCount || 0),
            supplierName: raw.supplierName || raw.proveedor || '',
          } as PurchaseRequest;
        });
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
    // Sanitize data to remove any undefined fields before sending to Firestore
    const cleanData: Record<string, any> = {
      updatedAt: new Date().toISOString()
    };
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        cleanData[key] = value;
      }
    }
    await updateDoc(docRef, cleanData);
  };

  // KPIs i càlculs
  const stats = useMemo(() => {
    return {
      totalSpend: requests.reduce((acc, curr) => acc + (curr.estimatedAmount || 0), 0),
      pendingApprovals: requests.filter(r => (r.status || '').includes('pendent')).length,
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
