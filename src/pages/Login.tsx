import React, { useState, useEffect } from "react";
import { useAuth } from "../components/AuthContext";
import { Shield, Sparkles } from "lucide-react";
import { Navigate } from "react-router-dom";
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase-client';

export function Login() {
  const { signIn, user } = useAuth();
  const [selectedRole, setSelectedRole] = useState("ResponsableArea");
  const [dbUsers, setDbUsers] = useState<any[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    getDocs(collection(db, 'users'))
      .then(snap => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (data && data.length > 0) {
          setDbUsers(data);
          setSelectedRole(`id_${data[0].id}`);
        }
        setIsInitializing(false);
      })
      .catch((e) => {
        console.error(e);
        setIsInitializing(false);
      });
  }, []);

  const handleLogin = async () => {
    await signIn(selectedRole);
  };

  if (user) {
    return <Navigate to="/" replace />;
  }

  if (isInitializing) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50">Carregant plataforma...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center relative overflow-hidden">
        {dbUsers.length > 0 && (
           <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] uppercase font-bold tracking-wider py-1 px-3 rounded-bl-lg flex items-center">
             <Sparkles size={12} className="mr-1" /> BD Conectada
           </div>
        )}
        <div className="mx-auto w-12 h-12 bg-blue-100 text-blue-700 flex items-center justify-center rounded-full mb-6 relative z-10">
          <Shield size={24} />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Som Llar</h1>
        <p className="text-slate-500 mb-6 text-sm">
           Portal de Gestió de Compres i Proveïdors
        </p>
        
        <div className="mb-6 text-left">
          <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
            {dbUsers.length > 0 ? "Selecciona l'usuari:" : "Selecciona el teu rol per entrar (Demo):"}
          </label>
          <select 
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {dbUsers.length > 0 ? (
              dbUsers.map(u => (
                <option key={u.id} value={`id_${u.id}`}>{u.displayName} ({u.email}) - {u.role}</option>
              ))
            ) : (
              <>
                <option value="ResponsableArea">Responsable d'Àrea / Projecte</option>
                <option value="TecnicaAdministrativa">Tècnica Administrativa de Suport</option>
                <option value="DireccionAdministracion">Direcció d'Administració i Finances</option>
                <option value="ResponsableEquipamientos">Responsable d'Equipaments</option>
                <option value="AreaContabilidad">Àrea de Comptabilitat</option>
                <option value="Gerencia">Gerència</option>
              </>
            )}
          </select>
        </div>
        
        <button
          onClick={handleLogin}
          className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-sm font-bold rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm"
        >
          Entrar al Sistema
        </button>
      </div>
    </div>
  );
}
