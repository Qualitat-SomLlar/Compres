import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  CheckCircle, 
  CheckCircle2,
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
  Loader2,
  Plus,
  Trash2,
  Award,
  AlertTriangle,
  Upload,
  X,
  FileCheck,
  Users as UsersIcon
} from 'lucide-react';
import toast from 'react-hot-toast';
import { STATUS_LABELS, getHierarchyRole, normalizeAreaId } from '../constants';
import { User, RequestStatus, AttachmentCategory, PurchaseRequest, Attachment, Quote } from '../types';
import { cn } from '../lib/utils';
import AttachmentList from '../components/AttachmentList';
import FileUploader from '../components/FileUploader';
import StatusBadge from '../components/StatusBadge';
import { useRequests } from '../hooks/useRequests';
import { useAreas } from '../hooks/useAreas';
import { useNotifications } from '../hooks/useNotifications';
import { useUsers } from '../hooks/useUsers';
import { useSuppliers } from '../hooks/useSuppliers';
import { useEmailDispatcher } from '../hooks/useEmailDispatcher';
import { workflowService } from '../services/workflowService';
import { fileService } from '../services/fileService';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function RequestDetail({ user }: { user: User }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getRequestById, updateRequest, loading: loadingRequests } = useRequests();
  const { getAreaName } = useAreas();
  const { addNotification } = useNotifications();
  const { dispatchEmail } = useEmailDispatcher();
  const { users, getUsersByRole } = useUsers();
  const { suppliers } = useSuppliers();
  
  const request = id ? getRequestById(id) : undefined;
  const [comment, setComment] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Gestió de Documents Adjunts Reals
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Gestió de 3 Pressupostos Reals
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loadingQuotes, setLoadingQuotes] = useState(true);
  const [showAddQuoteModal, setShowAddQuoteModal] = useState(false);
  const [quoteForm, setQuoteForm] = useState({
    supplierId: '',
    supplierName: '',
    amount: '',
    technicalScore: 8,
    justification: ''
  });
  const [quoteFile, setQuoteFile] = useState<File | null>(null);
  const [isSubmittingQuote, setIsSubmittingQuote] = useState(false);

  // Carregar documents i pressupostos en temps real
  useEffect(() => {
    if (!request?.id) return;

    // Carregar documents d'expedient
    setLoadingAttachments(true);
    fileService.getAttachments(request.id).then(atts => {
      setAttachments(atts);
      setLoadingAttachments(false);
    }).catch(err => {
      console.error("Error carregant adjunts:", err);
      setLoadingAttachments(false);
    });

    // Subscripció en temps real als pressupostos
    const quotesQuery = query(collection(db, 'quotes'), where('requestId', '==', request.id));
    const unsubQuotes = onSnapshot(quotesQuery, (snapshot) => {
      const qList = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      } as Quote));
      setQuotes(qList);
      setLoadingQuotes(false);
    }, (err) => {
      console.error("Error carregant pressupostos:", err);
      setLoadingQuotes(false);
    });

    return () => unsubQuotes();
  }, [request?.id]);

  if (loadingRequests) {
    return (
      <div className="max-w-6xl mx-auto p-20 flex flex-col items-center justify-center gap-4 bg-brand-secondary rounded-3xl border border-white/5 animate-in fade-in">
        <Loader2 size={36} className="animate-spin text-brand-primary" />
        <p className="font-bold text-slate-400 text-xs tracking-widest uppercase">Carregant detalls de l'expedient...</p>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="max-w-6xl mx-auto p-20 text-center space-y-4 bg-brand-secondary rounded-3xl border border-white/5 animate-in fade-in">
        <AlertCircle size={36} className="mx-auto text-amber-500" />
        <h3 className="font-black text-white uppercase tracking-widest text-sm">No s'ha trobat la sol·licitud</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">L'expedient sol·licitat no existeix o no està disponible.</p>
        <button onClick={() => navigate('/compres')} className="btn-secondary text-xs uppercase px-4 py-2 mt-2">
          Tornar a la llista d'expedients
        </button>
      </div>
    );
  }

  const handleAction = async (action: 'approve' | 'return' | 'reject') => {
    if (!request) return;
    setIsProcessing(true);
    
    try {
      const newStatus = workflowService.getNextStatus(request.status, action);
      
      const updateData: Partial<PurchaseRequest> = {
        status: newStatus,
        observations: comment ? (request.observations ? `${request.observations}\n\n[${new Date().toLocaleDateString('ca-ES')} - ${user.name}]: ${comment}` : comment) : request.observations
      };

      // Afegir timestamps d'aprovació segons la fase
      if (action === 'approve') {
        if (request.status === 'pendent_coordinacio') updateData.coordinationApprovedAt = new Date().toISOString();
        if (request.status === 'pendent_direccio') updateData.areaDirectionApprovedAt = new Date().toISOString();
        if (request.status === 'pendent_finances') updateData.financeApprovedAt = new Date().toISOString();
        if (request.status === 'comanda_emesa') updateData.receivedAt = new Date().toISOString();
        if (request.status === 'rebuda') updateData.closedAt = new Date().toISOString();
      }

      await updateRequest(request.id, updateData);

      // Gestió de Notificacions
      const targetRoleOrCreator = workflowService.getTargetRoleForStatus(newStatus);
      
      if (targetRoleOrCreator === 'creator') {
        await addNotification({
          userId: request.createdByUserId,
          title: `Actualització: ${STATUS_LABELS[newStatus]?.label}`,
          message: `L'expedient ${request.code || request.id} ha passat a l'estat ${STATUS_LABELS[newStatus]?.label}.`,
          type: action === 'reject' ? 'error' : 'success',
          requestId: request.id
        });
      } else if (targetRoleOrCreator) {
        const needsAreaFilter = ['coordinacio', 'direccio_area'].includes(targetRoleOrCreator);
        const targetUsers = getUsersByRole(targetRoleOrCreator as any, needsAreaFilter ? request.areaId : undefined);
        for (const targetUser of targetUsers) {
          await addNotification({
            userId: targetUser.id,
            title: `Pendent: ${request.code || request.id}`,
            message: `Tens una nova sol·licitud pendent de validació.`,
            type: 'warning',
            requestId: request.id
          });
        }
      }

      // Notificacions Email (Dispatcher)
      let eventKey = '';
      if (action === 'reject') eventKey = 'rebutjada';
      else if (action === 'return') eventKey = 'retornada_esmena';
      else if (newStatus === 'aprovada') eventKey = 'compra_aprovada';
      else if (newStatus === 'pendent_finances') eventKey = 'enviada_finances';
      else if (newStatus === 'pendent_direccio') eventKey = 'validada_direccio';
      else if (newStatus === 'comanda_emesa') eventKey = 'compra_tramitada';
      else if (newStatus === 'rebuda') eventKey = 'compra_rebuda';
      else if (newStatus === 'tancada') eventKey = 'compra_tancada';
      else if (newStatus === 'incidencia') eventKey = 'incidencia';

      if (eventKey) {
        await dispatchEmail(
          eventKey, 
          { ...request, status: newStatus }, 
          { 
            comment, 
            previousStatus: request.status,
            actorName: user?.name,
            actorRole: user?.role
          }
        );
      }

      toast.success(`Acció realitzada: ${STATUS_LABELS[newStatus]?.label}`);
      setComment('');
    } catch (error) {
      console.error(error);
      toast.error("Error al processar l'acció");
    } finally {
      setIsProcessing(false);
    }
  };

  // Pujada de fitxers adjunts des del detall
  const handleUploadFiles = async (files: File[], category: AttachmentCategory) => {
    if (!request) return;
    try {
      const uploadedList: Attachment[] = [];
      for (const file of files) {
        const att = await fileService.uploadFile(
          file,
          request.id,
          category,
          user.id,
          user.name
        );
        uploadedList.push(att);
      }
      setAttachments(prev => [...uploadedList, ...prev]);
      await updateRequest(request.id, {
        attachmentsCount: attachments.length + uploadedList.length
      });
      toast.success(`${files.length} document(s) desat(s) a l'expedient`);
      setShowUploadModal(false);
    } catch (err) {
      console.error("Error pujant fitxers:", err);
      toast.error("Error pujant els documents");
    }
  };

  // Eliminació d'adjunt
  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!request) return;
    if (!window.confirm('Vols eliminar definitivament aquest document de l\'expedient?')) return;
    try {
      const att = attachments.find(a => a.id === attachmentId);
      await fileService.deleteFile(attachmentId, att?.storagePath);
      setAttachments(prev => prev.filter(a => a.id !== attachmentId));
      await updateRequest(request.id, {
        attachmentsCount: Math.max(0, attachments.length - 1)
      });
      toast.success('Document eliminat correctament');
    } catch (err) {
      console.error("Error eliminant document:", err);
      toast.error("Error eliminant el document");
    }
  };

  // Crear nou pressupost comparatiu
  const handleAddQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request) return;
    if (!quoteForm.supplierName.trim()) {
      toast.error('Indica el nom de l\'empresa proveïdora');
      return;
    }
    const numAmount = parseFloat(quoteForm.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Indica un import vàlid per a l\'oferta');
      return;
    }

    setIsSubmittingQuote(true);
    try {
      if (quoteFile) {
        const uploaded = await fileService.uploadFile(
          quoteFile,
          request.id,
          'pressupost',
          user.id,
          user.name
        );
        setAttachments(prev => [uploaded, ...prev]);
      }

      const newQuoteData: Omit<Quote, 'id'> = {
        requestId: request.id,
        supplierId: quoteForm.supplierId,
        supplierName: quoteForm.supplierName.trim(),
        amount: numAmount,
        technicalScore: Number(quoteForm.technicalScore) || 5,
        qualityScore: 0,
        solvedScore: 0,
        deliveryScore: 0,
        economicScore: 0,
        totalScore: Number(quoteForm.technicalScore) || 5,
        justification: quoteForm.justification.trim(),
        isSelected: false
      };

      await addDoc(collection(db, 'quotes'), newQuoteData);
      
      await updateRequest(request.id, {
        quotesCount: quotes.length + 1
      });

      toast.success('Oferta de pressupost registrada');
      setShowAddQuoteModal(false);
      setQuoteForm({
        supplierId: '',
        supplierName: '',
        amount: '',
        technicalScore: 8,
        justification: ''
      });
      setQuoteFile(null);
    } catch (err) {
      console.error("Error guardant pressupost:", err);
      toast.error("Error en guardar l'oferta");
    } finally {
      setIsSubmittingQuote(false);
    }
  };

  // Adjudicar un pressupost
  const handleSelectQuote = async (quote: Quote) => {
    if (!request) return;
    
    setIsProcessing(true);
    try {
      for (const q of quotes) {
        if (q.id === quote.id) {
          if (!q.isSelected) {
            await updateDoc(doc(db, 'quotes', q.id), { isSelected: true });
          }
        } else if (q.isSelected) {
          await updateDoc(doc(db, 'quotes', q.id), { isSelected: false });
        }
      }

      await updateRequest(request.id, {
        supplierId: quote.supplierId || '',
        supplierName: quote.supplierName,
        finalAmount: quote.amount
      });

      toast.success(`Oferta de "${quote.supplierName}" adjudicada amb èxit!`);
    } catch (err) {
      console.error("Error adjudicant oferta:", err);
      toast.error("No s'ha pogut adjudicar l'oferta");
    } finally {
      setIsProcessing(false);
    }
  };

  // Eliminar un pressupost
  const handleDeleteQuote = async (quoteId: string) => {
    if (!window.confirm('Vols eliminar aquesta oferta comparativa?')) return;
    try {
      const q = quotes.find(item => item.id === quoteId);
      await deleteDoc(doc(db, 'quotes', quoteId));
      if (q?.isSelected && request) {
        await updateRequest(request.id, {
          supplierName: '',
          supplierId: '',
          finalAmount: undefined,
          quotesCount: Math.max(0, quotes.length - 1)
        });
      }
      toast.success('Oferta eliminada');
    } catch (err) {
      console.error(err);
      toast.error("Error eliminant el pressupost");
    }
  };

  const canApprove = workflowService.canUserApprove(user, request);
  const eligibleApprovers = request ? workflowService.getEligibleApprovers(request, users) : null;
  const isCurrentUserApprover = eligibleApprovers?.users.some(u => u.id === user.id);

  const areaCoordinators = users.filter(u => u.active !== false && (u.hierarchyLevel === 2 || u.role === 'coordinacio') && normalizeAreaId(u.areaId) === normalizeAreaId(request?.areaId));
  const areaCoordinatorsLabel = areaCoordinators.length > 0 
    ? areaCoordinators.map(u => u.name).join(', ') 
    : `Coordinació (${request ? getAreaName(request.areaId) : ''})`;

  const areaDirectors = users.filter(u => u.active !== false && (u.hierarchyLevel === 3 || u.role === 'direccio_area') && normalizeAreaId(u.areaId) === normalizeAreaId(request?.areaId));
  const areaDirectorsLabel = areaDirectors.length > 0 
    ? areaDirectors.map(u => u.name).join(', ') 
    : `Direcció (${request ? getAreaName(request.areaId) : ''})`;

  const financeUsers = users.filter(u => u.active !== false && (u.hierarchyLevel === 4 || u.role === 'finances'));
  const financeLabel = financeUsers.length > 0 
    ? financeUsers.map(u => u.name).join(', ') 
    : "Direcció ADM i Finances";

  const getActionLabel = (status: RequestStatus) => {
    switch (status) {
      case 'pendent_coordinacio': return 'Validar Coordinació';
      case 'pendent_direccio': return 'Validar Direcció';
      case 'pendent_finances': return 'Aprovar Finances';
      case 'aprovada': return 'Emetre Comanda';
      case 'comanda_emesa': return 'Confirmar Recepció';
      case 'rebuda': return 'Validar Factura i Tancar';
      case 'esborrany':
      case 'retornada': return 'Tramitar a Coordinació';
      default: return 'Validar';
    }
  };

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
                  <h1 className="text-4xl font-black text-white tracking-tighter leading-tight max-w-lg">{request.itemDescription || 'Sol·licitud de compra'}</h1>
                  <div className="flex flex-wrap gap-4">
                    <p className="text-slate-500 font-black uppercase text-[10px] tracking-[0.3em]">Codi: <span className="text-brand-primary">{request.code || request.id}</span></p>
                    <p className="text-slate-500 font-black uppercase text-[10px] tracking-[0.3em]">Àrea: <span className="text-white">{request.areaId ? getAreaName(request.areaId) : 'SENSE ÀREA'}</span></p>
                  </div>
                </div>
                <div className="text-left md:text-right shrink-0">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-3">
                    {request.finalAmount ? "Import Adjudicat" : "Import Estimat"}
                  </p>
                  <p className="text-5xl md:text-6xl font-black text-white tracking-tighter">
                    {((request.finalAmount ?? request.estimatedAmount) || 0).toLocaleString()} <span className="text-3xl text-brand-primary/50">€</span>
                  </p>
                  {request.supplierName && (
                    <div className="flex items-center md:justify-end gap-2 mt-2">
                      <CheckCircle2 size={14} className="text-brand-primary" />
                      <span className="text-xs font-bold text-brand-primary truncate max-w-xs">{request.supplierName}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-12 grid grid-cols-1 md:grid-cols-2 gap-12 relative">
              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Building2 size={14} className="text-brand-primary" /> Imputació Contable
                </p>
                <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                   <p className="text-sm font-bold text-slate-200">{request.projectId || 'Sense projecte assignat'}</p>
                   <p className="text-xs font-black text-brand-primary mt-1 tracking-widest">{request.analyticCode || 'Sense codi analític'}</p>
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Calendar size={14} className="text-brand-primary" /> Horitzó Temporal
                </p>
                <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                  <p className="text-sm font-bold text-slate-200">{request.deadline ? new Date(request.deadline).toLocaleDateString('ca-ES') : 'Sense data límit'}</p>
                  <p className="text-[10px] text-slate-500 font-black uppercase mt-1 tracking-tighter">Data límit desitjada</p>
                </div>
              </div>
              
              {/* Secció Tècnic i Creador */}
              <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                <div className="p-5 rounded-2xl bg-[#0b0f19] border border-white/5">
                  <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <UserIcon size={12} /> Tècnic/a sol·licitant
                  </p>
                  <p className="text-xs font-bold text-white tracking-tight">{request.requestingTechnicianName || 'No assignat'}</p>
                  <p className="text-[10px] text-slate-500 font-medium">{request.requestingTechnicianEmail || 'N/A'}</p>
                </div>
                <div className="p-5 rounded-2xl bg-[#0b0f19] border border-white/5">
                  <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <History size={12} /> Registrat al sistema per
                  </p>
                  <p className="text-xs font-bold text-slate-300 tracking-tight">{request.createdByUserName || 'Usuari'}</p>
                  <p className="text-[10px] text-slate-500 font-medium">{request.createdByUserEmail || 'N/A'}</p>
                </div>
              </div>

              <div className="col-span-full space-y-4 pt-10 border-t border-white/[0.05]">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Memòria Justificativa</p>
                <div className="relative p-6 bg-white/[0.01] rounded-3xl border border-white/[0.03]">
                  <p className="text-sm text-slate-400 leading-relaxed italic">{request.justification ? `"${request.justification}"` : 'Sense memòria justificativa especificada.'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Documents Adjunts Reals */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-3">
                <FileText size={18} className="text-brand-primary" /> Documentació de l'Expedient ({attachments.length})
              </h3>
              <button 
                onClick={() => setShowUploadModal(!showUploadModal)}
                className="btn-secondary flex items-center gap-2 py-2 px-4 text-[10px] font-black uppercase tracking-widest border-brand-primary/30 text-brand-primary hover:bg-brand-primary/10"
              >
                {showUploadModal ? <X size={14} /> : <Plus size={14} />}
                <span>{showUploadModal ? 'Tancar Càrrega' : '+ Adjuntar Document'}</span>
              </button>
            </div>

            {showUploadModal && (
              <div className="card p-8 border-brand-primary/30 bg-brand-primary/[0.02] animate-in fade-in duration-300">
                <FileUploader onUpload={handleUploadFiles} />
              </div>
            )}

            <div className="card p-8">
              {loadingAttachments ? (
                <div className="py-12 flex items-center justify-center gap-3 text-slate-500 text-xs">
                  <Loader2 size={18} className="animate-spin text-brand-primary" />
                  <span>Carregant documentació...</span>
                </div>
              ) : (
                <AttachmentList 
                  attachments={attachments} 
                  onDelete={handleDeleteAttachment}
                />
              )}
            </div>
          </div>

          {/* Secció 3 Pressupostos Reals (Només si > 5000€) */}
          {request.requiresThreeQuotes && (
            <div className="card ring-1 ring-amber-500/20 overflow-hidden shadow-2xl shadow-amber-500/5 space-y-6">
              <div className="px-10 py-6 bg-amber-500/[0.03] border-b border-amber-500/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4 text-amber-500 font-black uppercase tracking-[0.2em] text-[10px]">
                  <AlertCircle size={20} />
                  <span>Anàlisi Comparatiu de Pressupostos (Compliance {'>'} 5.000 €)</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "text-[9px] px-3 py-1 rounded-md font-black tracking-widest uppercase flex items-center gap-1.5",
                    quotes.length >= 3 ? "bg-emerald-500 text-black" : "bg-amber-500 text-black"
                  )}>
                    {quotes.length >= 3 ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                    {quotes.length} de 3 Ofertes
                  </span>
                  <button 
                    onClick={() => setShowAddQuoteModal(true)}
                    className="btn-primary py-1.5 px-4 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5"
                  >
                    <Plus size={14} />
                    <span>Afegir Oferta</span>
                  </button>
                </div>
              </div>

              {/* Informació de Compliance */}
              <div className="px-10">
                {quotes.length < 3 ? (
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-3">
                    <AlertTriangle size={18} className="shrink-0 text-amber-400" />
                    <span>
                      Normativa de contractació: És obligatori adjuntar un mínim de <strong>3 pressupostos comparatius</strong> per a compres iguals o superiors a 5.000 €. Falten {3 - quotes.length} pressupost(s).
                    </span>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-3">
                    <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />
                    <span>
                      Requisit de concurrència complert ({quotes.length} ofertes registrades). Selecciona l'oferta adjudicatària per fixar el proveïdor de l'expedient.
                    </span>
                  </div>
                )}
              </div>

              <div className="p-10 pt-0 overflow-x-auto">
                {loadingQuotes ? (
                  <div className="py-12 flex items-center justify-center gap-3 text-slate-500 text-xs">
                    <Loader2 size={18} className="animate-spin text-brand-primary" />
                    <span>Carregant taula comparativa...</span>
                  </div>
                ) : quotes.length === 0 ? (
                  <div className="py-12 text-center border-2 border-dashed border-white/5 rounded-2xl">
                    <FileCheck className="mx-auto text-slate-700 mb-3" size={32} />
                    <p className="text-xs text-slate-400 font-bold">Encara no hi ha pressupostos registrats</p>
                    <p className="text-[10px] text-slate-600 mt-1 uppercase tracking-widest">Prem sobre "Afegir Oferta" per introduir els pressupostos dels proveïdors.</p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-slate-600 border-b border-white/[0.03]">
                        <th className="pb-6 text-left font-black uppercase tracking-widest text-[9px]">Empresa Proveïdora</th>
                        <th className="pb-6 px-4 text-center font-black uppercase tracking-widest text-[9px]">Quota (€)</th>
                        <th className="pb-6 px-4 text-center font-black uppercase tracking-widest text-[9px]">Punt. Tècnica</th>
                        <th className="pb-6 px-4 text-left font-black uppercase tracking-widest text-[9px]">Justificació</th>
                        <th className="pb-6 text-right font-black uppercase tracking-widest text-[9px]">Estat / Acció</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.02]">
                      {quotes.map((q) => (
                        <tr key={q.id} className={cn("group transition-colors", q.isSelected && "bg-brand-primary/[0.04]")}>
                          <td className="py-6 font-bold text-white">
                            <div className="flex items-center gap-2">
                              {q.isSelected ? (
                                <CheckCircle size={16} className="text-brand-primary shrink-0" />
                              ) : (
                                <div className="w-4 h-4 rounded-full border border-slate-700 shrink-0" />
                              )}
                              <span>{q.supplierName}</span>
                            </div>
                          </td>
                          <td className="py-6 px-4 text-center font-black text-white text-base">
                            {((q.amount) || 0).toLocaleString()} €
                          </td>
                          <td className="py-6 px-4 text-center font-bold text-slate-400">
                            <span className={cn(
                              "px-2 py-1 rounded text-xs font-black",
                              q.technicalScore >= 8 ? "text-emerald-400 bg-emerald-500/10" : "text-amber-400 bg-amber-500/10"
                            )}>
                              {q.technicalScore}/10
                            </span>
                          </td>
                          <td className="py-6 px-4 text-left text-xs text-slate-400 max-w-xs truncate italic">
                            {q.justification || '—'}
                          </td>
                          <td className="py-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {q.isSelected ? (
                                <span className="bg-brand-primary text-white px-3 py-1.5 rounded-lg text-[9px] font-black tracking-widest shadow-lg shadow-brand-primary/20 flex items-center gap-1.5">
                                  <Award size={12} /> ADJUDICAT
                                </span>
                              ) : (
                                <button
                                  disabled={isProcessing}
                                  onClick={() => handleSelectQuote(q)}
                                  className="btn-secondary py-1.5 px-3 text-[9px] font-black uppercase tracking-widest hover:border-brand-primary text-slate-300 hover:text-brand-primary flex items-center gap-1.5"
                                >
                                  <Award size={12} /> Adjudicar
                                </button>
                              )}
                              <button 
                                onClick={() => handleDeleteQuote(q.id)}
                                className="p-1.5 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                title="Eliminar oferta"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
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
                title="Tancament" 
                status={request.status === 'tancada' ? 'completed' : 'pending'} 
                role="Facturació i Arxiu" 
                date={request.closedAt ? new Date(request.closedAt).toLocaleDateString('ca-ES') : undefined}
                active={request.status === 'rebuda'} 
              />
              <TimelineStep 
                title="Recepció" 
                status={request.receivedAt || ['rebuda', 'tancada'].includes(request.status) ? 'completed' : 'pending'} 
                role="Conformitat del Bé / Servei" 
                date={request.receivedAt ? new Date(request.receivedAt).toLocaleDateString('ca-ES') : undefined}
                active={request.status === 'comanda_emesa'} 
              />
              <TimelineStep 
                title="Comanda" 
                status={['comanda_emesa', 'rebuda', 'tancada'].includes(request.status) ? 'completed' : 'pending'} 
                role="Emissió de Comanda" 
                active={request.status === 'aprovada'} 
              />
              <TimelineStep 
                title="Finances" 
                status={request.financeApprovedAt || ['aprovada', 'comanda_emesa', 'rebuda', 'tancada'].includes(request.status) ? 'completed' : request.status === 'rebutjada' ? 'error' : 'pending'} 
                role={financeLabel} 
                date={request.financeApprovedAt ? new Date(request.financeApprovedAt).toLocaleDateString('ca-ES') : undefined}
                active={request.status === 'pendent_finances'} 
              />
              <TimelineStep 
                title="Direcció Àrea" 
                status={request.areaDirectionApprovedAt || ['pendent_finances', 'aprovada', 'comanda_emesa', 'rebuda', 'tancada'].includes(request.status) ? 'completed' : request.status === 'rebutjada' ? 'error' : 'pending'} 
                role={areaDirectorsLabel} 
                date={request.areaDirectionApprovedAt ? new Date(request.areaDirectionApprovedAt).toLocaleDateString('ca-ES') : undefined}
                active={request.status === 'pendent_direccio'} 
              />
              <TimelineStep 
                title="Coordinació" 
                status={request.coordinationApprovedAt || ['pendent_direccio', 'pendent_finances', 'aprovada', 'comanda_emesa', 'rebuda', 'tancada'].includes(request.status) ? 'completed' : request.status === 'rebutjada' ? 'error' : 'pending'} 
                role={areaCoordinatorsLabel} 
                date={request.coordinationApprovedAt ? new Date(request.coordinationApprovedAt).toLocaleDateString('ca-ES') : undefined}
                active={request.status === 'pendent_coordinacio'} 
              />
              <TimelineStep 
                title="Sol·licitud" 
                status="completed" 
                role={request.requestingTechnicianName || 'Tècnic/a sol·licitant'} 
                date={request.createdAt ? new Date(request.createdAt).toLocaleDateString('ca-ES') : 'Recent'}
              />
            </div>
          </div>

          <div className="card p-8">
             <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
              <MessageSquare size={18} className="text-brand-primary" /> Observacions i Validació
            </h4>

            {/* Caixa Informativa d'Aprovadors Designats segons Jerarquia i Àrea */}
            {eligibleApprovers && request.status !== 'tancada' && request.status !== 'rebutjada' && (
              <div className={cn(
                "p-5 rounded-2xl border transition-all mb-6 space-y-3",
                !eligibleApprovers.hasCover 
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                  : isCurrentUserApprover || canApprove
                    ? "bg-brand-primary/10 border-brand-primary/30"
                    : "bg-white/[0.02] border-white/5"
              )}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <UsersIcon size={16} className={isCurrentUserApprover || canApprove ? "text-brand-primary" : !eligibleApprovers.hasCover ? "text-amber-400" : "text-slate-400"} />
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">
                      Torn de Validació: <span className="text-white">{eligibleApprovers.roleName}</span>
                    </span>
                  </div>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-white/5 text-slate-400">
                    Nivell {eligibleApprovers.levelNumber}
                  </span>
                </div>

                <p className="text-[10px] text-slate-400 leading-relaxed">
                  {eligibleApprovers.scopeDescription}
                </p>

                {eligibleApprovers.hasCover ? (
                  <div className="space-y-2 pt-1 border-t border-white/5">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                      Treballadors/es amb potestat ({eligibleApprovers.users.length}):
                    </p>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {eligibleApprovers.users.map(approver => {
                        const isMe = approver.id === user.id;
                        return (
                          <div 
                            key={approver.id}
                            className={cn(
                              "flex items-center justify-between p-2.5 rounded-xl border text-xs transition-colors",
                              isMe 
                                ? "bg-brand-primary/15 border-brand-primary/40 text-white font-bold" 
                                : "bg-white/[0.02] border-white/5 text-slate-300"
                            )}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={cn(
                                "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black uppercase shrink-0",
                                isMe ? "bg-brand-primary text-black" : "bg-slate-800 text-slate-300"
                              )}>
                                {(approver.name || 'U').charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs truncate">{approver.name || 'Usuari'} {isMe && <span className="text-brand-primary text-[10px] ml-1 font-black">(Tu)</span>}</p>
                                <p className="text-[9px] text-slate-500 truncate">{approver.email}</p>
                              </div>
                            </div>
                            {approver.areaId && (
                              <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-white/5 text-slate-400 uppercase tracking-wider shrink-0 ml-2">
                                {getAreaName(approver.areaId)}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-400" />
                    <div>
                      <p className="font-bold text-[11px]">Sense treballador assignat</p>
                      <p className="text-[10px] text-amber-200/80 mt-0.5 leading-relaxed">
                        No hi ha cap treballador actiu amb el rol "{eligibleApprovers.roleName}" assignat a l'àrea {getAreaName(request.areaId || 'social')}. Cal donar d'alta o assignar aquest càrrec des del panell d'Administració.
                      </p>
                    </div>
                  </div>
                )}

                {canApprove && (
                  <div className="p-2.5 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center gap-2 text-brand-primary text-[10px] font-black uppercase tracking-wider">
                    <CheckCircle size={14} />
                    <span>Tens autorització activa per signar aquest expedient</span>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-6">
               <textarea 
                className="input-field text-xs min-h-[120px]" 
                placeholder="Escriu una nota interna, justificació o motiu d'esmena..."
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
                          {getActionLabel(request.status)}
                        </button>
                      </>
                    )}
                  </div>
                  {request.status !== 'tancada' && request.status !== 'rebutjada' && (
                    <button 
                      disabled={isProcessing}
                      onClick={() => handleAction('reject')} 
                      className="w-full py-2 text-[9px] font-black text-slate-600 hover:text-red-500 uppercase tracking-widest transition-colors"
                    >
                      Rebutjar definitivament
                    </button>
                  )}
                </div>
              ) : request.status !== 'tancada' && request.status !== 'rebutjada' ? (
                <div className="p-4 bg-white/[0.01] border border-white/5 rounded-2xl flex items-center gap-3">
                  <div className="p-2 bg-white/5 rounded-lg text-slate-600 shrink-0">
                    <Clock size={16} />
                  </div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-relaxed">
                    Esperant validació de: <span className="text-brand-primary">{eligibleApprovers?.roleName || STATUS_LABELS[request.status]?.label}</span>
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

      {/* Modal Afegir Oferta Comparativa */}
      {showAddQuoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="card max-w-lg w-full p-8 border-brand-primary/30 shadow-2xl relative">
            <button 
              onClick={() => setShowAddQuoteModal(false)}
              className="absolute top-6 right-6 text-slate-500 hover:text-white"
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-black text-white uppercase tracking-tight mb-6 flex items-center gap-3">
              <Award size={20} className="text-brand-primary" /> Afegir Oferta de Pressupost
            </h3>
            
            <form onSubmit={handleAddQuote} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                  Empresa Proveïdora
                </label>
                {suppliers.length > 0 && (
                  <select 
                    className="input-field text-xs mb-2"
                    value={quoteForm.supplierId}
                    onChange={(e) => {
                      const sel = suppliers.find(s => s.id === e.target.value);
                      setQuoteForm(prev => ({
                        ...prev,
                        supplierId: e.target.value,
                        supplierName: sel ? sel.name : prev.supplierName
                      }));
                    }}
                  >
                    <option value="">-- Selecciona de la base de dades o escriu a sota --</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.nif})</option>
                    ))}
                  </select>
                )}
                <input 
                  type="text"
                  placeholder="Nom de l'empresa proveïdora"
                  className="input-field text-xs"
                  value={quoteForm.supplierName}
                  onChange={(e) => setQuoteForm(prev => ({ ...prev, supplierName: e.target.value }))}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                    Import (€ sense IVA / total)
                  </label>
                  <input 
                    type="number"
                    step="0.01"
                    placeholder="ex: 5400"
                    className="input-field text-xs font-bold"
                    value={quoteForm.amount}
                    onChange={(e) => setQuoteForm(prev => ({ ...prev, amount: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                    Puntuació Tècnica (1-10)
                  </label>
                  <input 
                    type="number"
                    min="1"
                    max="10"
                    step="0.5"
                    className="input-field text-xs font-bold"
                    value={quoteForm.technicalScore}
                    onChange={(e) => setQuoteForm(prev => ({ ...prev, technicalScore: Number(e.target.value) }))}
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                  Justificació / Criteris Tècnics
                </label>
                <textarea 
                  className="input-field text-xs min-h-[80px]"
                  placeholder="Detalls del termini d'entrega, qualitat, garantia o raons d'elecció..."
                  value={quoteForm.justification}
                  onChange={(e) => setQuoteForm(prev => ({ ...prev, justification: e.target.value }))}
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                  Adjuntar Document de l'Oferta (Opcional)
                </label>
                <input 
                  type="file"
                  className="text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-brand-primary/10 file:text-brand-primary hover:file:bg-brand-primary/20"
                  onChange={(e) => setQuoteFile(e.target.files ? e.target.files[0] : null)}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowAddQuoteModal(false)}
                  className="btn-secondary flex-1 py-3 text-xs font-black uppercase tracking-widest"
                >
                  Cancel·lar
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmittingQuote}
                  className="btn-primary flex-1 py-3 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2"
                >
                  {isSubmittingQuote && <Loader2 size={16} className="animate-spin" />}
                  <span>Guardar Oferta</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
