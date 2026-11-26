import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { Mail, Search, Download, Loader2, AlertTriangle, CheckCircle, FlaskConical } from 'lucide-react';
import { db } from '../../lib/firebase';
import { EmailLog, User } from '../../types';
import { NOTIFICATION_EVENTS } from '../../constants';
import { cn } from '../../lib/utils';

const MAX_RECORDS = 1000;

const TEMPLATE_LABELS: Record<string, string> = {
  pending_approval: 'Acció requerida',
  status_update: "Canvi d'estat",
  welcome: 'Benvinguda',
};

const STATUS_STYLES: Record<EmailLog['status'], { label: string; className: string; icon: ReactNode }> = {
  enviat: { label: 'Enviat', className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: <CheckCircle size={12} /> },
  error: { label: 'Error', className: 'bg-rose-500/10 text-rose-400 border-rose-500/20', icon: <AlertTriangle size={12} /> },
  simulat: { label: 'Simulat', className: 'bg-slate-500/10 text-slate-400 border-slate-500/20', icon: <FlaskConical size={12} /> },
};

const eventName = (key?: string) => NOTIFICATION_EVENTS.find(e => e.id === key)?.name || key || '—';
const csvCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;

/**
 * Registre de tots els correus que envia l'aplicació: a qui, quan, quin esdeveniment,
 * de quin expedient i qui ho ha provocat. Només el veu el perfil superadmin.
 */
export function EmailLogViewer({ users }: { users: User[] }) {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [eventFilter, setEventFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | EmailLog['status']>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  useEffect(() => {
    const q = query(collection(db, 'emailLogs'), orderBy('createdAt', 'desc'), limit(MAX_RECORDS));
    return onSnapshot(q, snapshot => {
      setLogs(snapshot.docs.map(d => ({ ...(d.data() as Omit<EmailLog, 'id'>), id: d.id })));
      setLoading(false);
      setError(null);
    }, err => {
      console.error('Error carregant el registre de correus:', err);
      setError("No s'ha pogut carregar el registre de correus.");
      setLoading(false);
    });
  }, []);

  const userName = (uid: string, email?: string) => users.find(u => u.id === uid)?.name || email || uid;
  const recipientName = (email: string) => users.find(u => (u.email || '').toLowerCase() === email)?.name;

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const now = new Date();
    const since = dateFilter === 'today' ? new Date(now.getFullYear(), now.getMonth(), now.getDate())
      : dateFilter === 'week' ? new Date(now.getTime() - 7 * 864e5)
      : dateFilter === 'month' ? new Date(now.getTime() - 30 * 864e5)
      : null;
    return logs.filter(l => {
      if (eventFilter !== 'all' && l.eventKey !== eventFilter) return false;
      if (statusFilter !== 'all' && l.status !== statusFilter) return false;
      if (since && new Date(l.createdAt) < since) return false;
      if (term) {
        const haystack = [l.to, recipientName(l.to), l.subject, l.requestCode, userName(l.triggeredByUserId, l.triggeredByEmail)]
          .join(' ').toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logs, users, searchTerm, eventFilter, statusFilter, dateFilter]);

  const metrics = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return {
      total: logs.length,
      today: logs.filter(l => new Date(l.createdAt) >= today).length,
      errors: logs.filter(l => l.status === 'error').length,
      recipients: new Set(logs.map(l => l.to)).size,
    };
  }, [logs]);

  const exportCSV = () => {
    const headers = ['Data i hora', 'Destinatari', 'Correu destinatari', 'Assumpte', 'Esdeveniment', 'Tipus', 'Expedient', 'Provocat per', 'Estat', 'Error'];
    const rows = filtered.map(l => [
      new Date(l.createdAt).toLocaleString('ca-ES'),
      recipientName(l.to) || '',
      l.to,
      l.subject,
      eventName(l.eventKey),
      TEMPLATE_LABELS[l.type] || l.type,
      l.requestCode || '',
      userName(l.triggeredByUserId, l.triggeredByEmail),
      STATUS_STYLES[l.status]?.label || l.status,
      l.error || '',
    ].map(csvCell).join(';'));
    const blob = new Blob(['﻿' + [headers.map(csvCell).join(';'), ...rows].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `registre_correus_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Correus registrats', value: metrics.total },
          { label: 'Avui', value: metrics.today },
          { label: 'Destinataris diferents', value: metrics.recipients },
          { label: 'Errors', value: metrics.errors, alert: metrics.errors > 0 },
        ].map(m => (
          <div key={m.label} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{m.label}</p>
            <p className={cn('text-2xl font-black mt-1', m.alert ? 'text-rose-400' : 'text-white')}>{m.value}</p>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-slate-500">
        «Enviat» vol dir que el correu s'ha lliurat al servei d'enviament; no confirma que hagi arribat a la bústia.
        No es desa el contingut dels correus. Es mostren els {MAX_RECORDS} més recents.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[14rem]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Cerca per destinatari, assumpte, expedient o qui l'ha provocat..."
            className="input-field text-xs pl-9"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <select className="input-field text-xs w-auto" value={eventFilter} onChange={e => setEventFilter(e.target.value)} aria-label="Esdeveniment">
          <option value="all">Tots els esdeveniments</option>
          {NOTIFICATION_EVENTS.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
        </select>
        <select className="input-field text-xs w-auto" value={statusFilter} onChange={e => setStatusFilter(e.target.value as typeof statusFilter)} aria-label="Estat">
          <option value="all">Tots els estats</option>
          <option value="enviat">Enviats</option>
          <option value="error">Amb error</option>
          <option value="simulat">Simulats</option>
        </select>
        <select className="input-field text-xs w-auto" value={dateFilter} onChange={e => setDateFilter(e.target.value as typeof dateFilter)} aria-label="Període">
          <option value="all">Tot el període</option>
          <option value="today">Avui</option>
          <option value="week">Últims 7 dies</option>
          <option value="month">Últims 30 dies</option>
        </select>
        <button
          type="button"
          onClick={exportCSV}
          disabled={filtered.length === 0}
          className="btn-secondary flex items-center gap-2 py-2.5 px-4 text-[11px] font-black uppercase tracking-wider disabled:opacity-50"
        >
          <Download size={14} /> Exportar CSV
        </button>
      </div>

      <div className="card overflow-x-auto">
        {loading ? (
          <div className="p-12 flex items-center justify-center gap-3 text-slate-400 text-xs">
            <Loader2 size={18} className="animate-spin" /> Carregant el registre de correus...
          </div>
        ) : error ? (
          <p className="p-8 text-xs text-rose-400">{error}</p>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Mail size={24} className="mx-auto text-slate-600" />
            <p className="text-xs text-slate-500">
              {logs.length === 0
                ? "Encara no s'ha registrat cap correu. El registre comença a partir d'aquesta versió."
                : 'Cap correu coincideix amb els filtres.'}
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">Data i hora</th>
                <th className="px-4 py-3">Destinatari</th>
                <th className="px-4 py-3">Assumpte</th>
                <th className="px-4 py-3">Esdeveniment</th>
                <th className="px-4 py-3">Expedient</th>
                <th className="px-4 py-3">Provocat per</th>
                <th className="px-4 py-3">Estat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.map(l => {
                const st = STATUS_STYLES[l.status] || STATUS_STYLES.enviat;
                return (
                  <tr key={l.id} className="hover:bg-white/[0.02] align-top">
                    <td className="px-4 py-3 whitespace-nowrap text-slate-300">
                      {new Date(l.createdAt).toLocaleDateString('ca-ES')}
                      <span className="block text-[10px] text-slate-500">{new Date(l.createdAt).toLocaleTimeString('ca-ES')}</span>
                    </td>
                    <td className="px-4 py-3 min-w-[12rem]">
                      <span className="block font-bold text-white">{recipientName(l.to) || l.to}</span>
                      {recipientName(l.to) && <span className="block text-[10px] text-slate-500">{l.to}</span>}
                    </td>
                    <td className="px-4 py-3 min-w-[16rem] text-slate-300">{l.subject}</td>
                    <td className="px-4 py-3 min-w-[10rem]">
                      <span className="block text-slate-300">{eventName(l.eventKey)}</span>
                      <span className="block text-[10px] text-slate-500">{TEMPLATE_LABELS[l.type] || l.type}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {l.requestId
                        ? <Link to={`/compres/${l.requestId}`} className="font-black text-brand-primary hover:underline">{l.requestCode || l.requestId}</Link>
                        : <span className="text-slate-600">—</span>}
                    </td>
                    <td className="px-4 py-3 min-w-[10rem] text-slate-300">{userName(l.triggeredByUserId, l.triggeredByEmail)}</td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-wider', st.className)} title={l.error || undefined}>
                        {st.icon} {st.label}
                      </span>
                      {l.error && <span className="block text-[10px] text-rose-300 mt-1 max-w-[14rem] break-words">{l.error}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
