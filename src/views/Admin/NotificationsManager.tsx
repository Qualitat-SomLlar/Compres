import { Bell, X, BellPlus, Loader2 } from 'lucide-react';
import { useHierarchyLevels } from '../../hooks/useHierarchyLevels';
import toast from 'react-hot-toast';
import { cn } from '../../lib/utils';
import { NOTIFICATION_EVENTS } from '../../constants';
import { useNotificationSettings } from '../../hooks/useNotificationSettings';

export function NotificationsManager() {
  const { settings, loading, updateSetting, initializeSettings } = useNotificationSettings();
  const { hierarchyLevels } = useHierarchyLevels();
  const events = NOTIFICATION_EVENTS;
  const roles = hierarchyLevels
    .filter(h => h.active !== false)
    .map(h => [h.key, h.label || (h as any).name || h.shortLabel || h.key] as [string, string]);

  const missingEvents = events.filter(e => !settings.some(s => s.eventKey === e.id));

  const toggleRole = (setting: any, role: string) => {
    const roles = setting.recipientRoles || [];
    const newRoles = roles.includes(role as any) 
      ? roles.filter((r: any) => r !== role)
      : [...roles, role as any];
    updateSetting(setting.id, { recipientRoles: newRoles });
  };

  const addEmail = (setting: any, email: string) => {
    if (!email || !email.includes('@')) return;
    const emails = setting.recipientEmails || [];
    if (emails.includes(email)) return;
    updateSetting(setting.id, { recipientEmails: [...emails, email] });
  };

  const removeEmail = (setting: any, email: string) => {
    const emails = setting.recipientEmails || [];
    updateSetting(setting.id, { recipientEmails: emails.filter((e: any) => e !== email) });
  };

  const handleInitialize = async () => {
    toast.promise(initializeSettings(events), {
      loading: 'Inicialitzant notificacions...',
      success: 'Configuració creada correctament!',
      error: 'Error al crear la configuració'
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-4">
        <Loader2 className="animate-spin text-brand-primary" size={32} />
        <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest">Carregant configuració...</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Flux de Notificacions Automàtiques</h3>
          <p className="text-xs text-slate-600 font-medium text-balance">Configura quins rols o correus rebran alertes per a cada esdeveniment.</p>
        </div>
        {missingEvents.length > 0 && (
          <button onClick={handleInitialize} className="btn-primary text-[10px] py-2 px-4 flex items-center gap-2">
            <BellPlus size={14} />
            Inicialitzar {missingEvents.length} esdeveniments
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-8">
        {events.map(event => {
          const setting = settings.find(s => s.eventKey === event.id);
          if (!setting) return null;

          return (
            <div key={event.id} className="card p-8 bg-white/[0.01] border-white/5 space-y-8 group hover:border-brand-primary/20 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "p-3 rounded-2xl transition-all",
                    setting.enabled ? "bg-brand-primary/10 text-brand-primary" : "bg-white/5 text-slate-600"
                  )}>
                    <Bell size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white uppercase tracking-tight">{event.name}</h4>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Esdeveniment: {event.id}</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={setting.enabled} 
                    onChange={(e) => updateSetting(setting.id, { enabled: e.target.checked })} 
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-primary peer-checked:after:bg-white"></div>
                </label>
              </div>

              {setting.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-6 border-t border-white/5 animate-in fade-in duration-500">
                  <div className="space-y-4">
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em]">Rols receptors</p>
                    <div className="flex flex-wrap gap-2">
                      {roles.map(([key, label]) => {
                        const isSelected = setting.recipientRoles?.includes(key as any);
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => toggleRole(setting, key)}
                            className={cn(
                              "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border flex items-center gap-1.5",
                              isSelected
                                ? "bg-brand-primary/15 border-brand-primary text-brand-primary shadow-sm"
                                : "bg-white/5 border-white/5 text-slate-400 hover:border-white/20 hover:text-white"
                            )}
                          >
                            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", isSelected ? "bg-brand-primary" : "bg-slate-600")}></span>
                            <span>{label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em]">Correus addicionals</p>
                    <div className="space-y-3">
                      <input 
                        type="email" 
                        placeholder="Afegeix correu i prem Enter" 
                        className="input-field text-xs py-2 w-full"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            addEmail(setting, e.currentTarget.value);
                            e.currentTarget.value = '';
                          }
                        }}
                      />
                      <div className="flex flex-wrap gap-2">
                        {setting.recipientEmails?.map(email => (
                          <div key={email} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-xl border border-white/5">
                            <span className="text-[10px] font-medium text-slate-400">{email}</span>
                            <button onClick={() => removeEmail(setting, email)} className="text-slate-600 hover:text-red-500 transition-colors">
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
