import React from 'react';
import { FileText, Link2, Loader2, X } from 'lucide-react';
import { Attachment, AttachmentCategory } from '../types';
import AttachmentList from './AttachmentList';

export interface LinkFormState {
  title: string;
  url: string;
  category: AttachmentCategory;
}

interface RequestAttachmentsSectionProps {
  attachments: Attachment[];
  loadingAttachments: boolean;
  showAddLinkModal: boolean;
  setShowAddLinkModal: (value: boolean) => void;
  linkForm: LinkFormState;
  setLinkForm: React.Dispatch<React.SetStateAction<LinkFormState>>;
  isSubmittingLink: boolean;
  handleAddExternalLink: (e: React.FormEvent) => void;
  handleDeleteAttachment: (attachmentId: string) => void;
  canDeleteAttachment: (file: Attachment) => boolean;
}

export function RequestAttachmentsSection({ attachments, loadingAttachments, showAddLinkModal, setShowAddLinkModal, linkForm, setLinkForm, isSubmittingLink, handleAddExternalLink, handleDeleteAttachment, canDeleteAttachment }: RequestAttachmentsSectionProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-3">
          <FileText size={18} className="text-brand-primary" /> Documentació de l'Expedient ({attachments.length})
        </h3>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowAddLinkModal(!showAddLinkModal)}
            className="btn-secondary flex items-center gap-2 py-2 px-3 text-[10px] font-black uppercase tracking-widest border-brand-primary/30 text-brand-primary hover:bg-brand-primary/10"
            title="Enllaçar carpeta o document des de OneDrive, SharePoint o Web"
          >
            <Link2 size={14} />
            <span>{showAddLinkModal ? 'Tancar' : '+ Afegir Document (URL)'}</span>
          </button>
        </div>
      </div>

      {/* Modal / Panell per afegir enllaç de OneDrive / SharePoint */}
      {showAddLinkModal && (
        <form onSubmit={handleAddExternalLink} className="card p-6 border-sky-500/30 bg-sky-500/[0.02] animate-in fade-in space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Link2 size={16} className="text-sky-400" /> Vincular Carpeta o Fitxer de OneDrive / SharePoint
            </span>
            <button type="button" onClick={() => setShowAddLinkModal(false)} className="text-slate-500 hover:text-white">
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Títol o Nom del Document *</label>
              <input 
                type="text" 
                placeholder="Ex: Contracte Signat Som Llar o Carpeta Pressupostos"
                value={linkForm.title}
                onChange={(e) => setLinkForm(prev => ({ ...prev, title: e.target.value }))}
                required
                className="input-field text-xs py-2"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Tipus de Document</label>
              <select
                value={linkForm.category}
                onChange={(e) => setLinkForm(prev => ({ ...prev, category: e.target.value as AttachmentCategory }))}
                className="input-field text-xs py-2"
              >
                <option value="pressupost">Pressupost</option>
                <option value="contracte">Contracte</option>
                <option value="factura">Factura</option>
                <option value="albara">Albarà</option>
                <option value="justificacio">Memòria / Justificació</option>
                <option value="altres">Carpeta General / Altres</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Enllaç Compartit de OneDrive / Teams (URL) *</label>
            <input 
              type="url" 
              placeholder="https://somllar-my.sharepoint.com/:f:/g/personal/..."
              value={linkForm.url}
              onChange={(e) => setLinkForm(prev => ({ ...prev, url: e.target.value }))}
              required
              className="input-field text-xs py-2 font-mono"
            />
            <p className="text-[10px] text-slate-500 mt-1">Enganxa l'enllaç d'accés creat des de OneDrive o Microsoft Teams corporatiu.</p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button 
              type="button" 
              onClick={() => setShowAddLinkModal(false)}
              className="btn-secondary py-1.5 px-3 text-xs"
            >
              Cancel·lar
            </button>
            <button 
              type="submit" 
              disabled={isSubmittingLink}
              className="btn-primary py-1.5 px-4 text-xs font-black uppercase tracking-wider flex items-center gap-2"
            >
              {isSubmittingLink ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
              <span>Desar Enllaç</span>
            </button>
          </div>
        </form>
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
            canDelete={canDeleteAttachment}
          />
        )}
      </div>
    </div>
  );
}
