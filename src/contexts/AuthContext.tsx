import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, User as FirebaseUser, signInWithPopup, signInWithRedirect, getRedirectResult, OAuthProvider } from 'firebase/auth';
import { doc, getDoc, setDoc, query, where, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { User, UserRole } from '../types';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginWithMicrosoft: () => Promise<void>;
  loginWithMicrosoftRedirect: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  loginWithMicrosoft: async () => {},
  loginWithMicrosoftRedirect: async () => {},
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
          const userEmail = (firebaseUser.email || firebaseUser.providerData?.[0]?.email || '').toLowerCase().trim();

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
            const rawData = userDoc.data() as any;
            const normalizeRole = (roleStr: any): UserRole => {
              const r = String(roleStr || '').toLowerCase().trim();
              if (r === 'gerencia') return 'gerencia';
              if (r === 'responsablearea' || r === 'direccio' || r === 'direccio_area') return 'direccio_area';
              if (r === 'coordinacio' || r === 'coordinador') return 'coordinacio';
              if (r === 'finances' || r === 'finanzas' || r === 'administracio') return 'finances';
              if (r === 'superadmin' || r === 'admin') return 'superadmin';
              if (r === 'admin_compres') return 'admin_compres';
              if (r === 'comptabilitat') return 'comptabilitat';
              if (r === 'tecnico' || r === 'tecnic') return 'tecnic';
              return (r as UserRole) || 'tecnic';
            };

            let calculatedRole = normalizeRole(rawData.role);
            if (userEmail && SUPERADMIN_EMAILS.includes(userEmail)) {
              calculatedRole = 'superadmin';
            } else if (userEmail && ADMIN_EMAILS.includes(userEmail) && calculatedRole !== 'superadmin') {
              calculatedRole = 'admin_compres';
            }

            const calculatedName = rawData.name || rawData.displayName || firebaseUser.displayName || (userEmail ? userEmail.split('@')[0] : '') || 'Usuari Som Llar';
            const calculatedAreaId = rawData.areaId || (calculatedRole === 'gerencia' || calculatedRole === 'superadmin' || calculatedRole === 'finances' ? 'general' : 'social');

            userData = {
              id: firebaseUser.uid,
              ...rawData,
              name: calculatedName,
              role: calculatedRole,
              areaId: calculatedAreaId,
              active: rawData.active !== false,
              notificationsEnabled: rawData.notificationsEnabled !== false,
            } as User;
            
            // Bloquejar accés si l'usuari està marcat com a inactiu
            if (userData.active === false) {
              await auth.signOut();
              setUser(null);
              toast.error("El teu compte ha estat desactivat. Contacta amb l'administració.");
              setLoading(false);
              return;
            }

            // Si cal persistir dades netes a Firestore
            if (rawData.role !== calculatedRole || !rawData.name || !rawData.areaId) {
              try {
                await setDoc(doc(db, 'users', firebaseUser.uid), {
                  name: calculatedName,
                  role: calculatedRole,
                  areaId: calculatedAreaId
                }, { merge: true });
              } catch (setErr) {
                console.warn("No s'ha pogut actualitzar el perfil normalitzat a Firestore:", setErr);
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
          // Fallback segur: crear sessió en memòria perquè l'usuari validat per Microsoft mai es quedi congelat a 'Carregant...'
          const fallbackEmail = (firebaseUser.email || firebaseUser.providerData?.[0]?.email || '').toLowerCase().trim();
          const isSuperAdmin = SUPERADMIN_EMAILS.includes(fallbackEmail);
          const fallbackUser: User = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || 'Usuari Som Llar',
            email: fallbackEmail,
            role: isSuperAdmin ? 'superadmin' : 'tecnic',
            areaId: 'social',
            active: true,
            notificationsEnabled: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          setUser(fallbackUser);
          toast.error(`Connexió directa: no s'ha pogut sincronitzar el perfil complet des de la base de dades (${error?.message || 'timeout'}).`);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    // Comprovar si retornem d'una redirecció de login
    getRedirectResult(auth).catch((error: any) => {
      if (error && error.code !== 'auth/null-user') {
        console.error("Error retornant de la redirecció de Microsoft:", error);
        toast.error(`Error en retornar de Microsoft: ${error?.message || error?.code}`);
      }
    });

    return unsubscribe;
  }, []);

  // Login amb Microsoft mitjançant finestra emergent (Popup)
  const loginWithMicrosoft = async () => {
    setLoading(true);
    try {
      const provider = new OAuthProvider('microsoft.com');
      provider.setCustomParameters({
        tenant: '717c4e82-3759-464a-b048-b986492de4d6',
        prompt: 'select_account'
      });
      await signInWithPopup(auth, provider);
      // onAuthStateChanged s'encarrega de crear o actualitzar l'usuari a Firestore
    } catch (error: any) {
      console.error("Error en el login amb Microsoft:", error);
      setLoading(false);

      const errorCode = error?.code || '';
      if (errorCode === 'auth/unauthorized-domain') {
        toast.error("Domini no autoritzat a Firebase: Cal afegir el domini d'aquest web a 'Authentication > Settings > Authorized domains' a la consola de Firebase.", { duration: 9000 });
      } else if (errorCode === 'auth/popup-blocked') {
        toast.error("El navegador ha bloquejat la finestra emergent. Si us plau, activa les finestres emergents o utilitza la redirecció.", { duration: 7000 });
      } else if (errorCode === 'auth/popup-closed-by-user') {
        toast.error("La finestra emergent s'ha tancat. Si s'ha tancat sola abans de carregar, cal afegir el domini a 'Dominios autorizados' de Firebase Console o provar l'opció de redirecció.", { duration: 9000 });
      } else if (errorCode === 'auth/operation-not-allowed') {
        toast.error("El proveïdor Microsoft no està habilitat a Firebase Console (Authentication > Sign-in method).", { duration: 9000 });
      } else {
        toast.error(`Error en iniciar sessió: ${error?.message || errorCode || 'Error desconegut'}`, { duration: 7000 });
      }
    }
  };

  // Login amb Microsoft mitjançant redirecció completa (sense popup)
  const loginWithMicrosoftRedirect = async () => {
    setLoading(true);
    try {
      const provider = new OAuthProvider('microsoft.com');
      provider.setCustomParameters({
        tenant: '717c4e82-3759-464a-b048-b986492de4d6',
        prompt: 'select_account'
      });
      await signInWithRedirect(auth, provider);
    } catch (error: any) {
      console.error("Error en la redirecció amb Microsoft:", error);
      setLoading(false);
      const errorCode = error?.code || '';
      if (errorCode === 'auth/unauthorized-domain') {
        toast.error("Domini no autoritzat a Firebase: Cal afegir aquest domini a 'Dominios autorizados' a Firebase Console.", { duration: 9000 });
      } else {
        toast.error(`Error en iniciar redirecció: ${error?.message || errorCode}`, { duration: 7000 });
      }
    }
  };

  const logout = async () => {
    await auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithMicrosoft, loginWithMicrosoftRedirect, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
