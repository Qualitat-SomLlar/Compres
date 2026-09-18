import { PurchaseRequest, RequestStatus } from '../types';
import { STATUS_LABELS } from '../constants';

const GOOGLE_SCRIPT_WEBHOOK_URL = import.meta.env.VITE_GOOGLE_SCRIPT_WEBHOOK_URL || 'https://script.google.com/macros/s/AKfycbzJ3nWzomD-LWGr-uLjlFkuLVIP8SO3WnaDcimVFCgehTAFsWCLSujS2PbXsQlJ3XUzbg/exec'; 

export interface WorkerWelcomePayload {
  name: string;
  email: string;
  areaName: string;
  roleName: string;
  hierarchyCode?: string;
}

const getPlatformUrl = (customUrl?: string) => {
  if (customUrl) return customUrl;
  if (typeof window !== 'undefined' && window.location.origin && !window.location.origin.includes('localhost')) {
    return window.location.origin;
  }
  return import.meta.env.VITE_APP_URL || 'https://som-llar-gesti-de-compres.vercel.app';
};

export const emailService = {
  /**
   * 1. Correu de Benvinguda: Quan es dóna d'alta un nou treballador.
   * Disseny net, amable i amb botó destacat per iniciar sessió amb Microsoft.
   */
  async sendWelcomeNotification(worker: WorkerWelcomePayload, customAppUrl?: string) {
    const platformUrl = getPlatformUrl(customAppUrl);
    const subject = `👋 Benvingut/da a Som Llar - Gestió de Compres`;
    const roleDisplay = worker.hierarchyCode ? `${worker.roleName} (${worker.hierarchyCode})` : worker.roleName;

    const plainTextBody = `Hola ${worker.name},\n\n` +
      `T'informem que s'ha donat d'alta el teu compte a la plataforma corporativa de Gestió de Compres de Som Llar.\n\n` +
      `Les teves dades d'accés són:\n` +
      `- Nom: ${worker.name}\n` +
      `- Àrea d'adscripció: ${worker.areaName}\n` +
      `- Càrrec / Nivell: ${roleDisplay}\n` +
      `- Correu electrònic: ${worker.email}\n\n` +
      `Pots accedir directament fent clic al següent enllaç:\n` +
      `${platformUrl}\n\n` +
      `Recorda que has d'iniciar sessió amb el teu compte de Microsoft (@somllar.cat). No cal contrasenya addicional.\n\n` +
      `Cordialment,\n` +
      `Equip de Gestió de Compres · Fundació Som Llar`;

    const htmlEmail = `
<!DOCTYPE html>
<html lang="ca">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 35px 15px;">
    <tr>
      <td align="center">
        <!-- Container -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.08);">
          
          <!-- Header corporatiu -->
          <tr>
            <td style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 36px 32px 30px; text-align: center;">
              <div style="background-color: rgba(255,255,255,0.2); display: inline-block; padding: 6px 16px; border-radius: 30px; margin-bottom: 12px;">
                <span style="font-size: 11px; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase; color: #ffffff;">FUNDACIÓ SOM LLAR</span>
              </div>
              <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em;">Gestió de Compres</h1>
              <p style="margin: 6px 0 0; font-size: 13px; color: #d1fae5; font-weight: 500;">Plataforma Corporativa d'Adquisicions</p>
            </td>
          </tr>

          <!-- Cos Principal -->
          <tr>
            <td style="padding: 36px 32px 28px;">
              <h2 style="margin-top: 0; font-size: 20px; font-weight: 800; color: #0f172a;">Hola, ${worker.name}! 👋</h2>
              <p style="font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px;">
                T'informem que s'ha creat i activat correctament el teu compte a la plataforma de <strong>Gestió de Compres de Som Llar</strong>. A partir d'ara podràs gestionar o validar sol·licituds segons el teu àmbit de responsabilitat.
              </p>

              <!-- Dades d'Accés Card -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 20px 22px;">
                    <p style="margin: 0 0 14px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.15em; color: #059669;">DADES DEL TEU COMPTE</p>
                    
                    <table width="100%" border="0" cellspacing="0" cellpadding="5">
                      <tr>
                        <td width="38%" style="font-size: 13px; color: #64748b; font-weight: 600;">Àrea adscrita:</td>
                        <td style="font-size: 13px; color: #0f172a; font-weight: 700;">${worker.areaName}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 13px; color: #64748b; font-weight: 600;">Càrrec / Nivell:</td>
                        <td style="font-size: 13px; color: #0f172a; font-weight: 700;">${roleDisplay}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 13px; color: #64748b; font-weight: 600;">Correu d'accés:</td>
                        <td style="font-size: 13px; color: #0284c7; font-weight: 700;">${worker.email}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Botó CTA Destacat -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 28px 0;">
                <tr>
                  <td align="center">
                    <a href="${platformUrl}" target="_blank" style="background-color: #059669; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; padding: 15px 36px; font-size: 15px; font-weight: 800; text-decoration: none; border-radius: 12px; display: inline-block; box-shadow: 0 10px 18px -4px rgba(16, 185, 129, 0.35); letter-spacing: 0.02em;">
                      Accedir a la Plataforma &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Instruccions Microsoft 365 -->
              <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 14px 18px; margin-top: 24px;">
                <p style="margin: 0; font-size: 12px; line-height: 1.55; color: #1e40af;">
                  🔐 <strong>Inici de sessió ràpid:</strong> Fes clic al botó superior, selecciona <em>"Inicia sessió amb Microsoft"</em> i utilitza el teu correu corporatiu acabat en <strong>@somllar.cat</strong>. No necessites cap contrasenya addicional.
                </p>
              </div>

              <!-- Enllaç alternatiu -->
              <p style="font-size: 11px; color: #94a3b8; line-height: 1.5; margin-top: 22px; word-break: break-all;">
                Si el botó no funciona, pots copiar i enganxar aquest enllaç al navegador:<br>
                <a href="${platformUrl}" style="color: #059669; text-decoration: underline;">${platformUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="border-top: 1px solid #e2e8f0; padding: 22px 32px; background-color: #f8fafc; text-align: center;">
              <p style="margin: 0 0 4px; font-size: 11px; color: #64748b; font-weight: 600;">Fundació Som Llar · Gestió de Compres</p>
              <p style="margin: 0; font-size: 10px; color: #94a3b8;">Missatge automàtic enviat des del sistema corporatiu de compres.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    await this.postWebhook({
      type: 'welcome',
      to: worker.email,
      subject,
      name: worker.name,
      area: worker.areaName,
      role: roleDisplay,
      url: platformUrl,
      actionUrl: platformUrl,
      buttonText: 'Accedir a la Plataforma',
      description: `Alta de compte a Som Llar Compres per a ${worker.name} (${worker.areaName}, ${roleDisplay})`,
      status: 'Compte Activat',
      body: plainTextBody,
      htmlBody: htmlEmail,
    });
  },

  /**
   * 2. Correu per a Aprovadors: Quan hi ha una sol·licitud nova pendent d'aprovació.
   * Dirigit a Coordinació (N2), Direcció d'Àrea (N3) o Finances (N4).
   */
  async sendPendingApprovalNotification(
    request: PurchaseRequest, 
    approverEmail: string, 
    approverRoleName: string, 
    customAppUrl?: string
  ) {
    const platformUrl = getPlatformUrl(customAppUrl);
    const requestUrl = `${platformUrl}/compres/${request.id}`;
    const requestCode = request.code || request.id;
    const amountFormatted = `${((request.finalAmount ?? request.estimatedAmount) || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
    const urgencyLabel = (request.urgency || 'mitjana').toUpperCase();
    const requester = request.requestingTechnicianName || request.createdByUserName || 'Treballador/a';

    const subject = `🔔 [Acció Requerida] Sol·licitud pendent d'aprovació: ${requestCode} - ${request.itemDescription}`;

    const plainTextBody = `Hola,\n\n` +
      `Tens una nova sol·licitud de compra pendent de la teva revisió i aprovació com a ${approverRoleName}.\n\n` +
      `Detalls de la sol·licitud:\n` +
      `- Codi d'expedient: ${requestCode}\n` +
      `- Sol·licitant: ${requester}\n` +
      `- Àrea: ${request.areaName || request.areaId}\n` +
      `- Projecte / Codi Analític: ${request.projectId || 'S/P'} / ${request.analyticCode || 'S/C'}\n` +
      `- Concepte: ${request.itemDescription}\n` +
      `- Import: ${amountFormatted}\n` +
      `- Urgència: ${urgencyLabel}\n\n` +
      `Pots revisar i validar la sol·licitud fent clic al següent enllaç:\n` +
      `${requestUrl}\n\n` +
      `Cordialment,\n` +
      `Circuit de Validacions · Som Llar Compres`;

    const htmlEmail = `
<!DOCTYPE html>
<html lang="ca">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 35px 15px;">
    <tr>
      <td align="center">
        <!-- Container -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.08);">
          
          <!-- Capçalera amb banner d'alerta suau -->
          <tr>
            <td style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 32px 32px 26px; text-align: center;">
              <div style="background-color: rgba(255,255,255,0.2); display: inline-block; padding: 5px 14px; border-radius: 30px; margin-bottom: 10px;">
                <span style="font-size: 11px; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase; color: #ffffff;">CIRCUIT D'APROVACIONS</span>
              </div>
              <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.01em;">Acció Requerida d'Aprovació</h1>
              <p style="margin: 6px 0 0; font-size: 13px; color: #e0f2fe; font-weight: 500;">Pendent de validació com a ${approverRoleName}</p>
            </td>
          </tr>

          <!-- Contingut -->
          <tr>
            <td style="padding: 32px 32px 26px;">
              <p style="font-size: 14px; line-height: 1.6; color: #334155; margin-top: 0; margin-bottom: 22px;">
                S'ha registrat una nova sol·licitud de compra que requereix el teu vistiplau per continuar el circuit:
              </p>

              <!-- Fitxa Resum de la Compra -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px 22px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">
                      <span style="font-size: 14px; font-weight: 800; color: #0284c7;">${requestCode}</span>
                      <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; background-color: #e2e8f0; color: #475569; padding: 3px 8px; border-radius: 6px;">Urgència: ${urgencyLabel}</span>
                    </div>

                    <table width="100%" border="0" cellspacing="0" cellpadding="5">
                      <tr>
                        <td width="34%" style="font-size: 12px; color: #64748b; font-weight: 600;">Sol·licitant:</td>
                        <td style="font-size: 13px; color: #0f172a; font-weight: 700;">${requester}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 12px; color: #64748b; font-weight: 600;">Àrea adscrita:</td>
                        <td style="font-size: 13px; color: #0f172a; font-weight: 700;">${request.areaName || request.areaId}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 12px; color: #64748b; font-weight: 600;">Projecte / Analític:</td>
                        <td style="font-size: 13px; color: #0f172a; font-weight: 600;">${request.projectId || 'Sense projecte'} · ${request.analyticCode || 'Sense codi'}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 12px; color: #64748b; font-weight: 600; vertical-align: top;">Concepte:</td>
                        <td style="font-size: 13px; color: #0f172a; font-weight: 700;">${request.itemDescription}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 12px; color: #64748b; font-weight: 600; padding-top: 8px;">Import estimat:</td>
                        <td style="font-size: 16px; color: #059669; font-weight: 800; padding-top: 8px;">${amountFormatted}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              ${request.requiresThreeQuotes || (request.estimatedAmount && request.estimatedAmount >= 5000) ? `
              <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 12px 16px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #b45309;">
                  ⚠️ <strong>Normativa de contractació (> 5.000 €):</strong> Aquest expedient requereix un mínim de 3 pressupostos comparatius abans de l'adjudicació definitiva.
                </p>
              </div>
              ` : ''}

              <!-- Botó d'Acció -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 28px 0;">
                <tr>
                  <td align="center">
                    <a href="${requestUrl}" target="_blank" style="background-color: #0284c7; background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color: #ffffff; padding: 15px 36px; font-size: 15px; font-weight: 800; text-decoration: none; border-radius: 12px; display: inline-block; box-shadow: 0 10px 18px -4px rgba(2, 132, 199, 0.35); letter-spacing: 0.02em;">
                      Revisar i Validar Sol·licitud &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="font-size: 12px; color: #64748b; text-align: center; margin: 0;">
                També pots accedir a la secció <em>"El Meu Torn"</em> des del menú principal de la plataforma.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="border-top: 1px solid #e2e8f0; padding: 20px 32px; background-color: #f8fafc; text-align: center;">
              <p style="margin: 0 0 4px; font-size: 11px; color: #64748b; font-weight: 600;">Fundació Som Llar · Gestió de Compres</p>
              <p style="margin: 0; font-size: 10px; color: #94a3b8;">Notificació automàtica del circuit de signatures.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    await this.postWebhook({
      type: 'pending_approval',
      to: approverEmail,
      subject,
      requestId: request.id,
      requestCode,
      description: request.itemDescription,
      amount: amountFormatted,
      requester,
      area: request.areaName || request.areaId,
      status: `Pendent d'aprovació (${approverRoleName})`,
      url: requestUrl,
      actionUrl: requestUrl,
      buttonText: 'Revisar i Validar Sol·licitud',
      body: plainTextBody,
      htmlBody: htmlEmail,
    });
  },

  /**
   * 3. Correu d'Actualització d'Estat: Dirigit al Sol·licitant / Creador de la compra.
   * S'informa de passos clau com: Comanda Emesa (realitzada), Compra Rebuda, Aprovada, Tancada, etc.
   */
  async sendStatusUpdateNotification(
    request: PurchaseRequest, 
    targetEmail: string, 
    newStatus: RequestStatus, 
    comment?: string, 
    customAppUrl?: string
  ) {
    const platformUrl = getPlatformUrl(customAppUrl);
    const requestUrl = `${platformUrl}/compres/${request.id}`;
    const requestCode = request.code || request.id;
    const statusInfo = STATUS_LABELS[newStatus] || { label: newStatus, color: 'bg-slate-100 text-slate-800' };

    // Definir contingut i missatge segons el canvi d'estat
    let headline = `Actualització de la teva sol·licitud ${requestCode}`;
    let explanation = `L'estat de la teva sol·licitud de compra ha canviat a: **${statusInfo.label}**.`;
    let bannerColor = 'linear-gradient(135deg, #059669 0%, #047857 100%)';
    let icon = '📦';

    if (newStatus === 'comanda_emesa') {
      headline = `📦 Comanda Tramitada: La teva compra ja s'ha demanat!`;
      explanation = `Ens plau informar-te que la teva sol·licitud de compra ha estat aprovada i la comanda formal ha estat emesa al proveïdor.`;
      bannerColor = 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)';
      icon = '🚚';
    } else if (newStatus === 'rebuda') {
      headline = `✅ Compra Rebuda i Confirmada!`;
      explanation = `S'ha confirmat la recepció del material o servei sol·licitat en l'expedient ${requestCode}.`;
      bannerColor = 'linear-gradient(135deg, #059669 0%, #047857 100%)';
      icon = '📦';
    } else if (newStatus === 'aprovada') {
      headline = `✨ Sol·licitud Aprovada per Finances`;
      explanation = `La teva sol·licitud compta amb totes les validacions pressupostàries i passa a tramitació de comanda.`;
      bannerColor = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
      icon = '🎉';
    } else if (newStatus === 'retornada') {
      headline = `⚠️ Esmena Requerida a la teva Sol·licitud`;
      explanation = `La teva sol·licitud ha estat retornada perquè cal revisar alguna dada o afegir documentació addicional.`;
      bannerColor = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
      icon = '✏️';
    } else if (newStatus === 'rebutjada') {
      headline = `❌ Sol·licitud de Compra Rebutjada`;
      explanation = `La teva sol·licitud de compra no ha estat autoritzada en la fase d'aprovació.`;
      bannerColor = 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)';
      icon = '🚫';
    } else if (newStatus === 'tancada') {
      headline = `📁 Expedient de Compra Finalitzat i Tancat`;
      explanation = `El procés de compra, recepció i justificació documental de l'expedient s'ha completat amb èxit.`;
      bannerColor = 'linear-gradient(135deg, #475569 0%, #334155 100%)';
      icon = '🏁';
    }

    const subject = `${icon} ${headline} (${requestCode})`;

    const plainTextBody = `Hola,\n\n` +
      `${headline}\n\n` +
      `${explanation}\n\n` +
      `Detalls:\n` +
      `- Codi: ${requestCode}\n` +
      `- Concepte: ${request.itemDescription}\n` +
      `- Nou estat: ${statusInfo.label}\n` +
      (comment ? `- Observacions / Comentaris: ${comment}\n` : '') +
      (request.supplierName ? `- Proveïdor: ${request.supplierName}\n` : '') +
      `\nPots consultar l'expedient i el seguiment aquí:\n` +
      `${requestUrl}\n\n` +
      `Cordialment,\n` +
      `Equip de Som Llar Compres`;

    const htmlEmail = `
<!DOCTYPE html>
<html lang="ca">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 35px 15px;">
    <tr>
      <td align="center">
        <!-- Container -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.08);">
          
          <!-- Capçalera amb gradent d'estat -->
          <tr>
            <td style="background: ${bannerColor}; padding: 32px 32px 26px; text-align: center;">
              <div style="background-color: rgba(255,255,255,0.2); display: inline-block; padding: 5px 14px; border-radius: 30px; margin-bottom: 10px;">
                <span style="font-size: 11px; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase; color: #ffffff;">ESTAT DE LA TEVA SOL·LICITUD</span>
              </div>
              <h1 style="margin: 0; font-size: 21px; font-weight: 800; color: #ffffff; letter-spacing: -0.01em;">${headline}</h1>
              <p style="margin: 6px 0 0; font-size: 13px; color: rgba(255,255,255,0.9); font-weight: 600;">Expedient ${requestCode}</p>
            </td>
          </tr>

          <!-- Contingut -->
          <tr>
            <td style="padding: 32px 32px 26px;">
              <p style="font-size: 14px; line-height: 1.6; color: #334155; margin-top: 0; margin-bottom: 22px;">
                ${explanation}
              </p>

              <!-- Fitxa Resum -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 18px 20px;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="5">
                      <tr>
                        <td width="35%" style="font-size: 12px; color: #64748b; font-weight: 600;">Concepte:</td>
                        <td style="font-size: 13px; color: #0f172a; font-weight: 700;">${request.itemDescription}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 12px; color: #64748b; font-weight: 600;">Estat actual:</td>
                        <td style="font-size: 13px; color: #0f172a; font-weight: 700;">
                          <span style="background-color: #e2e8f0; color: #1e293b; padding: 3px 8px; border-radius: 6px; font-size: 11px; text-transform: uppercase;">${statusInfo.label}</span>
                        </td>
                      </tr>
                      ${request.supplierName ? `
                      <tr>
                        <td style="font-size: 12px; color: #64748b; font-weight: 600;">Proveïdor:</td>
                        <td style="font-size: 13px; color: #0f172a; font-weight: 700;">${request.supplierName}</td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td style="font-size: 12px; color: #64748b; font-weight: 600;">Import:</td>
                        <td style="font-size: 14px; color: #059669; font-weight: 800;">
                          ${((request.finalAmount ?? request.estimatedAmount) || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              ${comment ? `
              <!-- Observacions / Comentaris -->
              <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 14px 18px; margin-bottom: 24px;">
                <p style="margin: 0 0 4px; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #1e40af;">OBSERVACIONS / COMENTARIS:</p>
                <p style="margin: 0; font-size: 13px; color: #1e3a8a; line-height: 1.5; font-style: italic;">
                  "${comment}"
                </p>
              </div>
              ` : ''}

              <!-- Botó d'Acció -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 26px 0;">
                <tr>
                  <td align="center">
                    <a href="${requestUrl}" target="_blank" style="background-color: #059669; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; padding: 14px 34px; font-size: 14px; font-weight: 800; text-decoration: none; border-radius: 12px; display: inline-block; box-shadow: 0 10px 18px -4px rgba(16, 185, 129, 0.35); letter-spacing: 0.02em;">
                      Veure l'Expedient Complet &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="border-top: 1px solid #e2e8f0; padding: 20px 32px; background-color: #f8fafc; text-align: center;">
              <p style="margin: 0 0 4px; font-size: 11px; color: #64748b; font-weight: 600;">Fundació Som Llar · Gestió de Compres</p>
              <p style="margin: 0; font-size: 10px; color: #94a3b8;">Notificació automàtica del seguiment de la teva compra.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    await this.postWebhook({
      type: 'status_update',
      to: targetEmail,
      subject,
      requestId: request.id,
      requestCode,
      description: request.itemDescription,
      status: statusInfo.label,
      comment: comment || '',
      supplierName: request.supplierName || '',
      url: requestUrl,
      actionUrl: requestUrl,
      buttonText: "Veure l'Expedient Complet",
      body: plainTextBody,
      htmlBody: htmlEmail,
    });
  },

  /**
   * Compatibilitat retrospectiva
   */
  async sendApprovalNotification(request: PurchaseRequest, targetEmail: string, newStatus: RequestStatus) {
    return this.sendStatusUpdateNotification(request, targetEmail, newStatus);
  },

  /**
   * Enviador comú al Webhook de Google Apps Script
   */
  async postWebhook(payload: Record<string, any>) {
    if (!GOOGLE_SCRIPT_WEBHOOK_URL) {
      console.log('📨 Simulació de correu enviat (sense webhook definit):', payload);
      return;
    }

    try {
      const fullPayload = {
        ...payload,
        targetEmail: payload.to,
        recipient: payload.to,
        email: payload.to,
        link: payload.url || payload.actionUrl,
        message: payload.body || payload.text,
        text: payload.body || payload.message,
        html: payload.htmlBody,
        timestamp: new Date().toISOString()
      };

      await fetch(GOOGLE_SCRIPT_WEBHOOK_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fullPayload),
      });
      console.log(`📧 Correu [${payload.type || 'generic'}] enviat a ${payload.to}: "${payload.subject}"`);
    } catch (error) {
      console.error('Error enviant webhook de correu:', error);
    }
  }
};
