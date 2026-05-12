import { Attachment, AttachmentCategory } from '../types';

/**
 * Servei per gestionar fitxers amb Firebase Storage.
 * Preparat per integrar-se amb el bucket de l'aplicació.
 */
export const fileService = {
  async uploadFile(file: File, purchaseRequestId: string, category: AttachmentCategory, userId: string): Promise<Attachment> {
    // Simulació de càrrega
    console.log(`Pujant fitxer ${file.name} per la sol·licitud ${purchaseRequestId}...`);
    
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          id: `att-${Math.random().toString(36).substr(2, 9)}`,
          purchaseRequestId,
          fileName: file.name,
          storagePath: `attachments/${purchaseRequestId}/${file.name}`,
          downloadURL: '#', // En producció seria el link de Firebase Storage
          mimeType: file.type,
          size: file.size,
          category,
          uploadedByUserId: userId,
          uploadedByUserName: 'Usuari Actual',
          createdAt: new Date().toISOString()
        });
      }, 1000);
    });
  },

  async deleteFile(attachmentId: string): Promise<void> {
    console.log(`Eliminant fitxer ${attachmentId}...`);
  }
};
