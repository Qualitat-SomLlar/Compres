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

    // 1. Afegir correus per rols (Contextuals a la sol·licitud)
    if (setting.recipientRoles && setting.recipientRoles.length > 0) {
      setting.recipientRoles.forEach(role => {
        if (role === 'tecnic') {
          // El tècnic que ha creat la sol·licitud
          if (request.createdByUserEmail) recipients.add(request.createdByUserEmail);
          // I el tècnic sol·licitant si és diferent i està informat
          const techUser = users.find(u => u.id === request.requestingTechnicianId);
          if (techUser?.email) recipients.add(techUser.email);
        } else if (role === 'coordinacio' || role === 'direccio_area') {
          // Aquests rols s'han de filtrar per l'ÀREA de la sol·licitud
          const areaUsers = users.filter(u => u.role === role && u.areaId === request.areaId);
          areaUsers.forEach(u => recipients.add(u.email));
        } else {
          // Rols globals (finances, admin_compres, etc.) que reben de totes les àrees
          const globalUsers = users.filter(u => u.role === role);
          globalUsers.forEach(u => recipients.add(u.email));
        }
      });
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
