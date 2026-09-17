import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, doc, updateDoc, deleteDoc, addDoc, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User, UserRole } from '../types';
import toast from 'react-hot-toast';

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Si no hi ha index, orderBy farà que la query falli. Fem el sort en memòria per seguretat.
    const q = query(collection(db, 'users'));
    
    const normalizeRole = (roleStr: any): UserRole => {
      const r = String(roleStr || '').toLowerCase().trim();
      if (r === 'gerencia') return 'gerencia';
      if (r === 'responsablearea' || r === 'direccio' || r === 'direccio_area') return 'direccio_area';
      if (r === 'coordinacio' || r === 'coordinador') return 'coordinacio';
      if (r === 'finances' || r === 'finanzas' || r === 'administracio') return 'finances';
      if (r === 'superadmin' || r === 'admin') return 'superadmin';
      if (r === 'admin_compres') return 'admin_compres';
      if (r === 'comptabilitat') return 'comptabilitat';
      if (r === 'tecnico' || r === 'tecnic') return 'tecnic';
      return (r as UserRole) || 'tecnic';
    };

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const u = snapshot.docs.map(doc => {
        const raw = doc.data() as any;
        const role = normalizeRole(raw.role);
        const name = raw.name || raw.displayName || (raw.email ? raw.email.split('@')[0] : '') || 'Treballador/a';
        const areaId = raw.areaId || (role === 'gerencia' || role === 'superadmin' || role === 'finances' ? 'general' : 'social');
        
        return {
          id: doc.id,
          ...raw,
          name,
          role,
          areaId,
          active: raw.active !== false,
          notificationsEnabled: raw.notificationsEnabled !== false,
        } as User;
      }).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setUsers(u);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching users:", error);
      setLoading(false);
      toast.error("Error al carregar els usuaris");
    });

    return () => unsubscribe();
  }, []);

  const getUsersByRole = (role: UserRole, areaId?: string) => {
    return users.filter(u => {
      const roleMatch = u.role === role;
      const areaMatch = areaId ? u.areaId === areaId : true;
      return roleMatch && areaMatch;
    });
  };

  const addUser = async (userData: Omit<User, 'id'>) => {
    const now = new Date().toISOString();
    await addDoc(collection(db, 'users'), {
      ...userData,
      createdAt: now,
      updatedAt: now
    });
  };

  const updateUser = async (id: string, data: Partial<User>) => {
    const docRef = doc(db, 'users', id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString()
    });
  };

  const deleteUser = async (id: string) => {
    const docRef = doc(db, 'users', id);
    await deleteDoc(docRef);
  };

  return { users, loading, getUsersByRole, addUser, updateUser, deleteUser };
}
