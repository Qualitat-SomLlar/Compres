import { useState } from 'react';
import { Loader2, MessagesSquare, Send, Trash2 } from 'lucide-react';
import { RequestComment, User } from '../types';
import { ROLE_LABELS } from '../constants';
import { COMMENT_MAX_LENGTH } from '../hooks/useRequestComments';

interface RequestCommentsSectionProps {
  comments: RequestComment[];
  loading: boolean;
  user: User;
  onSend: (text: string) => Promise<void>;
  onDelete: (comment: RequestComment) => void;
}

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// Fil de conversa de l'expedient: dubtes i aclariments sense haver de retornar-lo
export function RequestCommentsSection({ comments, loading, user, onSend, onDelete }: RequestCommentsSectionProps) {
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;
    setIsSending(true);
    try {
      await onSend(trimmed);
      setText('');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="card p-8 space-y-6">
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3">
          <MessagesSquare size={18} className="text-brand-primary" /> Comentaris ({comments.length})
        </h3>
        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
          Avisa el sol·licitant i qui l'ha de tramitar
        </span>
      </div>

      {loading ? (
        <div className="py-6 flex items-center justify-center gap-3 text-slate-500 text-xs">
          <Loader2 size={16} className="animate-spin text-brand-primary" />
          <span>Carregant comentaris...</span>
        </div>
      ) : comments.length === 0 ? (
        <p className="text-xs text-slate-500">
          Encara no hi ha comentaris. Fes servir aquest espai per aclarir dubtes sense haver de retornar l'expedient.
        </p>
      ) : (
        <div className="space-y-4">
          {comments.map(c => {
            const isOwn = c.userId === user.id;
            const canDelete = isOwn || user.role === 'superadmin';
            return (
              <div key={c.id} className="flex gap-3 group">
                <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-xs font-bold uppercase text-white ${isOwn ? 'bg-brand-primary' : 'bg-slate-600'}`}>
                  {(c.userName || '?').charAt(0)}
                </div>
                <div className="flex-1 min-w-0 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-xs font-bold text-white truncate">
                      {c.userName}
                      {c.userRole && <span className="ml-2 text-[10px] font-medium text-slate-500">{ROLE_LABELS[c.userRole] || c.userRole}</span>}
                    </p>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-slate-500">{formatDateTime(c.createdAt)}</span>
                      {canDelete && (
                        <button
                          onClick={() => onDelete(c)}
                          className="p-1 text-slate-600 hover:text-red-500 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                          title="Eliminar comentari"
                          aria-label="Eliminar comentari"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 whitespace-pre-line break-words">{c.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="space-y-2">
        <textarea
          className="input-field text-xs min-h-[80px]"
          placeholder="Escriu un comentari o una pregunta... (Ctrl+Retorn per enviar)"
          value={text}
          maxLength={COMMENT_MAX_LENGTH}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <div className="flex justify-end">
          <button
            onClick={handleSend}
            disabled={!text.trim() || isSending}
            className="btn-primary py-2 px-5 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 disabled:opacity-50"
          >
            {isSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Enviar comentari
          </button>
        </div>
      </div>
    </div>
  );
}
