import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { Secret, SignOptions } from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { getDb, getCollections } from '../utils/db';
import logger from '../utils/logger';
import { authRateLimiter } from '../middleware/rateLimiter';
import { randomUUID } from 'crypto';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';

// Register
router.post('/register',
  authRateLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('fullName').trim().notEmpty(),
    body('username').optional().trim().isLength({ min: 3, max: 30 }).matches(/^[a-zA-Z0-9_]+$/),
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
      };
      
      // Add username only if provided
      if (username) {
        userDocument.username = username;
      }
      
      await users.insertOne(userDocument);

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
        { userId: user.id, email: user.email, role: user.role },
        jwtSecret,
        signOptions
      );

      logger.info(`User registered: ${email}`);

      res.status(201).json({
        user,
        token,
      });
    } catch (error) {
      logger.error('Registration error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  }
);

// Login
router.post('/login',
  authRateLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
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
        { userId: String(found._id), email: found.email, role: found.role },
        jwtSecret,
        signOptions
      );

      logger.info(`User logged in: ${email}`);
      
      // Generate avatar URL if not present
      const profilePicture = found.profilePicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(found.username || found.email)}&backgroundColor=fbbf24,ffb300,ffc107`;

      res.json({
        user: {
          id: String(found._id),
          email: found.email,
          fullName: found.fullName,
          username: found.username || null,
          profilePicture,
          role: found.role,
        },
        token,
      });
    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  }
);

export default router;
