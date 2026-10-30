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
import { CATEGORIES, STATUS_LABELS, normalizeAreaId } from '../constants';
import { cn } from '../lib/utils';
import { useRequests } from '../hooks/useRequests';
import { useSuppliers } from '../hooks/useSuppliers';
import { useAreas } from '../hooks/useAreas';
import { useCenters } from '../hooks/useCenters';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import StatusBadge from '../components/StatusBadge';
import { workflowService } from '../services/workflowService';
import { averagePhaseDurations, getStuckRequests, getCurrentPhaseLabel } from '../services/metricsService';
import { PurchaseRequest, RequestStatus } from '../types';

const DONUT_COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#64748b'];

// Imports: els esborranys i les rebutjades no són despesa
const NOT_SPENDING: RequestStatus[] = ['esborrany', 'rebutjada'];
const COMMITTED: RequestStatus[] = ['aprovada', 'comanda_emesa', 'rebuda', 'tancada'];
const EXECUTED: RequestStatus[] = ['comanda_emesa', 'rebuda', 'tancada'];
const IN_VALIDATION: RequestStatus[] = ['pendent_coordinacio', 'pendent_direccio', 'pendent_finances'];
const amountOf = (r: PurchaseRequest) => (r.finalAmount ?? r.estimatedAmount) || 0;
const yearOf = (r: PurchaseRequest) => String(new Date(r.createdAt || 0).getFullYear());
const formatEuros = (value: number) => `${Math.round(value).toLocaleString('ca-ES')} €`;
const MY_TASKS_SHOWN = 6;
const STUCK_THRESHOLD_DAYS = 3;
const STUCK_SHOWN = 6;

// Fases del circuit amb qui en té la responsabilitat
const FUNNEL_STEPS: { status: RequestStatus; owner: string; label: string; color: string }[] = [
  { status: 'esborrany', owner: 'Esborrany', label: 'Sense enviar', color: 'text-slate-500' },
  { status: 'pendent_coordinacio', owner: 'N2 · Coordinació', label: 'Pendent validar', color: 'text-amber-500' },
  { status: 'pendent_direccio', owner: 'N3 · Direcció', label: 'Pendent validar', color: 'text-orange-400' },
  { status: 'pendent_finances', owner: 'N4 · Finances', label: 'Pendent aprovar', color: 'text-purple-400' },
  { status: 'aprovada', owner: 'N5 · Compres', label: 'Pendent comanda', color: 'text-cyan-400' },
  { status: 'comanda_emesa', owner: 'Centre', label: 'Pendent recepció', color: 'text-blue-400' },
  { status: 'rebuda', owner: 'Comptabilitat', label: 'Pendent factura', color: 'text-teal-400' },
  { status: 'tancada', owner: 'Tancades', label: 'Finalitzades', color: 'text-emerald-400' },
];

// Fora del circuit normal: una retornada continua viva, una rebutjada s'ha acabat
const EXCEPTION_STEPS: { status: RequestStatus; label: string; hint: string; color: string; box: string }[] = [
  { status: 'retornada', label: 'Retornades', hint: 'El sol·licitant ha d\'esmenar-les', color: 'text-amber-400', box: 'bg-amber-500/[0.04] border-amber-500/20' },
  { status: 'rebutjada', label: 'Rebutjades', hint: 'Finalitzades sense compra', color: 'text-red-400', box: 'bg-red-500/[0.04] border-red-500/20' },
  { status: 'incidencia', label: 'Incidències', hint: 'Seguiment de Compres (N5)', color: 'text-rose-400', box: 'bg-rose-500/[0.04] border-rose-500/20' },
];

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
  const { requests: allRequests, loading: loadingRequests } = useRequests();
  const { suppliers } = useSuppliers();
  const { areas, getAreaName } = useAreas();
  const { centers } = useCenters();
  const { user } = useAuth();
  const { theme } = useTheme();

  const [activeChartTab, setActiveChartTab] = useState<'category' | 'area'>('category');
  const currentYear = String(new Date().getFullYear());
  const [yearFilter, setYearFilter] = useState<string>(currentYear);
  const [areaFilter, setAreaFilter] = useState<string>('all');

  const yearOptions = useMemo(() => {
    const years = new Set<string>([currentYear, ...allRequests.map(yearOf)]);
    return Array.from(years).filter(y => y !== 'NaN' && y !== '1970').sort((a, b) => b.localeCompare(a));
  }, [allRequests, currentYear]);

  const matchesArea = (r: PurchaseRequest) =>
    areaFilter === 'all' || normalizeAreaId(r.areaId) === normalizeAreaId(areaFilter);

  // Expedients de l'exercici i l'àrea triats: tots els indicadors i gràfics es calculen sobre aquests
  const requests = useMemo(
    () => allRequests.filter(r => (yearFilter === 'all' || yearOf(r) === yearFilter) && matchesArea(r)),
    [allRequests, yearFilter, areaFilter]
  );

  const previousYearCount = useMemo(() => {
    if (yearFilter === 'all') return 0;
    const previous = String(Number(yearFilter) - 1);
    return allRequests.filter(r => yearOf(r) === previous && matchesArea(r)).length;
  }, [allRequests, yearFilter, areaFilter]);

  // Expedients que esperen una acció de l'usuari (no depenen dels filtres: una tasca antiga continua pendent)
  const myTasks = useMemo(() => {
    if (!user) return [];
    return allRequests
      .filter(r => workflowService.isTaskOwner(user, r, centers.find(c => c.id === r.destinationCenterId)?.responsibleEmails))
      .sort((a, b) => new Date(a.updatedAt || 0).getTime() - new Date(b.updatedAt || 0).getTime());
  }, [allRequests, user, centers]);

  const phaseDurations = useMemo(() => averagePhaseDurations(requests), [requests]);
  const slowestPhaseDays = Math.max(0, ...phaseDurations.map(p => p.avgDays));
  const stuckRequests = useMemo(() => getStuckRequests(requests, STUCK_THRESHOLD_DAYS), [requests]);

  const daysWaiting = (r: PurchaseRequest) =>
    Math.max(0, Math.floor((Date.now() - new Date(r.updatedAt || r.createdAt || Date.now()).getTime()) / 86400000));

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
    const rebudes = requests.filter(r => r.status === 'rebuda').length;
    const finalitzades = requests.filter(r => r.status === 'tancada').length;
    const retornades = requests.filter(r => r.status === 'retornada').length;
    const rebutjades = requests.filter(r => r.status === 'rebutjada').length;
    const incidencies = requests.filter(r => r.status === 'incidencia').length;
    
    const totalPendents = pendentsCoordinacio + pendentsDireccio + pendentsFinances;

    // Imports: compromès (aprovat o més enllà), executat (amb comanda) i en validació
    const sumOf = (statuses: RequestStatus[]) =>
      requests.filter(r => statuses.includes(r.status)).reduce((acc, r) => acc + amountOf(r), 0);
    const totalCommitted = sumOf(COMMITTED);
    const totalExecuted = sumOf(EXECUTED);
    const totalInValidation = sumOf(IN_VALIDATION);
    const urgentCount = requests.filter(r =>
      (r.urgency === 'alta' || r.urgency === 'critica') && !['tancada', 'rebutjada', 'esborrany'].includes(r.status)
    ).length;

    return {
      pendentsCoordinacio,
      pendentsDireccio,
      pendentsFinances,
      aprovades,
      comandaEmesa,
      rebudes,
      finalitzades,
      retornades,
      rebutjades,
      incidencies,
      totalPendents,
      totalCommitted,
      totalExecuted,
      totalInValidation,
      urgentCount
    };
  }, [requests]);

  // Distribució per a gràfic donut
  const statusData = useMemo(() => {
    const pendents = pipelineStats.totalPendents;
    const tramitacio = pipelineStats.aprovades + pipelineStats.comandaEmesa + pipelineStats.rebudes;
    const esborranys = requests.filter(r => r.status === 'esborrany').length;

    const result = [
      { name: 'Pendents Validació', value: pendents, color: '#f59e0b' },
      { name: 'Comanda / Recepció / Factura', value: tramitacio, color: '#3b82f6' },
      { name: 'Tancades', value: pipelineStats.finalitzades, color: '#10b981' },
      { name: 'Retornades', value: pipelineStats.retornades, color: '#f97316' },
      { name: 'Rebutjades', value: pipelineStats.rebutjades, color: '#ef4444' },
      { name: 'Incidències', value: pipelineStats.incidencies, color: '#e11d48' },
      { name: 'Esborranys', value: esborranys, color: '#64748b' },
    ].filter(item => item.value > 0);

    return result.length > 0 ? result : [{ name: 'Sense dades', value: 1, color: '#334155' }];
  }, [requests, pipelineStats]);

  // Gràfic de despesa per Categoria
  const categoryChartData = useMemo(() => {
    return CATEGORIES.map(cat => {
      const catRequests = requests.filter(r => r.category === cat.id && !NOT_SPENDING.includes(r.status));
      const totalAmount = catRequests.reduce((acc, r) => acc + amountOf(r), 0);
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

    requests.filter(r => !NOT_SPENDING.includes(r.status)).forEach(r => {
      const areaKey = r.areaId || 'sense_area';
      const amount = amountOf(r);
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

      {/* 1b. EXPEDIENTS QUE ESPEREN UNA ACCIÓ DE L'USUARI */}
      <div className="card p-6 md:p-8 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-text-main flex items-center gap-2.5">
            <CheckCircle size={18} className="text-brand-primary" /> Et toca a tu
            <span className="px-2 py-0.5 rounded-full bg-brand-primary/15 text-brand-primary text-[11px] tracking-normal">{myTasks.length}</span>
          </h3>
          {myTasks.length > MY_TASKS_SHOWN && (
            <Link to="/compres" className="text-xs font-bold text-brand-primary flex items-center gap-1 hover:underline">
              Veure'ls tots <ChevronRight size={14} />
            </Link>
          )}
        </div>
        {myTasks.length === 0 ? (
          <p className="text-sm text-slate-400 flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-400" /> No tens cap expedient pendent d'actuar.
          </p>
        ) : (
          <div className="divide-y divide-dashboard-border">
            {myTasks.slice(0, MY_TASKS_SHOWN).map(r => {
              const days = daysWaiting(r);
              return (
                <Link
                  key={r.id}
                  to={`/compres/${r.id}`}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 py-3 group"
                >
                  <span className="text-[11px] font-black text-brand-primary tracking-wider shrink-0 w-28">{r.code || r.id}</span>
                  <span className="text-sm text-text-main font-semibold truncate flex-1 min-w-0">{r.itemDescription}</span>
                  <StatusBadge status={r.status} className="shrink-0" />
                  <span className={cn("text-[11px] font-bold shrink-0 w-20", days >= 3 ? "text-amber-400" : "text-slate-500")}>
                    {days === 0 ? 'Avui' : `Fa ${days} ${days === 1 ? 'dia' : 'dies'}`}
                  </span>
                  <span className="btn-primary text-[10px] font-black uppercase tracking-wider py-1.5 px-3 flex items-center gap-1 shrink-0 w-fit">
                    {workflowService.getTaskActionLabel(r.status)} <ArrowRight size={12} />
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* 1c. FILTRES D'EXERCICI I ÀREA */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Indicadors de</span>
        <select
          className="input-field w-auto py-2 text-xs"
          value={yearFilter}
          onChange={e => setYearFilter(e.target.value)}
          aria-label="Exercici"
        >
          {yearOptions.map(y => <option key={y} value={y}>Exercici {y}</option>)}
          <option value="all">Tots els exercicis</option>
        </select>
        <select
          className="input-field w-auto py-2 text-xs"
          value={areaFilter}
          onChange={e => setAreaFilter(e.target.value)}
          aria-label="Àrea"
        >
          <option value="all">Totes les àrees</option>
          {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <span className="text-[11px] text-slate-500">{requests.length} expedients</span>
      </div>

      {/* 2. GRID PRINCIPAL DE KPIS EXECUTIUS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard
          title="Import Compromès"
          value={formatEuros(pipelineStats.totalCommitted)}
          subtitle={`Executat: ${formatEuros(pipelineStats.totalExecuted)} · En validació: ${formatEuros(pipelineStats.totalInValidation)}`}
          icon={Euro}
          trend="Aprovat o amb comanda"
          trendType="neutral"
          colorClass="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
          bgGradient="from-emerald-500/20 to-transparent"
        />

        <KpiCard 
          title="Total Expedients" 
          value={requests.length} 
          subtitle={`${pipelineStats.finalitzades} tancats · ${pipelineStats.rebutjades} rebutjats · ${requests.length - pipelineStats.finalitzades - pipelineStats.rebutjades} actius`}
          icon={TrendingUp} 
          trend={yearFilter !== 'all' && previousYearCount > 0
            ? `${requests.length >= previousYearCount ? '+' : ''}${Math.round(((requests.length - previousYearCount) / previousYearCount) * 100)}% respecte ${Number(yearFilter) - 1}`
            : undefined}
          trendType="neutral"
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
          value={pipelineStats.urgentCount}
          subtitle="Actives amb prioritat alta o crítica"
          icon={AlertCircle}
          trend={pipelineStats.urgentCount > 0 ? "Prioritari" : "Sense urgències"}
          trendType={pipelineStats.urgentCount > 0 ? "warning" : "positive"}
          colorClass="bg-red-500/15 text-red-400 border border-red-500/30"
          bgGradient="from-red-500/20 to-transparent"
          isAlert={pipelineStats.urgentCount > 0}
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

        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
          {FUNNEL_STEPS.map(step => {
            const count = requests.filter(r => r.status === step.status).length;
            return (
              <Link
                key={step.status}
                to="/compres"
                className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-brand-primary/40 transition-all group flex flex-col justify-between"
              >
                <span className={cn("text-[10px] font-black uppercase tracking-widest mb-2", step.color)}>{step.owner}</span>
                <p className="text-2xl font-black text-text-main group-hover:text-brand-primary transition-colors">{count}</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">{step.label}</p>
              </Link>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {EXCEPTION_STEPS.map(step => (
            <div key={step.status} className={cn("px-4 py-3 rounded-2xl border flex items-center justify-between gap-3", step.box)}>
              <div>
                <p className={cn("text-[10px] font-black uppercase tracking-widest", step.color)}>{step.label}</p>
                <p className="text-[11px] text-slate-500">{step.hint}</p>
              </div>
              <span className="text-xl font-black text-text-main">{requests.filter(r => r.status === step.status).length}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 3b. TEMPS PER FASE I EXPEDIENTS ATURATS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6 md:p-8 space-y-5">
          <div className="space-y-1">
            <h4 className="text-base font-bold text-text-main flex items-center gap-2"><Clock size={16} className="text-brand-primary" /> Temps mitjà per fase</h4>
            <p className="text-xs text-slate-500">Dies laborables que han passat els expedients a cada fase ja completada.</p>
          </div>
          <div className="space-y-3">
            {phaseDurations.map(phase => {
              const isBottleneck = phase.count > 0 && phase.avgDays === slowestPhaseDays && slowestPhaseDays > 0;
              return (
                <div key={phase.status} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className={cn("font-bold", isBottleneck ? "text-amber-400" : "text-slate-300")}>
                      {phase.label}{isBottleneck && ' · coll d\'ampolla'}
                    </span>
                    <span className="text-slate-400">
                      {phase.count > 0 ? `${phase.avgDays.toLocaleString('ca-ES', { maximumFractionDigits: 1 })} dies` : 'Sense dades'}
                      {phase.count > 0 && <span className="text-slate-500"> · {phase.count} exp.</span>}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-white/[0.04] overflow-hidden">
                    <div
                      className={cn("h-full rounded-full", isBottleneck ? "bg-amber-500" : "bg-brand-primary")}
                      style={{ width: `${slowestPhaseDays > 0 ? Math.max(4, (phase.avgDays / slowestPhaseDays) * 100) : 0}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card p-6 md:p-8 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <h4 className="text-base font-bold text-text-main flex items-center gap-2"><AlertTriangle size={16} className="text-amber-400" /> Expedients aturats</h4>
              <p className="text-xs text-slate-500">Porten {STUCK_THRESHOLD_DAYS} dies laborables o més sense avançar de fase.</p>
            </div>
            <span className={cn("px-2.5 py-1 rounded-full text-xs font-black", stuckRequests.length > 0 ? "bg-amber-500/15 text-amber-400" : "bg-emerald-500/15 text-emerald-400")}>
              {stuckRequests.length}
            </span>
          </div>
          {stuckRequests.length === 0 ? (
            <p className="text-sm text-slate-400 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-400" /> Cap expedient aturat.
            </p>
          ) : (
            <div className="divide-y divide-dashboard-border">
              {stuckRequests.slice(0, STUCK_SHOWN).map(({ request: r, days }) => (
                <Link key={r.id} to={`/compres/${r.id}`} className="flex items-center gap-3 py-2.5 group">
                  <span className="text-[11px] font-black text-brand-primary tracking-wider shrink-0 w-24">{r.code || r.id}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-text-main font-semibold truncate">{r.itemDescription}</p>
                    <p className="text-[11px] text-slate-500">{getCurrentPhaseLabel(r.status)}</p>
                  </div>
                  <span className="text-[11px] font-black text-amber-400 shrink-0">{days} dies</span>
                  <ChevronRight size={14} className="text-slate-500 group-hover:text-brand-primary shrink-0" />
                </Link>
              ))}
            </div>
          )}
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
