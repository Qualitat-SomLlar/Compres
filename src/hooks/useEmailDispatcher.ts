import { useNotificationSettings } from './useNotificationSettings';
import { useUsers } from './useUsers';
import { emailService } from '../services/emailService';
import { PurchaseRequest, RequestStatus } from '../types';
import { normalizeAreaId } from '../constants';

export function useEmailDispatcher() {
  const { settings } = useNotificationSettings();
  const { users } = useUsers();

  const dispatchEmail = async (
    eventKey: string, 
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

    const normArea = normalizeAreaId(request.areaId);

    // 1. Identificar els correus del sol·licitant / creador de la compra
    const requesterEmails = new Set<string>();
    if (request.createdByUserEmail) requesterEmails.add(request.createdByUserEmail.toLowerCase().trim());
    if (request.requestingTechnicianEmail) requesterEmails.add(request.requestingTechnicianEmail.toLowerCase().trim());
    
    // Assegurar que no estiguin desactivats
    const validRequesterEmails = Array.from(requesterEmails).filter(email => {
      const u = users.find(user => user.email.toLowerCase() === email);
      return !u || u.active !== false;
    });

    // 2. Destinataris addicionals configurats per rol o llista directa
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

    const sendPromises: Promise<void>[] = [];

    // CAS A: Sol·licitud pendent d'aprovació (per a Coordinació, Direcció d'Àrea o Finances)
    if (eventKey === 'solicitud_creada' || request.status === 'pendent_coordinacio') {
      // Notificar a la Coordinació (N2) de l'àrea
      const coordinators = users.filter(u => 
        (u.hierarchyLevel === 2 || u.role === 'coordinacio') && 
        normalizeAreaId(u.areaId) === normArea && 
        u.active !== false
      );
      
      const approverEmails = new Set<string>(coordinators.map(c => c.email));
      additionalRecipients.forEach(e => approverEmails.add(e));

      approverEmails.forEach(email => {
        sendPromises.push(
          emailService.sendPendingApprovalNotification(
            request, 
            email, 
            "Coordinació d'Àrea (N2)",
            undefined,
            { actorName: extra?.actorName, comment: extra?.comment }
          )
        );
      });

      // Confirmació també per al sol·licitant que s'ha creat la demanda
      validRequesterEmails.forEach(email => {
        sendPromises.push(
          emailService.sendStatusUpdateNotification(
            request, 
            email, 
            request.status, 
            extra?.comment || "La teva sol·licitud ha estat registrada i enviada a la Coordinació de la teva àrea per a la seva validació.",
            undefined,
            { actorName: extra?.actorName, actorRole: extra?.actorRole, previousStatus: extra?.previousStatus }
          )
        );
      });
    } 
    else if (eventKey === 'validada_direccio' || request.status === 'pendent_direccio') {
      // Notificar a la Direcció d'Àrea (N3) de l'àrea
      const directors = users.filter(u => 
        (u.hierarchyLevel === 3 || u.role === 'direccio_area') && 
        normalizeAreaId(u.areaId) === normArea && 
        u.active !== false
      );

      const approverEmails = new Set<string>(directors.map(d => d.email));
      additionalRecipients.forEach(e => approverEmails.add(e));

      approverEmails.forEach(email => {
        sendPromises.push(
          emailService.sendPendingApprovalNotification(
            request, 
            email, 
            "Direcció d'Àrea (N3)",
            undefined,
            { actorName: extra?.actorName, comment: extra?.comment }
          )
        );
      });

      // Actualització al sol·licitant
      validRequesterEmails.forEach(email => {
        sendPromises.push(
          emailService.sendStatusUpdateNotification(
            request, 
            email, 
            request.status, 
            extra?.comment || "Validada per la Coordinació d'Àrea. Pendent de la Direcció d'Àrea.",
            undefined,
            { actorName: extra?.actorName, actorRole: extra?.actorRole, previousStatus: extra?.previousStatus }
          )
        );
      });
    }
    else if (eventKey === 'enviada_finances' || request.status === 'pendent_finances') {
      // Notificar a Finances (N4)
      const financeUsers = users.filter(u => 
        (u.hierarchyLevel === 4 || u.role === 'finances') && 
        u.active !== false
      );

      const approverEmails = new Set<string>(financeUsers.map(f => f.email));
      additionalRecipients.forEach(e => approverEmails.add(e));

      approverEmails.forEach(email => {
        sendPromises.push(
          emailService.sendPendingApprovalNotification(
            request, 
            email, 
            "Direcció ADM i Finances (N4)",
            undefined,
            { actorName: extra?.actorName, comment: extra?.comment }
          )
        );
      });

      // Actualització al sol·licitant
      validRequesterEmails.forEach(email => {
        sendPromises.push(
          emailService.sendStatusUpdateNotification(
            request, 
            email, 
            request.status, 
            extra?.comment || "Validada per la Direcció d'Àrea. Pendent d'aprovació pressupostària per Finances.",
            undefined,
            { actorName: extra?.actorName, actorRole: extra?.actorRole, previousStatus: extra?.previousStatus }
          )
        );
      });
    }
    // CAS B: Canvis d'estat dirigits essencialment al sol·licitant
    // (comanda emesa/realitzada, compra rebuda, aprovada, tancada, retornada, rebutjada)
    else {
      // Enviar notificació d'estat al sol·licitant
      validRequesterEmails.forEach(email => {
        sendPromises.push(
          emailService.sendStatusUpdateNotification(
            request, 
            email, 
            request.status, 
            extra?.comment,
            undefined,
            { actorName: extra?.actorName, actorRole: extra?.actorRole, previousStatus: extra?.previousStatus }
          )
        );
      });

      // Enviar també a qualsevol altre receptor configurat al panell
      additionalRecipients.forEach(email => {
        if (!validRequesterEmails.includes(email)) {
          sendPromises.push(
            emailService.sendStatusUpdateNotification(
              request, 
              email, 
              request.status, 
              extra?.comment,
              undefined,
              { actorName: extra?.actorName, actorRole: extra?.actorRole, previousStatus: extra?.previousStatus }
            )
          );
        }
      });
    }

    await Promise.all(sendPromises);
    console.log(`📧 Despatxats ${sendPromises.length} correus per a l'esdeveniment [${eventKey}] de la sol·licitud ${request.code || request.id}`);
  };

  return { dispatchEmail };
}
