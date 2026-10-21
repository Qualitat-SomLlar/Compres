import { test } from 'node:test';
import assert from 'node:assert/strict';
import { workflowService } from './workflowService';
import type { PurchaseRequest, RequestStatus, User, UserRole } from '../types';

const makeUser = (role: UserRole, areaId = 'tics', id: string = role, extra: Partial<User> = {}): User =>
  ({ id, name: id, email: `${id}@somllar.cat`, role, areaId, active: true, notificationsEnabled: true, ...extra } as User);

const makeRequest = (status: RequestStatus, extra: Partial<PurchaseRequest> = {}): PurchaseRequest =>
  ({
    id: 'r1',
    status,
    areaId: 'tics',
    createdByUserId: 'creador',
    createdByUserName: 'Creador',
    requestingTechnicianId: 'tecnic1',
    requestingTechnicianName: 'Tècnic',
    ...extra,
  } as PurchaseRequest);

test('getNextStatus avança pel circuit complet', () => {
  const cadena: RequestStatus[] = [
    'esborrany', 'pendent_coordinacio', 'pendent_direccio', 'pendent_finances',
    'aprovada', 'comanda_emesa', 'rebuda', 'tancada',
  ];
  for (let i = 0; i < cadena.length - 1; i++) {
    assert.equal(workflowService.getNextStatus(cadena[i], 'approve'), cadena[i + 1]);
  }
});

test('getNextStatus: retornada reentra a coordinació i tancada no canvia', () => {
  assert.equal(workflowService.getNextStatus('retornada', 'approve'), 'pendent_coordinacio');
  assert.equal(workflowService.getNextStatus('tancada', 'approve'), 'tancada');
});

test('getNextStatus: rebutjar i retornar ignoren l\'estat actual', () => {
  assert.equal(workflowService.getNextStatus('pendent_finances', 'reject'), 'rebutjada');
  assert.equal(workflowService.getNextStatus('pendent_direccio', 'return'), 'retornada');
});

test('canUserApprove: sense usuari o sol·licitud es denega', () => {
  assert.equal(workflowService.canUserApprove(undefined, makeRequest('pendent_coordinacio')), false);
  assert.equal(workflowService.canUserApprove(makeUser('coordinacio'), undefined), false);
});

test('canUserApprove: coordinació només aprova la seva àrea', () => {
  const req = makeRequest('pendent_coordinacio', { areaId: 'tics' });
  assert.equal(workflowService.canUserApprove(makeUser('coordinacio', 'tics'), req), true);
  assert.equal(workflowService.canUserApprove(makeUser('coordinacio', 'social'), req), false);
});

test('canUserApprove: coordinació no pot aprovar el pas de direcció', () => {
  const req = makeRequest('pendent_direccio');
  assert.equal(workflowService.canUserApprove(makeUser('coordinacio', 'tics'), req), false);
  assert.equal(workflowService.canUserApprove(makeUser('direccio_area', 'tics'), req), true);
  assert.equal(workflowService.canUserApprove(makeUser('direccio_area', 'social'), req), false);
});

test('canUserApprove: el pas de finances és institucional (qualsevol àrea)', () => {
  const req = makeRequest('pendent_finances', { areaId: 'social' });
  assert.equal(workflowService.canUserApprove(makeUser('finances', 'admin_finances'), req), true);
  assert.equal(workflowService.canUserApprove(makeUser('direccio_area', 'social'), req), false);
});

test('canUserApprove: un tècnic aliè no aprova res', () => {
  const estats: RequestStatus[] = ['pendent_coordinacio', 'pendent_direccio', 'pendent_finances', 'aprovada', 'rebuda'];
  for (const status of estats) {
    assert.equal(workflowService.canUserApprove(makeUser('tecnic', 'tics', 'altre'), makeRequest(status)), false, status);
  }
});

test('canUserApprove: esborrany/retornada només pel creador o el tècnic sol·licitant', () => {
  const req = makeRequest('retornada');
  assert.equal(workflowService.canUserApprove(makeUser('tecnic', 'tics', 'creador'), req), true);
  assert.equal(workflowService.canUserApprove(makeUser('tecnic', 'tics', 'tecnic1'), req), true);
  assert.equal(workflowService.canUserApprove(makeUser('tecnic', 'tics', 'altre'), req), false);
});

test('canUserApprove: comanda_emesa la confirma el sol·licitant', () => {
  const req = makeRequest('comanda_emesa');
  assert.equal(workflowService.canUserApprove(makeUser('tecnic', 'tics', 'tecnic1'), req), true);
  assert.equal(workflowService.canUserApprove(makeUser('tecnic', 'tics', 'altre'), req), false);
});

test('canUserApprove: supervisió global aprova en qualsevol estat', () => {
  for (const role of ['superadmin', 'gerencia', 'admin_compres'] as UserRole[]) {
    assert.equal(workflowService.canUserApprove(makeUser(role, 'social'), makeRequest('pendent_coordinacio')), true, role);
  }
});

test('canUserApprove: emetre comanda (aprovada) només Finances i supervisió', () => {
  const req = makeRequest('aprovada');
  assert.equal(workflowService.canUserApprove(makeUser('finances', 'admin_finances'), req), true);
  assert.equal(workflowService.canUserApprove(makeUser('admin_compres'), req), true);
  assert.equal(workflowService.canUserApprove(makeUser('gerencia'), req), true);
  assert.equal(workflowService.canUserApprove(makeUser('comptabilitat'), req), false);
  assert.equal(workflowService.canUserApprove(makeUser('direccio_area', 'tics'), req), false);
  assert.equal(workflowService.canUserApprove(makeUser('tecnic', 'tics', 'tecnic1'), req), false);
});

test('getEligibleApprovers (aprovada): Comptabilitat no hi figura', () => {
  const users = [
    makeUser('finances', 'admin_finances', 'f1'),
    makeUser('admin_compres', 'admin_finances', 'a1'),
    makeUser('comptabilitat', 'admin_finances', 'k1'),
  ];
  const res = workflowService.getEligibleApprovers(makeRequest('aprovada'), users);
  assert.deepEqual(res?.users.map(u => u.id).sort(), ['a1', 'f1']);
});

test('canUserApprove: estats finals no es poden aprovar', () => {
  assert.equal(workflowService.canUserApprove(makeUser('finances'), makeRequest('tancada')), false);
  assert.equal(workflowService.canUserApprove(makeUser('finances'), makeRequest('rebutjada')), false);
});

test('canManageQuotes: el sol·licitant només fins que coordinació aprova', () => {
  const tecnic = makeUser('tecnic', 'tics', 'tecnic1');
  assert.equal(workflowService.canManageQuotes(tecnic, makeRequest('esborrany')), true);
  assert.equal(workflowService.canManageQuotes(tecnic, makeRequest('pendent_coordinacio')), true);
  assert.equal(workflowService.canManageQuotes(tecnic, makeRequest('pendent_direccio')), false);
  assert.equal(workflowService.canManageQuotes(tecnic, makeRequest('aprovada')), false);
});

test('canManageQuotes: l\'aprovador de la fase pot gestionar, fora de fase no', () => {
  const direccio = makeUser('direccio_area', 'tics');
  assert.equal(workflowService.canManageQuotes(direccio, makeRequest('pendent_direccio')), true);
  assert.equal(workflowService.canManageQuotes(direccio, makeRequest('comanda_emesa')), false);
});

test('getTargetRoleForStatus: destinataris de les notificacions', () => {
  assert.equal(workflowService.getTargetRoleForStatus('pendent_coordinacio'), 'coordinacio');
  assert.equal(workflowService.getTargetRoleForStatus('pendent_direccio'), 'direccio_area');
  assert.equal(workflowService.getTargetRoleForStatus('pendent_finances'), 'finances');
  assert.equal(workflowService.getTargetRoleForStatus('rebutjada'), 'creator');
  assert.equal(workflowService.getTargetRoleForStatus('esborrany'), null);
});

test('getEligibleApprovers: filtra per àrea i exclou usuaris inactius', () => {
  const users = [
    makeUser('coordinacio', 'tics', 'c1'),
    makeUser('coordinacio', 'social', 'c2'),
    makeUser('coordinacio', 'tics', 'c3', { active: false }),
  ];
  const res = workflowService.getEligibleApprovers(makeRequest('pendent_coordinacio'), users);
  assert.deepEqual(res?.users.map(u => u.id), ['c1']);
  assert.equal(res?.hasCover, true);
});

test('getEligibleApprovers: sense aprovadors hasCover és fals', () => {
  const res = workflowService.getEligibleApprovers(makeRequest('pendent_direccio'), [makeUser('coordinacio')]);
  assert.equal(res?.hasCover, false);
});

test('getEligibleApprovers: estat sense fase d\'aprovació retorna null', () => {
  assert.equal(workflowService.getEligibleApprovers(makeRequest('tancada'), []), null);
});
