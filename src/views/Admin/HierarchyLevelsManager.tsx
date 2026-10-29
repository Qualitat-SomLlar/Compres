import React, { useState, useEffect } from 'react';
import { Users, Search, Plus, Edit2, Trash2, CheckCircle, X, Save, Loader2, ShieldCheck, Building2 } from 'lucide-react';
import { useUsers } from '../../hooks/useUsers';
import { useHierarchyLevels } from '../../hooks/useHierarchyLevels';
import toast from 'react-hot-toast';
import { cn } from '../../lib/utils';
import { HierarchyRoleConfig } from '../../types';

export function HierarchyLevelsManager() {
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
            <ShieldCheck size={14} /> Nivells Globals (Som Llar)
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
                    <option value="global">Global de Som Llar (tota l'entitat)</option>
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
                    {modalScope === 'area' ? "🔒 Limitat a sol·licituds de la seva àrea" : "🌐 Vàlid per a tot Som Llar"}
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
