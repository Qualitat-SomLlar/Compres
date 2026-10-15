import { PurchaseRequest, RequestStatus } from '../types';
import { STATUS_LABELS } from '../constants';

const GOOGLE_SCRIPT_WEBHOOK_URL = import.meta.env.VITE_GOOGLE_SCRIPT_WEBHOOK_URL || 'https://script.google.com/macros/s/AKfycbx9_0gwoVDMUz65D3tW0nqp5RoAbs7VaqcPMonWhNqTgME9iUOwyrpOBZQg19Qn3gKj3Q/exec'; 

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
   * Genera el component de la Línia de Temps Visual (Stepper) adaptat per a clients de correu.
   */
  renderEmailStepper(status: RequestStatus): string {
    type StepType = 'completed' | 'active' | 'pending' | 'returned' | 'rejected';
    interface StepInfo {
      type: StepType;
      label: string;
      sub: string;
    }

    const steps: StepInfo[] = [
      { type: 'completed', label: '1. Sol·licitud', sub: 'Registrada' },
      { type: 'pending', label: '2. Validació', sub: 'Pendent' },
      { type: 'pending', label: '3. Comanda', sub: 'Pendent' },
      { type: 'pending', label: '4. Recepció', sub: 'Pendent' },
      { type: 'pending', label: '5. Tancat', sub: 'Pendent' }
    ];

    if (status === 'esborrany') {
      steps[0] = { type: 'active', label: '1. Sol·licitud', sub: 'Esborrany' };
    } else if (status === 'enviada' || status === 'pendent_coordinacio') {
      steps[0] = { type: 'completed', label: '1. Sol·licitud', sub: 'Completada' };
      steps[1] = { type: 'active', label: '2. Validació', sub: 'N2 Coord.' };
    } else if (status === 'pendent_direccio') {
      steps[0] = { type: 'completed', label: '1. Sol·licitud', sub: 'Completada' };
      steps[1] = { type: 'active', label: '2. Validació', sub: 'N3 Direcció' };
    } else if (status === 'pendent_finances' || status === 'pendent_administracio' || status === 'pendent_3_pressupostos' || status === 'pendent_comparativa') {
      steps[0] = { type: 'completed', label: '1. Sol·licitud', sub: 'Completada' };
      steps[1] = { type: 'active', label: '2. Validació', sub: 'N4 Finances' };
    } else if (status === 'retornada') {
      steps[0] = { type: 'completed', label: '1. Sol·licitud', sub: 'Completada' };
      steps[1] = { type: 'returned', label: '2. Validació', sub: 'Esmena !' };
    } else if (status === 'rebutjada') {
      steps[0] = { type: 'completed', label: '1. Sol·licitud', sub: 'Completada' };
      steps[1] = { type: 'rejected', label: '2. Validació', sub: 'Rebutjada' };
    } else if (status === 'aprovada') {
      steps[0] = { type: 'completed', label: '1. Sol·licitud', sub: 'Completada' };
      steps[1] = { type: 'completed', label: '2. Validació', sub: 'Aprovat' };
      steps[2] = { type: 'active', label: '3. Comanda', sub: 'Preparant' };
    } else if (status === 'comanda_emesa') {
      steps[0] = { type: 'completed', label: '1. Sol·licitud', sub: 'Completada' };
      steps[1] = { type: 'completed', label: '2. Validació', sub: 'Aprovat' };
      steps[2] = { type: 'completed', label: '3. Comanda', sub: 'Emesa' };
      steps[3] = { type: 'active', label: '4. Recepció', sub: 'En trànsit' };
    } else if (status === 'rebuda') {
      steps[0] = { type: 'completed', label: '1. Sol·licitud', sub: 'Completada' };
      steps[1] = { type: 'completed', label: '2. Validació', sub: 'Aprovat' };
      steps[2] = { type: 'completed', label: '3. Comanda', sub: 'Emesa' };
      steps[3] = { type: 'completed', label: '4. Recepció', sub: 'Rebuda' };
      steps[4] = { type: 'active', label: '5. Tancat', sub: 'Facturació' };
    } else if (status === 'tancada') {
      steps[0] = { type: 'completed', label: '1. Sol·licitud', sub: 'Completada' };
      steps[1] = { type: 'completed', label: '2. Validació', sub: 'Aprovat' };
      steps[2] = { type: 'completed', label: '3. Comanda', sub: 'Emesa' };
      steps[3] = { type: 'completed', label: '4. Recepció', sub: 'Rebuda' };
      steps[4] = { type: 'completed', label: '5. Tancat', sub: 'Arxivat' };
    } else if (status === 'incidencia') {
      steps[0] = { type: 'completed', label: '1. Sol·licitud', sub: 'Completada' };
      steps[1] = { type: 'completed', label: '2. Validació', sub: 'Aprovat' };
      steps[2] = { type: 'completed', label: '3. Comanda', sub: 'Emesa' };
      steps[3] = { type: 'returned', label: '4. Recepció', sub: 'Incidència !' };
    }

    const renderCircle = (type: StepType, num: number) => {
      if (type === 'completed') {
        return `<div style="display:inline-block; width:26px; height:26px; line-height:26px; border-radius:50%; background-color:#10b981; color:#ffffff; font-size:12px; font-weight:800; text-align:center;">✓</div>`;
      }
      if (type === 'active') {
        return `<div style="display:inline-block; width:26px; height:26px; line-height:26px; border-radius:50%; background-color:#0284c7; color:#ffffff; font-size:11px; font-weight:800; text-align:center; box-shadow:0 0 0 3px rgba(2,132,199,0.25);">${num}</div>`;
      }
      if (type === 'returned') {
        return `<div style="display:inline-block; width:26px; height:26px; line-height:26px; border-radius:50%; background-color:#f59e0b; color:#ffffff; font-size:12px; font-weight:800; text-align:center; box-shadow:0 0 0 3px rgba(245,158,11,0.25);">!</div>`;
      }
      if (type === 'rejected') {
        return `<div style="display:inline-block; width:26px; height:26px; line-height:26px; border-radius:50%; background-color:#e11d48; color:#ffffff; font-size:12px; font-weight:800; text-align:center;">✕</div>`;
      }
      return `<div style="display:inline-block; width:26px; height:26px; line-height:26px; border-radius:50%; background-color:#e2e8f0; color:#94a3b8; font-size:11px; font-weight:700; text-align:center;">${num}</div>`;
    };

    return `
      <!-- Stepper / Barra de Progrés Visual -->
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; margin: 18px 0 24px; padding: 14px 6px;">
        <tr>
          ${steps.map((s, idx) => {
            const titleColor = (s.type === 'completed' || s.type === 'active') ? '#0f172a' : (s.type === 'returned' ? '#b45309' : (s.type === 'rejected' ? '#be123c' : '#94a3b8'));
            const subColor = s.type === 'active' ? '#0284c7' : (s.type === 'returned' ? '#d97706' : (s.type === 'rejected' ? '#e11d48' : (s.type === 'completed' ? '#059669' : '#94a3b8')));
            return `
              <td align="center" style="width: 20%; padding: 4px 2px; vertical-align: top;">
                ${renderCircle(s.type, idx + 1)}
                <div style="margin-top: 6px; font-size: 10px; font-weight: 800; text-transform: uppercase; color: ${titleColor}; line-height: 1.2;">
                  ${s.label}
                </div>
                <div style="margin-top: 2px; font-size: 9px; font-weight: 600; color: ${subColor}; line-height: 1.2;">
                  ${s.sub}
                </div>
              </td>
            `;
          }).join('')}
        </tr>
      </table>
    `;
  },

  /**
   * 2. Correu per a Aprovadors: Quan hi ha una sol·licitud nova pendent d'aprovació.
   * Dirigit a Coordinació (N2), Direcció d'Àrea (N3) o Finances (N4).
   */
  async sendPendingApprovalNotification(
    request: PurchaseRequest, 
    approverEmail: string, 
    approverRoleName: string, 
    customAppUrl?: string,
    extraData?: {
      actorName?: string;
      comment?: string;
    }
  ) {
    const platformUrl = getPlatformUrl(customAppUrl);
    const requestUrl = `${platformUrl}/compres/${request.id}`;
    const requestCode = request.code || request.id;
    const amountFormatted = `${((request.finalAmount ?? request.estimatedAmount) || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
    const urgencyLabel = (request.urgency || 'mitjana').toUpperCase();
    const requester = request.requestingTechnicianName || request.createdByUserName || 'Treballador/a';

    const subject = `🔔 [Acció Requerida] Pendent d'Aprovació: ${requestCode} - ${request.itemDescription}`;

    const plainTextBody = `Hola,\n\n` +
      `Tens una nova sol·licitud de compra pendent de la teva revisió i aprovació com a ${approverRoleName}.\n\n` +
      `Fase actual del circuit:\n` +
      `[1. Sol·licitud: Feta] ──► [2. Validació (${approverRoleName}): EL TEU TORN] ──► [3. Comanda] ──► [4. Recepció] ──► [5. Tancat]\n\n` +
      `Detalls de la sol·licitud:\n` +
      `- Codi d'expedient: ${requestCode}\n` +
      `- Sol·licitant: ${requester}\n` +
      `- Àrea: ${request.areaName || request.areaId}\n` +
      `- Projecte / Codi Analític: ${request.projectId || 'S/P'} / ${request.analyticCode || 'S/C'}\n` +
      `- Concepte: ${request.itemDescription}\n` +
      `- Import: ${amountFormatted}\n` +
      `- Urgència: ${urgencyLabel}\n` +
      (extraData?.actorName ? `- Tramitat per: ${extraData.actorName}\n` : '') +
      (extraData?.comment ? `- Comentaris: ${extraData.comment}\n` : '') +
      `\nPots revisar i signar la sol·licitud fent clic al següent enllaç:\n` +
      `${requestUrl}\n\n` +
      `Cordialment,\n` +
      `Circuit de Validacions · Fundació Som Llar`;

    const stepperHtml = this.renderEmailStepper(request.status);

    const htmlEmail = `
<!DOCTYPE html>
<html lang="ca">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 30px 15px;">
    <tr>
      <td align="center">
        <!-- Container -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 590px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.08);">
          
          <!-- Capçalera corporativa -->
          <tr>
            <td style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 32px 32px 26px; text-align: center;">
              <div style="background-color: rgba(255,255,255,0.2); display: inline-block; padding: 5px 14px; border-radius: 30px; margin-bottom: 10px;">
                <span style="font-size: 11px; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase; color: #ffffff;">CIRCUIT DE SIGNATURES</span>
              </div>
              <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.01em;">Pendent de la teva Aprovació</h1>
              <p style="margin: 6px 0 0; font-size: 13px; color: #e0f2fe; font-weight: 500;">Autorització requerida com a ${approverRoleName}</p>
            </td>
          </tr>

          <!-- Contingut -->
          <tr>
            <td style="padding: 28px 30px 24px;">
              <p style="font-size: 14px; line-height: 1.6; color: #334155; margin-top: 0; margin-bottom: 16px;">
                S'ha registrat la sol·licitud d'adquisició <strong>${requestCode}</strong> que necessita la teva revisió i signatura per continuar el curs administratiu:
              </p>

              <!-- Línia de temps visual -->
              ${stepperHtml}

              <!-- Fitxa Resum de la Compra -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; margin-bottom: 22px;">
                <tr>
                  <td style="padding: 18px 20px;">
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
                      ${extraData?.actorName ? `
                      <tr>
                        <td style="font-size: 12px; color: #64748b; font-weight: 600;">Tramitat per:</td>
                        <td style="font-size: 13px; color: #0f172a; font-weight: 600;">${extraData.actorName}</td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>

              ${request.requiresThreeQuotes || (request.estimatedAmount && request.estimatedAmount >= 5000) ? `
              <!-- Alerta 3 pressupostos -->
              <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 12px 16px; margin-bottom: 20px;">
                <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #b45309;">
                  ⚠️ <strong>Contractació major (> 5.000 €):</strong> Aquest expedient requereix un mínim de 3 pressupostos comparatius abans de l'adjudicació definitiva.
                </p>
              </div>
              ` : ''}

              <!-- Bloc Què passa ara? -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 14px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px 18px;">
                    <span style="display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: 800; text-transform: uppercase; background-color: #dbeafe; color: #1e40af; margin-bottom: 6px;">
                      ACCIÓ REQUERIDA
                    </span>
                    <h3 style="margin: 0 0 4px; font-size: 13px; font-weight: 800; color: #1e3a8a;">
                      Què has de fer a continuació?
                    </h3>
                    <p style="margin: 0; font-size: 12px; line-height: 1.55; color: #2563eb;">
                      Com a <strong>${approverRoleName}</strong>, fes clic al botó inferior per comprovar les justificacions, pressupostos i aprovar o retornar la demanda.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Botó d'Acció Smart CTA -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 24px 0 16px;">
                <tr>
                  <td align="center">
                    <a href="${requestUrl}" target="_blank" style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color: #ffffff; padding: 15px 36px; font-size: 15px; font-weight: 800; text-decoration: none; border-radius: 12px; display: inline-block; box-shadow: 0 10px 18px -4px rgba(2, 132, 199, 0.35); letter-spacing: 0.02em;">
                      👉 Revisar i Validar com a ${approverRoleName} &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Suport i Contacte -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 20px; border-top: 1px dashed #e2e8f0; padding-top: 16px;">
                <tr>
                  <td align="center">
                    <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.5;">
                      Dubtes amb aquest expedient? Respon a aquest correu o contacta amb <a href="mailto:finances@somllar.cat" style="color: #0284c7; text-decoration: underline; font-weight: 600;">finances@somllar.cat</a>.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="border-top: 1px solid #e2e8f0; padding: 20px 32px; background-color: #f8fafc; text-align: center;">
              <p style="margin: 0 0 4px; font-size: 11px; color: #64748b; font-weight: 600;">Fundació Som Llar · Gestió de Compres</p>
              <p style="margin: 0; font-size: 10px; color: #94a3b8;">Notificació automàtica del circuit corporatiu de compres.</p>
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
      buttonText: `Revisar i Validar com a ${approverRoleName}`,
      body: plainTextBody,
      htmlBody: htmlEmail,
    });
  },

  /**
   * 3. Correu d'Actualització d'Estat: Dirigit al Sol·licitant / Creador de la compra.
   * Inclou la línia de temps visual (Stepper), el bloc "Què passa ara?" i el CTA intel·ligent.
   */
  async sendStatusUpdateNotification(
    request: PurchaseRequest, 
    targetEmail: string, 
    newStatus: RequestStatus, 
    comment?: string, 
    customAppUrl?: string,
    extraData?: {
      actorName?: string;
      actorRole?: string;
      previousStatus?: RequestStatus;
    }
  ) {
    const platformUrl = getPlatformUrl(customAppUrl);
    const requestUrl = `${platformUrl}/compres/${request.id}`;
    const requestCode = request.code || request.id;
    const statusInfo = STATUS_LABELS[newStatus] || { label: newStatus, color: 'bg-slate-100 text-slate-800' };
    const amountFormatted = `${((request.finalAmount ?? request.estimatedAmount) || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

    // Resolució intel·ligent de contingut segons l'estat
    let headline = `Actualització de la teva sol·licitud ${requestCode}`;
    let bannerColor = 'linear-gradient(135deg, #059669 0%, #047857 100%)';
    let icon = '📦';
    let badgeText = 'ESTAT ACTUALITZAT';
    let badgeBg = '#f1f5f9';
    let badgeColor = '#334155';
    let nextStepTitle = 'Propers passos';
    let nextStepExplanation = 'La teva sol·licitud continua avançant en el circuit de gestió.';
    let buttonText = "Veure l'Expedient Complet &rarr;";
    let buttonGradient = 'linear-gradient(135deg, #059669 0%, #047857 100%)';

    if (newStatus === 'comanda_emesa') {
      icon = '🚚';
      headline = `Comanda Tramitada al Proveïdor!`;
      bannerColor = 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)';
      badgeText = 'COMANDA EN CURS';
      badgeBg = '#e0e7ff';
      badgeColor = '#3730a3';
      nextStepTitle = 'Què has de fer quan arribi el material?';
      nextStepExplanation = 'La comanda ja ha estat emesa al proveïdor. En quant arribi el paquet a la teva seu o es completi el servei, si us plau accedeix a la plataforma i prem el botó per confirmar la recepció.';
      buttonText = '📦 Confirmar Recepció del Material &rarr;';
      buttonGradient = 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)';
    } else if (newStatus === 'rebuda') {
      icon = '✅';
      headline = `Compra Rebuda i Confirmada!`;
      bannerColor = 'linear-gradient(135deg, #059669 0%, #047857 100%)';
      badgeText = 'RECEPCIÓ COMPLETADA';
      badgeBg = '#dcfce7';
      badgeColor = '#166534';
      nextStepTitle = 'Conformitat de Factura i Tancament';
      nextStepExplanation = 'La recepció ha quedat registrada satisfactòriament. Ara Administració creuarà l\'albarà amb la factura oficial del proveïdor per autoritzar el pagament i tancar l\'expedient.';
      buttonText = '📄 Veure Conformitat i Albarans &rarr;';
      buttonGradient = 'linear-gradient(135deg, #059669 0%, #047857 100%)';
    } else if (newStatus === 'aprovada') {
      icon = '🎉';
      headline = `Sol·licitud Validada i Aprovada!`;
      bannerColor = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
      badgeText = 'APROVACIÓ COMPLETADA';
      badgeBg = '#d1fae5';
      badgeColor = '#065f46';
      nextStepTitle = 'Emissió de la Comanda Formal';
      nextStepExplanation = 'La teva sol·licitud compta amb totes les signatures internes (Coordinació, Direcció i Finances). L\'equip de compres està preparant la comanda formal amb el proveïdor. Rebràs un avís tan bon punt sigui emesa.';
      buttonText = '📄 Consultar Detall de la Compra &rarr;';
      buttonGradient = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
    } else if (newStatus === 'retornada') {
      icon = '✏️';
      headline = `Esmena Requerida a la teva Sol·licitud`;
      bannerColor = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
      badgeText = 'ACCIÓ REQUERIDA';
      badgeBg = '#fef3c7';
      badgeColor = '#92400e';
      nextStepTitle = 'Revisió i Correcció Necessària';
      nextStepExplanation = 'L\'aprovador ha retornat la sol·licitud perquè cal revisar alguna dada o adjuntar documentació addicional. Fes clic a continuació per corregir-la i tornar-la a enviar.';
      buttonText = '✏️ Esmenar Sol·licitud Ara &rarr;';
      buttonGradient = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
    } else if (newStatus === 'rebutjada') {
      icon = '❌';
      headline = `Sol·licitud de Compra Rebutjada`;
      bannerColor = 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)';
      badgeText = 'SOL·LICITUD DENEGADA';
      badgeBg = '#ffe4e6';
      badgeColor = '#9f1239';
      nextStepTitle = 'Motiu de la Denegació';
      nextStepExplanation = 'Aquesta despesa no ha estat autoritzada en la fase d\'aprovació. Pots revisar les observacions completes de l\'aprovador al detall de l\'expedient.';
      buttonText = '📄 Veure Motiu i Detalls &rarr;';
      buttonGradient = 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)';
    } else if (newStatus === 'tancada') {
      icon = '🏁';
      headline = `Expedient Finalitzat i Tancat`;
      bannerColor = 'linear-gradient(135deg, #334155 0%, #1e293b 100%)';
      badgeText = 'EXPEDIENT TANCAT';
      badgeBg = '#f1f5f9';
      badgeColor = '#334155';
      nextStepTitle = 'Procés Administrativament Completat';
      nextStepExplanation = 'La comanda, la recepció del material i la conformitat de factura han finalitzat amb èxit. L\'expedient queda arxivat a l\'històric.';
      buttonText = '📁 Consultar Historial Complet &rarr;';
      buttonGradient = 'linear-gradient(135deg, #334155 0%, #1e293b 100%)';
    } else if (newStatus === 'pendent_direccio') {
      icon = '📋';
      headline = `Validada per Coordinació d'Àrea`;
      bannerColor = 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)';
      badgeText = 'VALIDADA PER COORDINACIÓ';
      badgeBg = '#e0f2fe';
      badgeColor = '#0369a1';
      nextStepTitle = 'Pendent de Direcció d\'Àrea (N3)';
      nextStepExplanation = 'La Coordinació de la teva àrea ha autoritzat la teva sol·licitud. Ara la Direcció d\'Àrea revisarà la proposta abans del control pressupostari de Finances.';
      buttonText = '📄 Consultar Estat de la Compra &rarr;';
      buttonGradient = 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)';
    } else if (newStatus === 'pendent_finances' || newStatus === 'pendent_administracio') {
      icon = '💶';
      headline = `Validada per Direcció d'Àrea`;
      bannerColor = 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)';
      badgeText = 'VALIDADA PER DIRECCIÓ';
      badgeBg = '#f3e8ff';
      badgeColor = '#6d28d9';
      nextStepTitle = 'Pendent de Control de Finances (N4)';
      nextStepExplanation = 'La Direcció d\'Àrea ha donat el vistiplau. Actualment l\'equip de Finances està verificant la partida pressupostària i la conformitat abans d\'emetre la comanda.';
      buttonText = '📄 Consultar Estat de la Compra &rarr;';
      buttonGradient = 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)';
    }

    const subject = `${icon} ${headline} (${requestCode})`;

    const plainTextBody = `Hola,\n\n` +
      `${headline}\n\n` +
      `Fase actual del circuit:\n` +
      `[1. Sol·licitud] ──► [2. Validació] ──► [3. Comanda] ──► [4. Recepció] ──► [5. Tancat]\n\n` +
      `Estat actual: ${statusInfo.label}\n\n` +
      `Què passa ara?\n` +
      `${nextStepExplanation}\n\n` +
      `Detalls de l'expedient:\n` +
      `- Codi: ${requestCode}\n` +
      `- Concepte: ${request.itemDescription}\n` +
      `- Import: ${amountFormatted}\n` +
      (request.supplierName ? `- Proveïdor: ${request.supplierName}\n` : '') +
      (extraData?.actorName ? `- Acció feta per: ${extraData.actorName}\n` : '') +
      (comment ? `- Observacions / Motiu: "${comment}"\n` : '') +
      `\nPots consultar el seguiment complet fent clic a:\n` +
      `${requestUrl}\n\n` +
      `Cordialment,\n` +
      `Equip de Gestió de Compres · Fundació Som Llar`;

    const stepperHtml = this.renderEmailStepper(newStatus);

    const htmlEmail = `
<!DOCTYPE html>
<html lang="ca">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 30px 15px;">
    <tr>
      <td align="center">
        <!-- Container -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 590px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.08);">
          
          <!-- Capçalera amb gradent d'estat -->
          <tr>
            <td style="background: ${bannerColor}; padding: 32px 32px 26px; text-align: center;">
              <div style="background-color: rgba(255,255,255,0.2); display: inline-block; padding: 5px 14px; border-radius: 30px; margin-bottom: 10px;">
                <span style="font-size: 11px; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase; color: #ffffff;">SEGUIMENT DE LA TEVA COMPRA</span>
              </div>
              <h1 style="margin: 0; font-size: 21px; font-weight: 800; color: #ffffff; letter-spacing: -0.01em;">${headline}</h1>
              <p style="margin: 6px 0 0; font-size: 13px; color: rgba(255,255,255,0.92); font-weight: 600;">Expedient ${requestCode}</p>
            </td>
          </tr>

          <!-- Contingut -->
          <tr>
            <td style="padding: 28px 30px 24px;">
              
              <!-- Línia de temps visual (Stepper) -->
              ${stepperHtml}

              <!-- Fitxa Resum de la Compra -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; margin-bottom: 22px;">
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
                        <td style="font-size: 15px; color: #059669; font-weight: 800;">
                          ${amountFormatted}
                        </td>
                      </tr>
                      ${extraData?.actorName ? `
                      <tr>
                        <td style="font-size: 12px; color: #64748b; font-weight: 600;">Acció feta per:</td>
                        <td style="font-size: 13px; color: #0f172a; font-weight: 600;">
                          ${extraData.actorName} ${extraData.actorRole ? `<span style="font-size: 11px; color: #64748b;">(${extraData.actorRole})</span>` : ''}
                        </td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>

              ${comment ? `
              <!-- Observacions / Comentaris de l'Aprovador -->
              <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 14px 18px; margin-bottom: 22px;">
                <p style="margin: 0 0 4px; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #1e40af;">OBSERVACIONS DE L'EXPEDIENT:</p>
                <p style="margin: 0; font-size: 13px; color: #1e3a8a; line-height: 1.5; font-style: italic;">
                  "${comment}"
                </p>
              </div>
              ` : ''}

              <!-- Bloc Què passa ara? (Expectatives i Propers Passos) -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px 18px;">
                    <span style="display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: 800; text-transform: uppercase; background-color: ${badgeBg}; color: ${badgeColor}; margin-bottom: 6px;">
                      ${badgeText}
                    </span>
                    <h3 style="margin: 0 0 4px; font-size: 13px; font-weight: 800; color: #0f172a;">
                      ${nextStepTitle}
                    </h3>
                    <p style="margin: 0; font-size: 12px; line-height: 1.55; color: #475569;">
                      ${nextStepExplanation}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Botó d'Acció Smart CTA -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 24px 0 16px;">
                <tr>
                  <td align="center">
                    <a href="${requestUrl}" target="_blank" style="background: ${buttonGradient}; color: #ffffff; padding: 14px 34px; font-size: 14px; font-weight: 800; text-decoration: none; border-radius: 12px; display: inline-block; box-shadow: 0 10px 18px -4px rgba(0,0,0,0.25); letter-spacing: 0.02em;">
                      ${buttonText}
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Suport i Contacte -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 20px; border-top: 1px dashed #e2e8f0; padding-top: 16px;">
                <tr>
                  <td align="center">
                    <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.5;">
                      Dubtes amb aquest expedient? Respon directament a aquest correu o contacta amb <a href="mailto:finances@somllar.cat" style="color: #0284c7; text-decoration: underline; font-weight: 600;">finances@somllar.cat</a>.
                    </p>
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
      buttonText: buttonText.replace(/&rarr;/g, '').trim(),
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
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(fullPayload),
      });
      console.log(`📧 Correu [${payload.type || 'generic'}] enviat a ${payload.to}: "${payload.subject}"`);
    } catch (error) {
      console.error('Error enviant webhook de correu:', error);
    }
  }
};
