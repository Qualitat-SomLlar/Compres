import { PurchaseRequest, Supplier, User, Worker, NotificationSetting, Attachment } from '../types';

export const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Joan Tècnic', email: 'joan@somllar.org', role: 'tecnic', areaId: 'social' },
  { id: 'u2', name: 'Marta Coordi', email: 'marta@somllar.org', role: 'coordinacio', areaId: 'social' },
  { id: 'u3', name: 'Albert Director', email: 'albert@somllar.org', role: 'direccio_area', areaId: 'social' },
  { id: 'u4', name: 'Laura Finances', email: 'laura@somllar.org', role: 'finances', areaId: 'admin' },
];

export const MOCK_WORKERS: Worker[] = [
  {
    id: 'w1',
    firstName: 'Pau',
    lastName: 'García',
    fullName: 'Pau García',
    email: 'pgarcia@somllar.org',
    area: 'social',
    internalRole: 'Educador Social',
    approvalFlowRole: 'tecnic',
    active: true,
    notificationsEnabled: true,
    createdAt: '2023-01-10T09:00:00Z',
    updatedAt: '2023-01-10T09:00:00Z'
  },
  {
    id: 'w2',
    firstName: 'Sílvia',
    lastName: 'Martínez',
    fullName: 'Sílvia Martínez',
    email: 'smartinez@somllar.org',
    area: 'logistica',
    internalRole: 'Manteniment',
    approvalFlowRole: 'tecnic',
    active: true,
    notificationsEnabled: true,
    createdAt: '2023-02-15T10:00:00Z',
    updatedAt: '2023-02-15T10:00:00Z'
  },
  {
    id: 'w3',
    firstName: 'Enric',
    lastName: 'Vila',
    fullName: 'Enric Vila',
    email: 'evila@somllar.org',
    area: 'formacio',
    internalRole: 'Cap de Formació',
    approvalFlowRole: 'coordinacio',
    active: true,
    notificationsEnabled: true,
    createdAt: '2023-03-20T11:00:00Z',
    updatedAt: '2023-03-20T11:00:00Z'
  }
];

export const MOCK_SUPPLIERS: Supplier[] = [
  { id: 's1', name: 'OfiServei SL', nif: 'B12345678', category: 'oficina', status: 'homologat', rating: 4.5, criticality: 'baixa' },
  { id: 's2', name: 'Aliments Prohabitatge', nif: 'A87654321', category: 'alimentacio', status: 'pendent_documentacio', rating: 3.8, criticality: 'alta' },
  { id: 's3', name: 'NetejaExpress', nif: 'B55544433', category: 'neteja', status: 'en_revisio', rating: 4.0, criticality: 'mitjana' },
  { id: 's4', name: 'Construccions Som', nif: 'B99988877', category: 'serveis_generals', status: 'homologat', rating: 4.8, criticality: 'alta' },
];

export const MOCK_REQUESTS: PurchaseRequest[] = [
  {
    id: 'PR-2024-001',
    code: 'PR-2024-001',
    createdAt: '2024-04-01T10:00:00Z',
    updatedAt: '2024-04-02T12:00:00Z',
    createdByUserId: 'u2',
    createdByUserName: 'Marta Coordi',
    createdByUserEmail: 'marta@somllar.org',
    requestingTechnicianId: 'w1',
    requestingTechnicianName: 'Pau García',
    requestingTechnicianEmail: 'pgarcia@somllar.org',
    areaId: 'social',
    projectId: 'PISOS-ACCÉS',
    analyticCode: '6290001',
    category: 'oficina',
    subcategory: 'Papereria',
    itemDescription: '50 paquets de folis DIN-A4 i material d\'escriptori',
    justification: 'Necessari per al funcionament dels punts d\'atenció',
    urgency: 'mitjana',
    deadline: '2024-04-15',
    estimatedAmount: 250,
    status: 'pendent_coordinacio',
    requiresThreeQuotes: false,
    attachmentsCount: 1,
    supplierId: 's1',
    supplierName: 'OfiServei SL'
  },
  {
    id: 'PR-2024-002',
    code: 'PR-2024-002',
    createdAt: '2024-04-05T09:00:00Z',
    updatedAt: '2024-04-05T09:00:00Z',
    createdByUserId: 'u2',
    createdByUserName: 'Marta Coordi',
    createdByUserEmail: 'marta@somllar.org',
    requestingTechnicianId: 'w2',
    requestingTechnicianName: 'Sílvia Martínez',
    requestingTechnicianEmail: 'smartinez@somllar.org',
    areaId: 'social',
    projectId: 'REFORMES-2024',
    analyticCode: '6220005',
    category: 'serveis_generals',
    subcategory: 'Obres',
    itemDescription: 'Reforma integral bany pis carrer Còrsega',
    justification: 'Adequació per a nova entrada d\'usuaris',
    urgency: 'alta',
    deadline: '2024-05-01',
    estimatedAmount: 6200,
    status: 'pendent_3_pressupostos',
    requiresThreeQuotes: true,
    attachmentsCount: 0,
    supplierName: 'Pendent de selecció'
  }
];

export const MOCK_CENTERS: any[] = [
  { id: 'c1', code: 'BCN-CENTRE', name: 'Oficina Central Barcelona', type: 'oficina', address: 'C/ Còrsega 300', city: 'Barcelona', area: 'admin', active: true, createdAt: '2023-01-01T00:00:00Z', updatedAt: '2023-01-01T00:00:00Z' },
  { id: 'c2', code: 'TRR-social', name: 'Centre Social Terrassa', type: 'servei', address: 'Av. Vallès 45', city: 'Terrassa', area: 'social', active: true, createdAt: '2023-01-01T00:00:00Z', updatedAt: '2023-01-01T00:00:00Z' },
  { id: 'c3', code: 'PIS-01', name: 'Habitatge Som 01', type: 'pis', address: 'C/ Major 10', city: 'Barcelona', area: 'social', active: true, createdAt: '2023-01-01T00:00:00Z', updatedAt: '2023-01-01T00:00:00Z' },
];

export const MOCK_ANALYTIC_CODES: any[] = [
  { id: 'ac1', code: '6290001', description: 'Material Oficina General', projectId: 'ADM-GEN', area: 'admin', active: true, createdAt: '2023-01-01T00:00:00Z', updatedAt: '2023-01-01T00:00:00Z' },
  { id: 'ac2', code: '6220005', description: 'Reformes i Manteniment Pisos', projectId: 'PISOS-ACCÉS', area: 'social', active: true, createdAt: '2023-01-01T00:00:00Z', updatedAt: '2023-01-01T00:00:00Z' },
  { id: 'ac3', code: '6230008', description: 'Activitats i Tallers Socials', projectId: 'TALLERS-2024', area: 'social', active: true, createdAt: '2023-01-01T00:00:00Z', updatedAt: '2023-01-01T00:00:00Z' },
];

export const MOCK_PROJECTS: any[] = [
  { id: 'p1', name: 'Administració General', code: 'ADM-GEN', active: true },
  { id: 'p2', name: 'Pisos d\'Accés Social', code: 'PISOS-ACCÉS', active: true },
  { id: 'p3', name: 'Tallers Ocupacionals 2024', code: 'TALLERS-2024', active: true },
];

export const MOCK_NOTIFICATION_SETTINGS: NotificationSetting[] = [
  {
    id: 'ns1',
    targetType: 'role',
    targetId: 'coordinacio',
    eventKey: 'solicitud_creada',
    enabled: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'ns2',
    targetType: 'role',
    targetId: 'finances',
    eventKey: 'enviada_finances',
    enabled: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];
