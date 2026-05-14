import React, { useState, useRef } from 'react';
import { Supplier } from '../types';
import { 
  Users, 
  Search, 
  ShieldCheck, 
  ShieldAlert, 
  Clock, 
  Plus, 
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
  Save
} from 'lucide-react';
import { MOCK_SUPPLIERS } from '../lib/mockData';
import toast from 'react-hot-toast';

const StatusBadge = ({ status }: { status: string }) => {
  const configs: Record<string, { label: string, color: string, icon: any }> = {
    homologat: { label: 'Homologat', color: 'bg-emerald-500/15 text-emerald-500', icon: CheckCircle2 },
    pendent_documentacio: { label: 'Pend. Documentació', color: 'bg-amber-500/15 text-amber-500', icon: Clock },
    en_revisio: { label: 'En Revisió', color: 'bg-blue-500/15 text-blue-500', icon: AlertCircle },
    bloquejat: { label: 'Bloquejat', color: 'bg-red-500/15 text-red-500', icon: XCircle },
  };
  const config = configs[status] || { label: status, color: 'bg-white/10 text-slate-400', icon: Plus };
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${config.color}`}>
      <Icon size={12} />
      {config.label}
    </span>
  );
};

export default function SupplierManager() {
  const [suppliers, setSuppliers] = useState<Supplier[]>(MOCK_SUPPLIERS as any);
  const [searchTerm, setSearchTerm] = useState('');
  const [isNewSupplierModalOpen, setIsNewSupplierModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedSupplier) return;
    
    setIsUploading(true);
    // Mock upload
    setTimeout(() => {
      const newDoc = { id: Math.random().toString(), name: file.name, date: new Date().toISOString().split('T')[0], type: 'Normatiu' };
      const updatedSupplier = { ...selectedSupplier, documents: [...(selectedSupplier.documents || []), newDoc] };
      
      setSuppliers(prev => prev.map(s => s.id === updatedSupplier.id ? updatedSupplier : s));
      setSelectedSupplier(updatedSupplier);
      setIsUploading(false);
      toast.success('Document pujat correctament');
    }, 1000);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!selectedSupplier) return;
    const newStatus = e.target.value as any;
    const updatedSupplier = { ...selectedSupplier, status: newStatus };
    setSuppliers(prev => prev.map(s => s.id === updatedSupplier.id ? updatedSupplier : s));
    setSelectedSupplier(updatedSupplier);
    toast.success('Estat actualitzat correctament');
  };

  const handleRatingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedSupplier) return;
    const newRating = parseInt(e.target.value) || 0;
    const updatedSupplier = { ...selectedSupplier, rating: newRating };
    setSuppliers(prev => prev.map(s => s.id === updatedSupplier.id ? updatedSupplier : s));
    setSelectedSupplier(updatedSupplier);
  };
  
  const handleCriticalityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!selectedSupplier) return;
    const newCrit = e.target.value as any;
    const updatedSupplier = { ...selectedSupplier, criticality: newCrit };
    setSuppliers(prev => prev.map(s => s.id === updatedSupplier.id ? updatedSupplier : s));
    setSelectedSupplier(updatedSupplier);
  };

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Proveïdor desat correctament");
    setIsNewSupplierModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Registre de Proveïdors</h2>
          <p className="text-sm text-slate-500">Consulta i gestiona l'homologació de col·laboradors i proveïdors.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Cerca per nom o NIF..." 
              className="input-field !pl-12 w-64 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setIsNewSupplierModalOpen(true)}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Plus size={18} />
            <span>Nou Proveïdor</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {suppliers.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.nif.toLowerCase().includes(searchTerm.toLowerCase())).map(supplier => (
          <div key={supplier.id} className="card p-8 flex flex-col hover:border-brand-primary/50 transition-all duration-500 group">
            <div className="flex items-start justify-between mb-8">
              <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-slate-500 group-hover:bg-brand-primary/10 group-hover:text-brand-primary transition-all duration-500 shadow-inner">
                <Users size={28} />
              </div>
              <StatusBadge status={supplier.status} />
            </div>

            <div className="flex-1">
              <h3 className="text-xl font-black text-white mb-2 tracking-tight">{supplier.name}</h3>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">NIF: {supplier.nif}</p>
              
              <div className="grid grid-cols-2 gap-4 py-6 border-t border-white/[0.05] text-xs">
                <div>
                  <p className="text-slate-500 font-bold uppercase text-[9px] mb-2 tracking-tighter">Categoria</p>
                  <p className="font-bold text-slate-300 capitalize">{supplier.category}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-bold uppercase text-[9px] mb-2 tracking-tighter">Criticitat</p>
                  <p className={`font-bold ${supplier.criticality === 'alta' ? 'text-red-500' : 'text-slate-300'} capitalize`}>
                    {supplier.criticality}
                  </p>
                </div>
              </div>
            </div>

            <button 
              onClick={() => setSelectedSupplier(supplier)}
              className="w-full mt-6 py-3 text-xs font-black uppercase tracking-widest bg-white/5 text-slate-400 hover:bg-brand-primary/10 hover:text-brand-primary rounded-xl transition-all border border-white/[0.05] hover:border-brand-primary/20 shadow-sm"
            >
              Veure fitxa completa
            </button>
          </div>
        ))}
      </div>

      {/* New Supplier Modal */}
      {isNewSupplierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#151c2c] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-white/5">
              <h3 className="text-xl font-bold text-white flex items-center gap-2"><Plus size={24} className="text-brand-primary"/> Nou Proveïdor</h3>
              <button onClick={() => setIsNewSupplierModalOpen(false)} className="p-2 hover:bg-white/5 rounded-lg text-slate-400">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveSupplier} className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Nom o Raó Social <span className="text-red-500">*</span></label>
                  <input type="text" required className="input-field w-full" placeholder="Ex: Informàtica SL" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">NIF/CIF <span className="text-red-500">*</span></label>
                  <input type="text" required className="input-field w-full" placeholder="Ex: B12345678" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Categoria</label>
                  <select className="input-field w-full">
                    <option>Material d'oficina</option>
                    <option>Serveis Generals</option>
                    <option>Tecnologia</option>
                    <option>Alimentació</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Email de contacte</label>
                  <input type="email" className="input-field w-full" placeholder="Ex: contacte@empresa.com" />
                </div>
              </div>
              <div className="pt-6 border-t border-white/5 flex justify-end gap-3">
                <button type="button" onClick={() => setIsNewSupplierModalOpen(false)} className="btn-secondary px-6 py-2.5 text-xs font-bold uppercase tracking-widest">Cancel·lar</button>
                <button type="submit" className="btn-primary flex items-center gap-2 px-6 py-2.5 text-xs font-bold uppercase tracking-widest"><Save size={16}/> Desar Proveïdor</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supplier Detail Modal */}
      {selectedSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#151c2c] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-white/5">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">Fitxa de {selectedSupplier.name}</h3>
              <button onClick={() => setSelectedSupplier(null)} className="p-2 hover:bg-white/5 rounded-lg text-slate-400">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-8">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-2xl font-black text-white">{selectedSupplier.name}</h4>
                  <p className="text-sm text-slate-400">NIF: {selectedSupplier.nif}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Estat Homologació</p>
                  <select 
                    value={selectedSupplier.status} 
                    onChange={handleStatusChange}
                    className="input-field py-1 px-3 text-xs font-bold bg-[#1e293b]"
                  >
                    <option value="candidat">Candidat</option>
                    <option value="pendent_documentacio">Pend. Documentació</option>
                    <option value="en_revisio">En Revisió</option>
                    <option value="homologat">Homologat</option>
                    <option value="bloquejat">Bloquejat</option>
                    <option value="baixa">Baixa</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 p-4 bg-white/[0.02] rounded-xl border border-white/5">
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Categoria</p>
                  <p className="text-sm text-white font-medium capitalize">{selectedSupplier.category}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Criticitat</p>
                  <select 
                    value={selectedSupplier.criticality} 
                    onChange={handleCriticalityChange}
                    className={`input-field w-full py-1 px-2 text-xs font-bold capitalize bg-[#1e293b] ${selectedSupplier.criticality === 'alta' ? 'text-red-500' : 'text-white'}`}
                  >
                    <option value="baixa">Baixa</option>
                    <option value="mitjana">Mitjana</option>
                    <option value="alta">Alta</option>
                  </select>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Puntuació (0-100)</p>
                  <input 
                    type="number" 
                    min="0" max="100" 
                    value={selectedSupplier.rating} 
                    onChange={handleRatingChange}
                    className="input-field w-full py-1 px-2 text-xs font-bold bg-[#1e293b]"
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-3 border-b border-white/5 pb-2">
                  <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Documentació</h5>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="btn-secondary text-[10px] font-black uppercase tracking-widest py-1.5 px-3 flex items-center gap-1"
                  >
                    <Plus size={12} />
                    {isUploading ? 'Pujant...' : 'Pujar Document'}
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleFileUpload}
                  />
                </div>
                
                {selectedSupplier.documents && selectedSupplier.documents.length > 0 ? (
                  <div className="space-y-2">
                    {selectedSupplier.documents.map((doc: any) => (
                      <div key={doc.id} className="flex justify-between items-center p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                        <div className="flex items-center gap-3">
                          <ShieldCheck size={16} className="text-emerald-500" />
                          <div>
                            <p className="text-xs font-bold text-white">{doc.name}</p>
                            <p className="text-[10px] text-slate-500">{doc.date} · {doc.type}</p>
                          </div>
                        </div>
                        <button onClick={() => toast('No es pot visualitzar: document de demostració', { icon: '📄' })} className="text-[10px] font-black text-brand-primary uppercase hover:underline">Veure</button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center bg-white/[0.01] border border-white/5 rounded-xl border-dashed">
                    <p className="text-xs text-slate-500 font-medium">No hi ha documents adjunts per aquest proveïdor.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
