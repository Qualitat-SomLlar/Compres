import React from 'react';
import { Plus, Trash2, Package } from 'lucide-react';
import { RequestItem, Supplier } from '../types';
import { itemsEstimatedTotal, lineEstimated, newItemId } from '../lib/requestItems';

export const emptyItem = (): RequestItem => ({
  id: newItemId(),
  description: '',
  quantity: 1,
  unitPrice: 0,
  productUrl: '',
  supplierId: '',
  supplierName: '',
  status: 'activa',
});

const euros = (n: number) => n.toLocaleString('ca-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

/**
 * Editor de les línies d'article d'una nova sol·licitud:
 * descripció, quantitat, preu unitari, enllaç i proveïdor proposat (opcional) per a cada article.
 */
export function RequestItemsEditor({ items, onChange, suppliers }: {
  items: RequestItem[];
  onChange: (items: RequestItem[]) => void;
  suppliers: Supplier[];
}) {
  const update = (id: string, patch: Partial<RequestItem>) =>
    onChange(items.map(it => (it.id === id ? { ...it, ...patch } : it)));
  const remove = (id: string) => onChange(items.length > 1 ? items.filter(it => it.id !== id) : [emptyItem()]);

  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div key={item.id} className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <Package size={14} className="text-brand-primary" /> Article {index + 1}
            </span>
            <button
              type="button"
              onClick={() => remove(item.id)}
              className="text-slate-500 hover:text-red-400 p-1"
              title="Treure aquest article"
              aria-label={`Treure l'article ${index + 1}`}
            >
              <Trash2 size={15} />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div className="col-span-2 md:col-span-4">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">Descripció *</label>
              <input
                type="text"
                placeholder="Ex: Auriculars amb micròfon USB"
                className="input-field text-xs py-2.5"
                value={item.description}
                onChange={e => update(item.id, { description: e.target.value })}
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">Quantitat</label>
              <input
                type="number"
                min={1}
                step={1}
                className="input-field text-xs py-2.5 font-bold"
                value={item.quantity || ''}
                onChange={e => update(item.id, { quantity: Math.max(0, Math.floor(Number(e.target.value) || 0)) })}
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">Preu unitari (€)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                placeholder="0.00"
                className="input-field text-xs py-2.5 font-bold"
                value={item.unitPrice || ''}
                onChange={e => update(item.id, { unitPrice: Math.max(0, Number(e.target.value) || 0) })}
              />
            </div>
            <div className="col-span-2 md:col-span-3">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">Enllaç del producte (opcional)</label>
              <input
                type="url"
                placeholder="https://..."
                className="input-field text-xs py-2.5 font-mono"
                value={item.productUrl || ''}
                onChange={e => update(item.id, { productUrl: e.target.value })}
              />
            </div>
            <div className="col-span-2 md:col-span-3">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">Proveïdor proposat (opcional)</label>
              <input
                type="text"
                list="request-items-suppliers"
                placeholder="Ex: Amazon, botiga o empresa..."
                className="input-field text-xs py-2.5"
                value={item.supplierName || ''}
                onChange={e => {
                  const name = e.target.value;
                  const match = suppliers.find(s => s.name.toLowerCase() === name.trim().toLowerCase());
                  update(item.id, { supplierName: name, supplierId: match ? match.id : '' });
                }}
              />
            </div>
          </div>

          <p className="text-right text-[11px] text-slate-400">
            Subtotal: <strong className="text-white">{euros(lineEstimated(item))}</strong>
          </p>
        </div>
      ))}

      <datalist id="request-items-suppliers">
        {suppliers.map(s => <option key={s.id} value={s.name} />)}
      </datalist>

      <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
        <button
          type="button"
          onClick={() => onChange([...items, emptyItem()])}
          className="btn-secondary flex items-center gap-2 py-2 px-4 text-xs font-black uppercase tracking-wider hover:border-brand-primary/40 hover:text-white"
        >
          <Plus size={15} className="text-brand-primary" />
          <span>Afegir article</span>
        </button>
        <p className="text-sm text-slate-400">
          Total estimat ({items.length} {items.length === 1 ? 'article' : 'articles'}):{' '}
          <strong className="text-white text-lg">{euros(itemsEstimatedTotal(items))}</strong>
        </p>
      </div>
    </div>
  );
}
