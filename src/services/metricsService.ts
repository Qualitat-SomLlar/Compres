import { PurchaseRequest, RequestStatus, Supplier } from '../types';

const toTime = (iso?: string) => (iso ? new Date(iso).getTime() : NaN);
const submittedOf = (r: PurchaseRequest) => r.submittedAt || r.createdAt;

/**
 * Dies laborables (de dilluns a divendres) transcorreguts des d'una data. No té en compte els festius.
 */
export function workingDaysBetween(fromIso: string | undefined, to: Date = new Date()): number {
  const start = toTime(fromIso);
  if (isNaN(start)) return 0;
  const day = new Date(start);
  day.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);
  let days = 0;
  while (day < end) {
    day.setDate(day.getDate() + 1);
    const weekday = day.getDay();
    if (weekday !== 0 && weekday !== 6) days++;
  }
  return days;
}

/**
 * Fases del circuit amb el moment en què hi entra l'expedient i el moment en què en surt.
 * Si l'expedient va entrar directament en una fase (salt de nivells), l'inici és l'enviament.
 */
export const WORKFLOW_PHASES: {
  status: RequestStatus;
  label: string;
  start: (r: PurchaseRequest) => string | undefined;
  end: (r: PurchaseRequest) => string | undefined;
}[] = [
  {
    status: 'pendent_coordinacio',
    label: 'Coordinació (N2)',
    start: submittedOf,
    end: r => r.coordinationApprovedAt,
  },
  {
    status: 'pendent_direccio',
    label: "Direcció d'Àrea (N3)",
    start: r => r.coordinationApprovedAt || (r.initialStatus === 'pendent_direccio' ? submittedOf(r) : undefined),
    end: r => r.areaDirectionApprovedAt,
  },
  {
    status: 'pendent_finances',
    label: 'Finances (N4)',
    start: r => r.areaDirectionApprovedAt || (r.initialStatus === 'pendent_finances' ? submittedOf(r) : undefined),
    end: r => r.financeApprovedAt,
  },
  {
    status: 'aprovada',
    label: 'Emissió de comanda (N5)',
    start: r => r.financeApprovedAt || (r.initialStatus === 'aprovada' ? submittedOf(r) : undefined),
    end: r => r.orderIssuedAt,
  },
  {
    status: 'comanda_emesa',
    label: 'Recepció al centre',
    start: r => r.orderIssuedAt,
    end: r => r.receivedAt,
  },
  {
    status: 'rebuda',
    label: 'Conformitat de factura',
    start: r => r.receivedAt,
    end: r => r.closedAt,
  },
];

/**
 * Temps mitjà (en dies laborables) que els expedients han passat a cada fase ja completada.
 */
export function averagePhaseDurations(requests: PurchaseRequest[]) {
  return WORKFLOW_PHASES.map(phase => {
    const durations = requests
      .map(r => ({ start: phase.start(r), end: phase.end(r) }))
      .filter(d => d.start && d.end && toTime(d.end) >= toTime(d.start))
      .map(d => workingDaysBetween(d.start, new Date(d.end!)));
    const avgDays = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
    return { status: phase.status, label: phase.label, avgDays, count: durations.length };
  });
}

/**
 * Temps de servei (en dies laborables), des que es crea la sol·licitud:
 * - response: fins que s'emet la comanda al proveïdor (temps de resposta de l'entitat).
 * - delivery: fins que el centre confirma la recepció del material (temps total fins a l'entrega).
 * Només compten els expedients que ja han arribat a cada punt.
 */
export function averageLeadTimes(requests: PurchaseRequest[]) {
  const average = (end: (r: PurchaseRequest) => string | undefined) => {
    const durations = requests
      .map(r => ({ start: r.createdAt, end: end(r) }))
      .filter(d => d.start && d.end && toTime(d.end) >= toTime(d.start))
      .map(d => workingDaysBetween(d.start, new Date(d.end!)));
    const avgDays = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
    return { avgDays, count: durations.length };
  };
  return {
    response: average(r => r.orderIssuedAt),
    delivery: average(r => r.receivedAt),
  };
}

/**
 * Moment en què l'expedient va entrar a la fase on és ara.
 */
export function getCurrentPhaseStart(r: PurchaseRequest): string | undefined {
  if (r.status === 'retornada') return r.lastReturnedAt || r.updatedAt;
  const phase = WORKFLOW_PHASES.find(p => p.status === r.status);
  return (phase && phase.start(r)) || r.updatedAt;
}

/**
 * Expedients actius que porten `thresholdDays` dies laborables o més sense avançar de fase,
 * del més antic al més recent.
 */
export function getStuckRequests(requests: PurchaseRequest[], thresholdDays = 3, now: Date = new Date()) {
  const active = new Set<RequestStatus>([...WORKFLOW_PHASES.map(p => p.status), 'retornada']);
  return requests
    .filter(r => active.has(r.status))
    .map(r => ({ request: r, days: workingDaysBetween(getCurrentPhaseStart(r), now) }))
    .filter(x => x.days >= thresholdDays)
    .sort((a, b) => b.days - a.days);
}

/**
 * Qui té l'expedient a la fase actual (per a la llista d'expedients aturats).
 */
export function getCurrentPhaseLabel(status: RequestStatus): string {
  if (status === 'retornada') return 'Esmena (sol·licitant)';
  return WORKFLOW_PHASES.find(p => p.status === status)?.label || status;
}

// Estats en què la comanda ja s'ha emès al proveïdor
const ORDERED_STATUSES = new Set<RequestStatus>(['comanda_emesa', 'rebuda', 'tancada', 'incidencia']);

const normalizeName = (name?: string) => (name || '').trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * Historial de compres d'un proveïdor: comandes emeses, import total i última compra.
 * Les comandes antigues sense supplierId s'associen pel nom del proveïdor.
 */
export function getSupplierHistory(supplier: Pick<Supplier, 'id' | 'name'>, requests: PurchaseRequest[]) {
  const name = normalizeName(supplier.name);
  const orders = requests
    .filter(r => ORDERED_STATUSES.has(r.status))
    .filter(r => r.supplierId ? r.supplierId === supplier.id : (!!name && normalizeName(r.supplierName) === name))
    .map(r => ({ request: r, date: r.orderIssuedAt || r.updatedAt || r.createdAt }))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return {
    orders,
    orderCount: orders.length,
    totalSpent: orders.reduce((sum, o) => sum + (o.request.finalAmount ?? o.request.estimatedAmount ?? 0), 0),
    lastOrderAt: orders[0]?.date as string | undefined,
  };
}
