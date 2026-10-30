import React, { useState, useEffect, lazy, Suspense } from 'react';
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
  Bell,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import toast, { Toaster } from 'react-hot-toast';

// Vistes (carregades sota demanda per reduir la mida del paquet inicial)
const Dashboard = lazy(() => import('./views/Dashboard'));
const RequestsList = lazy(() => import('./views/RequestsList'));
const NewRequest = lazy(() => import('./views/NewRequest'));
const SupplierManager = lazy(() => import('./views/SupplierManager'));
const RequestDetail = lazy(() => import('./views/RequestDetail'));
const Reports = lazy(() => import('./views/Reports'));
const AdminPanel = lazy(() => import('./views/Admin'));
const NotFound = lazy(() => import('./views/NotFound'));

const ViewLoader = () => (
  <div className="py-24 text-center text-xs text-slate-500 font-bold uppercase tracking-widest">
    Carregant...
  </div>
);
import NotificationBell from './components/NotificationBell';

// Contexts and Types
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { User } from './types';
import { workflowService } from './services/workflowService';
import { cn } from './lib/utils';

const SidebarItem = ({ to, icon: Icon, label, active, onClick, collapsed }: { to: string, icon: React.ElementType, label: string, active?: boolean, onClick?: () => void, collapsed?: boolean }) => (
  <Link
    to={to}
    onClick={onClick}
    title={collapsed ? label : undefined}
    className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group text-slate-400 hover:text-white hover:bg-slate-800/50",
      active && "bg-slate-800 text-white shadow-sm ring-1 ring-white/10",
      collapsed && "lg:justify-center lg:px-0"
    )}
  >
    <Icon size={20} className={cn("shrink-0 transition-transform group-hover:scale-110", active && "text-brand-accent")} />
    <span className={cn("font-medium", collapsed && "lg:hidden")}>{label}</span>
  </Link>
);

const SIDEBAR_COLLAPSED_KEY = 'somllar.sidebarCollapsed';

const ProtectedAdminRoute = ({ user, children }: { user: User, children: React.ReactNode }) => {
  if (user.role !== 'admin_compres' && user.role !== 'superadmin' && user.role !== 'gerencia') {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

const AppLayout = ({ children, user }: { children: React.ReactNode, user: User }) => {
  // Mòbil: menú desplegable a sobre del contingut. Escriptori: menú fix que es pot plegar a només icones.
  const [isSidebarOpen, setSidebarOpen] = useState(() => typeof window === 'undefined' || window.innerWidth >= 1024);
  const [isCollapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1'; } catch { return false; }
  });
  const toggleCollapsed = () => {
    setCollapsed(prev => {
      try { localStorage.setItem(SIDEBAR_COLLAPSED_KEY, prev ? '0' : '1'); } catch { /* sense emmagatzematge */ }
      return !prev;
    });
  };
  const [isProfileModalOpen, setProfileModalOpen] = useState(false);
  const location = useLocation();
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Tancar sidebar en mòbil al canviar de ruta
  const handleNavClick = () => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Backdrop mòbil */}
      {isSidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)} 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden animate-in fade-in duration-200"
        />
      )}

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 bg-brand-secondary text-slate-300 transform transition-all duration-300 ease-in-out border-r border-dashboard-border shadow-2xl lg:translate-x-0",
          !isSidebarOpen && "-translate-x-full",
          isCollapsed && "lg:w-20"
        )}
      >
        <div className={cn("flex flex-col h-full p-6", isCollapsed && "lg:p-3")}>
          <div className={cn("mb-8 px-1", isCollapsed && "lg:px-0")}>
            <div className={cn("bg-white/95 rounded-2xl p-3.5 shadow-xl flex items-center justify-center mb-3", isCollapsed && "lg:p-2")}>
              <img 
                src="/SomLlar_Logo.png" 
                alt="Som Llar" 
                className="h-8 w-auto object-contain"
              />
            </div>
            <div className={cn("px-2 flex items-center justify-between", isCollapsed && "lg:hidden")}>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Gestió de Compres</p>
              <span className="text-[8px] font-black text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded-full uppercase tracking-widest border border-brand-primary/20">Som Llar</span>
            </div>
          </div>

          <nav className="flex-1 space-y-2">
            <SidebarItem to="/" icon={LayoutDashboard} label="Dashboard" active={location.pathname === '/'} onClick={handleNavClick} collapsed={isCollapsed} />
            <SidebarItem to="/compres" icon={ShoppingCart} label="Sol·licituds" active={location.pathname.startsWith('/compres')} onClick={handleNavClick} collapsed={isCollapsed} />
            <SidebarItem to="/proveidors" icon={Users} label="Proveïdors" active={location.pathname.startsWith('/proveidors')} onClick={handleNavClick} collapsed={isCollapsed} />
            <SidebarItem to="/informes" icon={FileText} label="Informes" active={location.pathname === '/informes'} onClick={handleNavClick} collapsed={isCollapsed} />

            {(user.role === 'admin_compres' || user.role === 'superadmin' || user.role === 'gerencia') && (
              <div className="pt-6 pb-2">
                <p className={cn("text-[10px] font-black text-slate-600 uppercase tracking-widest px-4 mb-2", isCollapsed && "lg:hidden")}>SISTEMA</p>
                <SidebarItem to="/admin" icon={Settings} label="Administració" active={location.pathname.startsWith('/admin')} onClick={handleNavClick} collapsed={isCollapsed} />
              </div>
            )}
          </nav>

          <div className="mt-auto space-y-4">
            <button
              onClick={toggleCollapsed}
              className={cn(
                "hidden lg:flex w-full items-center gap-3 px-4 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors text-sm font-medium",
                isCollapsed && "justify-center px-0"
              )}
              title={isCollapsed ? 'Desplegar el menú' : 'Plegar el menú'}
              aria-label={isCollapsed ? 'Desplegar el menú' : 'Plegar el menú'}
              aria-expanded={!isCollapsed}
            >
              {isCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
              {!isCollapsed && <span>Plegar el menú</span>}
            </button>

            <div
              onClick={() => setProfileModalOpen(true)}
              title={isCollapsed ? (user?.name || 'Perfil') : undefined}
              className={cn(
                "p-4 bg-white/[0.03] rounded-2xl border border-white/5 cursor-pointer hover:bg-white/[0.05] transition-all group",
                isCollapsed && "lg:p-2"
              )}
            >
              <div className={cn("flex items-center gap-3 mb-2", isCollapsed && "lg:justify-center lg:mb-0")}>
                <div className="w-8 h-8 shrink-0 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold text-white uppercase shadow-lg shadow-blue-500/20 ring-2 ring-white/10 group-hover:ring-brand-primary/50 transition-all">
                  {(user?.name || 'U').charAt(0)}
                </div>
                <div className={cn("overflow-hidden", isCollapsed && "lg:hidden")}>
                  <p className="text-sm font-semibold text-white truncate">{user?.name || 'Usuari Som Llar'}</p>
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{(user?.role || 'tecnic').replace('_', ' ')}</p>
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); logout(); }}
                title="Tancar sessió"
                className={cn(
                  "w-full flex items-center gap-2 justify-center py-2 text-xs font-medium text-slate-500 hover:text-white transition-colors border-t border-white/5 mt-2",
                  isCollapsed && "lg:mt-2 lg:pt-2 lg:pb-0"
                )}
              >
                <LogOut size={14} /> <span className={cn(isCollapsed && "lg:hidden")}>Tancar sessió</span>
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
                  {(user?.name || 'U').charAt(0)}
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white tracking-tight">{user?.name || 'Usuari Som Llar'}</h3>
                  <p className="text-xs font-black text-brand-primary uppercase tracking-[0.2em]">{(user?.role || 'tecnic').replace('_', ' ')}</p>
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
        "flex-1 min-w-0 transition-all duration-300 ease-in-out w-full",
        isCollapsed ? "lg:ml-20" : "lg:ml-72"
      )}>
        {/* Header */}
        <header className="sticky top-0 z-40 h-16 bg-dashboard-card/50 backdrop-blur-xl border-b border-dashboard-border px-4 sm:px-8 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-white/5 rounded-lg text-slate-400 transition-colors lg:invisible"
            aria-label={isSidebarOpen ? 'Tancar el menú' : 'Obrir el menú'}
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div className="flex items-center gap-3">
            {/* Botó commutador de Tema (Clar / Fosc) */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl border border-dashboard-border hover:bg-white/5 transition-all text-slate-400 hover:text-white"
              title={theme === 'dark' ? "Canviar a Mode Clar" : "Canviar a Mode Fosc"}
              aria-label="Canviar tema visual"
            >
              {theme === 'dark' ? (
                <Sun size={18} className="text-amber-400 animate-in spin-in-90 duration-300" />
              ) : (
                <Moon size={18} className="text-sky-500 animate-in spin-in-90 duration-300" />
              )}
            </button>

            <NotificationBell user={user} />
            
            {workflowService.canCreateRequest(user) && (
              <Link to="/compres/nova" className="btn-primary flex items-center gap-2 text-sm py-2">
                <PlusCircle size={18} />
                <span className="hidden sm:inline">Nova sol·licitud</span>
              </Link>
            )}
          </div>
        </header>

        {/* Viewport: amb el menú plegat, el contingut ocupa tota l'amplada de la pantalla */}
        <div className={cn("p-4 sm:p-8", isCollapsed ? "w-full" : "max-w-7xl mx-auto")}>
          {children}
        </div>
      </main>
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
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
      </AuthProvider>
    </ThemeProvider>
  );
}

function AppContent() {
  const { user, loading, loginWithMicrosoft, loginWithMicrosoftRedirect } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-brand-secondary text-brand-primary">Carregant...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-brand-secondary gap-6 p-4">
        <div className="flex flex-col items-center space-y-4">
          <div className="bg-white/95 rounded-3xl p-6 shadow-2xl shadow-brand-primary/10 mb-2">
            <img 
              src="/SomLlar_Logo.png" 
              alt="Som Llar" 
              className="h-14 w-auto object-contain"
            />
          </div>
          <div className="text-center space-y-1">
            <h1 className="text-3xl font-black text-white tracking-tight">Gestió de Compres</h1>
            <p className="text-slate-400 text-sm font-medium">Plataforma centralitzada de compres, proveïdors i subministraments</p>
          </div>
        </div>
        
        <div className="flex flex-col items-center gap-3 mt-4">
          <button onClick={() => loginWithMicrosoft()} className="btn-primary flex items-center gap-3 py-4 px-10 text-sm font-black uppercase shadow-2xl shadow-brand-primary/20 hover:scale-[1.02] transition-transform">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M11.4 24H0V12.6H11.4V24ZM24 24H12.6V12.6H24V24ZM11.4 11.4H0V0H11.4V11.4ZM24 11.4H12.6V0H24V11.4Z" fill="currentColor"/>
            </svg>
            Iniciar sessió amb Microsoft
          </button>
          
          <button 
            onClick={() => loginWithMicrosoftRedirect()} 
            className="text-xs text-slate-400 hover:text-white transition-colors underline py-1"
          >
            Problemes amb la finestra emergent? Iniciar amb redirecció completa
          </button>
        </div>
        
        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-6">
          Accés exclusiu amb correu corporatiu (@somllar.cat)
        </p>
      </div>
    );
  }

  return (
    <Router>
      <AppLayout user={user}>
        <Suspense fallback={<ViewLoader />}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/compres" element={<RequestsList user={user} />} />
          <Route path="/compres/nova" element={<NewRequest user={user} />} />
          <Route path="/compres/:id" element={<RequestDetail user={user} />} />
          <Route path="/proveidors" element={<SupplierManager />} />
          <Route path="/informes" element={<Reports />} />
          <Route path="/admin" element={
            <ProtectedAdminRoute user={user}>
              <AdminPanel />
            </ProtectedAdminRoute>
          } />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
      </AppLayout>
    </Router>
  );
}
