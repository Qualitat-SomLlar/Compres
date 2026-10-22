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
  User as UserIcon,
  ShieldCheck,
  Loader2,
  AlertTriangle,
  FileCheck,
  Users as UsersIcon,
  Download,
  ExternalLink,
  Tag,
  MapPin,
  MessageCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { exportService } from '../services/exportService';
import { STATUS_LABELS, getHierarchyRole, normalizeAreaId, CATEGORIES } from '../constants';
import { User, RequestStatus, AttachmentCategory, PurchaseRequest, Attachment, Quote, ActivityLog } from '../types';
import { cn } from '../lib/utils';
import StatusBadge from '../components/StatusBadge';
import { TimelineStep } from '../components/TimelineStep';
import { AddQuoteModal } from '../components/AddQuoteModal';
import { EmitOrderModal } from '../components/EmitOrderModal';
import { RequestQuotesSection } from '../components/RequestQuotesSection';
import { RequestAttachmentsSection } from '../components/RequestAttachmentsSection';
import { RequestAuditHistory } from '../components/RequestAuditHistory';
import { useRequests } from '../hooks/useRequests';
import { useAreas } from '../hooks/useAreas';
import { useCenters } from '../hooks/useCenters';
import { useNotifications } from '../hooks/useNotifications';
import { useUsers } from '../hooks/useUsers';
import { useSuppliers } from '../hooks/useSuppliers';
import { useEmailDispatcher } from '../hooks/useEmailDispatcher';
import { workflowService } from '../services/workflowService';
import { fileService } from '../services/fileService';
import { activityService } from '../services/activityService';
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
  const { centers } = useCenters();
  
  const request = id ? getRequestById(id) : undefined;
  const [comment, setComment] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Gestió de Documents Adjunts Reals i Enllaços OneDrive / SharePoint
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(true);
  const [showAddLinkModal, setShowAddLinkModal] = useState(false);
  const [linkForm, setLinkForm] = useState({
    title: '',
    url: '',
    category: 'altres' as AttachmentCategory
  });
  const [isSubmittingLink, setIsSubmittingLink] = useState(false);

  // Gestió d'Emissió Formal de Comanda
  const [showEmitOrderModal, setShowEmitOrderModal] = useState(false);
  const [orderSupplierName, setOrderSupplierName] = useState('');
  const [orderSupplierId, setOrderSupplierId] = useState('');
  const [orderProductUrl, setOrderProductUrl] = useState('');
  const [orderFinalAmount, setOrderFinalAmount] = useState<number | string>('');
  const [orderNotes, setOrderNotes] = useState('');

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
  const [quoteUrl, setQuoteUrl] = useState('');
  const [isSubmittingQuote, setIsSubmittingQuote] = useState(false);

  // Historial d'Auditoria de la Sol·licitud
  const [requestLogs, setRequestLogs] = useState<ActivityLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Resolució de dades completes del sol·licitant
  const destinationCenter = centers.find(c => c.id === request?.destinationCenterId);
  const destinationCenterName = request?.destinationCenterName || destinationCenter?.name || (request?.destinationCenterId ? request.destinationCenterId : 'Sense centre especificat');
  
  const categoryItem = CATEGORIES.find(c => c.id === request?.category);
  const categoryLabel = categoryItem?.name || request?.category || 'No categoritzat';
  const subcategoryLabel = request?.subcategory || 'Sense subcategoria';

  const urgencyConfig = {
    baixa: { label: 'Baixa', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    mitjana: { label: 'Mitjana', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    alta: { label: 'Alta', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    critica: { label: 'Crítica', color: 'bg-red-500/10 text-red-400 border-red-500/20' }
  }[request?.urgency || 'mitjana'] || { label: 'Mitjana', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };

  // Historial unificat de comentaris i validacions prèvies per a nivells jeràrquics
  const validationComments = React.useMemo(() => {
    const items: Array<{
      id: string;
      title: string;
      author: string;
      role?: string;
      date?: string;
      comment: string;
      type: 'approval' | 'return' | 'reject' | 'note';
    }> = [];

    if (request?.coordinationComment) {
      items.push({
        id: 'coordination',
        title: 'Validació de Coordinació',
        author: request.coordinationApprovedBy || 'Coordinació',
        role: request.coordinationApproverRole || 'coordinacio',
        date: request.coordinationApprovedAt,
        comment: request.coordinationComment,
        type: 'approval'
      });
    }

    if (request?.areaDirectionComment) {
      items.push({
        id: 'direction',
        title: "Validació de Direcció d'Àrea",
        author: request.areaDirectionApprovedBy || "Direcció d'Àrea",
        role: request.areaDirectionApproverRole || 'direccio_area',
        date: request.areaDirectionApprovedAt,
        comment: request.areaDirectionComment,
        type: 'approval'
      });
    }

    if (request?.financeComment) {
      items.push({
        id: 'finance',
        title: 'Aprovació de Finances',
        author: request.financeApprovedBy || 'Finances',
        role: request.financeApproverRole || 'finances',
        date: request.financeApprovedAt,
        comment: request.financeComment,
        type: 'approval'
      });
    }

    if (request?.lastReturnComment) {
      items.push({
        id: 'return',
        title: 'Retorn per Esmena',
        author: request.lastReturnedBy || 'Validador/a',
        role: request.lastReturnedRole,
        date: request.lastReturnedAt,
        comment: request.lastReturnComment,
        type: 'return'
      });
    }

    if (request?.rejectionComment) {
      items.push({
        id: 'reject',
        title: 'Motiu de Rebuig',
        author: request.rejectedBy || 'Validador/a',
        role: request.rejectedRole,
        date: request.rejectedAt,
        comment: request.rejectionComment,
        type: 'reject'
      });
    }

    // Extracció d'observacions dels logs d'auditoria (per expedients existents o accions registrades)
    if (requestLogs && requestLogs.length > 0) {
      requestLogs.forEach((log) => {
        const logComment = (log.metadata?.comment as string) || '';
        if (logComment && !items.some(it => it.comment.trim() === logComment.trim())) {
          items.push({
            id: `log_${log.id}`,
            title: log.actionTitle || 'Nota d\'auditoria',
            author: log.userName || 'Usuari',
            role: log.userRole,
            date: log.timestamp,
            comment: logComment,
            type: log.actionType === 'request_rejected' ? 'reject' : log.actionType === 'request_returned' ? 'return' : 'note'
          });
        }
      });
    }

    // Fallback a text general d'observacions si no hi ha cap element estructurat
    if (items.length === 0 && request?.observations?.trim()) {
      items.push({
        id: 'observations',
        title: 'Observacions acumulades',
        author: 'Històric',
        comment: request.observations,
        type: 'note'
      });
    }

    return items;
  }, [request, requestLogs]);

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

    // Carregar logs d'auditoria de l'expedient
    setLoadingLogs(true);
    activityService.getLogsByRequestId(request.id).then(logs => {
      setRequestLogs(logs);
      setLoadingLogs(false);
    }).catch(err => {
      console.warn("Error carregant historial de logs:", err);
      setLoadingLogs(false);
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

  const handleOpenEmitOrderModal = () => {
    if (!request) return;
    setOrderSupplierName(request.supplierName || '');
    setOrderSupplierId(request.supplierId || '');
    setOrderProductUrl(request.productUrl || '');
    setOrderFinalAmount(request.finalAmount !== undefined ? request.finalAmount : (request.estimatedAmount || 0));
    setOrderNotes(comment || '');
    setShowEmitOrderModal(true);
  };

  const handleConfirmEmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request) return;

    if (!orderSupplierName.trim()) {
      toast.error('El proveïdor és obligatori per emetre la comanda');
      return;
    }

    let formattedProductUrl = orderProductUrl.trim();
    if (formattedProductUrl && !formattedProductUrl.startsWith('http://') && !formattedProductUrl.startsWith('https://')) {
      formattedProductUrl = 'https://' + formattedProductUrl;
    }

    const numFinal = parseFloat(String(orderFinalAmount));
    const finalAmount = isNaN(numFinal) || numFinal <= 0 ? request.estimatedAmount : numFinal;

    setIsProcessing(true);
    try {
      const newObservations = (orderNotes || comment).trim()
        ? (request.observations 
            ? `${request.observations}\n\n[Comanda ${new Date().toLocaleDateString('ca-ES')} - ${user.name}]: ${(orderNotes || comment).trim()}` 
            : (orderNotes || comment).trim())
        : (request.observations || '');

      const updateData: Partial<PurchaseRequest> = {
        status: 'comanda_emesa',
        supplierName: orderSupplierName.trim(),
        supplierId: orderSupplierId || '',
        productUrl: formattedProductUrl || '',
        finalAmount: finalAmount,
        observations: newObservations
      };

      await updateRequest(request.id, updateData);

      // Notificació al creador
      await addNotification({
        userId: request.createdByUserId,
        title: `Comanda Emesa: ${request.code || request.id}`,
        message: `S'ha emès formalment la comanda al proveïdor ${orderSupplierName.trim()}.`,
        type: 'success',
        requestId: request.id
      });

      if (request.requestingTechnicianId && request.requestingTechnicianId !== request.createdByUserId) {
        await addNotification({
          userId: request.requestingTechnicianId,
          title: `Comanda Emesa: ${request.code || request.id}`,
          message: `S'ha emès formalment la comanda al proveïdor ${orderSupplierName.trim()}.`,
          type: 'success',
          requestId: request.id
        });
      }

      // Notificacions Email (Dispatcher)
      await dispatchEmail(
        'compra_tramitada', 
        { ...request, ...updateData }, 
        { 
          comment: orderNotes || comment, 
          previousStatus: request.status,
          actorName: user?.name,
          actorRole: user?.role
        }
      );

      // Auditoria
      activityService.logRequestAction(
        user,
        'request_updated',
        'Emissió Formal de Comanda',
        request,
        `S'ha emès formalment la comanda al proveïdor "${orderSupplierName.trim()}" per import de ${finalAmount}€.${formattedProductUrl ? ` Enllaç del producte: ${formattedProductUrl}` : ''}`,
        {
          supplierName: orderSupplierName.trim(),
          productUrl: formattedProductUrl,
          finalAmount: finalAmount
        }
      );

      toast.success('Comanda emesa correctament amb el proveïdor assignat!');
      setShowEmitOrderModal(false);
      setComment('');
    } catch (err) {
      console.error("Error emetent comanda:", err);
      toast.error("Error al tramitar l'emissió de la comanda");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAction = async (action: 'approve' | 'return' | 'reject') => {
    if (!request) return;

    // Si estem aprovant a la fase de comanda, és obligatori assignar proveïdor mitjançant el modal
    if (action === 'approve' && request.status === 'aprovada') {
      handleOpenEmitOrderModal();
      return;
    }

    setIsProcessing(true);
    
    try {
      const newStatus = workflowService.getNextStatus(request.status, action);
      
      const nowIso = new Date().toISOString();
      const formattedTimestamp = new Date().toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      const commentWithActor = comment.trim() 
        ? `[${formattedTimestamp} - ${user.name} (${getHierarchyRole(user.role).label})]: ${comment.trim()}` 
        : '';

      const newObservations = commentWithActor 
        ? (request.observations ? `${request.observations}\n\n${commentWithActor}` : commentWithActor) 
        : (request.observations || '');

      const updateData: Partial<PurchaseRequest> = {
        status: newStatus,
        observations: newObservations
      };

      // Afegir timestamps d'aprovació i comentaris estructurats segons la fase o acció
      if (action === 'approve') {
        if (request.status === 'pendent_coordinacio') {
          updateData.coordinationApprovedAt = nowIso;
          updateData.coordinationComment = comment.trim() || undefined;
          updateData.coordinationApprovedBy = user.name;
          updateData.coordinationApproverRole = user.role;
        }
        if (request.status === 'pendent_direccio') {
          updateData.areaDirectionApprovedAt = nowIso;
          updateData.areaDirectionComment = comment.trim() || undefined;
          updateData.areaDirectionApprovedBy = user.name;
          updateData.areaDirectionApproverRole = user.role;
        }
        if (request.status === 'pendent_finances') {
          updateData.financeApprovedAt = nowIso;
          updateData.financeComment = comment.trim() || undefined;
          updateData.financeApprovedBy = user.name;
          updateData.financeApproverRole = user.role;
        }
        if (request.status === 'comanda_emesa') updateData.receivedAt = nowIso;
        if (request.status === 'rebuda') updateData.closedAt = nowIso;
      } else if (action === 'return') {
        updateData.lastReturnComment = comment.trim() || undefined;
        updateData.lastReturnedBy = user.name;
        updateData.lastReturnedRole = user.role;
        updateData.lastReturnedAt = nowIso;
      } else if (action === 'reject') {
        updateData.rejectionComment = comment.trim() || undefined;
        updateData.rejectedBy = user.name;
        updateData.rejectedRole = user.role;
        updateData.rejectedAt = nowIso;
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
      else if (newStatus === 'pendent_coordinacio') eventKey = 'solicitud_creada';
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

      // Registre d'activitat i auditoria
      const logType = action === 'approve' 
        ? 'request_approved' 
        : action === 'reject' 
          ? 'request_rejected' 
          : action === 'return' 
            ? 'request_returned' 
            : 'request_updated';

      const actionTitle = action === 'approve'
        ? `Aprovació / Canvi a ${STATUS_LABELS[newStatus]?.label || newStatus}`
        : action === 'reject'
          ? 'Sol·licitud Rebutjada'
          : action === 'return'
            ? 'Retornada per Esmena'
            : `Actualitzada a ${STATUS_LABELS[newStatus]?.label || newStatus}`;

      const actionDetails = comment 
        ? `Estat actualitzat a "${STATUS_LABELS[newStatus]?.label || newStatus}". Observació: ${comment}`
        : `Estat actualitzat a "${STATUS_LABELS[newStatus]?.label || newStatus}".`;

      activityService.logRequestAction(
        user,
        logType,
        actionTitle,
        { ...request, status: newStatus },
        actionDetails,
        {
          action,
          previousStatus: request.status,
          newStatus,
          comment: comment || undefined
        }
      );

      toast.success(`Acció realitzada: ${STATUS_LABELS[newStatus]?.label}`);
      setComment('');
    } catch (error) {
      console.error(error);
      toast.error("Error al processar l'acció");
    } finally {
      setIsProcessing(false);
    }
  };

  // Afegir enllaç extern (OneDrive / SharePoint / Teams)
  const handleAddExternalLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request) return;
    if (!linkForm.url.trim().startsWith('http://') && !linkForm.url.trim().startsWith('https://')) {
      toast.error("L'enllaç ha de començar per https://");
      return;
    }
    if (!linkForm.title.trim()) {
      toast.error("Indica un nom o descripció per a l'enllaç");
      return;
    }

    setIsSubmittingLink(true);
    try {
      const linkAttachment: Omit<Attachment, 'id'> = {
        purchaseRequestId: request.id,
        fileName: `🔗 ${linkForm.title.trim()}`,
        storagePath: linkForm.url.trim(),
        downloadURL: linkForm.url.trim(),
        mimeType: 'text/uri-list',
        size: 0,
        category: linkForm.category,
        uploadedByUserId: user.id,
        uploadedByUserName: user.name,
        createdAt: new Date().toISOString(),
        status: 'completed'
      };

      const docRef = await addDoc(collection(db, 'attachments'), linkAttachment);
      const newAtt = { id: docRef.id, ...linkAttachment };
      setAttachments(prev => [newAtt, ...prev]);
      await updateRequest(request.id, {
        attachmentsCount: attachments.length + 1
      });

      activityService.logRequestAction(
        user,
        'file_uploaded',
        'Enllaç Extern Vinculat',
        request,
        `S'ha vinculat l'enllaç de OneDrive/SharePoint: "${linkForm.title.trim()}".`,
        {
          url: linkForm.url.trim(),
          category: linkForm.category
        }
      );

      toast.success("Enllaç de OneDrive vinculat correctament!");
      setShowAddLinkModal(false);
      setLinkForm({ title: '', url: '', category: 'altres' });
    } catch (err) {
      console.error("Error vinculant enllaç:", err);
      toast.error("Error vinculant l'enllaç extern");
    } finally {
      setIsSubmittingLink(false);
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
      activityService.logRequestAction(
        user,
        'file_deleted',
        'Eliminació de Document',
        request,
        `S'ha eliminat el fitxer "${att?.name || attachmentId}" de l'expedient.`,
        {
          attachmentId,
          fileName: att?.name
        }
      );
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
      if (quoteUrl.trim()) {
        let formattedQuoteUrl = quoteUrl.trim();
        if (!formattedQuoteUrl.startsWith('http://') && !formattedQuoteUrl.startsWith('https://')) {
          formattedQuoteUrl = 'https://' + formattedQuoteUrl;
        }
        const linkAttachment: Omit<Attachment, 'id'> = {
          purchaseRequestId: request.id,
          fileName: `🔗 Oferta - ${quoteForm.supplierName.trim()}`,
          storagePath: formattedQuoteUrl,
          downloadURL: formattedQuoteUrl,
          mimeType: 'text/uri-list',
          size: 0,
          category: 'pressupost',
          uploadedByUserId: user.id,
          uploadedByUserName: user.name,
          createdAt: new Date().toISOString(),
          status: 'completed'
        };
        const docRef = await addDoc(collection(db, 'attachments'), linkAttachment);
        setAttachments(prev => [{ id: docRef.id, ...linkAttachment }, ...prev]);
        await updateRequest(request.id, {
          attachmentsCount: attachments.length + 1
        });
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
      setQuoteUrl('');
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

      activityService.logRequestAction(
        user,
        'quote_selected',
        'Adjudicació de Pressupost',
        { ...request, supplierName: quote.supplierName, finalAmount: quote.amount },
        `S'ha adjudicat la compra al proveïdor "${quote.supplierName}" per un import de ${quote.amount}€.`,
        {
          quoteId: quote.id,
          supplierName: quote.supplierName,
          amount: quote.amount
        }
      );

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
  const canManageQuotes = workflowService.canManageQuotes(user, request);
  const canDeleteAttachment = (file: Attachment) =>
    workflowService.isAdminProfile(user) || file.uploadedByUserId === user.id;
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
          <button
            onClick={() => {
              try {
                exportService.generatePurchaseOrderPDF(request, quotes, attachments);
                toast.success('Filla de Comanda oficial generada en PDF');
              } catch (err) {
                console.error(err);
                toast.error('Error generant el document PDF');
              }
            }}
            className="btn-secondary py-2 px-4 rounded-xl text-[10px] font-black tracking-widest uppercase flex items-center gap-2 border-brand-primary/30 text-brand-primary hover:bg-brand-primary/10 transition-all shadow-lg"
            title="Descarregar Filla de Comanda Oficial en PDF amb signatures"
          >
            <Download size={14} />
            <span>Filla de Comanda (PDF)</span>
          </button>
          <StatusBadge status={request.status} className="px-6 py-2 rounded-xl text-[10px] font-black tracking-[0.2em] shadow-2xl border text-base" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Detalls Principals */}
        <div className="lg:col-span-2 space-y-10">
          <div className="card overflow-hidden">
            <div className="p-8 md:p-10 border-b border-white/[0.05] bg-white/[0.01] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-brand-primary/5 blur-[100px] -mr-40 -mt-40 rounded-full"></div>
              <div className="flex flex-col md:flex-row justify-between items-start gap-8 relative z-10">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="px-3 py-1 rounded-lg bg-brand-primary/10 border border-brand-primary/20 text-brand-primary font-black uppercase text-[10px] tracking-widest">
                      {request.code || request.id}
                    </span>
                    <span className={cn("px-3 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest", urgencyConfig.color)}>
                      Urgència: {urgencyConfig.label}
                    </span>
                  </div>
                  <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-snug max-w-xl">
                    {request.itemDescription || 'Sol·licitud de compra'}
                  </h1>
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Building2 size={14} className="text-brand-primary" />
                      <strong className="text-white">Àrea:</strong> {request.areaId ? getAreaName(request.areaId) : 'Sense àrea'}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin size={14} className="text-brand-primary" />
                      <strong className="text-white">Destí:</strong> {destinationCenterName}
                    </span>
                  </div>
                </div>

                <div className="text-left md:text-right shrink-0">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2">
                    {request.finalAmount ? "Import Adjudicat / Definitiu" : "Import Estimat"}
                  </p>
                  <p className="text-4xl md:text-5xl font-black text-white tracking-tighter">
                    {((request.finalAmount ?? request.estimatedAmount) || 0).toLocaleString()} <span className="text-2xl text-brand-primary/50">€</span>
                  </p>
                  {request.supplierName && (
                    <div className="flex items-center md:justify-end gap-2 mt-2">
                      <CheckCircle2 size={14} className="text-brand-primary" />
                      <span className="text-xs font-bold text-brand-primary truncate max-w-xs">{request.supplierName}</span>
                    </div>
                  )}
                  {request.productUrl && (
                    <div className="flex items-center md:justify-end gap-2 mt-1">
                      <ExternalLink size={12} className="text-sky-400" />
                      <a 
                        href={request.productUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-xs font-bold text-sky-400 hover:underline truncate max-w-xs inline-flex items-center gap-1"
                      >
                        <span>Enllaç del producte</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Graella de tots els camps de la sol·licitud */}
            <div className="p-8 md:p-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative">
              {/* 1. Centre de Destí */}
              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-1.5">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <MapPin size={13} className="text-brand-primary" /> Centre de Destí
                </p>
                <p className="text-sm font-bold text-slate-200">{destinationCenterName}</p>
                <p className="text-[10px] text-slate-500">Ubicació física o servei destinatari</p>
              </div>

              {/* 2. Imputació Contable / Projecte */}
              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-1.5">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <Building2 size={13} className="text-brand-primary" /> Imputació Contable
                </p>
                <p className="text-sm font-bold text-slate-200">{request.projectId || 'Sense projecte assignat'}</p>
                <p className="text-xs font-black text-brand-primary tracking-wider">{request.analyticCode || 'Sense codi analític'}</p>
              </div>

              {/* 3. Categoria i Subcategoria */}
              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-1.5">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <Tag size={13} className="text-brand-primary" /> Categoria de Compra
                </p>
                <p className="text-sm font-bold text-slate-200">{categoryLabel}</p>
                <p className="text-[10px] text-slate-400">{subcategoryLabel}</p>
              </div>

              {/* 4. Nivell d'Urgència & Termini */}
              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-1.5">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <Calendar size={13} className="text-brand-primary" /> Horitzó Temporal
                </p>
                <p className="text-sm font-bold text-slate-200">
                  {request.deadline ? new Date(request.deadline).toLocaleDateString('ca-ES') : 'Sense data límit'}
                </p>
                <p className="text-[10px] text-slate-500">
                  Prioritat: <span className="font-bold text-slate-300 capitalize">{request.urgency || 'mitjana'}</span>
                </p>
              </div>

              {/* 5. Control de 3 Pressupostos */}
              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-1.5">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <FileCheck size={13} className="text-brand-primary" /> Requisit 3 Pressupostos
                </p>
                <p className={cn(
                  "text-xs font-black uppercase tracking-wider",
                  request.requiresThreeQuotes 
                    ? quotes.length >= 3 ? "text-emerald-400" : "text-amber-400" 
                    : "text-slate-400"
                )}>
                  {request.requiresThreeQuotes ? "Obligatori (>= 5.000€)" : "Compra Directa"}
                </p>
                <p className="text-[10px] text-slate-500">
                  {quotes.length} {quotes.length === 1 ? 'oferta afegida' : 'ofertes afegides'}
                </p>
              </div>

              {/* 6. Proveïdor & Enllaç Web */}
              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-1.5">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <CreditCard size={13} className="text-brand-primary" /> Proveïdor Proposat
                </p>
                <p className="text-sm font-bold text-slate-200 truncate">
                  {request.supplierName || 'No proposat inicialment'}
                </p>
                {request.productUrl ? (
                  <a 
                    href={request.productUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-[10px] text-sky-400 hover:underline flex items-center gap-1 truncate font-medium"
                  >
                    <ExternalLink size={10} /> Enllaç al producte / catàleg
                  </a>
                ) : (
                  <p className="text-[10px] text-slate-500">Sense enllaç de producte</p>
                )}
              </div>

              {/* Secció Sol·licitant i Creador */}
              <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="p-4 rounded-2xl bg-[#0b0f19] border border-white/5 space-y-1">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <UserIcon size={12} className="text-brand-primary" /> Persona Sol·licitant
                  </p>
                  <p className="text-xs font-bold text-white tracking-tight">{request.requestingTechnicianName || 'No assignat'}</p>
                  <p className="text-[10px] text-slate-500 font-medium">{request.requestingTechnicianEmail || 'N/A'}</p>
                </div>
                <div className="p-4 rounded-2xl bg-[#0b0f19] border border-white/5 space-y-1">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <History size={12} className="text-brand-primary" /> Registrat al sistema per
                  </p>
                  <p className="text-xs font-bold text-slate-300 tracking-tight">{request.createdByUserName || 'Usuari'}</p>
                  <p className="text-[10px] text-slate-500 font-medium">
                    {request.createdByUserEmail || 'N/A'} • {request.createdAt ? new Date(request.createdAt).toLocaleDateString('ca-ES') : ''}
                  </p>
                </div>
              </div>

              {/* Memòria Justificativa */}
              <div className="col-span-full space-y-3 pt-6 border-t border-white/[0.05]">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                  <FileText size={13} className="text-brand-primary" /> Memòria Justificativa de la Despesa
                </p>
                <div className="relative p-5 bg-white/[0.01] rounded-2xl border border-white/[0.04]">
                  <p className="text-xs md:text-sm text-slate-300 leading-relaxed italic whitespace-pre-wrap">
                    {request.justification ? `"${request.justification}"` : 'Sense memòria justificativa especificada pel sol·licitant.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Cadena de Validacions i Comentaris Jeràrquics */}
          <div className="card p-8 md:p-10 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/5">
              <div>
                <h3 className="text-xs font-black text-white uppercase tracking-[0.25em] flex items-center gap-2.5">
                  <ShieldCheck size={18} className="text-brand-primary" /> Cadena de Validacions i Comentaris Jeràrquics
                </h3>
                <p className="text-[10px] text-slate-500 mt-1">
                  Flux d'autorització organitzativa: registre cronològic de decisions i observacions de cada nivell.
                </p>
              </div>
              <span className="text-[9px] font-black uppercase px-2.5 py-1 rounded-lg bg-white/5 text-slate-400 tracking-wider">
                Auditoria Oficial
              </span>
            </div>

            {/* Banner destacat si està retornada per esmena */}
            {(request.status === 'retornada' || request.lastReturnComment) && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                    <AlertTriangle size={16} className="text-amber-400" /> Expedient Retornat per Esmena
                  </span>
                  {request.lastReturnedAt && (
                    <span className="text-[10px] text-amber-300/80">
                      {new Date(request.lastReturnedAt).toLocaleString('ca-ES')}
                    </span>
                  )}
                </div>
                {request.lastReturnComment && (
                  <p className="text-xs leading-relaxed italic bg-black/20 p-3 rounded-xl border border-amber-500/20">
                    "{request.lastReturnComment}"
                  </p>
                )}
                <p className="text-[10px] text-amber-400/90 font-bold">
                  Retornat per: {request.lastReturnedBy || 'Validador/a'} {request.lastReturnedRole && `(${getHierarchyRole(request.lastReturnedRole).label})`}
                </p>
              </div>
            )}

            {/* Banner destacat si està rebutjada */}
            {(request.status === 'rebutjada' || request.rejectionComment) && (
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                    <XCircle size={16} className="text-red-400" /> Sol·licitud Rebutjada Definitivament
                  </span>
                  {request.rejectedAt && (
                    <span className="text-[10px] text-red-300/80">
                      {new Date(request.rejectedAt).toLocaleString('ca-ES')}
                    </span>
                  )}
                </div>
                {request.rejectionComment && (
                  <p className="text-xs leading-relaxed italic bg-black/20 p-3 rounded-xl border border-red-500/20">
                    "{request.rejectionComment}"
                  </p>
                )}
                <p className="text-[10px] text-red-400/90 font-bold">
                  Rebutjat per: {request.rejectedBy || 'Validador/a'} {request.rejectedRole && `(${getHierarchyRole(request.rejectedRole).label})`}
                </p>
              </div>
            )}

            {/* Fites de Validació en format targetes jeràrquiques */}
            <div className="space-y-4">
              {/* Nivell 1: Creació */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-black">1</div>
                    <span className="text-xs font-bold text-white">Sol·licitud Registrada</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-black uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle2 size={12} /> Completat
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
                  <span>Sol·licitant: <strong className="text-slate-200">{request.requestingTechnicianName || 'N/A'}</strong></span>
                  <span>Registrat per: <strong className="text-slate-200">{request.createdByUserName}</strong></span>
                  <span>Data: <strong className="text-slate-200">{request.createdAt ? new Date(request.createdAt).toLocaleString('ca-ES') : 'N/A'}</strong></span>
                </div>
              </div>

              {/* Nivell 2: Coordinació */}
              <div className={cn(
                "p-4 rounded-2xl border space-y-2 transition-all",
                request.coordinationApprovedAt 
                  ? "bg-white/[0.02] border-white/5" 
                  : request.status === 'pendent_coordinacio'
                    ? "bg-brand-primary/[0.03] border-brand-primary/30"
                    : "bg-white/[0.01] border-white/[0.03] opacity-60"
              )}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black",
                      request.coordinationApprovedAt ? "bg-emerald-500/20 text-emerald-400" :
                      request.status === 'pendent_coordinacio' ? "bg-amber-500/20 text-amber-400" :
                      "bg-slate-800 text-slate-500"
                    )}>2</div>
                    <span className="text-xs font-bold text-white">Validació de Coordinació</span>
                    <span className="text-[10px] text-slate-500 font-normal">({getAreaName(request.areaId)})</span>
                  </div>
                  {request.coordinationApprovedAt ? (
                    <span className="text-[10px] text-emerald-400 font-black uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle2 size={12} /> Validat
                    </span>
                  ) : request.status === 'pendent_coordinacio' ? (
                    <span className="text-[10px] text-amber-400 font-black uppercase tracking-wider flex items-center gap-1">
                      <Clock size={12} /> Pendent de validació
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-600 font-black uppercase tracking-wider">Pendent</span>
                  )}
                </div>

                {request.coordinationApprovedAt && (
                  <div className="text-[11px] text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
                    <span>Validat per: <strong className="text-slate-200">{request.coordinationApprovedBy || areaCoordinatorsLabel}</strong></span>
                    <span>Data: <strong className="text-slate-200">{new Date(request.coordinationApprovedAt).toLocaleString('ca-ES')}</strong></span>
                  </div>
                )}

                {request.coordinationComment && (
                  <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl space-y-1">
                    <p className="text-[10px] font-black text-brand-primary uppercase tracking-wider flex items-center gap-1">
                      <MessageSquare size={10} /> Comentari de Coordinació:
                    </p>
                    <p className="text-xs text-slate-300 italic whitespace-pre-wrap">
                      "{request.coordinationComment}"
                    </p>
                  </div>
                )}
              </div>

              {/* Nivell 3: Direcció d'Àrea */}
              <div className={cn(
                "p-4 rounded-2xl border space-y-2 transition-all",
                request.areaDirectionApprovedAt 
                  ? "bg-white/[0.02] border-white/5" 
                  : request.status === 'pendent_direccio'
                    ? "bg-brand-primary/[0.03] border-brand-primary/30"
                    : "bg-white/[0.01] border-white/[0.03] opacity-60"
              )}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black",
                      request.areaDirectionApprovedAt ? "bg-emerald-500/20 text-emerald-400" :
                      request.status === 'pendent_direccio' ? "bg-amber-500/20 text-amber-400" :
                      "bg-slate-800 text-slate-500"
                    )}>3</div>
                    <span className="text-xs font-bold text-white">Validació de Direcció d'Àrea</span>
                    <span className="text-[10px] text-slate-500 font-normal">({getAreaName(request.areaId)})</span>
                  </div>
                  {request.areaDirectionApprovedAt ? (
                    <span className="text-[10px] text-emerald-400 font-black uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle2 size={12} /> Validat
                    </span>
                  ) : request.status === 'pendent_direccio' ? (
                    <span className="text-[10px] text-amber-400 font-black uppercase tracking-wider flex items-center gap-1">
                      <Clock size={12} /> Pendent de validació
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-600 font-black uppercase tracking-wider">Pendent</span>
                  )}
                </div>

                {request.areaDirectionApprovedAt && (
                  <div className="text-[11px] text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
                    <span>Validat per: <strong className="text-slate-200">{request.areaDirectionApprovedBy || areaDirectorsLabel}</strong></span>
                    <span>Data: <strong className="text-slate-200">{new Date(request.areaDirectionApprovedAt).toLocaleString('ca-ES')}</strong></span>
                  </div>
                )}

                {request.areaDirectionComment && (
                  <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl space-y-1">
                    <p className="text-[10px] font-black text-brand-primary uppercase tracking-wider flex items-center gap-1">
                      <MessageSquare size={10} /> Comentari de Direcció d'Àrea:
                    </p>
                    <p className="text-xs text-slate-300 italic whitespace-pre-wrap">
                      "{request.areaDirectionComment}"
                    </p>
                  </div>
                )}
              </div>

              {/* Nivell 4: Finances */}
              <div className={cn(
                "p-4 rounded-2xl border space-y-2 transition-all",
                request.financeApprovedAt 
                  ? "bg-white/[0.02] border-white/5" 
                  : request.status === 'pendent_finances'
                    ? "bg-brand-primary/[0.03] border-brand-primary/30"
                    : "bg-white/[0.01] border-white/[0.03] opacity-60"
              )}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black",
                      request.financeApprovedAt ? "bg-emerald-500/20 text-emerald-400" :
                      request.status === 'pendent_finances' ? "bg-amber-500/20 text-amber-400" :
                      "bg-slate-800 text-slate-500"
                    )}>4</div>
                    <span className="text-xs font-bold text-white">Aprovació d'Administració i Finances</span>
                  </div>
                  {request.financeApprovedAt ? (
                    <span className="text-[10px] text-emerald-400 font-black uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle2 size={12} /> Aprovat
                    </span>
                  ) : request.status === 'pendent_finances' ? (
                    <span className="text-[10px] text-amber-400 font-black uppercase tracking-wider flex items-center gap-1">
                      <Clock size={12} /> Pendent d'aprovació
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-600 font-black uppercase tracking-wider">Pendent</span>
                  )}
                </div>

                {request.financeApprovedAt && (
                  <div className="text-[11px] text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
                    <span>Aprovat per: <strong className="text-slate-200">{request.financeApprovedBy || financeLabel}</strong></span>
                    <span>Data: <strong className="text-slate-200">{new Date(request.financeApprovedAt).toLocaleString('ca-ES')}</strong></span>
                  </div>
                )}

                {request.financeComment && (
                  <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl space-y-1">
                    <p className="text-[10px] font-black text-brand-primary uppercase tracking-wider flex items-center gap-1">
                      <MessageSquare size={10} /> Comentari de Finances:
                    </p>
                    <p className="text-xs text-slate-300 italic whitespace-pre-wrap">
                      "{request.financeComment}"
                    </p>
                  </div>
                )}
              </div>

              {/* Nivell 5: Emissió Formal de Comanda i Recepció */}
              {['comanda_emesa', 'rebuda', 'tancada'].includes(request.status) && (
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-black">5</div>
                      <span className="text-xs font-bold text-white">Comanda Tramitada & Adjudicada</span>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-black uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle2 size={12} /> Emesa
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
                    <span>Proveïdor adjudicat: <strong className="text-brand-primary">{request.supplierName || 'N/A'}</strong></span>
                    <span>Import definitiu: <strong className="text-white">{((request.finalAmount ?? request.estimatedAmount) || 0).toLocaleString()}€</strong></span>
                    {request.receivedAt && (
                      <span>Recepció: <strong className="text-slate-200">{new Date(request.receivedAt).toLocaleDateString('ca-ES')}</strong></span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Documents Adjunts Reals */}
          <RequestAttachmentsSection
            attachments={attachments}
            loadingAttachments={loadingAttachments}
            showAddLinkModal={showAddLinkModal}
            setShowAddLinkModal={setShowAddLinkModal}
            linkForm={linkForm}
            setLinkForm={setLinkForm}
            isSubmittingLink={isSubmittingLink}
            handleAddExternalLink={handleAddExternalLink}
            handleDeleteAttachment={handleDeleteAttachment}
            canDeleteAttachment={canDeleteAttachment}
          />

          {/* Secció 3 Pressupostos Reals (Només si > 5000€) */}
          {request.requiresThreeQuotes && (
            <RequestQuotesSection
              quotes={quotes}
              loadingQuotes={loadingQuotes}
              canManageQuotes={canManageQuotes}
              isProcessing={isProcessing}
              setShowAddQuoteModal={setShowAddQuoteModal}
              handleSelectQuote={handleSelectQuote}
              handleDeleteQuote={handleDeleteQuote}
            />
          )}

          {/* Historial d'Auditoria i Traçabilitat de la Sol·licitud */}
          <RequestAuditHistory requestLogs={requestLogs} loadingLogs={loadingLogs} />
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
                role={request.requestingTechnicianName || 'Sol·licitant'} 
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

            {/* Comentaris i Observacions Prèvies de la Jerarquia */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <MessageCircle size={14} className="text-brand-primary" /> Comentaris de Validacions Prèvies ({validationComments.length})
                </span>
              </div>

              {validationComments.length > 0 ? (
                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {validationComments.map((item) => (
                    <div 
                      key={item.id} 
                      className={cn(
                        "p-3 rounded-xl border text-xs space-y-1.5 transition-all",
                        item.type === 'return' ? "bg-amber-500/10 border-amber-500/30 text-amber-200" :
                        item.type === 'reject' ? "bg-red-500/10 border-red-500/30 text-red-200" :
                        "bg-white/[0.03] border-white/10 text-slate-200"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2 text-[10px]">
                        <span className="font-black text-brand-primary uppercase tracking-wider truncate">
                          {item.title}
                        </span>
                        {item.date && (
                          <span className="text-slate-500 text-[9px] shrink-0">
                            {new Date(item.date).toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] leading-relaxed italic text-slate-300 whitespace-pre-wrap">
                        "{item.comment}"
                      </p>
                      <div className="text-[9px] text-slate-400 font-bold flex items-center gap-1.5 pt-0.5">
                        <UserIcon size={10} className="text-slate-500" />
                        <span>{item.author} {item.role && <span className="opacity-75">({getHierarchyRole(item.role).label})</span>}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-[10px] text-slate-500 italic">
                  Sense comentaris previs en aquesta sol·licitud.
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">
                  Afegir comentari o observació a la teva validació:
                </label>
                <textarea 
                  className="input-field text-xs min-h-[110px]" 
                  placeholder="Escriu una nota interna, justificació o motiu d'esmena..."
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                />
              </div>
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
        <AddQuoteModal
          suppliers={suppliers}
          quoteForm={quoteForm}
          setQuoteForm={setQuoteForm}
          quoteUrl={quoteUrl}
          setQuoteUrl={setQuoteUrl}
          isSubmittingQuote={isSubmittingQuote}
          onSubmit={handleAddQuote}
          onClose={() => setShowAddQuoteModal(false)}
        />
      )}

      {/* Modal Emissió Formal de Comanda */}
      {showEmitOrderModal && (
        <EmitOrderModal
          suppliers={suppliers}
          orderSupplierId={orderSupplierId}
          setOrderSupplierId={setOrderSupplierId}
          orderSupplierName={orderSupplierName}
          setOrderSupplierName={setOrderSupplierName}
          orderProductUrl={orderProductUrl}
          setOrderProductUrl={setOrderProductUrl}
          orderFinalAmount={orderFinalAmount}
          setOrderFinalAmount={setOrderFinalAmount}
          orderNotes={orderNotes}
          setOrderNotes={setOrderNotes}
          isProcessing={isProcessing}
          onSubmit={handleConfirmEmitOrder}
          onClose={() => setShowEmitOrderModal(false)}
        />
      )}
    </div>
  );
}

