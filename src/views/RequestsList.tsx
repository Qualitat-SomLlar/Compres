import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  Plus, 
  ArrowUpRight, 
  FileText,
  Building2,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Users,
  ShieldCheck,
  X,
  Layers,
  Sparkles,
  RefreshCw,
  Download
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import { useRequests } from '../hooks/useRequests';
import { useAreas } from '../hooks/useAreas';
import { useAuth } from '../contexts/AuthContext';
import { STATUS_LABELS, normalizeAreaId } from '../constants';
import { workflowService } from '../services/workflowService';
import { exportService } from '../services/exportService';
import { User, RequestStatus } from '../types';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';

type TabView = 'all' | 'my_turn' | 'my_requests' | 'pending' | 'closed';

interface RequestsListProps {
  user?: User;
}

export default function RequestsList({ user: propUser }: RequestsListProps) {
  const { user: authUser } = useAuth();
  const user = propUser || authUser;

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<TabView>('all');
  const [areaFilter, setAreaFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [complianceFilter, setComplianceFilter] = useState<string>('all');

  const { requests } = useRequests();
  const { areas, getAreaName } = useAreas();

  // Obtenir àrees presents al sistema
  const availableAreas = useMemo(() => {
    const map = new Map<string, string>();
    areas.forEach(a => map.set(normalizeAreaId(a.id), a.name));
    requests.forEach(r => {
      if (r.areaId) {
        const norm = normalizeAreaId(r.areaId);
        if (!map.has(norm)) {
          map.set(norm, getAreaName(norm));
        }
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [areas, requests, getAreaName]);

  // Comptadors per pestanya
  const counts = useMemo(() => {
    let myTurnCount = 0;
    let myRequestsCount = 0;
    let pendingCount = 0;
    let closedCount = 0;

    requests.forEach(r => {
      if (user && workflowService.canUserApprove(user, r) && !['tancada', 'rebutjada'].includes(r.status)) {
        myTurnCount++;
      }
      if (user && (r.createdByUserId === user.id || r.requestingTechnicianId === user.id)) {
        myRequestsCount++;
      }
      if (['pendent_coordinacio', 'pendent_direccio', 'pendent_finances'].includes(r.status)) {
        pendingCount++;
      }
      if (['aprovada', 'comanda_emesa', 'rebuda', 'tancada'].includes(r.status)) {
        closedCount++;
      }
    });

    return {
      all: requests.length,
      my_turn: myTurnCount,
      my_requests: myRequestsCount,
      pending: pendingCount,
      closed: closedCount
    };
  }, [requests, user]);

  // Filtratge complet
  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      // 1. Filtre per Pestanya
      if (activeTab === 'my_turn') {
        if (!user || !workflowService.canUserApprove(user, r) || ['tancada', 'rebutjada'].includes(r.status)) {
          return false;
        }
      } else if (activeTab === 'my_requests') {
        if (!user || (r.createdByUserId !== user.id && r.requestingTechnicianId !== user.id)) {
          return false;
        }
      } else if (activeTab === 'pending') {
        if (!['pendent_coordinacio', 'pendent_direccio', 'pendent_finances'].includes(r.status)) {
          return false;
        }
      } else if (activeTab === 'closed') {
        if (!['aprovada', 'comanda_emesa', 'rebuda', 'tancada'].includes(r.status)) {
          return false;
        }
      }

      // 2. Filtre per Àrea
      if (areaFilter !== 'all' && normalizeAreaId(r.areaId) !== normalizeAreaId(areaFilter)) {
        return false;
      }

      // 3. Filtre per Estat
      if (statusFilter !== 'all' && r.status !== statusFilter) {
        return false;
      }

      // 4. Filtre per Compliance / Urgència
      if (complianceFilter === 'three_quotes' && !r.requiresThreeQuotes) {
        return false;
      }
      if (complianceFilter === 'urgent' && r.urgency !== 'alta') {
        return false;
      }

      // 5. Cerca per Text (Codi PR-YYYY-XXX, ID, Descripció, Tècnic, Creador, Proveïdor, Projecte, Codi Analític)
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesCode = (r.code || '').toLowerCase().includes(term);
        const matchesId = r.id.toLowerCase().includes(term);
        const matchesDesc = (r.itemDescription || '').toLowerCase().includes(term);
        const matchesTech = (r.requestingTechnicianName || '').toLowerCase().includes(term);
        const matchesCreator = (r.createdByUserName || '').toLowerCase().includes(term);
        const matchesSupplier = (r.supplierName || '').toLowerCase().includes(term);
        const matchesProject = (r.projectId || '').toLowerCase().includes(term);
        const matchesAnalytic = (r.analyticCode || '').toLowerCase().includes(term);

        if (!matchesCode && !matchesId && !matchesDesc && !matchesTech && !matchesCreator && !matchesSupplier && !matchesProject && !matchesAnalytic) {
          return false;
        }
      }

      return true;
    });
  }, [requests, activeTab, areaFilter, statusFilter, complianceFilter, searchTerm, user]);

  const hasActiveFilters = searchTerm !== '' || areaFilter !== 'all' || statusFilter !== 'all' || complianceFilter !== 'all';

  const resetFilters = () => {
    setSearchTerm('');
    setAreaFilter('all');
    setStatusFilter('all');
    setComplianceFilter('all');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Capçalera */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-primary/10 rounded-xl text-brand-primary">
              <FileText size={22} />
            </div>
            <div>
              <h2 className="text-3xl font-black text-white tracking-tighter">Flux d'Expedients</h2>
              <p className="text-xs text-slate-500 font-medium mt-1">Supervisa i gestiona el cicle de vida complet de compres per àrea i jerarquia.</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (filteredRequests.length === 0) {
                toast.error("No hi ha expedients per exportar");
                return;
              }
              exportService.exportRequestsToExcel(filteredRequests);
              toast.success(`Exportats ${filteredRequests.length} expedients a Excel`);
            }}
            className="btn-secondary flex items-center gap-2 py-3 px-4 text-xs font-black tracking-widest uppercase hover:border-emerald-500 hover:text-emerald-400"
            title="Exportar la selecció actual a Excel"
          >
            <Download size={15} />
            <span>Exportar Excel</span>
          </button>

          <Link to="/compres/nova" className="btn-primary flex items-center gap-2.5 py-3 px-6 text-xs font-black tracking-widest uppercase shadow-xl shadow-brand-primary/10">
            <Plus size={16} />
            <span>Nova Sol·licitud</span>
          </Link>
        </div>
      </div>

      {/* Pestanyes de Vistes Ràpides */}
      <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-white/5 no-scrollbar">
        <button
          onClick={() => setActiveTab('all')}
          className={cn(
            "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
            activeTab === 'all' 
              ? "bg-brand-primary text-black shadow-lg shadow-brand-primary/20" 
              : "bg-white/[0.02] text-slate-400 hover:text-white hover:bg-white/5"
          )}
        >
          <Layers size={14} />
          <span>Tots els Expedients</span>
          <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-black", activeTab === 'all' ? "bg-black/20 text-black" : "bg-white/5 text-slate-400")}>
            {counts.all}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('my_turn')}
          className={cn(
            "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all relative",
            activeTab === 'my_turn' 
              ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20" 
              : "bg-white/[0.02] text-slate-400 hover:text-white hover:bg-white/5",
            counts.my_turn > 0 && activeTab !== 'my_turn' && "border border-emerald-500/30 text-emerald-400"
          )}
        >
          <Sparkles size={14} />
          <span>El Meu Torn</span>
          <span className={cn(
            "text-[10px] px-2 py-0.5 rounded-full font-black",
            activeTab === 'my_turn' 
              ? "bg-black/20 text-black" 
              : counts.my_turn > 0 
                ? "bg-emerald-500/20 text-emerald-400 animate-pulse font-black" 
                : "bg-white/5 text-slate-400"
          )}>
            {counts.my_turn}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('my_requests')}
          className={cn(
            "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
            activeTab === 'my_requests' 
              ? "bg-brand-primary text-black shadow-lg shadow-brand-primary/20" 
              : "bg-white/[0.02] text-slate-400 hover:text-white hover:bg-white/5"
          )}
        >
          <Users size={14} />
          <span>Les Meves Compres</span>
          <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-black", activeTab === 'my_requests' ? "bg-black/20 text-black" : "bg-white/5 text-slate-400")}>
            {counts.my_requests}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('pending')}
          className={cn(
            "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
            activeTab === 'pending' 
              ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20" 
              : "bg-white/[0.02] text-slate-400 hover:text-white hover:bg-white/5"
          )}
        >
          <Clock size={14} />
          <span>Pendents d'Aprovació</span>
          <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-black", activeTab === 'pending' ? "bg-black/20 text-black" : "bg-white/5 text-slate-400")}>
            {counts.pending}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('closed')}
          className={cn(
            "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
            activeTab === 'closed' 
              ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20" 
              : "bg-white/[0.02] text-slate-400 hover:text-white hover:bg-white/5"
          )}
        >
          <CheckCircle2 size={14} />
          <span>Finalitzades / Tancades</span>
          <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-black", activeTab === 'closed' ? "bg-black/20 text-white" : "bg-white/5 text-slate-400")}>
            {counts.closed}
          </span>
        </button>
      </div>

      {/* Barra de Cerca i Filtres Específics */}
      <div className="card p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Cerca de text lliure */}
          <div className="relative group lg:col-span-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand-primary transition-colors" size={15} />
            <input 
              type="text" 
              placeholder="Cerca codi PR, descripció, sol·licitant..." 
              className="input-field text-xs pl-10 py-2.5 w-full bg-white/[0.02] border-white/5 focus:border-brand-primary"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filtre per Àrea */}
          <div>
            <select
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              className="input-field text-xs py-2.5 bg-white/[0.02] border-white/5 focus:border-brand-primary w-full"
            >
              <option value="all">Totes les Àrees</option>
              {availableAreas.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          {/* Filtre per Estat */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field text-xs py-2.5 bg-white/[0.02] border-white/5 focus:border-brand-primary w-full"
            >
              <option value="all">Tots els Estats</option>
              {Object.entries(STATUS_LABELS).map(([key, item]) => (
                <option key={key} value={key}>{item.label}</option>
              ))}
            </select>
          </div>

          {/* Filtre de Compliance / Urgència */}
          <div className="flex gap-2">
            <select
              value={complianceFilter}
              onChange={(e) => setComplianceFilter(e.target.value)}
              className="input-field text-xs py-2.5 bg-white/[0.02] border-white/5 focus:border-brand-primary flex-1"
            >
              <option value="all">Tota Prioritat / Tipus</option>
              <option value="three_quotes">Només &gt; 5.000 € (3 Ofertes)</option>
              <option value="urgent">Només Crítics / Urgents</option>
            </select>

            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                title="Restablir filtres"
                className="p-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
              >
                <RefreshCw size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Indicador de resultats filtrats */}
        <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider pt-2 border-t border-white/[0.03]">
          <span>Mostrant {filteredRequests.length} de {requests.length} expedients</span>
          {hasActiveFilters && (
            <button onClick={resetFilters} className="text-brand-primary hover:underline">
              Netejar filtres actius
            </button>
          )}
        </div>
      </div>

      {/* Taula de Sol·licituds */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/[0.03] bg-white/[0.01]">
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Expedient / Temps</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Sol·licitant i Àrea</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Bé o Servei</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Import Estimat</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-center">Estat</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-right">Acció</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.02]">
              {filteredRequests.map((request) => {
                const isMyTurn = user && workflowService.canUserApprove(user, request) && !['tancada', 'rebutjada'].includes(request.status);

                return (
                  <tr 
                    key={request.id} 
                    className={cn(
                      "transition-colors group",
                      isMyTurn ? "bg-emerald-500/[0.03] hover:bg-emerald-500/[0.07]" : "hover:bg-white/[0.01]"
                    )}
                  >
                    {/* Codi i data */}
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-white text-xs tracking-tight">
                          {request.code || request.id}
                        </span>
                        {isMyTurn && (
                          <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-widest animate-pulse shrink-0">
                            El teu torn
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                          {new Date(request.createdAt).toLocaleDateString('ca-ES')}
                        </span>
                        {/* SLA / Temps d'espera si està pendent */}
                        {request.status.startsWith('pendent_') && (() => {
                          const daysWaiting = Math.floor((Date.now() - new Date(request.updatedAt || request.createdAt).getTime()) / (1000 * 60 * 60 * 24));
                          if (daysWaiting >= 5) {
                            return (
                              <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 uppercase tracking-wider flex items-center gap-1" title="Més de 5 dies en aquesta fase">
                                <Clock size={9} /> {daysWaiting}d espera
                              </span>
                            );
                          }
                          if (daysWaiting >= 2) {
                            return (
                              <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider flex items-center gap-1" title="Més de 48h en aquesta fase">
                                <Clock size={9} /> {daysWaiting}d espera
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </td>

                    {/* Tècnic sol·licitant i Àrea */}
                    <td className="px-6 py-5">
                      <div className="text-xs font-black text-slate-300 group-hover:text-brand-primary transition-colors">
                        {request.requestingTechnicianName}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="inline-flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase tracking-wider bg-white/5 px-2 py-0.5 rounded border border-white/5">
                          <Building2 size={10} className="text-brand-primary" />
                          {getAreaName(request.areaId)}
                        </span>
                        {request.projectId && (
                          <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest truncate max-w-[120px]">
                            {request.projectId}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Bé o Servei */}
                    <td className="px-6 py-5 max-w-sm">
                      <div className="text-xs font-bold text-slate-300 line-clamp-1">
                        {request.itemDescription}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        {request.supplierName && (
                          <span className="text-[9px] text-brand-primary font-bold truncate max-w-[150px]">
                            ✓ {request.supplierName}
                          </span>
                        )}
                        {request.requiresThreeQuotes && (
                          <span className="flex items-center gap-1 text-[8px] font-black text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 uppercase tracking-widest">
                            <AlertTriangle size={9} /> &gt;5k€ (3 ofertes)
                          </span>
                        )}
                        {request.urgency === 'alta' && (
                          <span className="text-[8px] font-black text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20 uppercase tracking-widest">
                            Crític
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Import */}
                    <td className="px-6 py-5">
                      <div className="text-sm font-black text-white tracking-tighter">
                        {((request.finalAmount ?? request.estimatedAmount) || 0).toLocaleString()} <span className="text-slate-600 font-black text-[10px]">€</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[8px] text-slate-500 font-bold uppercase">
                          {request.finalAmount ? 'Adjudicat' : 'Estimat'}
                        </span>
                        {request.analyticCode && (
                          <span className="text-[8px] font-black text-brand-primary uppercase tracking-widest">
                            {request.analyticCode}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Estat */}
                    <td className="px-6 py-5 text-center">
                      <div className="flex justify-center">
                        <StatusBadge status={request.status} />
                      </div>
                    </td>

                    {/* Botó d'Acció */}
                    <td className="px-6 py-5 text-right">
                      <Link 
                        to={`/compres/${request.id}`} 
                        className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                          isMyTurn
                            ? "bg-emerald-500 text-black hover:bg-emerald-400 shadow-md shadow-emerald-500/20"
                            : "text-brand-primary hover:text-white bg-white/[0.02] hover:bg-white/5 border border-white/5"
                        )}
                      >
                        <span>{isMyTurn ? 'Validar' : 'Gestionar'}</span>
                        <ArrowUpRight size={13} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {filteredRequests.length === 0 && (
            <div className="py-20 text-center space-y-4">
              <div className="w-16 h-16 bg-white/[0.02] border border-white/[0.05] rounded-2xl flex items-center justify-center mx-auto text-slate-600">
                <Search size={28} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-white uppercase tracking-wider">No s'han trobat expedients</h3>
                <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto">
                  {hasActiveFilters 
                    ? "Cap sol·licitud coincideix amb els criteris de cerca o filtres aplicats."
                    : "Encara no hi ha cap sol·licitud en aquest apartat."}
                </p>
              </div>
              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="btn-secondary py-2 px-4 text-xs font-bold inline-flex items-center gap-2"
                >
                  <RefreshCw size={12} />
                  <span>Netejar filtres</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
