import { User, PurchaseRequest, RequestStatus, UserRole } from '../types';

export const workflowService = {
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
  canUserApprove(user?: User, request?: PurchaseRequest): boolean {
    if (!user || !request) return false;
    const { status } = request;
    const { role } = user;

    // Admins, Superadmins and Gerència can manage anything
    if (role === 'admin_compres' || role === 'superadmin' || role === 'gerencia') return true;

    switch (status) {
      case 'esborrany':
      case 'retornada':
        // Only the creator can send it
        return request.createdByUserId === user.id;
      
      case 'pendent_coordinacio':
        return role === 'coordinacio' && request.areaId === user.areaId;
      
      case 'pendent_direccio':
        return role === 'direccio_area' && request.areaId === user.areaId;
      
      case 'pendent_finances':
        return role === 'finances';
      
      case 'aprovada':
        // Typically Admin or Finance emits the order
        return role === 'finances';

      case 'comanda_emesa':
        // Technician, Creator or Receiver confirms reception
        return role === 'tecnic' || 
               role === 'finances' || 
               request.requestingTechnicianId === user.id ||
               request.createdByUserId === user.id;

      case 'rebuda':
        // Finance or Accounting closes the request
        return role === 'finances' || role === 'comptabilitat';

      default:
        return false;
    }
  },

  /**
   * Get the target role for notifications when a request reaches a certain status.
   */
  getTargetRoleForStatus(status: RequestStatus): UserRole | 'creator' | null {
    switch (status) {
      case 'pendent_coordinacio': return 'coordinacio';
      case 'pendent_direccio': return 'direccio_area';
      case 'pendent_finances': return 'finances';
      case 'retornada':
      case 'rebutjada':
      case 'aprovada':
      case 'comanda_emesa':
        return 'creator';
      case 'rebuda': return 'finances';
      case 'tancada': return 'creator';
      default: return null;
    }
  },

  /**
   * Identifica les persones i equips concrets amb facultat d'aprovació per a una sol·licitud
   * basant-se en l'àrea d'adscripció i el nivell jeràrquic del treballador.
   */
  getEligibleApprovers(request: PurchaseRequest, allUsers: User[]): {
    roleName: string;
    scopeDescription: string;
    users: User[];
    hasCover: boolean;
    levelNumber: number;
  } | null {
    const activeUsers = (allUsers || []).filter(u => u.active !== false);
    const areaId = request?.areaId || 'social';

    switch (request?.status) {
      case 'pendent_coordinacio': {
        const matching = activeUsers.filter(u => u.role === 'coordinacio' && u.areaId === areaId);
        return {
          roleName: `Coordinació d'Àrea`,
          scopeDescription: `Coordinadors/es adscrits a l'àrea de la compra (${areaId.toUpperCase()})`,
          users: matching,
          hasCover: matching.length > 0,
          levelNumber: 2
        };
      }
      case 'pendent_direccio': {
        const matching = activeUsers.filter(u => u.role === 'direccio_area' && u.areaId === areaId);
        return {
          roleName: `Direcció d'Àrea`,
          scopeDescription: `Directors/es adscrits a l'àrea de la compra (${areaId.toUpperCase()})`,
          users: matching,
          hasCover: matching.length > 0,
          levelNumber: 3
        };
      }
      case 'pendent_finances': {
        const matching = activeUsers.filter(u => u.role === 'finances');
        return {
          roleName: `Direcció ADM i Finances`,
          scopeDescription: `Equip directiu de Finances i Administració General`,
          users: matching,
          hasCover: matching.length > 0,
          levelNumber: 4
        };
      }
      case 'aprovada': {
        const matching = activeUsers.filter(u => u.role === 'finances' || u.role === 'admin_compres');
        return {
          roleName: `Administració de Compres / Finances`,
          scopeDescription: `Responsables de tramitació i emissió de comandes formals`,
          users: matching,
          hasCover: matching.length > 0,
          levelNumber: 5
        };
      }
      case 'comanda_emesa': {
        const matching = activeUsers.filter(u => 
          u.id === request.requestingTechnicianId || 
          u.id === request.createdByUserId ||
          u.role === 'admin_compres'
        );
        return {
          roleName: `Conformitat de Recepció`,
          scopeDescription: `Tècnic/a sol·licitant (${request.requestingTechnicianName}) o equip receptor`,
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
          roleName: `Tècnic/a Creador`,
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
