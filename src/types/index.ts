/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'tecnic' | 'coordinacio' | 'direccio_area' | 'finances' | 'admin_compres' | 'comptabilitat' | 'gerencia';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  areaId: string;
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
  
  // Metadades seguiment
  attachmentsCount: number;
  incidentsCount?: number;
  
  // Timestamps de fases
  coordinationApprovedAt?: string;
  areaDirectionApprovedAt?: string;
  financeApprovedAt?: string;
  receivedAt?: string;
  invoiceValidatedAt?: string;
  closedAt?: string;
  
  observations?: string;
  finalNotes?: string;
}

export interface Worker {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  area: string;
  internalRole: string; // P.ex: Tècnic de camp
  approvalFlowRole: UserRole;
  active: boolean;
  notificationsEnabled: boolean;
  managerId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
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
  targetType: 'role' | 'user';
  targetId: string;
  eventKey: string;
  enabled: boolean;
  emailOverride?: string;
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
