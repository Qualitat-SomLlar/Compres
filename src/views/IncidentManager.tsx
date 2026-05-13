import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Search, 
  Filter, 
  ArrowRight,
  ShieldAlert,
  Ghost,
  Lock,
  FileWarning,
  X,
  CheckCircle,
  MessageSquare
} from 'lucide-react';
import toast from 'react-hot-toast';

const INCIDENTS = [
  { id: 'INC-001', type: 'Manca de Codi Analític', description: 'Compra enviada sense imputació analítica vàlida.', request: 'PR-2024-001', area: 'Social', severity: 'alta' },
  { id: 'INC-002', type: 'Fraccionament sospitós', description: 'Detecció de múltiples compres de baix import al mateix proveïdor el mateix dia.', request: 'PR-2024-008', area: 'Administració', severity: 'critica' },
  { id: 'INC-003', type: 'Fora de circuit', description: 'Factura rebuda sense sol·licitud prèvia al sistema.', request: 'N/A', area: 'Logística', severity: 'mitjana' },
];

export default function IncidentManager() {
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null);

  const handleResolve = () => {
    toast.success("Incidència resolta correctament");
    setSelectedIncident(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-white flex items-center gap-3">
            <AlertTriangle className="text-red-500" size={32} /> Control d'Incidències
          </h2>
          <p className="text-sm text-slate-400 mt-2">Monitoratge preventiu i correctiu de riscos operatius i de governança.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="card p-8 bg-gradient-to-br from-red-600/20 to-red-900/40 border-red-500/20 relative overflow-hidden col-span-1">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 blur-3xl -mr-16 -mt-16 rounded-full"></div>
          <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-2 relative z-10">Alertes Crítiques</p>
          <h3 className="text-6xl font-black text-white mb-6 relative z-10">03</h3>
          <div className="flex items-center gap-2 text-[10px] font-bold text-red-200 bg-red-500/20 p-3 rounded-xl border border-red-500/20 relative z-10">
            <ShieldAlert size={14} className="shrink-0" />
            <span>S'ha notificat automàticament a Gerència</span>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-6">
          {INCIDENTS.map((incident) => (
            <div key={incident.id} className="card p-6 flex items-center gap-8 hover:bg-white/[0.03] transition-all duration-300 border-l-4 border-l-red-500">
              <div className={`p-5 rounded-2xl ${incident.severity === 'critica' ? 'bg-red-500/10 text-red-500' : 'bg-orange-500/10 text-orange-500 shadow-lg shadow-orange-500/5'}`}>
                <FileWarning size={32} />
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-white/10 text-slate-300 uppercase tracking-widest">{incident.id}</span>
                  <h4 className="text-lg font-black text-white tracking-tight">{incident.type}</h4>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed mb-4">{incident.description}</p>
                <div className="flex items-center gap-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  <span className="flex items-center gap-1.5"><Lock size={12} /> Expedient: {incident.request}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-white/5"></span>
                  <span>Àrea: {incident.area}</span>
                </div>
              </div>

              <div className="text-right">
                <button 
                  onClick={() => setSelectedIncident(incident)}
                  className="btn-secondary text-[10px] font-black flex items-center gap-2 py-2 px-4 whitespace-nowrap"
                >
                  GESTIONAR <ArrowRight size={14} />
                </button>
              </div>
            </div>
          ))}

          {INCIDENTS.length === 0 && (
            <div className="p-20 text-center card bg-emerald-500/[0.02] border-emerald-500/10">
               <Ghost className="mx-auto text-emerald-500/20 mb-6" size={64} />
               <p className="text-emerald-500 font-black text-xl mb-2 uppercase tracking-tight">SENSE INCIDÈNCIES!</p>
               <p className="text-slate-500 text-sm max-w-xs mx-auto">Tot el procés de compra està sota control i governança segons el manual de procediment.</p>
            </div>
          )}
        </div>
      </div>
      </div>

      {selectedIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#151c2c] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-white/5">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <FileWarning size={20} className={selectedIncident.severity === 'critica' ? 'text-red-500' : 'text-orange-500'} />
                Gestió d'Incidència
              </h3>
              <button onClick={() => setSelectedIncident(null)} className="p-2 hover:bg-white/5 rounded-lg text-slate-400">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-white/10 text-slate-300 uppercase tracking-widest">{selectedIncident.id}</span>
                    <h4 className="text-2xl font-black text-white">{selectedIncident.type}</h4>
                  </div>
                  <p className="text-sm text-slate-400 mt-2">{selectedIncident.description}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 bg-white/[0.02] rounded-xl border border-white/5">
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Expedient Afectat</p>
                  <p className="text-sm font-bold text-brand-primary cursor-pointer hover:underline">{selectedIncident.request}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Àrea de Negoci</p>
                  <p className="text-sm font-bold text-white">{selectedIncident.area}</p>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Afegeix un comentari a la resolució</label>
                <textarea 
                  className="input-field w-full h-24 resize-none" 
                  placeholder="Explica com s'ha solucionat aquesta incidència o quines accions s'han pres..."
                ></textarea>
              </div>

              <div className="pt-6 border-t border-white/5 flex justify-end gap-3">
                <button type="button" onClick={() => setSelectedIncident(null)} className="btn-secondary px-6 py-2.5 text-xs font-bold uppercase tracking-widest">Tancar</button>
                <button type="button" onClick={handleResolve} className="btn-primary flex items-center gap-2 px-6 py-2.5 text-xs font-bold uppercase tracking-widest bg-emerald-500 hover:bg-emerald-600 border-emerald-500/50 shadow-emerald-500/20">
                  <CheckCircle size={16}/> Resoldre Incidència
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
