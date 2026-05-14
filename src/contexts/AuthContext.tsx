import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, User as FirebaseUser, signInWithPopup, OAuthProvider } from 'firebase/auth';
import { doc, getDoc, setDoc, query, where, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { User, UserRole } from '../types';
import toast from 'react-hot-toast';

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
const SUPERADMIN_EMAILS = ['secretariadq@somllar.cat', 'secretariadq@somllar.org'];

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // 1. Intentem cercar per UID (cas d'usuari que ja ha entrat abans)
          let userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          let userData: User;

          if (!userDoc.exists() && firebaseUser.email) {
            // 2. Si no trobem UID, cerquem si ja existia el seu correu (creat pel Superadmin)
            const q = query(collection(db, 'users'), where('email', '==', firebaseUser.email));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
              const existingDoc = querySnapshot.docs[0];
              // Migrem el document antic al nou document amb ID = UID
              const data = existingDoc.data();
              await setDoc(doc(db, 'users', firebaseUser.uid), {
                ...data,
                id: firebaseUser.uid,
                updatedAt: new Date().toISOString()
              });
              await deleteDoc(existingDoc.ref);
              userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
            }
          }

          if (userDoc.exists()) {
            userData = { id: firebaseUser.uid, ...userDoc.data() } as User;
            
            // Bloquejar accés si l'usuari està marcat com a inactiu
            if (userData.active === false) {
              await auth.signOut();
              setUser(null);
              toast.error("El teu compte ha estat desactivat. Contacta amb l'administració.");
              setLoading(false);
              return;
            }

            // Forcem el rol d'admin si el correu coincideix
            if (firebaseUser.email && SUPERADMIN_EMAILS.includes(firebaseUser.email) && userData.role !== 'superadmin') {
              userData.role = 'superadmin';
              await setDoc(doc(db, 'users', firebaseUser.uid), { role: 'superadmin' }, { merge: true });
            } else if (firebaseUser.email && ADMIN_EMAILS.includes(firebaseUser.email) && userData.role !== 'admin_compres' && userData.role !== 'superadmin') {
              userData.role = 'admin_compres';
              await setDoc(doc(db, 'users', firebaseUser.uid), { role: 'admin_compres' }, { merge: true });
            }
            
            setUser(userData);
          } else {
            // Si és el primer cop i no estava pre-creat, creem el document
            const isSuperAdmin = firebaseUser.email && SUPERADMIN_EMAILS.includes(firebaseUser.email);
            const isAdmin = firebaseUser.email && ADMIN_EMAILS.includes(firebaseUser.email);
            const newUser: User = {
              id: firebaseUser.uid,
              name: firebaseUser.displayName || 'Usuari Som Llar',
              email: firebaseUser.email || 'test@somllar.org',
              role: isSuperAdmin ? 'superadmin' : isAdmin ? 'admin_compres' : 'tecnic',
              areaId: 'admin',
              active: true,
              notificationsEnabled: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
            setUser(newUser);
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
