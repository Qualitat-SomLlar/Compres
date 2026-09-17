import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, User as FirebaseUser, signInWithPopup, OAuthProvider } from 'firebase/auth';
import { doc, getDoc, setDoc, query, where, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { User, UserRole } from '../types';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginWithMicrosoft: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  loginWithMicrosoft: async () => {},
  logout: async () => {}
});

export const useAuth = () => useContext(AuthContext);

const ADMIN_EMAILS = ['secretariadq@somllar.cat'];
const SUPERADMIN_EMAILS = ['secretariadq@somllar.cat'];

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userEmail = (firebaseUser.email || '').toLowerCase().trim();

          // Restricció estricta de domini corporatiu @somllar.cat
          if (!userEmail.endsWith('@somllar.cat')) {
            await auth.signOut();
            setUser(null);
            toast.error("Accés denegat: Només es permet l'accés amb comptes corporatius @somllar.cat");
            setLoading(false);
            return;
          }

          // 1. Intentem cercar per UID (cas d'usuari que ja ha entrat abans)
          let userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          let userData: User;

          if (!userDoc.exists() && userEmail) {
            // 2. Si no trobem UID, cerquem si ja existia el seu correu (creat pel Superadmin)
            const q = query(collection(db, 'users'), where('email', '==', userEmail));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
              const existingDoc = querySnapshot.docs[0];
              // Migrem el document antic al nou document amb ID = UID
              const data = existingDoc.data();
              await setDoc(doc(db, 'users', firebaseUser.uid), {
                ...data,
                id: firebaseUser.uid,
                email: userEmail,
                updatedAt: new Date().toISOString()
              });
              try {
                await deleteDoc(existingDoc.ref);
              } catch (delErr) {
                console.warn("No s'ha pogut eliminar el registre antic de pre-registre:", delErr);
              }
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
              try {
                await setDoc(doc(db, 'users', firebaseUser.uid), { role: 'superadmin' }, { merge: true });
              } catch (setErr) {
                console.warn("No s'ha pogut actualitzar el rol a Firestore:", setErr);
              }
            } else if (firebaseUser.email && ADMIN_EMAILS.includes(firebaseUser.email) && userData.role !== 'admin_compres' && userData.role !== 'superadmin') {
              userData.role = 'admin_compres';
              try {
                await setDoc(doc(db, 'users', firebaseUser.uid), { role: 'admin_compres' }, { merge: true });
              } catch (setErr) {
                console.warn("No s'ha pogut actualitzar el rol a Firestore:", setErr);
              }
            }
            
            setUser(userData);
          } else {
            // Si és el primer cop i no estava pre-creat, creem el document
            const isSuperAdmin = SUPERADMIN_EMAILS.includes(userEmail);
            const isAdmin = ADMIN_EMAILS.includes(userEmail);
            const newUser: User = {
              id: firebaseUser.uid,
              name: firebaseUser.displayName || 'Usuari Som Llar',
              email: userEmail,
              role: isSuperAdmin ? 'superadmin' : isAdmin ? 'admin_compres' : 'tecnic',
              areaId: 'social',
              active: true,
              notificationsEnabled: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            try {
              await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
            } catch (createErr) {
              console.warn("No s'ha pogut crear el document d'usuari a Firestore:", createErr);
            }
            setUser(newUser);
          }
        } catch (error: any) {
          console.error("Error al carregar l'usuari des de Firestore:", error);
          toast.error(`Error en carregar les dades de l'usuari: ${error?.message || 'Error de connexió a Firestore'}`);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Login amb Microsoft
  const loginWithMicrosoft = async () => {
    setLoading(true);
    try {
      const provider = new OAuthProvider('microsoft.com');
      provider.setCustomParameters({
        tenant: '717c4e82-3759-464a-b048-b986492de4d6'
      });
      await signInWithPopup(auth, provider);
      // onAuthStateChanged s'encarrega de crear o actualitzar l'usuari a Firestore
    } catch (error: any) {
      console.error("Error en el login amb Microsoft:", error);
      setLoading(false);

      const errorCode = error?.code || '';
      if (errorCode === 'auth/unauthorized-domain') {
        toast.error("Domini no autoritzat a Firebase: Cal afegir el domini d'aquest web (a Vercel o hosting) a 'Authentication > Settings > Authorized domains' a la consola de Firebase.", { duration: 9000 });
      } else if (errorCode === 'auth/popup-blocked') {
        toast.error("El navegador ha bloquejat la finestra emergent. Si us plau, activa les finestres emergents per a aquest lloc.", { duration: 7000 });
      } else if (errorCode === 'auth/popup-closed-by-user') {
        toast("Inici de sessió cancel·lat.", { icon: 'ℹ️', duration: 4000 });
      } else if (errorCode === 'auth/operation-not-allowed') {
        toast.error("El proveïdor Microsoft no està habilitat a Firebase Console (Authentication > Sign-in method).", { duration: 9000 });
      } else {
        toast.error(`Error en iniciar sessió: ${error?.message || errorCode || 'Error desconegut'}`, { duration: 7000 });
      }
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
