import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  BarChart3, 
  Download, 
  Filter, 
  TrendingUp, 
  Clock, 
  AlertTriangle,
  FileSpreadsheet,
  Calendar,
  Search,
  ArrowUpRight,
  ChevronDown
} from 'lucide-react';
import { MOCK_REQUESTS } from '../lib/mockData';
import { STATUS_LABELS, CATEGORIES, AREAS } from '../constants';
import { cn } from '../lib/utils';
import { importExportService } from '../services/importExportService';
import { useRequests } from '../hooks/useRequests';
import { Loader2 } from 'lucide-react';

export default function Reports() {
  const { requests, loading } = useRequests();
  const [dateRange, setDateRange] = useState('all');
  const [selectedArea, setSelectedArea] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredData = useMemo(() => {
    return requests.filter(r => {
      const matchesSearch = r.itemDescription.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          r.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          r.requestingTechnicianName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesArea = selectedArea === 'all' || r.areaId === selectedArea;
      const matchesStatus = selectedStatus === 'all' || r.status === selectedStatus;
      return matchesSearch && matchesArea && matchesStatus;
    });
  }, [requests, searchTerm, selectedArea, selectedStatus]);

  const stats = useMemo(() => {
    const total = filteredData.length;
    const amount = filteredData.reduce((acc, curr) => acc + (curr.estimatedAmount || 0), 0);
    const critical = filteredData.filter(r => r.urgency === 'critica').length;
    // Lead time simulació (dies mitjans)
    const avgLeadTime = 4.2; 

    return [
      { label: 'Total Sol·licituds', value: total, icon: <BarChart3 className="text-blue-500" />, trend: '+12%' },
      { label: 'Import Acumulat', value: `${amount.toLocaleString()} €`, icon: <TrendingUp className="text-emerald-500" />, trend: '+5.4%' },
      { label: 'Temps mitjà (dies)', value: avgLeadTime, icon: <Clock className="text-amber-500" />, trend: '-0.8%' },
      { label: 'Alertes Crítiques', value: critical, icon: <AlertTriangle className="text-red-500" />, trend: 'Stable' },
    ];
  }, [filteredData]);

  const handleExportCSV = () => {
    const exportData = filteredData.map(r => ({
      'Codi': r.id,
      'Data': r.createdAt,
      'Estat': STATUS_LABELS[r.status].label,
      'Tècnic/a': r.requestingTechnicianName,
      'Àrea': r.areaId,
      'Descripció': r.itemDescription,
      'Import Estimat': r.estimatedAmount,
      'Proveïdor': r.supplierName || 'N/A'
    }));
    importExportService.exportToCSV(exportData, 'informe_compres_somllar.csv');
  };

  const handleExportExcel = () => {
    const exportData = filteredData.map(r => ({
      'Codi Sol·licitud': r.id,
      'Data de Creació': r.createdAt,
      'Estat Actual': STATUS_LABELS[r.status].label,
      'Tècnic/a Sol·licitant': r.requestingTechnicianName,
      'Introduïda per': r.createdByUserName,
      'Projecte': r.projectId,
      'Codi Analític': r.analyticCode,
      'Descripció de la Compra': r.itemDescription,
      'Import Estimat (€)': r.estimatedAmount,
      'Proveïdor': r.supplierName || 'Pendent'
    }));
    importExportService.exportToExcel(exportData, 'informe_compres_somllar.xlsx');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-4">
        <Loader2 className="animate-spin text-brand-primary" size={40} />
        <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Carregant dades...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tighter">Informes i Analítica</h2>
          <p className="text-slate-500 font-medium mt-2">Explora, filtra i exporta les dades de gestió de compres.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={handleExportCSV}
            className="btn-secondary flex items-center gap-2 text-[10px] font-black uppercase tracking-widest py-3 px-6"
          >
            <Download size={14} />
            <span>CSV</span>
          </button>
          <button 
            onClick={handleExportExcel}
            className="btn-primary flex items-center gap-2 text-[10px] font-black uppercase tracking-widest py-3 px-6"
          >
            <FileSpreadsheet size={14} />
            <span>Excel (XLSX)</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="card p-8 group hover:border-brand-primary/30 transition-all duration-500">
            <div className="flex items-center justify-between mb-6">
              <div className="p-3 bg-white/[0.02] border border-white/[0.05] rounded-2xl group-hover:scale-110 transition-transform">
                {stat.icon}
              </div>
              <span className={cn(
                "text-[10px] font-black px-2 py-0.5 rounded-full",
                stat.trend.startsWith('+') ? "bg-emerald-500/10 text-emerald-500" : 
                stat.trend.startsWith('-') ? "bg-blue-500/10 text-blue-500" : "bg-white/5 text-slate-500"
              )}>
                {stat.trend}
              </span>
            </div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{stat.label}</p>
            <p className="text-2xl font-black text-white tracking-tighter">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filters & Table */}
      <div className="card">
        <div className="p-6 border-b border-white/[0.05] flex flex-wrap items-center gap-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input 
              type="text" 
              placeholder="Cerca per descripció o codi..." 
              className="input-field pl-10 w-80 text-xs py-2.5"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3">
            <select 
              className="input-field text-xs py-2.5 px-4 pr-10 appearance-none bg-no-repeat bg-[right_1rem_center]"
              style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%2364748b\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'/%3E%3C/svg%3E")' }}
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
            >
              <option value="all">Totes les Àrees</option>
              {AREAS.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>

            <select 
              className="input-field text-xs py-2.5 px-4 pr-10 appearance-none bg-no-repeat bg-[right_1rem_center]"
              style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%2364748b\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'/%3E%3C/svg%3E")' }}
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="all">Tots els Estats</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/[0.05]">
                <th className="px-8 py-5">Codi</th>
                <th className="px-8 py-5">Projecte / Descripció</th>
                <th className="px-8 py-5">Tècnic/a</th>
                <th className="px-8 py-5">Import</th>
                <th className="px-8 py-5">Estat</th>
                <th className="px-8 py-5 text-right">Detalls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.02]">
              {filteredData.map((request) => (
                <tr key={request.id} className="group hover:bg-white/[0.01] transition-colors">
                  <td className="px-8 py-6">
                    <span className="text-xs font-black text-brand-primary">{request.id}</span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{request.projectId}</div>
                    <div className="text-xs font-bold text-white line-clamp-1">{request.itemDescription}</div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="text-xs font-bold text-slate-300">{request.requestingTechnicianName}</div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-widest">{request.areaId}</div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-xs font-black text-white">{request.estimatedAmount.toLocaleString()} €</span>
                  </td>
                  <td className="px-8 py-6">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase shadow-sm",
                      STATUS_LABELS[request.status]?.color || 'bg-slate-100 text-slate-800'
                    )}>
                      {STATUS_LABELS[request.status]?.label}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <Link to={`/compres/${request.id}`} className="inline-block p-2 bg-white/5 rounded-xl text-slate-500 hover:text-brand-primary transition-all">
                      <ArrowUpRight size={16} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredData.length === 0 && (
            <div className="py-24 text-center">
              <BarChart3 className="mx-auto text-slate-800 mb-4" size={48} />
              <h3 className="text-lg font-bold text-slate-400">No s'han trobat resultats</h3>
              <p className="text-sm text-slate-600 font-medium">Prova amb altres paràmetres de cerca o períodes.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
