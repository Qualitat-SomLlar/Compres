import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "../components/AuthContext";
import { Plus, ShoppingBag, Clock, FileText, X, ArrowUpDown } from "lucide-react";
import { useLocation } from "react-router-dom";
import { collection, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase-client';

export function Purchases() {
  const { getToken, user } = useAuth();
  const [purchases, setPurchases] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    categoryId: "",
    subcategoria: "",
    codigoAnalitico: "",
    pis: "",
    detalles: "",
    providerId: "",
    importeEstimado: "",
  });

  useEffect(() => {
    fetchPurchases();
    fetchProviders();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const snap = await getDocs(collection(db, 'requestCategories'));
      setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    if (queryParams.get("new") === "true") {
      setShowModal(true);
    }
  }, [location.search]);

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const snap = await getDocs(collection(db, 'purchaseRequests'));
      setPurchases(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchProviders = async () => {
    try {
      const snap = await getDocs(collection(db, 'providers'));
      setProviders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        providerId: formData.providerId ? formData.providerId : undefined,
        status: "Pendent d'aprovació",
        createdBy: user?.uid || user?.id,
        createdAt: new Date().toISOString()
      };
      
      const newDoc = doc(collection(db, 'purchaseRequests'));
      await setDoc(newDoc, { id: newDoc.id, ...payload });
      
      setShowModal(false);
      setFormData({
        categoryId: "",
        subcategoria: "",
        codigoAnalitico: "",
        pis: "",
        detalles: "",
        providerId: "",
        importeEstimado: "",
      });
      fetchPurchases();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (id: number | string, status: string) => {
    try {
      setLoading(true);
      await updateDoc(doc(db, 'purchaseRequests', id.toString()), { status, updatedAt: new Date().toISOString() });
      fetchPurchases();
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const getRoleActions = (req: any) => {
    let actionBtn = null;
    if (user) {
      // Solicitado -> Autorizado (DireccionAdministracion)
      if (req.status === 'Solicitado' && (user.role === 'DireccionAdministracion' || user.role === 'Gerencia')) {
        actionBtn = <button onClick={() => updateStatus(req.id, 'Autorizado')} className="text-blue-600 font-bold hover:underline">Autoritzar</button>;
      }
      // Autorizado -> Formalizado (TecnicaAdministrativa)
      else if (req.status === 'Autorizado' && user.role === 'TecnicaAdministrativa') {
        actionBtn = <button onClick={() => updateStatus(req.id, 'Formalizado')} className="text-indigo-600 font-bold hover:underline">Formalitzar</button>;
      }
      // Formalizado -> Recibido (ResponsableArea / ResponsableEquipamientos)
      else if (req.status === 'Formalizado' && (user.role === 'ResponsableArea' || user.role === 'ResponsableEquipamientos')) {
        actionBtn = <button onClick={() => updateStatus(req.id, 'Recibido')} className="text-emerald-600 font-bold hover:underline">Marcar Rebut</button>;
      }
      // Recibido -> Facturado (AreaContabilidad)
      else if (req.status === 'Recibido' && user.role === 'AreaContabilidad') {
        actionBtn = <button onClick={() => updateStatus(req.id, 'Facturado')} className="text-slate-700 font-bold hover:underline">Comptabilitzar</button>;
      }
    }

    return (
      <div className="flex items-center justify-end space-x-3">
        {actionBtn}
        <button onClick={() => setSelectedPurchase(req)} className="text-slate-400 font-medium hover:text-slate-600">
          Detalls
        </button>
      </div>
    );
  };

  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedPurchases = useMemo(() => {
    let sortablePurchases = [...purchases];
    if (sortConfig.key !== null) {
      sortablePurchases.sort((a, b) => {
        let valA = a[sortConfig.key!] || '';
        let valB = b[sortConfig.key!] || '';
        
        if (sortConfig.key === 'importeEstimado') {
          valA = parseFloat(valA) || 0;
          valB = parseFloat(valB) || 0;
        } else if (sortConfig.key === 'category') {
          valA = (a.category?.name || '') + ' ' + (a.subcategoria || '');
          valB = (b.category?.name || '') + ' ' + (b.subcategoria || '');
        } else if (sortConfig.key === 'id') {
           valA = Number(valA);
           valB = Number(valB);
        } else {
           valA = String(valA).toLowerCase();
           valB = String(valB).toLowerCase();
        }
        
        if (valA < valB) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (valA > valB) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortablePurchases;
  }, [purchases, sortConfig]);

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 shrink-0">
        <div className="flex items-center space-x-2 md:space-x-4">
          <span className="text-slate-500 font-medium text-sm md:text-base">Mòduls</span>
          <span className="text-slate-300">/</span>
          <span className="text-slate-900 font-semibold text-sm md:text-base">Circuit de Compres (SP1)</span>
        </div>
        <div className="flex items-center space-x-2 md:space-x-4">
          {(user?.role === 'ResponsableArea' || user?.role === 'TecnicaAdministrativa' || user?.role === 'ResponsableEquipamientos') && (
            <button 
              onClick={() => setShowModal(true)}
              className="px-3 md:px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-xs font-bold text-white shadow-sm transition-colors flex items-center"
            >
              <Plus size={14} className="mr-1" />
              <span className="hidden sm:inline">Nova Sol·licitud</span>
              <span className="sm:hidden">Nova</span>
            </button>
          )}
        </div>
      </header>

      <div className="p-4 md:p-8 flex flex-col space-y-6 flex-1 overflow-y-auto">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-xl">
            <h2 className="font-bold text-slate-800">Últimes Sol·licituds de Compra</h2>
            <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-1 rounded">EN CURS</span>
          </div>
          
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead>
                <tr className="bg-slate-50 text-[10px] uppercase text-slate-500 tracking-wider font-bold border-b border-slate-100">
                  <th className="px-5 py-3 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('id')}>
                    <div className="flex items-center">ID / Còdi Analític <ArrowUpDown size={14} className="ml-1 opacity-50" /></div>
                  </th>
                  <th className="px-5 py-3 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('category')}>
                    <div className="flex items-center">Concepte / Proveïdor <ArrowUpDown size={14} className="ml-1 opacity-50" /></div>
                  </th>
                  <th className="px-5 py-3 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('importeEstimado')}>
                    <div className="flex items-center">Import <ArrowUpDown size={14} className="ml-1 opacity-50" /></div>
                  </th>
                  <th className="px-5 py-3 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('status')}>
                    <div className="flex items-center">Estat Workflow <ArrowUpDown size={14} className="ml-1 opacity-50" /></div>
                  </th>
                  <th className="px-5 py-3 text-right">Acció</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {loading ? (
                  <tr><td colSpan={5} className="p-6 text-center text-slate-400">Carregant...</td></tr>
                ) : purchases.length === 0 ? (
                  <tr><td colSpan={5} className="p-10 text-center text-slate-400">
                    <ShoppingBag className="mx-auto text-slate-300 mb-3" size={32} />
                    <p>No hi ha sol·licituds de compra actuals</p>
                  </td></tr>
                ) : (
                  sortedPurchases.map(req => (
                    <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-900">REQ-{req.id.toString().padStart(4, '0')}</div>
                        <div className="text-[10px] text-slate-400">{req.codigoAnalitico || "Sense codi"} {req.pis ? `- Pis: ${req.pis}` : ''}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-medium text-slate-900 overflow-hidden text-ellipsis whitespace-nowrap max-w-[200px]" title={req.detalles}>{req.detalles}</div>
                        <div className="text-[10px] text-slate-500">{req.category?.name} - {req.subcategoria}</div>
                      </td>
                      <td className="px-5 py-4 font-mono font-medium text-slate-700">
                        {req.importeEstimado ? `${parseFloat(req.importeEstimado).toFixed(2)} €` : 'No indicat'}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-block px-2 py-1 text-[10px] font-bold rounded-full border 
                          ${req.status === 'Solicitado' ? 'bg-amber-50 text-amber-600 border-amber-100' : ''}
                          ${req.status === 'Autorizado' ? 'bg-blue-50 text-blue-600 border-blue-100' : ''}
                          ${req.status === 'Formalizado' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : ''}
                          ${req.status === 'Recibido' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : ''}
                          ${req.status === 'Facturado' ? 'bg-slate-100 text-slate-600 border-slate-200' : ''}
                        `}>
                          {req.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        {getRoleActions(req)}
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
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
              <h2 className="font-bold text-slate-800">Nova Sol·licitud de Compra</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Tipus de Compra (Categoria) *</label>
                <select 
                  required
                  value={formData.categoryId}
                  onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecciona categoria...</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Subcategoria *</label>
                  <input 
                    required
                    type="text"
                    placeholder="Ex: Informàtica"
                    value={formData.subcategoria}
                    onChange={e => setFormData({ ...formData, subcategoria: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Codi Analític *</label>
                  <input 
                    required
                    type="text"
                    placeholder="Ex: C-102"
                    value={formData.codigoAnalitico}
                    onChange={e => setFormData({ ...formData, codigoAnalitico: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Pis (Opcional)</label>
                <input 
                  type="text"
                  placeholder="Ex: Pis 2n A"
                  value={formData.pis}
                  onChange={e => setFormData({ ...formData, pis: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Detalls (Camp per redactar) *</label>
                <textarea 
                  required
                  rows={3}
                  placeholder="Detalla què s'està sol·licitant exactament"
                  value={formData.detalles}
                  onChange={e => setFormData({ ...formData, detalles: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                ></textarea>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Import Estimant (€)</label>
                <input 
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.importeEstimado}
                  onChange={e => setFormData({ ...formData, importeEstimado: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">Opcional.</p>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Proveïdor Suggerit</label>
                <select 
                  value={formData.providerId}
                  onChange={e => setFormData({ ...formData, providerId: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecciona un proveïdor...</option>
                  {providers.map(p => (
                    <option key={p.id} value={p.id}>{p.razonSocial} {p.status === 'Homologado' ? '(Homologat)' : ''}</option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 mt-1">Opcional. És preferible escollir un proveïdor homologat.</p>
              </div>
              
              <div className="pt-4 flex justify-end space-x-3 border-t border-slate-100">
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
                  {submitting ? 'Creant...' : 'Sol·licitar Compra'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
