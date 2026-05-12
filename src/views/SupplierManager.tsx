import React, { useState } from 'react';
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
  AlertCircle
} from 'lucide-react';
import { MOCK_SUPPLIERS } from '../lib/mockData';

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
  const [searchTerm, setSearchTerm] = useState('');

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
              className="input-field pl-10 w-64 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={18} />
            <span>Nou Proveïdor</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {MOCK_SUPPLIERS.map(supplier => (
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

            <button className="w-full mt-6 py-3 text-xs font-black uppercase tracking-widest bg-white/5 text-slate-400 hover:bg-brand-primary/10 hover:text-brand-primary rounded-xl transition-all border border-white/[0.05] hover:border-brand-primary/20 shadow-sm">
              Veure fitxa completa
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
