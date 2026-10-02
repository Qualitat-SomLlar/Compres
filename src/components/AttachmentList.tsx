import React from 'react';
import { File, FileText, ImageIcon, Download, Trash2, Clock, User, HardDrive } from 'lucide-react';
import { Attachment } from '../types';
import { ATTACHMENT_CATEGORIES } from '../constants';
import { cn } from '../lib/utils';

interface AttachmentListProps {
  attachments: Attachment[];
  onDelete?: (id: string) => void;
  readOnly?: boolean;
}

export default function AttachmentList({ attachments, onDelete, readOnly }: AttachmentListProps) {
  const getIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <ImageIcon size={20} />;
    if (mimeType.includes('pdf')) return <FileText size={20} />;
    return <File size={20} />;
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (attachments.length === 0) {
    return (
      <div className="py-12 border-2 border-dashed border-white/5 rounded-3xl text-center">
        <HardDrive className="mx-auto text-slate-800 mb-4" size={32} />
        <p className="text-xs text-slate-600 font-bold uppercase tracking-widest">No hi ha documents adjunts</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {attachments.map((file) => (
        <div 
          key={file.id} 
          className="group flex items-start gap-4 p-5 bg-white/[0.01] border border-white/5 rounded-2xl hover:bg-white/[0.02] hover:border-white/10 transition-all duration-300"
        >
          <div className="p-3 bg-brand-primary/10 rounded-xl text-brand-primary group-hover:scale-110 transition-transform">
            {getIcon(file.mimeType)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-black text-brand-primary uppercase tracking-[0.1em]">
                {ATTACHMENT_CATEGORIES.find(c => c.id === file.category)?.name || 'Document'}
              </span>
              <span className="text-[9px] text-slate-600 font-black tabular-nums">{formatSize(file.size)}</span>
            </div>
            
            <h4 className="text-xs font-bold text-white truncate mb-2">{file.fileName}</h4>
            
            <div className="flex flex-wrap items-center gap-4 text-[10px] text-slate-600 font-medium">
              <span className="flex items-center gap-1.5 uppercase tracking-tighter">
                <User size={12} /> {file.uploadedByUserName}
              </span>
              <span className="flex items-center gap-1.5 uppercase tracking-tighter">
                <Clock size={12} /> {new Date(file.createdAt).toLocaleDateString()}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-all">
              <a 
                href={file.downloadURL} 
                download={file.fileName}
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-1.5 bg-brand-primary/10 text-brand-primary hover:bg-brand-primary hover:text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
              >
                <Download size={12} />
                <span>Descarregar / Veure</span>
              </a>
              {!readOnly && onDelete && (
                <button 
                  onClick={() => onDelete(file.id)}
                  className="p-1.5 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
