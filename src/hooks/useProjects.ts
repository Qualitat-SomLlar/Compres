import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Project } from '../types';

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'projects'), orderBy('code', 'asc'));
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id,
        } as Project));
        setProjects(data);
        setLoading(false);
      },
      (err) => {
        console.error("Error carregant projectes:", err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const addProject = async (data: Omit<Project, 'id'>) => {
    await addDoc(collection(db, 'projects'), data);
  };

  const updateProject = async (id: string, data: Partial<Project>) => {
    const docRef = doc(db, 'projects', id);
    await updateDoc(docRef, data);
  };

  const deleteProject = async (id: string) => {
    const docRef = doc(db, 'projects', id);
    await deleteDoc(docRef);
  };

  return { projects, loading, addProject, updateProject, deleteProject };
}
