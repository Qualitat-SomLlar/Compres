import { useState, useMemo } from 'react';
import { Users, Upload, Search, Plus, Edit2, Trash2, Download, CheckCircle, AlertTriangle, X, Database, Loader2, ShieldCheck, Activity, LogIn, LogOut, Clock, Laptop } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useUsers } from '../../hooks/useUsers';
import { useProjects } from '../../hooks/useProjects';
import { useActivityLogs } from '../../hooks/useActivityLogs';
import { activityService } from '../../services/activityService';
import toast from 'react-hot-toast';
import { cn } from '../../lib/utils';
import { ROLE_LABELS } from '../../constants';
import { User, ActivityLog } from '../../types';
import { useCenters } from '../../hooks/useCenters';
import { useAnalyticCodes } from '../../hooks/useAnalyticCodes';
import { useSuppliers } from '../../hooks/useSuppliers';

export function SuperManager() {
  const [subTab, setSubTab] = useState<'activity' | 'entities'>('activity');
  const { user: currentUser } = useAuth();
  const { users, updateUser } = useUsers();
  const { projects, addProject, updateProject, deleteProject } = useProjects();
  const { centers, addCenter, updateCenter, deleteCenter } = useCenters();
  const { analyticCodes, addAnalyticCode, updateAnalyticCode, deleteAnalyticCode } = useAnalyticCodes();
  const { suppliers, addSupplier, updateSupplier, deleteSupplier } = useSuppliers();

  const [editingEntity, setEditingEntity] = useState<{type: string, id?: string, data: any} | null>(null);

  const handleRoleChange = async (userId: string, newRole: any) => {
    try {
      const targetUser = users.find(u => u.id === userId);
      await updateUser(userId, { role: newRole });
      activityService.logAdminAction(
        currentUser!,
        'user_updated',
        'Canvi de Rol de Treballador/a',
        `S'ha modificat el rol de ${targetUser?.name || userId} a "${newRole}".`,
        {
          targetUserId: userId,
          targetUserEmail: targetUser?.email,
          newRole
        }
      );
      toast.success("Rol d'usuari actualitzat");
    } catch (err) {
      toast.error("Error al carviar el rol");
    }
  };

  const saveEntity = async () => {
    if (!editingEntity) return;
    try {
      const { type, id, data } = editingEntity;
      if (type === 'project') id ? await updateProject(id, data) : await addProject(data);
      if (type === 'center') id ? await updateCenter(id, data) : await addCenter(data);
      if (type === 'analyticCode') id ? await updateAnalyticCode(id, data) : await addAnalyticCode(data);
      if (type === 'supplier') id ? await updateSupplier(id, data) : await addSupplier(data);
      
      activityService.logAdminAction(
        currentUser!,
        'system_config_updated',
        'Gestió de Mestres del Sistema',
        `${id ? 'Actualització' : 'Creació'} d'element mestre (${type}): ${data.name || data.code || data.description}`,
        {
          entityType: type,
          entityId: id,
          data
        }
      );

      toast.success(`${type} desat correctament`);
      setEditingEntity(null);
    } catch (err) {
      toast.error("Error al desar");
    }
  };

  return (
    <div className="p-8 space-y-8">
      {/* Capçalera Superusuari amb Sub-pestanyes */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/5">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400">
            <ShieldCheck size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-red-500/20 text-red-400 border border-red-500/30">Superadmin</span>
              <h3 className="text-xl font-black text-white tracking-tight">Zona de Control Global i Auditoria</h3>
            </div>
            <p className="text-xs text-slate-400 font-medium mt-1">Supervisió d'activitat en temps real de tots els usuaris, registres de sessió i gestió d'entitats mestres.</p>
          </div>
        </div>

        {/* Sub-pestanyes */}
        <div className="flex items-center gap-2 p-1 bg-white/[0.03] border border-white/10 rounded-2xl">
          <button
            type="button"
            onClick={() => setSubTab('activity')}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-wider transition-all",
              subTab === 'activity'
                ? "bg-brand-primary text-black shadow-lg shadow-brand-primary/20"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            )}
          >
            <Activity size={15} />
            <span>Registre d'Activitat & Auditoria</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('entities')}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-wider transition-all",
              subTab === 'entities'
                ? "bg-brand-primary text-black shadow-lg shadow-brand-primary/20"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            )}
          >
            <Database size={15} />
            <span>Mestres i Entitats</span>
          </button>
        </div>
      </div>

      {subTab === 'activity' ? (
        <ActivityLogViewer users={users} />
      ) : (
        <div className="space-y-12 animate-in fade-in duration-300">
          {/* Secció 1: Projectes */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Projectes Actius</h4>
              <button onClick={() => setEditingEntity({type: 'project', data: {name: '', code: '', active: true}})} className="btn-primary text-[9px] py-1.5 px-3">Nou Projecte</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map(p => (
                <div key={p.id} className="p-4 bg-white/[0.01] border border-white/5 rounded-2xl flex items-center justify-between group">
                  <div>
                    <p className="text-xs font-bold text-white">{p.name}</p>
                    <p className="text-[10px] text-slate-500 uppercase font-black">{p.code}</p>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setEditingEntity({type: 'project', id: p.id, data: p})} className="p-2 hover:bg-white/5 rounded-lg text-slate-400"><Edit2 size={12}/></button>
                    <button onClick={() => deleteProject(p.id)} className="p-2 hover:bg-white/5 rounded-lg text-red-500/50 hover:text-red-500"><Trash2 size={12}/></button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Secció 2: Centres */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Centres de Destí</h4>
              <button onClick={() => setEditingEntity({type: 'center', data: {name: '', code: '', active: true, area: ''}})} className="btn-primary text-[9px] py-1.5 px-3">Nou Centre</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {centers.map(c => (
                <div key={c.id} className="p-4 bg-white/[0.01] border border-white/5 rounded-2xl flex items-center justify-between group">
                  <div>
                    <p className="text-xs font-bold text-white">{c.name}</p>
                    <p className="text-[10px] text-slate-500">{c.code} · {c.area}</p>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setEditingEntity({type: 'center', id: c.id, data: c})} className="p-2 hover:bg-white/5 rounded-lg text-slate-400"><Edit2 size={12}/></button>
                    <button onClick={() => deleteCenter(c.id)} className="p-2 hover:bg-white/5 rounded-lg text-red-500/50 hover:text-red-500"><Trash2 size={12}/></button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Secció 3: Codis Analítics */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Codis Analítics</h4>
              <button onClick={() => setEditingEntity({type: 'analyticCode', data: {description: '', code: '', projectId: '', area: 'social', active: true}})} className="btn-primary text-[9px] py-1.5 px-3">Nou Codi</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {analyticCodes.map(ac => (
                <div key={ac.id} className="p-4 bg-white/[0.01] border border-white/5 rounded-2xl flex items-center justify-between group">
                  <div>
                    <p className="text-xs font-bold text-white">{ac.description || ac.code}</p>
                    <p className="text-[10px] text-slate-500 uppercase font-black">{ac.code}</p>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setEditingEntity({type: 'analyticCode', id: ac.id, data: ac})} className="p-2 hover:bg-white/5 rounded-lg text-slate-400"><Edit2 size={12}/></button>
                    <button onClick={() => deleteAnalyticCode(ac.id)} className="p-2 hover:bg-white/5 rounded-lg text-red-500/50 hover:text-red-500"><Trash2 size={12}/></button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Secció 4: Proveïdors */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Proveïdors Registrats</h4>
              <button onClick={() => setEditingEntity({type: 'supplier', data: {name: '', nif: '', email: '', category: "Serveis Generals", status: 'candidat', rating: 80, criticality: 'mitjana', documents: []}})} className="btn-primary text-[9px] py-1.5 px-3">Nou Proveïdor</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {suppliers.map(s => (
                <div key={s.id} className="p-4 bg-white/[0.01] border border-white/5 rounded-2xl flex items-center justify-between group">
                  <div>
                    <p className="text-xs font-bold text-white">{s.name}</p>
                    <p className="text-[10px] text-slate-500 uppercase font-black">{s.nif}</p>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setEditingEntity({type: 'supplier', id: s.id, data: s})} className="p-2 hover:bg-white/5 rounded-lg text-slate-400"><Edit2 size={12}/></button>
                    <button onClick={() => deleteSupplier(s.id)} className="p-2 hover:bg-white/5 rounded-lg text-red-500/50 hover:text-red-500"><Trash2 size={12}/></button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Secció 5: Usuaris */}
          <section className="space-y-6">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Control d'Usuaris de l'Aplicació</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {users.map(u => (
                <div key={u.id} className="p-5 bg-white/[0.01] border border-white/5 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-white">{u.name}</p>
                      <p className="text-[9px] text-slate-500">{u.email}</p>
                    </div>
                    <div className={cn(
                      "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest",
                      u.role === 'superadmin' ? "bg-red-500/20 text-red-500" : "bg-brand-primary/10 text-brand-primary"
                    )}>
                      {u.role}
                    </div>
                  </div>
                  <select 
                    className="input-field w-full text-[10px] py-2"
                    value={u.role}
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                  >
                    {Object.entries(ROLE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                    <option value="superadmin">SUPERADMIN (Accés Total)</option>
                  </select>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* Modal d'edició ràpida */}
      {editingEntity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#151c2c] border border-white/10 rounded-2xl w-full max-w-md p-6 space-y-6">
            <h3 className="text-sm font-black text-white uppercase tracking-widest">Gestionar {editingEntity.type}</h3>
            <div className="space-y-4">
              <input 
                className="input-field w-full" 
                placeholder="Nom / Descripció" 
                value={editingEntity.data.description || editingEntity.data.name || ''} 
                onChange={e => setEditingEntity({...editingEntity, data: {...editingEntity.data, name: e.target.value, description: e.target.value}})}
              />
              <input 
                className="input-field w-full" 
                placeholder="Codi" 
                value={editingEntity.data.code || ''} 
                onChange={e => setEditingEntity({...editingEntity, data: {...editingEntity.data, code: e.target.value}})}
              />
              {editingEntity.type === 'center' && (
                <input 
                  className="input-field w-full" 
                  placeholder="Àrea" 
                  value={editingEntity.data.area || ''} 
                  onChange={e => setEditingEntity({...editingEntity, data: {...editingEntity.data, area: e.target.value}})}
                />
              )}
              {editingEntity.type === 'supplier' && (
                <>
                  <input 
                    className="input-field w-full" 
                    placeholder="NIF / CIF" 
                    value={editingEntity.data.nif || editingEntity.data.cif || ''} 
                    onChange={e => setEditingEntity({...editingEntity, data: {...editingEntity.data, nif: e.target.value, cif: e.target.value}})}
                  />
                  <input 
                    className="input-field w-full" 
                    placeholder="Correu Electrònic" 
                    value={editingEntity.data.email || ''} 
                    onChange={e => setEditingEntity({...editingEntity, data: {...editingEntity.data, email: e.target.value}})}
                  />
                </>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
              <button onClick={() => setEditingEntity(null)} className="btn-secondary px-4 py-2 text-[10px] font-black uppercase">Cancel·lar</button>
              <button onClick={saveEntity} className="btn-primary px-4 py-2 text-[10px] font-black uppercase">Desar Canvis</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Component de Visualització i Auditoria de Logs d'Activitat
 */
export function ActivityLogViewer({ users }: { users: User[] }) {
  const { logs, loading, error, exportLogsToCSV } = useActivityLogs(500);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  // Mètriques clau calculades en temps real
  const metrics = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const loginsToday = logs.filter(l => l.type === 'login' && new Date(l.createdAt) >= today).length;
    
    // Usuaris únics actius
    const uniqueUserIds = new Set(logs.map(l => l.userId).filter(Boolean));
    
    const requestActions = logs.filter(l => l.type.startsWith('request_')).length;

    const lastLog = logs[0];

    return {
      loginsToday,
      activeUsersCount: uniqueUserIds.size,
      requestActions,
      lastActivityTime: lastLog ? new Date(lastLog.createdAt).toLocaleTimeString('ca-ES', { hour: '2-digit', minute: '2-digit' }) : 'Cap'
    };
  }, [logs]);

  // Filtrar logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Cerca per text lliure
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesUser = (log.userName || '').toLowerCase().includes(term) || (log.userEmail || '').toLowerCase().includes(term);
        const matchesAction = (log.action || '').toLowerCase().includes(term);
        const matchesDetails = (log.details || '').toLowerCase().includes(term);
        const matchesRequest = (log.requestCode || '').toLowerCase().includes(term);
        if (!matchesUser && !matchesAction && !matchesDetails && !matchesRequest) {
          return false;
        }
      }

      // Filtre per usuari
      if (selectedUserId !== 'all' && log.userId !== selectedUserId) {
        return false;
      }

      // Filtre per categoria d'acció
      if (selectedCategory !== 'all') {
        if (selectedCategory === 'auth' && log.type !== 'login' && log.type !== 'logout') return false;
        if (selectedCategory === 'requests' && !log.type.startsWith('request_')) return false;
        if (selectedCategory === 'files' && !log.type.startsWith('file_')) return false;
        if (selectedCategory === 'admin' && !log.type.startsWith('user_') && !log.type.startsWith('area_') && !log.type.startsWith('system_')) return false;
      }

      // Filtre temporal
      if (dateFilter !== 'all') {
        const logDate = new Date(log.createdAt);
        const now = new Date();
        if (dateFilter === 'today') {
          const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          if (logDate < startOfToday) return false;
        } else if (dateFilter === 'week') {
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (logDate < sevenDaysAgo) return false;
        } else if (dateFilter === 'month') {
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          if (logDate < thirtyDaysAgo) return false;
        }
      }

      return true;
    });
  }, [logs, searchTerm, selectedUserId, selectedCategory, dateFilter]);

  // Configuració de visualització segons tipus de log
  const getLogBadge = (log: ActivityLog) => {
    switch (log.type) {
      case 'login':
        return {
          icon: <LogIn size={13} className="text-emerald-400" />,
          bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
          text: "Sessió Iniciada"
        };
      case 'logout':
        return {
          icon: <LogOut size={13} className="text-slate-400" />,
          bg: "bg-slate-500/10 text-slate-400 border-slate-500/20",
          text: "Sessió Tancada"
        };
      case 'request_created':
        return {
          icon: <Plus size={13} className="text-sky-400" />,
          bg: "bg-sky-500/10 text-sky-400 border-sky-500/20",
          text: "Sol·licitud Creada"
        };
      case 'request_approved':
        return {
          icon: <CheckCircle size={13} className="text-emerald-400" />,
          bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
          text: "Validada / Aprovada"
        };
      case 'request_returned':
        return {
          icon: <AlertTriangle size={13} className="text-amber-400" />,
          bg: "bg-amber-500/10 text-amber-400 border-amber-500/20",
          text: "Retornada Esmena"
        };
      case 'request_rejected':
        return {
          icon: <X size={13} className="text-rose-400" />,
          bg: "bg-rose-500/10 text-rose-400 border-rose-500/20",
          text: "Rebutjada"
        };
      case 'file_uploaded':
        return {
          icon: <Upload size={13} className="text-cyan-400" />,
          bg: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
          text: "Fitxer Carregat"
        };
      case 'file_deleted':
        return {
          icon: <Trash2 size={13} className="text-rose-400" />,
          bg: "bg-rose-500/10 text-rose-400 border-rose-500/20",
          text: "Fitxer Eliminat"
        };
      default:
        return {
          icon: <Activity size={13} className="text-indigo-400" />,
          bg: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
          text: log.action || "Operació"
        };
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 4 Indicadors KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
            <LogIn size={13} className="text-emerald-400" /> Logins Avui
          </p>
          <p className="text-2xl font-black text-white">{metrics.loginsToday}</p>
          <p className="text-[10px] text-slate-500">Inicis de sessió registrats</p>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
            <Users size={13} className="text-brand-primary" /> Usuaris Actius
          </p>
          <p className="text-2xl font-black text-white">{metrics.activeUsersCount}</p>
          <p className="text-[10px] text-slate-500">Persones amb activitat recent</p>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
            <Activity size={13} className="text-amber-400" /> Accions d'Expedients
          </p>
          <p className="text-2xl font-black text-white">{metrics.requestActions}</p>
          <p className="text-[10px] text-slate-500">Creacions, passos i validacions</p>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
            <Clock size={13} className="text-cyan-400" /> Darrera Activitat
          </p>
          <p className="text-2xl font-black text-white">{metrics.lastActivityTime}</p>
          <p className="text-[10px] text-slate-500">Sincronitzat en temps real</p>
        </div>
      </div>

      {/* Barra de Filtres i Controls */}
      <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            {/* Cerca lliure */}
            <div className="relative min-w-[220px] flex-1 max-w-sm">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
              <input
                type="text"
                placeholder="Cercar per treballador, acció, exp..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="input-field pl-10 text-xs w-full"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Filtre per Usuari */}
            <div className="min-w-[180px]">
              <select
                value={selectedUserId}
                onChange={e => setSelectedUserId(e.target.value)}
                className="input-field text-xs w-full font-medium"
              >
                <option value="all">Tots els Usuaris ({users.length})</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
            </div>

            {/* Filtre per Tipus d'Esdeveniment */}
            <div className="min-w-[160px]">
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="input-field text-xs w-full font-medium"
              >
                <option value="all">Totes les Categories</option>
                <option value="auth">🔐 Sessions (Login / Logout)</option>
                <option value="requests">📦 Sol·licituds de Compra</option>
                <option value="files">📎 Fitxers i Documents</option>
                <option value="admin">⚙️ Administració del Sistema</option>
              </select>
            </div>

            {/* Filtre Temporal */}
            <div className="min-w-[130px]">
              <select
                value={dateFilter}
                onChange={e => setDateFilter(e.target.value as any)}
                className="input-field text-xs w-full font-medium"
              >
                <option value="all">Tot l'Històric</option>
                <option value="today">📅 Només Avui</option>
                <option value="week">📅 Últims 7 dies</option>
                <option value="month">📅 Últims 30 dies</option>
              </select>
            </div>
          </div>

          {/* Botó d'Exportació CSV */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportLogsToCSV(filteredLogs)}
              disabled={filteredLogs.length === 0}
              className="btn-secondary flex items-center gap-2 text-xs py-2 px-4 whitespace-nowrap"
              title="Descarregar els registres visibles en format CSV"
            >
              <Download size={14} />
              <span>Exportar CSV ({filteredLogs.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Taula de Registres */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 gap-3">
          <Loader2 className="animate-spin text-brand-primary" size={32} />
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Carregant registre d'activitat...</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white/[0.01] border border-white/5 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-white/5 mx-auto flex items-center justify-center text-slate-500">
            <Activity size={24} />
          </div>
          <p className="text-sm font-bold text-white">No s'han trobat esdeveniments amb els filtres actuals</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">Els inicis de sessió, canvis en sol·licituds i accions administratives es registraran aquí automàticament.</p>
          {(searchTerm || selectedUserId !== 'all' || selectedCategory !== 'all' || dateFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedUserId('all');
                setSelectedCategory('all');
                setDateFilter('all');
              }}
              className="btn-secondary text-[10px] uppercase font-black py-1.5 px-3"
            >
              Netejar filtres
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/5 bg-white/[0.01]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-[9px] font-black uppercase tracking-widest text-slate-500 bg-white/[0.02]">
                <th className="py-3 px-4">Data i Hora</th>
                <th className="py-3 px-4">Usuari / Treballador</th>
                <th className="py-3 px-4">Acció</th>
                <th className="py-3 px-4">Detalls de l'Operació</th>
                <th className="py-3 px-4">Dispositiu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs font-medium">
              {filteredLogs.map(log => {
                const badge = getLogBadge(log);
                const logDate = new Date(log.createdAt);
                const formattedDate = logDate.toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
                const formattedTime = logDate.toLocaleTimeString('ca-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

                return (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition-colors group">
                    {/* Timestamp */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-white font-mono text-[11px] font-bold">{formattedTime}</span>
                        <span className="text-[10px] text-slate-500">{formattedDate}</span>
                      </div>
                    </td>

                    {/* Usuari */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-[10px] font-black text-brand-primary">
                          {(log.userName || 'U')[0]?.toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-slate-200 font-bold text-xs">{log.userName || 'Usuari desconegut'}</span>
                          <span className="text-[10px] text-slate-500 font-mono">{log.userEmail}</span>
                        </div>
                      </div>
                    </td>

                    {/* Acció Badge */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border",
                        badge.bg
                      )}>
                        {badge.icon}
                        <span>{badge.text}</span>
                      </span>
                    </td>

                    {/* Detalls i Codi de Sol·licitud */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1 max-w-md">
                        {log.requestCode && (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[10px] font-black bg-brand-primary/10 text-brand-primary px-1.5 py-0.5 rounded border border-brand-primary/20">
                              {log.requestCode}
                            </span>
                            {log.metadata?.itemDescription && (
                              <span className="text-slate-400 text-[11px] truncate">
                                · {log.metadata.itemDescription}
                              </span>
                            )}
                          </div>
                        )}
                        <p className="text-slate-300 text-[11px] leading-relaxed break-words">
                          {log.details || log.action}
                        </p>
                      </div>
                    </td>

                    {/* Dispositiu */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-right text-slate-500 text-[10px]">
                      <div className="flex items-center justify-end gap-1.5" title={log.ip || ''}>
                        <Laptop size={12} className="text-slate-600" />
                        <span>{log.device || 'Navegador Web'}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
