import React, { createContext, useContext, useEffect, useState } from 'react';

interface AuthContextType {
  user: any | null;
  loading: boolean;
  signIn: (role: string) => Promise<void>;
  logOut: () => Promise<void>;
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('mockUser');
    if (stored) {
      setUser(JSON.parse(stored));
    }
    setLoading(false);
  }, []);

  const signIn = async (roleOrId: string) => {
    if (roleOrId.startsWith('id_')) {
       try {
         const res = await fetch("/api/public/users");
         if (res.ok) {
            const users = await res.json();
            const dbUser = users.find((u: any) => 'id_' + u.id === roleOrId);
            if (dbUser) {
               setUser(dbUser);
               localStorage.setItem('mockUser', JSON.stringify(dbUser));
               return;
            }
         }
       } catch(e) {
         console.error(e);
       }
    }

    const roleNames: Record<string, string> = {
      'ResponsableArea': "Responsable d'Àrea",
      'TecnicaAdministrativa': "Tècnica Administrativa",
      'ResponsableEquipamientos': "Responsable Equipaments",
      'DireccionAdministracion': "Direcció d'Administració",
      'AreaContabilidad': "Àrea de Comptabilitat",
      'Gerencia': "Gerència"
    };

    const mockUser = {
      uid: `test-user-${roleOrId}`,
      email: `${roleOrId.toLowerCase()}@somllar.org`,
      displayName: roleNames[roleOrId] || "Usuari",
      role: roleOrId
    };
    setUser(mockUser);
    localStorage.setItem('mockUser', JSON.stringify(mockUser));
    
    try {
      await fetch('/api/auth/sync', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${roleOrId}`
        }
      });
    } catch (e) {
      console.error("Error syncing user", e);
    }
  };

  const logOut = async () => {
    setUser(null);
    localStorage.removeItem('mockUser');
  };

  const getToken = async () => {
    if (user?.id) {
       return `id_${user.id}`;
    }
    return user?.role || "ResponsableArea";
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, logOut, getToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
