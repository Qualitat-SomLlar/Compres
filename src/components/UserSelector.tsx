import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User as UserIcon, Search, Check, ChevronDown, UserPlus, Loader2, Building2 } from 'lucide-react';
import { useUsers } from '../hooks/useUsers';
import { User } from '../types';
import { cn } from '../lib/utils';
import { getAreaName, getHierarchyRole } from '../constants';

interface UserSelectorProps {
  onSelect: (worker: User) => void;
  selectedId?: string;
  label?: string;
  error?: string;
  required?: boolean;
}

export default function UserSelector({ onSelect, selectedId, label, error, required }: UserSelectorProps) {
  const { users: workers, loading } = useUsers();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const selectedWorker = workers.find(w => w.id === selectedId);

  const filteredWorkers = workers.filter(w => 
    w.active !== false && (
      (w.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (w.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (w.areaId || '').toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="space-y-2 relative" ref={wrapperRef}>
      {label && (
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between input-field text-left transition-all py-3",
          isOpen && "border-brand-primary shadow-sm shadow-brand-primary/10",
          error && "border-red-500"
        )}
      >
        {selectedWorker ? (
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-xs font-bold text-brand-primary shrink-0">
              {(selectedWorker.name || 'U').charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-white truncate">{selectedWorker.name}</p>
                <span className={cn(
                  "text-[8px] font-black uppercase px-1.5 py-0.5 rounded border shrink-0",
                  getHierarchyRole(selectedWorker.role).badgeColor
                )}>
                  {getHierarchyRole(selectedWorker.role).shortLabel}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[9px] text-slate-400 mt-0.5">
                <span className="truncate">{selectedWorker.email}</span>
                <span className="text-slate-600">•</span>
                <span className="text-brand-primary/80 font-bold flex items-center gap-1 shrink-0">
                  <Building2 size={10} /> {getAreaName(selectedWorker.areaId)}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <span className="text-xs text-slate-600 font-medium italic">Selecciona un/a treballador/a</span>
        )}
        <ChevronDown size={14} className={cn("text-slate-500 transition-transform shrink-0 ml-2", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-[#151c2c] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="p-3 border-b border-white/[0.05]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
              <input
                type="text"
                className="w-full bg-white/[0.02] border border-white/[0.05] rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-primary/50"
                placeholder="Cerca per nom, correu o àrea..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto divide-y divide-white/[0.02]">
            {loading ? (
              <div className="p-8 text-center flex flex-col items-center gap-2">
                <Loader2 size={20} className="animate-spin text-brand-primary" />
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Carregant personal...</p>
              </div>
            ) : filteredWorkers.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-xs text-slate-600 font-medium">No s'han trobat treballadors/es</p>
              </div>
            ) : (
              filteredWorkers.map(worker => {
                const roleConfig = getHierarchyRole(worker.role);
                const areaName = getAreaName(worker.areaId);

                return (
                  <button
                    key={worker.id}
                    type="button"
                    onClick={() => {
                      onSelect(worker);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-3 hover:bg-brand-primary/15 transition-colors group text-left",
                      selectedId === worker.id && "bg-brand-primary/5"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-all shrink-0",
                        selectedId === worker.id 
                          ? "bg-brand-primary border-brand-primary text-white" 
                          : "bg-white/5 border-white/5 text-slate-400 group-hover:border-brand-primary/30"
                      )}>
                        {(worker.name || 'U').charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={cn(
                            "text-xs font-bold transition-colors truncate",
                            selectedId === worker.id ? "text-brand-primary" : "text-white group-hover:text-brand-primary"
                          )}>
                            {worker.name}
                          </p>
                          <span className={cn(
                            "text-[8px] font-black uppercase px-1.5 py-0.5 rounded border shrink-0",
                            roleConfig.badgeColor
                          )}>
                            {roleConfig.shortLabel}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[9px] text-slate-500 mt-0.5">
                          <span className="truncate">{worker.email}</span>
                          <span>•</span>
                          <span className="text-slate-400 font-bold flex items-center gap-1 shrink-0">
                            <Building2 size={10} /> {areaName}
                          </span>
                        </div>
                      </div>
                    </div>
                    {selectedId === worker.id && <Check size={14} className="text-brand-primary shrink-0 ml-2" />}
                  </button>
                );
              })
            )}
          </div>
          
          <div className="p-3 bg-white/[0.01] border-t border-white/[0.05]">
            <button onClick={() => navigate('/admin')} className="w-full flex items-center justify-center gap-2 py-2 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-colors">
              <UserPlus size={12} />
              <span>Gestionar Directori de Personal</span>
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-[10px] font-bold text-red-500 tracking-tight">{error}</p>}
    </div>
  );
}
