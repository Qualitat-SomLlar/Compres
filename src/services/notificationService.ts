import { NotificationSetting } from '../types';

/**
 * Servei per gestionar notificacions.
 * Preparat per integrar-se amb Microsoft Graph API / Outlook.
 */
export const notificationService = {
  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    // Mode desenvolupament: Log per consola
    // En producció: Cridar a l'API de Microsoft Graph o una Cloud Function
    console.log('--- ENVIANT CORREU (SIMULACIÓ) ---');
    console.log(`Per a: ${to}`);
    console.log(`Assumpte: ${subject}`);
    console.log(`Cos: ${body}`);
    console.log('---------------------------------');
  },

  async notifyStatusChange(requestId: string, newStatus: string, recipientEmail: string) {
    const subject = `Evolució sol·licitud ${requestId}: ${newStatus}`;
    const body = `Hola,\n\nLa teva sol·licitud de compra ${requestId} ha canviat d'estat a: ${newStatus}.\n\nPots revisar els detalls a l'aplicació.`;
    
    await this.sendEmail(recipientEmail, subject, body);
  }
};
