import React from 'react';
import { STATUS_LABELS } from '../constants';
import { RequestStatus } from '../types';

interface StatusBadgeProps {
  status: RequestStatus;
  className?: string;
}

export default function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const config = STATUS_LABELS[status] || { label: status, color: 'bg-white/10 text-slate-400' };
  
  const themeClasses: Record<string, string> = {
    pendent_coordinacio: 'badge-pending',
    pendent_direccio: 'badge-pending',
    pendent_administracio: 'badge-pending',
    pendent_finances: 'badge-pending',
    pendent_3_pressupostos: 'badge-pending',
    pendent_comparativa: 'badge-pending',
    aprovada: 'badge-success',
    rebutjada: 'badge-danger',
    retornada: 'badge-danger',
    incidencia: 'badge-danger',
    comanda_emesa: 'bg-blue-500/20 text-blue-500 border-blue-500/20',
    rebuda: 'bg-indigo-500/20 text-indigo-500 border-indigo-500/20',
    tancada: 'bg-slate-500/20 text-slate-500 border-slate-500/20',
    esborrany: 'bg-slate-700/50 text-slate-400 border-slate-600/50',
    enviada: 'bg-brand-primary/20 text-brand-primary border-brand-primary/20'
  };

  const badgeClass = themeClasses[status] || config.color || 'bg-white/10 text-slate-400';

  return (
    <span className={`badge shrink-0 text-[10px] py-1 px-3 ${badgeClass} ${className}`}>
      {config.label ? config.label.toUpperCase() : status.toUpperCase()}
    </span>
  );
}
