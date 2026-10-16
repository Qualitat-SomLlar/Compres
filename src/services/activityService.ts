import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ActivityLog, ActivityType, User } from '../types';

/**
 * Detecta de manera amigable el dispositiu i navegador a partir del User Agent.
 */
function getDeviceSummary(): string {
  if (typeof window === 'undefined' || !window.navigator) return 'Web Client';
  const ua = window.navigator.userAgent;
  
  let os = 'Desconegut';
  if (ua.includes('Win')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  let browser = 'Navegador';
  if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('Chrome/')) browser = 'Chrome';
  else if (ua.includes('Safari/') && !ua.includes('Chrome/')) browser = 'Safari';
  else if (ua.includes('Firefox/')) browser = 'Firefox';

  return `${os} · ${browser}`;
}

export const activityService = {
  /**
   * Registra una acció genèrica al log d'auditoria.
   */
  async logActivity(params: {
    userId: string;
    userName: string;
    userEmail: string;
    userRole?: string;
    hierarchyLevel?: number;
    areaId?: string;
    areaName?: string;
    type: ActivityType;
    action: string;
    details: string;
    requestId?: string;
    requestCode?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      const now = new Date().toISOString();
      const device = getDeviceSummary();

      // Neteja de valors undefined perquè Firestore no admet valors undefined
      const cleanData: Record<string, any> = {
        userId: params.userId || '',
        userName: params.userName || '',
        userEmail: params.userEmail || '',
        userRole: params.userRole || '',
        hierarchyLevel: typeof params.hierarchyLevel === 'number' ? params.hierarchyLevel : null,
        areaId: params.areaId || '',
        areaName: params.areaName || '',
        type: params.type,
        action: params.action || '',
        details: params.details || '',
        device,
        createdAt: now
      };

      if (params.requestId) cleanData.requestId = params.requestId;
      if (params.requestCode) cleanData.requestCode = params.requestCode;
      if (params.metadata) {
        // Netejar també camps undefined dins de metadata
        const cleanMeta: Record<string, any> = {};
        for (const [key, val] of Object.entries(params.metadata)) {
          if (val !== undefined) cleanMeta[key] = val;
        }
        cleanData.metadata = cleanMeta;
      }

      await addDoc(collection(db, 'activityLogs'), cleanData);
      console.log(`📝 Log d'activitat [${params.type}]: ${params.action} - ${params.userName}`);
    } catch (err) {
      // No bloqueja mai l'operació principal de l'usuari si falla el log
      console.warn("No s'ha pogut desar el log d'activitat:", err);
    }
  },

  /**
   * Registre específic d'Inici de Sessió.
   */
  async logLogin(user: Partial<User> & { id: string; email: string; name: string }): Promise<void> {
    await this.logActivity({
      userId: user.id,
      userName: user.name || user.email.split('@')[0],
      userEmail: user.email,
      userRole: user.role,
      hierarchyLevel: user.hierarchyLevel,
      areaId: user.areaId,
      areaName: user.areaName,
      type: 'login',
      action: 'Inici de Sessió',
      details: `L'usuari/ària ha iniciat sessió a la plataforma corporativa amb Microsoft 365.`
    });
  },

  /**
   * Registre de Tancament de Sessió.
   */
  async logLogout(user: { id: string; email: string; name: string }): Promise<void> {
    await this.logActivity({
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      type: 'logout',
      action: 'Tancament de Sessió',
      details: `L'usuari/ària ha tancat la sessió de la plataforma.`
    });
  },

  /**
   * Registre d'Accions sobre Sol·licituds (creació, aprovació, esmena, etc.).
   */
  async logRequestAction(
    user: Partial<User> & { id: string; name: string; email: string },
    type: ActivityType,
    action: string,
    request: { id: string; code?: string; itemDescription?: string; estimatedAmount?: number },
    details: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logActivity({
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      userRole: user.role,
      hierarchyLevel: user.hierarchyLevel,
      areaId: user.areaId,
      areaName: user.areaName,
      type,
      action,
      details,
      requestId: request.id,
      requestCode: request.code || request.id,
      metadata: {
        itemDescription: request.itemDescription,
        estimatedAmount: request.estimatedAmount,
        ...metadata
      }
    });
  },

  /**
   * Registre d'Accions d'Administració (alta/baixa de treballadors, àrees, permisos, etc.).
   */
  async logAdminAction(
    adminUser: Partial<User> & { id: string; name: string; email: string },
    type: ActivityType,
    action: string,
    details: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logActivity({
      userId: adminUser.id,
      userName: adminUser.name,
      userEmail: adminUser.email,
      userRole: adminUser.role,
      hierarchyLevel: adminUser.hierarchyLevel,
      areaId: adminUser.areaId,
      areaName: adminUser.areaName,
      type,
      action,
      details,
      metadata
    });
  },

  /**
   * Obté tots els logs d'activitat associats a un expedient de compra concret.
   */
  async getLogsByRequestId(requestId: string): Promise<ActivityLog[]> {
    try {
      const q = query(
        collection(db, 'activityLogs'),
        where('requestId', '==', requestId)
      );
      const snapshot = await getDocs(q);
      const logs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ActivityLog));

      // Ordenar cronològicament (més recents primer)
      return logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (err) {
      console.warn("No s'han pogut carregar els logs de la sol·licitud:", err);
      return [];
    }
  }
};
