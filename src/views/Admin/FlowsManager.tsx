import { CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '../../lib/utils';

export function FlowsManager() {
  const steps = [
    { id: 1, name: 'Sol·licitant', role: 'tecnic', action: 'Genera Demanda', required: true },
    { id: 2, name: 'Coordinació', role: 'coordinacio', action: 'Primera Aprovació', required: true },
    { id: 3, name: 'Direcció d\'Àrea', role: 'direccio_area', action: 'Validació Pressupostària', required: true },
    { id: 4, name: 'Administració i Finances', role: 'finances', action: 'Tramitació i Autorització', required: true },
    { id: 5, name: 'Recepció', role: 'recepcio_verificacio', action: 'Verificació i Albarà', required: false },
    { id: 6, name: 'Comptabilitat', role: 'comptabilitat', action: 'Validació Factura', required: true },
  ];

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Configuració del Flux d'Aprovació Estàndard</h3>
        <button onClick={() => toast("Flux restablert als valors per defecte", { icon: '🔄' })} className="btn-secondary text-[10px] font-black uppercase tracking-widest py-2">
          Restablir Flux
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {steps.map((step, idx) => (
          <div key={step.id} className="p-6 bg-white/[0.01] border border-white/5 rounded-2xl relative">
            <div className="absolute top-4 right-4 text-[40px] font-black text-white/5 pointer-events-none">{step.id}</div>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-primary/10 rounded-xl text-brand-primary">
                  <CheckCircle size={16} />
                </div>
                <p className="text-xs font-black text-white uppercase tracking-widest">{step.name}</p>
              </div>
              <p className="text-[10px] text-slate-500 font-medium">{step.action}</p>
              <div className="pt-4 flex items-center justify-between border-t border-white/[0.02]">
                <span className={cn(
                  "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded",
                  step.required ? "bg-emerald-500/10 text-emerald-500" : "bg-white/5 text-slate-500"
                )}>
                  {step.required ? 'Obligatori' : 'Opcional'}
                </span>
                <button onClick={() => toast("Configuració de passos en desenvolupament", { icon: '⚙️' })} className="text-[10px] font-bold text-brand-primary hover:underline">Configurar</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
