/**
 * Servei d'autenticació i identitat Microsoft.
 * Arquitectura preparada per a Microsoft Entra ID (Azure AD).
 */
export const microsoftAuthService = {
  // Configuració via variables d'entorn
  config: {
    clientId: import.meta.env.VITE_MICROSOFT_CLIENT_ID || 'PENDENT',
    tenantId: import.meta.env.VITE_MICROSOFT_TENANT_ID || 'common',
    redirectUri: `${window.location.origin}/auth/callback`,
    scopes: ['User.Read', 'Mail.Send', 'People.Read']
  },

  async login() {
    console.log('Iniciant login amb Microsoft Entra ID...');
    // Aquí aniria la lògica de MSAL.js
  },

  async logout() {
    console.log('Tancant sessió Microsoft...');
  },

  /**
   * Obté el perfil de l'usuari des de Microsoft Graph.
   */
  async getProfile() {
    console.log('Recuperant perfil de Microsoft Graph...');
    return null;
  }
};
