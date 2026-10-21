// Proves de firestore.rules amb l'emulador de Firestore.
// Execució: npm run test:rules  (necessita Java 21+ al PATH o JAVA_HOME)
import { before, after, beforeEach, describe, test } from 'node:test';
import { readFileSync } from 'node:fs';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

let env: RulesTestEnvironment;

type Profile = { role: string; hierarchyLevel: number; areaId: string };

const PROFILES: Record<string, Profile> = {
  tecnic1: { role: 'tecnic', hierarchyLevel: 1, areaId: 'tics' },
  altre: { role: 'tecnic', hierarchyLevel: 1, areaId: 'tics' },
  coordTics: { role: 'coordinacio', hierarchyLevel: 2, areaId: 'tics' },
  coordSocial: { role: 'coordinacio', hierarchyLevel: 2, areaId: 'social' },
  dirTics: { role: 'direccio_area', hierarchyLevel: 3, areaId: 'tics' },
  finances: { role: 'finances', hierarchyLevel: 4, areaId: 'admin_finances' },
  compres: { role: 'admin_compres', hierarchyLevel: 5, areaId: 'admin_finances' },
  comptable: { role: 'comptabilitat', hierarchyLevel: 5, areaId: 'admin_finances' },
};

const asUser = (uid: string) =>
  env.authenticatedContext(uid, {
    email: `${uid.toLowerCase()}@somllar.cat`,
    firebase: { sign_in_provider: 'microsoft.com' },
  }).firestore();

const baseRequest = (status: string) => ({
  status,
  areaId: 'tics',
  createdByUserId: 'tecnic1',
  requestingTechnicianId: 'tecnic1',
  observations: '',
  updatedAt: 't0',
});

const seed = async (status: string) => {
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    for (const [uid, p] of Object.entries(PROFILES)) {
      await setDoc(doc(db, 'users', uid), { ...p, email: `${uid.toLowerCase()}@somllar.cat`, active: true });
    }
    await setDoc(doc(db, 'purchaseRequests', 'r1'), baseRequest(status));
  });
};

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'som-llar-rules-test',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});
after(async () => { await env.cleanup(); });
beforeEach(async () => { await env.clearFirestore(); });

describe('accés corporatiu', () => {
  test('un compte no corporatiu no pot llegir sol·licituds', async () => {
    await seed('pendent_coordinacio');
    const gmail = env.authenticatedContext('x', {
      email: 'persona@gmail.com',
      firebase: { sign_in_provider: 'microsoft.com' },
    }).firestore();
    await assertFails(getDoc(doc(gmail, 'purchaseRequests', 'r1')));
  });

  test('un compte @somllar.cat amb proveïdor Google no pot llegir', async () => {
    await seed('pendent_coordinacio');
    const google = env.authenticatedContext('x', {
      email: 'persona@somllar.cat',
      firebase: { sign_in_provider: 'google.com' },
    }).firestore();
    await assertFails(getDoc(doc(google, 'purchaseRequests', 'r1')));
  });

  test('un usuari no autenticat no pot llegir', async () => {
    await seed('pendent_coordinacio');
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'purchaseRequests', 'r1')));
  });

  test('un compte corporatiu Microsoft pot llegir', async () => {
    await seed('pendent_coordinacio');
    await assertSucceeds(getDoc(doc(asUser('altre'), 'purchaseRequests', 'r1')));
  });
});

describe('circuit d\'aprovació', () => {
  const approve = (uid: string, to: string, extra: Record<string, unknown> = {}) =>
    updateDoc(doc(asUser(uid), 'purchaseRequests', 'r1'), { status: to, updatedAt: 't1', ...extra });

  test('coordinació de la mateixa àrea aprova', async () => {
    await seed('pendent_coordinacio');
    await assertSucceeds(approve('coordTics', 'pendent_direccio', { coordinationApprovedAt: 't1' }));
  });

  test('coordinació d\'una altra àrea NO pot aprovar', async () => {
    await seed('pendent_coordinacio');
    await assertFails(approve('coordSocial', 'pendent_direccio', { coordinationApprovedAt: 't1' }));
  });

  test('no es pot saltar fases (coordinació → aprovada)', async () => {
    await seed('pendent_coordinacio');
    await assertFails(approve('coordTics', 'aprovada'));
  });

  test('coordinació no pot tocar camps d\'altres fases en aprovar', async () => {
    await seed('pendent_coordinacio');
    await assertFails(approve('coordTics', 'pendent_direccio', { finalAmount: 1 }));
  });

  test('coordinació no pot aprovar el pas de direcció', async () => {
    await seed('pendent_direccio');
    await assertFails(approve('coordTics', 'pendent_finances'));
    await assertSucceeds(approve('dirTics', 'pendent_finances', { areaDirectionApprovedAt: 't1' }));
  });

  test('un tècnic aliè no pot tramitar res', async () => {
    await seed('pendent_coordinacio');
    await assertFails(approve('altre', 'pendent_direccio'));
  });

  test('es pot retornar i rebutjar des de la fase pròpia', async () => {
    await seed('pendent_coordinacio');
    await assertSucceeds(approve('coordTics', 'retornada', { lastReturnComment: 'falta info' }));
    await seed('pendent_coordinacio');
    await assertSucceeds(approve('coordTics', 'rebutjada', { rejectionComment: 'no' }));
  });
});

describe('emetre comanda (aprovada → comanda_emesa)', () => {
  const emit = (uid: string) =>
    updateDoc(doc(asUser(uid), 'purchaseRequests', 'r1'), { status: 'comanda_emesa', updatedAt: 't1' });

  test('Finances pot emetre', async () => {
    await seed('aprovada');
    await assertSucceeds(emit('finances'));
  });
  test('Admin Compres pot emetre (supervisió)', async () => {
    await seed('aprovada');
    await assertSucceeds(emit('compres'));
  });
  test('Comptabilitat NO pot emetre', async () => {
    await seed('aprovada');
    await assertFails(emit('comptable'));
  });
  test('el sol·licitant NO pot emetre', async () => {
    await seed('aprovada');
    await assertFails(emit('tecnic1'));
  });
});

describe('pressupostos (quotes)', () => {
  const quote = (extra: Record<string, unknown> = {}) => ({ requestId: 'r1', supplierName: 'P', amount: 10, isSelected: false, ...extra });
  const seedQuote = () =>
    env.withSecurityRulesDisabled(ctx => setDoc(doc(ctx.firestore(), 'quotes', 'q1'), quote()));

  test('el sol·licitant crea un pressupost mentre la coordinació no ha aprovat', async () => {
    await seed('pendent_coordinacio');
    await assertSucceeds(setDoc(doc(asUser('tecnic1'), 'quotes', 'q1'), quote()));
  });
  test('un tècnic aliè no pot crear pressupostos', async () => {
    await seed('pendent_coordinacio');
    await assertFails(setDoc(doc(asUser('altre'), 'quotes', 'q1'), quote()));
  });
  test('el sol·licitant ja no pot afegir-ne un cop passat a direcció', async () => {
    await seed('pendent_direccio');
    await assertFails(setDoc(doc(asUser('tecnic1'), 'quotes', 'q1'), quote()));
  });
  test('qui aprova la fase pot adjudicar (isSelected), però no canviar l\'import', async () => {
    await seed('pendent_coordinacio');
    await seedQuote();
    await assertSucceeds(updateDoc(doc(asUser('coordTics'), 'quotes', 'q1'), { isSelected: true }));
    await assertFails(updateDoc(doc(asUser('coordTics'), 'quotes', 'q1'), { amount: 1 }));
  });
  test('coordinació d\'una altra àrea no pot adjudicar', async () => {
    await seed('pendent_coordinacio');
    await seedQuote();
    await assertFails(updateDoc(doc(asUser('coordSocial'), 'quotes', 'q1'), { isSelected: true }));
  });
});

describe('creació de sol·licituds', () => {
  const create = (uid: string, data: Record<string, unknown>) =>
    setDoc(doc(asUser(uid), 'purchaseRequests', 'nova'), data);

  test('es pot crear a nom propi com a pendent de coordinació', async () => {
    await seed('esborrany');
    await assertSucceeds(create('tecnic1', { ...baseRequest('pendent_coordinacio') }));
  });
  test('no es pot crear a nom d\'un altre', async () => {
    await seed('esborrany');
    await assertFails(create('altre', { ...baseRequest('pendent_coordinacio') }));
  });
  test('no es pot crear ja aprovada ni amb camps d\'aprovació', async () => {
    await seed('esborrany');
    await assertFails(create('tecnic1', { ...baseRequest('aprovada') }));
    await assertFails(create('tecnic1', { ...baseRequest('pendent_coordinacio'), coordinationApprovedAt: 't' }));
  });
});

describe('perfils d\'usuari', () => {
  test('alta pròpia com a tècnic sense privilegis', async () => {
    await assertSucceeds(
      setDoc(doc(asUser('nou'), 'users', 'nou'), { email: 'nou@somllar.cat', role: 'tecnic', hierarchyLevel: 1, active: true })
    );
  });
  test('no es pot donar d\'alta com a superadmin', async () => {
    await assertFails(
      setDoc(doc(asUser('nou'), 'users', 'nou'), { email: 'nou@somllar.cat', role: 'superadmin', hierarchyLevel: 99, active: true })
    );
  });
  test('no es pot canviar el propi rol ni nivell', async () => {
    await seed('esborrany');
    await assertFails(updateDoc(doc(asUser('tecnic1'), 'users', 'tecnic1'), { role: 'finances' }));
    await assertFails(updateDoc(doc(asUser('tecnic1'), 'users', 'tecnic1'), { hierarchyLevel: 4 }));
  });
  test('sí es poden editar camps no protegits del propi perfil', async () => {
    await seed('esborrany');
    await assertSucceeds(updateDoc(doc(asUser('tecnic1'), 'users', 'tecnic1'), { notificationsEnabled: false }));
  });
});

describe('dades mestres', () => {
  test('només administradors escriuen proveïdors', async () => {
    await seed('esborrany');
    await assertFails(setDoc(doc(asUser('tecnic1'), 'suppliers', 's1'), { name: 'X' }));
    await assertSucceeds(setDoc(doc(asUser('finances'), 'suppliers', 's1'), { name: 'X' }));
  });
  test('els logs d\'auditoria no es poden modificar', async () => {
    await seed('esborrany');
    await assertSucceeds(setDoc(doc(asUser('tecnic1'), 'auditLogs', 'l1'), { action: 'x' }));
    await assertFails(updateDoc(doc(asUser('finances'), 'auditLogs', 'l1'), { action: 'y' }));
  });
});
