import { PurchaseRequest, RequestStatus } from '../types';
import { STATUS_LABELS } from '../constants';

// Aquesta URL hauria de ser la de la Google Apps Script de l'usuari
const GOOGLE_SCRIPT_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbzJ3nWzomD-LWGr-uLjlFkuLVIP8SO3WnaDcimVFCgehTAFsWCLSujS2PbXsQlJ3XUzbg/exec'; 

export const emailService = {
  /**
   * Envia una notificació per correu electrònic utilitzant un webhook de Google Apps Script.
   */
  async sendApprovalNotification(request: PurchaseRequest, targetEmail: string, newStatus: RequestStatus) {
    if (!GOOGLE_SCRIPT_WEBHOOK_URL) {
      console.log('📨 Simulació de correu enviat:', {
        to: targetEmail,
        subject: `Actualització Expedient: ${request.code || request.id}`,
        status: STATUS_LABELS[newStatus]?.label || newStatus
      });
      return;
    }

    try {
      const payload = {
        to: targetEmail,
        subject: `[Som Llar Compres] Actualització de l'expedient ${request.code || request.id}`,
        requestId: request.id,
        requestCode: request.code || request.id,
        description: request.itemDescription,
        status: STATUS_LABELS[newStatus]?.label || newStatus,
        url: `https://som-llar-gesti-de-compres.vercel.app/compres/${request.id}`,
        timestamp: new Date().toISOString()
      };

      await fetch(GOOGLE_SCRIPT_WEBHOOK_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error('Error enviant correu:', error);
    }
  }
};
