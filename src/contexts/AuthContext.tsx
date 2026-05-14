import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, User as FirebaseUser, signInWithPopup, OAuthProvider } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginWithMicrosoft: (role?: UserRole) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  loginWithMicrosoft: async () => {},
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

  // Login amb Microsoft assignant el rol escollit a l'inici
  const loginWithMicrosoft = async (role: UserRole = 'tecnic') => {
    setLoading(true);
    try {
      const provider = new OAuthProvider('microsoft.com');
      provider.setCustomParameters({
        tenant: '717c4e82-3759-464a-b048-b986492de4d6'
      });
      const credential = await signInWithPopup(auth, provider);
      
      // Actualitzem les dades i el rol a Firestore
      await setDoc(doc(db, 'users', credential.user.uid), {
        name: credential.user.displayName || `Usuari ${role}`,
        email: credential.user.email || `${role}@somllar.org`,
        role: role,
        areaId: 'IT'
      }, { merge: true });
    } catch (error) {
      console.error("Error en el login amb Microsoft:", error);
      setLoading(false);
    }
  };

  const logout = async () => {
    await auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithMicrosoft, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
