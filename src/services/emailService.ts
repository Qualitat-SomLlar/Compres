import { PurchaseRequest, RequestStatus } from '../types';
import { STATUS_LABELS } from '../constants';

// Aquesta URL hauria de ser la de la Google Apps Script de l'usuari
const GOOGLE_SCRIPT_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbzJ3nWzomD-LWGr-uLjlFkuLVIP8SO3WnaDcimVFCgehTAFsWCLSujS2PbXsQlJ3XUzbg/exec'; 

export interface WorkerWelcomePayload {
  name: string;
  email: string;
  areaName: string;
  roleName: string;
  hierarchyCode?: string;
}

export const emailService = {
  /**
   * Envia una notificació per correu electrònic quan es dóna d'alta un nou treballador,
   * incloent informació del seu perfil i un botó destacat per accedir a la plataforma.
   */
  async sendWelcomeNotification(worker: WorkerWelcomePayload, customAppUrl?: string) {
    const platformUrl = customAppUrl || (typeof window !== 'undefined' && window.location.origin && !window.location.origin.includes('localhost') 
      ? window.location.origin 
      : 'https://som-llar-gesti-de-compres.vercel.app');

    const subject = `Benvingut/da a Som Llar - Gestió de Compres`;
    const roleDisplay = worker.hierarchyCode ? `${worker.roleName} (${worker.hierarchyCode})` : worker.roleName;

    const plainTextBody = `Hola ${worker.name},\n\n` +
      `T'informem que s'ha donat d'alta el teu compte a la plataforma Som Llar - Gestió de Compres.\n\n` +
      `Les teves dades d'accés són:\n` +
      `- Nom: ${worker.name}\n` +
      `- Àrea d'adscripció: ${worker.areaName}\n` +
      `- Càrrec / Nivell: ${roleDisplay}\n` +
      `- Correu electrònic: ${worker.email}\n\n` +
      `Pots accedir directament a la plataforma amb el teu compte corporatiu de Microsoft (@somllar.cat) mitjançant el següent enllaç:\n` +
      `${platformUrl}\n\n` +
      `Cordialment,\n` +
      `Equip de Som Llar`;

    const htmlEmail = `
<!DOCTYPE html>
<html lang="ca">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0b0f19; padding: 40px 15px;">
    <tr>
      <td align="center">
        <!-- Container -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #151c2c; border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 35px 35px 30px; text-align: center;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <div style="background-color: rgba(255,255,255,0.15); display: inline-block; padding: 8px 16px; border-radius: 50px; margin-bottom: 12px;">
                      <span style="font-size: 11px; font-weight: 8px; font-weight: 800; letter-spacing: 0.2em; text-transform: uppercase; color: #ffffff;">FUNDACIÓ SOM LLAR</span>
                    </div>
                    <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em;">Gestió de Compres</h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 35px 35px 25px;">
              <h2 style="margin-top: 0; font-size: 20px; font-weight: 700; color: #ffffff;">Hola, ${worker.name}! 👋</h2>
              <p style="font-size: 14px; line-height: 1.6; color: #94a3b8; margin-bottom: 25px;">
                T'informem que s'ha creat i activat correctament el teu compte a la plataforma corporativa de <strong>Gestió de Compres de Som Llar</strong>.
              </p>

              <!-- Worker Info Card -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 14px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 12px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.15em; color: #10b981;">DADES DEL TEU COMPTE</p>
                    
                    <table width="100%" border="0" cellspacing="0" cellpadding="6">
                      <tr>
                        <td width="35%" style="font-size: 13px; color: #64748b; font-weight: 600;">Àrea de treball:</td>
                        <td style="font-size: 13px; color: #ffffff; font-weight: 700;">${worker.areaName}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 13px; color: #64748b; font-weight: 600;">Càrrec / Rol:</td>
                        <td style="font-size: 13px; color: #ffffff; font-weight: 700;">${roleDisplay}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 13px; color: #64748b; font-weight: 600;">Correu d'accés:</td>
                        <td style="font-size: 13px; color: #38bdf8; font-weight: 700;">${worker.email}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Big Call To Action Button -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${platformUrl}" target="_blank" style="background-color: #059669; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; padding: 16px 36px; font-size: 15px; font-weight: 800; text-decoration: none; border-radius: 12px; display: inline-block; box-shadow: 0 10px 20px -5px rgba(16, 185, 129, 0.4); text-transform: uppercase; letter-spacing: 0.05em;">
                      Accedir a la Plataforma &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Notice -->
              <div style="background-color: rgba(56, 189, 248, 0.05); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 12px; padding: 15px 18px; margin-top: 25px;">
                <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #bae6fd;">
                  💡 <strong>Com iniciar sessió:</strong> En fer clic al botó, selecciona <em>"Inicia sessió amb Microsoft"</em> i utilitza el teu correu corporatiu acabat en <strong>@somllar.cat</strong>. No necessites cap contrasenya addicional.
                </p>
              </div>

              <!-- Fallback link -->
              <p style="font-size: 11px; color: #64748b; line-height: 1.5; margin-top: 25px; word-break: break-all;">
                Si el botó no funciona, copia i enganxa el següent enllaç al teu navegador web:<br>
                <a href="${platformUrl}" style="color: #10b981; text-decoration: underline;">${platformUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="border-top: 1px solid rgba(255,255,255,0.06); padding: 25px 35px; background-color: rgba(0,0,0,0.2); text-align: center;">
              <p style="margin: 0 0 6px; font-size: 11px; color: #64748b; font-weight: 600;">Fundació Som Llar · Gestió de Compres</p>
              <p style="margin: 0; font-size: 10px; color: #475569;">Aquest missatge s'ha generat automàticament des del sistema corporatiu de compres.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    if (!GOOGLE_SCRIPT_WEBHOOK_URL) {
      console.log('📨 Simulació de correu de benvinguda enviat:', {
        to: worker.email,
        subject,
        worker,
        platformUrl
      });
      return;
    }

    try {
      const payload = {
        type: 'welcome',
        to: worker.email,
        targetEmail: worker.email,
        recipient: worker.email,
        email: worker.email,
        subject,
        name: worker.name,
        workerName: worker.name,
        area: worker.areaName,
        role: worker.roleName,
        hierarchyCode: worker.hierarchyCode || '',
        url: platformUrl,
        link: platformUrl,
        actionUrl: platformUrl,
        buttonText: 'Accedir a la Plataforma',
        description: `Alta de compte d'usuari a Som Llar Compres per a ${worker.name} (${worker.areaName}, ${roleDisplay})`,
        status: 'Compte Activat',
        body: plainTextBody,
        message: plainTextBody,
        text: plainTextBody,
        htmlBody: htmlEmail,
        html: htmlEmail,
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
      console.log(`📧 Correu de benvinguda enviat correctament a ${worker.email}`);
    } catch (error) {
      console.error('Error enviant correu de benvinguda:', error);
    }
  },

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
