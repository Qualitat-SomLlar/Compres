import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  GitMerge, 
  Bell, 
  Upload, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  Download, 
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  UserX,
  FileSpreadsheet,
  X,
  Save,
  Database,
  BellPlus,
  Loader2,
  Settings,
  ShieldCheck,
  Building2,
  Filter,
  UserCheck,
  ChevronRight,
  Info,
  Layers,
  Sparkles,
  Mail,
  Activity,
  LogIn,
  LogOut,
  Clock,
  Calendar,
  Laptop
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useUsers } from '../../hooks/useUsers';
import { useAreas } from '../../hooks/useAreas';
import { useHierarchyLevels } from '../../hooks/useHierarchyLevels';
import { useProjects } from '../../hooks/useProjects';
import { useRequests } from '../../hooks/useRequests';
import { useActivityLogs } from '../../hooks/useActivityLogs';
import { activityService } from '../../services/activityService';
import toast from 'react-hot-toast';
import { cn } from '../../lib/utils';
import { ROLE_LABELS, ATTACHMENT_CATEGORIES, NOTIFICATION_EVENTS, AREAS, HIERARCHY_ROLES, getHierarchyRole, getAreaName, normalizeAreaId } from '../../constants';
import { HierarchyLevel, AreaItem, HierarchyRoleConfig, User, ActivityLog } from '../../types';
import { importExportService } from '../../services/importExportService';
import { useNotificationSettings } from '../../hooks/useNotificationSettings';
import { useCenters } from '../../hooks/useCenters';
import { useAnalyticCodes } from '../../hooks/useAnalyticCodes';
import { useSuppliers } from '../../hooks/useSuppliers';

type AdminTab = 'users' | 'areas' | 'hierarchy' | 'flows' | 'notifications' | 'imports' | 'super';

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<AdminTab>('users');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'users':
        return <UsersManager />;
      case 'areas':
        return <AreasManager />;
      case 'hierarchy':
        return <HierarchyLevelsManager />;
      case 'flows':
        return <FlowsManager />;
      case 'notifications':
        return <NotificationsManager />;
      case 'imports':
        return <ImportsManager />;
      case 'super':
        return <SuperManager />;
      default:
        return <UsersManager />;
    }
  };

  const { user } = useAuth();
  const isSuper = user?.role === 'superadmin';

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
             <div className="p-2.5 bg-brand-primary/10 rounded-xl text-brand-primary">
              <Settings size={20} />
            </div>
            <h2 className="text-3xl font-black text-white tracking-tighter">Administració del Sistema</h2>
          </div>
          <p className="text-sm text-slate-500 font-medium max-w-xl">Gestiona el directori de treballadors/usuaris, el catàleg d'àrees corporatives, els nivells de jerarquia i la configuració global.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 p-1 bg-white/[0.02] border border-white/[0.05] rounded-2xl">
          <TabButton 
            active={activeTab === 'users'} 
            onClick={() => setActiveTab('users')} 
            icon={<Users size={16} />}
            label="Treballadors"
          />
          <TabButton 
            active={activeTab === 'areas'} 
            onClick={() => setActiveTab('areas')} 
            icon={<Building2 size={16} />}
            label="Àrees de Treball"
          />
          <TabButton 
            active={activeTab === 'hierarchy'} 
            onClick={() => setActiveTab('hierarchy')} 
            icon={<ShieldCheck size={16} />}
            label="Nivells Jeràrquics"
          />
          <TabButton 
            active={activeTab === 'flows'} 
            onClick={() => setActiveTab('flows')} 
            icon={<GitMerge size={16} />}
            label="Fluxos"
          />
          <TabButton 
            active={activeTab === 'notifications'} 
            onClick={() => setActiveTab('notifications')} 
            icon={<Bell size={16} />}
            label="Notificacions"
          />
          <TabButton 
            active={activeTab === 'imports'} 
            onClick={() => setActiveTab('imports')} 
            icon={<FileSpreadsheet size={16} />}
            label="Imports"
          />
          {isSuper && (
            <TabButton 
              active={activeTab === 'super'} 
              onClick={() => setActiveTab('super')} 
              icon={<ShieldCheck size={16} />}
              label="Super"
            />
          )}
        </div>
      </div>

      <div className="card">
        {renderTabContent()}
      </div>
    </div>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function TabButton({ active, onClick, icon, label }: TabButtonProps) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
        active ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/20" : "text-slate-500 hover:text-slate-300"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function UsersManager() {
  const { user: currentUser } = useAuth();
  const { users, loading: loadingUsers, addUser, updateUser, deleteUser, sendWelcomeEmail } = useUsers();
  const { areas, loading: loadingAreas, getAreaName: dynamicGetAreaName } = useAreas();
  const { hierarchyLevels, loading: loadingLevels, getHierarchyRole: dynamicGetHierarchyRole } = useHierarchyLevels();
  const { requests } = useRequests();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [areaFilter, setAreaFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');

  const linkedRequests = useMemo(() => {
    if (!userToDelete) return [];
    return requests.filter(r => 
      r.createdByUserId === userToDelete.id || 
      r.requestingTechnicianId === userToDelete.id ||
      (r.requestingTechnician && r.requestingTechnician.toLowerCase() === userToDelete.name?.toLowerCase()) ||
      (r.createdBy && r.createdBy.toLowerCase() === userToDelete.name?.toLowerCase())
    );
  }, [requests, userToDelete]);

  const handleInitiateDelete = (targetUser: User) => {
    if (currentUser?.id === targetUser.id || (currentUser?.email && targetUser.email && currentUser.email.toLowerCase() === targetUser.email.toLowerCase())) {
      toast.error("No pots eliminar el teu propi compte d'usuari.");
      return;
    }
    setUserToDelete(targetUser);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      await deleteUser(userToDelete.id, userToDelete.email);
      activityService.logAdminAction(
        currentUser!,
        'user_deleted',
        'Eliminació de Treballador/a',
        `S'ha eliminat el treballador/a ${userToDelete.name} (${userToDelete.email}) del sistema.`,
        {
          targetUserId: userToDelete.id,
          targetUserEmail: userToDelete.email,
          targetUserName: userToDelete.name
        }
      );
      toast.success(`Treballador/a "${userToDelete.name}" eliminat/da correctament`);
      if (selectedUser?.id === userToDelete.id) {
        setIsModalOpen(false);
        setSelectedUser(null);
      }
      setUserToDelete(null);
    } catch (err: any) {
      console.error("Error eliminant usuari:", err);
      toast.error(`Error al eliminar: ${err?.message || 'Permisos insuficients o error del servidor'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeactivateInstead = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      await updateUser(userToDelete.id, { active: false });
      activityService.logAdminAction(
        currentUser!,
        'user_updated',
        'Desactivació de Compte',
        `S'ha desactivat el compte de ${userToDelete.name} (${userToDelete.email}).`,
        {
          targetUserId: userToDelete.id,
          active: false
        }
      );
      toast.success(`Compte de "${userToDelete.name}" desactivat correctament`);
      if (selectedUser?.id === userToDelete.id) {
        setSelectedUser((prev: any) => prev ? { ...prev, active: false } : null);
      }
      setUserToDelete(null);
    } catch (err: any) {
      console.error("Error desactivant usuari:", err);
      toast.error(`Error al desactivar: ${err?.message || 'Error del servidor'}`);
    } finally {
      setIsDeleting(false);
    }
  };
  
  // Dues dades completament independents per al formulari
  const [formAreaId, setFormAreaId] = useState('tics');
  const [formLevel, setFormLevel] = useState<HierarchyLevel>(1);

  useEffect(() => {
    if (selectedUser) {
      setFormAreaId(normalizeAreaId(selectedUser.areaId || 'tics'));
      const lvl = (selectedUser.hierarchyLevel || dynamicGetHierarchyRole(selectedUser.role).level) as HierarchyLevel;
      setFormLevel(lvl || 1);
    } else {
      setFormAreaId(areas[0]?.id || 'tics');
      setFormLevel((hierarchyLevels[0]?.level as HierarchyLevel) || 1);
    }
  }, [selectedUser, isModalOpen, areas, hierarchyLevels]);

  const filteredUsers = users.filter(u => {
    const matchSearch = (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (u.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const userNormArea = normalizeAreaId(u.areaId);
    const matchArea = areaFilter === 'all' || userNormArea === normalizeAreaId(areaFilter);
    const userLevel = u.hierarchyLevel || dynamicGetHierarchyRole(u.role).level;
    const matchLevel = levelFilter === 'all' || String(userLevel) === String(levelFilter);
    return matchSearch && matchArea && matchLevel;
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    const selectedAreaId = normalizeAreaId(formData.get('areaId') as string);
    const selectedLevel = Number(formData.get('hierarchyLevel')) as HierarchyLevel;
    const matchedLevelConfig = hierarchyLevels.find(l => l.level === selectedLevel) || dynamicGetHierarchyRole(selectedLevel);
    const shouldSendWelcome = formData.get('sendWelcomeEmail') === 'on';

    const data = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      areaId: selectedAreaId,
      areaName: dynamicGetAreaName(selectedAreaId),
      role: (matchedLevelConfig?.key || 'tecnic') as any,
      hierarchyLevel: selectedLevel,
      active: formData.get('active') === 'on',
      notificationsEnabled: formData.get('notificationsEnabled') === 'on',
      firstName: (formData.get('name') as string).split(' ')[0],
      lastName: (formData.get('name') as string).split(' ').slice(1).join(' ')
    };

    try {
      if (selectedUser) {
        await updateUser(selectedUser.id, data);
        activityService.logAdminAction(
          currentUser!,
          'user_updated',
          'Actualització de Treballador/a',
          `S'han actualitzat les dades del treballador/a ${data.name} (${data.email}).`,
          {
            targetUserId: selectedUser.id,
            targetUserEmail: data.email,
            areaId: data.areaId,
            hierarchyLevel: data.hierarchyLevel,
            role: data.role,
            active: data.active
          }
        );
        toast.success("Treballador/a actualitzat correctament");
      } else {
        await addUser(data, { sendWelcomeEmail: shouldSendWelcome });
        activityService.logAdminAction(
          currentUser!,
          'user_created',
          'Alta de Nou Treballador/a',
          `S'ha donat d'alta el treballador/a ${data.name} (${data.email}) amb rol "${data.role}".`,
          {
            targetUserEmail: data.email,
            targetUserName: data.name,
            areaId: data.areaId,
            hierarchyLevel: data.hierarchyLevel,
            role: data.role,
            welcomeEmailSent: shouldSendWelcome
          }
        );
        if (shouldSendWelcome) {
          toast.success("Treballador/a creat i correu d'accés enviat!");
        } else {
          toast.success("Treballador/a creat correctament");
        }
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Error al desar les dades");
    } finally {
      setIsSaving(false);
    }
  };

  if (loadingUsers || loadingAreas || loadingLevels) {
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-4">
        <Loader2 className="animate-spin text-brand-primary" size={40} />
        <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Carregant directori de personal...</p>
      </div>
    );
  }

  const activeUsersCount = users.filter(u => u.active !== false).length;
  const coordinatorsCount = users.filter(u => (u.hierarchyLevel === 2 || u.role === 'coordinacio') && u.active !== false).length;
  const directorsCount = users.filter(u => (u.hierarchyLevel === 3 || u.role === 'direccio_area') && u.active !== false).length;
  const financesCount = users.filter(u => (u.hierarchyLevel === 4 || u.role === 'finances') && u.active !== false).length;

  return (
    <div className="p-8 space-y-8">
      {/* Resum de Cobertura Jeràrquica */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <Users size={14} className="text-brand-primary" /> Total Treballadors
          </p>
          <p className="text-2xl font-black text-white">{activeUsersCount} <span className="text-xs text-slate-500 font-normal">actius</span></p>
        </div>

        <div className="p-5 rounded-2xl bg-amber-500/[0.03] border border-amber-500/20 space-y-2">
          <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
            <ShieldCheck size={14} /> Nivell 2 · Coordinació
          </p>
          <p className="text-2xl font-black text-white">{coordinatorsCount} <span className="text-xs text-slate-500 font-normal">coordinadors</span></p>
        </div>

        <div className="p-5 rounded-2xl bg-orange-500/[0.03] border border-orange-500/20 space-y-2">
          <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest flex items-center gap-2">
            <ShieldCheck size={14} /> Nivell 3 · Direcció Àrea
          </p>
          <p className="text-2xl font-black text-white">{directorsCount} <span className="text-xs text-slate-500 font-normal">directors</span></p>
        </div>

        <div className="p-5 rounded-2xl bg-purple-500/[0.03] border border-purple-500/20 space-y-2">
          <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest flex items-center gap-2">
            <ShieldCheck size={14} /> Nivell 4 · Finances
          </p>
          <p className="text-2xl font-black text-white">{financesCount} <span className="text-xs text-slate-500 font-normal">responsables</span></p>
        </div>
      </div>

      {/* Barra de controls i filtres */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative min-w-[200px] flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            <input 
              type="text" 
              placeholder="Cerca per nom o correu..." 
              className="input-field input-search w-full text-xs pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              className="input-field text-xs py-2"
            >
              <option value="all">Totes les Àrees ({areas.length})</option>
              {areas.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>

            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="input-field text-xs py-2"
            >
              <option value="all">Tots els Nivells ({hierarchyLevels.length})</option>
              {hierarchyLevels.map(l => (
                <option key={l.key || l.level} value={String(l.level)}>{l.code} - {l.label}</option>
              ))}
            </select>
          </div>
        </div>

        <button 
          onClick={() => { setSelectedUser(null); setIsModalOpen(true); }}
          className="btn-primary flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest py-3 px-5 shrink-0"
        >
          <Plus size={16} />
          <span>Nou Treballador/a</span>
        </button>
      </div>

      {/* Taula de Treballadors */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/[0.05]">
              <th className="pb-4">Treballador/a</th>
              <th className="pb-4">Dada 1: Àrea d'Adscripció</th>
              <th className="pb-4">Dada 2: Nivell Jeràrquic</th>
              <th className="pb-4">Àmbit d'Autorització al Circuit</th>
              <th className="pb-4 text-center">Estat</th>
              <th className="pb-4 text-right">Accions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.02]">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-xs text-slate-500 font-bold">
                  No s'han trobat treballadors amb els filtres seleccionats
                </td>
              </tr>
            ) : (
              filteredUsers.map(u => {
                const userLevel = u.hierarchyLevel || dynamicGetHierarchyRole(u.role).level;
                const roleConfig = dynamicGetHierarchyRole(userLevel);
                const areaName = dynamicGetAreaName(u.areaId);

                return (
                  <tr key={u.id} className="group hover:bg-white/[0.01] transition-colors">
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-xs font-bold text-brand-primary">
                          {(u.name || 'U').charAt(0)}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white group-hover:text-brand-primary transition-colors">{u.name}</div>
                          <div className="text-[10px] text-slate-500">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white/5 border border-white/5 text-slate-300">
                        <Building2 size={12} className="text-brand-primary" />
                        {areaName}
                      </span>
                    </td>
                    <td className="py-4">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wide border",
                        roleConfig.badgeColor
                      )}>
                        <span className="font-mono bg-white/10 px-1 py-0.5 rounded text-[9px]">{roleConfig.code}</span>
                        <span>{roleConfig.label}</span>
                      </span>
                    </td>
                    <td className="py-4 max-w-xs">
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-bold text-slate-300">
                          {roleConfig.scope === 'area' ? `Només ${areaName}` : 'Àmbit Global (Som Llar)'}
                        </p>
                        <p className="text-[9px] text-slate-500 line-clamp-1 italic">
                          {roleConfig.description}
                        </p>
                      </div>
                    </td>
                    <td className="py-4 text-center">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[9px] font-black tracking-widest uppercase",
                        u.active !== false ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
                      )}>
                        {u.active !== false ? 'Actiu' : 'Inactiu'}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={async () => {
                            try {
                              toast.loading(`Enviant correu d'accés a ${u.email}...`, { id: `send-mail-${u.id}` });
                              await sendWelcomeEmail(u);
                              toast.success(`Correu d'accés enviat a ${u.email}!`, { id: `send-mail-${u.id}` });
                            } catch (err) {
                              console.error(err);
                              toast.error(`Error al enviar el correu`, { id: `send-mail-${u.id}` });
                            }
                          }}
                          className="p-2 hover:bg-emerald-500/10 rounded-lg text-slate-400 hover:text-emerald-400 transition-colors"
                          title="Reenviar correu de benvinguda amb enllaç d'accés"
                        >
                          <Mail size={14} />
                        </button>
                        <button 
                          onClick={() => { setSelectedUser(u); setIsModalOpen(true); }}
                          className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-brand-primary transition-colors"
                          title="Editar treballador/a"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => handleInitiateDelete(u)}
                          className="p-2 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                          title="Eliminar treballador/a"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Crear / Editar Treballador/a */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[#0f172a] border border-white/10 rounded-3xl w-full max-w-xl overflow-hidden animate-in zoom-in duration-300 shadow-2xl">
            <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-widest">
                  {selectedUser ? 'Editar Treballador/a' : 'Nou Treballador/a'}
                </h3>
                <p className="text-[10px] text-slate-500 mt-1">Configura per separat l'àrea d'adscripció i el nivell jeràrquic d'aprovació</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nom Complet</label>
                  <input 
                    name="name" 
                    defaultValue={selectedUser?.name} 
                    required 
                    className="input-field text-xs" 
                    placeholder="Ex: Marta Soler Vidal" 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Correu Electrònic Corporatiu</label>
                  <input 
                    name="email" 
                    type="email" 
                    defaultValue={selectedUser?.email} 
                    required 
                    className="input-field text-xs" 
                    placeholder="msoler@somllar.cat" 
                  />
                </div>
              </div>

              {/* DUES DADES INDEPENDENTS */}
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-5">
                <div className="flex items-center gap-2 text-[10px] font-black text-brand-primary uppercase tracking-widest">
                  <ShieldCheck size={14} />
                  <span>Assignació Operativa i Jeràrquica</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Dada 1: Àrea d'Adscripció */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Building2 size={12} className="text-brand-primary" />
                      1. Àrea d'Adscripció
                    </label>
                    <select 
                      name="areaId" 
                      value={formAreaId} 
                      onChange={(e) => setFormAreaId(e.target.value)}
                      className="input-field text-xs"
                    >
                      {areas.map(area => (
                        <option key={area.id} value={area.id}>
                          {area.name} {area.active === false ? '(Inactiva)' : ''}
                        </option>
                      ))}
                    </select>
                    <p className="text-[9px] text-slate-500 italic">Departament al qual pertany el treballador/a</p>
                  </div>

                  {/* Dada 2: Nivell Jeràrquic */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <ShieldCheck size={12} className="text-amber-400" />
                      2. Nivell Jeràrquic
                    </label>
                    <select 
                      name="hierarchyLevel" 
                      value={formLevel}
                      onChange={(e) => setFormLevel(Number(e.target.value) as HierarchyLevel)}
                      className="input-field text-xs font-bold"
                    >
                      {hierarchyLevels.map(l => (
                        <option key={l.key || l.level} value={l.level}>
                          {l.code} - {l.label} {l.active === false ? '(Inactiu)' : ''}
                        </option>
                      ))}
                    </select>
                    <p className="text-[9px] text-slate-500 italic">Funció i potestat en el circuit de compres</p>
                  </div>
                </div>
              </div>

              {/* Previsualització en temps real del circuit resultant */}
              {(() => {
                const config = dynamicGetHierarchyRole(formLevel);
                const selectedAreaName = dynamicGetAreaName(formAreaId);
                return (
                  <div className="p-4 rounded-2xl bg-brand-primary/[0.04] border border-brand-primary/20 space-y-2.5 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-brand-primary uppercase tracking-widest flex items-center gap-1.5">
                        <Info size={13} /> Circuit resultant: {config.code} · {config.label}
                      </span>
                      <span className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded border", config.badgeColor)}>
                        {config.code}
                      </span>
                    </div>

                    <div className="text-xs text-slate-300 leading-relaxed font-medium space-y-1.5">
                      <p className="text-[11px] text-slate-400">
                        <strong className="text-white">Departament:</strong> <span className="text-brand-primary font-bold">{selectedAreaName}</span> · <strong className="text-white">Àmbit de Signatura:</strong> {config.scope === 'area' ? `Exclusivament l'àrea ${selectedAreaName}` : 'Global de Som Llar'}
                      </p>
                      
                      <div className="p-3 bg-black/40 rounded-xl border border-white/5 text-[11px] text-slate-300">
                        {formLevel === 1 && (
                          <span>
                            Com a <strong>Sol·licitant (N1)</strong> de <strong>{selectedAreaName}</strong>, generarà sol·licituds vinculades a aquesta àrea. El primer que haurà d'aprovar-les serà el <strong>Coordinador/a (N2)</strong> de <strong>{selectedAreaName}</strong>.
                          </span>
                        )}
                        {formLevel === 2 && (
                          <span>
                            Com a <strong>Coordinació (N2)</strong> de <strong>{selectedAreaName}</strong>, serà el <strong>1r aprovador</strong> de totes les demandes fetes pels sol·licitants (N1) exclusivament de <strong>{selectedAreaName}</strong>. No rebrà sol·licituds d'altres àrees.
                          </span>
                        )}
                        {formLevel === 3 && (
                          <span>
                            Com a <strong>Direcció (N3)</strong> de <strong>{selectedAreaName}</strong>, serà el <strong>2n aprovador</strong> de les despeses de <strong>{selectedAreaName}</strong> un cop validades pel seu coordinador/a.
                          </span>
                        )}
                        {formLevel === 4 && (
                          <span>
                            Com a <strong>Direcció ADM i Finances (N4)</strong>, revisarà i aprovarà les compres autoritzades per les direccions d'àrea, amb control fiscal i pressupostari global.
                          </span>
                        )}
                        {formLevel === 5 && (
                          <span>
                            Com a <strong>Administració de Compres / Facturació (N5)</strong>, tramitarà les comandes formals i la conformitat de factures per a tota la fundació.
                          </span>
                        )}
                        {formLevel === 6 && (
                          <span>
                            Com a <strong>Gerència (N6)</strong>, disposa de supervisió executiva institucional sobre tots els expedients de la fundació.
                          </span>
                        )}
                        {formLevel === 99 && (
                          <span>
                            Com a <strong>Superadministrador</strong>, té accés de configuració total al sistema.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="pt-2 flex flex-col sm:flex-row gap-4 border-t border-white/5">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    name="active" 
                    defaultChecked={selectedUser ? selectedUser.active !== false : true}
                    className="w-4 h-4 rounded border-white/10 bg-white/5 text-brand-primary focus:ring-0" 
                  />
                  <span className="text-xs text-slate-300 font-bold">Compte Actiu</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    name="notificationsEnabled" 
                    defaultChecked={selectedUser ? selectedUser.notificationsEnabled !== false : true}
                    className="w-4 h-4 rounded border-white/10 bg-white/5 text-brand-primary focus:ring-0" 
                  />
                  <span className="text-xs text-slate-300 font-bold">Rebre Notificacions per Correu</span>
                </label>
              </div>

              {!selectedUser ? (
                <div className="p-4 rounded-2xl bg-emerald-500/[0.08] border border-emerald-500/20 space-y-1.5">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      name="sendWelcomeEmail" 
                      defaultChecked 
                      className="w-4 h-4 rounded border-emerald-500/30 bg-white/5 text-brand-primary focus:ring-0" 
                    />
                    <span className="text-xs text-white font-bold flex items-center gap-1.5">
                      <Mail size={14} className="text-brand-primary" />
                      Enviar correu de benvinguda amb l'enllaç d'accés a la plataforma
                    </span>
                  </label>
                  <p className="text-[10px] text-slate-400 pl-7 leading-relaxed">
                    El treballador rebrà una notificació automàtica per correu electrònic amb la seva àrea, rol assignat i un botó directe per accedir a la plataforma amb el seu compte de Microsoft (@somllar.cat).
                  </p>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Mail size={13} className="text-brand-primary" /> Correu d'Accés
                    </p>
                    <p className="text-[10px] text-slate-400">Reenviar les dades i el botó d'accés a {selectedUser.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        toast.loading(`Enviant correu a ${selectedUser.email}...`, { id: `send-welcome-${selectedUser.id}` });
                        await sendWelcomeEmail(selectedUser);
                        toast.success(`Correu d'accés enviat a ${selectedUser.email}!`, { id: `send-welcome-${selectedUser.id}` });
                      } catch (err) {
                        console.error(err);
                        toast.error("Error al enviar el correu", { id: `send-welcome-${selectedUser.id}` });
                      }
                    }}
                    className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
                  >
                    <Mail size={12} />
                    Enviar correu ara
                  </button>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                {selectedUser && (
                  <button 
                    type="button" 
                    onClick={() => handleInitiateDelete(selectedUser)}
                    className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all"
                    title="Eliminar aquest treballador/a"
                  >
                    <Trash2 size={14} />
                    <span>Eliminar</span>
                  </button>
                )}
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary flex-1 py-3 text-xs font-black uppercase tracking-widest"
                >
                  Cancel·lar
                </button>
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="btn-primary flex-1 py-3 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-brand-primary/20"
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  <span>{selectedUser ? 'Guardar Canvis' : 'Crear Treballador/a'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmació d'Eliminació */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[#0f172a] border border-red-500/20 rounded-3xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-300 shadow-2xl">
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-red-500/[0.05]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-widest">
                    Eliminar Treballador/a
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Confirmació d'acció destructiva sobre el compte
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setUserToDelete(null)} 
                disabled={isDeleting}
                className="text-slate-500 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Fitxa resum del treballador */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-sm font-bold text-brand-primary shrink-0">
                  {(userToDelete.name || 'U').charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-white truncate">{userToDelete.name}</h4>
                  <p className="text-xs text-slate-400 truncate">{userToDelete.email}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold bg-white/5 text-slate-300">
                      <Building2 size={10} className="text-brand-primary" />
                      {dynamicGetAreaName(userToDelete.areaId)}
                    </span>
                    <span className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold border",
                      dynamicGetHierarchyRole(userToDelete.hierarchyLevel || userToDelete.role).badgeColor
                    )}>
                      {dynamicGetHierarchyRole(userToDelete.hierarchyLevel || userToDelete.role).code} · {dynamicGetHierarchyRole(userToDelete.hierarchyLevel || userToDelete.role).label}
                    </span>
                  </div>
                </div>
              </div>

              {/* Cas de Sol·licituds Vinculades */}
              {linkedRequests.length > 0 ? (
                <div className="p-4 rounded-2xl bg-amber-500/[0.08] border border-amber-500/20 space-y-3">
                  <div className="flex items-start gap-3">
                    <AlertCircle size={18} className="text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-amber-200">
                        Aquest treballador té {linkedRequests.length} {linkedRequests.length === 1 ? 'sol·licitud de compra vinculada' : 'sol·licituds de compra vinculades'}
                      </p>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        Si elimines el registre definitivament de la base de dades, es podria perdre la referència de l'autor en els informes històrics d'aquestes compres.
                      </p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-amber-500/20 text-[11px] text-slate-300 leading-relaxed">
                    Et recomanem <strong>desactivar el compte</strong> en lloc d'eliminar-lo: el treballador no podrà accedir ni crear sol·licituds noves, però es mantindrà l'historial intacte.
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Estàs a punt d'eliminar de forma permanent el registre de <strong>{userToDelete.name}</strong> ({userToDelete.email}).
                  </p>
                  <p className="text-[11px] text-red-400 font-bold">
                    Aquesta acció no es pot desfer i s'eliminaran els seus permisos i dades d'adscripció.
                  </p>
                </div>
              )}

              {/* Accions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setUserToDelete(null)}
                  disabled={isDeleting}
                  className="btn-secondary flex-1 py-3 text-xs font-black uppercase tracking-widest order-3 sm:order-1"
                >
                  Cancel·lar
                </button>

                {linkedRequests.length > 0 && userToDelete.active !== false && (
                  <button
                    type="button"
                    onClick={handleDeactivateInstead}
                    disabled={isDeleting}
                    className="flex-1 py-3 px-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all order-2"
                  >
                    {isDeleting ? <Loader2 size={15} className="animate-spin" /> : <UserX size={15} />}
                    <span>Desactivar Compte</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="flex-1 py-3 px-4 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-red-500/20 transition-all order-1 sm:order-3"
                >
                  {isDeleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                  <span>Eliminar Definitivament</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AreasManager() {
  const { areas, loading, addArea, updateArea, deleteArea } = useAreas();
  const { users } = useUsers();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedArea, setSelectedArea] = useState<AreaItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAreas = areas.filter(a =>
    (a.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeAreasCount = areas.filter(a => a.active !== false).length;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    const name = (formData.get('name') as string).trim();
    const code = (formData.get('code') as string).trim();
    const description = (formData.get('description') as string).trim();
    const active = formData.get('active') === 'on';

    try {
      if (selectedArea) {
        await updateArea(selectedArea.id, { name, code, description, active });
        toast.success("Àrea actualitzada correctament");
      } else {
        const customId = (formData.get('id') as string)?.trim();
        await addArea({ id: customId || undefined, name, code, description, active });
        toast.success("Àrea creada correctament");
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Error al desar l'àrea");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (area: AreaItem) => {
    const assignedUsers = users.filter(u => normalizeAreaId(u.areaId) === normalizeAreaId(area.id));
    if (assignedUsers.length > 0) {
      const confirmed = confirm(
        `Atenció: Hi ha ${assignedUsers.length} treballador(s) adscrits a l'àrea "${area.name}". Si l'elimines, quedaran sense departament. Vols continuar i eliminar-la?`
      );
      if (!confirmed) return;
    } else {
      if (!confirm(`Estàs segur que vols eliminar l'àrea "${area.name}"?`)) return;
    }

    try {
      await deleteArea(area.id);
      toast.success("Àrea eliminada correctament");
    } catch (err) {
      console.error(err);
      toast.error("Error en eliminar l'àrea");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-4">
        <Loader2 className="animate-spin text-brand-primary" size={40} />
        <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Carregant àrees de treball...</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Resum d'Àrees */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <Building2 size={14} className="text-brand-primary" /> Total Àrees Corporatives
          </p>
          <p className="text-2xl font-black text-white">{areas.length} <span className="text-xs text-slate-500 font-normal">registrades</span></p>
        </div>

        <div className="p-5 rounded-2xl bg-emerald-500/[0.03] border border-emerald-500/20 space-y-2">
          <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">
            <CheckCircle size={14} /> Àrees Operatives
          </p>
          <p className="text-2xl font-black text-white">{activeAreasCount} <span className="text-xs text-slate-500 font-normal">actives</span></p>
        </div>

        <div className="p-5 rounded-2xl bg-brand-primary/[0.03] border border-brand-primary/20 space-y-2">
          <p className="text-[10px] font-black text-brand-primary uppercase tracking-widest flex items-center gap-2">
            <Users size={14} /> Total Treballadors Adscrits
          </p>
          <p className="text-2xl font-black text-white">{users.filter(u => u.active !== false).length} <span className="text-xs text-slate-500 font-normal">en plantilla</span></p>
        </div>
      </div>

      {/* Barra de controls */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative min-w-[240px] flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
          <input 
            type="text" 
            placeholder="Cerca per nom, codi o descripció..." 
            className="input-field input-search w-full text-xs pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <button 
          onClick={() => { setSelectedArea(null); setIsModalOpen(true); }}
          className="btn-primary flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest py-3 px-5 shrink-0"
        >
          <Plus size={16} />
          <span>Nova Àrea de Treball</span>
        </button>
      </div>

      {/* Taula d'Àrees */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/[0.05]">
              <th className="pb-4">Nom de l'Àrea</th>
              <th className="pb-4">Identificador / Codi</th>
              <th className="pb-4">Descripció Operativa</th>
              <th className="pb-4 text-center">Treballadors</th>
              <th className="pb-4 text-center">Estat</th>
              <th className="pb-4 text-right">Accions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.02]">
            {filteredAreas.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-xs text-slate-500 font-bold">
                  No s'han trobat àrees de treball
                </td>
              </tr>
            ) : (
              filteredAreas.map(area => {
                const assignedUsers = users.filter(u => normalizeAreaId(u.areaId) === normalizeAreaId(area.id));

                return (
                  <tr key={area.id} className="group hover:bg-white/[0.01] transition-colors">
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-brand-primary/10 rounded-xl text-brand-primary">
                          <Building2 size={16} />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white group-hover:text-brand-primary transition-colors">
                            {area.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4">
                      <span className="font-mono text-[10px] font-bold px-2 py-1 rounded bg-white/5 border border-white/5 text-slate-300">
                        {area.id}
                      </span>
                    </td>
                    <td className="py-4 max-w-sm">
                      <p className="text-xs text-slate-400 line-clamp-1 italic">
                        {area.description || 'Sense descripció addicional'}
                      </p>
                    </td>
                    <td className="py-4 text-center">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                        <Users size={11} />
                        {assignedUsers.length}
                      </span>
                    </td>
                    <td className="py-4 text-center">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[9px] font-black tracking-widest uppercase",
                        area.active !== false ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
                      )}>
                        {area.active !== false ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => { setSelectedArea(area); setIsModalOpen(true); }}
                          className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-brand-primary transition-colors"
                          title="Editar àrea"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => handleDelete(area)}
                          className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                          title="Eliminar àrea"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Crear / Editar Àrea */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[#0f172a] border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-300 shadow-2xl">
            <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-widest">
                  {selectedArea ? 'Editar Àrea de Treball' : 'Nova Àrea de Treball'}
                </h3>
                <p className="text-[10px] text-slate-500 mt-1">Configura el departament corporatiu per a l'adscripció de compres i empleats</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Nom de l'Àrea <span className="text-red-500">*</span>
                </label>
                <input 
                  name="name" 
                  defaultValue={selectedArea?.name} 
                  required 
                  className="input-field text-xs" 
                  placeholder="Ex: Recursos Humans i Persones" 
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Identificador Únic (Slug)
                  </label>
                  <input 
                    name="id" 
                    defaultValue={selectedArea?.id} 
                    disabled={!!selectedArea}
                    className="input-field text-xs font-mono disabled:opacity-60" 
                    placeholder="Ex: rrhh (auto si és buit)" 
                  />
                  <p className="text-[9px] text-slate-500 italic">Identificador en minúscules intern</p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Codi Visual Curt
                  </label>
                  <input 
                    name="code" 
                    defaultValue={selectedArea?.code} 
                    className="input-field text-xs font-mono" 
                    placeholder="Ex: RRHH" 
                  />
                  <p className="text-[9px] text-slate-500 italic">Acrònim per a llistats i codis</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Descripció o Finalitat</label>
                <textarea 
                  name="description" 
                  defaultValue={selectedArea?.description} 
                  rows={3}
                  className="input-field text-xs" 
                  placeholder="Descriu l'abast i responsabilitats d'aquest departament a Som Llar..." 
                />
              </div>

              <div className="pt-2 flex items-center border-t border-white/5">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    name="active" 
                    defaultChecked={selectedArea ? selectedArea.active !== false : true}
                    className="w-4 h-4 rounded border-white/10 bg-white/5 text-brand-primary focus:ring-0" 
                  />
                  <span className="text-xs text-slate-300 font-bold">Àrea Activa al Sistema</span>
                </label>
              </div>

              <div className="flex gap-4 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary flex-1 py-3 text-xs font-black uppercase tracking-widest"
                >
                  Cancel·lar
                </button>
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="btn-primary flex-1 py-3 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-brand-primary/20"
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  <span>{selectedArea ? 'Guardar Canvis' : 'Crear Àrea'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function HierarchyLevelsManager() {
  const { hierarchyLevels, loading, addHierarchyLevel, updateHierarchyLevel, deleteHierarchyLevel, getHierarchyRole: dynamicGetHierarchyRole } = useHierarchyLevels();
  const { users } = useUsers();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<HierarchyRoleConfig | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Estats per al formulari amb previsualització interactiva
  const [modalCode, setModalCode] = useState('N1');
  const [modalLevel, setModalLevel] = useState<number>(1);
  const [modalScope, setModalScope] = useState<'area' | 'global'>('area');
  const [modalColor, setModalColor] = useState('bg-blue-500/10 text-blue-400 border-blue-500/20');

  const COLOR_OPTIONS = [
    { label: 'Blau (Tècnic)', value: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    { label: 'Ambre (Coordinació)', value: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    { label: 'Taronja (Direcció Àrea)', value: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
    { label: 'Purpra (Finances)', value: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
    { label: 'Cian (Compres / Operacions)', value: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
    { label: 'Teal (Comptabilitat)', value: 'bg-teal-500/10 text-teal-400 border-teal-500/20' },
    { label: 'Maragda (Gerència)', value: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    { label: 'Rosa (Superadmin)', value: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
    { label: 'Gris (General)', value: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
  ];

  useEffect(() => {
    if (selectedLevel) {
      setModalCode(selectedLevel.code || 'N1');
      setModalLevel(selectedLevel.level || 1);
      setModalScope(selectedLevel.scope || 'area');
      setModalColor(selectedLevel.badgeColor || COLOR_OPTIONS[0].value);
    } else {
      setModalCode('N');
      setModalLevel(1);
      setModalScope('area');
      setModalColor(COLOR_OPTIONS[0].value);
    }
  }, [selectedLevel, isModalOpen]);

  const filteredLevels = hierarchyLevels.filter(l =>
    (l.label || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (l.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (l.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    const code = (formData.get('code') as string).trim();
    const level = Number(formData.get('level')) || 1;
    const label = (formData.get('label') as string).trim();
    const shortLabel = (formData.get('shortLabel') as string).trim() || `${code} · ${label}`;
    const scope = (formData.get('scope') as 'area' | 'global') || 'area';
    const description = (formData.get('description') as string).trim();
    const badgeColor = modalColor;
    const active = formData.get('active') === 'on';

    try {
      if (selectedLevel) {
        const idOrKey = selectedLevel.id || selectedLevel.key;
        await updateHierarchyLevel(idOrKey, {
          code,
          level,
          label,
          shortLabel,
          scope,
          description,
          badgeColor,
          active
        });
        toast.success("Nivell jeràrquic actualitzat correctament");
      } else {
        const key = (formData.get('key') as string)?.trim() || label.toLowerCase().replace(/[^a-z0-9]/g, '_');
        await addHierarchyLevel({
          key,
          code,
          level,
          label,
          shortLabel,
          scope,
          description,
          badgeColor,
          active
        });
        toast.success("Nou nivell jeràrquic creat correctament");
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Error al desar el nivell jeràrquic");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (lvl: HierarchyRoleConfig) => {
    const assignedUsers = users.filter(u => (u.hierarchyLevel || dynamicGetHierarchyRole(u.role).level) === lvl.level);
    if (assignedUsers.length > 0) {
      const confirmed = confirm(
        `Atenció: Hi ha ${assignedUsers.length} treballador(s) amb el nivell "${lvl.label}" (${lvl.code}). Si l'elimines, caldrà reassignar el seu nivell jeràrquic. Segur que vols eliminar-lo?`
      );
      if (!confirmed) return;
    } else {
      if (!confirm(`Estàs segur que vols eliminar el nivell "${lvl.label}" (${lvl.code})?`)) return;
    }

    try {
      const idOrKey = lvl.id || lvl.key;
      await deleteHierarchyLevel(idOrKey);
      toast.success("Nivell jeràrquic eliminat correctament");
    } catch (err) {
      console.error(err);
      toast.error("Error en eliminar el nivell");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-4">
        <Loader2 className="animate-spin text-brand-primary" size={40} />
        <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Carregant nivells jeràrquics...</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Resum de Nivells */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <ShieldCheck size={14} className="text-brand-primary" /> Total Esglaons de Validació
          </p>
          <p className="text-2xl font-black text-white">{hierarchyLevels.length} <span className="text-xs text-slate-500 font-normal">nivells configurats</span></p>
        </div>

        <div className="p-5 rounded-2xl bg-amber-500/[0.03] border border-amber-500/20 space-y-2">
          <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-2">
            <Building2 size={14} /> Nivells d'Àrea (Departamental)
          </p>
          <p className="text-2xl font-black text-white">
            {hierarchyLevels.filter(l => l.scope === 'area').length} <span className="text-xs text-slate-500 font-normal">específics d'àrea</span>
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-purple-500/[0.03] border border-purple-500/20 space-y-2">
          <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest flex items-center gap-2">
            <ShieldCheck size={14} /> Nivells Globals (Fundació)
          </p>
          <p className="text-2xl font-black text-white">
            {hierarchyLevels.filter(l => l.scope === 'global').length} <span className="text-xs text-slate-500 font-normal">potestat institucional</span>
          </p>
        </div>
      </div>

      {/* Barra de controls */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative min-w-[240px] flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
          <input 
            type="text" 
            placeholder="Cerca per títol, codi o descripció..." 
            className="input-field input-search w-full text-xs pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <button 
          onClick={() => { setSelectedLevel(null); setIsModalOpen(true); }}
          className="btn-primary flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest py-3 px-5 shrink-0"
        >
          <Plus size={16} />
          <span>Nou Nivell de Jerarquia</span>
        </button>
      </div>

      {/* Taula de Nivells */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/[0.05]">
              <th className="pb-4">Codi i Insígnia</th>
              <th className="pb-4">Càrrec / Títol del Nivell</th>
              <th className="pb-4 text-center">Esglaó (Nivell)</th>
              <th className="pb-4">Àmbit de Signatura</th>
              <th className="pb-4">Potestat en el Circuit</th>
              <th className="pb-4 text-center">Treballadors</th>
              <th className="pb-4 text-right">Accions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.02]">
            {filteredLevels.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-xs text-slate-500 font-bold">
                  No s'han trobat nivells de jerarquia
                </td>
              </tr>
            ) : (
              filteredLevels.map(lvl => {
                const assignedUsers = users.filter(u => (u.hierarchyLevel || dynamicGetHierarchyRole(u.role).level) === lvl.level);

                return (
                  <tr key={lvl.key || lvl.id} className="group hover:bg-white/[0.01] transition-colors">
                    <td className="py-4">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black tracking-wide border",
                        lvl.badgeColor
                      )}>
                        <span className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[10px]">{lvl.code}</span>
                        <span>{lvl.shortLabel}</span>
                      </span>
                    </td>
                    <td className="py-4">
                      <div className="text-xs font-bold text-white group-hover:text-brand-primary transition-colors">
                        {lvl.label}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500">{lvl.key}</div>
                    </td>
                    <td className="py-4 text-center">
                      <span className="font-mono text-xs font-black text-brand-primary bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
                        {lvl.level === 99 ? 'SUPER' : `Nivell ${lvl.level}`}
                      </span>
                    </td>
                    <td className="py-4">
                      <span className={cn(
                        "px-2.5 py-1 rounded-lg text-[10px] font-bold border",
                        lvl.scope === 'area' 
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/20" 
                          : "bg-purple-500/10 text-purple-400 border-purple-500/20"
                      )}>
                        {lvl.scope === 'area' ? "Només Àrea d'Adscripció" : "Global de Som Llar"}
                      </span>
                    </td>
                    <td className="py-4 max-w-xs">
                      <p className="text-xs text-slate-400 line-clamp-1 italic">
                        {lvl.description || 'Sense descripció definida'}
                      </p>
                    </td>
                    <td className="py-4 text-center">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                        <Users size={11} />
                        {assignedUsers.length}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => { setSelectedLevel(lvl); setIsModalOpen(true); }}
                          className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-brand-primary transition-colors"
                          title="Editar nivell jeràrquic"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => handleDelete(lvl)}
                          className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                          title="Eliminar nivell jeràrquic"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Crear / Editar Nivell Jeràrquic */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[#0f172a] border border-white/10 rounded-3xl w-full max-w-xl overflow-hidden animate-in zoom-in duration-300 shadow-2xl">
            <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-widest">
                  {selectedLevel ? 'Editar Nivell de Jerarquia' : 'Nou Nivell de Jerarquia'}
                </h3>
                <p className="text-[10px] text-slate-500 mt-1">Configura les competències de signatura, el nivell numèric i l'àmbit territorial o global</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Codi Jeràrquic <span className="text-red-500">*</span>
                  </label>
                  <input 
                    name="code" 
                    value={modalCode}
                    onChange={(e) => setModalCode(e.target.value)}
                    required 
                    className="input-field text-xs font-mono font-bold" 
                    placeholder="Ex: N1, N2, N2.5, N7, SUPER" 
                  />
                  <p className="text-[9px] text-slate-500 italic">Identificador curt que es veurà a les xapes</p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Nivell Numèric de Validació <span className="text-red-500">*</span>
                  </label>
                  <input 
                    name="level" 
                    type="number"
                    value={modalLevel}
                    onChange={(e) => setModalLevel(Number(e.target.value))}
                    required 
                    min={1}
                    max={99}
                    className="input-field text-xs font-mono font-bold" 
                    placeholder="1 (Tècnic), 2 (Coord), 3 (Dir), 4 (Finances)..." 
                  />
                  <p className="text-[9px] text-slate-500 italic">Determina l'ordre al flux (99 per a Superadmin)</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Títol / Nom del Càrrec <span className="text-red-500">*</span>
                  </label>
                  <input 
                    name="label" 
                    defaultValue={selectedLevel?.label} 
                    required 
                    className="input-field text-xs" 
                    placeholder="Ex: Coordinació d'Àrea" 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Etiqueta Resumida
                  </label>
                  <input 
                    name="shortLabel" 
                    defaultValue={selectedLevel?.shortLabel} 
                    className="input-field text-xs" 
                    placeholder="Ex: N2 · Coordinació" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Identificador Clau (Key)
                  </label>
                  <input 
                    name="key" 
                    defaultValue={selectedLevel?.key} 
                    disabled={!!selectedLevel}
                    className="input-field text-xs font-mono disabled:opacity-60" 
                    placeholder="Ex: coordinacio (auto si és buit)" 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Àmbit de Signatura <span className="text-red-500">*</span>
                  </label>
                  <select 
                    name="scope" 
                    value={modalScope}
                    onChange={(e) => setModalScope(e.target.value as any)}
                    className="input-field text-xs"
                  >
                    <option value="area">Àrea d'adscripció (només la seva mateixa àrea)</option>
                    <option value="global">Global de Som Llar (tota la fundació)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Paleta de Color de la Insígnia</label>
                <div className="grid grid-cols-3 gap-2">
                  {COLOR_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setModalColor(opt.value)}
                      className={cn(
                        "p-2.5 rounded-xl text-left text-[10px] font-bold border transition-all flex items-center justify-between",
                        modalColor === opt.value ? "border-brand-primary ring-1 ring-brand-primary" : "border-white/5 hover:border-white/20",
                        opt.value
                      )}
                    >
                      <span className="truncate">{opt.label}</span>
                      {modalColor === opt.value && <CheckCircle size={12} />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Descripció del Rol i Potestats</label>
                <textarea 
                  name="description" 
                  defaultValue={selectedLevel?.description} 
                  rows={2}
                  className="input-field text-xs" 
                  placeholder="Ex: 1r Nivell d'aprovació: vàlida tècnicament les compres exclusivament de la seva mateixa àrea." 
                />
              </div>

              {/* Previsualització en viu */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Previsualització d'insígnia</p>
                <div className="flex items-center gap-3">
                  <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black tracking-wide border", modalColor)}>
                    <span className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[10px]">{modalCode || 'N'}</span>
                    <span>{modalCode} · Nivell {modalLevel}</span>
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {modalScope === 'area' ? "🔒 Limitat a sol·licituds de la seva àrea" : "🌐 Vàlid per a tota la fundació"}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex items-center border-t border-white/5">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    name="active" 
                    defaultChecked={selectedLevel ? selectedLevel.active !== false : true}
                    className="w-4 h-4 rounded border-white/10 bg-white/5 text-brand-primary focus:ring-0" 
                  />
                  <span className="text-xs text-slate-300 font-bold">Nivell Jeràrquic Actiu</span>
                </label>
              </div>

              <div className="flex gap-4 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary flex-1 py-3 text-xs font-black uppercase tracking-widest"
                >
                  Cancel·lar
                </button>
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="btn-primary flex-1 py-3 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-brand-primary/20"
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  <span>{selectedLevel ? 'Guardar Canvis' : 'Crear Nivell'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function FlowsManager() {
  const steps = [
    { id: 1, name: 'Sol·licitant', role: 'tecnic', action: 'Genera Demanda', required: true },
    { id: 2, name: 'Coordinació', role: 'coordinacio', action: 'Primera Aprovació', required: true },
    { id: 3, name: 'Direcció d\'Àrea', role: 'direccio_area', action: 'Validació Pressupostària', required: true },
    { id: 4, name: 'Administració i Finances', role: 'finances', action: 'Tramitació i Autorització', required: true },
    { id: 5, name: 'Recepció', role: 'recepcio_verificacio', action: 'Verificació i Albarà', required: false },
    { id: 6, name: 'Comptabilitat', role: 'comptabilitat', action: 'Validació Factura', required: true },
  ];

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Configuració del Flux d'Aprovació Estàndard</h3>
        <button onClick={() => toast("Flux restablert als valors per defecte", { icon: '🔄' })} className="btn-secondary text-[10px] font-black uppercase tracking-widest py-2">
          Restablir Flux
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {steps.map((step, idx) => (
          <div key={step.id} className="p-6 bg-white/[0.01] border border-white/5 rounded-2xl relative">
            <div className="absolute top-4 right-4 text-[40px] font-black text-white/5 pointer-events-none">{step.id}</div>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-primary/10 rounded-xl text-brand-primary">
                  <CheckCircle size={16} />
                </div>
                <p className="text-xs font-black text-white uppercase tracking-widest">{step.name}</p>
              </div>
              <p className="text-[10px] text-slate-500 font-medium">{step.action}</p>
              <div className="pt-4 flex items-center justify-between border-t border-white/[0.02]">
                <span className={cn(
                  "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded",
                  step.required ? "bg-emerald-500/10 text-emerald-500" : "bg-white/5 text-slate-500"
                )}>
                  {step.required ? 'Obligatori' : 'Opcional'}
                </span>
                <button onClick={() => toast("Configuració de passos en desenvolupament", { icon: '⚙️' })} className="text-[10px] font-bold text-brand-primary hover:underline">Configurar</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NotificationsManager() {
  const { settings, loading, updateSetting, initializeSettings } = useNotificationSettings();
  const { hierarchyLevels } = useHierarchyLevels();
  const events = NOTIFICATION_EVENTS;
  const roles = hierarchyLevels.map(h => [h.key, h.name] as [string, string]);

  const missingEvents = events.filter(e => !settings.some(s => s.eventKey === e.id));

  const toggleRole = (setting: any, role: string) => {
    const roles = setting.recipientRoles || [];
    const newRoles = roles.includes(role as any) 
      ? roles.filter((r: any) => r !== role)
      : [...roles, role as any];
    updateSetting(setting.id, { recipientRoles: newRoles });
  };

  const addEmail = (setting: any, email: string) => {
    if (!email || !email.includes('@')) return;
    const emails = setting.recipientEmails || [];
    if (emails.includes(email)) return;
    updateSetting(setting.id, { recipientEmails: [...emails, email] });
  };

  const removeEmail = (setting: any, email: string) => {
    const emails = setting.recipientEmails || [];
    updateSetting(setting.id, { recipientEmails: emails.filter((e: any) => e !== email) });
  };

  const handleInitialize = async () => {
    toast.promise(initializeSettings(events), {
      loading: 'Inicialitzant notificacions...',
      success: 'Configuració creada correctament!',
      error: 'Error al crear la configuració'
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-4">
        <Loader2 className="animate-spin text-brand-primary" size={32} />
        <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest">Carregant configuració...</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Flux de Notificacions Automàtiques</h3>
          <p className="text-xs text-slate-600 font-medium text-balance">Configura quins rols o correus rebran alertes per a cada esdeveniment.</p>
        </div>
        {missingEvents.length > 0 && (
          <button onClick={handleInitialize} className="btn-primary text-[10px] py-2 px-4 flex items-center gap-2">
            <BellPlus size={14} />
            Inicialitzar {missingEvents.length} esdeveniments
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-8">
        {events.map(event => {
          const setting = settings.find(s => s.eventKey === event.id);
          if (!setting) return null;

          return (
            <div key={event.id} className="card p-8 bg-white/[0.01] border-white/5 space-y-8 group hover:border-brand-primary/20 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "p-3 rounded-2xl transition-all",
                    setting.enabled ? "bg-brand-primary/10 text-brand-primary" : "bg-white/5 text-slate-600"
                  )}>
                    <Bell size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white uppercase tracking-tight">{event.name}</h4>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Esdeveniment: {event.id}</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={setting.enabled} 
                    onChange={(e) => updateSetting(setting.id, { enabled: e.target.checked })} 
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary peer-checked:after:bg-white"></div>
                </label>
              </div>

              {setting.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-6 border-t border-white/5 animate-in fade-in duration-500">
                  <div className="space-y-4">
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em]">Rols receptors</p>
                    <div className="flex flex-wrap gap-2">
                      {roles.map(([key, label]) => (
                        <button
                          key={key}
                          onClick={() => toggleRole(setting, key)}
                          className={cn(
                            "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border",
                            setting.recipientRoles?.includes(key as any)
                              ? "bg-brand-primary/10 border-brand-primary text-brand-primary"
                              : "bg-white/5 border-transparent text-slate-500 hover:border-white/10"
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em]">Correus addicionals</p>
                    <div className="space-y-3">
                      <input 
                        type="email" 
                        placeholder="Afegeix correu i prem Enter" 
                        className="input-field text-xs py-2 w-full"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            addEmail(setting, e.currentTarget.value);
                            e.currentTarget.value = '';
                          }
                        }}
                      />
                      <div className="flex flex-wrap gap-2">
                        {setting.recipientEmails?.map(email => (
                          <div key={email} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-xl border border-white/5">
                            <span className="text-[10px] font-medium text-slate-400">{email}</span>
                            <button onClick={() => removeEmail(setting, email)} className="text-slate-600 hover:text-red-500 transition-colors">
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ImportsManager() {
  const { addUser } = useUsers();
  const { addSupplier } = useSuppliers();
  const { addCenter } = useCenters();
  const { addAnalyticCode } = useAnalyticCodes();
  const { getAreaName } = useAreas();
  const { getHierarchyRole } = useHierarchyLevels();
  const [isImporting, setIsImporting] = useState(false);

  const entities = [
    { id: 'supplier', name: 'Proveïdors', icon: <Users size={18} /> },
    { id: 'user', name: 'Usuaris', icon: <Users size={18} /> },
    { id: 'center', name: 'Centres de Destí', icon: <ShieldCheck size={18} /> },
    { id: 'analyticCode', name: 'Codis Analítics', icon: <ShieldCheck size={18} /> },
  ];

  const handleDownloadTemplate = (id: string) => {
    importExportService.downloadTemplate(id);
  };

  const handleImport = async (entityId: string, file: File) => {
    setIsImporting(true);
    const loadingToast = toast.loading(`Processant importació de ${entityId}...`);

    try {
      const rawData = await importExportService.processFile(file);
      
      // Filtrem les files que no són dades reals (exemple i instruccions)
      // Normalment l'exemple té dades conegudes o podem filtrar si alguna columna clau conté "Exemple"
      const dataRows = rawData.filter((row: any) => {
        const rowValues = Object.values(row).join(' ').toLowerCase();
        return !rowValues.includes('exemple') && !rowValues.includes('important: esborra');
      });

      if (dataRows.length === 0) {
        toast.error("No s'han trobat dades vàlides per importar (recorda esborrar la fila d'exemple).", { id: loadingToast });
        return;
      }

      let successCount = 0;

      for (const row of dataRows) {
        try {
          if (entityId === 'user') {
            const rawRole = row['Rol Flux'] || 'tecnic';
            const roleCfg = getHierarchyRole(rawRole);
            const rawArea = normalizeAreaId(row['Àrea'] || 'social');
            await addUser({
              name: `${row['Nom'] || ''} ${row['Cognoms'] || ''}`.trim(),
              firstName: row['Nom'] || '',
              lastName: row['Cognoms'] || '',
              email: row['Email'] || '',
              areaId: rawArea,
              areaName: getAreaName(rawArea),
              role: roleCfg.key as any,
              hierarchyLevel: roleCfg.level as HierarchyLevel,
              active: (row['Actiu'] || 'Si').toLowerCase() === 'si',
              notificationsEnabled: (row['Notificacions'] || 'Si').toLowerCase() === 'si'
            });
          } else if (entityId === 'supplier') {
            const rawStatus = (row['Estat'] || '').toLowerCase();
            const validStatus = ['homologat', 'candidat', 'pendent_documentacio', 'en_revisio', 'bloquejat', 'baixa'].includes(rawStatus)
              ? rawStatus as any
              : (row['Homologat'] || 'Si').toLowerCase() === 'si' ? 'homologat' : 'candidat';

            await addSupplier({
              name: row['Nom'] || '',
              nif: row['NIF'] || '',
              category: row['Categoria'] || 'Serveis Generals',
              status: validStatus,
              rating: parseInt(row['Puntuació']) || 80,
              criticality: ['baixa', 'mitjana', 'alta'].includes((row['Criticitat'] || '').toLowerCase()) ? (row['Criticitat'] || '').toLowerCase() as any : 'mitjana',
              documents: []
            });
          } else if (entityId === 'center') {
            await addCenter({
              name: row['Nom'] || '',
              code: row['Codi'] || '',
              type: row['Tipus'] || '',
              address: row['Adreça'] || '',
              city: row['Ciutat'] || '',
              area: (row['Àrea'] || 'social').toLowerCase(),
              active: (row['Actiu'] || 'Si').toLowerCase() === 'si'
            });
          } else if (entityId === 'analyticCode') {
            await addAnalyticCode({
              code: row['Codi Analític'] || '',
              description: row['Descripció'] || '',
              projectId: row['Projecte'] || '',
              area: (row['Àrea'] || 'admin').toLowerCase(),
              active: (row['Actiu'] || 'Si').toLowerCase() === 'si'
            });
          }
          successCount++;
        } catch (err) {
          console.error(`Error a la fila:`, row, err);
        }
      }

      toast.success(`S'han importat ${successCount} registres de ${entityId} correctament.`, { id: loadingToast });
    } catch (err) {
      toast.error("Error processant el fitxer. Assegura't que és un CSV o Excel vàlid.", { id: loadingToast });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="p-8 space-y-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Importació Massiva i Plantilles</h3>
            <p className="text-xs text-slate-600 font-medium">Descarrega les plantilles, omple-les respectant la fila d'exemple, i <strong>guarda el fitxer resultant en format CSV (.csv)</strong> abans de pujar-lo per garantir una importació perfecta.</p>
          </div>

          <div className="space-y-3">
            {entities.map(entity => (
              <div key={entity.id} className="flex items-center justify-between p-4 bg-[#0b0f19] border border-white/5 rounded-2xl group hover:border-brand-primary/50 transition-all">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/5 rounded-xl text-slate-500 group-hover:text-brand-primary">
                    {entity.icon}
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest text-slate-300">{entity.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleDownloadTemplate(entity.id)}
                    className="p-2 text-slate-500 hover:text-brand-primary transition-colors flex items-center gap-2"
                    title="Descarrega Plantilla"
                    disabled={isImporting}
                  >
                    <Download size={16} />
                    <span className="text-[9px] font-black uppercase tracking-tighter">Plantilla</span>
                  </button>
                  <label className={cn(
                    "cursor-pointer p-2 bg-brand-primary/10 text-brand-primary hover:bg-brand-primary hover:text-white rounded-xl transition-all",
                    isImporting && "opacity-50 cursor-not-allowed"
                  )}>
                    <Upload size={16} />
                    <input 
                      type="file" 
                      className="hidden" 
                      accept=".csv,.xlsx,.xls"
                      disabled={isImporting}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImport(entity.id, file);
                        e.target.value = ''; // Reset input
                      }} 
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-8 bg-brand-primary/[0.02] border border-brand-primary/10 rounded-3xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-primary/10 rounded-xl text-brand-primary">
              <AlertCircle size={18} />
            </div>
            <h4 className="text-xs font-black text-white uppercase tracking-widest">Guia d'Importació</h4>
          </div>
          <ul className="space-y-4">
            <li className="flex gap-3 text-xs text-slate-400 leading-relaxed">
              <div className="shrink-0 w-5 h-5 bg-white/5 rounded-full flex items-center justify-center text-[10px] font-bold">1</div>
              <span>Descarrega la plantilla específica per a l'entitat que vols carregar.</span>
            </li>
            <li className="flex gap-3 text-xs text-slate-400 leading-relaxed">
              <div className="shrink-0 w-5 h-5 bg-white/5 rounded-full flex items-center justify-center text-[10px] font-bold">2</div>
              <span>Omple les files respectant les capçaleres i el format de cada columna.</span>
            </li>
            <li className="flex gap-3 text-xs text-slate-400 leading-relaxed">
              <div className="shrink-0 w-5 h-5 bg-white/5 rounded-full flex items-center justify-center text-[10px] font-bold">3</div>
              <span>Puja el fitxer. El sistema validarà l'estructura abans d'escriure a la base de dades.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function SuperManager() {
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
function ActivityLogViewer({ users }: { users: User[] }) {
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
