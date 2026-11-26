import React from 'react';
import { Package, ExternalLink, CheckCircle2, XCircle, Truck } from 'lucide-react';
import { PurchaseRequest, RequestItem } from '../types';
import { cn } from '../lib/utils';
import { getHierarchyRole, STATUS_LABELS, THREE_QUOTES_THRESHOLD } from '../constants';
import {
  getRequestItems, isActive, lineEstimated, lineFinal, itemsEstimatedTotal, itemsFinalTotal, getReceiptProgress,
} from '../lib/requestItems';

const euros = (n: number) => n.toLocaleString('ca-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

const ORDERED = ['comanda_emesa', 'rebuda', 'tancada', 'incidencia'];

/**
 * Llista d'articles de l'expedient. En les fases de validació, qui valida pot desmarcar
 * els articles que no aprova (aprovació parcial); la resta continuen el circuit.
 */
export function RequestItemsSection({ request, selectable, rejectedIds, onToggle }: {
  request: PurchaseRequest;
  selectable: boolean;
  rejectedIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  const items = getRequestItems(request);
  const ordered = ORDERED.includes(request.status) || !!request.orderIssuedAt;
  const progress = getReceiptProgress(items);
  const activeCount = items.filter(isActive).length;
  const pendingApproval = items.filter(it => isActive(it) && !rejectedIds.has(it.id));
  const canSelect = selectable && activeCount > 1;

  return (
    <div className="card overflow-hidden">
      <div className="p-6 md:p-8 border-b border-white/[0.05] flex flex-wrap items-center justify-between gap-4">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3">
          <Package size={18} className="text-brand-primary" /> Articles de la sol·licitud
          <span className="px-2 py-0.5 rounded-full bg-white/5 text-slate-400 tracking-normal">{items.length}</span>
        </h4>
        {ordered && (
          <span className={cn(
            'text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border flex items-center gap-1.5',
            progress.complete ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : progress.received > 0 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              : 'bg-white/5 text-slate-400 border-white/10'
          )}>
            <Truck size={12} />
            {progress.complete ? 'Tot rebut' : progress.received > 0 ? 'Rebuda parcialment' : 'Pendent de recepció'}
            {' · '}{progress.received}/{progress.ordered} u.
          </span>
        )}
      </div>

      {canSelect && (
        <div className="px-6 md:px-8 py-3 bg-brand-primary/[0.04] border-b border-brand-primary/10 text-[11px] text-slate-300">
          Desmarca els articles que no aproves. Quedaran rebutjats (el comentari de validació en serà el motiu) i la resta continuarà el circuit.
        </div>
      )}

      <ul className="divide-y divide-white/[0.04]">
        {items.map(item => (
          <ItemRow
            key={item.id}
            item={item}
            ordered={ordered}
            selectable={canSelect && isActive(item)}
            approved={!rejectedIds.has(item.id)}
            onToggle={() => onToggle(item.id)}
          />
        ))}
      </ul>

      <div className="p-6 md:px-8 border-t border-white/[0.05] flex flex-wrap justify-end gap-x-8 gap-y-1 text-xs text-slate-400">
        {canSelect && rejectedIds.size > 0 ? (
          <span>
            Import que aproves: <strong className="text-white">{euros(itemsEstimatedTotal(pendingApproval))}</strong>
            <span className="text-slate-500"> ({pendingApproval.length} de {activeCount} articles)</span>
            {request.requiresThreeQuotes && itemsEstimatedTotal(pendingApproval) < THREE_QUOTES_THRESHOLD && (
              <span className="block text-amber-400 mt-1">Per sota de {THREE_QUOTES_THRESHOLD.toLocaleString('ca-ES')} €: ja no caldran 3 pressupostos.</span>
            )}
          </span>
        ) : (
          <span>Total estimat: <strong className="text-white">{euros(itemsEstimatedTotal(items))}</strong></span>
        )}
        {ordered && <span>Total comanda: <strong className="text-white">{euros(itemsFinalTotal(items))}</strong></span>}
      </div>
    </div>
  );
}

interface ItemRowProps {
  item: RequestItem;
  ordered: boolean;
  selectable: boolean;
  approved: boolean;
  onToggle: () => void;
}

const ItemRow: React.FC<ItemRowProps> = ({ item, ordered, selectable, approved, onToggle }) => {
  const rejected = !isActive(item);
  const received = Math.min(Number(item.receivedQuantity) || 0, item.quantity);
  const hasFinal = ordered && item.finalUnitPrice !== undefined && item.finalUnitPrice !== item.unitPrice;

  return (
    <li className={cn('px-6 md:px-8 py-4 flex gap-4', rejected && 'opacity-60')}>
      {selectable ? (
        <input
          type="checkbox"
          checked={approved}
          onChange={onToggle}
          className="mt-1 h-4 w-4 accent-brand-primary shrink-0 cursor-pointer"
          aria-label={`Aprovar ${item.description}`}
        />
      ) : rejected ? (
        <XCircle size={16} className="mt-0.5 text-red-400 shrink-0" />
      ) : (
        <CheckCircle2 size={16} className="mt-0.5 text-brand-primary shrink-0" />
      )}

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className={cn('text-sm font-bold text-white break-words', (rejected || (selectable && !approved)) && 'line-through text-slate-400')}>
            <span className="text-brand-primary">{item.quantity}×</span> {item.description}
          </p>
          <p className="text-sm font-black text-white shrink-0">
            {euros(ordered ? lineFinal(item) : lineEstimated(item))}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
          <span>
            {euros(Number(item.unitPrice) || 0)}/u.
            {hasFinal && <> → <strong className="text-slate-200">{euros(Number(item.finalUnitPrice) || 0)}/u. acordat</strong></>}
          </span>
          {item.supplierName && <span>Proveïdor: <strong className="text-slate-200">{item.supplierName}</strong></span>}
          {item.productUrl && (
            <a href={item.productUrl} target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline inline-flex items-center gap-1">
              <ExternalLink size={11} /> Enllaç del producte
            </a>
          )}
          {ordered && !rejected && (
            <span className={cn('font-bold', received >= item.quantity ? 'text-emerald-400' : received > 0 ? 'text-amber-400' : 'text-slate-500')}>
              Rebudes: {received}/{item.quantity}
            </span>
          )}
        </div>

        {rejected && (
          <p className="text-[11px] text-red-300/90">
            No aprovat{item.rejectedStep ? ` a ${STATUS_LABELS[item.rejectedStep]?.label || item.rejectedStep}` : ''}
            {item.rejectedBy ? ` per ${item.rejectedBy}` : ''}
            {item.rejectedRole ? ` (${getHierarchyRole(item.rejectedRole).label})` : ''}
            {item.rejectionReason ? `: «${item.rejectionReason}»` : ''}
          </p>
        )}
      </div>
    </li>
  );
};
