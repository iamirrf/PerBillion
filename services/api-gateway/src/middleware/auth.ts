import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger';
import { createHash, timingSafeEqual } from 'crypto';
import { getDb } from '../utils/db';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
  authMode?: 'bearer' | 'session';
  sessionId?: string;
}

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

function cookie(req: Request, name: string) {
  const pair = (req.headers.cookie || '').split(';').map(value => value.trim()).find(value => value.startsWith(`${name}=`));
  if (!pair) return undefined;
  try {
    return decodeURIComponent(pair.slice(name.length + 1));
  } catch {
    return undefined;
  }
}

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.match(/^Bearer ([^\s]+)$/i)?.[1];
  if (token) try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    if (typeof decoded === 'string' || typeof decoded.userId !== 'string' ||
        typeof decoded.email !== 'string' || typeof decoded.role !== 'string') {
      return res.status(401).json({ error: 'Invalid access token' });
    }
    // Tokens issued by the session-aware release carry authVersion and are
    // revocable. Pre-release bearer tokens omit it and remain valid only for
    // their original (maximum seven-day) lifetime so existing API clients can
    // make the documented one-time upgrade without being signed out abruptly.
    if (typeof decoded.authVersion === 'number') {
      const user: any = await (await getDb()).collection<any>('users').findOne({ _id: decoded.userId, isActive: true });
      if (!user || Number(user.authVersion || 0) !== decoded.authVersion) {
        return res.status(401).json({ error: 'Access token has been revoked' });
      }
    }
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role
    };
    req.authMode = 'bearer';
    return next();
  } catch (error) {
    logger.error('Token verification failed:', error);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  const rawSession = cookie(req, '__Host-perbillion_session') || cookie(req, 'perbillion_session');
  if (!rawSession || rawSession.length < 32) return res.status(401).json({ error: 'Authentication required' });
  try {
    const tokenHash = createHash('sha256').update(rawSession).digest('hex');
    const db = await getDb();
    const session: any = await db.collection<any>('auth_sessions').findOne({ tokenHash, expiresAt: { $gt: new Date() }, revokedAt: { $exists: false } });
    if (!session) return res.status(401).json({ error: 'Invalid or expired session' });
    const user: any = await db.collection<any>('users').findOne({ _id: session.userId, isActive: true });
    if (!user || Number(user.authVersion || 0) !== Number(session.authVersion || 0)) return res.status(401).json({ error: 'Session has been revoked' });
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      const supplied = String(req.headers['x-csrf-token'] || '');
      const expected = String(session.csrfToken || '');
      if (!supplied || supplied.length !== expected.length || !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) return res.status(403).json({ error: 'Request verification failed' });
    }
    req.user = { id: String(user._id), email: user.email, role: user.role };
    req.authMode = 'session';
    req.sessionId = String(session._id);
    await db.collection<any>('auth_sessions').updateOne({ _id: session._id }, { $set: { lastSeenAt: new Date() } }).catch(() => undefined);
    return next();
  } catch (error) {
    logger.error('Session verification failed:', error);
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
};

// Public tools remain available to guests while associating signed-in activity.
export const optionalAuthenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.headers.authorization && !(req.headers.cookie || '').includes('perbillion_session=')) return next();
  return authenticateToken(req, res, next);
};

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};
