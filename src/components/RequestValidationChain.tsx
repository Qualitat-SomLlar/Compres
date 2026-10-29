import { AlertTriangle, CheckCircle2, Clock, MessageSquare, ShieldCheck, XCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { getHierarchyRole } from '../constants';
import { PurchaseRequest } from '../types';
import { workflowService } from '../services/workflowService';

interface RequestValidationChainProps {
  request: PurchaseRequest;
  getAreaName: (areaId?: string) => string;
  areaCoordinatorsLabel: string;
  areaDirectorsLabel: string;
  financeLabel: string;
}

export function RequestValidationChain({ request, getAreaName, areaCoordinatorsLabel, areaDirectorsLabel, financeLabel }: RequestValidationChainProps) {
  return (
    <div className="card p-8 md:p-10 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div>
          <h3 className="text-xs font-black text-white uppercase tracking-[0.25em] flex items-center gap-2.5">
            <ShieldCheck size={18} className="text-brand-primary" /> Cadena de Validacions i Comentaris Jeràrquics
          </h3>
          <p className="text-[10px] text-slate-500 mt-1">
            Flux d'autorització organitzativa: registre cronològic de decisions i observacions de cada nivell.
          </p>
        </div>
        <span className="text-[9px] font-black uppercase px-2.5 py-1 rounded-lg bg-white/5 text-slate-400 tracking-wider">
          Auditoria Oficial
        </span>
      </div>

      {/* Banner destacat si està retornada per esmena */}
      {(request.status === 'retornada' || request.lastReturnComment) && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-400" /> Expedient Retornat per Esmena
            </span>
            {request.lastReturnedAt && (
              <span className="text-[10px] text-amber-300/80">
                {new Date(request.lastReturnedAt).toLocaleString('ca-ES')}
              </span>
            )}
          </div>
          {request.lastReturnComment && (
            <p className="text-xs leading-relaxed italic bg-black/20 p-3 rounded-xl border border-amber-500/20">
              "{request.lastReturnComment}"
            </p>
          )}
          <p className="text-[10px] text-amber-400/90 font-bold">
            Retornat per: {request.lastReturnedBy || 'Validador/a'} {request.lastReturnedRole && `(${getHierarchyRole(request.lastReturnedRole).label})`}
          </p>
        </div>
      )}

      {/* Banner destacat si està rebutjada */}
      {(request.status === 'rebutjada' || request.rejectionComment) && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
              <XCircle size={16} className="text-red-400" /> Sol·licitud Rebutjada Definitivament
            </span>
            {request.rejectedAt && (
              <span className="text-[10px] text-red-300/80">
                {new Date(request.rejectedAt).toLocaleString('ca-ES')}
              </span>
            )}
          </div>
          {request.rejectionComment && (
            <p className="text-xs leading-relaxed italic bg-black/20 p-3 rounded-xl border border-red-500/20">
              "{request.rejectionComment}"
            </p>
          )}
          <p className="text-[10px] text-red-400/90 font-bold">
            Rebutjat per: {request.rejectedBy || 'Validador/a'} {request.rejectedRole && `(${getHierarchyRole(request.rejectedRole).label})`}
          </p>
        </div>
      )}

      {/* Fites de Validació en format targetes jeràrquiques */}
      <div className="space-y-4">
        {/* Nivell 1: Creació */}
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-black">1</div>
              <span className="text-xs font-bold text-white">Sol·licitud Registrada</span>
            </div>
            <span className="text-[10px] text-emerald-400 font-black uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 size={12} /> Completat
            </span>
          </div>
          <div className="text-[11px] text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
            <span>Sol·licitant: <strong className="text-slate-200">{request.requestingTechnicianName || 'N/A'}</strong></span>
            <span>Registrat per: <strong className="text-slate-200">{request.createdByUserName}</strong></span>
            <span>Data: <strong className="text-slate-200">{request.createdAt ? new Date(request.createdAt).toLocaleString('ca-ES') : 'N/A'}</strong></span>
          </div>
        </div>

        {/* Nivell 2: Coordinació */}
        <div className={cn(
          "p-4 rounded-2xl border space-y-2 transition-all",
          request.coordinationApprovedAt 
            ? "bg-white/[0.02] border-white/5" 
            : request.status === 'pendent_coordinacio'
              ? "bg-brand-primary/[0.03] border-brand-primary/30"
              : "bg-white/[0.01] border-white/[0.03] opacity-60"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black",
                request.coordinationApprovedAt ? "bg-emerald-500/20 text-emerald-400" :
                request.status === 'pendent_coordinacio' ? "bg-amber-500/20 text-amber-400" :
                "bg-slate-800 text-slate-500"
              )}>2</div>
              <span className="text-xs font-bold text-white">Validació de Coordinació</span>
              <span className="text-[10px] text-slate-500 font-normal">({getAreaName(request.areaId)})</span>
            </div>
            {request.coordinationApprovedAt ? (
              <span className="text-[10px] text-emerald-400 font-black uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 size={12} /> Validat
              </span>
            ) : request.status === 'pendent_coordinacio' ? (
              <span className="text-[10px] text-amber-400 font-black uppercase tracking-wider flex items-center gap-1">
                <Clock size={12} /> Pendent de validació
              </span>
            ) : (
              <span className="text-[10px] text-slate-600 font-black uppercase tracking-wider">{workflowService.isStepSkipped(request, 'pendent_coordinacio') ? 'No requerida' : 'Pendent'}</span>
            )}
          </div>

          {request.coordinationApprovedAt && (
            <div className="text-[11px] text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
              <span>Validat per: <strong className="text-slate-200">{request.coordinationApprovedBy || areaCoordinatorsLabel}</strong></span>
              <span>Data: <strong className="text-slate-200">{new Date(request.coordinationApprovedAt).toLocaleString('ca-ES')}</strong></span>
            </div>
          )}

          {request.coordinationComment && (
            <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl space-y-1">
              <p className="text-[10px] font-black text-brand-primary uppercase tracking-wider flex items-center gap-1">
                <MessageSquare size={10} /> Comentari de Coordinació:
              </p>
              <p className="text-xs text-slate-300 italic whitespace-pre-wrap">
                "{request.coordinationComment}"
              </p>
            </div>
          )}
        </div>

        {/* Nivell 3: Direcció d'Àrea */}
        <div className={cn(
          "p-4 rounded-2xl border space-y-2 transition-all",
          request.areaDirectionApprovedAt 
            ? "bg-white/[0.02] border-white/5" 
            : request.status === 'pendent_direccio'
              ? "bg-brand-primary/[0.03] border-brand-primary/30"
              : "bg-white/[0.01] border-white/[0.03] opacity-60"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black",
                request.areaDirectionApprovedAt ? "bg-emerald-500/20 text-emerald-400" :
                request.status === 'pendent_direccio' ? "bg-amber-500/20 text-amber-400" :
                "bg-slate-800 text-slate-500"
              )}>3</div>
              <span className="text-xs font-bold text-white">Validació de Direcció d'Àrea</span>
              <span className="text-[10px] text-slate-500 font-normal">({getAreaName(request.areaId)})</span>
            </div>
            {request.areaDirectionApprovedAt ? (
              <span className="text-[10px] text-emerald-400 font-black uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 size={12} /> Validat
              </span>
            ) : request.status === 'pendent_direccio' ? (
              <span className="text-[10px] text-amber-400 font-black uppercase tracking-wider flex items-center gap-1">
                <Clock size={12} /> Pendent de validació
              </span>
            ) : (
              <span className="text-[10px] text-slate-600 font-black uppercase tracking-wider">{workflowService.isStepSkipped(request, 'pendent_direccio') ? 'No requerida' : 'Pendent'}</span>
            )}
          </div>

          {request.areaDirectionApprovedAt && (
            <div className="text-[11px] text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
              <span>Validat per: <strong className="text-slate-200">{request.areaDirectionApprovedBy || areaDirectorsLabel}</strong></span>
              <span>Data: <strong className="text-slate-200">{new Date(request.areaDirectionApprovedAt).toLocaleString('ca-ES')}</strong></span>
            </div>
          )}

          {request.areaDirectionComment && (
            <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl space-y-1">
              <p className="text-[10px] font-black text-brand-primary uppercase tracking-wider flex items-center gap-1">
                <MessageSquare size={10} /> Comentari de Direcció d'Àrea:
              </p>
              <p className="text-xs text-slate-300 italic whitespace-pre-wrap">
                "{request.areaDirectionComment}"
              </p>
            </div>
          )}
        </div>

        {/* Nivell 4: Finances */}
        <div className={cn(
          "p-4 rounded-2xl border space-y-2 transition-all",
          request.financeApprovedAt 
            ? "bg-white/[0.02] border-white/5" 
            : request.status === 'pendent_finances'
              ? "bg-brand-primary/[0.03] border-brand-primary/30"
              : "bg-white/[0.01] border-white/[0.03] opacity-60"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black",
                request.financeApprovedAt ? "bg-emerald-500/20 text-emerald-400" :
                request.status === 'pendent_finances' ? "bg-amber-500/20 text-amber-400" :
                "bg-slate-800 text-slate-500"
              )}>4</div>
              <span className="text-xs font-bold text-white">Aprovació d'Administració i Finances</span>
            </div>
            {request.financeApprovedAt ? (
              <span className="text-[10px] text-emerald-400 font-black uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 size={12} /> Aprovat
              </span>
            ) : request.status === 'pendent_finances' ? (
              <span className="text-[10px] text-amber-400 font-black uppercase tracking-wider flex items-center gap-1">
                <Clock size={12} /> Pendent d'aprovació
              </span>
            ) : (
              <span className="text-[10px] text-slate-600 font-black uppercase tracking-wider">{workflowService.isStepSkipped(request, 'pendent_finances') ? 'No requerida' : 'Pendent'}</span>
            )}
          </div>

          {request.financeApprovedAt && (
            <div className="text-[11px] text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
              <span>Aprovat per: <strong className="text-slate-200">{request.financeApprovedBy || financeLabel}</strong></span>
              <span>Data: <strong className="text-slate-200">{new Date(request.financeApprovedAt).toLocaleString('ca-ES')}</strong></span>
            </div>
          )}

          {request.financeComment && (
            <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl space-y-1">
              <p className="text-[10px] font-black text-brand-primary uppercase tracking-wider flex items-center gap-1">
                <MessageSquare size={10} /> Comentari de Finances:
              </p>
              <p className="text-xs text-slate-300 italic whitespace-pre-wrap">
                "{request.financeComment}"
              </p>
            </div>
          )}
        </div>

        {/* Nivell 5: Emissió Formal de Comanda i Recepció */}
        {['comanda_emesa', 'rebuda', 'tancada'].includes(request.status) && (
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-black">5</div>
                <span className="text-xs font-bold text-white">Comanda Tramitada & Adjudicada</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-black uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 size={12} /> Emesa
              </span>
            </div>
            <div className="text-[11px] text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
              <span>Proveïdor adjudicat: <strong className="text-brand-primary">{request.supplierName || 'N/A'}</strong></span>
              <span>Import definitiu: <strong className="text-white">{((request.finalAmount ?? request.estimatedAmount) || 0).toLocaleString()}€</strong></span>
              {request.receivedAt && (
                <span>Recepció: <strong className="text-slate-200">{new Date(request.receivedAt).toLocaleDateString('ca-ES')}</strong></span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
