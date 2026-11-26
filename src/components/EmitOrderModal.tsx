import React, { useMemo, useState } from 'react';
import { FileCheck, Loader2, Plus, Search, X } from 'lucide-react';
import { Supplier, RequestItem } from '../types';
import { activeItems, lineFinal, itemsFinalTotal } from '../lib/requestItems';

const MAX_RESULTS = 8;
const UNAVAILABLE: Record<string, string> = { bloquejat: 'Bloquejat', baixa: 'De baixa' };
const normalize = (text?: string) => (text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// Cercador de proveïdors del registre, amb alta ràpida si encara no hi és
function SupplierPicker({ suppliers, selectedId, selectedName, onSelect, onClear, onCreateSupplier, autoFocus = false }: {
  suppliers: Supplier[];
  selectedId: string;
  selectedName: string;
  onSelect: (supplier: Supplier) => void;
  onClear: () => void;
  onCreateSupplier: (name: string) => Promise<Supplier | null>;
  autoFocus?: boolean;
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
          autoFocus={autoFocus}
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

const euros = (n: number) => n.toLocaleString('ca-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

interface EmitOrderModalProps {
  suppliers: Supplier[];
  orderItems: RequestItem[];
  setOrderItems: (items: RequestItem[]) => void;
  adjudicatedAmount?: number; // Import del pressupost adjudicat, si n'hi ha
  orderNotes: string;
  setOrderNotes: (value: string) => void;
  isProcessing: boolean;
  onCreateSupplier: (name: string) => Promise<Supplier | null>;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

/**
 * Emissió de la comanda: cada article (no rebutjat) ha de tenir un proveïdor del registre
 * i el preu unitari acordat. Es pot triar un proveïdor per a tots els articles alhora.
 */
export function EmitOrderModal({
  suppliers, orderItems, setOrderItems, adjudicatedAmount,
  orderNotes, setOrderNotes, isProcessing, onCreateSupplier, onSubmit, onClose
}: EmitOrderModalProps) {
  const lines = activeItems(orderItems);
  const [showBulk, setShowBulk] = useState(false);

  const update = (id: string, patch: Partial<RequestItem>) =>
    setOrderItems(orderItems.map(it => (it.id === id ? { ...it, ...patch } : it)));
  const applyToAll = (supplier: Supplier) => {
    setOrderItems(orderItems.map(it => (it.status === 'rebutjada' ? it : { ...it, supplierId: supplier.id, supplierName: supplier.name })));
    setShowBulk(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="card max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 md:p-8 border-brand-primary/30 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-slate-500 hover:text-white"
          aria-label="Tancar"
        >
          <X size={20} />
        </button>
        <h3 className="text-lg font-black text-white uppercase tracking-tight mb-2 flex items-center gap-3">
          <FileCheck size={20} className="text-brand-primary" /> Emissió Formal de Comanda
        </h3>
        <p className="text-xs text-slate-400 mb-6">
          Per a cada article cal triar el proveïdor del registre i confirmar el preu unitari acordat. Els articles no aprovats no s'inclouen a la comanda.
        </p>

        <form onSubmit={onSubmit} className="space-y-5">
          {lines.length > 1 && (
            <div className="p-4 rounded-2xl border border-white/5 bg-white/[0.02] space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Mateix proveïdor per a tots els articles</span>
                <button type="button" onClick={() => setShowBulk(v => !v)} className="text-[10px] font-black uppercase tracking-widest text-brand-primary hover:underline">
                  {showBulk ? 'Amagar' : 'Triar'}
                </button>
              </div>
              {showBulk && (
                <SupplierPicker
                  suppliers={suppliers}
                  selectedId=""
                  selectedName=""
                  autoFocus
                  onSelect={applyToAll}
                  onClear={() => undefined}
                  onCreateSupplier={onCreateSupplier}
                />
              )}
            </div>
          )}

          <ul className="space-y-4">
            {lines.map((it, index) => (
              <li key={it.id} className="p-4 rounded-2xl border border-white/5 bg-white/[0.01] space-y-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-bold text-white break-words">
                    <span className="text-slate-500 text-[10px] font-black mr-2">{index + 1}.</span>
                    <span className="text-brand-primary">{it.quantity}×</span> {it.description}
                  </p>
                  <p className="text-xs text-slate-400">Subtotal: <strong className="text-white">{euros(lineFinal(it))}</strong></p>
                </div>

                <div>
                  <label className="text-[10px] font-black text-brand-primary uppercase tracking-widest block mb-1">
                    Proveïdor del registre *
                  </label>
                  <SupplierPicker
                    suppliers={suppliers}
                    selectedId={it.supplierId || ''}
                    selectedName={it.supplierName || ''}
                    autoFocus={lines.length === 1}
                    onSelect={(supplier) => update(it.id, { supplierId: supplier.id, supplierName: supplier.name })}
                    onClear={() => update(it.id, { supplierId: '', supplierName: '' })}
                    onCreateSupplier={onCreateSupplier}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                      Enllaç del producte (opcional)
                    </label>
                    <input
                      type="url"
                      placeholder="https://..."
                      className="input-field text-xs font-mono"
                      value={it.productUrl || ''}
                      onChange={(e) => update(it.id, { productUrl: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                      Preu unitari acordat (€) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      className="input-field text-xs font-bold"
                      value={it.finalUnitPrice ?? ''}
                      onChange={(e) => update(it.id, { finalUnitPrice: e.target.value === '' ? undefined : Math.max(0, Number(e.target.value) || 0) })}
                      required
                    />
                    <p className="text-[10px] text-slate-500 mt-1">Estimat: {euros(Number(it.unitPrice) || 0)}/u.</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 border-t border-white/5 pt-4">
            <span>
              {adjudicatedAmount !== undefined && adjudicatedAmount > 0 && (
                <>Pressupost adjudicat: <strong className="text-slate-200">{euros(adjudicatedAmount)}</strong></>
              )}
            </span>
            <span>Import total de la comanda: <strong className="text-white text-base">{euros(itemsFinalTotal(orderItems))}</strong></span>
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

          <div className="flex gap-4 pt-2">
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
