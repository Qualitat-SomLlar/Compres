import React from 'react';
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
  Building
} from 'lucide-react';
import { CATEGORIES } from '../constants';
import { cn } from '../lib/utils';
import { useRequests } from '../hooks/useRequests';
import { useSuppliers } from '../hooks/useSuppliers';

const COLORS = ['#1e3a8a', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: string;
  colorClass: string;
  isAlert?: boolean;
}

const KpiCard = ({ title, value, icon: Icon, trend, colorClass, isAlert }: KpiCardProps) => (
  <div className={cn("stat-card card p-6 group cursor-default", isAlert && "stat-alert")}>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">{title}</p>
        <h3 className="text-3xl font-black text-white">{value}</h3>
        {trend && (
          <div className="flex items-center gap-1 mt-3 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full w-fit">
            <ArrowUpRight size={12} />
            <span>{trend}</span>
          </div>
        )}
      </div>
      <div className={cn("p-3 rounded-2xl transition-all duration-300 group-hover:scale-110 group-hover:rotate-6", colorClass)}>
        <Icon size={24} />
      </div>
    </div>
  </div>
);

export default function Dashboard() {
  const { requests, stats } = useRequests();
  const { suppliers } = useSuppliers();

  const statusData = React.useMemo(() => {
    const pendentsValidacio = requests.filter(r => 
      ['pendent_coordinacio', 'pendent_direccio', 'pendent_finances'].includes(r.status)
    ).length;

    const aprovadesITramitacio = requests.filter(r => 
      ['aprovada', 'comanda_emesa'].includes(r.status)
    ).length;

    const finalitzades = requests.filter(r => 
      ['rebuda', 'tancada'].includes(r.status)
    ).length;

    const retornadesRebutjades = requests.filter(r => 
      ['retornada', 'rebutjada', 'incidencia'].includes(r.status)
    ).length;

    const esborranys = requests.filter(r => 
      r.status === 'esborrany'
    ).length;

    const result = [
      { name: 'Pendents Validació', value: pendentsValidacio, color: '#f59e0b' },
      { name: 'En Tramitació', value: aprovadesITramitacio, color: '#3b82f6' },
      { name: 'Finalitzades', value: finalitzades, color: '#10b981' },
      { name: 'Incidències / Rebutjades', value: retornadesRebutjades, color: '#ef4444' },
      { name: 'Esborranys', value: esborranys, color: '#64748b' },
    ].filter(item => item.value > 0);

    return result.length > 0 ? result : [{ name: 'Sense sol·licituds', value: 1, color: '#334155' }];
  }, [requests]);

  const supplierStats = React.useMemo(() => {
    const total = suppliers.length;
    const homologats = suppliers.filter(s => s.status === 'homologat').length;
    const percentHomologats = total > 0 ? Math.round((homologats / total) * 100) : 100;
    
    const rated = suppliers.filter(s => typeof s.rating === 'number' && s.rating > 0);
    const avgRating = rated.length > 0
      ? Math.round(rated.reduce((acc, s) => acc + s.rating, 0) / rated.length)
      : (total > 0 ? 90 : 100);

    return {
      total,
      homologats,
      percentHomologats,
      avgRating
    };
  }, [suppliers]);

  const categoryData = React.useMemo(() => {
    return CATEGORIES.map(cat => ({
      name: cat.name,
      import: requests.filter(r => r.category === cat.id).reduce((acc, r) => acc + r.estimatedAmount, 0)
    })).filter(d => d.import > 0);
  }, [requests]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-brand-primary/10 rounded-xl text-brand-primary">
            <TrendingUp size={20} />
          </div>
          <h2 className="text-3xl font-black text-white tracking-tighter">Tauler de Control de Compres</h2>
        </div>
        <p className="text-sm text-slate-500 font-medium max-w-xl">Monitoratge de fluxos d'aprovació i gestió de pressupostos en temps real.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard 
          title="Total Sol·licituds" 
          value={stats.totalRequests} 
          icon={TrendingUp} 
          trend="+12% VS MES ANT."
          colorClass="bg-blue-500/10 text-blue-500"
        />
        <KpiCard 
          title="Import Estimat" 
          value={`${stats.totalSpend.toLocaleString()} €`} 
          icon={Euro} 
          colorClass="bg-emerald-500/10 text-emerald-500"
        />
        <KpiCard 
          title="Pendents d'Aprovació" 
          value={stats.pendingApprovals} 
          icon={Clock} 
          colorClass="bg-amber-500/10 text-amber-500"
        />
        <KpiCard 
          title="Compres Urgents" 
          value={stats.urgentCount} 
          icon={AlertCircle} 
          colorClass="bg-red-500/10 text-red-500"
          isAlert
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gràfic d'imports per categoria */}
        <div className="card p-8 lg:col-span-2">
          <div className="flex items-center justify-between mb-10">
            <h4 className="text-lg font-bold">Import per Categoria de Compra</h4>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full">DADES REALS</div>
          </div>
          <div className="h-80 w-full min-h-[320px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} stroke="#64748b" />
                <YAxis fontSize={11} tickLine={false} axisLine={false} stroke="#64748b" tickFormatter={(v) => `${v}€`} />
                <Tooltip 
                  cursor={{fill: 'rgba(255,255,255,0.02)'}}
                  contentStyle={{ backgroundColor: '#151c2c', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5)' }}
                />
                <Bar dataKey="import" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Estat de les sol·licituds */}
        <div className="card p-8">
          <h4 className="text-lg font-bold mb-10">Estat de les Sol·licituds</h4>
          <div className="h-64 w-full min-h-[256px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={90}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={(entry as any).color || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#151c2c', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{paddingTop: '20px', fontSize: '11px', fontWeight: 'bold'}} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Indicadors de Gestió de Proveïdors */}
      <h3 className="text-xl font-bold text-white pt-4">Indicadors de Qualitat i Proveïdors</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KpiCard 
          title="Proveïdors Homologats" 
          value={`${supplierStats.percentHomologats}%`} 
          icon={CheckCircle2} 
          trend={`${supplierStats.homologats} de ${supplierStats.total} homologats`}
          colorClass="bg-emerald-500/10 text-emerald-500"
        />
        <KpiCard 
          title="Qualitat i Satisfacció" 
          value={`${supplierStats.avgRating}/100`} 
          icon={TrendingUp} 
          trend="Avaluació mitjana"
          colorClass="bg-blue-500/10 text-blue-500"
        />
        <KpiCard 
          title="Total Registrats" 
          value={supplierStats.total} 
          icon={Building} 
          trend="Directori corporatiu"
          colorClass="bg-purple-500/10 text-purple-500"
        />
      </div>


    </div>
  );
}
