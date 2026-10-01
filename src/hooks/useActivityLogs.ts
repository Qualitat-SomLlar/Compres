import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ActivityLog } from '../types';

export function useActivityLogs(maxRecords: number = 300) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, 'activityLogs'),
      orderBy('createdAt', 'desc'),
      limit(maxRecords)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedLogs = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: String(doc.id)
        } as ActivityLog));
        setLogs(fetchedLogs);
        setLoading(false);
      },
      (err) => {
        console.error("Error carregant logs d'activitat:", err);
        setError("Error en carregar els registres d'activitat.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [maxRecords]);

  /**
   * Exporta els logs filtrats a un fitxer CSV descarregable.
   */
  const exportLogsToCSV = (logsToExport: ActivityLog[], fileName: string = 'auditoria_activitat_somllar.csv') => {
    const headers = ['Data i Hora', 'Usuari', 'Correu', 'Àrea', 'Rol', 'Tipus d\'Acció', 'Títol Acció', 'Detalls', 'Codi Sol·licitud', 'Dispositiu / Navegador'];
    
    const rows = logsToExport.map(l => [
      new Date(l.createdAt).toLocaleString('ca-ES'),
      `"${(l.userName || '').replace(/"/g, '""')}"`,
      l.userEmail || '',
      `"${(l.areaName || l.areaId || '').replace(/"/g, '""')}"`,
      l.userRole || '',
      l.type,
      `"${(l.action || '').replace(/"/g, '""')}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`,
      l.requestCode || '',
      `"${(l.device || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return { logs, loading, error, exportLogsToCSV };
}
