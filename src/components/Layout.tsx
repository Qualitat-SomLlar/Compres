import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { Home, Users, ShoppingCart, LogOut, FileBarChart, ChevronLeft, ChevronRight } from "lucide-react";
import { requestFirebaseNotificationPermission } from "../lib/firebase-client";

export function Layout({ children }: { children: ReactNode }) {
  const { logOut, user, getToken } = useAuth();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    // Demanem permís i guardem el token si s'ha pogut obtenir
    const setupNotifications = async () => {
      try {
        const token = await requestFirebaseNotificationPermission();
        if (token) {
          const authToken = await getToken();
          // Guarda el FCM token a Firestore sota l'usuari o en una col·lecció
          if (user) {
            const uid = user.uid || user.id;
            try {
              const { doc, setDoc } = await import('firebase/firestore');
              const { db } = await import('../lib/firebase-client');
              await setDoc(doc(db, 'fcm_tokens', token), {
                token,
                userId: uid,
                deviceInfo: navigator.userAgent,
                updatedAt: new Date().toISOString()
              });
            } catch (e) {
              console.error("Error saving FCM token", e);
            }
          }
        }
      } catch (e) {
        console.log("No s'ha pogut registrar el token FCM", e);
      }
    };

    if (user) {
      setupNotifications();
    }
  }, [user]);

  const navItems = [
    { name: "Dashboard", path: "/", icon: Home },
    { name: "Compres", path: "/purchases", icon: ShoppingCart },
    { name: "Proveïdors", path: "/providers", icon: Users },
  ];

  if (user?.role === "Gerencia" || user?.role === "DireccionAdministracion") {
    navItems.push({ name: "Jerarquies", path: "/roles", icon: Users });
    navItems.push({ name: "Fluxos", path: "/workflows", icon: FileBarChart });
    navItems.push({ name: "Treballadores", path: "/workers", icon: Users });
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-slate-900 border-b border-slate-800 px-4 py-3 flex justify-between items-center fixed top-0 w-full z-10">
        <div className="font-bold text-lg text-white tracking-tight">Gestió de Compres</div>
        <button onClick={logOut} className="text-slate-400 hover:text-white transition-colors">
          <LogOut size={20} />
        </button>
      </div>

      {/* Sidebar for Desktop / Bottom Nav for Mobile */}
      <nav className={`fixed bottom-0 w-full bg-white md:bg-slate-900 border-t border-slate-200 md:relative ${isCollapsed ? 'md:w-20' : 'md:w-64'} transition-all duration-300 md:border-r md:border-slate-800 md:border-t-0 flex md:flex-col justify-around md:justify-start pt-2 pb-safe md:pt-0 z-10 p-safe-area shrink-0`}>
        <div className="hidden md:flex p-4 md:p-6 items-center justify-between">
          {!isCollapsed && (
            <div>
              <h1 className="text-white font-bold text-xl tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">Gestió de Compres</h1>
              <p className="text-slate-400 text-[10px] uppercase tracking-widest mt-1 whitespace-nowrap overflow-hidden text-ellipsis">Som Llar</p>
            </div>
          )}
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded-md hover:bg-slate-800 mx-auto"
          >
            {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>
        
        <div className="flex md:flex-col w-full px-2 gap-1 md:gap-2 justify-around md:justify-start md:px-4 md:mt-4 md:flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex flex-col md:flex-row items-center md:px-4 py-2 md:py-3 rounded-lg flex-1 md:flex-none transition-colors ${
                  active 
                    ? "text-blue-600 md:bg-blue-600 md:text-white font-medium" 
                    : "text-slate-500 md:text-slate-400 md:hover:bg-slate-800 md:hover:text-white hover:text-slate-900"
                } ${isCollapsed ? 'md:justify-center' : ''}`}
                title={isCollapsed ? item.name : undefined}
              >
                <Icon size={20} className={`mb-1 md:mb-0 ${isCollapsed ? 'md:mr-0' : 'md:mr-3'}`} />
                <span className={`text-[10px] md:text-sm ${isCollapsed ? 'md:hidden' : ''}`}>{item.name}</span>
              </Link>
            );
          })}
        </div>
        
        <div className={`hidden md:flex mt-auto p-4 border-t border-slate-800 bg-slate-950 items-center w-full ${isCollapsed ? 'justify-center flex-col gap-2' : 'space-x-3'}`}>
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white uppercase shrink-0">
            {user?.displayName ? user.displayName.substring(0, 2) : "U"}
          </div>
          {!isCollapsed && (
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-semibold text-white truncate">{user?.displayName || "Usuari"}</p>
              <p className="text-[10px] text-slate-500 truncate">{user?.role}</p>
            </div>
          )}
          <button onClick={logOut} className="text-slate-500 hover:text-slate-300 shrink-0" title={isCollapsed ? "Tancar sessió" : undefined}>
            <LogOut size={16} />
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 pb-20 pt-16 md:pb-6 md:pt-0 md:max-w-none md:w-auto w-full flex flex-col items-stretch overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
