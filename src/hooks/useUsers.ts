import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, doc, updateDoc, deleteDoc, addDoc, setDoc, getDocs, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User, UserRole, HierarchyLevel } from '../types';
import { getHierarchyRole, normalizeAreaId, getAreaName } from '../constants';
import { emailService } from '../services/emailService';
import toast from 'react-hot-toast';

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Si no hi ha index, orderBy farà que la query falli. Fem el sort en memòria per seguretat.
    const q = query(collection(db, 'users'));
    
    const normalizeRole = (roleStr: any): UserRole => {
      const r = String(roleStr || '').toLowerCase().trim();
      if (r === 'gerencia') return 'gerencia';
      if (r === 'responsablearea' || r === 'direccio' || r === 'direccio_area') return 'direccio_area';
      if (r === 'coordinacio' || r === 'coordinador') return 'coordinacio';
      if (r === 'finances' || r === 'finanzas' || r === 'administracio') return 'finances';
      if (r === 'superadmin' || r === 'admin') return 'superadmin';
      if (r === 'admin_compres') return 'admin_compres';
      if (r === 'comptabilitat') return 'comptabilitat';
      if (r === 'tecnico' || r === 'tecnic') return 'tecnic';
      return (r as UserRole) || 'tecnic';
    };

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const u = snapshot.docs.map(doc => {
        const raw = doc.data() as any;
        const role = normalizeRole(raw.role);
        const name = raw.name || raw.displayName || (raw.email ? raw.email.split('@')[0] : '') || 'Treballador/a';
        
        // Determinar el nivell jeràrquic (1..6, 99)
        let hierarchyLevel: HierarchyLevel = 1;
        if (typeof raw.hierarchyLevel === 'number') {
          hierarchyLevel = raw.hierarchyLevel as HierarchyLevel;
        } else {
          hierarchyLevel = (getHierarchyRole(role).level as HierarchyLevel) || 1;
        }

        const areaId = normalizeAreaId(raw.areaId || (hierarchyLevel >= 4 ? 'direccio_general' : 'social'));
        const areaName = raw.areaName || getAreaName(areaId);
        
        return {
          ...raw,
          id: String(doc.id),
          name,
          role,
          hierarchyLevel,
          areaId,
          areaName,
          active: raw.active !== false,
          notificationsEnabled: raw.notificationsEnabled !== false,
        } as User;
      }).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setUsers(u);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching users:", error);
      setLoading(false);
      toast.error("Error al carregar els usuaris");
    });

    return () => unsubscribe();
  }, []);

  const getUsersByRole = (roleOrLevel: UserRole | HierarchyLevel | number, areaId?: string) => {
    return users.filter(u => {
      let roleMatch = false;
      if (typeof roleOrLevel === 'number') {
        roleMatch = u.hierarchyLevel === roleOrLevel;
      } else {
        const roleConfig = getHierarchyRole(roleOrLevel);
        roleMatch = u.role === roleOrLevel || u.hierarchyLevel === roleConfig.level;
      }
      
      const areaMatch = areaId ? normalizeAreaId(u.areaId) === normalizeAreaId(areaId) : true;
      return roleMatch && areaMatch;
    });
  };

  const addUser = async (userData: Omit<User, 'id'>, options?: { sendWelcomeEmail?: boolean }) => {
    const now = new Date().toISOString();
    const areaId = normalizeAreaId(userData.areaId);
    const areaName = userData.areaName || getAreaName(areaId);
    const hierarchyLevel = userData.hierarchyLevel || getHierarchyRole(userData.role).level;
    const roleConfig = getHierarchyRole(hierarchyLevel || userData.role);

    // ID = correu en minúscules: les regles de Firestore el fan servir per verificar
    // el rol pre-assignat quan l'usuari entra per primer cop.
    const emailId = (userData.email || '').toLowerCase().trim();
    const payload = {
      ...userData,
      ...(emailId ? { email: emailId } : {}),
      areaId,
      areaName,
      hierarchyLevel,
      createdAt: now,
      updatedAt: now
    };
    let docRef;
    if (emailId) {
      docRef = doc(db, 'users', emailId);
      await setDoc(docRef, payload);
    } else {
      docRef = await addDoc(collection(db, 'users'), payload);
    }

    // Enviar correu automàtic de benvinguda i accés
    if (options?.sendWelcomeEmail !== false && userData.email) {
      try {
        await emailService.sendWelcomeNotification({
          name: userData.name,
          email: userData.email,
          areaName,
          roleName: roleConfig.label,
          hierarchyCode: roleConfig.code
        });
      } catch (err) {
        console.error("Error enviant correu de benvinguda:", err);
      }
    }

    return docRef;
  };

  const sendWelcomeEmail = async (user: User) => {
    const roleConfig = getHierarchyRole(user.hierarchyLevel || user.role);
    const areaName = user.areaName || getAreaName(user.areaId);
    await emailService.sendWelcomeNotification({
      name: user.name,
      email: user.email,
      areaName,
      roleName: roleConfig.label,
      hierarchyCode: roleConfig.code
    });
  };

  const updateUser = async (id: string, data: Partial<User>) => {
    const cleanId = String(id || '').trim();
    if (!cleanId) {
      throw new Error("L'identificador d'usuari no és vàlid.");
    }
    const docRef = doc(db, 'users', cleanId);
    const updatePayload: any = {
      ...data,
      updatedAt: new Date().toISOString()
    };

    if (data.areaId) {
      updatePayload.areaId = normalizeAreaId(data.areaId);
      updatePayload.areaName = data.areaName || getAreaName(updatePayload.areaId);
    }
    if (data.hierarchyLevel && !data.role) {
      updatePayload.role = getHierarchyRole(data.hierarchyLevel).key;
    } else if (data.role && !data.hierarchyLevel) {
      updatePayload.hierarchyLevel = getHierarchyRole(data.role).level;
    }

    await updateDoc(docRef, updatePayload);
  };

  const deleteUser = async (id: string, userEmail?: string) => {
    const cleanId = String(id || '').trim();
    if (!cleanId) {
      throw new Error("L'identificador d'usuari no és vàlid.");
    }
    
    // 1. Eliminar pel document ID principal
    const docRef = doc(db, 'users', cleanId);
    await deleteDoc(docRef);

    // 2. Si es proporciona email o queden duplicats/registres antics, netejar-los també
    if (userEmail) {
      try {
        const q = query(collection(db, 'users'), where('email', '==', userEmail.toLowerCase().trim()));
        const snap = await getDocs(q);
        for (const d of snap.docs) {
          if (d.id !== cleanId) {
            await deleteDoc(d.ref);
          }
        }
      } catch (e) {
        console.warn("No s'han pogut netejar documents secundaris per correu:", e);
      }
    }
  };

  return { users, loading, getUsersByRole, addUser, updateUser, deleteUser, sendWelcomeEmail };
}
