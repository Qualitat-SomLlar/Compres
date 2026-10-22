import { History, Loader2 } from 'lucide-react';
import { ActivityLog } from '../types';

interface RequestAuditHistoryProps {
  requestLogs: ActivityLog[];
  loadingLogs: boolean;
}

export function RequestAuditHistory({ requestLogs, loadingLogs }: RequestAuditHistoryProps) {
  return (
    <div className="card p-8 space-y-6">
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3">
          <History size={18} className="text-brand-primary" /> Historial de Canvis i Traçabilitat ({requestLogs.length})
        </h3>
        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
          Registre Inmutable
        </span>
      </div>

      {loadingLogs ? (
        <div className="py-8 flex items-center justify-center gap-3 text-slate-500 text-xs">
          <Loader2 size={16} className="animate-spin text-brand-primary" />
          <span>Carregant línia de temps d'auditoria...</span>
        </div>
      ) : requestLogs.length === 0 ? (
        <div className="py-8 text-center border border-dashed border-white/5 rounded-2xl">
          <p className="text-xs text-slate-500">Sense canvis posteriors registrats en aquest expedient.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requestLogs.map((log) => (
            <div key={log.id} className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 hover:border-white/10 transition-colors flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-white">{log.action}</span>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-brand-primary/10 text-brand-primary uppercase tracking-wider">
                    {log.userName}
                  </span>
                  {log.userRole && (
                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-white/5 text-slate-400 uppercase">
                      {log.userRole}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400">{log.details}</p>
              </div>
              <span className="text-[9px] font-medium text-slate-500 whitespace-nowrap tabular-nums">
                {new Date(log.createdAt).toLocaleString('ca-ES', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
