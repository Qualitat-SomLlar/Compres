import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PurchaseRequest, RequestItem } from '../types';
import {
  getRequestItems, itemsEstimatedTotal, itemsFinalTotal, summarizeItems, rejectItems, applyReception,
  getReceiptProgress, getItemSuppliers, cleanItemsForSave, LEGACY_ITEM_ID,
} from './requestItems';

const item = (id: string, quantity: number, unitPrice: number, extra: Partial<RequestItem> = {}): RequestItem =>
  ({ id, description: `Article ${id}`, quantity, unitPrice, status: 'activa', ...extra });

const items = [item('a', 3, 20), item('b', 1, 150), item('c', 1, 300)];

test('getRequestItems: un expedient antic es tracta com una sola línia', () => {
  const legacy = {
    id: 'r', status: 'comanda_emesa', itemDescription: 'Cadira', estimatedAmount: 80, finalAmount: 75,
    productUrl: 'https://x', supplierName: 'Botiga',
  } as PurchaseRequest;
  const [line] = getRequestItems(legacy);
  assert.equal(line.id, LEGACY_ITEM_ID);
  assert.equal(line.quantity, 1);
  assert.equal(line.unitPrice, 80);
  assert.equal(line.finalUnitPrice, 75);
  assert.equal(line.receivedQuantity, 0);
  assert.equal(getRequestItems({ ...legacy, status: 'tancada' })[0].receivedQuantity, 1);
});

test('imports: només compten les línies actives', () => {
  assert.equal(itemsEstimatedTotal(items), 510);
  const partial = rejectItems(items, ['c'], { by: 'N2', role: 'coordinacio', step: 'pendent_coordinacio', at: 't' });
  assert.equal(itemsEstimatedTotal(partial), 210);
  assert.equal(itemsFinalTotal(partial.map(it => ({ ...it, finalUnitPrice: it.unitPrice - 10 }))), 170);
});

test('rejectItems: guarda qui, quan, a quina fase i el motiu', () => {
  const [, , c] = rejectItems(items, ['c'], { by: 'Coordinació', role: 'coordinacio', step: 'pendent_coordinacio', at: 't1', reason: ' No cal ' });
  assert.equal(c.status, 'rebutjada');
  assert.equal(c.rejectedStep, 'pendent_coordinacio');
  assert.equal(c.rejectionReason, 'No cal');
});

test('summarizeItems: resum curt sense les línies rebutjades', () => {
  assert.equal(summarizeItems(items), '3× Article a, 1× Article b i 1 més');
  assert.equal(summarizeItems(rejectItems(items, ['c'], { by: '', role: '', step: 'pendent_finances', at: '' })), '3× Article a, 1× Article b');
});

test('applyReception i getReceiptProgress: entregues parcials fins a completar', () => {
  const partial = rejectItems(items, ['c'], { by: '', role: '', step: 'pendent_finances', at: '' });
  const first = applyReception(partial, { a: 2, c: 1 }, 't1');
  let progress = getReceiptProgress(first);
  assert.deepEqual([progress.received, progress.ordered, progress.partial, progress.complete], [2, 4, true, false]);
  assert.equal(first[2].receivedQuantity, undefined, 'una línia rebutjada no es rep');

  const second = applyReception(first, { a: 5, b: 1 }, 't2');
  progress = getReceiptProgress(second);
  assert.equal(second[0].receivedQuantity, 3, 'no passa de la quantitat comandada');
  assert.deepEqual([progress.received, progress.complete, progress.partial], [4, true, false]);
});

test('getItemSuppliers: proveïdors diferents per id o per nom', () => {
  const list = [
    item('a', 1, 1, { supplierId: 's1', supplierName: 'Amazon' }),
    item('b', 1, 1, { supplierId: 's1', supplierName: 'Amazon' }),
    item('c', 1, 1, { supplierName: 'Botiga local' }),
    item('d', 1, 1),
  ];
  assert.deepEqual(getItemSuppliers(list).map(s => s.name), ['Amazon', 'Botiga local']);
});

test('cleanItemsForSave: treu els camps undefined (Firestore no els accepta)', () => {
  const [clean] = cleanItemsForSave([item('a', 1, 1, { finalUnitPrice: undefined })]);
  assert.equal('finalUnitPrice' in clean, false);
});
