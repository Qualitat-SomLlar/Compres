import React, { useState, useEffect } from 'react';
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
  Info
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useUsers } from '../../hooks/useUsers';
import { useProjects } from '../../hooks/useProjects';
import toast from 'react-hot-toast';
import { cn } from '../../lib/utils';
import { ROLE_LABELS, ATTACHMENT_CATEGORIES, NOTIFICATION_EVENTS, AREAS, HIERARCHY_ROLES, getHierarchyRole, getAreaName, normalizeAreaId } from '../../constants';
import { HierarchyLevel } from '../../types';
import { importExportService } from '../../services/importExportService';
import { useNotificationSettings } from '../../hooks/useNotificationSettings';
import { useCenters } from '../../hooks/useCenters';
import { useAnalyticCodes } from '../../hooks/useAnalyticCodes';
import { useSuppliers } from '../../hooks/useSuppliers';

type AdminTab = 'users' | 'flows' | 'notifications' | 'imports' | 'super';

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<AdminTab>('users');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'users':
        return <UsersManager />;
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
          <p className="text-sm text-slate-500 font-medium max-w-xl">Gestiona el directori de treballadors/usuaris, el flux d'aprovació jeràrquic i la configuració global.</p>
        </div>
        
        <div className="flex items-center gap-2 p-1 bg-white/[0.02] border border-white/[0.05] rounded-2xl">
          <TabButton 
            active={activeTab === 'users'} 
            onClick={() => setActiveTab('users')} 
            icon={<Users size={16} />}
            label="Treballadors i Usuaris"
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
  const { users, loading, addUser, updateUser, deleteUser } = useUsers();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [areaFilter, setAreaFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  
  // Dues dades completament independents per al formulari
  const [formAreaId, setFormAreaId] = useState('tics');
  const [formLevel, setFormLevel] = useState<HierarchyLevel>(1);

  const DISTINCT_LEVELS: { level: HierarchyLevel; code: string; label: string; roleKey: string }[] = [
    { level: 1, code: 'N1', label: 'Tècnic/a Sol·licitant', roleKey: 'tecnic' },
    { level: 2, code: 'N2', label: 'Coordinació d\'Àrea (1r Nivell Aprovació)', roleKey: 'coordinacio' },
    { level: 3, code: 'N3', label: 'Direcció d\'Àrea (2n Nivell Aprovació)', roleKey: 'direccio_area' },
    { level: 4, code: 'N4', label: 'Direcció ADM i Finances (3r Nivell Global)', roleKey: 'finances' },
    { level: 5, code: 'N5', label: 'Administració de Compres / Facturació', roleKey: 'admin_compres' },
    { level: 6, code: 'N6', label: 'Gerència / Direcció General', roleKey: 'gerencia' },
    { level: 99, code: 'SUPER', label: 'Superadministrador', roleKey: 'superadmin' },
  ];

  useEffect(() => {
    if (selectedUser) {
      setFormAreaId(normalizeAreaId(selectedUser.areaId || 'tics'));
      const lvl = (selectedUser.hierarchyLevel || getHierarchyRole(selectedUser.role).level) as HierarchyLevel;
      setFormLevel(lvl || 1);
    } else {
      setFormAreaId('tics');
      setFormLevel(1);
    }
  }, [selectedUser, isModalOpen]);

  const filteredUsers = users.filter(u => {
    const matchSearch = (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (u.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const userNormArea = normalizeAreaId(u.areaId);
    const matchArea = areaFilter === 'all' || userNormArea === normalizeAreaId(areaFilter);
    const userLevel = u.hierarchyLevel || getHierarchyRole(u.role).level;
    const matchLevel = levelFilter === 'all' || String(userLevel) === String(levelFilter);
    return matchSearch && matchArea && matchLevel;
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    const selectedAreaId = normalizeAreaId(formData.get('areaId') as string);
    const selectedLevel = Number(formData.get('hierarchyLevel')) as HierarchyLevel;
    const matchedLevelConfig = DISTINCT_LEVELS.find(l => l.level === selectedLevel) || DISTINCT_LEVELS[0];

    const data = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      areaId: selectedAreaId,
      areaName: getAreaName(selectedAreaId),
      role: matchedLevelConfig.roleKey as any,
      hierarchyLevel: selectedLevel,
      active: formData.get('active') === 'on',
      notificationsEnabled: formData.get('notificationsEnabled') === 'on',
      firstName: (formData.get('name') as string).split(' ')[0],
      lastName: (formData.get('name') as string).split(' ').slice(1).join(' ')
    };

    try {
      if (selectedUser) {
        await updateUser(selectedUser.id, data);
        toast.success("Treballador/a actualitzat correctament");
      } else {
        await addUser(data);
        toast.success("Treballador/a creat correctament");
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Error al desar les dades");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
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
              <option value="all">Totes les Àrees</option>
              {AREAS.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>

            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="input-field text-xs py-2"
            >
              <option value="all">Tots els Nivells Jeràrquics</option>
              {DISTINCT_LEVELS.map(l => (
                <option key={l.level} value={String(l.level)}>{l.code} - {l.label}</option>
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
                const userLevel = u.hierarchyLevel || getHierarchyRole(u.role).level;
                const roleConfig = getHierarchyRole(userLevel);
                const areaName = getAreaName(u.areaId);

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
                          onClick={() => { setSelectedUser(u); setIsModalOpen(true); }}
                          className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-brand-primary transition-colors"
                          title="Editar treballador/a"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={async () => {
                            if (confirm(`Estàs segur que vols eliminar el registre de ${u.name}?`)) {
                              await deleteUser(u.id);
                              toast.success("Treballador/a eliminat correctament");
                            }
                          }}
                          className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
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
                      {AREAS.map(area => (
                        <option key={area.id} value={area.id}>{area.name}</option>
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
                      {DISTINCT_LEVELS.map(l => (
                        <option key={l.level} value={l.level}>{l.code} - {l.label}</option>
                      ))}
                    </select>
                    <p className="text-[9px] text-slate-500 italic">Funció i potestat en el circuit de compres</p>
                  </div>
                </div>
              </div>

              {/* Previsualització en temps real del circuit resultant */}
              {(() => {
                const config = getHierarchyRole(formLevel);
                const selectedAreaName = getAreaName(formAreaId);
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
                            Com a <strong>Tècnic/a (N1)</strong> de <strong>{selectedAreaName}</strong>, generarà sol·licituds vinculades a aquesta àrea. El primer que haurà d'aprovar-les serà el <strong>Coordinador/a (N2)</strong> de <strong>{selectedAreaName}</strong>.
                          </span>
                        )}
                        {formLevel === 2 && (
                          <span>
                            Com a <strong>Coordinació (N2)</strong> de <strong>{selectedAreaName}</strong>, serà el <strong>1r aprovador</strong> de totes les demandes fetes pels tècnics (N1) exclusivament de <strong>{selectedAreaName}</strong>. No rebrà sol·licituds d'altres àrees.
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
                  <span>{selectedUser ? 'Guardar Canvis' : 'Crear Treballador/a'}</span>
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
    { id: 1, name: 'Tècnic/a', role: 'tecnic', action: 'Genera Demanda', required: true },
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
  const events = NOTIFICATION_EVENTS;
  const roles = Object.entries(ROLE_LABELS);

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
  const { users, updateUser } = useUsers();
  const { projects, addProject, updateProject, deleteProject } = useProjects();
  const { centers, addCenter, updateCenter, deleteCenter } = useCenters();
  const { analyticCodes, addAnalyticCode, updateAnalyticCode, deleteAnalyticCode } = useAnalyticCodes();
  const { suppliers, addSupplier, updateSupplier, deleteSupplier } = useSuppliers();

  const [editingEntity, setEditingEntity] = useState<{type: string, id?: string, data: any} | null>(null);

  const handleRoleChange = async (userId: string, newRole: any) => {
    try {
      await updateUser(userId, { role: newRole });
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
      
      toast.success(`${type} desat correctament`);
      setEditingEntity(null);
    } catch (err) {
      toast.error("Error al desar");
    }
  };

  return (
    <div className="p-8 space-y-12">
      <div className="flex items-center gap-4 p-6 bg-red-500/10 border border-red-500/20 rounded-3xl">
        <div className="p-3 bg-red-500 rounded-2xl text-white">
          <ShieldCheck size={24} />
        </div>
        <div>
          <h3 className="text-lg font-black text-white uppercase tracking-tight">Zona de Superusuari</h3>
          <p className="text-xs text-red-200/60 font-medium">Accés total a la configuració crítica del sistema i permisos d'usuaris.</p>
        </div>
      </div>

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
