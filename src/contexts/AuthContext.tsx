import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, User as FirebaseUser, signInAnonymously } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginAsMockUser: (role?: UserRole) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  loginAsMockUser: async () => {},
  logout: async () => {}
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Llegeix les dades de l'usuari de Firestore
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setUser({ id: firebaseUser.uid, ...userDoc.data() } as User);
          } else {
            // Si és el primer cop i es login anonim per proves, creem el document dummy
            const dummyUser: User = {
              id: firebaseUser.uid,
              name: 'Usuari de Proves',
              email: 'test@somllar.org',
              role: 'tecnic',
              areaId: 'IT'
            };
            await setDoc(doc(db, 'users', firebaseUser.uid), dummyUser);
            setUser(dummyUser);
          }
        } catch (error) {
          console.error("Error al carregar l'usuari des de Firestore:", error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Mètode temporal per facilitar les proves sense haver de fer login amb Microsoft
  const loginAsMockUser = async (role: UserRole = 'tecnic') => {
    setLoading(true);
    try {
      const credential = await signInAnonymously(auth);
      // Actualitzem el rol si ja existeix
      await setDoc(doc(db, 'users', credential.user.uid), {
        name: `Usuari ${role}`,
        email: `${role}@somllar.org`,
        role: role,
        areaId: 'IT'
      }, { merge: true });
    } catch (error) {
      console.error("Error en el login anònim:", error);
    }
  };

  const logout = async () => {
    await auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginAsMockUser, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
