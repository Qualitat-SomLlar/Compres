import { test } from 'node:test';
import assert from 'node:assert/strict';
import { workingDaysBetween, averagePhaseDurations, getStuckRequests, getCurrentPhaseStart } from './metricsService';
import type { PurchaseRequest, RequestStatus } from '../types';

// Dates locals (octubre de 2026: el dia 23 és divendres i el 26, dilluns)
const day = (d: number, h = 10) => new Date(2026, 9, d, h).toISOString();

const makeRequest = (status: RequestStatus, extra: Partial<PurchaseRequest> = {}): PurchaseRequest =>
  ({ id: status, status, areaId: 'tics', createdAt: day(1), updatedAt: day(1), ...extra } as PurchaseRequest);

test('workingDaysBetween: no compta caps de setmana', () => {
  assert.equal(workingDaysBetween(day(23), new Date(2026, 9, 26, 9)), 1);
  assert.equal(workingDaysBetween(day(26), new Date(2026, 9, 30, 18)), 4);
  assert.equal(workingDaysBetween(day(26), new Date(2026, 9, 26, 18)), 0);
  assert.equal(workingDaysBetween(undefined), 0);
});

test('averagePhaseDurations: mitjana de les fases completades i salt de nivells', () => {
  const requests = [
    makeRequest('tancada', {
      submittedAt: day(5), coordinationApprovedAt: day(7), areaDirectionApprovedAt: day(8),
      financeApprovedAt: day(9), orderIssuedAt: day(12), receivedAt: day(19), closedAt: day(20),
    }),
    // Creada per una coordinació: entra directament a direcció
    makeRequest('pendent_finances', { initialStatus: 'pendent_direccio', submittedAt: day(5), areaDirectionApprovedAt: day(9) }),
  ];
  const byStatus = Object.fromEntries(averagePhaseDurations(requests).map(p => [p.status, p]));
  assert.deepEqual([byStatus.pendent_coordinacio.avgDays, byStatus.pendent_coordinacio.count], [2, 1]);
  assert.deepEqual([byStatus.pendent_direccio.avgDays, byStatus.pendent_direccio.count], [2.5, 2]);
  assert.equal(byStatus.aprovada.avgDays, 1); // de divendres 9 a dilluns 12
  assert.equal(byStatus.comanda_emesa.avgDays, 5);
  assert.equal(byStatus.rebuda.avgDays, 1);
});

test('getCurrentPhaseStart: inici de la fase actual', () => {
  assert.equal(getCurrentPhaseStart(makeRequest('pendent_direccio', { coordinationApprovedAt: day(7) })), day(7));
  assert.equal(getCurrentPhaseStart(makeRequest('retornada', { lastReturnedAt: day(8) })), day(8));
  assert.equal(getCurrentPhaseStart(makeRequest('pendent_coordinacio', { submittedAt: day(6) })), day(6));
});

test('getStuckRequests: 3 dies laborables o més, del més antic al més recent; ignora les tancades', () => {
  const now = new Date(2026, 9, 29, 12);
  const stuck = getStuckRequests([
    makeRequest('pendent_coordinacio', { id: 'a', submittedAt: day(26) }),
    makeRequest('pendent_direccio', { id: 'b', coordinationApprovedAt: day(20) }),
    makeRequest('comanda_emesa', { id: 'c', orderIssuedAt: day(23) }),
    makeRequest('tancada', { id: 'd', closedAt: day(1) }),
  ], 3, now);
  assert.deepEqual(stuck.map(s => [s.request.id, s.days]), [['b', 7], ['c', 4], ['a', 3]]);
});
