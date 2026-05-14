import React, { useState } from 'react';
import { Bell, Check, Info, AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../hooks/useNotifications';
import { User } from '../types';
import { cn } from '../lib/utils';

export default function NotificationBell({ user }: { user: User }) {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(user.id);
  const navigate = useNavigate();

  const handleNotificationClick = (notif: any) => {
    markAsRead(notif.id);
    if (notif.requestId) {
      navigate(`/compres/${notif.requestId}`);
    }
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative p-2 text-slate-400 hover:text-brand-primary transition-all rounded-xl hover:bg-white/5",
          isOpen && "text-brand-primary bg-white/5"
        )}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center ring-2 ring-dashboard-card animate-in zoom-in">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
          <div className="absolute right-0 mt-4 w-96 bg-[#151c2c] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in slide-in-from-top-2 duration-200">
            <div className="p-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
              <h3 className="text-xs font-black text-white uppercase tracking-widest">Notificacions</h3>
              {unreadCount > 0 && (
                <button 
                  onClick={markAllAsRead}
                  className="text-[10px] font-bold text-brand-primary hover:underline flex items-center gap-1"
                >
                  <Check size={12} /> Marcar-ho tot com a llegit
                </button>
              )}
            </div>

            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-10 text-center">
                  <Bell className="mx-auto text-slate-700 mb-4" size={32} />
                  <p className="text-xs font-bold text-slate-500">No tens cap notificació</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {notifications.map((notif) => (
                    <div 
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={cn(
                        "p-4 hover:bg-white/[0.03] transition-colors cursor-pointer group relative",
                        !notif.read && "bg-brand-primary/[0.02]"
                      )}
                    >
                      {!notif.read && <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-primary"></div>}
                      <div className="flex gap-4">
                        <div className={cn(
                          "shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
                          notif.type === 'success' ? "bg-emerald-500/10 text-emerald-500" :
                          notif.type === 'warning' ? "bg-amber-500/10 text-amber-500" :
                          notif.type === 'error' ? "bg-red-500/10 text-red-500" : "bg-blue-500/10 text-blue-500"
                        )}>
                          {notif.type === 'success' ? <CheckCircle size={16} /> :
                           notif.type === 'warning' ? <AlertTriangle size={16} /> :
                           notif.type === 'error' ? <AlertTriangle size={16} /> : <Info size={16} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black text-slate-200 uppercase tracking-tight mb-1">{notif.title}</p>
                          <p className="text-xs text-slate-400 leading-snug line-clamp-2">{notif.message}</p>
                          <div className="flex items-center justify-between mt-3">
                            <span className="text-[10px] text-slate-600 font-bold italic">
                              {new Date(notif.createdAt).toLocaleDateString()}
                            </span>
                            {notif.requestId && (
                              <span className="text-[10px] font-black text-brand-primary flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                VEURE EXPEDIENT <ExternalLink size={10} />
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {notifications.length > 0 && (
              <div className="p-3 bg-white/[0.01] border-t border-white/5 text-center">
                 <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">S'eliminen automàticament passats 30 dies</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
