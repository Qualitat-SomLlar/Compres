import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { collection, addDoc, getDocs, query, where, deleteDoc, doc } from 'firebase/firestore';
import { storage, db } from '../lib/firebase';
import { Attachment, AttachmentCategory } from '../types';

/**
 * Servei per gestionar fitxers amb Firebase Storage i registre documental a Firestore.
 * Dissenyat amb interfície modular preparada per a futura connexió amb Microsoft Graph / SharePoint.
 */
export const fileService = {
  /**
   * Puja un fitxer físic a Firebase Storage i guarda la referència a Firestore.
   */
  async uploadFile(
    file: File, 
    purchaseRequestId: string, 
    category: AttachmentCategory, 
    userId: string,
    userName: string
  ): Promise<Attachment> {
    const timestamp = Date.now();
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `purchaseRequests/${purchaseRequestId}/${timestamp}_${cleanFileName}`;
    const storageRef = ref(storage, storagePath);

    // Pujada a Firebase Storage
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);

    const attachmentData: Omit<Attachment, 'id'> = {
      purchaseRequestId,
      fileName: file.name,
      storagePath,
      downloadURL,
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
   * Obté tots els adjunts associats a un expedient de compra.
   */
  async getAttachments(purchaseRequestId: string): Promise<Attachment[]> {
    try {
      const q = query(
        collection(db, 'attachments'),
        where('purchaseRequestId', '==', purchaseRequestId)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Attachment));
    } catch (error) {
      console.error("Error carregant fitxers adjunts:", error);
      return [];
    }
  },

  /**
   * Elimina un fitxer tant de Firebase Storage com de Firestore.
   */
  async deleteFile(attachmentId: string, storagePath?: string): Promise<void> {
    try {
      // 1. Esborrar de Storage si tenim la ruta
      if (storagePath) {
        try {
          const fileRef = ref(storage, storagePath);
          await deleteObject(fileRef);
        } catch (storageErr) {
          console.warn("No s'ha pogut esborrar el fitxer de Storage:", storageErr);
        }
      }

      // 2. Esborrar de Firestore
      const docRef = doc(db, 'attachments', attachmentId);
      await deleteDoc(docRef);
    } catch (err) {
      console.error("Error eliminant el document:", err);
      throw err;
    }
  }
};
