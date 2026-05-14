import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User, UserRole } from '../types';

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const u = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      } as User));
      setUsers(u);
      setLoading(false);
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

  const updateUser = async (id: string, data: Partial<User>) => {
    const docRef = doc(db, 'users', id);
    await updateDoc(docRef, data);
  };

  const deleteUser = async (id: string) => {
    const docRef = doc(db, 'users', id);
    await deleteDoc(docRef);
  };

  return { users, loading, getUsersByRole, updateUser, deleteUser };
}
