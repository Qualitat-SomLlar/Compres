import { Request, Response, NextFunction } from 'express';
import { getApps, initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const firebaseConfig = require('../../firebase-applet-config.json');

const firebaseApp = getApps().find(app => app.name === 'AuthMiddlewareApp') || initializeApp(firebaseConfig, 'AuthMiddlewareApp');
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId || '(default)');

export interface AuthRequest extends Request {
  user?: any;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split('Bearer ')[1];
  
  if (token.startsWith('id_')) {
    const id = token.replace('id_', '');
    try {
      const userSnap = await getDoc(doc(db, 'users', id));
      if (userSnap.exists()) {
        req.user = { id: userSnap.id, ...userSnap.data() };
        return next();
      }
    } catch (e) {
      console.error(e);
    }
  }

  // Fallback to mock generic role
  const role = token;
  req.user = {
    uid: `test-user-${role}`,
    email: `${role.toLowerCase()}@example.com`,
    name: `User ${role}`,
    role: role,
    id: 9999
  };
  next();
};
