import React, { useMemo, useState } from 'react';
import { FileCheck, Loader2, Plus, Search, X } from 'lucide-react';
import { Supplier } from '../types';

const MAX_RESULTS = 8;
const UNAVAILABLE: Record<string, string> = { bloquejat: 'Bloquejat', baixa: 'De baixa' };
const normalize = (text?: string) => (text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// Cercador de proveïdors del registre, amb alta ràpida si encara no hi és
function SupplierPicker({ suppliers, selectedId, selectedName, onSelect, onClear, onCreateSupplier }: {
  suppliers: Supplier[];
  selectedId: string;
  selectedName: string;
  onSelect: (supplier: Supplier) => void;
  onClear: () => void;
  onCreateSupplier: (name: string) => Promise<Supplier | null>;
}) {
  const [search, setSearch] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const selected = suppliers.find(s => s.id === selectedId);

  const results = useMemo(() => {
    const term = normalize(search);
    if (!term) return [];
    return suppliers
      .filter(s => [s.name, s.nif, s.category].some(field => normalize(field).includes(term)))
      .slice(0, MAX_RESULTS);
  }, [search, suppliers]);

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const created = await onCreateSupplier(search.trim());
      if (created) {
        onSelect(created);
        setSearch('');
      }
    } finally {
      setIsCreating(false);
    }
  };

  if (selectedId) {
    return (
      <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-brand-primary/30 bg-brand-primary/[0.05]">
        <div className="min-w-0">
          <p className="text-xs font-bold text-white truncate">{selected?.name || selectedName}</p>
          <p className="text-[10px] text-slate-400 truncate">
            {[selected?.nif && `NIF ${selected.nif}`, selected?.category, selected?.zone].filter(Boolean).join(' · ') || 'Proveïdor del registre'}
          </p>
        </div>
        <button type="button" onClick={onClear} className="text-[10px] font-black uppercase tracking-widest text-brand-primary hover:underline shrink-0">
          Canviar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {selectedName && (
        <p className="text-[10px] text-amber-400">
          Proveïdor indicat abans: «{selectedName}». Busca'l al registre o dona'l d'alta.
        </p>
      )}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          autoFocus
          placeholder="Cerca per nom, NIF o categoria..."
          className="input-field text-xs pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {search.trim() && (
        <div className="rounded-xl border border-white/10 divide-y divide-white/5 max-h-60 overflow-y-auto">
          {results.map(s => {
            const unavailable = UNAVAILABLE[s.status];
            return (
              <button
                key={s.id}
                type="button"
                disabled={!!unavailable}
                onClick={() => { onSelect(s); setSearch(''); }}
                className="w-full text-left px-3 py-2 hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-between gap-3"
              >
                <span className="min-w-0">
                  <span className="block text-xs font-bold text-white truncate">{s.name}</span>
                  <span className="block text-[10px] text-slate-500 truncate">{[s.nif, s.category, s.zone].filter(Boolean).join(' · ')}</span>
                </span>
                {unavailable && <span className="text-[9px] font-black uppercase text-red-400 shrink-0">{unavailable}</span>}
              </button>
            );
          })}
          {results.length === 0 && (
            <p className="px-3 py-2 text-[11px] text-slate-500">Cap proveïdor del registre coincideix amb la cerca.</p>
          )}
          <button
            type="button"
            onClick={handleCreate}
            disabled={isCreating}
            className="w-full text-left px-3 py-2 text-xs font-bold text-brand-primary hover:bg-brand-primary/10 flex items-center gap-2 disabled:opacity-50"
          >
            {isCreating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Donar d'alta «{search.trim()}» al registre
          </button>
        </div>
      )}
    </div>
  );
}

interface EmitOrderModalProps {
  suppliers: Supplier[];
  orderSupplierId: string;
  setOrderSupplierId: (value: string) => void;
  orderSupplierName: string;
  setOrderSupplierName: (value: string) => void;
  orderProductUrl: string;
  setOrderProductUrl: (value: string) => void;
  orderFinalAmount: number | string;
  setOrderFinalAmount: (value: number | string) => void;
  orderNotes: string;
  setOrderNotes: (value: string) => void;
  isProcessing: boolean;
  onCreateSupplier: (name: string) => Promise<Supplier | null>;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export function EmitOrderModal({
  suppliers, orderSupplierId, setOrderSupplierId, orderSupplierName, setOrderSupplierName,
  orderProductUrl, setOrderProductUrl, orderFinalAmount, setOrderFinalAmount,
  orderNotes, setOrderNotes, isProcessing, onCreateSupplier, onSubmit, onClose
}: EmitOrderModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="card max-w-lg w-full p-8 border-brand-primary/30 shadow-2xl relative">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-slate-500 hover:text-white"
        >
          <X size={20} />
        </button>
        <h3 className="text-lg font-black text-white uppercase tracking-tight mb-2 flex items-center gap-3">
          <FileCheck size={20} className="text-brand-primary" /> Emissió Formal de Comanda
        </h3>
        <p className="text-xs text-slate-400 mb-6">
          Per emetre la comanda és obligatori triar el proveïdor adjudicatari del registre i indicar l'import acordat.
        </p>
      
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] font-black text-brand-primary uppercase tracking-widest block mb-1">
              Proveïdor del registre * (Obligatori)
            </label>
            <SupplierPicker
              suppliers={suppliers}
              selectedId={orderSupplierId}
              selectedName={orderSupplierName}
              onSelect={(supplier) => {
                setOrderSupplierId(supplier.id);
                setOrderSupplierName(supplier.name);
              }}
              onClear={() => {
                setOrderSupplierId('');
                setOrderSupplierName('');
              }}
              onCreateSupplier={onCreateSupplier}
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
              Enllaç del Producte o Catàleg (Opcional)
            </label>
            <input 
              type="url"
              placeholder="https://... URL directa de compra o fitxa"
              className="input-field text-xs font-mono"
              value={orderProductUrl}
              onChange={(e) => setOrderProductUrl(e.target.value)}
            />
            <p className="text-[10px] text-slate-500 mt-1">Enllaç web directe al producte per a la gestió de la compra.</p>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
              Import Final / Acordat (€) *
            </label>
            <input 
              type="number"
              step="0.01"
              placeholder="ex: 1250.00"
              className="input-field text-xs font-bold"
              value={orderFinalAmount}
              onChange={(e) => setOrderFinalAmount(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
              Observacions o Notes de la Comanda (Opcional)
            </label>
            <textarea 
              className="input-field text-xs min-h-[80px]"
              placeholder="Instruccions d'enviament, contacte, referències de comanda..."
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
            />
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
              disabled={isProcessing}
              className="btn-primary flex-1 py-3 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2"
            >
              {isProcessing && <Loader2 size={16} className="animate-spin" />}
              <span>Confirmar i Emetre Comanda</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
