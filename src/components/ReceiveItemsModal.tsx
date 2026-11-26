import React, { useState } from 'react';
import { Truck, Loader2, X } from 'lucide-react';
import { RequestItem } from '../types';
import { activeItems } from '../lib/requestItems';

/**
 * Registre d'una entrega: per a cada article, quantes unitats han arribat ara.
 * Si amb aquesta entrega ja ha arribat tot, la comanda passa a "Rebuda";
 * si no, queda com a rebuda parcialment i es pot registrar una altra entrega més endavant.
 */
export function ReceiveItemsModal({ items, isProcessing, onSubmit, onClose }: {
  items: RequestItem[];
  isProcessing: boolean;
  onSubmit: (receivedNow: Record<string, number>, notes: string) => void;
  onClose: () => void;
}) {
  const lines = activeItems(items);
  const remainingOf = (it: RequestItem) => Math.max(0, it.quantity - (Number(it.receivedQuantity) || 0));
  const [receivedNow, setReceivedNow] = useState<Record<string, number>>(
    () => Object.fromEntries(lines.map(it => [it.id, remainingOf(it)]))
  );
  const [notes, setNotes] = useState('');

  const totalNow = Object.values(receivedNow).reduce<number>((a, b) => a + (Number(b) || 0), 0);
  const completesAll = lines.every(it => (Number(receivedNow[it.id]) || 0) >= remainingOf(it));

  const setValue = (it: RequestItem, value: number) =>
    setReceivedNow(prev => ({ ...prev, [it.id]: Math.max(0, Math.min(remainingOf(it), Math.floor(value) || 0)) }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 md:p-8 border-brand-primary/30 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-500 hover:text-white" aria-label="Tancar">
          <X size={20} />
        </button>
        <h3 className="text-lg font-black text-white uppercase tracking-tight mb-2 flex items-center gap-3">
          <Truck size={20} className="text-brand-primary" /> Confirmar recepció
        </h3>
        <p className="text-xs text-slate-400 mb-6">
          Indica quantes unitats de cada article han arribat en aquesta entrega. Si encara en falten, la comanda quedarà com a rebuda parcialment i podràs registrar la resta quan arribi.
        </p>

        <form
          onSubmit={e => { e.preventDefault(); onSubmit(receivedNow, notes); }}
          className="space-y-4"
        >
          <ul className="rounded-2xl border border-white/5 divide-y divide-white/[0.04]">
            {lines.map(it => {
              const already = Number(it.receivedQuantity) || 0;
              const remaining = remainingOf(it);
              return (
                <li key={it.id} className="p-4 flex flex-wrap items-center gap-4">
                  <div className="flex-1 min-w-[12rem]">
                    <p className="text-sm font-bold text-white break-words">{it.description}</p>
                    <p className="text-[11px] text-slate-400">
                      Comandades: {it.quantity} · Ja rebudes: {already}
                      {remaining === 0 && <strong className="text-emerald-400"> · Completat</strong>}
                    </p>
                  </div>
                  {remaining > 0 && (
                    <label className="flex items-center gap-2 text-[11px] text-slate-400">
                      Arriben ara
                      <input
                        type="number"
                        min={0}
                        max={remaining}
                        step={1}
                        className="input-field text-xs py-2 w-20 font-bold"
                        value={receivedNow[it.id] ?? 0}
                        onChange={e => setValue(it, Number(e.target.value))}
                      />
                      <span>de {remaining}</span>
                    </label>
                  )}
                </li>
              );
            })}
          </ul>

          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
              Observacions de la recepció (opcional)
            </label>
            <textarea
              className="input-field text-xs min-h-[70px]"
              placeholder="Estat del material, albarà, incidències..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          <p className={completesAll ? 'text-xs text-emerald-400' : 'text-xs text-amber-400'}>
            {completesAll
              ? 'Amb aquesta entrega ja ha arribat tot: la comanda passarà a «Rebuda».'
              : 'Encara faltaran unitats: la comanda quedarà rebuda parcialment.'}
          </p>

          <div className="flex gap-4 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 py-3 text-xs font-black uppercase tracking-widest">
              Cancel·lar
            </button>
            <button
              type="submit"
              disabled={isProcessing || totalNow === 0}
              className="btn-primary flex-1 py-3 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isProcessing && <Loader2 size={16} className="animate-spin" />}
              <span>{completesAll ? 'Confirmar recepció' : 'Registrar entrega parcial'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
