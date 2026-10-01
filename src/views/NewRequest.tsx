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
  ShieldCheck,
  Plus,
  Building2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { User, Attachment, AttachmentCategory, RequestStatus, PurchaseRequest } from '../types';
import { CATEGORIES, normalizeAreaId } from '../constants';
import UserSelector from '../components/UserSelector';
import CustomSelect from '../components/CustomSelect';
import CustomDatePicker from '../components/CustomDatePicker';
import FileUploader from '../components/FileUploader';
import AttachmentList from '../components/AttachmentList';
import { useRequests } from '../hooks/useRequests';
import { useAreas } from '../hooks/useAreas';
import { useNotifications } from '../hooks/useNotifications';
import { useUsers } from '../hooks/useUsers';
import { useAnalyticCodes } from '../hooks/useAnalyticCodes';
import { useCenters } from '../hooks/useCenters';
import { useProjects } from '../hooks/useProjects';
import { useEmailDispatcher } from '../hooks/useEmailDispatcher';
import { emailService } from '../services/emailService';
import { fileService } from '../services/fileService';

export default function NewRequest({ user }: { user: User }) {
  const navigate = useNavigate();
  const { addRequest } = useRequests();
  const { getAreaName } = useAreas();
  const { addNotification } = useNotifications();
  const { dispatchEmail } = useEmailDispatcher();
  const { getUsersByRole } = useUsers();
  const { analyticCodes } = useAnalyticCodes();
  const { centers } = useCenters();
  const { projects } = useProjects();
  const { updateRequest } = useRequests();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [filesQueue, setFilesQueue] = useState<{ file: File, category: AttachmentCategory, id: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    requiresThreeQuotes: false,
    areaId: user.areaId || ''
  });

  const handleWorkerSelect = (worker: User) => {
    setFormData(prev => ({
      ...prev,
      requestingTechnicianId: worker.id,
      requestingTechnicianName: worker.name,
      requestingTechnicianEmail: worker.email,
      areaId: normalizeAreaId(worker.areaId || prev.areaId)
    }));
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
    const newQueueItems = files.map(file => {
      const id = Math.random().toString(36).substring(7);
      return { file, category, id };
    });

    const newAttachments: Attachment[] = newQueueItems.map(({ file, category, id }) => ({
      id,
      purchaseRequestId: 'NEW',
      fileName: file.name,
      storagePath: `temp/${file.name}`,
      downloadURL: URL.createObjectURL(file), // Preview local
      mimeType: file.type || 'application/octet-stream',
      size: file.size,
      category,
      uploadedByUserId: user.id,
      uploadedByUserName: user.name,
      createdAt: new Date().toISOString(),
      status: 'completed'
    }));

    setFilesQueue(prev => [...prev, ...newQueueItems]);
    setAttachments(prev => [...prev, ...newAttachments]);
  };

  const handleDeleteAttachment = (id: string) => {
    setFilesQueue(prev => prev.filter(f => f.id !== id));
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const saveRequest = async (targetStatus: 'pendent_coordinacio' | 'esborrany') => {
    if (targetStatus === 'pendent_coordinacio') {
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
      if (!formData.itemDescription.trim()) {
        toast.error('Siusplau, indica la descripció del bé o servei');
        return;
      }
    } else {
      // Per a esborranys només demanem una descripció mínima
      if (!formData.itemDescription.trim() && !formData.requestingTechnicianName) {
        toast.error('Indica almenys una breu descripció o el tècnic per guardar com a esborrany');
        return;
      }
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading(targetStatus === 'esborrany' ? 'Desant esborrany...' : 'Tramitant expedient...');

    try {
      // Determinar l'àrea d'imputació (prioritat: treballador triat -> centre -> codi analític -> usuari)
      const selectedCenter = centers.find(c => c.id === formData.destinationCenterId);
      const selectedAnalytic = analyticCodes.find(ac => ac.code === formData.analyticCode);
      const requestAreaId = normalizeAreaId(formData.areaId || selectedCenter?.area || selectedAnalytic?.area || user.areaId || 'social');

      // 1. Crear el document a Firestore
      const newRequest = await addRequest({
        ...formData,
        itemDescription: formData.itemDescription || 'Sense descripció (Esborrany)',
        justification: formData.justification || 'Pendent de justificació',
        deadline: formData.deadline || new Date().toISOString().split('T')[0],
        createdByUserId: user.id,
        createdByUserName: user.name,
        createdByUserEmail: user.email,
        areaId: requestAreaId,
        attachmentsCount: filesQueue.length,
        status: targetStatus
      });

      // 2. Pujada real dels fitxers a Firebase Storage i registre a Firestore
      if (filesQueue.length > 0) {
        const uploadPromises = filesQueue.map(item => 
          fileService.uploadFile(item.file, newRequest.id, item.category, user.id, user.name)
        );
        const uploadedAttachments = await Promise.all(uploadPromises);
        await updateRequest(newRequest.id, { attachmentsCount: uploadedAttachments.length });
      }

      // 3. Notificacions (només si s'envia a aprovació)
      if (targetStatus === 'pendent_coordinacio') {
        const targetUsers = getUsersByRole('coordinacio', requestAreaId);
        for (const targetUser of targetUsers) {
          await addNotification({
            userId: targetUser.id,
            title: `Nova sol·licitud: ${newRequest.code || newRequest.id}`,
            message: `${user.name} ha creat una nova sol·licitud de ${newRequest.estimatedAmount}€.`,
            type: 'info',
            requestId: newRequest.id
          });
        }
        await dispatchEmail('solicitud_creada', newRequest, { actorName: user.name, actorRole: user.role });
        toast.success(`Sol·licitud ${newRequest.code || newRequest.id} enviada correctament!`, { id: loadingToast });
      } else {
        toast.success(`Esborrany ${newRequest.code || newRequest.id} desat correctament!`, { id: loadingToast });
      }

      navigate('/compres');
    } catch (error) {
      console.error(error);
      toast.error('Error al tramitar la sol·licitud', { id: loadingToast });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveRequest('pendent_coordinacio');
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
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-brand-primary/10 rounded-xl text-brand-primary">
            <Plus size={20} />
          </div>
          <h2 className="text-3xl font-black text-white tracking-tighter">Nova Sol·licitud de Compra</h2>
        </div>
        <p className="text-sm text-slate-500 font-medium max-w-xl">Inicia un nou expedient per al subministrament de béns o contractació de serveis.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-10">
        
        {/* Bloc 0: Autoria i Responsabilitat */}
        <section className="card p-10 bg-brand-primary/[0.02] border-brand-primary/20 relative z-30 !overflow-visible">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-10 flex items-center gap-3">
            <div className="p-2 bg-brand-primary/10 rounded-lg text-brand-primary"><ShieldCheck size={18} /></div>
            Identificació de l'Expedient
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Introduïda per (Automàtic)</label>
              <div className="flex items-center gap-3 p-4 bg-white/5 border border-white/5 rounded-2xl">
                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-500">{(user?.name || 'U')[0]}</div>
                <div>
                  <p className="text-xs font-bold text-slate-300">{user?.name || 'Usuari Som Llar'}</p>
                  <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">{user?.email}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                Tècnic/a sol·licitant <span className="text-red-500">*</span>
              </label>
              <UserSelector 
                onSelect={handleWorkerSelect} 
                selectedId={formData.requestingTechnicianId} 
              />
              {formData.requestingTechnicianName && (
                <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-xl bg-white/[0.02] border border-white/5 text-[10px] text-slate-400">
                  <Building2 size={12} className="text-brand-primary shrink-0" />
                  <span>Àrea d'adscripció: <strong className="text-white">{getAreaName(formData.areaId)}</strong></span>
                  <span className="text-slate-600">•</span>
                  <span className="text-slate-400">Circuit assignat a la Coordinació (N2) i Direcció (N3) de <strong className="text-white">{getAreaName(formData.areaId)}</strong></span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Bloc 1: Context del Projecte */}
        <section className="card p-10 relative z-20 !overflow-visible">
          <div className="absolute top-0 right-0 w-48 h-48 bg-brand-primary/5 blur-3xl -mr-24 -mt-24 rounded-full"></div>
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-10 flex items-center gap-3 relative z-10">
            <div className="p-2 bg-white/5 rounded-lg text-slate-500">1</div>
            Imputació Analítica i Destí
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Projecte <span className="text-red-500">*</span></label>
              <CustomSelect
                placeholder="Selecciona projecte"
                value={formData.projectId}
                onChange={v => setFormData({...formData, projectId: v})}
                options={(projects || []).map(p => ({
                  value: p.code,
                  label: p.code,
                  description: p.name
                }))}
              />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                Codi Analític <span className="text-red-500">*</span>
              </label>
              <CustomSelect
                placeholder="Selecciona codi"
                value={formData.analyticCode}
                onChange={v => setFormData({...formData, analyticCode: v})}
                options={(analyticCodes || []).map(ac => ({
                  value: ac.code,
                  label: ac.code,
                  description: ac.description
                }))}
              />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                Centre de Destí <span className="text-red-500">*</span>
              </label>
              <CustomSelect
                placeholder="Selecciona centre"
                value={formData.destinationCenterId}
                onChange={v => {
                  const center = centers.find(c => c.id === v);
                  setFormData({
                    ...formData, 
                    destinationCenterId: v,
                    destinationCenterName: center?.name || ''
                  });
                }}
                options={(centers || []).map(c => ({
                  value: c.id,
                  label: c.name
                }))}
              />
            </div>
          </div>
        </section>

        {/* Bloc 2: Detalls de la Compra */}
        <section className="card p-10 relative z-10 !overflow-visible">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-10 flex items-center gap-3 relative z-10">
            <div className="p-2 bg-white/5 rounded-lg text-slate-500">2</div>
            Descripció del Bé o Servei
          </h3>
          
          <div className="space-y-10 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Categoria</label>
                <CustomSelect
                  placeholder="Selecciona categoria"
                  value={formData.category}
                  onChange={v => setFormData({...formData, category: v})}
                  options={CATEGORIES.map(cat => ({
                    value: cat.id,
                    label: cat.name
                  }))}
                />
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
                className="input-field" 
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
                className="input-field resize-none"
                value={formData.justification}
                onChange={e => setFormData({...formData, justification: e.target.value})}
              />
            </div>
          </div>
        </section>

        {/* Bloc 3: Documents adjunts */}
        <section className="card p-10 relative z-[5] !overflow-visible">
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
        <section className="card p-10 bg-brand-primary/[0.01] relative z-[2] !overflow-visible">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-10 flex items-center gap-3">
            <div className="p-2 bg-white/5 rounded-lg text-slate-500">4</div>
            Validació Econòmica
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Import Estimat (€)</label>
              <input 
                type="number" 
                placeholder="0.00" 
                className="input-field font-black text-4xl text-white py-6 bg-white/[0.02] border-brand-primary/20" 
                onChange={handleAmountChange}
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Prioritat de compra</label>
              <CustomSelect
                value={formData.urgency}
                onChange={v => setFormData({...formData, urgency: v as 'baixa' | 'mitjana' | 'alta' | 'critica'})}
                options={[
                  { value: 'baixa', label: 'Baixa' },
                  { value: 'mitjana', label: 'Mitjana (Estàndard)' },
                  { value: 'alta', label: 'Alta' },
                  { value: 'critica', label: 'Crítica (Interrupció servei)' }
                ]}
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Termini desitjat</label>
              <CustomDatePicker 
                value={formData.deadline}
                onChange={v => setFormData({...formData, deadline: v})}
                placeholder="dd/mm/aaaa"
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

      <div className="p-8 bg-brand-primary/[0.03] border border-brand-primary/10 rounded-3xl flex items-center gap-6 text-[11px] font-bold text-slate-500 uppercase tracking-[0.1em] relative z-0 overflow-hidden group">
        <div className="absolute top-0 left-0 w-1 h-full bg-brand-primary"></div>
        <div className="p-3 bg-brand-primary/10 rounded-2xl text-brand-primary group-hover:scale-110 transition-transform duration-500">
          <Info size={20} />
        </div>
        <p className="leading-relaxed">En fer clic a <span className="text-white border-b border-brand-primary pb-0.5">Enviar per aprovar</span> l'expedient entrarà en el flux automatitzat de signatures basat en la matriu de competències d'aprovació.</p>
      </div>

      <div className="flex items-center justify-end gap-3 pt-6">
        <button 
          type="button" 
          disabled={isSubmitting}
          onClick={() => saveRequest('esborrany')} 
          className="btn-secondary flex items-center gap-2 text-xs py-3 px-8 font-black uppercase tracking-widest disabled:opacity-50"
        >
          <Save size={18} />
          <span>Desar esborrany</span>
        </button>
        <button 
          type="button" 
          disabled={isSubmitting}
          onClick={() => saveRequest('pendent_coordinacio')} 
          className="btn-primary flex items-center gap-2 text-xs py-3 px-8 font-black uppercase tracking-widest shadow-xl shadow-brand-primary/20 disabled:opacity-50"
        >
          <Send size={18} />
          <span>Enviar per aprovar</span>
        </button>
      </div>
    </div>
  );
}
