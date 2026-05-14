import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  ChevronRight, 
  MoreVertical, 
  Clock, 
  AlertTriangle,
  FileCheck,
  Plus,
  ArrowUpRight,
  FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import StatusBadge from '../components/StatusBadge';
import { useRequests } from '../hooks/useRequests';

export default function RequestsList() {
  const [searchTerm, setSearchTerm] = useState('');
  const { requests } = useRequests();

  const filteredRequests = React.useMemo(() => {
    return requests.filter(r => 
      r.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.itemDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.createdByUserName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.requestingTechnicianName && r.requestingTechnicianName.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [requests, searchTerm]);

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
             <div className="p-2.5 bg-brand-primary/10 rounded-xl text-brand-primary">
              <FileText size={20} />
            </div>
            <h2 className="text-3xl font-black text-white tracking-tighter">Flux d'Expedients</h2>
          </div>
          <p className="text-sm text-slate-500 font-medium max-w-xl">Supervisa el cicle de vida complet de les compres des de la sol·licitud tècnica fins a l'autorització final de finances.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand-primary transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="Cerca per ID, tècnic, projecte..." 
              className="input-field input-search w-full sm:w-80 text-xs py-3 border-white/[0.05] focus:border-brand-primary transition-all bg-white/[0.02]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Link to="/compres/nova" className="btn-primary flex items-center gap-3 py-3 px-6 text-xs font-black tracking-widest uppercase">
            <Plus size={16} />
            <span>Nova Sol·licitud</span>
          </Link>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/[0.03]">
                <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Expedient / Temps</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Tècnic/a Sol·licitant</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Bé o Servei</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Import Estimat</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-center">Estat</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-right">Acció</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.02]">
              {filteredRequests.map((request) => (
                <tr key={request.id} className="hover:bg-white/[0.01] transition-colors group">
                  <td className="px-8 py-6">
                    <div className="font-black text-white text-xs tracking-tight mb-1">{request.code || request.id}</div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">{new Date(request.createdAt).toLocaleDateString('ca-ES')}</div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="text-xs font-black text-slate-300 mb-1 group-hover:text-brand-primary transition-colors">{request.requestingTechnicianName}</div>
                    <div className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">{request.areaId} <span className="mx-1 opacity-20">/</span> {request.projectId}</div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="text-xs font-bold text-slate-400 line-clamp-1 max-w-xs">{request.itemDescription}</div>
                    <div className="flex items-center gap-3 mt-1.5">
                      {request.requiresThreeQuotes && (
                        <span className="flex items-center gap-1.5 text-[8px] font-black text-amber-500/80 bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/10 uppercase tracking-widest">
                          <AlertTriangle size={10} /> {'>'}5k€ compliance
                        </span>
                      )}
                      {request.urgency === 'alta' && (
                        <span className="text-[8px] font-black text-red-500/80 uppercase tracking-[0.2em]">
                          Crític
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="text-sm font-black text-white tracking-tighter">{request.estimatedAmount.toLocaleString()} <span className="text-slate-600 font-black text-[10px]">€</span></div>
                    <div className="text-[9px] font-black text-brand-primary uppercase mt-1 tracking-widest leading-none">{request.analyticCode}</div>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <div className="flex justify-center">
                      <StatusBadge status={request.status} />
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <Link 
                      to={`/compres/${request.id}`} 
                      className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-brand-primary hover:text-white transition-all"
                    >
                      <span>Gestionar</span>
                      <ArrowUpRight size={14} className="opacity-0 group-hover:opacity-100 transition-all -translate-y-0.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredRequests.length === 0 && (
            <div className="py-24 text-center">
              <div className="w-20 h-20 bg-white/[0.02] border border-white/[0.03] rounded-full flex items-center justify-center mx-auto mb-6 text-slate-700">
                <Search size={32} />
              </div>
              <h3 className="text-lg font-black text-slate-500 uppercase tracking-widest mb-2">No s'han trobat expedients</h3>
              <p className="text-sm text-slate-600 font-medium">Prova amb altres paràmetres de cerca o crea un de nou.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
