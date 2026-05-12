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
  retornada: { label: 'Retornada per esmena', color: 'bg-pink-100 text-pink-800' }
};

export const ROLE_LABELS: Record<string, string> = {
  tecnic: 'Tècnic/a',
  coordinacio: 'Coordinació d\'Àrea',
  direccio_area: 'Direcció d\'Àrea',
  finances: 'Direcció ADM i Finances',
  admin_compres: 'Admin de Compres',
  comptabilitat: 'Comptabilitat',
  gerencia: 'Gerència',
  recepcio_verificacio: 'Recepció i Verificació'
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
