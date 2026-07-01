import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "../components/AuthContext";
import { Plus, Search, ShieldCheck, Clock, X, ArrowUpDown } from "lucide-react";
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase-client';

export function Providers() {
  const { getToken, user } = useAuth();
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    razonSocial: "",
    nif: "",
    contactos: "",
    ambitoServicio: "TICs",
  });
  const [submitting, setSubmitting] = useState(false);

  const [editingProviderId, setEditingProviderId] = useState<number | null>(null);

  useEffect(() => {
    fetchProviders();
  }, []);

  const openNewModal = () => {
    setEditingProviderId(null);
    setFormData({ razonSocial: "", nif: "", contactos: "", ambitoServicio: "TICs" });
    setShowModal(true);
  };

  const openEditModal = (p: any) => {
    setEditingProviderId(p.id);
    setFormData({
      razonSocial: p.razonSocial,
      nif: p.nif,
      contactos: p.contactos,
      ambitoServicio: p.ambitoServicio
    });
    setShowModal(true);
  };

  const fetchProviders = async () => {
    try {
      setLoading(true);
      const snap = await getDocs(collection(db, 'providers'));
      setProviders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: number | string, status: string) => {
    try {
      setLoading(true);
      await updateDoc(doc(db, 'providers', id.toString()), { status, updatedAt: new Date().toISOString() });
      fetchProviders();
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const handleDeleteProvider = async (id: number | string) => {
    if (!confirm("Eliminar aquest proveïdor i totes les dades associades?")) return;
    try {
      setLoading(true);
      await deleteDoc(doc(db, 'providers', id.toString()));
      fetchProviders();
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const getRoleActions = (p: any) => {
    if (!user) return null;
    
    let actions = [];

    // Registrado -> Homologado (Gerencia / DireccionAdministracion)
    if (p.status === 'Registrado' && (user.role === 'Gerencia' || user.role === 'DireccionAdministracion')) {
      actions.push(
        <button key="reject" onClick={() => updateStatus(p.id, 'Baja')} className="text-red-500 font-bold hover:underline text-[10px]">Rebutjar</button>,
        <button key="approve" onClick={() => updateStatus(p.id, 'Homologado')} className="text-emerald-600 font-bold hover:underline">Homologar</button>
      );
    } else if (p.status === 'Homologado' && (user.role === 'Gerencia' || user.role === 'DireccionAdministracion')) {
       actions.push(<button key="baja" onClick={() => updateStatus(p.id, 'Baja')} className="text-amber-500 font-bold hover:underline text-[10px]">Donar de Baixa</button>);
    } else {
       actions.push(<button key="details" onClick={() => alert("Sense accions pendents.")} className="text-slate-400 font-medium hover:text-slate-600">Detalls</button>);
    }

    if (user.role === 'Gerencia') {
      actions.push(
        <span key="divider" className="text-slate-200">|</span>,
        <button key="edit" onClick={() => openEditModal(p)} className="text-blue-600 font-bold hover:underline text-[10px]">Editar</button>,
        <button key="delete" onClick={() => handleDeleteProvider(p.id)} className="text-red-600 font-bold hover:underline text-[10px]">Eliminar</button>
      );
    }

    return <div className="flex justify-end items-center space-x-2">{actions}</div>;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingProviderId) {
        await updateDoc(doc(db, 'providers', editingProviderId.toString()), { ...formData, updatedAt: new Date().toISOString() });
      } else {
        const newDoc = doc(collection(db, 'providers'));
        await setDoc(newDoc, { id: newDoc.id, ...formData, status: "Registrado", createdAt: new Date().toISOString() });
      }

      setShowModal(false);
      setEditingProviderId(null);
      setFormData({ razonSocial: "", nif: "", contactos: "", ambitoServicio: "TICs" });
      fetchProviders();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedProviders = useMemo(() => {
    let sortableProviders = [...providers];
    if (sortConfig.key !== null) {
      sortableProviders.sort((a, b) => {
        let valA = String(a[sortConfig.key!] || '').toLowerCase();
        let valB = String(b[sortConfig.key!] || '').toLowerCase();
        
        if (valA < valB) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (valA > valB) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableProviders;
  }, [providers, sortConfig]);

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 shrink-0">
        <div className="flex items-center space-x-2 md:space-x-4">
          <span className="text-slate-500 font-medium text-sm md:text-base">Mòduls</span>
          <span className="text-slate-300">/</span>
          <span className="text-slate-900 font-semibold text-sm md:text-base">Proveïdors (SP2)</span>
        </div>
        <div className="flex items-center space-x-2 md:space-x-4">
          {(user?.role === 'TecnicaAdministrativa' || user?.role === 'DireccionAdministracion' || user?.role === 'Gerencia') && (
            <button 
              onClick={openNewModal}
              className="px-3 md:px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-xs font-bold text-white shadow-sm transition-colors flex items-center"
            >
              <Plus size={14} className="mr-1" />
              <span className="hidden sm:inline">Nou Proveïdor</span>
              <span className="sm:hidden">Nou</span>
            </button>
          )}
        </div>
      </header>

      <div className="p-4 md:p-8 flex flex-col space-y-6 flex-1 overflow-y-auto">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-xl">
            <h2 className="font-bold text-slate-800">Registre i Homologació</h2>
          </div>
          <div className="p-4 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Cercar per raó social o NIF..." 
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
              />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead>
                <tr className="bg-slate-50 text-[10px] uppercase text-slate-500 tracking-wider font-bold border-b border-slate-100">
                  <th className="px-5 py-3 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('razonSocial')}>
                    <div className="flex items-center">Raó Social / NIF <ArrowUpDown size={14} className="ml-1 opacity-50" /></div>
                  </th>
                  <th className="px-5 py-3 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('ambitoServicio')}>
                    <div className="flex items-center">Àmbit <ArrowUpDown size={14} className="ml-1 opacity-50" /></div>
                  </th>
                  <th className="px-5 py-3 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('status')}>
                    <div className="flex items-center">Estat <ArrowUpDown size={14} className="ml-1 opacity-50" /></div>
                  </th>
                  <th className="px-5 py-3 text-right">Accions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {loading ? (
                  <tr><td colSpan={4} className="p-6 text-center text-slate-400">Carregant...</td></tr>
                ) : providers.length === 0 ? (
                  <tr><td colSpan={4} className="p-6 text-center text-slate-400">No s'han trobat proveïdors</td></tr>
                ) : (
                  sortedProviders.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-900">{p.razonSocial}</div>
                        <div className="text-[10px] text-slate-400">{p.nif}</div>
                      </td>
                      <td className="px-5 py-4 font-medium text-slate-700">{p.ambitoServicio}</td>
                      <td className="px-5 py-4">
                        {p.status === 'Homologado' ? (
                          <span className="inline-flex items-center px-2 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-full border border-emerald-100">
                            <ShieldCheck size={12} className="mr-1"/> HOMOLOGAT
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 bg-amber-50 text-amber-600 text-[10px] font-bold rounded-full border border-amber-100">
                            <Clock size={12} className="mr-1"/> REGISTRAT
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {getRoleActions(p)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="font-bold text-slate-800">Nova Fitxa de Proveïdor</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Raó Social *</label>
                <input 
                  required
                  type="text"
                  value={formData.razonSocial}
                  onChange={e => setFormData({ ...formData, razonSocial: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">NIF *</label>
                <input 
                  required
                  type="text"
                  value={formData.nif}
                  onChange={e => setFormData({ ...formData, nif: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Mètodes de Contacte (Correu, Tel) *</label>
                <input 
                  required
                  type="text"
                  value={formData.contactos}
                  onChange={e => setFormData({ ...formData, contactos: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Àmbit de Servei *</label>
                <select 
                  required
                  value={formData.ambitoServicio}
                  onChange={e => setFormData({ ...formData, ambitoServicio: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="TICs">TICs / Software</option>
                  <option value="Suministros">Suministraments (Aigua, Llum, Gas)</option>
                  <option value="Alimentación">Alimentació, Higiene, Salut</option>
                  <option value="Transporte">Transport / Logística</option>
                  <option value="Material de Oficina">Material d'Oficina</option>
                  <option value="Asesoría">Gestoria / Assessoria (Laboral, Legal)</option>
                  <option value="Seguros">Assegurances</option>
                  <option value="Mantenimiento">Manteniment (Obres, Reformes)</option>
                  <option value="Mobiliario">Mobiliari / Electrodomèstics</option>
                  <option value="Seguridad">Seguretat</option>
                  <option value="Formación">Formació i Consultoria</option>
                </select>
              </div>
              
              <div className="pt-4 flex justify-end space-x-3">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-md text-sm font-bold text-slate-700 transition-colors"
                >
                  Cancel·lar
                </button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm font-bold text-white shadow-sm transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Desant...' : 'Desar i Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

