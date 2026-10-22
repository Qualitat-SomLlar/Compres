import React, { useState } from 'react';
import { Users, Search, Plus, Edit2, Trash2, CheckCircle, X, Save, Loader2, Building2 } from 'lucide-react';
import { useUsers } from '../../hooks/useUsers';
import { useAreas } from '../../hooks/useAreas';
import toast from 'react-hot-toast';
import { cn } from '../../lib/utils';
import { normalizeAreaId } from '../../constants';
import { AreaItem } from '../../types';

export function AreasManager() {
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
