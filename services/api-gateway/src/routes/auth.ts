import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { Secret, SignOptions } from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { getDb, getCollections } from '../utils/db';
import logger from '../utils/logger';
import { authRateLimiter } from '../middleware/rateLimiter';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { sendAccountEmail } from '../utils/email';
import { recordFunnelEvent } from '../utils/analytics';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;
const publicOrigin = (process.env.PUBLIC_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
let sessionIndexes: Promise<unknown> | null = null;

const hashToken = (value: string) => createHash('sha256').update(value).digest('hex');
function sessionCookieName() { return process.env.NODE_ENV === 'production' ? '__Host-perbillion_session' : 'perbillion_session'; }
function clearSessionCookie(res: Response) {
  res.append('Set-Cookie', `${sessionCookieName()}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
}
async function issueSession(res: Response, user: any) {
  const raw = randomBytes(32).toString('base64url'), csrfToken = randomBytes(24).toString('base64url'), now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_MS);
  const sessions = (await getDb()).collection<any>('auth_sessions');
  if (!sessionIndexes) sessionIndexes = Promise.all([
    sessions.createIndex({ tokenHash: 1 }, { unique: true }),
    sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    sessions.createIndex({ userId: 1, revokedAt: 1 }),
  ]).catch(error => { sessionIndexes = null; throw error; });
  await sessionIndexes;
  await sessions.insertOne({ _id: randomUUID(), userId: String(user._id || user.id), tokenHash: hashToken(raw), csrfToken, authVersion: Number(user.authVersion || 0), createdAt: now, lastSeenAt: now, expiresAt });
  res.append('Set-Cookie', `${sessionCookieName()}=${encodeURIComponent(raw)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MS / 1000}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
  return { csrfToken, expiresAt };
}
async function sendPurposeToken(user: any, purpose: 'verify' | 'reset') {
  const raw = randomBytes(32).toString('base64url'), now = new Date();
  const expiresAt = new Date(now.getTime() + (purpose === 'verify' ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000));
  const field = purpose === 'verify' ? 'verification' : 'reset';
  await (await getDb()).collection<any>('users').updateOne({ _id: user._id }, { $set: { [`${field}TokenHash`]: hashToken(raw), [`${field}ExpiresAt`]: expiresAt, updatedAt: now } });
  const url = `${publicOrigin}/${purpose === 'verify' ? 'verify-email' : 'reset-password'}?token=${encodeURIComponent(raw)}&email=${encodeURIComponent(user.email)}`;
  const subject = purpose === 'verify' ? 'Verify your PerBillion email' : 'Reset your PerBillion password';
  const delivered = await sendAccountEmail(user.email, subject, `<div style="font-family:Arial,sans-serif;background:#090a0b;color:#f4f1e9;padding:36px"><h1>${subject}</h1><p>This secure link expires ${purpose === 'verify' ? 'in 24 hours' : 'in one hour'}.</p><p><a style="color:#d7bc7f" href="${url}">${purpose === 'verify' ? 'Verify email' : 'Choose a new password'}</a></p><p>If you did not request this, you can ignore the message.</p></div>`);
  return delivered;
}

// Register
router.post('/register',
  authRateLimiter,
  [
    body('email').isString().bail().isEmail().isLength({ max: 254 }).normalizeEmail(),
    body('password').isString().bail().isLength({ min: 8 }).custom((value: string) => Buffer.byteLength(value, 'utf8') <= 72),
    body('fullName').isString().bail().trim().isLength({ min: 1, max: 100 }),
    body('username').optional().isString().bail().trim().isLength({ min: 3, max: 30 }).matches(/^[a-zA-Z0-9_]+$/),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, fullName, username } = req.body;

      const database = await getDb();
      const { users } = getCollections(database);

      // Check if user exists
      const existingUser = await users.findOne({ email }, { projection: { _id: 1 } });
      if (existingUser) {
        return res.status(409).json({ error: 'Email already registered' });
      }

      // Check if username is taken
      if (username) {
        const existingUsername = await users.findOne({ username }, { projection: { _id: 1 } });
        if (existingUsername) {
          return res.status(409).json({ error: 'Username already taken' });
        }
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      const userId = randomUUID();
      const now = new Date();
      
      // Generate avatar URL using DiceBear API
      const avatarSeed = username || email;
      const profilePicture = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(avatarSeed)}&backgroundColor=fbbf24,ffb300,ffc107`;

      // Create user document
      const userDocument: any = {
        _id: userId,
        email,
        passwordHash,
        fullName,
        profilePicture,
        role: 'user',
        isActive: true,
        emailVerified: false,
        createdAt: now,
        updatedAt: now,
        lastLogin: null,
        authVersion: 0,
      };
      
      // Add username only if provided
      if (username) {
        userDocument.username = username;
      }
      
      await users.insertOne(userDocument);
      void recordFunnelEvent('registration_completed', userId, {}, `registration:${userId}`);

      const user = {
        id: userId,
        email,
        fullName,
        username: username || null,
        profilePicture,
        role: 'user',
      };

      // Generate token
      const jwtSecret: Secret = JWT_SECRET;
      const signOptions: SignOptions = {
        expiresIn: JWT_EXPIRY as unknown as SignOptions['expiresIn'],
      };
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role, authVersion: 0 },
        jwtSecret,
        signOptions
      );

      logger.info(`User registered: ${email}`);

      const browserSession = req.body?.sessionMode === 'cookie' ? await issueSession(res, userDocument) : null;
      void sendPurposeToken(userDocument, 'verify').catch(error => logger.error('Verification email failed:', error));
      res.status(201).json({
        user,
        token,
        session: browserSession,
      });
    } catch (error: any) {
      logger.error('Registration error:', error);
      if (error?.code === 11000) {
        return res.status(409).json({ error: 'Email or username already registered' });
      }
      res.status(500).json({ error: 'Registration failed' });
    }
  }
);

// Login
router.post('/login',
  authRateLimiter,
  [
    body('email').isString().bail().isEmail().isLength({ max: 254 }).normalizeEmail(),
    body('password').isString().bail().notEmpty().isLength({ max: 1024 }),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      const database = await getDb();
      const { users } = getCollections(database);

      // Find user
      const found = await users.findOne({ email });
      if (!found) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      if (!found.isActive) {
        return res.status(403).json({ error: 'Account is disabled' });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, found.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Update last login
      await users.updateOne(
        { _id: found._id },
        { $set: { lastLogin: new Date(), updatedAt: new Date() } }
      );

      // Generate token
      const jwtSecret: Secret = JWT_SECRET;
      const signOptions: SignOptions = {
        expiresIn: JWT_EXPIRY as unknown as SignOptions['expiresIn'],
      };
      const token = jwt.sign(
        { userId: String(found._id), email: found.email, role: found.role, authVersion: Number(found.authVersion || 0) },
        jwtSecret,
        signOptions
      );

      logger.info(`User logged in: ${email}`);
      
      // Generate avatar URL if not present
      const profilePicture = found.profilePicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(found.username || found.email)}&backgroundColor=fbbf24,ffb300,ffc107`;

      const browserSession = req.body?.sessionMode === 'cookie' ? await issueSession(res, found) : null;
      res.json({
        user: {
          id: String(found._id),
          email: found.email,
          fullName: found.fullName,
          username: found.username || null,
          profilePicture,
          role: found.role,
          emailVerified: Boolean(found.emailVerified),
        },
        token,
        session: browserSession,
      });
    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  }
);

router.get('/session', authenticateToken, async (req: AuthRequest, res: Response) => {
  const user: any = await (await getDb()).collection<any>('users').findOne({ _id: req.user!.id });
  if (!user) return res.status(404).json({ error: 'Account not found' });
  const session: any = req.sessionId ? await (await getDb()).collection<any>('auth_sessions').findOne({ _id: req.sessionId }) : null;
  return res.json({ user: { id: String(user._id), email: user.email, fullName: user.fullName, username: user.username || null, profilePicture: user.profilePicture, role: user.role, emailVerified: Boolean(user.emailVerified) }, csrfToken: session?.csrfToken || null });
});

router.post('/session/upgrade', authenticateToken, async (req: AuthRequest, res: Response) => {
  const user: any = await (await getDb()).collection<any>('users').findOne({ _id: req.user!.id });
  if (!user) return res.status(404).json({ error: 'Account not found' });
  return res.json({ session: await issueSession(res, user) });
});

router.post('/logout', authenticateToken, async (req: AuthRequest, res: Response) => {
  if (req.sessionId) await (await getDb()).collection<any>('auth_sessions').updateOne({ _id: req.sessionId }, { $set: { revokedAt: new Date() } });
  clearSessionCookie(res);
  return res.json({ signedOut: true });
});

router.post('/logout-all', authenticateToken, async (req: AuthRequest, res: Response) => {
  const db = await getDb(), now = new Date();
  await Promise.all([
    db.collection<any>('users').updateOne({ _id: req.user!.id }, { $inc: { authVersion: 1 }, $set: { updatedAt: now } }),
    db.collection<any>('auth_sessions').updateMany({ userId: req.user!.id, revokedAt: { $exists: false } }, { $set: { revokedAt: now } }),
  ]);
  clearSessionCookie(res);
  return res.json({ signedOut: true });
});

router.post('/verification/resend', authenticateToken, authRateLimiter, async (req: AuthRequest, res: Response) => {
  const user: any = await (await getDb()).collection<any>('users').findOne({ _id: req.user!.id });
  if (!user) return res.status(404).json({ error: 'Account not found' });
  if (user.emailVerified) return res.json({ verified: true });
  const delivered = await sendPurposeToken(user, 'verify');
  return res.json({ delivered, message: delivered ? 'Verification email sent.' : 'Email delivery is not configured.' });
});

router.post('/verification/consume', authRateLimiter, async (req: Request, res: Response) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const token = typeof req.body?.token === 'string' ? req.body.token : '';
  if (!email || token.length < 32) return res.status(400).json({ error: 'Invalid verification link' });
  const result = await (await getDb()).collection<any>('users').updateOne(
    { email, verificationTokenHash: hashToken(token), verificationExpiresAt: { $gt: new Date() } },
    { $set: { emailVerified: true, updatedAt: new Date() }, $unset: { verificationTokenHash: '', verificationExpiresAt: '' } },
  );
  if (!result.matchedCount) return res.status(400).json({ error: 'This verification link is invalid or expired' });
  return res.json({ verified: true });
});

router.post('/password/forgot', authRateLimiter, async (req: Request, res: Response) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (email) {
    const user: any = await (await getDb()).collection<any>('users').findOne({ email, isActive: true });
    if (user) void sendPurposeToken(user, 'reset').catch(error => logger.error('Reset email failed:', error));
  }
  return res.json({ message: 'If that account exists, a reset link will arrive shortly.' });
});

router.post('/password/reset', authRateLimiter, async (req: Request, res: Response) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const token = typeof req.body?.token === 'string' ? req.body.token : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!email || token.length < 32 || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) return res.status(400).json({ error: 'Invalid or expired reset request' });
  const db = await getDb(), now = new Date(), passwordHash = await bcrypt.hash(password, 10);
  const result = await db.collection<any>('users').findOneAndUpdate(
    { email, resetTokenHash: hashToken(token), resetExpiresAt: { $gt: now } },
    { $set: { passwordHash, updatedAt: now }, $inc: { authVersion: 1 }, $unset: { resetTokenHash: '', resetExpiresAt: '' } },
    { returnDocument: 'after' },
  );
  if (!result) return res.status(400).json({ error: 'This reset link is invalid or expired' });
  await db.collection<any>('auth_sessions').updateMany({ userId: String(result._id), revokedAt: { $exists: false } }, { $set: { revokedAt: now } });
  return res.json({ reset: true });
});

router.post('/password/change', authenticateToken, async (req: AuthRequest, res: Response) => {
  const currentPassword = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) return res.status(400).json({ error: 'Use a password of 8–72 bytes' });
  const db = await getDb(), user: any = await db.collection<any>('users').findOne({ _id: req.user!.id });
  if (!user || !await bcrypt.compare(currentPassword, user.passwordHash)) return res.status(401).json({ error: 'Current password is incorrect' });
  const now = new Date();
  await db.collection<any>('users').updateOne({ _id: user._id }, { $set: { passwordHash: await bcrypt.hash(password, 10), updatedAt: now }, $inc: { authVersion: 1 } });
  await db.collection<any>('auth_sessions').updateMany({ userId: req.user!.id, revokedAt: { $exists: false } }, { $set: { revokedAt: now } });
  clearSessionCookie(res);
  return res.json({ changed: true });
});

export default router;
