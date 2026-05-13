import React, { useState } from 'react';
import { 
  Users, 
  GitMerge, 
  Bell, 
  Upload, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  Download, 
  CheckCircle,
  AlertCircle,
  FileSpreadsheet,
  X,
  Save
} from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '../../lib/utils';
import { MOCK_WORKERS, MOCK_CENTERS, MOCK_ANALYTIC_CODES, MOCK_NOTIFICATION_SETTINGS } from '../../lib/mockData';
import { ROLE_LABELS, ATTACHMENT_CATEGORIES, NOTIFICATION_EVENTS, AREAS } from '../../constants';
import { importExportService } from '../../services/importExportService';

type AdminTab = 'workers' | 'flows' | 'notifications' | 'imports';

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<AdminTab>('workers');
  const [searchTerm, setSearchTerm] = useState('');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'workers':
        return <WorkersManager searchTerm={searchTerm} />;
      case 'flows':
        return <FlowsManager />;
      case 'notifications':
        return <NotificationsManager />;
      case 'imports':
        return <ImportsManager />;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tighter">Administració del Sistema</h2>
          <p className="text-slate-500 font-medium">Gestiona els treballadors, el flux d'aprovació i la configuració del sistema.</p>
        </div>
        
        <div className="flex items-center gap-2 p-1 bg-white/[0.02] border border-white/[0.05] rounded-2xl">
          <TabButton 
            active={activeTab === 'workers'} 
            onClick={() => setActiveTab('workers')} 
            icon={<Users size={16} />}
            label="Treballadors/es"
          />
          <TabButton 
            active={activeTab === 'flows'} 
            onClick={() => setActiveTab('flows')} 
            icon={<GitMerge size={16} />}
            label="Fluxos"
          />
          <TabButton 
            active={activeTab === 'notifications'} 
            onClick={() => setActiveTab('notifications')} 
            icon={<Bell size={16} />}
            label="Notificacions"
          />
          <TabButton 
            active={activeTab === 'imports'} 
            onClick={() => setActiveTab('imports')} 
            icon={<FileSpreadsheet size={16} />}
            label="Imports"
          />
        </div>
      </div>

      <div className="card">
        {renderTabContent()}
      </div>
    </div>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function TabButton({ active, onClick, icon, label }: TabButtonProps) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
        active ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/20" : "text-slate-500 hover:text-slate-300"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function WorkersManager({ searchTerm }: { searchTerm: string }) {
  const [isWorkerModalOpen, setIsWorkerModalOpen] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<any | null>(null);

  const filteredWorkers = MOCK_WORKERS.filter(w => 
    w.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input 
            type="text" 
            placeholder="Cerca treballador..." 
            className="input-field pl-10 w-64 text-xs"
          />
        </div>
        <button 
          onClick={() => { setSelectedWorker(null); setIsWorkerModalOpen(true); }}
          className="btn-primary flex items-center gap-2 text-xs font-black uppercase tracking-widest py-3"
        >
          <Plus size={16} />
          <span>Nou Treballador/a</span>
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/[0.05]">
              <th className="pb-4">Nom i Correu</th>
              <th className="pb-4">Àrea / Rol Intern</th>
              <th className="pb-4">Rol Flux</th>
              <th className="pb-4 text-center">Estat</th>
              <th className="pb-4 text-right">Accions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.02]">
            {filteredWorkers.map(worker => (
              <tr key={worker.id} className="group">
                <td className="py-4">
                  <div className="text-xs font-bold text-white">{worker.fullName}</div>
                  <div className="text-[10px] text-slate-500">{worker.email}</div>
                </td>
                <td className="py-4">
                  <div className="text-xs text-slate-300 uppercase tracking-tighter">{worker.area}</div>
                  <div className="text-[10px] text-slate-500">{worker.internalRole}</div>
                </td>
                <td className="py-4">
                  <span className="text-[10px] font-black text-brand-primary uppercase tracking-widest">
                    {ROLE_LABELS[worker.approvalFlowRole]}
                  </span>
                </td>
                <td className="py-4 text-center">
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[9px] font-black tracking-widest uppercase",
                    worker.active ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                  )}>
                    {worker.active ? 'Actiu' : 'Inactiu'}
                  </span>
                </td>
                <td className="py-4 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => { setSelectedWorker(worker); setIsWorkerModalOpen(true); }}
                      className="p-2 hover:bg-white/5 rounded-lg text-slate-500 hover:text-brand-primary"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      onClick={() => toast.success("Treballador/a eliminat correctament")}
                      className="p-2 hover:bg-white/5 rounded-lg text-slate-500 hover:text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isWorkerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#151c2c] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-white/5">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                {selectedWorker ? <Edit2 size={24} className="text-brand-primary"/> : <Plus size={24} className="text-brand-primary"/>}
                {selectedWorker ? "Edita Treballador/a" : "Nou Treballador/a"}
              </h3>
              <button onClick={() => setIsWorkerModalOpen(false)} className="p-2 hover:bg-white/5 rounded-lg text-slate-400">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); toast.success("Dades desades correctament"); setIsWorkerModalOpen(false); }} className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Nom complet <span className="text-red-500">*</span></label>
                  <input type="text" required className="input-field w-full" defaultValue={selectedWorker?.fullName || ''} placeholder="Ex: Maria Garcia" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Correu electrònic <span className="text-red-500">*</span></label>
                  <input type="email" required className="input-field w-full" defaultValue={selectedWorker?.email || ''} placeholder="Ex: mgarcia@somllar.org" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Àrea</label>
                  <select className="input-field w-full" defaultValue={selectedWorker?.area || ''}>
                    {AREAS.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Rol al Flux</label>
                  <select className="input-field w-full" defaultValue={selectedWorker?.approvalFlowRole || 'tecnic'}>
                    {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div className="pt-6 border-t border-white/5 flex justify-end gap-3">
                <button type="button" onClick={() => setIsWorkerModalOpen(false)} className="btn-secondary px-6 py-2.5 text-xs font-bold uppercase tracking-widest">Cancel·lar</button>
                <button type="submit" className="btn-primary flex items-center gap-2 px-6 py-2.5 text-xs font-bold uppercase tracking-widest"><Save size={16}/> Desar Dades</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function FlowsManager() {
  const steps = [
    { id: 1, name: 'Tècnic/a', role: 'tecnic', action: 'Genera Demanda', required: true },
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

function NotificationsManager() {
  const events = NOTIFICATION_EVENTS;

  return (
    <div className="p-8 space-y-8">
      <div>
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Esdeveniments i Altes de Correu</h3>
        <p className="text-xs text-slate-600">Activa quins esdeveniments del sistema generen un correu automàtic via Microsoft Outlook.</p>
      </div>

      <div className="space-y-4 max-w-2xl">
        {events.map(event => (
          <div key={event.id} className="flex items-center justify-between p-4 bg-white/[0.01] border border-white/5 rounded-2xl hover:bg-white/[0.02] transition-all group">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-white/5 rounded-xl text-slate-500 group-hover:text-brand-primary transition-colors">
                <Bell size={16} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-300">{event.name}</p>
                <p className="text-[10px] text-slate-600 uppercase tracking-widest mt-1">Grup: Flux de Compres</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-primary peer-checked:after:bg-white"></div>
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}

function ImportsManager() {
  const entities = [
    { id: 'supplier', name: 'Proveïdors', icon: <Users size={18} /> },
    { id: 'worker', name: 'Treballadors/es', icon: <Users size={18} /> },
    { id: 'center', name: 'Centres de Destí', icon: <CheckCircle size={18} /> },
    { id: 'analyticCode', name: 'Codis Analítics', icon: <CheckCircle size={18} /> },
  ];

  const handleDownloadTemplate = (id: string) => {
    importExportService.downloadTemplate(id);
  };

  return (
    <div className="p-8 space-y-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Importació Massiva i Plantilles</h3>
            <p className="text-xs text-slate-600 font-medium">Descarrega les plantilles oficials, omple-les amb dades reals i puja-les per actualitzar el sistema.</p>
          </div>

          <div className="space-y-3">
            {entities.map(entity => (
              <div key={entity.id} className="flex items-center justify-between p-4 bg-[#0b0f19] border border-white/5 rounded-2xl group hover:border-brand-primary/50 transition-all">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/5 rounded-xl text-slate-500 group-hover:text-brand-primary">
                    {entity.icon}
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest text-slate-300">{entity.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleDownloadTemplate(entity.id)}
                    className="p-2 text-slate-500 hover:text-brand-primary transition-colors flex items-center gap-2"
                    title="Descarrega Plantilla"
                  >
                    <Download size={16} />
                    <span className="text-[9px] font-black uppercase tracking-tighter">Plantilla</span>
                  </button>
                  <label className="cursor-pointer p-2 bg-brand-primary/10 text-brand-primary hover:bg-brand-primary hover:text-white rounded-xl transition-all">
                    <Upload size={16} />
                    <input type="file" className="hidden" onChange={() => alert('Processant fitxer...')} />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-8 bg-brand-primary/[0.02] border border-brand-primary/10 rounded-3xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-primary/10 rounded-xl text-brand-primary">
              <AlertCircle size={18} />
            </div>
            <h4 className="text-xs font-black text-white uppercase tracking-widest">Guia d'Importació</h4>
          </div>
          <ul className="space-y-4">
            <li className="flex gap-3 text-xs text-slate-400 leading-relaxed">
              <div className="shrink-0 w-5 h-5 bg-white/5 rounded-full flex items-center justify-center text-[10px] font-bold">1</div>
              <span>Descarrega la plantilla específica per a l'entitat que vols carregar.</span>
            </li>
            <li className="flex gap-3 text-xs text-slate-400 leading-relaxed">
              <div className="shrink-0 w-5 h-5 bg-white/5 rounded-full flex items-center justify-center text-[10px] font-bold">2</div>
              <span>Omple les files respectant les capçaleres i el format de cada columna.</span>
            </li>
            <li className="flex gap-3 text-xs text-slate-400 leading-relaxed">
              <div className="shrink-0 w-5 h-5 bg-white/5 rounded-full flex items-center justify-center text-[10px] font-bold">3</div>
              <span>Puja el fitxer. El sistema validarà l'estructura abans d'escriure a la base de dades.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
