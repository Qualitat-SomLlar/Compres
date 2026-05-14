import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface Project {
  id: string;
  code: string;
  name: string;
}

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

  return { projects, loading };
}
