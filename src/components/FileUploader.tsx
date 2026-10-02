import React, { useState, useCallback } from 'react';
import { Upload, X, File, FileText, ImageIcon, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { ATTACHMENT_CATEGORIES } from '../constants';
import { AttachmentCategory } from '../types';
import CustomSelect from './CustomSelect';

interface FileUploaderProps {
  onUpload: (files: File[], category: AttachmentCategory) => void;
  maxSizeMB?: number;
}

export default function FileUploader({ onUpload, maxSizeMB = 0.75 }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<AttachmentCategory>('pressupost');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files) as File[];
    validateAndUpload(files);
  }, [selectedCategory]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files) as File[];
      validateAndUpload(files);
    }
  };

  // Funció per comprimir imatges en client via Canvas
  const compressImageIfNeeded = async (file: File): Promise<File> => {
    if (!file.type.startsWith('image/')) return file;
    // Si la imatge ja és inferior a 400KB, no cal recomprimir
    if (file.size <= 400 * 1024) return file;

    return new Promise((resolve) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDimension = 1600;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new globalThis.File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
                  type: 'image/jpeg',
                  lastModified: Date.now()
                });
                resolve(compressedFile);
              } else {
                resolve(file);
              }
            },
            'image/jpeg',
            0.75
          );
        } else {
          resolve(file);
        }
      };
      img.onerror = () => resolve(file);
    });
  };

  const validateAndUpload = async (files: File[]) => {
    setError(null);
    setUploading(true);

    try {
      const processedFiles: File[] = [];
      for (const file of files) {
        const optimized = await compressImageIfNeeded(file);
        const sizeMB = optimized.size / (1024 * 1024);
        if (sizeMB > maxSizeMB) {
          setError(`El fitxer "${file.name}" supera el límit (${Math.round(optimized.size / 1024)} KB). El màxim permès és de 750 KB per document.`);
          setUploading(false);
          return;
        }
        processedFiles.push(optimized);
      }

      if (processedFiles.length > 0) {
        onUpload(processedFiles, selectedCategory);
      }
    } catch (err) {
      console.error("Error optimitzant fitxers:", err);
      setError("Error processant els documents.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4 relative z-50">
      <div className="space-y-3 mb-4">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Categoria del Document</label>
        <CustomSelect 
          value={selectedCategory}
          onChange={(v) => setSelectedCategory(v as AttachmentCategory)}
          options={ATTACHMENT_CATEGORIES.map(cat => ({
            value: cat.id,
            label: cat.name
          }))}
        />
      </div>

      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={cn(
          "relative border-2 border-dashed rounded-3xl p-10 transition-all duration-300 flex flex-col items-center justify-center gap-4 group",
          isDragging ? "border-brand-primary bg-brand-primary/5 scale-[1.01]" : "border-white/5 bg-white/[0.01] hover:border-white/10 hover:bg-white/[0.02]",
          uploading && "pointer-events-none opacity-50"
        )}
      >
        <input 
          type="file" 
          multiple 
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        <div className={cn(
          "w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center text-slate-500 transition-all duration-500",
          isDragging ? "scale-110 text-brand-primary border-brand-primary/20 rotate-12" : "group-hover:text-slate-300 group-hover:bg-white/5"
        )}>
          {uploading ? <Loader2 size={32} className="animate-spin" /> : <Upload size={32} />}
        </div>

        <div className="text-center">
          <p className="text-xs font-bold text-white mb-1">
            {uploading ? 'Pujant documents...' : 'Arrossega fitxers o fes clic per buscar'}
          </p>
          <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">
            Màxim 750 KB per fitxer (PDF, JPG, PNG, documents de factura o pressupost)
          </p>
        </div>

        {error && (
          <div className="mt-2 flex items-center gap-2 text-[10px] font-bold text-red-500 bg-red-500/10 px-4 py-2 rounded-xl">
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}
