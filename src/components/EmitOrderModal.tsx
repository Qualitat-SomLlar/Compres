import React from 'react';
import { FileCheck, Loader2, X } from 'lucide-react';
import { Supplier } from '../types';

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
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export function EmitOrderModal({
  suppliers, orderSupplierId, setOrderSupplierId, orderSupplierName, setOrderSupplierName,
  orderProductUrl, setOrderProductUrl, orderFinalAmount, setOrderFinalAmount,
  orderNotes, setOrderNotes, isProcessing, onSubmit, onClose
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
          Per emetre la comanda és obligatori indicar el proveïdor oficial adjudicatari i l'import acordat.
        </p>
      
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] font-black text-brand-primary uppercase tracking-widest block mb-1">
              Empresa Proveïdora * (Obligatori)
            </label>
            {suppliers.length > 0 && (
              <select 
                className="input-field text-xs mb-2"
                value={orderSupplierId}
                onChange={(e) => {
                  const sel = suppliers.find(s => s.id === e.target.value);
                  setOrderSupplierId(e.target.value);
                  if (sel) setOrderSupplierName(sel.name);
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
              className="input-field text-xs font-bold"
              value={orderSupplierName}
              onChange={(e) => setOrderSupplierName(e.target.value)}
              required
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
