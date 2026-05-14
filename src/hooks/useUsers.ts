import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, doc, updateDoc, deleteDoc, addDoc, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User, UserRole } from '../types';

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
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
