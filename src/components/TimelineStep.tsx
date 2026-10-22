import { cn } from '../lib/utils';

interface TimelineStepProps {
  title: string;
  status: 'pending' | 'completed' | 'error';
  role: string;
  date?: string;
  active?: boolean;
}

export const TimelineStep = ({ title, status, role, date, active }: TimelineStepProps) => {
  return (
    <div className="relative pl-10 group">
      <div className={cn(
        "absolute left-[-6px] top-1.5 w-3 h-3 rounded-full border-2 transition-all duration-500",
        status === 'completed' ? "bg-brand-primary border-brand-primary shadow-[0_0_15px_rgba(59,130,246,0.6)]" :
        active ? "bg-[#0b0f19] border-brand-primary animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.3)]" : "bg-[#0b0f19] border-slate-800"
      )}></div>
      <div className={cn("transition-opacity py-1", !active && status !== 'completed' ? "opacity-40" : "opacity-100")}>
        <p className="text-[10px] font-black text-white uppercase tracking-widest truncate">{title}</p>
        <p className="text-[9px] text-slate-500 font-bold tracking-tight mt-1">{role}</p>
        {date && <p className="text-[8px] text-brand-primary/60 font-black mt-1.5 italic">{date}</p>}
      </div>
    </div>
  );
};
