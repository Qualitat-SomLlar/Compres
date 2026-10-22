import React from 'react';
import { Award, Loader2, X } from 'lucide-react';
import { Supplier } from '../types';

export interface QuoteFormState {
  supplierId: string;
  supplierName: string;
  amount: string;
  technicalScore: number;
  justification: string;
}

interface AddQuoteModalProps {
  suppliers: Supplier[];
  quoteForm: QuoteFormState;
  setQuoteForm: React.Dispatch<React.SetStateAction<QuoteFormState>>;
  quoteUrl: string;
  setQuoteUrl: (value: string) => void;
  isSubmittingQuote: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export function AddQuoteModal({ suppliers, quoteForm, setQuoteForm, quoteUrl, setQuoteUrl, isSubmittingQuote, onSubmit, onClose }: AddQuoteModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="card max-w-lg w-full p-8 border-brand-primary/30 shadow-2xl relative">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-slate-500 hover:text-white"
        >
          <X size={20} />
        </button>
        <h3 className="text-lg font-black text-white uppercase tracking-tight mb-6 flex items-center gap-3">
          <Award size={20} className="text-brand-primary" /> Afegir Oferta de Pressupost
        </h3>
      
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
              Empresa Proveïdora
            </label>
            {suppliers.length > 0 && (
              <select 
                className="input-field text-xs mb-2"
                value={quoteForm.supplierId}
                onChange={(e) => {
                  const sel = suppliers.find(s => s.id === e.target.value);
                  setQuoteForm(prev => ({
                    ...prev,
                    supplierId: e.target.value,
                    supplierName: sel ? sel.name : prev.supplierName
                  }));
                }}
              >
                <option value="">-- Selecciona de la base de dades o escriu a sota --</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.nif})</option>
                ))}
              </select>
            )}
            <input 
              type="text"
              placeholder="Nom de l'empresa proveïdora"
              className="input-field text-xs"
              value={quoteForm.supplierName}
              onChange={(e) => setQuoteForm(prev => ({ ...prev, supplierName: e.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                Import (€ sense IVA / total)
              </label>
              <input 
                type="number"
                step="0.01"
                placeholder="ex: 5400"
                className="input-field text-xs font-bold"
                value={quoteForm.amount}
                onChange={(e) => setQuoteForm(prev => ({ ...prev, amount: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                Puntuació Tècnica (1-10)
              </label>
              <input 
                type="number"
                min="1"
                max="10"
                step="0.5"
                className="input-field text-xs font-bold"
                value={quoteForm.technicalScore}
                onChange={(e) => setQuoteForm(prev => ({ ...prev, technicalScore: Number(e.target.value) }))}
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
              Justificació / Criteris Tècnics
            </label>
            <textarea 
              className="input-field text-xs min-h-[80px]"
              placeholder="Detalls del termini d'entrega, qualitat, garantia o raons d'elecció..."
              value={quoteForm.justification}
              onChange={(e) => setQuoteForm(prev => ({ ...prev, justification: e.target.value }))}
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
              Enllaç del Document de l'Oferta (Opcional)
            </label>
            <input 
              type="url"
              placeholder="https://somllar-my.sharepoint.com/... o enllaç web"
              className="input-field text-xs font-mono"
              value={quoteUrl}
              onChange={(e) => setQuoteUrl(e.target.value)}
            />
            <p className="text-[10px] text-slate-500 mt-1">Enllaç a SharePoint, OneDrive o web de l'oferta.</p>
          </div>

          <div className="flex gap-4 pt-4">
            <button 
              type="button" 
              onClick={onClose}
              className="btn-secondary flex-1 py-3 text-xs font-black uppercase tracking-widest"
            >
              Cancel·lar
            </button>
            <button 
              type="submit" 
              disabled={isSubmittingQuote}
              className="btn-primary flex-1 py-3 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2"
            >
              {isSubmittingQuote && <Loader2 size={16} className="animate-spin" />}
              <span>Guardar Oferta</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
