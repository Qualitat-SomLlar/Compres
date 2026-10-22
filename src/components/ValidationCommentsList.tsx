import { MessageCircle, User as UserIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { getHierarchyRole } from '../constants';

export interface ValidationCommentItem {
  id: string;
  title: string;
  author: string;
  role?: string;
  date?: string;
  comment: string;
  type: 'approval' | 'return' | 'reject' | 'note';
}

interface ValidationCommentsListProps {
  validationComments: ValidationCommentItem[];
}

export function ValidationCommentsList({ validationComments }: ValidationCommentsListProps) {
  return (
    <div className="space-y-3 mb-6">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <MessageCircle size={14} className="text-brand-primary" /> Comentaris de Validacions Prèvies ({validationComments.length})
        </span>
      </div>

      {validationComments.length > 0 ? (
        <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
          {validationComments.map((item) => (
            <div 
              key={item.id} 
              className={cn(
                "p-3 rounded-xl border text-xs space-y-1.5 transition-all",
                item.type === 'return' ? "bg-amber-500/10 border-amber-500/30 text-amber-200" :
                item.type === 'reject' ? "bg-red-500/10 border-red-500/30 text-red-200" :
                "bg-white/[0.03] border-white/10 text-slate-200"
              )}
            >
              <div className="flex items-center justify-between gap-2 text-[10px]">
                <span className="font-black text-brand-primary uppercase tracking-wider truncate">
                  {item.title}
                </span>
                {item.date && (
                  <span className="text-slate-500 text-[9px] shrink-0">
                    {new Date(item.date).toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
              <p className="text-[11px] leading-relaxed italic text-slate-300 whitespace-pre-wrap">
                "{item.comment}"
              </p>
              <div className="text-[9px] text-slate-400 font-bold flex items-center gap-1.5 pt-0.5">
                <UserIcon size={10} className="text-slate-500" />
                <span>{item.author} {item.role && <span className="opacity-75">({getHierarchyRole(item.role).label})</span>}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-[10px] text-slate-500 italic">
          Sense comentaris previs en aquesta sol·licitud.
        </div>
      )}
    </div>
  );
}
