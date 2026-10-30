import { User, PurchaseRequest, RequestStatus } from '../types';
import { normalizeAreaId, getAreaName, getHierarchyRole } from '../constants';

const levelOf = (user: User) => user.hierarchyLevel || getHierarchyRole(user.role).level;
const lower = (email?: string) => (email || '').toLowerCase().trim();

// Rols que ja estan per sobre de tot el circuit d'aprovació (equivalent a startStatus de firestore.rules)
const ABOVE_APPROVAL_ROLES = ['finances', 'admin_compres', 'comptabilitat', 'gerencia', 'superadmin'];

/**
 * Esdeveniments del circuit que generen avisos (claus de notificationSettings).
 */
export type WorkflowEvent =
  | 'solicitud_creada'
  | 'validada_direccio'
  | 'enviada_finances'
  | 'compra_aprovada'
  | 'compra_tramitada'
  | 'compra_rebuda'
  | 'compra_tancada'
  | 'retornada_esmena'
  | 'rebutjada'
  | 'incidencia';

/**
 * Destinatari d'un avís:
 * - 'task': ha d'actuar (validar, emetre la comanda o conformar la factura).
 * - 'status': només se l'informa. `variant` adapta el text (confirmació de registre o avís al centre).
 */
export interface EventRecipient {
  email: string;
  userId?: string;
  template: 'task' | 'status';
  task?: 'approve' | 'emit_order' | 'close_invoice';
  roleName?: string;
  variant?: 'registered' | 'center';
}

export const PHASE_ROLE_NAMES: Partial<Record<RequestStatus, string>> = {
  pendent_coordinacio: "Coordinació d'Àrea (N2)",
  pendent_direccio: "Direcció d'Àrea (N3)",
  pendent_finances: 'Direcció ADM i Finances (N4)',
  aprovada: 'Administració de Compres (N5)',
};

export const workflowService = {
  /**
   * Fase on entra una sol·licitud quan s'envia: cada càrrec se salta el seu nivell i els inferiors.
   * Els nivells d'àrea (N2, N3) només se salten si la compra és de la mateixa àrea de qui l'envia.
   */
  getInitialStatus(submitter: User | undefined, areaId?: string): RequestStatus {
    if (!submitter) return 'pendent_coordinacio';
    const level = levelOf(submitter);
    if (level >= 4 || ABOVE_APPROVAL_ROLES.includes(submitter.role)) return 'aprovada';
    if (normalizeAreaId(submitter.areaId) !== normalizeAreaId(areaId)) return 'pendent_coordinacio';
    if (level === 3 || submitter.role === 'direccio_area') return 'pendent_finances';
    if (level === 2 || submitter.role === 'coordinacio') return 'pendent_direccio';
    return 'pendent_coordinacio';
  },

  /**
   * Només Coordinació (N2) o càrrecs superiors poden crear sol·licituds.
   */
  canCreateRequest(user?: User): boolean {
    if (!user) return false;
    return levelOf(user) >= 2 || ['coordinacio', 'direccio_area', ...ABOVE_APPROVAL_ROLES].includes(user.role);
  },

  /**
   * Indica si un pas de validació no ha calgut perquè l'expedient hi va entrar més endavant.
   */
  isStepSkipped(request: PurchaseRequest, step: 'pendent_coordinacio' | 'pendent_direccio' | 'pendent_finances'): boolean {
    const order: RequestStatus[] = ['pendent_coordinacio', 'pendent_direccio', 'pendent_finances', 'aprovada'];
    const start = request.initialStatus ? order.indexOf(request.initialStatus) : -1;
    return start > order.indexOf(step);
  },

  /**
   * Indica si l'expedient espera una acció d'aquesta persona pel seu càrrec (sense comptar
   * la supervisió global, que pot actuar a tot arreu però no n'és la responsable):
   * esmenar/enviar (sol·licitant), validar (N2/N3/N4), emetre la comanda (N5),
   * confirmar la recepció (responsable del centre) o conformar la factura (Comptabilitat).
   */
  isTaskOwner(user: User | undefined, request: PurchaseRequest, centerResponsibleEmails: string[] = []): boolean {
    if (!user) return false;
    switch (request.status) {
      case 'esborrany':
        return request.createdByUserId === user.id;
      case 'retornada':
        return request.createdByUserId === user.id || request.requestingTechnicianId === user.id;
      case 'pendent_coordinacio':
      case 'pendent_direccio':
      case 'pendent_finances':
        return (this.getEligibleApprovers(request, [user])?.users.length ?? 0) > 0;
      case 'aprovada':
        return user.role === 'admin_compres';
      case 'comanda_emesa':
        return centerResponsibleEmails.map(lower).includes(lower(user.email));
      case 'rebuda':
        return user.role === 'comptabilitat';
      default:
        return false;
    }
  },

  /**
   * Nom curt de l'acció pendent en cada fase.
   */
  getTaskActionLabel(status: RequestStatus): string {
    switch (status) {
      case 'esborrany': return 'Enviar';
      case 'retornada': return 'Esmenar';
      case 'pendent_coordinacio':
      case 'pendent_direccio':
      case 'pendent_finances': return 'Validar';
      case 'aprovada': return 'Emetre comanda';
      case 'comanda_emesa': return 'Confirmar recepció';
      case 'rebuda': return 'Conformar factura';
      default: return 'Obrir';
    }
  },

  /**
   * Text curt de qui ha de validar (o tramitar) una sol·licitud que entra a aquesta fase.
   */
  getPhaseLabel(status: RequestStatus, areaName?: string): string {
    switch (status) {
      case 'pendent_coordinacio': return `Coordinació (N2)${areaName ? ` de ${areaName}` : ''}`;
      case 'pendent_direccio': return `Direcció d'Àrea (N3)${areaName ? ` de ${areaName}` : ''}`;
      case 'pendent_finances': return 'Direcció ADM i Finances (N4)';
      case 'aprovada': return 'Administració de Compres (N5), sense validació prèvia';
      default: return '';
    }
  },

  /**
   * Determine the next status based on the current status and the action taken.
   */
  getNextStatus(currentStatus: RequestStatus, action: 'approve' | 'return' | 'reject'): RequestStatus {
    if (action === 'reject') return 'rebutjada';
    if (action === 'return') return 'retornada';

    switch (currentStatus) {
      case 'esborrany':
      case 'retornada':
        return 'pendent_coordinacio';
      case 'pendent_coordinacio':
        return 'pendent_direccio';
      case 'pendent_direccio':
        return 'pendent_finances';
      case 'pendent_finances':
        return 'aprovada';
      case 'aprovada':
        return 'comanda_emesa';
      case 'comanda_emesa':
        return 'rebuda';
      case 'rebuda':
        return 'tancada';
      default:
        return currentStatus;
    }
  },

  /**
   * Check if a user has permission to approve/manage the request in its current state.
   */
  canUserApprove(user?: User, request?: PurchaseRequest, centerResponsibleEmails: string[] = []): boolean {
    if (!user || !request) return false;
    const { status } = request;
    const userLevel = user.hierarchyLevel || getHierarchyRole(user.role).level;
    const userRole = user.role;
    const requestArea = normalizeAreaId(request.areaId);
    const userArea = normalizeAreaId(user.areaId);

    // Superadmins (99), Gerència (6) i Admin Compres tenen facultat de supervisió global
    if (userLevel === 99 || userLevel === 6 || userRole === 'superadmin' || userRole === 'gerencia' || userRole === 'admin_compres') {
      return true;
    }

    switch (status) {
      case 'esborrany':
      case 'retornada':
        // Només el creador o tècnic pot tramitar la sol·licitud
        return request.createdByUserId === user.id || request.requestingTechnicianId === user.id;
      
      case 'pendent_coordinacio':
        // 1r PAS D'APROVACIÓ: Només N2 (Coordinació) de la mateixa àrea que la compra
        return (userLevel === 2 || userRole === 'coordinacio') && requestArea === userArea;
      
      case 'pendent_direccio':
        // 2n PAS D'APROVACIÓ: Només N3 (Direcció d'Àrea) de la mateixa àrea que la compra
        return (userLevel === 3 || userRole === 'direccio_area') && requestArea === userArea;
      
      case 'pendent_finances':
        // 3r PAS D'APROVACIÓ: N4 Finances a nivell institucional
        return userLevel === 4 || userRole === 'finances';
      
      case 'aprovada':
        // Emissió formal de comanda: Finances (N4); Administració de Compres, Gerència i Superadmin
        // ja hi accedeixen per la supervisió global. Comptabilitat (N5) no pot emetre comandes.
        return userLevel === 4 || userRole === 'finances';

      case 'comanda_emesa':
        // Conformitat de recepció de béns / serveis: responsable del centre de destí (o N4+)
        return centerResponsibleEmails.map(lower).includes(lower(user.email)) ||
               userLevel >= 4;

      case 'rebuda':
        // Conformitat de factura i tancament comptable
        return userLevel >= 4 || userRole === 'finances' || userRole === 'comptabilitat';

      default:
        return false;
    }
  },

  /**
   * Supervisió global del circuit (equivalent a isWorkflowSupervisor de firestore.rules).
   */
  isWorkflowSupervisor(user?: User): boolean {
    if (!user) return false;
    const userLevel = user.hierarchyLevel || getHierarchyRole(user.role).level;
    return userLevel === 99 || userLevel === 6 ||
      user.role === 'superadmin' || user.role === 'gerencia' || user.role === 'admin_compres';
  },

  /**
   * Perfil d'administració (equivalent a isAdmin de firestore.rules).
   */
  isAdminProfile(user?: User): boolean {
    if (!user) return false;
    const userLevel = user.hierarchyLevel || getHierarchyRole(user.role).level;
    return this.isWorkflowSupervisor(user) || user.role === 'finances' || [4, 5, 6, 99].includes(userLevel);
  },

  /**
   * Qui pot afegir, adjudicar o eliminar pressupostos (equivalent a canManageQuotesOn de firestore.rules):
   * el sol·licitant fins que coordinació aprova, qui aprova la fase actual fins a finances, o la supervisió global.
   */
  canManageQuotes(user?: User, request?: PurchaseRequest): boolean {
    if (!user || !request) return false;
    if (this.isWorkflowSupervisor(user)) return true;
    const isRequester = request.createdByUserId === user.id || request.requestingTechnicianId === user.id;
    if (isRequester && ['esborrany', 'retornada', 'pendent_coordinacio'].includes(request.status)) return true;
    return ['pendent_coordinacio', 'pendent_direccio', 'pendent_finances'].includes(request.status) &&
      this.canUserApprove(user, request);
  },

  /**
   * Qui rep cada avís del circuit (correu i notificació a l'aplicació):
   * - Creació: el primer nivell que ha de validar (o N5 si no cal validació) + confirmació al sol·licitant.
   * - Validacions intermèdies: el nivell següent. El sol·licitant no rep res.
   * - Aprovada: Administració de Compres (N5), per emetre la comanda.
   * - Comanda emesa: el sol·licitant i el responsable del centre de destí (que confirmarà la recepció).
   * - Rebuda: el sol·licitant i Comptabilitat (conformitat de factura).
   * - Tancada: Administració de Compres (N5).
   * - Retornada / rebutjada: només el sol·licitant.
   * - Incidència: Administració de Compres (N5) i el sol·licitant.
   * "Sol·licitant" vol dir qui ha creat la sol·licitud i el tècnic a nom de qui es fa.
   * Si una persona hi surt dues vegades, rep només el primer avís (el que li demana actuar).
   */
  getEventRecipients(
    event: WorkflowEvent,
    request: PurchaseRequest,
    allUsers: User[],
    centerResponsibleEmails: string[] = []
  ): EventRecipient[] {
    const activeUsers = (allUsers || []).filter(u => u.active !== false);
    const isInactive = (email: string) =>
      (allUsers || []).some(u => lower(u.email) === email && u.active === false);
    const userIdOf = (email: string) => activeUsers.find(u => lower(u.email) === email)?.id;

    const recipients: EventRecipient[] = [];
    const add = (email: string | undefined, data: Omit<EventRecipient, 'email' | 'userId'>, userId?: string) => {
      const e = lower(email);
      if (!e || isInactive(e) || recipients.some(r => r.email === e)) return;
      recipients.push({ email: e, userId: userId || userIdOf(e), ...data });
    };

    const addRequester = (data: Omit<EventRecipient, 'email' | 'userId'>) => {
      add(request.createdByUserEmail, data, request.createdByUserId);
      add(request.requestingTechnicianEmail, data, request.requestingTechnicianId);
    };
    const addRole = (role: 'admin_compres' | 'comptabilitat', data: Omit<EventRecipient, 'email' | 'userId'>) => {
      activeUsers.filter(u => u.role === role).forEach(u => add(u.email, data, u.id));
    };
    const addApprovers = (status: RequestStatus) => {
      if (status === 'aprovada') {
        addRole('admin_compres', { template: 'task', task: 'emit_order', roleName: PHASE_ROLE_NAMES.aprovada });
        return;
      }
      const approvers = this.getEligibleApprovers({ ...request, status }, allUsers);
      approvers?.users.forEach(u => add(u.email, { template: 'task', task: 'approve', roleName: PHASE_ROLE_NAMES[status] }, u.id));
    };

    switch (event) {
      case 'solicitud_creada':
        addApprovers(request.status);
        addRequester({ template: 'status', variant: 'registered' });
        break;
      case 'validada_direccio':
        addApprovers('pendent_direccio');
        break;
      case 'enviada_finances':
        addApprovers('pendent_finances');
        break;
      case 'compra_aprovada':
        addApprovers('aprovada');
        break;
      case 'compra_tramitada':
        centerResponsibleEmails.forEach(e => add(e, { template: 'status', variant: 'center' }));
        addRequester({ template: 'status' });
        break;
      case 'compra_rebuda':
        addRole('comptabilitat', { template: 'task', task: 'close_invoice', roleName: 'Comptabilitat' });
        addRequester({ template: 'status' });
        break;
      case 'compra_tancada':
        addRole('admin_compres', { template: 'status' });
        break;
      case 'retornada_esmena':
      case 'rebutjada':
        addRequester({ template: 'status' });
        break;
      case 'incidencia':
        addRole('admin_compres', { template: 'status' });
        addRequester({ template: 'status' });
        break;
    }

    return recipients;
  },

  /**
   * Esdeveniment d'avís que correspon a una acció sobre l'expedient.
   */
  getEventForTransition(previousStatus: RequestStatus, newStatus: RequestStatus, action: 'approve' | 'return' | 'reject'): WorkflowEvent | null {
    if (action === 'reject') return 'rebutjada';
    if (action === 'return') return 'retornada_esmena';
    if (previousStatus === 'esborrany' || previousStatus === 'retornada') return 'solicitud_creada';
    switch (newStatus) {
      case 'pendent_direccio': return 'validada_direccio';
      case 'pendent_finances': return 'enviada_finances';
      case 'aprovada': return 'compra_aprovada';
      case 'comanda_emesa': return 'compra_tramitada';
      case 'rebuda': return 'compra_rebuda';
      case 'tancada': return 'compra_tancada';
      case 'incidencia': return 'incidencia';
      default: return null;
    }
  },

  /**
   * Identifica les persones i equips concrets amb facultat d'aprovació per a una sol·licitud
   * basant-se estrictament en l'àrea d'adscripció i el nivell jeràrquic del treballador.
   */
  getEligibleApprovers(request: PurchaseRequest, allUsers: User[], centerResponsibleEmails: string[] = []): {
    roleName: string;
    scopeDescription: string;
    users: User[];
    hasCover: boolean;
    levelNumber: number;
  } | null {
    const activeUsers = (allUsers || []).filter(u => u.active !== false);
    const requestArea = normalizeAreaId(request?.areaId);
    const areaName = getAreaName(request?.areaId);

    switch (request?.status) {
      case 'pendent_coordinacio': {
        const matching = activeUsers.filter(u => {
          const uLevel = u.hierarchyLevel || getHierarchyRole(u.role).level;
          const uArea = normalizeAreaId(u.areaId);
          return (uLevel === 2 || u.role === 'coordinacio') && uArea === requestArea;
        });
        return {
          roleName: `Coordinació (N2) · ${areaName}`,
          scopeDescription: `Coordinadors/es de Nivell 2 adscrits a ${areaName}`,
          users: matching,
          hasCover: matching.length > 0,
          levelNumber: 2
        };
      }
      case 'pendent_direccio': {
        const matching = activeUsers.filter(u => {
          const uLevel = u.hierarchyLevel || getHierarchyRole(u.role).level;
          const uArea = normalizeAreaId(u.areaId);
          return (uLevel === 3 || u.role === 'direccio_area') && uArea === requestArea;
        });
        return {
          roleName: `Direcció d'Àrea (N3) · ${areaName}`,
          scopeDescription: `Directors/es de Nivell 3 adscrits a ${areaName}`,
          users: matching,
          hasCover: matching.length > 0,
          levelNumber: 3
        };
      }
      case 'pendent_finances': {
        const matching = activeUsers.filter(u => {
          const uLevel = u.hierarchyLevel || getHierarchyRole(u.role).level;
          return uLevel === 4 || u.role === 'finances';
        });
        return {
          roleName: `Direcció ADM i Finances (N4)`,
          scopeDescription: `Equip directiu de Finances i Administració General`,
          users: matching,
          hasCover: matching.length > 0,
          levelNumber: 4
        };
      }
      case 'aprovada': {
        const matching = activeUsers.filter(u => {
          const uLevel = u.hierarchyLevel || getHierarchyRole(u.role).level;
          return uLevel === 4 || u.role === 'finances' || workflowService.isWorkflowSupervisor(u);
        });
        return {
          roleName: `Administració de Compres / Finances (N4-N5)`,
          scopeDescription: `Responsables de tramitació i emissió de comandes formals`,
          users: matching,
          hasCover: matching.length > 0,
          levelNumber: 5
        };
      }
      case 'comanda_emesa': {
        const responsibles = centerResponsibleEmails.map(lower);
        const matching = activeUsers.filter(u => responsibles.includes(lower(u.email)));
        return {
          roleName: `Conformitat de Recepció`,
          scopeDescription: `Responsable del centre de destí${request.destinationCenterName ? ` (${request.destinationCenterName})` : ''}`,
          users: matching,
          hasCover: matching.length > 0,
          levelNumber: 1
        };
      }
      case 'rebuda': {
        const matching = activeUsers.filter(u => u.role === 'finances' || u.role === 'comptabilitat');
        return {
          roleName: `Comptabilitat i Tancament`,
          scopeDescription: `Validació de factura i tancament d'expedient`,
          users: matching,
          hasCover: matching.length > 0,
          levelNumber: 5
        };
      }
      case 'esborrany':
      case 'retornada': {
        const matching = activeUsers.filter(u => u.id === request.createdByUserId);
        return {
          roleName: `Sol·licitant Creador`,
          scopeDescription: `Treballador/a que ha generat la sol·licitud (${request.createdByUserName})`,
          users: matching,
          hasCover: matching.length > 0,
          levelNumber: 1
        };
      }
      default:
        return null;
    }
  }
};
