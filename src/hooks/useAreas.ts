import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AreaItem } from '../types';
import { AREAS as DEFAULT_AREAS, normalizeAreaId } from '../constants';

export function useAreas() {
  const [areas, setAreas] = useState<AreaItem[]>(DEFAULT_AREAS.map(a => ({
    id: a.id,
    name: a.name,
    code: a.id.toUpperCase(),
    active: true
  })));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'areas'));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (snapshot.empty) {
        // Auto-seed amb les àrees predeterminades si la col·lecció encara no existeix
        try {
          const now = new Date().toISOString();
          for (const defArea of DEFAULT_AREAS) {
            const areaRef = doc(db, 'areas', defArea.id);
            await setDoc(areaRef, {
              id: defArea.id,
              name: defArea.name,
              code: defArea.id.toUpperCase(),
              description: `Àrea corporativa ${defArea.name}`,
              active: true,
              createdAt: now,
              updatedAt: now
            });
          }
        } catch (seedErr) {
          console.warn("No s'han pogut auto-inicialitzar les àrees:", seedErr);
        }
        setLoading(false);
        return;
      }

      const list = snapshot.docs.map(d => {
        const raw = d.data();
        return {
          id: d.id,
          name: raw.name || d.id,
          code: raw.code || d.id.toUpperCase(),
          description: raw.description || '',
          active: raw.active !== false,
          createdAt: raw.createdAt,
          updatedAt: raw.updatedAt
        } as AreaItem;
      }).sort((a, b) => (a.name || '').localeCompare(b.name || ''));

      setAreas(list);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching areas:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getAreaName = (areaId?: string): string => {
    if (!areaId) return 'Sense Àrea';
    const norm = normalizeAreaId(areaId);
    const found = areas.find(a => a.id.toLowerCase() === norm || a.id.toLowerCase() === areaId.toLowerCase());
    if (found) return found.name;
    const defaultFound = DEFAULT_AREAS.find(a => a.id.toLowerCase() === norm || a.id.toLowerCase() === areaId.toLowerCase());
    return defaultFound ? defaultFound.name : areaId;
  };

  const addArea = async (areaData: { id?: string; name: string; code?: string; description?: string; active?: boolean }) => {
    const now = new Date().toISOString();
    // Generar ID normalitzat si no s'ha indicat
    const rawId = areaData.id || areaData.name.toLowerCase().trim()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
    const id = rawId || `area_${Date.now()}`;

    const newArea: AreaItem = {
      id,
      name: areaData.name.trim(),
      code: (areaData.code || id).toUpperCase().trim(),
      description: areaData.description?.trim() || '',
      active: areaData.active !== false,
      createdAt: now,
      updatedAt: now
    };

    const docRef = doc(db, 'areas', id);
    await setDoc(docRef, newArea);
    return newArea;
  };

  const updateArea = async (id: string, data: Partial<AreaItem>) => {
    const docRef = doc(db, 'areas', id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString()
    });
  };

  const deleteArea = async (id: string) => {
    const docRef = doc(db, 'areas', id);
    await deleteDoc(docRef);
  };

  return {
    areas,
    loading,
    getAreaName,
    addArea,
    updateArea,
    deleteArea
  };
}
