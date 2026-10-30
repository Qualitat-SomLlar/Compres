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

test('canUserApprove: comanda_emesa la confirma el responsable del centre, no el sol·licitant', () => {
  const req = makeRequest('comanda_emesa');
  const responsibles = ['Centre@somllar.cat'];
  assert.equal(workflowService.canUserApprove(makeUser('tecnic', 'tics', 'centre'), req, responsibles), true);
  assert.equal(workflowService.canUserApprove(makeUser('tecnic', 'tics', 'tecnic1'), req, responsibles), false);
  assert.equal(workflowService.canUserApprove(makeUser('coordinacio', 'tics', 'creador'), req, responsibles), false);
  assert.equal(workflowService.canUserApprove(makeUser('finances', 'admin_finances'), req, responsibles), true);
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

test('getInitialStatus: cada càrrec se salta el seu nivell i els inferiors', () => {
  assert.equal(workflowService.getInitialStatus(makeUser('tecnic', 'tics'), 'tics'), 'pendent_coordinacio');
  assert.equal(workflowService.getInitialStatus(makeUser('coordinacio', 'tics'), 'tics'), 'pendent_direccio');
  assert.equal(workflowService.getInitialStatus(makeUser('direccio_area', 'tics'), 'tics'), 'pendent_finances');
  for (const role of ['finances', 'admin_compres', 'comptabilitat', 'gerencia', 'superadmin'] as UserRole[]) {
    assert.equal(workflowService.getInitialStatus(makeUser(role, 'admin_finances'), 'tics'), 'aprovada', role);
  }
});

test('getInitialStatus: els nivells d\'àrea només se salten a la pròpia àrea', () => {
  assert.equal(workflowService.getInitialStatus(makeUser('coordinacio', 'social'), 'tics'), 'pendent_coordinacio');
  assert.equal(workflowService.getInitialStatus(makeUser('direccio_area', 'social'), 'tics'), 'pendent_coordinacio');
});

test('canCreateRequest: només Coordinació (N2) o superior', () => {
  assert.equal(workflowService.canCreateRequest(makeUser('tecnic')), false);
  assert.equal(workflowService.canCreateRequest(undefined), false);
  for (const role of ['coordinacio', 'direccio_area', 'finances', 'admin_compres', 'comptabilitat', 'gerencia', 'superadmin'] as UserRole[]) {
    assert.equal(workflowService.canCreateRequest(makeUser(role)), true, role);
  }
});

test('isStepSkipped: segons la fase on va entrar l\'expedient', () => {
  const req = makeRequest('pendent_finances', { initialStatus: 'pendent_finances' });
  assert.equal(workflowService.isStepSkipped(req, 'pendent_coordinacio'), true);
  assert.equal(workflowService.isStepSkipped(req, 'pendent_direccio'), true);
  assert.equal(workflowService.isStepSkipped(req, 'pendent_finances'), false);
  assert.equal(workflowService.isStepSkipped(makeRequest('pendent_direccio'), 'pendent_coordinacio'), false);
});

test('getEventForTransition: enviar i reenviar és sempre solicitud_creada', () => {
  assert.equal(workflowService.getEventForTransition('esborrany', 'pendent_direccio', 'approve'), 'solicitud_creada');
  assert.equal(workflowService.getEventForTransition('retornada', 'aprovada', 'approve'), 'solicitud_creada');
  assert.equal(workflowService.getEventForTransition('pendent_finances', 'aprovada', 'approve'), 'compra_aprovada');
  assert.equal(workflowService.getEventForTransition('pendent_direccio', 'retornada', 'return'), 'retornada_esmena');
  assert.equal(workflowService.getEventForTransition('rebuda', 'tancada', 'approve'), 'compra_tancada');
});

// Organització de prova per als destinataris dels avisos
const equip = [
  makeUser('coordinacio', 'tics', 'creador'),
  makeUser('tecnic', 'tics', 'tecnic1'),
  makeUser('coordinacio', 'tics', 'c1'),
  makeUser('direccio_area', 'tics', 'd1'),
  makeUser('direccio_area', 'social', 'd2'),
  makeUser('finances', 'admin_finances', 'f1'),
  makeUser('admin_compres', 'admin_finances', 'a1'),
  makeUser('comptabilitat', 'admin_finances', 'k1'),
  makeUser('tecnic', 'tics', 'centre'),
];
const ambCorreus = (extra: Partial<PurchaseRequest> = {}) => ({
  createdByUserEmail: 'creador@somllar.cat',
  requestingTechnicianEmail: 'tecnic1@somllar.cat',
  ...extra,
});
const destinataris = (event: Parameters<typeof workflowService.getEventRecipients>[0], status: RequestStatus) =>
  workflowService.getEventRecipients(event, makeRequest(status, ambCorreus()), equip, ['centre@somllar.cat'])
    .map(r => `${r.email.split('@')[0]}:${r.template}${r.task ? '/' + r.task : ''}${r.variant ? '/' + r.variant : ''}`);

test('getEventRecipients: creació per un N2 avisa Direcció (N3) i confirma al sol·licitant', () => {
  assert.deepEqual(destinataris('solicitud_creada', 'pendent_direccio'), [
    'd1:task/approve', 'creador:status/registered', 'tecnic1:status/registered',
  ]);
});

test('getEventRecipients: creació sense validació prèvia avisa Administració de Compres (N5)', () => {
  assert.deepEqual(destinataris('solicitud_creada', 'aprovada'), [
    'a1:task/emit_order', 'creador:status/registered', 'tecnic1:status/registered',
  ]);
});

test('getEventRecipients: les validacions intermèdies no avisen el sol·licitant', () => {
  assert.deepEqual(destinataris('enviada_finances', 'pendent_finances'), ['f1:task/approve']);
  assert.deepEqual(destinataris('compra_aprovada', 'aprovada'), ['a1:task/emit_order']);
});

test('getEventRecipients: comanda, recepció, tancament i incidència', () => {
  assert.deepEqual(destinataris('compra_tramitada', 'comanda_emesa'), [
    'centre:status/center', 'creador:status', 'tecnic1:status',
  ]);
  assert.deepEqual(destinataris('compra_rebuda', 'rebuda'), [
    'k1:task/close_invoice', 'creador:status', 'tecnic1:status',
  ]);
  assert.deepEqual(destinataris('compra_tancada', 'tancada'), ['a1:status']);
  assert.deepEqual(destinataris('incidencia', 'incidencia'), ['a1:status', 'creador:status', 'tecnic1:status']);
});

test('getEventRecipients: retornada i rebutjada només al sol·licitant, sense duplicats ni inactius', () => {
  assert.deepEqual(destinataris('rebutjada', 'rebutjada'), ['creador:status', 'tecnic1:status']);
  const ambBaixa = [...equip, makeUser('tecnic', 'tics', 'baixa', { active: false })];
  const mateixaPersona = workflowService.getEventRecipients(
    'retornada_esmena',
    makeRequest('retornada', ambCorreus({ requestingTechnicianEmail: 'CREADOR@somllar.cat' })),
    ambBaixa
  );
  assert.deepEqual(mateixaPersona.map(r => r.email), ['creador@somllar.cat']);
  const inactiu = workflowService.getEventRecipients(
    'rebutjada',
    makeRequest('rebutjada', ambCorreus({ requestingTechnicianEmail: 'baixa@somllar.cat' })),
    ambBaixa
  );
  assert.deepEqual(inactiu.map(r => r.email), ['creador@somllar.cat']);
});

test('isTaskOwner: cada fase és tasca de qui en té la responsabilitat, no de la supervisió', () => {
  const centre = ['centre@somllar.cat'];
  assert.equal(workflowService.isTaskOwner(makeUser('coordinacio', 'tics'), makeRequest('pendent_coordinacio')), true);
  assert.equal(workflowService.isTaskOwner(makeUser('coordinacio', 'social'), makeRequest('pendent_coordinacio')), false);
  assert.equal(workflowService.isTaskOwner(makeUser('finances', 'admin_finances'), makeRequest('pendent_finances')), true);
  assert.equal(workflowService.isTaskOwner(makeUser('admin_compres'), makeRequest('aprovada')), true);
  assert.equal(workflowService.isTaskOwner(makeUser('finances'), makeRequest('aprovada')), false);
  assert.equal(workflowService.isTaskOwner(makeUser('tecnic', 'tics', 'centre'), makeRequest('comanda_emesa'), centre), true);
  assert.equal(workflowService.isTaskOwner(makeUser('comptabilitat'), makeRequest('rebuda')), true);
  assert.equal(workflowService.isTaskOwner(makeUser('tecnic', 'tics', 'tecnic1'), makeRequest('retornada')), true);
  assert.equal(workflowService.isTaskOwner(makeUser('tecnic', 'tics', 'tecnic1'), makeRequest('esborrany')), false);
  for (const role of ['superadmin', 'gerencia'] as UserRole[]) {
    assert.equal(workflowService.isTaskOwner(makeUser(role), makeRequest('pendent_coordinacio')), false, role);
  }
  assert.equal(workflowService.isTaskOwner(makeUser('admin_compres'), makeRequest('tancada')), false);
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
