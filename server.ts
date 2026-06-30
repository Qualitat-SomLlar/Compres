import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { requireAuth, AuthRequest } from "./src/middleware/auth";

import { getApps, initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc, query, where, orderBy, arrayUnion } from 'firebase/firestore';

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const firebaseConfig = require('./firebase-applet-config.json');

const firebaseApp = getApps().find(app => app.name === '[DEFAULT]') || initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId || '(default)');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.post("/api/fcm-tokens", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { token, deviceInfo } = req.body;
      const q = query(collection(db, 'users'), where('uid', '==', req.user!.uid));
      const snap = await getDocs(q);
      if (snap.empty) return res.status(404).json({ error: "User not found" });
      const userId = snap.docs[0].id;

      const tokensRef = collection(db, 'userFcmTokens');
      const tokenQ = query(tokensRef, where('token', '==', token));
      const tokenSnap = await getDocs(tokenQ);
      if (tokenSnap.empty) {
        await setDoc(doc(tokensRef), { userId, token, deviceInfo, createdAt: new Date().toISOString() });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to save token", cause: error.message });
    }
  });

  app.post("/api/auth/sync", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email || "";
      const displayName = req.user!.name || "";

      const q = query(collection(db, 'users'), where('uid', '==', uid));
      const snap = await getDocs(q);
      if (snap.empty) {
        const newDocRef = doc(collection(db, 'users'));
        const newUser = { id: newDocRef.id, uid, email, displayName, role: 'ResponsableArea' };
        await setDoc(newDocRef, newUser);
        res.json(newUser);
      } else {
        const userDoc = snap.docs[0];
        await updateDoc(userDoc.ref, { email, displayName });
        res.json({ id: userDoc.id, ...userDoc.data(), email, displayName });
      }
    } catch (error: any) {
      res.status(500).json({ error: "Failed to sync user", cause: error.message });
    }
  });

  app.get("/api/public/users", async (req, res) => {
    try {
      const snap = await getDocs(collection(db, 'users'));
      res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch users", cause: error.message });
    }
  });

  app.get("/api/users", requireAuth, async (req: AuthRequest, res) => {
    try {
      const snap = await getDocs(collection(db, 'users'));
      res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch users", cause: error.message });
    }
  });

  app.post("/api/users", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { email, displayName, role } = req.body;
      const uid = `custom-${Date.now()}`;
      const newDoc = doc(collection(db, 'users'));
      const userData = { id: newDoc.id, uid, email, displayName, role: role || 'ResponsableArea' };
      await setDoc(newDoc, userData);
      res.json(userData);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to create user", cause: error.message });
    }
  });

  app.put("/api/users/:id/role", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { role } = req.body;
      const { id } = req.params;
      await updateDoc(doc(db, 'users', id), { role });
      res.json({ id, role });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to update user role", cause: error.message });
    }
  });

  app.get("/api/categories", requireAuth, async (req, res) => {
    try {
      const snap = await getDocs(collection(db, 'requestCategories'));
      res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch categories", cause: error.message });
    }
  });

  app.post("/api/categories", requireAuth, async (req, res) => {
    try {
      const { name, description } = req.body;
      const newDoc = doc(collection(db, 'requestCategories'));
      const data = { id: newDoc.id, name, description, createdAt: new Date().toISOString() };
      await setDoc(newDoc, data);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to create category", cause: error.message });
    }
  });

  app.put("/api/categories/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description } = req.body;
      await updateDoc(doc(db, 'requestCategories', id), { name, description });
      res.json({ id, name, description });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to update category", cause: error.message });
    }
  });

  app.delete("/api/categories/:id", requireAuth, async (req, res) => {
    try {
      await deleteDoc(doc(db, 'requestCategories', req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to delete category", cause: error.message });
    }
  });

  app.get("/api/workflows", requireAuth, async (req, res) => {
    try {
      const wSnap = await getDocs(collection(db, 'workflows'));
      const stepsSnap = await getDocs(collection(db, 'workflowSteps'));
      
      const stepsByWf: any = {};
      stepsSnap.docs.forEach(d => {
        const data = { id: d.id, ...d.data() };
        if (!stepsByWf[data.workflowId]) stepsByWf[data.workflowId] = [];
        stepsByWf[data.workflowId].push(data);
      });

      const workflows = wSnap.docs.map(d => {
        const data = { id: d.id, ...d.data() };
        return {
          ...data,
          steps: stepsByWf[data.id] || []
        };
      });
      res.json(workflows);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch workflows", cause: error.message });
    }
  });

  app.post("/api/workflows", requireAuth, async (req, res) => {
    try {
      const { name, categoryId, description } = req.body;
      const newDoc = doc(collection(db, 'workflows'));
      const data = { id: newDoc.id, name, categoryId, description, createdAt: new Date().toISOString() };
      await setDoc(newDoc, data);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to create workflow", cause: error.message });
    }
  });

  app.put("/api/workflows/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { name, categoryId, description } = req.body;
      await updateDoc(doc(db, 'workflows', id), { name, categoryId, description });
      res.json({ id, name, categoryId, description });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to update workflow", cause: error.message });
    }
  });

  app.delete("/api/workflows/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      await deleteDoc(doc(db, 'workflows', id));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to delete workflow", cause: error.message });
    }
  });

  app.post("/api/workflows/:id/steps", requireAuth, async (req, res) => {
    try {
      const { stepOrder, requiredRole, actionName } = req.body;
      const { id } = req.params;
      const newDoc = doc(collection(db, 'workflowSteps'));
      const data = { id: newDoc.id, workflowId: id, stepOrder, requiredRole, actionName, createdAt: new Date().toISOString() };
      await setDoc(newDoc, data);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to add step", cause: error.message });
    }
  });

  app.delete("/api/workflow-steps/:id", requireAuth, async (req, res) => {
    try {
      await deleteDoc(doc(db, 'workflowSteps', req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to delete step", cause: error.message });
    }
  });

  // Workers Routes
  app.get("/api/workers", requireAuth, async (req: AuthRequest, res) => {
    try {
      const snap = await getDocs(collection(db, 'workers'));
      let workers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      workers.sort((a: any, b: any) => (a.workerNumber || 0) - (b.workerNumber || 0));
      res.json(workers);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch workers", cause: error.message });
    }
  });

  app.post("/api/workers", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'Gerencia' && req.user?.role !== 'DireccionAdministracion' && req.user?.role !== 'TecnicaAdministrativa') {
        return res.status(403).json({ error: "Forbidden" });
      }
      const { name, sede, area, workerNumber, gender, email } = req.body;
      const newDoc = doc(collection(db, 'workers'));
      const data = { id: newDoc.id, name, sede, area, workerNumber: parseInt(workerNumber), gender, email, createdAt: new Date().toISOString() };
      await setDoc(newDoc, data);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to create worker", cause: error.message });
    }
  });

  app.put("/api/workers/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'Gerencia' && req.user?.role !== 'DireccionAdministracion' && req.user?.role !== 'TecnicaAdministrativa') {
        return res.status(403).json({ error: "Forbidden" });
      }
      const { id } = req.params;
      const { name, sede, area, workerNumber, gender, email } = req.body;
      const updates: any = {};
      if(name !== undefined) updates.name = name;
      if(sede !== undefined) updates.sede = sede;
      if(area !== undefined) updates.area = area;
      if(workerNumber !== undefined) updates.workerNumber = parseInt(workerNumber) || workerNumber;
      if(gender !== undefined) updates.gender = gender;
      if(email !== undefined) updates.email = email;
      
      await updateDoc(doc(db, 'workers', id.toString()), updates);
      res.json({ id, ...updates });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to update worker", cause: error.message });
    }
  });

  app.delete("/api/workers/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (req.user?.role !== 'Gerencia' && req.user?.role !== 'DireccionAdministracion' && req.user?.role !== 'TecnicaAdministrativa') {
        return res.status(403).json({ error: "Forbidden" });
      }
      await deleteDoc(doc(db, 'workers', req.params.id.toString()));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to delete worker", cause: error.message });
    }
  });

  // Providers Routes
  app.get("/api/providers", requireAuth, async (req: AuthRequest, res) => {
    try {
      const snap = await getDocs(collection(db, 'providers'));
      res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error: any) {
      res.status(500).json({ error: "Database query failed", cause: error.message });
    }
  });

  app.post("/api/providers", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { razonSocial, nif, contactos, ambitoServicio } = req.body;
      const newDoc = doc(collection(db, 'providers'));
      const data = { id: newDoc.id, razonSocial, nif, contactos, ambitoServicio, status: 'Registrado', createdAt: new Date().toISOString() };
      await setDoc(newDoc, data);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to create provider", cause: error.message });
    }
  });

  app.put("/api/providers/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { razonSocial, nif, contactos, ambitoServicio } = req.body;
      await updateDoc(doc(db, 'providers', id), { razonSocial, nif, contactos, ambitoServicio });
      res.json({ id, razonSocial, nif, contactos, ambitoServicio });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to update provider", cause: error.message });
    }
  });

  app.delete("/api/providers/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      await deleteDoc(doc(db, 'providers', req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to delete provider", cause: error.message });
    }
  });

  app.put("/api/providers/:id/status", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { status } = req.body;
      await updateDoc(doc(db, 'providers', req.params.id), { status, updatedAt: new Date().toISOString() });
      res.json({ id: req.params.id, status });
    } catch(e: any) {
      res.status(500).json({ error: "Failed to update provider status", cause: e.message });
    }
  });

  // Purchase Requests Routes
  app.get("/api/purchases", requireAuth, async (req: AuthRequest, res) => {
    try {
      const pSnap = await getDocs(collection(db, 'purchaseRequests'));
      const cSnap = await getDocs(collection(db, 'requestCategories'));
      const uSnap = await getDocs(collection(db, 'users'));
      const provSnap = await getDocs(collection(db, 'providers'));

      const categories: any = {}; cSnap.docs.forEach(d => categories[d.id] = { id: d.id, ...d.data() });
      const users: any = {}; uSnap.docs.forEach(d => users[d.id] = { id: d.id, ...d.data() });
      const providers: any = {}; provSnap.docs.forEach(d => providers[d.id] = { id: d.id, ...d.data() });

      const purchases = pSnap.docs.map(d => {
        const data: any = { id: d.id, ...d.data() };
        data.category = categories[data.categoryId] || null;
        data.requester = users[data.requesterId] || null;
        data.provider = data.providerId ? providers[data.providerId] : null;
        return data;
      });
      res.json(purchases);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch purchases", cause: error.message });
    }
  });

  app.post("/api/purchases", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { categoryId, subcategoria, codigoAnalitico, pis, detalles, providerId, importeEstimado } = req.body;
      
      const q = query(collection(db, 'users'), where('uid', '==', req.user!.uid));
      const uSnap = await getDocs(q);
      if (uSnap.empty) return res.status(404).json({ error: "User not found" });
      const userResult = { id: uSnap.docs[0].id, ...uSnap.docs[0].data() as any };

      const newDoc = doc(collection(db, 'purchaseRequests'));
      const timestamp = new Date().toISOString();
      const historyEntry = {
        status: 'Solicitado',
        timestamp,
        userId: userResult.id,
        userEmail: req.user!.email,
        userName: userResult.displayName || 'Unknown'
      };
      
      const data = {
        id: newDoc.id,
        requesterId: userResult.id,
        categoryId: categoryId.toString(),
        subcategoria,
        codigoAnalitico,
        pis: pis || null,
        detalles,
        providerId: providerId ? providerId.toString() : null,
        importeEstimado: importeEstimado ? importeEstimado.toString() : null,
        status: 'Solicitado',
        createdAt: timestamp,
        history: [historyEntry]
      };
      await setDoc(newDoc, data);

      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to create request", cause: error.message });
    }
  });

  app.put("/api/purchases/:id/status", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { status } = req.body;
      const q = query(collection(db, 'users'), where('uid', '==', req.user!.uid));
      const uSnap = await getDocs(q);
      const userResult = !uSnap.empty ? { id: uSnap.docs[0].id, ...uSnap.docs[0].data() as any } : null;
      
      const historyEntry = {
        status,
        timestamp: new Date().toISOString(),
        userId: userResult ? userResult.id : req.user!.uid,
        userEmail: req.user!.email,
        userName: userResult ? userResult.displayName || 'Unknown' : 'Unknown'
      };

      await updateDoc(doc(db, 'purchaseRequests', req.params.id), { 
        status, 
        updatedAt: new Date().toISOString(),
        history: arrayUnion(historyEntry)
      });
      res.json({ id: req.params.id, status });
    } catch(e: any) {
      res.status(500).json({ error: "Failed to update purchase status", cause: e.message });
    }
  });

  // Annual Planning
  app.get("/api/planning", requireAuth, async (req: AuthRequest, res) => {
    try {
      const snap = await getDocs(collection(db, 'annualPlanning'));
      res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch(err: any) {
      res.status(500).json({ error: "Failed fetching planning data", cause: err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    }).then(vite => {
      app.use(vite.middlewares);
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (process.env.NODE_ENV !== "production" || process.env.RENDER || process.env.RAILWAY_ENVIRONMENT || process.env.K_SERVICE || !process.env.VERCEL) {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }

export default app;
