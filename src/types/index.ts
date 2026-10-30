/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type HierarchyLevel = 1 | 2 | 3 | 4 | 5 | 6 | 99;

export type UserRole = 'tecnic' | 'coordinacio' | 'direccio_area' | 'finances' | 'admin_compres' | 'comptabilitat' | 'gerencia' | 'superadmin';

export interface AreaItem {
  id: string;
  name: string;
  code?: string;
  description?: string;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface HierarchyRoleConfig {
  id?: string;
  key: string;
  level: number;
  code: string; // 'N1', 'N2', 'N3', 'N4', 'N5', 'N6', 'SUPER'
  label: string;
  name?: string;
  shortLabel: string;
  scope: 'area' | 'global';
  description: string;
  badgeColor: string;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface User {
  id: string;
  name: string; // Nom complet
  firstName?: string;
  lastName?: string;
  email: string;
  hierarchyLevel?: HierarchyLevel; // 1 (N1), 2 (N2), 3 (N3), 4 (N4), 5 (N5), 6 (N6), 99 (Superadmin)
  role: UserRole; // Conservat per compatibilitat amb l'esquema de rols
  areaId: string; // Àrea o departament al qual pertany (ex: 'tics', 'social', 'admin_finances', etc.)
  areaName?: string;
  active: boolean;
  notificationsEnabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type RequestStatus = 
  | 'esborrany'
  | 'enviada'
  | 'pendent_coordinacio'
  | 'retornada'
  | 'pendent_direccio'
  | 'pendent_administracio'
  | 'pendent_finances'
  | 'pendent_3_pressupostos'
  | 'pendent_comparativa'
  | 'aprovada'
  | 'rebutjada'
  | 'comanda_emesa'
  | 'rebuda'
  | 'tancada'
  | 'incidencia';

export interface PurchaseRequest {
  id: string;
  code?: string; // Codi llegible PR-YYYY-XXX
  draftId?: string;
  createdAt: string;
  updatedAt: string;
  
  // Persones implicades
  createdByUserId: string;
  createdByUserName: string;
  createdByUserEmail: string;
  requestingTechnicianId: string;
  requestingTechnicianName: string;
  requestingTechnicianEmail: string;

  areaId: string;
  areaName?: string;
  projectId: string;
  projectName?: string;
  analyticCode: string;
  category: string;
  subcategory: string;
  purchaseType?: 'be' | 'servei'; 
  itemDescription: string;
  justification: string;
  urgency: 'baixa' | 'mitjana' | 'alta' | 'critica';
  deadline: string;
  estimatedAmount: number;
  finalAmount?: number;
  status: RequestStatus;
  
  // Destí
  destinationCenterId?: string;
  destinationCenterName?: string;
  
  // Control de 3 pressupostos
  requiresThreeQuotes: boolean;
  quotesCount?: number;
  
  supplierId?: string;
  supplierName?: string;
  productUrl?: string;
  
  // Metadades seguiment
  attachmentsCount: number;
  incidentsCount?: number;

  // Fase on va entrar l'expedient en enviar-lo (els nivells anteriors no calien pel càrrec de qui l'envia)
  initialStatus?: RequestStatus;
  submittedAt?: string; // Últim enviament a validació (en crear-la o en reenviar-la)

  // Timestamps de fases
  coordinationApprovedAt?: string;
  coordinationComment?: string;
  coordinationApprovedBy?: string;
  coordinationApproverRole?: string;
  
  areaDirectionApprovedAt?: string;
  areaDirectionComment?: string;
  areaDirectionApprovedBy?: string;
  areaDirectionApproverRole?: string;

  financeApprovedAt?: string;
  financeComment?: string;
  financeApprovedBy?: string;
  financeApproverRole?: string;

  lastReturnComment?: string;
  lastReturnedBy?: string;
  lastReturnedRole?: string;
  lastReturnedAt?: string;

  rejectionComment?: string;
  rejectedBy?: string;
  rejectedRole?: string;
  rejectedAt?: string;

  orderIssuedAt?: string;
  receivedAt?: string;
  invoiceValidatedAt?: string;
  closedAt?: string;
  
  observations?: string;
  finalNotes?: string;
}



export interface Attachment {
  id: string;
  purchaseRequestId: string;
  fileName: string;
  storagePath: string;
  downloadURL: string;
  mimeType: string;
  size: number;
  category: AttachmentCategory;
  uploadedByUserId: string;
  uploadedByUserName: string;
  createdAt: string;
  status?: 'uploading' | 'completed' | 'error';
}

export type AttachmentCategory = 
  | 'pressupost'
  | 'factura_proforma'
  | 'justificacio'
  | 'aprovacio_interna'
  | 'fitxa_tecnica'
  | 'contracte'
  | 'albara'
  | 'factura'
  | 'imatge'
  | 'altres';

export interface AuditLogEntry {
  id: string;
  entityType: 'purchaseRequest' | 'worker' | 'supplier';
  entityId: string;
  action: string;
  performedByUserId: string;
  performedByUserName: string;
  role: UserRole;
  metadata?: any;
  createdAt: string;
}

export interface ApprovalRole {
  id: string;
  key: UserRole;
  label: string;
  description: string;
  active: boolean;
  canApprove: boolean;
  canReturn: boolean;
  canReject: boolean;
  order: number;
  receivesNotifications: boolean;
  requiredToAdvance: boolean;
  informationalOnly: boolean;
}

export interface NotificationSetting {
  id: string;
  eventKey: string;
  enabled: boolean;
  recipientRoles: UserRole[];
  recipientEmails: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  nif: string;
  category: string;
  status: 'candidat' | 'pendent_documentacio' | 'en_revisio' | 'homologat' | 'bloquejat' | 'baixa';
  rating: number;
  criticality: 'baixa' | 'mitjana' | 'alta';
  documents?: {id: string, name: string, date: string, type: string}[];
  email?: string;
  phone?: string;
  contactPerson?: string;
  address?: string;
  zone?: string;
  notes?: string;
}

export interface Quote {
  id: string;
  requestId: string;
  supplierId: string;
  supplierName: string;
  amount: number;
  technicalScore: number;
  qualityScore: number;
  solvedScore: number;
  deliveryScore: number;
  economicScore: number;
  totalScore: number;
  justification: string;
  isSelected: boolean;
}

export interface DestinationCenter {
  id: string;
  code: string;
  name: string;
  type: string;
  address: string;
  city: string;
  area: string;
  active: boolean;
  notes?: string;
  // Correus (en minúscules) de qui confirma la recepció del material al centre
  responsibleEmails?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AnalyticCode {
  id: string;
  code: string;
  description: string;
  projectId: string;
  area: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  code: string;
  active: boolean;
}

export interface ImportJob {
  id: string;
  entityType: 'supplier' | 'worker' | 'destinationCenter' | 'analyticCode';
  fileName: string;
  uploadedByUserId: string;
  uploadedByUserName: string;
  createdAt: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  totalRows: number;
  validRows: number;
  invalidRows: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  errorReportUrl?: string;
  mode: 'create' | 'update' | 'upsert';
}

export interface QuoteComparison {
  id: string;
  purchaseRequestId: string;
  criteria: {
    label: string;
    weight: number;
  }[];
  summary: string;
  selectedSupplierId: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  requestId?: string;
  read: boolean;
  createdAt: string;
}

export type ActivityType = 
  | 'login'
  | 'logout'
  | 'request_created'
  | 'request_updated'
  | 'request_approved'
  | 'request_returned'
  | 'request_rejected'
  | 'request_deleted'
  | 'supplier_deleted'
  | 'order_issued'
  | 'order_received'
  | 'order_closed'
  | 'quote_added'
  | 'quote_selected'
  | 'file_uploaded'
  | 'file_deleted'
  | 'user_created'
  | 'user_updated'
  | 'user_deleted'
  | 'user_deactivated'
  | 'area_created'
  | 'area_updated'
  | 'area_deleted'
  | 'hierarchy_updated'
  | 'settings_updated'
  | 'system_config_updated';

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole?: string;
  hierarchyLevel?: number;
  areaId?: string;
  areaName?: string;
  type: ActivityType;
  action: string;
  details: string;
  requestId?: string;
  requestCode?: string;
  metadata?: Record<string, any>;
  device?: string;
  createdAt: string;
}
