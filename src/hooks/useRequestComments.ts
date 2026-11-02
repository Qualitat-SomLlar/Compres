import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { RequestComment } from '../types';

export const COMMENT_MAX_LENGTH = 2000;

export function useRequestComments(requestId?: string) {
  const [comments, setComments] = useState<RequestComment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!requestId) return;
    setLoading(true);
    // Ordenem en memòria per no necessitar un índex compost a Firestore
    const q = query(collection(db, 'requestComments'), where('requestId', '==', requestId));
    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        setComments(snapshot.docs
          .map(d => ({ ...d.data(), id: d.id } as RequestComment))
          .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || '')));
        setLoading(false);
      },
      (err) => {
        console.error('Error carregant els comentaris:', err);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [requestId]);

  const addComment = async (comment: Omit<RequestComment, 'id' | 'createdAt'>) => {
    await addDoc(collection(db, 'requestComments'), { ...comment, createdAt: new Date().toISOString() });
  };

  const deleteComment = async (id: string) => {
    await deleteDoc(doc(db, 'requestComments', id));
  };

  return { comments, loading, addComment, deleteComment };
}
