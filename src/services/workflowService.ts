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
  canUserApprove(user: User, request: PurchaseRequest): boolean {
    const { status } = request;
    const { role } = user;

    // Admins can do anything
    if (role === 'admin_compres') return true;

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
        return role === 'finances' || role === 'admin_compres';

      case 'comanda_emesa':
        // Technician or Receiver confirms reception
        return role === 'tecnic' || role === 'admin_compres' || role === 'finances';

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
  }
};
