import { AlertCircle, AlertTriangle, Award, CheckCircle, CheckCircle2, FileCheck, Loader2, Plus, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { Quote } from '../types';

interface RequestQuotesSectionProps {
  quotes: Quote[];
  loadingQuotes: boolean;
  canManageQuotes: boolean;
  isProcessing: boolean;
  setShowAddQuoteModal: (value: boolean) => void;
  handleSelectQuote: (quote: Quote) => void;
  handleDeleteQuote: (quoteId: string) => void;
}

export function RequestQuotesSection({ quotes, loadingQuotes, canManageQuotes, isProcessing, setShowAddQuoteModal, handleSelectQuote, handleDeleteQuote }: RequestQuotesSectionProps) {
  return (
    <div className="card ring-1 ring-amber-500/20 overflow-hidden shadow-2xl shadow-amber-500/5 space-y-6">
      <div className="px-10 py-6 bg-amber-500/[0.03] border-b border-amber-500/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-amber-500 font-black uppercase tracking-[0.2em] text-[10px]">
          <AlertCircle size={20} />
          <span>Anàlisi Comparatiu de Pressupostos (Compliance {'>'} 5.000 €)</span>
        </div>
        <div className="flex items-center gap-3">
          <span className={cn(
            "text-[9px] px-3 py-1 rounded-md font-black tracking-widest uppercase flex items-center gap-1.5",
            quotes.length >= 3 ? "bg-emerald-500 text-black" : "bg-amber-500 text-black"
          )}>
            {quotes.length >= 3 ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
            {quotes.length} de 3 Ofertes
          </span>
          {canManageQuotes && (
            <button
              onClick={() => setShowAddQuoteModal(true)}
              className="btn-primary py-1.5 px-4 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5"
            >
              <Plus size={14} />
              <span>Afegir Oferta</span>
            </button>
          )}
        </div>
      </div>

      {/* Informació de Compliance */}
      <div className="px-10">
        {quotes.length < 3 ? (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-3">
            <AlertTriangle size={18} className="shrink-0 text-amber-400" />
            <span>
              Normativa de contractació: És obligatori adjuntar un mínim de <strong>3 pressupostos comparatius</strong> per a compres iguals o superiors a 5.000 €. Falten {3 - quotes.length} pressupost(s).
            </span>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-3">
            <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />
            <span>
              Requisit de concurrència complert ({quotes.length} ofertes registrades). Selecciona l'oferta adjudicatària per fixar el proveïdor de l'expedient.
            </span>
          </div>
        )}
      </div>

      <div className="p-10 pt-0 overflow-x-auto">
        {loadingQuotes ? (
          <div className="py-12 flex items-center justify-center gap-3 text-slate-500 text-xs">
            <Loader2 size={18} className="animate-spin text-brand-primary" />
            <span>Carregant taula comparativa...</span>
          </div>
        ) : quotes.length === 0 ? (
          <div className="py-12 text-center border-2 border-dashed border-white/5 rounded-2xl">
            <FileCheck className="mx-auto text-slate-700 mb-3" size={32} />
            <p className="text-xs text-slate-400 font-bold">Encara no hi ha pressupostos registrats</p>
            <p className="text-[10px] text-slate-600 mt-1 uppercase tracking-widest">Prem sobre "Afegir Oferta" per introduir els pressupostos dels proveïdors.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-600 border-b border-white/[0.03]">
                <th className="pb-6 text-left font-black uppercase tracking-widest text-[9px]">Empresa Proveïdora</th>
                <th className="pb-6 px-4 text-center font-black uppercase tracking-widest text-[9px]">Quota (€)</th>
                <th className="pb-6 px-4 text-center font-black uppercase tracking-widest text-[9px]">Punt. Tècnica</th>
                <th className="pb-6 px-4 text-left font-black uppercase tracking-widest text-[9px]">Justificació</th>
                <th className="pb-6 text-right font-black uppercase tracking-widest text-[9px]">Estat / Acció</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.02]">
              {quotes.map((q) => (
                <tr key={q.id} className={cn("group transition-colors", q.isSelected && "bg-brand-primary/[0.04]")}>
                  <td className="py-6 font-bold text-white">
                    <div className="flex items-center gap-2">
                      {q.isSelected ? (
                        <CheckCircle size={16} className="text-brand-primary shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-slate-700 shrink-0" />
                      )}
                      <span>{q.supplierName}</span>
                    </div>
                  </td>
                  <td className="py-6 px-4 text-center font-black text-white text-base">
                    {((q.amount) || 0).toLocaleString()} €
                  </td>
                  <td className="py-6 px-4 text-center font-bold text-slate-400">
                    <span className={cn(
                      "px-2 py-1 rounded text-xs font-black",
                      q.technicalScore >= 8 ? "text-emerald-400 bg-emerald-500/10" : "text-amber-400 bg-amber-500/10"
                    )}>
                      {q.technicalScore}/10
                    </span>
                  </td>
                  <td className="py-6 px-4 text-left text-xs text-slate-400 max-w-xs truncate italic">
                    {q.justification || '—'}
                  </td>
                  <td className="py-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {q.isSelected ? (
                        <span className="bg-brand-primary text-white px-3 py-1.5 rounded-lg text-[9px] font-black tracking-widest shadow-lg shadow-brand-primary/20 flex items-center gap-1.5">
                          <Award size={12} /> ADJUDICAT
                        </span>
                      ) : canManageQuotes && (
                        <button
                          disabled={isProcessing}
                          onClick={() => handleSelectQuote(q)}
                          className="btn-secondary py-1.5 px-3 text-[9px] font-black uppercase tracking-widest hover:border-brand-primary text-slate-300 hover:text-brand-primary flex items-center gap-1.5"
                        >
                          <Award size={12} /> Adjudicar
                        </button>
                      )}
                      {canManageQuotes && (
                        <button
                          onClick={() => handleDeleteQuote(q.id)}
                          className="p-1.5 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                          title="Eliminar oferta"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
