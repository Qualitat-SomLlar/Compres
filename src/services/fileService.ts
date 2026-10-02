import { collection, addDoc, getDocs, query, where, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Attachment, AttachmentCategory } from '../types';

/**
 * Funció auxiliar per convertir un File a Base64 data URL
 */
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Servei per gestionar fitxers directament a Cloud Firestore (compatible 100% amb el Pla Spark gratuït).
 * Els documents (PDF, imatges, etc.) es guarden en format DataURL (Base64) a la col·lecció 'attachments'.
 */
export const fileService = {
  /**
   * Puja un fitxer convertint-lo a DataURL i emmagatzemant-lo a Firestore.
   */
  async uploadFile(
    file: File, 
    purchaseRequestId: string, 
    category: AttachmentCategory, 
    userId: string, 
    userName: string
  ): Promise<Attachment> {
    // Límit recomanat per a documents en Firestore (Firestore admet documents de fins a 1MB)
    const MAX_FILE_SIZE = 750 * 1024; // 750 KB
    if (file.size > MAX_FILE_SIZE) {
      const sizeKB = Math.round(file.size / 1024);
      throw new Error(`El fitxer "${file.name}" és massa pesat (${sizeKB} KB). El límit per document al sistema és de 750 KB. Si us plau, comprimeix el PDF o la imatge.`);
    }

    const base64Data = await fileToBase64(file);
    const storagePath = `firestore://attachments/${purchaseRequestId}/${file.name}`;

    const attachmentData: Omit<Attachment, 'id'> = {
      purchaseRequestId,
      fileName: file.name,
      storagePath,
      downloadURL: base64Data, // DataURL directament descarregable / visualitzable
      mimeType: file.type || 'application/octet-stream',
      size: file.size,
      category,
      uploadedByUserId: userId,
      uploadedByUserName: userName,
      createdAt: new Date().toISOString(),
      status: 'completed'
    };

    // Guardar a la col·lecció 'attachments' de Firestore
    const docRef = await addDoc(collection(db, 'attachments'), attachmentData);
    return {
      id: docRef.id,
      ...attachmentData
    };
  },

  /**
   * Obté tots els adjunts associats a un expedient de compra des de Firestore.
   */
  async getAttachments(purchaseRequestId: string): Promise<Attachment[]> {
    try {
      const q = query(
        collection(db, 'attachments'),
        where('purchaseRequestId', '==', purchaseRequestId)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        ...doc.data(),
        id: String(doc.id)
      } as Attachment));
    } catch (error) {
      console.error("Error carregant fitxers adjunts des de Firestore:", error);
      return [];
    }
  },

  /**
   * Elimina un fitxer de Firestore.
   */
  async deleteFile(attachmentId: string, _storagePath?: string): Promise<void> {
    try {
      const docRef = doc(db, 'attachments', attachmentId);
      await deleteDoc(docRef);
    } catch (err) {
      console.error("Error eliminant el document:", err);
      throw err;
    }
  }
};

