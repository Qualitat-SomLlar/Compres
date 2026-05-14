import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText, 
  History,
  AlertCircle,
  Building2,
  Calendar,
  CreditCard,
  MessageSquare,
  Info,
  User as UserIcon,
  ShieldCheck,
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { STATUS_LABELS } from '../constants';
import { User, RequestStatus, AttachmentCategory, PurchaseRequest } from '../types';
import { cn } from '../lib/utils';
import AttachmentList from '../components/AttachmentList';
import StatusBadge from '../components/StatusBadge';
import { useRequests } from '../hooks/useRequests';
import { useNotifications } from '../hooks/useNotifications';
import { useUsers } from '../hooks/useUsers';
import { workflowService } from '../services/workflowService';
import { emailService } from '../services/emailService';
export default function RequestDetail({ user }: { user: User }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getRequestById, updateRequest } = useRequests();
  const { addNotification } = useNotifications();
  const { getUsersByRole } = useUsers();
  
  const request = id ? getRequestById(id) : undefined;
  const [comment, setComment] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!request) return <div className="p-20 text-center font-black text-slate-500 uppercase tracking-widest bg-brand-secondary rounded-3xl border border-white/5">No s'ha trobat la sol·licitud</div>;

  const handleAction = async (action: 'approve' | 'return' | 'reject') => {
    if (!request) return;
    setIsProcessing(true);
    
    try {
      const newStatus = workflowService.getNextStatus(request.status, action);
      
      const updateData: Partial<PurchaseRequest> = {
        status: newStatus,
        observations: comment || request.observations
      };

      // Afegir timestamps d'aprovació
      if (action === 'approve') {
        if (request.status === 'pendent_coordinacio') updateData.coordinationApprovedAt = new Date().toISOString();
        if (request.status === 'pendent_direccio') updateData.areaDirectionApprovedAt = new Date().toISOString();
        if (request.status === 'pendent_finances') updateData.financeApprovedAt = new Date().toISOString();
      }

      await updateRequest(request.id, updateData);

      // Gestió de Notificacions
      const targetRoleOrCreator = workflowService.getTargetRoleForStatus(newStatus);
      
      if (targetRoleOrCreator === 'creator') {
        // Notificar al creador
        await addNotification({
          userId: request.createdByUserId,
          title: `Actualització: ${STATUS_LABELS[newStatus]?.label}`,
          message: `L'expedient ${request.code || request.id} ha passat a l'estat ${STATUS_LABELS[newStatus]?.label}.`,
          type: action === 'reject' ? 'error' : 'success',
          requestId: request.id
        });
        
        await emailService.sendApprovalNotification(request, request.createdByUserEmail, newStatus);
      } else if (targetRoleOrCreator) {
        // Notificar als usuaris amb el rol objectiu (filtrant per àrea si cal)
        const needsAreaFilter = ['coordinacio', 'direccio_area'].includes(targetRoleOrCreator);
        const targetUsers = getUsersByRole(targetRoleOrCreator as any, needsAreaFilter ? request.areaId : undefined);
        
        for (const targetUser of targetUsers) {
          await addNotification({
            userId: targetUser.id,
            title: `Pendent d'aprovació: ${request.code || request.id}`,
            message: `Tens una nova sol·licitud pendent de validar de l'àrea ${request.areaId}.`,
            type: 'warning',
            requestId: request.id
          });
          
          await emailService.sendApprovalNotification(request, targetUser.email, newStatus);
        }
      }

      toast.success(`Acció realitzada: ${STATUS_LABELS[newStatus]?.label}`);
      navigate('/compres');
    } catch (error) {
      console.error(error);
      toast.error("Error al processar l'acció");
    } finally {
      setIsProcessing(false);
    }
  };

  const canApprove = workflowService.canUserApprove(user, request);

  // Mock de documents
  const mockAttachments = [
    {
      id: 'att-1',
      purchaseRequestId: request.id,
      fileName: 'pressupost_ofiservei.pdf',
      storagePath: '...',
      downloadURL: '#',
      mimeType: 'application/pdf',
      size: 1250000,
      category: 'pressupost' as AttachmentCategory,
      uploadedByUserId: 'u1',
      uploadedByUserName: 'Joan Tècnic',
      createdAt: '2024-04-01T11:00:00Z'
    }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors font-black uppercase text-[10px] tracking-[0.2em]">
          <ArrowLeft size={16} />
          <span>Tornar a la gestió</span>
        </button>

        <div className="flex items-center gap-3">
          <StatusBadge status={request.status} className="px-6 py-2 rounded-xl text-[10px] font-black tracking-[0.2em] shadow-2xl border text-base" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Detalls Principals */}
        <div className="lg:col-span-2 space-y-10">
          <div className="card overflow-hidden">
            <div className="p-12 border-b border-white/[0.05] bg-white/[0.01] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-brand-primary/5 blur-[100px] -mr-40 -mt-40 rounded-full"></div>
              <div className="flex flex-col md:flex-row justify-between items-start gap-8 relative z-10">
                <div className="space-y-4">
                  <h1 className="text-4xl font-black text-white tracking-tighter leading-tight max-w-lg">{request.itemDescription}</h1>
                  <div className="flex flex-wrap gap-4">
                    <p className="text-slate-500 font-black uppercase text-[10px] tracking-[0.3em]">Codi: <span className="text-brand-primary">{request.code || request.id}</span></p>
                    <p className="text-slate-500 font-black uppercase text-[10px] tracking-[0.3em]">Àrea: <span className="text-white">{request.areaId.toUpperCase()}</span></p>
                  </div>
                </div>
                <div className="text-left md:text-right shrink-0">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-3">Import de l'expedient</p>
                  <p className="text-6xl font-black text-white tracking-tighter">{request.estimatedAmount.toLocaleString()} <span className="text-3xl text-brand-primary/50">€</span></p>
                </div>
              </div>
            </div>

            <div className="p-12 grid grid-cols-1 md:grid-cols-2 gap-12 relative">
              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Building2 size={14} className="text-brand-primary" /> Imputació Contable
                </p>
                <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                   <p className="text-sm font-bold text-slate-200">{request.projectId}</p>
                   <p className="text-xs font-black text-brand-primary mt-1 tracking-widest">{request.analyticCode}</p>
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Calendar size={14} className="text-brand-primary" /> Horitzó Temporal
                </p>
                <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                  <p className="text-sm font-bold text-slate-200">{new Date(request.deadline).toLocaleDateString('ca-ES')}</p>
                  <p className="text-[10px] text-slate-500 font-black uppercase mt-1 tracking-tighter">Data límit desitjada</p>
                </div>
              </div>
              
              {/* Secció Tècnic i Creador */}
              <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                <div className="p-5 rounded-2xl bg-[#0b0f19] border border-white/5">
                  <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <UserIcon size={12} /> Tècnic/a sol·licitant
                  </p>
                  <p className="text-xs font-bold text-white tracking-tight">{request.requestingTechnicianName}</p>
                  <p className="text-[10px] text-slate-500 font-medium">{request.requestingTechnicianEmail}</p>
                </div>
                <div className="p-5 rounded-2xl bg-[#0b0f19] border border-white/5">
                  <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <History size={12} /> Registrat al sistema per
                  </p>
                  <p className="text-xs font-bold text-slate-300 tracking-tight">{request.createdByUserName}</p>
                  <p className="text-[10px] text-slate-500 font-medium">{request.createdByUserEmail || 'N/A'}</p>
                </div>
              </div>

              <div className="col-span-full space-y-4 pt-10 border-t border-white/[0.05]">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Memòria Justificativa</p>
                <div className="relative p-6 bg-white/[0.01] rounded-3xl border border-white/[0.03]">
                  <p className="text-sm text-slate-400 leading-relaxed italic">"{request.justification}"</p>
                </div>
              </div>
            </div>
          </div>

          {/* Documents Adjunts */}
          <div className="space-y-6">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-3">
              <FileText size={18} className="text-brand-primary" /> Documentació de l'Expedient
            </h3>
            <div className="card p-10">
              <AttachmentList attachments={mockAttachments} />
            </div>
          </div>

          {/* Secció 3 Pressupostos (Només si > 5000€) */}
          {request.requiresThreeQuotes && (
            <div className="card ring-1 ring-amber-500/20 overflow-hidden shadow-2xl shadow-amber-500/5">
              <div className="px-10 py-6 bg-amber-500/[0.03] border-b border-amber-500/10 flex items-center justify-between">
                <div className="flex items-center gap-4 text-amber-500 font-black uppercase tracking-[0.2em] text-[10px]">
                  <AlertCircle size={20} />
                  <span>Anàlisi Comparatiu de Pressupostos (Compliance)</span>
                </div>
                <span className="text-[9px] bg-amber-500 text-black px-3 py-1 rounded-md font-black tracking-widest">3 OFERTES</span>
              </div>
              <div className="p-10 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-slate-600 border-b border-white/[0.03]">
                      <th className="pb-6 text-left font-black uppercase tracking-widest text-[9px]">Empresa Proveïdora</th>
                      <th className="pb-6 px-4 text-center font-black uppercase tracking-widest text-[9px]">Quota (€)</th>
                      <th className="pb-6 px-4 text-center font-black uppercase tracking-widest text-[9px]">Punt. Tècnica</th>
                      <th className="pb-6 text-right font-black uppercase tracking-widest text-[9px]">Estat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.02]">
                    <tr className="group">
                      <td className="py-6 font-bold text-slate-400 group-hover:text-white transition-colors">Proveïdor Alfa SL</td>
                      <td className="py-6 px-4 text-center font-black text-white">6.150 €</td>
                      <td className="py-6 px-4 text-center font-bold text-slate-600">8/10</td>
                      <td className="py-6 text-right">
                         <span className="text-[9px] text-slate-700 uppercase font-black tracking-widest">Descartat</span>
                      </td>
                    </tr>
                    <tr className="bg-brand-primary/[0.03]">
                      <td className="py-6 font-black text-brand-primary flex items-center gap-2">
                        <CheckCircle size={16} /> Servei Integral Som
                      </td>
                      <td className="py-6 px-4 text-center font-black text-brand-primary text-lg">5.980 €</td>
                      <td className="py-6 px-4 text-center font-black text-brand-primary">9.5/10</td>
                      <td className="py-6 text-right">
                        <span className="bg-brand-primary text-white px-3 py-1.5 rounded-lg text-[9px] font-black tracking-widest shadow-lg shadow-brand-primary/20">ADJUDICAT</span>
                      </td>
                    </tr>
                    <tr className="group">
                      <td className="py-6 font-bold text-slate-400 group-hover:text-white transition-colors">ManteBCN Logística</td>
                      <td className="py-6 px-4 text-center font-black text-white">6.400 €</td>
                      <td className="py-6 px-4 text-center font-bold text-slate-600">7/10</td>
                      <td className="py-6 text-right">
                        <span className="text-[9px] text-slate-700 uppercase font-black tracking-widest">Descartat</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Barra Lateral */}
        <div className="space-y-10">
          <div className="card p-10 bg-brand-primary/[0.02] border-brand-primary/20">
            <h4 className="text-[10px] font-black text-brand-primary uppercase tracking-[0.2em] mb-10 flex items-center gap-3">
              <Clock size={18} /> Flux de Signatures
            </h4>
            <div className="space-y-10 relative ml-4 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-px before:bg-brand-primary/20">
              <TimelineStep 
                title="Finances" 
                status="pending" 
                role="Direcció ADM i Finances" 
                active={request.status === 'pendent_finances'} 
              />
              <TimelineStep 
                title="Direcció Àrea" 
                status={request.status === 'pendent_finances' ? 'completed' : 'pending'} 
                role="Validació Econòmica" 
                date="05/04/2024"
                active={request.status === 'pendent_direccio'}
              />
              <TimelineStep 
                title="Coordinació" 
                status="completed" 
                role="Vistiplau de l'Àrea" 
                date="02/04/2024"
                active={request.status === 'pendent_coordinacio'}
              />
              <TimelineStep 
                title="Sol·licitud" 
                status="completed" 
                role={request.requestingTechnicianName} 
                date={new Date(request.createdAt).toLocaleDateString('ca-ES')}
              />
            </div>
          </div>

          <div className="card p-10">
             <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-8 flex items-center gap-3">
              <MessageSquare size={18} className="text-brand-primary" /> Observacions
            </h4>
            <div className="space-y-6">
               <textarea 
                className="input-field text-xs min-h-[120px]" 
                placeholder="Escriu una nota interna..."
                value={comment}
                onChange={e => setComment(e.target.value)}
              />
              {canApprove ? (
                <div className="space-y-4">
                  <div className="flex gap-3 mt-4">
                    {request.status !== 'tancada' && request.status !== 'rebutjada' && (
                      <>
                        <button 
                          disabled={isProcessing}
                          onClick={() => handleAction('return')} 
                          className="btn-secondary flex-1 py-3 text-[10px] font-black uppercase tracking-widest border-red-500/20 text-red-500 hover:bg-red-500/10 disabled:opacity-50"
                        >
                          Retornar
                        </button>
                        <button 
                          disabled={isProcessing}
                          onClick={() => handleAction('approve')} 
                          className="btn-primary flex-1 py-3 text-[10px] font-black uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {isProcessing && <Loader2 size={14} className="animate-spin" />}
                          {request.status === 'comanda_emesa' ? 'Confirmar Recepció' : 
                           request.status === 'rebuda' ? 'Validar i Tancar' : 'Validar'}
                        </button>
                      </>
                    )}
                  </div>
                  <button 
                    disabled={isProcessing}
                    onClick={() => handleAction('reject')} 
                    className="w-full py-2 text-[9px] font-black text-slate-600 hover:text-red-500 uppercase tracking-widest transition-colors"
                  >
                    Rebutjar definitivament
                  </button>
                </div>
              ) : request.status !== 'tancada' && request.status !== 'rebutjada' ? (
                <div className="p-6 bg-white/[0.01] border border-white/5 rounded-2xl flex items-center gap-4">
                  <div className="p-2 bg-white/5 rounded-lg text-slate-600">
                    <Clock size={16} />
                  </div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-relaxed">
                    Esperant validació de: <span className="text-brand-primary">{STATUS_LABELS[request.status]?.label}</span>
                  </p>
                </div>
              ) : (
                <div className="p-6 bg-white/[0.01] border border-white/5 rounded-2xl flex items-center gap-4">
                  <div className="p-2 bg-white/5 rounded-lg text-slate-600">
                    <CheckCircle size={16} />
                  </div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Expedient finalitzat
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface TimelineStepProps {
  title: string;
  status: 'pending' | 'completed' | 'error';
  role: string;
  date?: string;
  active?: boolean;
}

const TimelineStep = ({ title, status, role, date, active }: TimelineStepProps) => {
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
