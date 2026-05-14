import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Users, 
  AlertTriangle, 
  FileText, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  PlusCircle,
  Bell
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import toast, { Toaster } from 'react-hot-toast';

// Views (To be implemented in next steps)
import Dashboard from './views/Dashboard';
import RequestsList from './views/RequestsList';
import NewRequest from './views/NewRequest';
import SupplierManager from './views/SupplierManager';
import RequestDetail from './views/RequestDetail';
import Reports from './views/Reports';
import AdminPanel from './views/Admin';
import NotFound from './views/NotFound';
import NotificationBell from './components/NotificationBell';

// Auth and Types
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { User } from './types';
import { cn } from './lib/utils';

const SidebarItem = ({ to, icon: Icon, label, active }: { to: string, icon: React.ElementType, label: string, active?: boolean }) => (
  <Link 
    to={to} 
    className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group text-slate-400 hover:text-white hover:bg-slate-800/50",
      active && "bg-slate-800 text-white shadow-sm ring-1 ring-white/10"
    )}
  >
    <Icon size={20} className={cn("transition-transform group-hover:scale-110", active && "text-brand-accent")} />
    <span className="font-medium">{label}</span>
  </Link>
);

const AppLayout = ({ children, user }: { children: React.ReactNode, user: User }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isProfileModalOpen, setProfileModalOpen] = useState(false);
  const location = useLocation();
  const { logout } = useAuth();

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 bg-brand-secondary text-slate-300 transform transition-transform duration-300 ease-in-out border-r border-dashboard-border shadow-2xl",
          !isSidebarOpen && "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full p-6">
          <div className="flex items-center gap-3 mb-10 px-2">
            <div className="w-10 h-10 bg-brand-primary rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-[0_0_20px_rgba(59,130,246,0.5)] ring-1 ring-white/20">
              SL
            </div>
            <div>
              <h1 className="text-white font-bold text-lg tracking-tight">Som Llar</h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Gestió de Compres</p>
            </div>
          </div>

          <nav className="flex-1 space-y-2">
            <SidebarItem to="/" icon={LayoutDashboard} label="Dashboard" active={location.pathname === '/'} />
            <SidebarItem to="/compres" icon={ShoppingCart} label="Sol·licituds" active={location.pathname.startsWith('/compres')} />
            <SidebarItem to="/proveidors" icon={Users} label="Proveïdors" active={location.pathname.startsWith('/proveidors')} />
            <SidebarItem to="/informes" icon={FileText} label="Informes" active={location.pathname === '/informes'} />
            
            {(user.role === 'admin_compres' || user.role === 'superadmin') && (
              <div className="pt-6 pb-2">
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-4 mb-2">SISTEMA</p>
                <SidebarItem to="/admin" icon={Settings} label="Administració" active={location.pathname.startsWith('/admin')} />
              </div>
            )}
          </nav>

          <div className="mt-auto space-y-4">
            <div 
              onClick={() => setProfileModalOpen(true)}
              className="p-4 bg-white/[0.03] rounded-2xl border border-white/5 cursor-pointer hover:bg-white/[0.05] transition-all group"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold text-white uppercase shadow-lg shadow-blue-500/20 ring-2 ring-white/10 group-hover:ring-brand-primary/50 transition-all">
                  {user.name.charAt(0)}
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-semibold text-white truncate">{user.name}</p>
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{user.role.replace('_', ' ')}</p>
                </div>
              </div>
              <button onClick={(e) => { e.stopPropagation(); logout(); }} className="w-full flex items-center gap-2 justify-center py-2 text-xs font-medium text-slate-500 hover:text-white transition-colors border-t border-white/5 mt-2">
                <LogOut size={14} /> Tancar sessió
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Modal de Perfil */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in zoom-in duration-300">
          <div className="bg-[#151c2c] border border-white/10 rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl relative">
            <div className="absolute top-6 right-6">
              <button onClick={() => setProfileModalOpen(false)} className="p-2 hover:bg-white/5 rounded-full text-slate-400">
                <X size={20} />
              </button>
            </div>
            
            <div className="h-32 bg-gradient-to-br from-brand-primary/20 to-brand-accent/20" />
            
            <div className="px-10 pb-10 -mt-16 space-y-8">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-32 h-32 rounded-[2rem] bg-brand-primary flex items-center justify-center text-4xl font-black text-white shadow-2xl ring-4 ring-[#151c2c]">
                  {user.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white tracking-tight">{user.name}</h3>
                  <p className="text-xs font-black text-brand-primary uppercase tracking-[0.2em]">{user.role.replace('_', ' ')}</p>
                </div>
              </div>

              <div className="space-y-4 pt-4">
                <div className="p-5 bg-white/[0.02] border border-white/5 rounded-3xl space-y-1">
                  <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Correu Electrònic</p>
                  <p className="text-sm font-medium text-slate-300">{user.email}</p>
                </div>
                <div className="p-5 bg-white/[0.02] border border-white/5 rounded-3xl space-y-1">
                  <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">ID d'Usuari</p>
                  <p className="text-[10px] font-mono text-slate-500 break-all">{user.id}</p>
                </div>
                <div className="p-5 bg-brand-primary/5 border border-brand-primary/10 rounded-3xl space-y-1">
                  <p className="text-[9px] font-black text-brand-primary uppercase tracking-widest">Àrea Assignada</p>
                  <p className="text-sm font-medium text-white capitalize">{user.areaId}</p>
                </div>
              </div>

              <button 
                onClick={() => setProfileModalOpen(false)}
                className="w-full btn-primary py-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-brand-primary/20"
              >
                Tancar Perfil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className={cn(
        "flex-1 transition-all duration-300 ease-in-out",
        isSidebarOpen ? "ml-72" : "ml-0"
      )}>
        {/* Header */}
        <header className="sticky top-0 z-40 h-16 bg-dashboard-card/50 backdrop-blur-xl border-b border-dashboard-border px-8 flex items-center justify-between">
          <button 
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-white/5 rounded-lg text-slate-400 transition-colors"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div className="flex items-center gap-4">
            <NotificationBell user={user} />
            
            <Link to="/compres/nova" className="btn-primary flex items-center gap-2 text-sm py-2">
              <PlusCircle size={18} />
              <span>Nova Compra</span>
            </Link>
          </div>
        </header>

        {/* Viewport */}
        <div className="p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
      <Toaster 
        position="bottom-right" 
        toastOptions={{
          style: {
            background: '#1e293b',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
          }
        }}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const { user, loading, loginWithMicrosoft } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-brand-secondary text-brand-primary">Carregant...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-brand-secondary gap-4">
        <h1 className="text-3xl font-black text-white mb-4">Gestió de Compres</h1>
        <button onClick={() => loginWithMicrosoft('tecnic')} className="btn-primary py-3 px-8 text-xs font-black uppercase">
          Entrar com a Tècnic
        </button>
        <button onClick={() => loginWithMicrosoft('finances')} className="btn-secondary py-3 px-8 text-xs font-black uppercase border-brand-primary/20 text-brand-primary">
          Entrar com a Finances
        </button>
      </div>
    );
  }

  return (
    <Router>
      <AppLayout user={user}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/compres" element={<RequestsList />} />
          <Route path="/compres/nova" element={<NewRequest user={user} />} />
          <Route path="/compres/:id" element={<RequestDetail user={user} />} />
          <Route path="/proveidors" element={<SupplierManager />} />
          <Route path="/informes" element={<Reports />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AppLayout>
    </Router>
  );
}
