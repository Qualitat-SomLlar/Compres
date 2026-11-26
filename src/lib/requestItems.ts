import { PurchaseRequest, RequestItem, RequestStatus } from '../types';

/**
 * Lògica comuna de les línies d'article d'una sol·licitud.
 * Els expedients antics (sense `items`) es tracten com una sola línia
 * construïda a partir de la descripció, l'import i l'enllaç generals.
 */

export const LEGACY_ITEM_ID = 'principal';

const RECEIVED_STATUSES: RequestStatus[] = ['rebuda', 'tancada'];

export const round2 = (value: number) => Math.round((Number(value) || 0) * 100) / 100;

export function newItemId(): string {
  return 'it_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
}

export function normalizeUrl(url?: string): string {
  const trimmed = (url || '').trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function hasItems(request?: Pick<PurchaseRequest, 'items'>): boolean {
  return Array.isArray(request?.items) && request!.items!.length > 0;
}

/**
 * Línies de la sol·licitud; per als expedients antics, una línia equivalent.
 */
export function getRequestItems(request: PurchaseRequest): RequestItem[] {
  if (hasItems(request)) return request.items!;
  const received = !!request.receivedAt || RECEIVED_STATUSES.includes(request.status);
  return [{
    id: LEGACY_ITEM_ID,
    description: request.itemDescription || 'Sol·licitud de compra',
    quantity: 1,
    unitPrice: Number(request.estimatedAmount) || 0,
    productUrl: request.productUrl || '',
    supplierId: request.supplierId || '',
    supplierName: request.supplierName || '',
    status: 'activa',
    ...(request.finalAmount !== undefined ? { finalUnitPrice: request.finalAmount } : {}),
    receivedQuantity: received ? 1 : 0,
  }];
}

export const isActive = (item: RequestItem) => item.status !== 'rebutjada';
export const activeItems = (items: RequestItem[]) => items.filter(isActive);

export const lineEstimated = (item: RequestItem) => round2((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0));
export const lineFinal = (item: RequestItem) =>
  round2((Number(item.quantity) || 0) * (Number(item.finalUnitPrice ?? item.unitPrice) || 0));

/** Import estimat de les línies que continuen el circuit. */
export const itemsEstimatedTotal = (items: RequestItem[]) =>
  round2(activeItems(items).reduce((sum, it) => sum + lineEstimated(it), 0));

/** Import acordat a la comanda de les línies que continuen el circuit. */
export const itemsFinalTotal = (items: RequestItem[]) =>
  round2(activeItems(items).reduce((sum, it) => sum + lineFinal(it), 0));

/**
 * Resum curt per a títols, correus i llistes: "3× Auriculars, 1× Pantalla i 2 més".
 */
export function summarizeItems(items: RequestItem[], max = 2): string {
  const list = activeItems(items).filter(it => it.description.trim());
  if (list.length === 0) return '';
  const parts = list.slice(0, max).map(it => `${it.quantity}× ${it.description.trim()}`);
  const rest = list.length - max;
  return rest > 0 ? `${parts.join(', ')} i ${rest} més` : parts.join(', ');
}

/**
 * Estat de la recepció de les línies actives.
 */
export function getReceiptProgress(items: RequestItem[]) {
  const active = activeItems(items);
  const ordered = active.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
  const received = active.reduce((sum, it) => sum + Math.min(Number(it.receivedQuantity) || 0, Number(it.quantity) || 0), 0);
  const completeLines = active.filter(it => (Number(it.receivedQuantity) || 0) >= (Number(it.quantity) || 0)).length;
  return {
    ordered,
    received,
    pending: Math.max(0, ordered - received),
    lines: active.length,
    completeLines,
    complete: active.length > 0 && completeLines === active.length,
    partial: received > 0 && received < ordered,
  };
}

/**
 * Marca com a rebutjades les línies indicades (aprovació parcial).
 */
export function rejectItems(
  items: RequestItem[],
  rejectedIds: string[],
  ctx: { by: string; role: string; step: RequestStatus; at: string; reason?: string }
): RequestItem[] {
  const ids = new Set(rejectedIds);
  return items.map(it => {
    if (!ids.has(it.id) || !isActive(it)) return it;
    return {
      ...it,
      status: 'rebutjada',
      rejectedAt: ctx.at,
      rejectedBy: ctx.by,
      rejectedRole: ctx.role,
      rejectedStep: ctx.step,
      ...(ctx.reason?.trim() ? { rejectionReason: ctx.reason.trim() } : {}),
    };
  });
}

/**
 * Suma les unitats rebudes ara a cada línia (sense passar de la quantitat comandada).
 */
export function applyReception(items: RequestItem[], receivedNow: Record<string, number>, at: string): RequestItem[] {
  return items.map(it => {
    const add = Math.max(0, Math.floor(Number(receivedNow[it.id]) || 0));
    if (!add || !isActive(it)) return it;
    const total = Math.min(Number(it.quantity) || 0, (Number(it.receivedQuantity) || 0) + add);
    return { ...it, receivedQuantity: total, lastReceivedAt: at };
  });
}

/**
 * Proveïdors diferents de les línies actives (per id o, si no en tenen, pel nom).
 */
export function getItemSuppliers(items: RequestItem[]): { id: string; name: string }[] {
  const seen = new Map<string, { id: string; name: string }>();
  activeItems(items).forEach(it => {
    const name = (it.supplierName || '').trim();
    if (!it.supplierId && !name) return;
    const key = it.supplierId || name.toLowerCase();
    if (!seen.has(key)) seen.set(key, { id: it.supplierId || '', name });
  });
  return [...seen.values()];
}

/**
 * Elimina els camps buits o `undefined` de cada línia abans de desar-la a Firestore
 * (Firestore no accepta `undefined` dins dels mapes).
 */
export function cleanItemsForSave(items: RequestItem[]): RequestItem[] {
  return items.map(it => {
    const out: Record<string, unknown> = {};
    Object.entries(it).forEach(([key, value]) => {
      if (value !== undefined && value !== null) out[key] = value;
    });
    return out as unknown as RequestItem;
  });
}
