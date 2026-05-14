import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Save, 
  Send, 
  Info,
  AlertTriangle,
  HelpCircle,
  FileText,
  User as UserIcon,
  ShieldCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import { User, Worker, Attachment, AttachmentCategory, RequestStatus } from '../types';
import { CATEGORIES, AREAS } from '../constants';
import { MOCK_ANALYTIC_CODES, MOCK_CENTERS } from '../lib/mockData';
import WorkerSelector from '../components/WorkerSelector';
import FileUploader from '../components/FileUploader';
import AttachmentList from '../components/AttachmentList';
import { useRequests } from '../hooks/useRequests';

export default function NewRequest({ user }: { user: User }) {
  const navigate = useNavigate();
  const { addRequest } = useRequests();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [formData, setFormData] = useState({
    requestingTechnicianId: '',
    requestingTechnicianName: '',
    requestingTechnicianEmail: '',
    projectId: '',
    analyticCode: '',
    category: '',
    subcategory: '',
    destinationCenterId: '',
    destinationCenterName: '',
    itemDescription: '',
    justification: '',
    urgency: 'mitjana' as 'baixa' | 'mitjana' | 'alta' | 'critica',
    deadline: '',
    estimatedAmount: 0,
    requiresThreeQuotes: false
  });

  const handleWorkerSelect = (worker: Worker) => {
    setFormData({
      ...formData,
      requestingTechnicianId: worker.id,
      requestingTechnicianName: worker.fullName,
      requestingTechnicianEmail: worker.email
    });
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value) || 0;
    setFormData({
      ...formData,
      estimatedAmount: val,
      requiresThreeQuotes: val >= 5000
    });
  };

  const handleAttachmentUpload = (files: File[], category: AttachmentCategory) => {
    const newAttachments: Attachment[] = files.map(file => ({
      id: Math.random().toString(36).substring(7),
      purchaseRequestId: 'NEW',
      fileName: file.name,
      storagePath: `temp/${file.name}`,
      downloadURL: URL.createObjectURL(file), // Temporary URL for preview
      mimeType: file.type,
      size: file.size,
      category,
      uploadedByUserId: user.id,
      uploadedByUserName: user.name,
      createdAt: new Date().toISOString(),
      status: 'completed'
    }));
    setAttachments([...attachments, ...newAttachments]);
  };

  const handleDeleteAttachment = (id: string) => {
    setAttachments(attachments.filter(a => a.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.requestingTechnicianId) {
      toast.error('Siusplau, selecciona el tècnic sol·licitant');
      return;
    }
    if (!formData.projectId) {
      toast.error('Siusplau, selecciona un projecte');
      return;
    }
    if (!formData.analyticCode) {
      toast.error('Siusplau, selecciona un codi analític');
      return;
    }
    if (!formData.destinationCenterId) {
      toast.error('Siusplau, selecciona un centre de destí');
      return;
    }
    
    // Enviament real a Firestore
    toast.promise(
      addRequest({
        ...formData,
        createdByUserId: user.id,
        createdByUserName: user.name,
        createdByUserEmail: user.email,
        areaId: user.areaId,
        attachmentsCount: attachments.length,
        status: 'pendent_coordinacio'
      }),
      {
        loading: 'Enviant sol·licitud a Firestore...',
        success: 'Sol·licitud enviada correctament!',
        error: 'Error al enviar la sol·licitud',
      }
    ).then(() => {
      navigate('/compres');
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors font-black uppercase text-[10px] tracking-widest"
        >
          <ArrowLeft size={16} />
          <span>Tornar a la llista</span>
        </button>
      </div>

      <div className="space-y-4">
        <h2 className="text-4xl font-black text-white tracking-tighter">Nova Sol·licitud de Compra</h2>
        <p className="text-slate-500 font-bold text-sm tracking-tight leading-relaxed">Inicia un nou expedient per al subministrament de béns o contractació de serveis.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-10">
        
        {/* Bloc 0: Autoria i Responsabilitat */}
        <section className="card p-10 bg-brand-primary/[0.02] border-brand-primary/20 relative z-50 !overflow-visible">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-10 flex items-center gap-3">
            <div className="p-2 bg-brand-primary/10 rounded-lg text-brand-primary"><ShieldCheck size={18} /></div>
            Identificació de l'Expedient
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Introduïda per (Automàtic)</label>
              <div className="flex items-center gap-3 p-4 bg-white/5 border border-white/5 rounded-2xl">
                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-500">{user.name[0]}</div>
                <div>
                  <p className="text-xs font-bold text-slate-300">{user.name}</p>
                  <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">{user.email}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                Tècnic/a sol·licitant <span className="text-red-500">*</span>
              </label>
              <WorkerSelector 
                onSelect={handleWorkerSelect} 
                selectedId={formData.requestingTechnicianId} 
              />
            </div>
          </div>
        </section>

        {/* Bloc 1: Context del Projecte */}
        <section className="card p-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-brand-primary/5 blur-3xl -mr-24 -mt-24 rounded-full"></div>
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-10 flex items-center gap-3 relative z-10">
            <div className="p-2 bg-white/5 rounded-lg text-slate-500">1</div>
            Imputació Analítica i Destí
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Projecte <span className="text-red-500">*</span></label>
              <select 
                required
                className="input-field"
                value={formData.projectId}
                onChange={e => setFormData({...formData, projectId: e.target.value})}
              >
                <option value="">Selecciona projecte</option>
                <option value="SOC-01">Programes Socials Generals</option>
                <option value="REHAB-BCN">Rehabilitació BCN</option>
                <option value="EMERG-ACCES">Emergència Accés Habitatge</option>
              </select>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                Codi Analític <span className="text-red-500">*</span>
              </label>
              <select 
                required
                className="input-field font-black tracking-widest text-brand-primary"
                value={formData.analyticCode}
                onChange={e => setFormData({...formData, analyticCode: e.target.value})}
              >
                <option value="">Selecciona codi</option>
                {MOCK_ANALYTIC_CODES.map(ac => (
                  <option key={ac.id} value={ac.code}>{ac.code} - {ac.description}</option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                Centre de Destí <span className="text-red-500">*</span>
              </label>
              <select 
                required
                className="input-field"
                value={formData.destinationCenterId}
                onChange={e => {
                  const center = MOCK_CENTERS.find(c => c.id === e.target.value);
                  setFormData({
                    ...formData, 
                    destinationCenterId: e.target.value,
                    destinationCenterName: center?.name || ''
                  });
                }}
              >
                <option value="">Selecciona centre</option>
                {MOCK_CENTERS.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Bloc 2: Detalls de la Compra */}
        <section className="card p-10 relative overflow-hidden">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-10 flex items-center gap-3 relative z-10">
            <div className="p-2 bg-white/5 rounded-lg text-slate-500">2</div>
            Descripció del Bé o Servei
          </h3>
          
          <div className="space-y-10 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Categoria</label>
                <select 
                  required
                  className="input-field font-bold"
                  value={formData.category}
                  onChange={e => setFormData({...formData, category: e.target.value})}
                >
                  <option value="">Selecciona categoria</option>
                  {CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Subcategoria</label>
                <input 
                  type="text" 
                  placeholder="Específica subcategoria..." 
                  className="input-field" 
                  value={formData.subcategory}
                  onChange={e => setFormData({...formData, subcategory: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Concepte detallat <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                required
                placeholder="Què s'ha de comprar exactament?" 
                className="input-field font-bold" 
                value={formData.itemDescription}
                onChange={e => setFormData({...formData, itemDescription: e.target.value})}
              />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Justificació de la despesa <span className="text-red-500">*</span></label>
              <textarea 
                required
                rows={3} 
                placeholder="Explica la necessitat d'aquesta sol·licitud per a l'entitat o projecte." 
                className="input-field resize-none italic"
                value={formData.justification}
                onChange={e => setFormData({...formData, justification: e.target.value})}
              />
            </div>
          </div>
        </section>

        {/* Bloc 3: Documents adjunts */}
        <section className="card p-10 relative overflow-hidden">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-10 flex items-center gap-3 relative z-10">
            <div className="p-2 bg-white/5 rounded-lg text-slate-500"><FileText size={18} /></div>
            Documents Adjunts
          </h3>
          
          <div className="space-y-8 relative z-10">
            <FileUploader 
              onUpload={handleAttachmentUpload}
              maxSizeMB={10} 
            />
            
            <div className="pt-8 border-t border-white/[0.05]">
              <AttachmentList 
                attachments={attachments} 
                onDelete={handleDeleteAttachment}
              />
            </div>
          </div>
        </section>

        {/* Bloc 4: Pressupost i Terminis */}
        <section className="card p-10 bg-brand-primary/[0.01]">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-10 flex items-center gap-3">
            <div className="p-2 bg-white/5 rounded-lg text-slate-500">4</div>
            Validació Econòmica
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Import Estimat (€) <span className="text-red-500">*</span></label>
              <input 
                type="number" 
                required
                placeholder="0.00" 
                className="input-field font-black text-4xl text-white py-6 bg-white/[0.02] border-brand-primary/20" 
                onChange={handleAmountChange}
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Prioritat de compra</label>
              <select 
                className="input-field font-bold"
                value={formData.urgency}
                onChange={e => setFormData({...formData, urgency: e.target.value as 'baixa' | 'mitjana' | 'alta' | 'critica'})}
              >
                <option value="baixa">Baixa</option>
                <option value="mitjana">Mitjana (Estàndard)</option>
                <option value="alta">Alta</option>
                <option value="critica">Crítica (Interrupció servei)</option>
              </select>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Termini desitjat</label>
              <input 
                type="date" 
                className="input-field [color-scheme:dark] font-bold" 
                value={formData.deadline}
                onChange={e => setFormData({...formData, deadline: e.target.value})}
              />
            </div>
          </div>

          {/* Avís dinàmic de 3 pressupostos */}
          {formData.requiresThreeQuotes && (
            <div className="mt-12 p-10 bg-amber-500/[0.02] border border-amber-500/20 rounded-3xl flex gap-8 animate-in zoom-in-95 duration-700">
              <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 shrink-0 shadow-[0_0_20px_rgba(245,158,11,0.1)]">
                <AlertTriangle size={32} />
              </div>
              <div className="space-y-3">
                <h4 className="font-black text-amber-500 uppercase tracking-[0.2em] text-xs">Regla de Govern: Compliance de Compres</h4>
                <p className="text-sm text-slate-400 leading-relaxed font-bold">
                  Com que l'import estimat és ≥ <strong className="text-amber-500 text-lg">5.000 €</strong>, la normativa de Som Llar exigeix la càrrega de <span className="text-white underline decoration-amber-500/50 underline-offset-4">3 pressupostos diferents</span> per a la validació final de l'expedient.
                </p>
              </div>
            </div>
          )}
        </section>
      </form>

      <div className="p-8 bg-brand-primary/[0.03] border border-brand-primary/10 rounded-3xl flex items-center gap-6 text-[11px] font-bold text-slate-500 uppercase tracking-[0.1em] relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-1 h-full bg-brand-primary"></div>
        <div className="p-3 bg-brand-primary/10 rounded-2xl text-brand-primary group-hover:scale-110 transition-transform duration-500">
          <Info size={20} />
        </div>
        <p className="leading-relaxed">En fer clic a <span className="text-white border-b border-brand-primary pb-0.5">Enviar per aprovar</span> l'expedient entrarà en el flux automatitzat de signatures basat en la matriu de competències d'aprovació.</p>
      </div>

      <div className="flex items-center justify-end gap-3 pt-6">
        <button type="button" onClick={() => toast.success('Esborrany desat correctament')} className="btn-secondary flex items-center gap-2 text-xs py-3 px-8 font-black uppercase tracking-widest">
          <Save size={18} />
          <span>Desar esborrany</span>
        </button>
        <button type="button" onClick={handleSubmit} className="btn-primary flex items-center gap-2 text-xs py-3 px-8 font-black uppercase tracking-widest shadow-xl shadow-brand-primary/20">
          <Send size={18} />
          <span>Enviar per aprovar</span>
        </button>
      </div>
    </div>
  );
}
