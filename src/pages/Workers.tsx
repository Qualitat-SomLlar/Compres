import React, { useState, useEffect, useMemo } from "react";
import { Plus, X, Trash2, Edit2, Users, ArrowUpDown } from "lucide-react";
import { useAuth } from "../components/AuthContext";
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase-client';

type Worker = {
  id: number | string;
  workerNumber?: number;
  name: string;
  gender?: string;
  email?: string;
  sede?: string;
  area?: string;
  createdAt: string;
};

export function Workers() {
  const { getToken, user } = useAuth();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWorkers, setSelectedWorkers] = useState<Set<number | string>>(new Set());
  
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | string | null>(null);
  const [formData, setFormData] = useState({ workerNumber: "", name: "", gender: "", email: "", sede: "", area: "" });

  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [bulkEditData, setBulkEditData] = useState({ gender: "", sede: "", area: "" });

  const [sortConfig, setSortConfig] = useState<{ key: keyof Worker | null; direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });

  const handleSort = (key: keyof Worker) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedWorkers = useMemo(() => {
    let sortableWorkers = [...workers];
    if (sortConfig.key !== null) {
      sortableWorkers.sort((a, b) => {
        const valA = String(a[sortConfig.key!] || '').toLowerCase();
        const valB = String(b[sortConfig.key!] || '').toLowerCase();
        
        if (valA < valB) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (valA > valB) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableWorkers;
  }, [workers, sortConfig]);

  useEffect(() => {
    fetchWorkers();
  }, []);

  const fetchWorkers = async () => {
    try {
      // API (Postgres)
      const token = await getToken();
      const res = await fetch("/api/workers", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setWorkers(await res.json());
      }
      setIsLoading(false);
    } catch (e) {
      console.error(e);
      setIsLoading(false);
    }
  };

  const openNewModal = () => {
    setEditingId(null);
    setFormData({ workerNumber: "", name: "", gender: "", email: "", sede: "", area: "" });
    setShowModal(true);
  };

  const openEditModal = (w: Worker) => {
    setEditingId(w.id);
    setFormData({ 
      workerNumber: w.workerNumber?.toString() || "", 
      name: w.name, 
      gender: w.gender || "", 
      email: w.email || "", 
      sede: w.sede || "", 
      area: w.area || "" 
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        workerNumber: formData.workerNumber ? parseInt(formData.workerNumber) : null,
        updatedAt: new Date().toISOString()
      };

      const token = await getToken();
      const url = editingId ? `/api/workers/${editingId}` : "/api/workers";
      const method = editingId ? "PUT" : "POST";
      
      await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      fetchWorkers();
      setShowModal(false);
      setEditingId(null);
    } catch (e) {
      console.error("Error", e);
    }
  };

  const handleDelete = async (id: number | string) => {
    if (!confirm("Segur que vols eliminar aquesta treballadora?")) return;
    try {
      const token = await getToken();
      await fetch(`/api/workers/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchWorkers();
    } catch (e) {
      console.error("Error", e);
    }
  };

  const toggleSelectWorker = (id: number | string) => {
    const newSet = new Set(selectedWorkers);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedWorkers(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedWorkers.size === workers.length && workers.length > 0) {
      setSelectedWorkers(new Set());
    } else {
      setSelectedWorkers(new Set(workers.map(w => w.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedWorkers.size === 0) return;
    if (!confirm(`Segur que vols eliminar ${selectedWorkers.size} treballadores?`)) return;
    
    try {
      const token = await getToken();
      await Promise.all(
        Array.from(selectedWorkers).map(id =>
          fetch(`/api/workers/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` }
          })
        )
      );
      setSelectedWorkers(new Set());
      fetchWorkers();
    } catch (e) {
      console.error(e);
    }
  };

  const handleBulkEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedWorkers.size === 0) return;

    try {
      const updates: any = {};
      if (bulkEditData.gender) updates.gender = bulkEditData.gender;
      if (bulkEditData.sede) updates.sede = bulkEditData.sede;
      if (bulkEditData.area) updates.area = bulkEditData.area;
      
      if (Object.keys(updates).length === 0) {
        setShowBulkEditModal(false);
        return;
      }
      
      updates.updatedAt = new Date().toISOString();
      const token = await getToken();

      await Promise.all(
        Array.from(selectedWorkers).map(async (id) => {
          const worker = workers.find(w => w.id === id);
          if (worker) {
            const res = await fetch(`/api/workers/${id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({ ...worker, ...updates })
            });
            if (!res.ok) console.error("API update failed:", res.status, await res.text());
          }
        })
      );
      
      setSelectedWorkers(new Set());
      setShowBulkEditModal(false);
      setBulkEditData({ gender: "", sede: "", area: "" });
      fetchWorkers();
    } catch (e) {
      console.error("Bulk edit error", e);
    }
  };

  if (isLoading) return <div className="p-8 text-center text-slate-500">Carregant treballadores...</div>;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center">
            <Users className="mr-2 text-blue-600" size={24} />
            Llistat de Treballadores
          </h1>
          <p className="text-slate-500 text-sm mt-1">Gestiona el personal per àrea i seu de treball</p>
        </div>
        <div className="flex space-x-2">
          {selectedWorkers.size > 0 && ['Gerencia', 'DireccionAdministracion', 'TecnicaAdministrativa'].includes(user?.role || "") && (
            <>
              <button 
                onClick={() => setShowBulkEditModal(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md text-sm font-bold text-white shadow-sm transition-colors flex items-center"
              >
                <Edit2 size={16} className="mr-1" />
                Edició Múltiple ({selectedWorkers.size})
              </button>
              <button 
                onClick={handleBulkDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md text-sm font-bold text-white shadow-sm transition-colors flex items-center"
              >
                <Trash2 size={16} className="mr-1" />
                Eliminar ({selectedWorkers.size})
              </button>
            </>
          )}
          {['Gerencia', 'DireccionAdministracion', 'TecnicaAdministrativa'].includes(user?.role || "") && (
            <button 
              onClick={openNewModal}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm font-bold text-white shadow-sm transition-colors flex items-center"
            >
              <Plus size={16} className="mr-1" />
              Afegir Treballadora
            </button>
          )}
        </div>
      </header>

      <section>
        {workers.length === 0 ? (
          <div className="p-12 text-center text-slate-400 bg-white border border-slate-200 rounded-xl border-dashed">
            No hi ha treballadores registrades al sistema.
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-widest font-semibold">
                    <th className="px-5 py-4 w-12">
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        checked={selectedWorkers.size === workers.length && workers.length > 0}
                        onChange={toggleSelectAll}
                      />
                    </th>
                    <th className="px-5 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('workerNumber')}>
                      <div className="flex items-center">Nº <ArrowUpDown size={14} className="ml-1 opacity-50" /></div>
                    </th>
                    <th className="px-5 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('name')}>
                      <div className="flex items-center">Nom <ArrowUpDown size={14} className="ml-1 opacity-50" /></div>
                    </th>
                    <th className="px-5 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('gender')}>
                      <div className="flex items-center">Gènere <ArrowUpDown size={14} className="ml-1 opacity-50" /></div>
                    </th>
                    <th className="px-5 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('email')}>
                      <div className="flex items-center">Correu <ArrowUpDown size={14} className="ml-1 opacity-50" /></div>
                    </th>
                    <th className="px-5 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('sede')}>
                      <div className="flex items-center">Seu de Treball <ArrowUpDown size={14} className="ml-1 opacity-50" /></div>
                    </th>
                    <th className="px-5 py-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('area')}>
                      <div className="flex items-center">Àrea <ArrowUpDown size={14} className="ml-1 opacity-50" /></div>
                    </th>
                    <th className="px-5 py-4 text-right">Accions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {sortedWorkers.map(w => (
                    <tr key={w.id} className={`hover:bg-slate-50/50 transition-colors group ${selectedWorkers.has(w.id) ? 'bg-blue-50/50' : ''}`}>
                      <td className="px-5 py-3">
                        <input 
                          type="checkbox" 
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          checked={selectedWorkers.has(w.id)}
                          onChange={() => toggleSelectWorker(w.id)}
                        />
                      </td>
                      <td className="px-5 py-3 text-slate-600 font-mono">{w.workerNumber || '-'}</td>
                      <td className="px-5 py-3">
                        <div className="font-semibold text-slate-900">{w.name}</div>
                      </td>
                      <td className="px-5 py-3 text-slate-600">{w.gender || '-'}</td>
                      <td className="px-5 py-3 text-slate-600">{w.email || '-'}</td>
                      <td className="px-5 py-3 text-slate-600">{w.sede || 'Pendent'}</td>
                      <td className="px-5 py-3">
                        <span className="inline-block px-2 py-1 text-[10px] font-bold rounded-full bg-blue-50 text-blue-700 uppercase tracking-wider">{w.area || 'Pendent'}</span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        {['Gerencia', 'DireccionAdministracion', 'TecnicaAdministrativa'].includes(user?.role || "") && (
                          <div className="flex justify-end space-x-2">
                            <button 
                              onClick={() => openEditModal(w)}
                              className="text-slate-300 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                              title="Editar"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={() => handleDelete(w.id)}
                              className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                              title="Eliminar"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-800">{editingId ? "Editar Treballadora" : "Nova Treballadora"}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Nº Treballadora</label>
                  <input 
                    type="number" placeholder="Ex: 123" 
                    value={formData.workerNumber} onChange={e => setFormData({...formData, workerNumber: e.target.value})} 
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Gènere</label>
                  <select 
                    value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})} 
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecciona...</option>
                    <option value="Femení">Femení</option>
                    <option value="Masculí">Masculí</option>
                    <option value="Altres">Altres</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Nom de la persona *</label>
                <input 
                  required type="text" placeholder="Ex: Maria Garcia" 
                  value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} 
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Correu corporatiu</label>
                <input 
                  type="email" placeholder="Ex: mgarcia@somllar.cat" 
                  value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} 
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Seu de Treball</label>
                <input 
                  type="text" placeholder="Ex: Oficina Central / Pis 1" 
                  value={formData.sede} onChange={e => setFormData({...formData, sede: e.target.value})} 
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Àrea</label>
                <input 
                  type="text" placeholder="Ex: Educació / Administració" 
                  value={formData.area} onChange={e => setFormData({...formData, area: e.target.value})} 
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
                />
              </div>
              <div className="pt-4 flex justify-end sticky bottom-0 bg-white">
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm font-bold text-white shadow-sm transition-colors">
                  {editingId ? "Desar Canvis" : "Afegir Treballadora"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBulkEditModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-800">Edició Múltiple ({selectedWorkers.size} seleccionades)</h2>
              <button onClick={() => setShowBulkEditModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleBulkEditSubmit} className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="text-sm text-slate-600 mb-4">
                Omple només els camps que vulguis actualitzar per a totes les treballadores seleccionades. Els camps buits no es modificaran.
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Gènere</label>
                <select 
                  value={bulkEditData.gender} onChange={e => setBulkEditData({...bulkEditData, gender: e.target.value})} 
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sense canvis...</option>
                  <option value="Femení">Femení</option>
                  <option value="Masculí">Masculí</option>
                  <option value="Altres">Altres</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Seu de Treball</label>
                <input 
                  type="text" placeholder="Sense canvis..." 
                  value={bulkEditData.sede} onChange={e => setBulkEditData({...bulkEditData, sede: e.target.value})} 
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Àrea</label>
                <input 
                  type="text" placeholder="Sense canvis..." 
                  value={bulkEditData.area} onChange={e => setBulkEditData({...bulkEditData, area: e.target.value})} 
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
                />
              </div>
              <div className="pt-4 flex justify-end sticky bottom-0 bg-white">
                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md text-sm font-bold text-white shadow-sm transition-colors">
                  Actualitzar Seleccionades
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
