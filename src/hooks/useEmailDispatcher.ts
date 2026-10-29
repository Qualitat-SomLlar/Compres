import { useNotificationSettings } from './useNotificationSettings';
import { useUsers } from './useUsers';
import { useCenters } from './useCenters';
import { emailService } from '../services/emailService';
import { workflowService, WorkflowEvent, EventRecipient } from '../services/workflowService';
import { PurchaseRequest, RequestStatus } from '../types';
import { normalizeAreaId } from '../constants';

/**
 * Envia els correus de cada esdeveniment del circuit.
 * Els destinataris per defecte els decideix workflowService.getEventRecipients;
 * des de notificationSettings es pot desactivar un esdeveniment o afegir-hi
 * destinataris addicionals (per rol o per correu), que reben el correu d'estat.
 */
export function useEmailDispatcher() {
  const { settings } = useNotificationSettings();
  const { users } = useUsers();
  const { centers } = useCenters();

  const dispatchEmail = async (
    eventKey: WorkflowEvent,
    request: PurchaseRequest,
    extra?: {
      comment?: string;
      previousStatus?: RequestStatus;
      actorName?: string;
      actorRole?: string;
    }
  ) => {
    const setting = settings.find(s => s.eventKey === eventKey);

    // Si la configuració està explícitament desactivada a notificationSettings (i existeix)
    if (setting && !setting.enabled) {
      console.log(`🔕 Notificacions desactivades a la configuració per: ${eventKey}`);
      return;
    }

    const centerResponsibleEmails = centers.find(c => c.id === request.destinationCenterId)?.responsibleEmails || [];
    const recipients: EventRecipient[] = workflowService.getEventRecipients(eventKey, request, users, centerResponsibleEmails);

    // Destinataris addicionals configurats per rol o llista directa
    const normArea = normalizeAreaId(request.areaId);
    const additionalRecipients = new Set<string>();
    if (setting?.recipientRoles && setting.recipientRoles.length > 0) {
      setting.recipientRoles.forEach(role => {
        if (role === 'coordinacio' || role === 'direccio_area') {
          const areaUsers = users.filter(u =>
            (u.role === role || (role === 'coordinacio' && u.hierarchyLevel === 2) || (role === 'direccio_area' && u.hierarchyLevel === 3)) &&
            normalizeAreaId(u.areaId) === normArea &&
            u.active !== false
          );
          areaUsers.forEach(u => additionalRecipients.add(u.email));
        } else {
          const globalUsers = users.filter(u =>
            (u.role === role || (role === 'finances' && u.hierarchyLevel === 4) || (role === 'admin_compres' && u.hierarchyLevel === 5)) &&
            u.active !== false
          );
          globalUsers.forEach(u => additionalRecipients.add(u.email));
        }
      });
    }
    if (setting?.recipientEmails && setting.recipientEmails.length > 0) {
      setting.recipientEmails.forEach(email => additionalRecipients.add(email));
    }
    additionalRecipients.forEach(email => {
      const e = email.toLowerCase().trim();
      if (e && !recipients.some(r => r.email === e)) recipients.push({ email: e, template: 'status' });
    });

    const sendPromises = recipients.map(r => r.template === 'task'
      ? emailService.sendPendingApprovalNotification(
          request,
          r.email,
          r.roleName || '',
          undefined,
          { actorName: extra?.actorName, comment: extra?.comment, task: r.task }
        )
      : emailService.sendStatusUpdateNotification(
          request,
          r.email,
          request.status,
          extra?.comment,
          undefined,
          { actorName: extra?.actorName, actorRole: extra?.actorRole, previousStatus: extra?.previousStatus, variant: r.variant }
        )
    );

    await Promise.all(sendPromises);
    console.log(`📧 Despatxats ${sendPromises.length} correus per a l'esdeveniment [${eventKey}] de la sol·licitud ${request.code || request.id}`);
  };

  return { dispatchEmail };
}
