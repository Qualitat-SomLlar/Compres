import React, { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

interface CustomSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
}

export default function CustomSelect({ options, value, onChange, placeholder = "Selecciona...", error }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(o => o.value === value);

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
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between input-field text-left transition-all",
          isOpen && "border-brand-primary shadow-sm shadow-brand-primary/10",
          error && "border-red-500"
        )}
      >
        {selectedOption ? (
          <div>
            <p className="text-xs font-bold text-white">{selectedOption.label}</p>
            {selectedOption.description && (
              <p className="text-[9px] text-slate-500 uppercase tracking-tight">{selectedOption.description}</p>
            )}
          </div>
        ) : (
          <span className="text-xs text-slate-600 font-medium italic">{placeholder}</span>
        )}
        <ChevronDown size={14} className={cn("text-slate-500 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-[#151c2c] border border-white/10 rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="max-h-60 overflow-y-auto py-2">
            {options.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-xs text-slate-600 font-medium">No hi ha opcions</p>
              </div>
            ) : (
              options.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 hover:bg-brand-primary/15 transition-colors group",
                    value === option.value && "bg-brand-primary/5"
                  )}
                >
                  <div className="text-left">
                    <p className={cn(
                      "text-xs font-bold transition-colors",
                      value === option.value ? "text-brand-primary" : "text-white group-hover:text-brand-primary"
                    )}>
                      {option.label}
                    </p>
                    {option.description && (
                      <p className="text-[10px] text-slate-500 mt-0.5">{option.description}</p>
                    )}
                  </div>
                  {value === option.value && <Check size={14} className="text-brand-primary shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
