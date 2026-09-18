import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { HierarchyRoleConfig } from '../types';
import { HIERARCHY_ROLES as DEFAULT_ROLES } from '../constants';

export function useHierarchyLevels() {
  const [hierarchyLevels, setHierarchyLevels] = useState<HierarchyRoleConfig[]>(DEFAULT_ROLES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'hierarchyLevels'));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (snapshot.empty) {
        // Auto-seed amb els rols jeràrquics per defecte si encara no s'ha creat la col·lecció
        try {
          const now = new Date().toISOString();
          for (const defRole of DEFAULT_ROLES) {
            const roleRef = doc(db, 'hierarchyLevels', defRole.key);
            await setDoc(roleRef, {
              ...defRole,
              id: defRole.key,
              active: true,
              createdAt: now,
              updatedAt: now
            });
          }
        } catch (seedErr) {
          console.warn("No s'han pogut auto-inicialitzar els nivells jeràrquics:", seedErr);
        }
        setLoading(false);
        return;
      }

      const list = snapshot.docs.map(d => {
        const raw = d.data();
        return {
          id: d.id,
          key: raw.key || d.id,
          level: Number(raw.level) || 1,
          code: raw.code || `N${raw.level || 1}`,
          label: raw.label || d.id,
          shortLabel: raw.shortLabel || raw.label || d.id,
          scope: (raw.scope as 'area' | 'global') || 'area',
          description: raw.description || '',
          badgeColor: raw.badgeColor || 'bg-slate-500/10 text-slate-400 border-slate-500/20',
          active: raw.active !== false,
          createdAt: raw.createdAt,
          updatedAt: raw.updatedAt
        } as HierarchyRoleConfig;
      }).sort((a, b) => a.level - b.level);

      setHierarchyLevels(list);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching hierarchy levels:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getHierarchyRole = (roleOrLevel?: string | number): HierarchyRoleConfig => {
    if (typeof roleOrLevel === 'number') {
      const found = hierarchyLevels.find(r => r.level === roleOrLevel);
      if (found) return found;
    }
    const str = String(roleOrLevel || '').toLowerCase().trim();
    if (str === '1' || str === 'n1' || str === 'tecnic' || str === 'tecnico') {
      return hierarchyLevels.find(r => r.level === 1) || DEFAULT_ROLES[0];
    }
    if (str === '2' || str === 'n2' || str === 'coordinacio' || str === 'coordinador') {
      return hierarchyLevels.find(r => r.level === 2) || DEFAULT_ROLES[1];
    }
    if (str === '3' || str === 'n3' || str === 'direccio_area' || str === 'direccio' || str === 'responsablearea') {
      return hierarchyLevels.find(r => r.level === 3) || DEFAULT_ROLES[2];
    }
    if (str === '4' || str === 'n4' || str === 'finances' || str === 'finanzas' || str === 'administracio') {
      return hierarchyLevels.find(r => r.level === 4) || DEFAULT_ROLES[3];
    }
    if (str === '5' || str === 'n5' || str === 'admin_compres') {
      return hierarchyLevels.find(r => r.key === 'admin_compres' || r.level === 5) || DEFAULT_ROLES[4];
    }
    if (str === 'comptabilitat') {
      return hierarchyLevels.find(r => r.key === 'comptabilitat') || DEFAULT_ROLES[5];
    }
    if (str === '6' || str === 'n6' || str === 'gerencia') {
      return hierarchyLevels.find(r => r.level === 6) || DEFAULT_ROLES[6];
    }
    if (str === '99' || str === 'superadmin' || str === 'admin') {
      return hierarchyLevels.find(r => r.level === 99) || DEFAULT_ROLES[7];
    }

    const byKey = hierarchyLevels.find(r => r.key === str || (r.id && r.id === str));
    if (byKey) return byKey;

    const byCode = hierarchyLevels.find(r => r.code.toLowerCase() === str);
    if (byCode) return byCode;

    return hierarchyLevels[0] || DEFAULT_ROLES[0];
  };

  const addHierarchyLevel = async (levelData: Omit<HierarchyRoleConfig, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const rawKey = levelData.key || levelData.label.toLowerCase().trim()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
    const key = rawKey || `level_${Date.now()}`;

    const newConfig: HierarchyRoleConfig = {
      ...levelData,
      key,
      active: levelData.active !== false,
      createdAt: now,
      updatedAt: now
    };

    const docRef = doc(db, 'hierarchyLevels', key);
    await setDoc(docRef, newConfig);
    return newConfig;
  };

  const updateHierarchyLevel = async (idOrKey: string, data: Partial<HierarchyRoleConfig>) => {
    const docRef = doc(db, 'hierarchyLevels', idOrKey);
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString()
    });
  };

  const deleteHierarchyLevel = async (idOrKey: string) => {
    const docRef = doc(db, 'hierarchyLevels', idOrKey);
    await deleteDoc(docRef);
  };

  return {
    hierarchyLevels,
    loading,
    getHierarchyRole,
    addHierarchyLevel,
    updateHierarchyLevel,
    deleteHierarchyLevel
  };
}
