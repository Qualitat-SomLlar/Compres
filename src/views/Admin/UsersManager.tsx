import React, { useState, useEffect, useMemo } from 'react';
import { Users, Search, Plus, Edit2, Trash2, AlertCircle, AlertTriangle, UserX, X, Save, Loader2, ShieldCheck, Building2, Info, Mail } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useUsers } from '../../hooks/useUsers';
import { useAreas } from '../../hooks/useAreas';
import { useHierarchyLevels } from '../../hooks/useHierarchyLevels';
import { useRequests } from '../../hooks/useRequests';
import { activityService } from '../../services/activityService';
import toast from 'react-hot-toast';
import { cn } from '../../lib/utils';
import { normalizeAreaId } from '../../constants';
import { HierarchyLevel, User } from '../../types';

export function UsersManager() {
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
                            Com a <strong>Administració de Compres / Facturació (N5)</strong>, tramitarà les comandes formals i la conformitat de factures per a tot Som Llar.
                          </span>
                        )}
                        {formLevel === 6 && (
                          <span>
                            Com a <strong>Gerència (N6)</strong>, disposa de supervisió executiva institucional sobre tots els expedients de Som Llar.
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
