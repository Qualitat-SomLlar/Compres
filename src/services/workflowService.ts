import { User, PurchaseRequest, RequestStatus, UserRole } from '../types';
import { normalizeAreaId, getAreaName, getHierarchyRole } from '../constants';

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
        // Emissió formal de comanda: Finances o Administració de Compres
        return userLevel >= 4 || userRole === 'finances';

      case 'comanda_emesa':
        // Conformitat de recepció de béns / serveis: Tècnic, creador o compres
        return request.requestingTechnicianId === user.id || 
               request.createdByUserId === user.id ||
               userLevel >= 4;

      case 'rebuda':
        // Conformitat de factura i tancament comptable
        return userLevel >= 4 || userRole === 'finances' || userRole === 'comptabilitat';

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
   * basant-se estrictament en l'àrea d'adscripció i el nivell jeràrquic del treballador.
   */
  getEligibleApprovers(request: PurchaseRequest, allUsers: User[]): {
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
          return uLevel >= 4 || u.role === 'finances' || u.role === 'admin_compres';
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
