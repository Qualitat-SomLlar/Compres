import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  CheckCircle, 
  CheckCircle2,
  Clock, 
  FileText, 
  History,
  AlertCircle,
  Building2,
  Calendar,
  CreditCard,
  MessageSquare,
  User as UserIcon,
  Loader2,
  FileCheck,
  Download,
  ExternalLink,
  Tag,
  MapPin,
  Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { exportService } from '../services/exportService';
import { STATUS_LABELS, getHierarchyRole, normalizeAreaId, CATEGORIES } from '../constants';
import { User, RequestStatus, AttachmentCategory, PurchaseRequest, Attachment, Quote, ActivityLog } from '../types';
import { cn } from '../lib/utils';
import StatusBadge from '../components/StatusBadge';
import { AddQuoteModal } from '../components/AddQuoteModal';
import { EmitOrderModal } from '../components/EmitOrderModal';
import { RequestSignatureFlow } from '../components/RequestSignatureFlow';
import { EligibleApproversBox } from '../components/EligibleApproversBox';
import { ValidationCommentsList } from '../components/ValidationCommentsList';
import { RequestValidationChain } from '../components/RequestValidationChain';
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
import { workflowService, WorkflowEvent } from '../services/workflowService';
import { fileService } from '../services/fileService';
import { activityService } from '../services/activityService';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function RequestDetail({ user }: { user: User }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getRequestById, updateRequest, deleteRequest, loading: loadingRequests } = useRequests();
  const { getAreaName } = useAreas();
  const { addNotification } = useNotifications();
  const { dispatchEmail } = useEmailDispatcher();
  const { users } = useUsers();
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
  const centerResponsibleEmails = destinationCenter?.responsibleEmails || [];

  // Notificacions a l'aplicació: mateixos destinataris que els correus de l'esdeveniment
  const notifyInApp = async (event: WorkflowEvent, updatedRequest: PurchaseRequest) => {
    const code = updatedRequest.code || updatedRequest.id;
    const statusLabel = STATUS_LABELS[updatedRequest.status]?.label || updatedRequest.status;
    const recipients = workflowService.getEventRecipients(event, updatedRequest, users, centerResponsibleEmails);
    for (const recipient of recipients) {
      if (!recipient.userId || recipient.userId === user.id) continue;
      const isTask = recipient.template === 'task' || recipient.variant === 'center';
      await addNotification({
        userId: recipient.userId,
        title: isTask ? `Pendent: ${code}` : `Actualització: ${statusLabel}`,
        message: isTask
          ? `Tens l'expedient ${code} pendent d'actuació (${statusLabel}).`
          : `L'expedient ${code} ha passat a l'estat ${statusLabel}.`,
        type: isTask ? 'warning' : event === 'rebutjada' ? 'error' : 'success',
        requestId: updatedRequest.id
      });
    }
  };
  
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

      // Notificacions al sol·licitant i al responsable del centre de destí
      await notifyInApp('compra_tramitada', { ...request, ...updateData } as PurchaseRequest);

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
      // En enviar (o reenviar després d'una esmena), cada càrrec se salta el seu nivell i els inferiors.
      // Si ho fa la supervisió en nom d'algú, compta el càrrec de qui va crear la sol·licitud.
      const isSubmission = action === 'approve' && ['esborrany', 'retornada'].includes(request.status);
      const isRequester = request.createdByUserId === user.id || request.requestingTechnicianId === user.id;
      const submitter = isRequester ? user : (users.find(u => u.id === request.createdByUserId) || user);
      const newStatus = isSubmission
        ? workflowService.getInitialStatus(submitter, request.areaId)
        : workflowService.getNextStatus(request.status, action);
      
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

      if (isSubmission) updateData.initialStatus = newStatus;

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

      // Notificacions (aplicació i correu) segons l'esdeveniment
      const eventKey = workflowService.getEventForTransition(request.status, newStatus, action);

      if (eventKey) {
        await notifyInApp(eventKey, { ...request, ...updateData } as PurchaseRequest);
        await dispatchEmail(
          eventKey, 
          { ...request, ...updateData } as PurchaseRequest, 
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

  // Eliminar l'expedient complet (només Superadmin)
  const handleDeleteRequest = async () => {
    if (!request) return;
    if (!confirm(`Estàs segur que vols eliminar definitivament l'expedient ${request.code || request.id}? S'esborraran també els seus documents adjunts i pressupostos. Aquesta acció no es pot desfer.`)) return;

    setIsProcessing(true);
    try {
      await deleteRequest(request.id);
      activityService.logRequestAction(
        user,
        'request_deleted',
        'Eliminació d\'Expedient',
        request,
        `S'ha eliminat l'expedient ${request.code || request.id} amb els seus adjunts i pressupostos.`
      );
      toast.success('Expedient eliminat correctament');
      navigate('/compres');
    } catch (err) {
      console.error("Error eliminant l'expedient:", err);
      toast.error("No s'ha pogut eliminar l'expedient");
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

  const canApprove = workflowService.canUserApprove(user, request, centerResponsibleEmails);
  const canManageQuotes = workflowService.canManageQuotes(user, request);
  const canDeleteAttachment = (file: Attachment) =>
    workflowService.isAdminProfile(user) || file.uploadedByUserId === user.id;
  const eligibleApprovers = request ? workflowService.getEligibleApprovers(request, users, centerResponsibleEmails) : null;
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
          {user.role === 'superadmin' && (
            <button
              onClick={handleDeleteRequest}
              disabled={isProcessing}
              className="btn-secondary py-2 px-4 rounded-xl text-[10px] font-black tracking-widest uppercase flex items-center gap-2 border-rose-500/30 text-rose-400 hover:bg-rose-500/10 transition-all shadow-lg disabled:opacity-50"
              title="Eliminar definitivament l'expedient (només Superadmin)"
            >
              <Trash2 size={14} />
              <span>Eliminar</span>
            </button>
          )}
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
          <RequestValidationChain
            request={request}
            getAreaName={getAreaName}
            areaCoordinatorsLabel={areaCoordinatorsLabel}
            areaDirectorsLabel={areaDirectorsLabel}
            financeLabel={financeLabel}
          />

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
          <RequestSignatureFlow
            request={request}
            financeLabel={financeLabel}
            areaDirectorsLabel={areaDirectorsLabel}
            areaCoordinatorsLabel={areaCoordinatorsLabel}
          />

          <div className="card p-8">
             <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
              <MessageSquare size={18} className="text-brand-primary" /> Observacions i Validació
            </h4>

            {/* Caixa Informativa d'Aprovadors Designats segons Jerarquia i Àrea */}
            {eligibleApprovers && request.status !== 'tancada' && request.status !== 'rebutjada' && (
              <EligibleApproversBox
                eligibleApprovers={eligibleApprovers}
                isCurrentUserApprover={isCurrentUserApprover}
                canApprove={canApprove}
                user={user}
                request={request}
                getAreaName={getAreaName}
              />
            )}

            {/* Comentaris i Observacions Prèvies de la Jerarquia */}
            <ValidationCommentsList validationComments={validationComments} />

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

