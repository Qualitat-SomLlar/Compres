import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Search, Check, ChevronDown, UserPlus } from 'lucide-react';
import { useWorkers } from '../hooks/useWorkers';
import { Worker } from '../types';
import { cn } from '../lib/utils';
import { Loader2 } from 'lucide-react';

interface WorkerSelectorProps {
  onSelect: (worker: Worker) => void;
  selectedId?: string;
  label?: string;
  error?: string;
  required?: boolean;
}

export default function WorkerSelector({ onSelect, selectedId, label, error, required }: WorkerSelectorProps) {
  const { workers, loading } = useWorkers();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const selectedWorker = workers.find(w => w.id === selectedId);

  const filteredWorkers = workers.filter(w => 
    w.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.email.toLowerCase().includes(searchTerm.toLowerCase())
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
          "w-full flex items-center justify-between input-field text-left transition-all",
          isOpen && "border-brand-primary shadow-sm shadow-brand-primary/10",
          error && "border-red-500"
        )}
      >
        {selectedWorker ? (
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-[10px] font-bold text-brand-primary">
              {selectedWorker.fullName.charAt(0)}
            </div>
            <div>
              <p className="text-xs font-bold text-white">{selectedWorker.fullName}</p>
              <p className="text-[9px] text-slate-500 uppercase tracking-tight">{selectedWorker.email}</p>
            </div>
          </div>
        ) : (
          <span className="text-xs text-slate-600 font-medium italic">Selecciona un/a tècnic/a</span>
        )}
        <ChevronDown size={14} className={cn("text-slate-500 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-[#151c2c] border border-white/10 rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="p-3 border-b border-white/[0.05]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
              <input
                type="text"
                className="w-full bg-white/[0.02] border border-white/[0.05] rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-primary/50"
                placeholder="Cerca per nom o correu"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center flex flex-col items-center gap-2">
                <Loader2 size={20} className="animate-spin text-brand-primary" />
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Carregant...</p>
              </div>
            ) : filteredWorkers.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-xs text-slate-600 font-medium">No s'han trobat treballadors/es</p>
              </div>
            ) : (
              filteredWorkers.map(worker => (
                <button
                  key={worker.id}
                  type="button"
                  onClick={() => {
                    onSelect(worker);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 hover:bg-brand-primary/15 transition-colors group",
                    selectedId === worker.id && "bg-brand-primary/5"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-all",
                      selectedId === worker.id 
                        ? "bg-brand-primary border-brand-primary text-white" 
                        : "bg-white/5 border-white/5 text-slate-400 group-hover:border-brand-primary/30"
                    )}>
                      {worker.fullName.charAt(0)}
                    </div>
                    <div className="text-left">
                      <p className={cn(
                        "text-xs font-bold transition-colors",
                        selectedId === worker.id ? "text-brand-primary" : "text-white group-hover:text-brand-primary"
                      )}>
                        {worker.fullName}
                      </p>
                      <p className="text-[10px] text-slate-500">{worker.email}</p>
                    </div>
                  </div>
                  {selectedId === worker.id && <Check size={14} className="text-brand-primary" />}
                </button>
              ))
            )}
          </div>
          
          <div className="p-3 bg-white/[0.01] border-t border-white/[0.05]">
            <button onClick={() => navigate('/admin')} className="w-full flex items-center justify-center gap-2 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest hover:text-white transition-colors">
              <UserPlus size={12} />
              <span>Gestionar Directori</span>
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-[10px] font-bold text-red-500 tracking-tight">{error}</p>}
    </div>
  );
}
