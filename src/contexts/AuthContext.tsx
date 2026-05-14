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

const ADMIN_EMAILS = ['secretariadq@somllar.cat', 'secretariadq@somllar.org'];

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Llegeix les dades de l'usuari de Firestore
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          let userData: User;

          if (userDoc.exists()) {
            userData = { id: firebaseUser.uid, ...userDoc.data() } as User;
            
            // Forcem el rol d'admin si el correu coincideix
            if (firebaseUser.email && ADMIN_EMAILS.includes(firebaseUser.email) && userData.role !== 'admin_compres') {
              userData.role = 'admin_compres';
              await setDoc(doc(db, 'users', firebaseUser.uid), { role: 'admin_compres' }, { merge: true });
            }
            
            setUser(userData);
          } else {
            // Si és el primer cop, creem el document
            const isAdmin = firebaseUser.email && ADMIN_EMAILS.includes(firebaseUser.email);
            const dummyUser: User = {
              id: firebaseUser.uid,
              name: firebaseUser.displayName || 'Usuari Som Llar',
              email: firebaseUser.email || 'test@somllar.org',
              role: isAdmin ? 'admin_compres' : 'tecnic',
              areaId: 'admin'
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
      
      const isAdmin = credential.user.email && ADMIN_EMAILS.includes(credential.user.email);
      const finalRole = isAdmin ? 'admin_compres' : role;

      // Actualitzem les dades i el rol a Firestore
      await setDoc(doc(db, 'users', credential.user.uid), {
        name: credential.user.displayName || `Usuari ${finalRole}`,
        email: credential.user.email || `${finalRole}@somllar.org`,
        role: finalRole,
        areaId: 'admin'
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
