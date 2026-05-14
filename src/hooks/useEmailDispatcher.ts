import { useNotificationSettings } from './useNotificationSettings';
import { useUsers } from './useUsers';
import { emailService } from '../services/emailService';
import { PurchaseRequest, RequestStatus } from '../types';

export function useEmailDispatcher() {
  const { settings } = useNotificationSettings();
  const { users } = useUsers();

  const dispatchEmail = async (eventKey: string, request: PurchaseRequest) => {
    const setting = settings.find(s => s.eventKey === eventKey);
    
    if (!setting || !setting.enabled) {
      console.log(`🔕 Notificacions desactivades per a l'esdeveniment: ${eventKey}`);
      return;
    }

    const recipients = new Set<string>();

    // 1. Afegir correus per rols
    if (setting.recipientRoles && setting.recipientRoles.length > 0) {
      const usersInRoles = users.filter(u => setting.recipientRoles.includes(u.role));
      usersInRoles.forEach(u => recipients.add(u.email));
    }

    // 2. Afegir correus addicionals
    if (setting.recipientEmails && setting.recipientEmails.length > 0) {
      setting.recipientEmails.forEach(email => recipients.add(email));
    }

    // 3. Enviar a tots
    const sendPromises = Array.from(recipients).map(email => 
      emailService.sendApprovalNotification(request, email, request.status)
    );

    await Promise.all(sendPromises);
    console.log(`📧 Despatxat correu per ${eventKey} a ${recipients.size} destinataris.`);
  };

  return { dispatchEmail };
}
