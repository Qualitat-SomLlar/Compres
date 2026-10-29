import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Euro, 
  ArrowUpRight,
  ShieldAlert,
  Building,
  Building2,
  PlusCircle,
  FileText,
  AlertTriangle,
  ChevronRight,
  Layers,
  Sparkles,
  Users,
  Award,
  ArrowRight,
  CheckCircle,
  ExternalLink,
  Tag
} from 'lucide-react';
import { CATEGORIES, STATUS_LABELS } from '../constants';
import { cn } from '../lib/utils';
import { useRequests } from '../hooks/useRequests';
import { useSuppliers } from '../hooks/useSuppliers';
import { useAreas } from '../hooks/useAreas';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import StatusBadge from '../components/StatusBadge';
import { workflowService } from '../services/workflowService';

const DONUT_COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#64748b'];

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: string;
  trendType?: 'positive' | 'warning' | 'neutral';
  colorClass: string;
  bgGradient?: string;
  isAlert?: boolean;
}

const KpiCard = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  trendType = 'positive', 
  colorClass, 
  bgGradient = 'from-brand-primary/10 to-transparent',
  isAlert 
}: KpiCardProps) => (
  <div className={cn(
    "card p-6 relative overflow-hidden group cursor-default transition-all duration-300 hover:shadow-2xl hover:-translate-y-0.5",
    isAlert && "border-red-500/30 bg-red-500/[0.03]"
  )}>
    <div className={cn("absolute top-0 right-0 w-32 h-32 bg-gradient-to-br blur-2xl opacity-40 group-hover:opacity-70 transition-opacity rounded-full -mr-10 -mt-10", bgGradient)} />
    
    <div className="relative z-10 flex items-start justify-between">
      <div className="space-y-2">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{title}</p>
        <h3 className="text-3xl font-black text-text-main tracking-tight">{value}</h3>
        {subtitle && (
          <p className="text-xs text-slate-500 font-medium">{subtitle}</p>
        )}
        {trend && (
          <div className={cn(
            "flex items-center gap-1.5 mt-2 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full w-fit",
            trendType === 'positive' && "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
            trendType === 'warning' && "bg-amber-500/10 text-amber-400 border border-amber-500/20",
            trendType === 'neutral' && "bg-slate-500/10 text-slate-400 border border-slate-500/20"
          )}>
            <span>{trend}</span>
          </div>
        )}
      </div>
      <div className={cn("p-3.5 rounded-2xl transition-all duration-300 group-hover:scale-110 shadow-lg", colorClass)}>
        <Icon size={24} />
      </div>
    </div>
  </div>
);

export default function Dashboard() {
  const { requests, stats, loading: loadingRequests } = useRequests();
  const { suppliers } = useSuppliers();
  const { areas, getAreaName } = useAreas();
  const { user } = useAuth();
  const { theme } = useTheme();

  const [activeChartTab, setActiveChartTab] = useState<'category' | 'area'>('category');

  // Saluda i data formatejada
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    const name = user?.name ? user.name.split(' ')[0] : 'Compres';
    if (hour < 14) return `Bon dia, ${name}`;
    if (hour < 20) return `Bona tarda, ${name}`;
    return `Bona nit, ${name}`;
  }, [user]);

  const currentDateString = useMemo(() => {
    return new Date().toLocaleDateString('ca-ES', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }, []);

  // Mètriques de flux de validació
  const pipelineStats = useMemo(() => {
    const pendentsCoordinacio = requests.filter(r => r.status === 'pendent_coordinacio').length;
    const pendentsDireccio = requests.filter(r => r.status === 'pendent_direccio').length;
    const pendentsFinances = requests.filter(r => r.status === 'pendent_finances').length;
    const aprovades = requests.filter(r => r.status === 'aprovada').length;
    const comandaEmesa = requests.filter(r => r.status === 'comanda_emesa').length;
    const finalitzades = requests.filter(r => ['rebuda', 'tancada'].includes(r.status)).length;
    const incidencies = requests.filter(r => ['retornada', 'rebutjada', 'incidencia'].includes(r.status)).length;
    
    const totalPendents = pendentsCoordinacio + pendentsDireccio + pendentsFinances;

    // Despesa adjudicada real vs estimada
    const totalEstimated = requests.reduce((acc, r) => acc + (r.estimatedAmount || 0), 0);
    const totalAwarded = requests
      .filter(r => ['comanda_emesa', 'rebuda', 'tancada'].includes(r.status))
      .reduce((acc, r) => acc + (r.finalAmount !== undefined ? r.finalAmount : (r.estimatedAmount || 0)), 0);

    return {
      pendentsCoordinacio,
      pendentsDireccio,
      pendentsFinances,
      aprovades,
      comandaEmesa,
      finalitzades,
      incidencies,
      totalPendents,
      totalEstimated,
      totalAwarded
    };
  }, [requests]);

  // Distribució per a gràfic donut
  const statusData = useMemo(() => {
    const pendents = pipelineStats.totalPendents;
    const tramitacio = pipelineStats.aprovades + pipelineStats.comandaEmesa;
    const finalitzades = pipelineStats.finalitzades;
    const retornades = pipelineStats.incidencies;
    const esborranys = requests.filter(r => r.status === 'esborrany').length;

    const result = [
      { name: 'Pendents Validació', value: pendents, color: '#f59e0b' },
      { name: 'En Tramitació / Comanda', value: tramitacio, color: '#3b82f6' },
      { name: 'Finalitzades', value: finalitzades, color: '#10b981' },
      { name: 'Retornades / Incidències', value: retornades, color: '#ef4444' },
      { name: 'Esborranys', value: esborranys, color: '#64748b' },
    ].filter(item => item.value > 0);

    return result.length > 0 ? result : [{ name: 'Sense dades', value: 1, color: '#334155' }];
  }, [requests, pipelineStats]);

  // Gràfic de despesa per Categoria
  const categoryChartData = useMemo(() => {
    return CATEGORIES.map(cat => {
      const catRequests = requests.filter(r => r.category === cat.id);
      const totalAmount = catRequests.reduce((acc, r) => acc + ((r.finalAmount ?? r.estimatedAmount) || 0), 0);
      return {
        name: cat.name,
        import: Math.round(totalAmount),
        count: catRequests.length
      };
    }).filter(d => d.import > 0).sort((a, b) => b.import - a.import);
  }, [requests]);

  // Gràfic de despesa per Àrea
  const areaChartData = useMemo(() => {
    const areaMap: Record<string, { name: string; import: number; count: number }> = {};
    
    // Inicialitzar àrees conegudes
    areas.forEach(a => {
      areaMap[a.id] = { name: a.name, import: 0, count: 0 };
    });

    requests.forEach(r => {
      const areaKey = r.areaId || 'sense_area';
      const amount = (r.finalAmount ?? r.estimatedAmount) || 0;
      if (!areaMap[areaKey]) {
        areaMap[areaKey] = { name: getAreaName(areaKey), import: 0, count: 0 };
      }
      areaMap[areaKey].import += amount;
      areaMap[areaKey].count += 1;
    });

    return Object.values(areaMap)
      .filter(d => d.import > 0)
      .map(d => ({ ...d, import: Math.round(d.import) }))
      .sort((a, b) => b.import - a.import);
  }, [requests, areas, getAreaName]);

  // Sol·licituds que requereixen atenció prioritària
  const priorityRequests = useMemo(() => {
    return requests
      .filter(r => {
        if (['tancada', 'rebutjada'].includes(r.status)) return false;
        // Urgència alta/crítica o pendent d'aprovació
        return r.urgency === 'alta' || r.urgency === 'critica' || ['pendent_coordinacio', 'pendent_direccio', 'pendent_finances', 'retornada'].includes(r.status);
      })
      .sort((a, b) => {
        // Ordenar: primer crítiques/altes, després data
        const urgencyScore = { critica: 4, alta: 3, mitjana: 2, baixa: 1 };
        const scoreA = urgencyScore[a.urgency || 'mitjana'] || 2;
        const scoreB = urgencyScore[b.urgency || 'mitjana'] || 2;
        if (scoreA !== scoreB) return scoreB - scoreA;
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      })
      .slice(0, 5);
  }, [requests]);

  // Indicadors de proveïdors
  const supplierStats = useMemo(() => {
    const total = suppliers.length;
    const homologats = suppliers.filter(s => s.status === 'homologat').length;
    const percentHomologats = total > 0 ? Math.round((homologats / total) * 100) : 100;
    
    const rated = suppliers.filter(s => typeof s.rating === 'number' && s.rating > 0);
    const avgRating = rated.length > 0
      ? Math.round(rated.reduce((acc, s) => acc + s.rating, 0) / rated.length)
      : (total > 0 ? 92 : 100);

    return {
      total,
      homologats,
      percentHomologats,
      avgRating
    };
  }, [suppliers]);

  const tooltipBg = theme === 'dark' ? '#151c2c' : '#ffffff';
  const tooltipBorder = theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const tooltipText = theme === 'dark' ? '#f3f4f6' : '#0f172a';

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-700">
      
      {/* 1. HERO BANNER DE BENVINGUDA I ACCIONS RÀPIDES */}
      <div className="card relative overflow-hidden p-8 md:p-10 border-brand-primary/20 bg-gradient-to-br from-brand-primary/10 via-dashboard-bg/40 to-transparent">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-primary/10 blur-[100px] -mr-32 -mt-32 rounded-full pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <span className="px-3 py-1 rounded-full bg-brand-primary/15 border border-brand-primary/30 text-brand-primary text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                <Sparkles size={12} /> Som Llar · Gestió Integral
              </span>
              <span className="text-[11px] font-bold text-slate-400 capitalize">
                {currentDateString}
              </span>
            </div>
            
            <h1 className="text-3xl md:text-4xl font-black text-text-main tracking-tight">
              {greeting}
            </h1>
            
            <p className="text-xs md:text-sm text-slate-400 max-w-2xl font-medium leading-relaxed">
              Resum operatiu en temps real del circuit de compres, validacions de despesa i gestió de proveïdors.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {workflowService.canCreateRequest(user ?? undefined) && (
              <Link 
                to="/compres/nova" 
                className="btn-primary flex items-center gap-2 py-3 px-5 text-xs font-black uppercase tracking-wider shadow-lg shadow-brand-primary/20 hover:scale-[1.02] transition-transform"
              >
                <PlusCircle size={16} />
                <span>Nova Sol·licitud</span>
              </Link>
            )}

            <Link 
              to="/compres" 
              className="btn-secondary flex items-center gap-2 py-3 px-5 text-xs font-black uppercase tracking-wider hover:bg-white/10 transition-colors"
            >
              <FileText size={16} />
              <span>Tots els Expedients</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. GRID PRINCIPAL DE KPIS EXECUTIUS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard 
          title="Volum Econòmic Gestionat" 
          value={`${pipelineStats.totalEstimated.toLocaleString('ca-ES')} €`} 
          subtitle={`Adjudicat: ${pipelineStats.totalAwarded.toLocaleString('ca-ES')} €`}
          icon={Euro} 
          trend="Total estimat"
          trendType="neutral"
          colorClass="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
          bgGradient="from-emerald-500/20 to-transparent"
        />

        <KpiCard 
          title="Total Expedients" 
          value={requests.length} 
          subtitle={`${pipelineStats.finalitzades} finalitzats · ${requests.length - pipelineStats.finalitzades} actius`}
          icon={TrendingUp} 
          trend="+12% respecte mes ant."
          trendType="positive"
          colorClass="bg-blue-500/15 text-blue-400 border border-blue-500/30"
          bgGradient="from-blue-500/20 to-transparent"
        />

        <KpiCard 
          title="Pendents de Validació" 
          value={pipelineStats.totalPendents} 
          subtitle={`Coord: ${pipelineStats.pendentsCoordinacio} · Dir: ${pipelineStats.pendentsDireccio} · Fin: ${pipelineStats.pendentsFinances}`}
          icon={Clock} 
          trend={pipelineStats.totalPendents > 0 ? "Requereix revisió" : "Tot al dia"}
          trendType={pipelineStats.totalPendents > 0 ? "warning" : "positive"}
          colorClass="bg-amber-500/15 text-amber-400 border border-amber-500/30"
          bgGradient="from-amber-500/20 to-transparent"
        />

        <KpiCard 
          title="Compres d'Alta Urgència" 
          value={stats.urgentCount} 
          subtitle="Peticions amb prioritat alta o crítica"
          icon={AlertCircle} 
          trend={stats.urgentCount > 0 ? "Prioritari" : "Sense urgències"}
          trendType={stats.urgentCount > 0 ? "warning" : "positive"}
          colorClass="bg-red-500/15 text-red-400 border border-red-500/30"
          bgGradient="from-red-500/20 to-transparent"
          isAlert={stats.urgentCount > 0}
        />
      </div>

      {/* 3. FLUX DEL CIRCUIT DE VALIDACIÓ (WORKFLOW FUNNEL) */}
      <div className="card p-6 md:p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-dashboard-border">
          <div className="space-y-1">
            <h3 className="text-xs font-black uppercase tracking-[0.25em] text-slate-400 flex items-center gap-2">
              <Layers size={16} className="text-brand-primary" /> Circuit d'Aprovació i Estat dels Expedients
            </h3>
            <p className="text-xs text-slate-500 font-medium">Distribució dels expedients actius a través de la jerarquia d'aprovació corporativa.</p>
          </div>
          <Link to="/compres" className="text-xs font-bold text-brand-primary hover:underline flex items-center gap-1">
            <span>Gestionar expedients</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Pas 1: Esborrany / Nova */}
          <Link 
            to="/compres" 
            className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-brand-primary/40 hover:bg-brand-primary/[0.02] transition-all group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">N1 · Creades</span>
              <span className="w-2 h-2 rounded-full bg-slate-500" />
            </div>
            <p className="text-2xl font-black text-text-main group-hover:text-brand-primary transition-colors">
              {requests.filter(r => r.status === 'esborrany').length}
            </p>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">Esborranys</p>
          </Link>

          {/* Pas 2: Coordinació */}
          <Link 
            to="/compres" 
            className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-amber-500/40 hover:bg-amber-500/[0.02] transition-all group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">N2 · Coordinació</span>
              <span className={cn("w-2 h-2 rounded-full", pipelineStats.pendentsCoordinacio > 0 ? "bg-amber-500 animate-pulse" : "bg-slate-600")} />
            </div>
            <p className="text-2xl font-black text-text-main group-hover:text-amber-400 transition-colors">
              {pipelineStats.pendentsCoordinacio}
            </p>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">Pendent validar</p>
          </Link>

          {/* Pas 3: Direcció Àrea */}
          <Link 
            to="/compres" 
            className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-orange-500/40 hover:bg-orange-500/[0.02] transition-all group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">N3 · Direcció</span>
              <span className={cn("w-2 h-2 rounded-full", pipelineStats.pendentsDireccio > 0 ? "bg-orange-500 animate-pulse" : "bg-slate-600")} />
            </div>
            <p className="text-2xl font-black text-text-main group-hover:text-orange-400 transition-colors">
              {pipelineStats.pendentsDireccio}
            </p>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">Pendent validar</p>
          </Link>

          {/* Pas 4: Finances */}
          <Link 
            to="/compres" 
            className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-purple-500/40 hover:bg-purple-500/[0.02] transition-all group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">N4 · Finances</span>
              <span className={cn("w-2 h-2 rounded-full", pipelineStats.pendentsFinances > 0 ? "bg-purple-500 animate-pulse" : "bg-slate-600")} />
            </div>
            <p className="text-2xl font-black text-text-main group-hover:text-purple-400 transition-colors">
              {pipelineStats.pendentsFinances}
            </p>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">Pendent aprovar</p>
          </Link>

          {/* Pas 5: Comanda Emesa */}
          <Link 
            to="/compres" 
            className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-blue-500/40 hover:bg-blue-500/[0.02] transition-all group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">N5 · Comanda</span>
              <span className="w-2 h-2 rounded-full bg-blue-500" />
            </div>
            <p className="text-2xl font-black text-text-main group-hover:text-blue-400 transition-colors">
              {pipelineStats.comandaEmesa + pipelineStats.aprovades}
            </p>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">Emesa / En curs</p>
          </Link>

          {/* Pas 6: Finalitzades */}
          <Link 
            to="/compres" 
            className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-emerald-500/40 hover:bg-emerald-500/[0.02] transition-all group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Finalitzades</span>
              <CheckCircle size={12} className="text-emerald-400" />
            </div>
            <p className="text-2xl font-black text-text-main group-hover:text-emerald-400 transition-colors">
              {pipelineStats.finalitzades}
            </p>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">Rebudes / Tancades</p>
          </Link>
        </div>
      </div>

      {/* 4. BLOC D'ANALÍTICA I GRÀFICS (CATEGORIES & ESTATS) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Gràfic de barres interactiu (per categoria o per àrea) */}
        <div className="card p-6 md:p-8 lg:col-span-2 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-dashboard-border">
            <div>
              <h4 className="text-base font-bold text-text-main">Distribució Econòmica de la Despesa</h4>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Visualització per categories de producte o departaments d'imputació.</p>
            </div>
            
            <div className="flex items-center bg-white/5 p-1 rounded-xl border border-white/5 self-start sm:self-auto">
              <button 
                onClick={() => setActiveChartTab('category')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                  activeChartTab === 'category' 
                    ? "bg-brand-primary text-white shadow-sm" 
                    : "text-slate-400 hover:text-white"
                )}
              >
                Categories
              </button>
              <button 
                onClick={() => setActiveChartTab('area')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                  activeChartTab === 'area' 
                    ? "bg-brand-primary text-white shadow-sm" 
                    : "text-slate-400 hover:text-white"
                )}
              >
                Àrees
              </button>
            </div>
          </div>

          <div className="h-80 w-full min-h-[320px]">
            {activeChartTab === 'category' ? (
              categoryChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryChartData} margin={{ top: 10, right: 10, left: 0, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                    <XAxis 
                      dataKey="name" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false} 
                      stroke="#94a3b8" 
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                    />
                    <YAxis 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false} 
                      stroke="#94a3b8" 
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k€`} 
                    />
                    <Tooltip 
                      cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                      contentStyle={{ 
                        backgroundColor: tooltipBg, 
                        borderRadius: '16px', 
                        border: `1px solid ${tooltipBorder}`, 
                        color: tooltipText,
                        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5)' 
                      }}
                      formatter={(val: any) => [`${Number(val).toLocaleString('ca-ES')} €`, 'Import']}
                    />
                    <Bar dataKey="import" fill="#10b981" radius={[8, 8, 0, 0]} barSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs">
                  <Tag size={32} className="mb-2 opacity-30" />
                  <p>Encara no hi ha dades de despesa per categoria.</p>
                </div>
              )
            ) : (
              areaChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={areaChartData} margin={{ top: 10, right: 10, left: 0, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                    <XAxis 
                      dataKey="name" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false} 
                      stroke="#94a3b8" 
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                    />
                    <YAxis 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false} 
                      stroke="#94a3b8" 
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k€`} 
                    />
                    <Tooltip 
                      cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                      contentStyle={{ 
                        backgroundColor: tooltipBg, 
                        borderRadius: '16px', 
                        border: `1px solid ${tooltipBorder}`, 
                        color: tooltipText,
                        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5)' 
                      }}
                      formatter={(val: any) => [`${Number(val).toLocaleString('ca-ES')} €`, 'Import']}
                    />
                    <Bar dataKey="import" fill="#3b82f6" radius={[8, 8, 0, 0]} barSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs">
                  <Building2 size={32} className="mb-2 opacity-30" />
                  <p>Encara no hi ha dades de despesa per àrea.</p>
                </div>
              )
            )}
          </div>
        </div>

        {/* Estat de les Sol·licituds (Donut) */}
        <div className="card p-6 md:p-8 flex flex-col justify-between space-y-6">
          <div className="pb-2 border-b border-dashboard-border">
            <h4 className="text-base font-bold text-text-main">Distribució d'Estats</h4>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Estat global dels expedients.</p>
          </div>

          <div className="h-56 w-full min-h-[220px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={85}
                  paddingAngle={6}
                  dataKey="value"
                  stroke="none"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={(entry as any).color || DONUT_COLORS[index % DONUT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: tooltipBg, 
                    borderRadius: '12px', 
                    border: `1px solid ${tooltipBorder}`,
                    color: tooltipText 
                  }}
                  formatter={(val: any) => [`${val} expedients`, 'Quantitat']}
                />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Etiqueta central del donut */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black text-text-main">{requests.length}</span>
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Expedients</span>
            </div>
          </div>

          {/* Llegenda personalitzada compacta */}
          <div className="space-y-2 pt-2 border-t border-dashboard-border">
            {statusData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-400 truncate text-[11px] font-medium">{item.name}</span>
                </div>
                <span className="font-bold text-text-main text-xs shrink-0">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5. SECCIÓ D'EXPEDIENTS QUE REQUEREIXEN ATENCIÓ */}
      <div className="card p-6 md:p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-dashboard-border">
          <div className="space-y-1">
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-text-main flex items-center gap-2.5">
              <AlertCircle size={18} className="text-amber-500" /> Expedients que Requereixen Atenció Urgent
            </h3>
            <p className="text-xs text-slate-500 font-medium">Peticions pendents de validació prioritàries o marcades amb urgència alta.</p>
          </div>
          
          <Link 
            to="/compres" 
            className="text-xs font-black uppercase tracking-wider text-brand-primary hover:underline flex items-center gap-1.5"
          >
            <span>Veure tots ({requests.length})</span>
            <ChevronRight size={14} />
          </Link>
        </div>

        {priorityRequests.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-dashboard-border text-[10px] font-black uppercase tracking-widest text-slate-500">
                  <th className="py-3 px-4">Codi</th>
                  <th className="py-3 px-4">Descripció del bé o servei</th>
                  <th className="py-3 px-4">Sol·licitant</th>
                  <th className="py-3 px-4">Àrea</th>
                  <th className="py-3 px-4">Urgència</th>
                  <th className="py-3 px-4">Import</th>
                  <th className="py-3 px-4">Estat actual</th>
                  <th className="py-3 px-4 text-right">Acció</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dashboard-border text-xs">
                {priorityRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="py-3.5 px-4 font-mono font-bold text-brand-primary">
                      {req.code || req.id}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-text-main max-w-xs truncate">
                      {req.itemDescription || 'Sense descripció'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {req.requestingTechnicianName || req.createdByUserName || 'N/A'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-white/5 text-slate-300 text-[10px] font-bold">
                        {getAreaName(req.areaId)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={cn(
                        "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider",
                        req.urgency === 'critica' && "bg-red-500/15 text-red-400 border border-red-500/30",
                        req.urgency === 'alta' && "bg-amber-500/15 text-amber-400 border border-amber-500/30",
                        req.urgency === 'mitjana' && "bg-blue-500/15 text-blue-400 border border-blue-500/30",
                        req.urgency === 'baixa' && "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
                      )}>
                        {req.urgency || 'mitjana'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-black text-text-main">
                      {((req.finalAmount ?? req.estimatedAmount) || 0).toLocaleString('ca-ES')} €
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={req.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link 
                        to={`/compres/${req.id}`}
                        className="btn-secondary py-1.5 px-3 text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 group-hover:bg-brand-primary group-hover:text-white group-hover:border-brand-primary transition-all"
                      >
                        <span>Revisar</span>
                        <ChevronRight size={12} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center bg-white/[0.01] rounded-2xl border border-white/5 space-y-2">
            <CheckCircle2 size={32} className="mx-auto text-emerald-400 opacity-60" />
            <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">Tot al dia!</p>
            <p className="text-xs text-slate-500">No hi ha sol·licituds que requereixin atenció urgent en aquest moment.</p>
          </div>
        )}
      </div>

      {/* 6. INDICADORS DE GESTIÓ DE PROVEÏDORS I COMPLIANCE */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <Building size={16} className="text-brand-primary" /> Qualitat de la Cadena de Subministrament
            </h3>
            <p className="text-xs text-slate-500 font-medium">Homologació de proveïdors i nivell d'avaluació de qualitat.</p>
          </div>
          
          <Link to="/proveidors" className="text-xs font-bold text-brand-primary hover:underline flex items-center gap-1">
            <span>Directori de proveïdors</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <KpiCard 
            title="Proveïdors Homologats" 
            value={`${supplierStats.percentHomologats}%`} 
            subtitle={`${supplierStats.homologats} de ${supplierStats.total} empreses homologades`}
            icon={CheckCircle2} 
            trend="Control d'homologació"
            trendType="positive"
            colorClass="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
          />

          <KpiCard 
            title="Avaluació Mitjana" 
            value={`${supplierStats.avgRating}/100`} 
            subtitle="Puntuació tècnica i de qualitat dels serveis"
            icon={Award} 
            trend="Qualitat i compliment"
            trendType="positive"
            colorClass="bg-blue-500/15 text-blue-400 border border-blue-500/30"
          />

          <KpiCard 
            title="Empreses Registrades" 
            value={supplierStats.total} 
            subtitle="Cens corporatiu de proveïdors a Som Llar"
            icon={Building2} 
            trend="Cens de subministraments"
            trendType="neutral"
            colorClass="bg-purple-500/15 text-purple-400 border border-purple-500/30"
          />
        </div>
      </div>

    </div>
  );
}
