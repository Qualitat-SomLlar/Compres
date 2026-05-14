import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';

interface CustomDatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function CustomDatePicker({ value, onChange, placeholder = "dd/mm/aaaa" }: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      setCurrentMonth(new Date(value));
    }
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  // Adjust so Monday is 0, Sunday is 6
  const startDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const monthNames = ["Gener", "Febrer", "Març", "Abril", "Maig", "Juny", "Juliol", "Agost", "Setembre", "Octubre", "Novembre", "Desembre"];
  const dayNames = ["dl", "dt", "dc", "dj", "dv", "ds", "dg"];

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleDateSelect = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    // Format to YYYY-MM-DD
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    onChange(`${yyyy}-${mm}-${dd}`);
    setIsOpen(false);
  };

  const displayValue = value ? (() => {
    const [y, m, d] = value.split('-');
    return `${d}/${m}/${y}`;
  })() : '';

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between input-field text-left transition-all",
          isOpen && "border-brand-primary shadow-sm shadow-brand-primary/10"
        )}
      >
        {displayValue ? (
          <span className="text-white">{displayValue}</span>
        ) : (
          <span className="text-slate-600 font-medium italic">{placeholder}</span>
        )}
        <CalendarIcon size={16} className={isOpen ? "text-brand-primary" : "text-slate-500"} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full sm:w-72 mt-2 bg-[#151c2c] border border-white/10 rounded-lg shadow-2xl p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between mb-4">
            <button type="button" onClick={handlePrevMonth} className="p-1 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors">
              <ChevronLeft size={16} />
            </button>
            <div className="text-xs font-black text-white uppercase tracking-widest">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </div>
            <button type="button" onClick={handleNextMonth} className="p-1 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map(day => (
              <div key={day} className="text-[9px] font-black text-slate-500 uppercase tracking-widest text-center py-1">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: startDay }).map((_, i) => (
              <div key={`empty-${i}`} className="h-8" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isSelected = value === dateStr;
              
              // Only highlight today if nothing is selected or if we want to show today always
              const today = new Date();
              const isToday = today.getFullYear() === currentMonth.getFullYear() && 
                              today.getMonth() === currentMonth.getMonth() && 
                              today.getDate() === day;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleDateSelect(day)}
                  className={cn(
                    "h-8 flex items-center justify-center text-xs font-bold rounded-lg transition-all",
                    isSelected 
                      ? "bg-brand-primary text-white" 
                      : isToday 
                        ? "text-brand-primary border border-brand-primary/30 bg-brand-primary/5 hover:bg-brand-primary/10" 
                        : "text-slate-300 hover:bg-white/5"
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
