export const CATEGORIES = [
  { id: 'alimentacio', name: 'Alimentació' },
  { id: 'oficina', name: 'Material d\'oficina' },
  { id: 'neteja', name: 'Material de neteja' },
  { id: 'tallers', name: 'Materials per a tallers' },
  { id: 'transport', name: 'Transport' },
  { id: 'habitatge', name: 'Habitatge i parament' },
  { id: 'equipaments', name: 'Equipaments i Tecnologia' },
  { id: 'mobiliari', name: 'Mobiliari' },
  { id: 'serveis_generals', name: 'Serveis Generals' },
  { id: 'altres', name: 'Altres' }
];

export const STATUS_LABELS: Record<string, { label: string, color: string }> = {
  esborrany: { label: 'Esborrany', color: 'bg-gray-100 text-gray-800' },
  enviada: { label: 'Enviada', color: 'bg-blue-100 text-blue-800' },
  pendent_coordinacio: { label: 'Pend. Coordinació', color: 'bg-yellow-100 text-yellow-800' },
  pendent_direccio: { label: 'Pend. Direcció d\'Àrea', color: 'bg-orange-100 text-orange-800' },
  pendent_finances: { label: 'Pend. Finances', color: 'bg-purple-100 text-purple-800' },
  aprovada: { label: 'Aprovada', color: 'bg-green-100 text-green-800' },
  pendent_3_pressupostos: { label: 'Falten 3 Pressupostos', color: 'bg-red-100 text-red-800' },
  comanda_emesa: { label: 'Comanda Emesa', color: 'bg-indigo-100 text-indigo-800' },
  rebuda: { label: 'Rebuda', color: 'bg-teal-100 text-teal-800' },
  tancada: { label: 'Tancada', color: 'bg-gray-200 text-gray-600' },
  incidencia: { label: 'Incidència', color: 'bg-red-200 text-red-900' },
  retornada: { label: 'Retornada per esmena', color: 'bg-pink-100 text-pink-800' },
  rebutjada: { label: 'Rebutjada', color: 'bg-rose-100 text-rose-800' },
  pendent_administracio: { label: 'Pend. Administració', color: 'bg-cyan-100 text-cyan-800' },
  pendent_comparativa: { label: 'Pend. Comparativa Ofertes', color: 'bg-amber-100 text-amber-800' }
};

export const ROLE_LABELS: Record<string, string> = {
  tecnic: 'Tècnic/a Sol·licitant',
  coordinacio: 'Coordinació d\'Àrea',
  direccio_area: 'Direcció d\'Àrea',
  finances: 'Direcció ADM i Finances',
  admin_compres: 'Administració de Compres',
  comptabilitat: 'Comptabilitat',
  gerencia: 'Gerència / Direcció General',
  recepcio_verificacio: 'Recepció i Verificació',
  superadmin: 'Superadministrador'
};

export interface HierarchyRoleConfig {
  key: string;
  level: number;
  label: string;
  shortLabel: string;
  scope: 'area' | 'global';
  description: string;
  badgeColor: string;
}

export const HIERARCHY_ROLES: HierarchyRoleConfig[] = [
  {
    key: 'tecnic',
    level: 1,
    label: 'Tècnic/a Sol·licitant',
    shortLabel: 'N1 · Tècnic/a',
    scope: 'area',
    description: 'Genera peticions de compra vinculades a la seva àrea i projectes.',
    badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20'
  },
  {
    key: 'coordinacio',
    level: 2,
    label: 'Coordinació d\'Àrea',
    shortLabel: 'N2 · Coordinació',
    scope: 'area',
    description: 'Primer nivell d\'aprovació (vistiplau tècnic de l\'àrea de la compra).',
    badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
  },
  {
    key: 'direccio_area',
    level: 3,
    label: 'Direcció d\'Àrea',
    shortLabel: 'N3 · Direcció Àrea',
    scope: 'area',
    description: 'Segon nivell d\'aprovació (validació pressupostària i estratègica d\'àrea).',
    badgeColor: 'bg-orange-500/10 text-orange-400 border-orange-500/20'
  },
  {
    key: 'finances',
    level: 4,
    label: 'Direcció ADM i Finances',
    shortLabel: 'N4 · Finances',
    scope: 'global',
    description: 'Tercer nivell d\'aprovació (control fiscal, tresoreria i autorització global).',
    badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20'
  },
  {
    key: 'admin_compres',
    level: 5,
    label: 'Administració de Compres',
    shortLabel: 'N5 · Admin Compres',
    scope: 'global',
    description: 'Tramitació i emissió operativa de comandes formals a proveïdors.',
    badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
  },
  {
    key: 'comptabilitat',
    level: 5,
    label: 'Comptabilitat',
    shortLabel: 'N5 · Comptabilitat',
    scope: 'global',
    description: 'Validació i conformitat de factures rebudes i tancament documental.',
    badgeColor: 'bg-teal-500/10 text-teal-400 border-teal-500/20'
  },
  {
    key: 'gerencia',
    level: 6,
    label: 'Gerència / Direcció General',
    shortLabel: 'N6 · Gerència',
    scope: 'global',
    description: 'Supervisió executiva superior i decisions estratègiques institucionals.',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
  },
  {
    key: 'superadmin',
    level: 99,
    label: 'Superadministrador',
    shortLabel: 'Superadmin',
    scope: 'global',
    description: 'Administració tècnica del sistema, configuració de regles i usuaris.',
    badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/20'
  }
];

export const getHierarchyRole = (roleKey?: string): HierarchyRoleConfig => {
  const normKey = (roleKey || '').toLowerCase().trim();
  const mappedKey = 
    normKey === 'gerencia' ? 'gerencia' :
    normKey === 'responsablearea' || normKey === 'direccio' || normKey === 'direccio_area' ? 'direccio_area' :
    normKey === 'coordinacio' || normKey === 'coordinador' ? 'coordinacio' :
    normKey === 'finances' || normKey === 'finanzas' || normKey === 'administracio' ? 'finances' :
    normKey === 'admin' || normKey === 'superadmin' ? 'superadmin' :
    normKey === 'admin_compres' ? 'admin_compres' :
    normKey === 'comptabilitat' ? 'comptabilitat' :
    normKey === 'tecnico' || normKey === 'tecnic' ? 'tecnic' :
    normKey;

  return HIERARCHY_ROLES.find(r => r.key === mappedKey) || {
    key: roleKey || 'tecnic',
    level: 0,
    label: ROLE_LABELS[mappedKey] || (roleKey ? (ROLE_LABELS[roleKey] || roleKey) : 'Treballador/a'),
    shortLabel: ROLE_LABELS[mappedKey] || (roleKey ? (ROLE_LABELS[roleKey] || roleKey) : 'Treballador/a'),
    scope: 'global',
    description: 'Rol assignat al treballador',
    badgeColor: 'bg-slate-500/10 text-slate-400 border-slate-500/20'
  };
};

export const getAreaName = (areaId?: string): string => {
  if (!areaId) return 'Sense Àrea';
  const found = AREAS.find(a => a.id.toLowerCase() === areaId.toLowerCase());
  return found ? found.name : areaId.toUpperCase();
};

export const ATTACHMENT_CATEGORIES = [
  { id: 'pressupost', name: 'Pressupost' },
  { id: 'factura_proforma', name: 'Factura Proforma' },
  { id: 'justificacio', name: 'Justificació' },
  { id: 'aprovacio_interna', name: 'Aprovació Interna' },
  { id: 'fitxa_tecnica', name: 'Fitxa Tècnica' },
  { id: 'contracte', name: 'Contracte' },
  { id: 'albara', name: 'Albarà' },
  { id: 'factura', name: 'Factura' },
  { id: 'imatge', name: 'Imatge' },
  { id: 'altres', name: 'Altres' }
];

export const NOTIFICATION_EVENTS = [
  { id: 'solicitud_creada', name: 'Sol·licitud creada' },
  { id: 'retornada_esmena', name: 'Retornada per esmena' },
  { id: 'rebutjada', name: 'Rebutjada' },
  { id: 'validada_direccio', name: 'Validada per direcció d\'àrea' },
  { id: 'enviada_finances', name: 'Enviada a finances' },
  { id: 'compra_aprovada', name: 'Compra aprovada' },
  { id: 'compra_tramitada', name: 'Compra tramitada' },
  { id: 'incidencia', name: 'Incidència' },
  { id: 'compra_tancada', name: 'Compra tancada' }
];

export const AREAS = [
  { id: 'social', name: 'Àrea Social' },
  { id: 'admin', name: 'Administració' },
  { id: 'logistica', name: 'Logística' },
  { id: 'it', name: 'Sistemes i IT' },
  { id: 'formacio', name: 'Formació' }
];
