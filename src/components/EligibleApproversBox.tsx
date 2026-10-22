import { AlertTriangle, CheckCircle, Users as UsersIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { PurchaseRequest, User } from '../types';
import { workflowService } from '../services/workflowService';

type EligibleApprovers = NonNullable<ReturnType<typeof workflowService.getEligibleApprovers>>;

interface EligibleApproversBoxProps {
  eligibleApprovers: EligibleApprovers;
  isCurrentUserApprover: boolean | undefined;
  canApprove: boolean;
  user: User;
  request: PurchaseRequest;
  getAreaName: (areaId?: string) => string;
}

export function EligibleApproversBox({ eligibleApprovers, isCurrentUserApprover, canApprove, user, request, getAreaName }: EligibleApproversBoxProps) {
  return (
    <div className={cn(
      "p-5 rounded-2xl border transition-all mb-6 space-y-3",
      !eligibleApprovers.hasCover 
        ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
        : isCurrentUserApprover || canApprove
          ? "bg-brand-primary/10 border-brand-primary/30"
          : "bg-white/[0.02] border-white/5"
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <UsersIcon size={16} className={isCurrentUserApprover || canApprove ? "text-brand-primary" : !eligibleApprovers.hasCover ? "text-amber-400" : "text-slate-400"} />
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">
            Torn de Validació: <span className="text-white">{eligibleApprovers.roleName}</span>
          </span>
        </div>
        <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-white/5 text-slate-400">
          Nivell {eligibleApprovers.levelNumber}
        </span>
      </div>

      <p className="text-[10px] text-slate-400 leading-relaxed">
        {eligibleApprovers.scopeDescription}
      </p>

      {eligibleApprovers.hasCover ? (
        <div className="space-y-2 pt-1 border-t border-white/5">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">
            Treballadors/es amb potestat ({eligibleApprovers.users.length}):
          </p>
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {eligibleApprovers.users.map(approver => {
              const isMe = approver.id === user.id;
              return (
                <div 
                  key={approver.id}
                  className={cn(
                    "flex items-center justify-between p-2.5 rounded-xl border text-xs transition-colors",
                    isMe 
                      ? "bg-brand-primary/15 border-brand-primary/40 text-white font-bold" 
                      : "bg-white/[0.02] border-white/5 text-slate-300"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black uppercase shrink-0",
                      isMe ? "bg-brand-primary text-black" : "bg-slate-800 text-slate-300"
                    )}>
                      {(approver.name || 'U').charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs truncate">{approver.name || 'Usuari'} {isMe && <span className="text-brand-primary text-[10px] ml-1 font-black">(Tu)</span>}</p>
                      <p className="text-[9px] text-slate-500 truncate">{approver.email}</p>
                    </div>
                  </div>
                  {approver.areaId && (
                    <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-white/5 text-slate-400 uppercase tracking-wider shrink-0 ml-2">
                      {getAreaName(approver.areaId)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
          <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-400" />
          <div>
            <p className="font-bold text-[11px]">Sense treballador assignat</p>
            <p className="text-[10px] text-amber-200/80 mt-0.5 leading-relaxed">
              No hi ha cap treballador actiu amb el rol "{eligibleApprovers.roleName}" assignat a l'àrea {getAreaName(request.areaId || 'social')}. Cal donar d'alta o assignar aquest càrrec des del panell d'Administració.
            </p>
          </div>
        </div>
      )}

      {canApprove && (
        <div className="p-2.5 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center gap-2 text-brand-primary text-[10px] font-black uppercase tracking-wider">
          <CheckCircle size={14} />
          <span>Tens autorització activa per signar aquest expedient</span>
        </div>
      )}
    </div>
  );
}
