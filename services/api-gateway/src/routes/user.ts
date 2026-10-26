import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { getDb, getCollections } from '../utils/db';
import logger from '../utils/logger';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { GridFSBucket } from 'mongodb';
import { Readable } from 'stream';
import { createHash, randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import { cancelMembershipForDeletion } from './billing';

const router = Router();

// Configure multer for profile picture uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/profiles');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req: any, file, cb) => {
    const userId = req.user?.id || 'unknown';
    const ext = path.extname(file.originalname);
    cb(null, `${userId}-${Date.now()}${ext}`);
  },
});

const persistUploadsInMongo = process.env.PERSIST_UPLOADS_IN_MONGO === 'true';
const upload = multer({
  storage: persistUploadsInMongo ? multer.memoryStorage() : storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb: any) => {
    const extensions: Record<string, string[]> = {
      'image/jpeg': ['.jpeg', '.jpg'], 'image/png': ['.png'], 'image/gif': ['.gif'], 'image/webp': ['.webp'],
    };
    const extname = extensions[file.mimetype]?.includes(path.extname(file.originalname).toLowerCase());
    
    if (extname) {
      return cb(null, true);
    }
    cb(Object.assign(new Error('Choose a JPEG, PNG, GIF, or WebP image'), { status: 400 }));
  },
});

router.use(authenticateToken);

// Get user profile
router.get('/profile', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const database = await getDb();
    const { users } = getCollections(database);
    const user = await users.findOne({ _id: userId });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: String(user._id),
      email: user.email,
      fullName: user.fullName,
      username: user.username,
      profilePicture: user.profilePicture,
      role: user.role,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      emailVerified: Boolean(user.emailVerified),
    });
  } catch (error) {
    logger.error('Profile retrieval error:', error);
    res.status(500).json({ error: 'Failed to retrieve profile' });
  }
});

// Update user profile
router.put('/profile', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { username, fullName } = req.body;

    if ((username !== undefined && username !== null && (typeof username !== 'string' || !/^[a-zA-Z0-9_]{3,30}$/.test(username))) ||
        (fullName !== undefined && (typeof fullName !== 'string' || !fullName.trim() || fullName.trim().length > 100))) {
      return res.status(400).json({ error: 'Enter a valid name and a username of 3–30 letters, numbers, or underscores' });
    }

    const database = await getDb();
    const { users } = getCollections(database);

    // Check if username is taken by another user
    if (username) {
      const existingUser = await users.findOne({ 
        username, 
        _id: { $ne: userId } 
      });
      
      if (existingUser) {
        return res.status(400).json({ error: 'Username already taken' });
      }
    }

    const updateData: any = { updatedAt: new Date() };
    if (username !== undefined && username !== null) updateData.username = username;
    if (fullName !== undefined) updateData.fullName = fullName.trim();

    await users.updateOne(
      { _id: userId },
      { $set: updateData, ...(username === null ? { $unset: { username: '' } } : {}) }
    );

    const updatedUser = await users.findOne({ _id: userId });
    if (!updatedUser) return res.status(404).json({ error: 'User not found' });

    res.json({
      id: String(updatedUser!._id),
      email: updatedUser!.email,
      fullName: updatedUser!.fullName,
      username: updatedUser!.username,
      profilePicture: updatedUser!.profilePicture,
      role: updatedUser!.role,
    });
  } catch (error: any) {
    logger.error('Profile update error:', error);
    if (error?.code === 11000) return res.status(409).json({ error: 'Username already taken' });
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Upload profile picture
router.post('/profile-picture', upload.single('profilePicture'), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const database = await getDb();
    const { users } = getCollections(database);

    const user = await users.findOne({ _id: userId });
    let filename = req.file.filename;
    if (persistUploadsInMongo) {
      filename = `${userId}-${Date.now()}-${randomUUID()}${path.extname(req.file.originalname).toLowerCase()}`;
      const bucket = new GridFSBucket(database, { bucketName: 'profile_images' });
      const stream = bucket.openUploadStream(filename, { metadata: { contentType: req.file.mimetype } });
      await new Promise<void>((resolve, reject) => {
        Readable.from([req.file!.buffer]).pipe(stream).on('finish', resolve).on('error', reject);
      });
    }
    const profilePicturePath = `/uploads/profiles/${filename}`;

    await users.updateOne(
      { _id: userId },
      { $set: { profilePicture: profilePicturePath, updatedAt: new Date() } }
    );

    if (user?.profilePicture?.startsWith('/uploads/profiles/')) {
      const oldFilename = path.basename(user.profilePicture);
      if (persistUploadsInMongo) {
        const bucket = new GridFSBucket(database, { bucketName: 'profile_images' });
        const oldFiles = await bucket.find({ filename: oldFilename }).toArray();
        await Promise.all(oldFiles.map(file => bucket.delete(file._id)));
      } else {
        const oldPath = path.join(__dirname, '../../uploads/profiles', oldFilename);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
    }

    res.json({ 
      profilePicture: profilePicturePath,
      message: 'Profile picture updated successfully' 
    });
  } catch (error) {
    logger.error('Profile picture upload error:', error);
    res.status(500).json({ error: 'Failed to upload profile picture' });
  }
});

// Get user preferences
router.get('/preferences', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const database = await getDb();
    const { userPreferences } = getCollections(database);
    const prefs = await userPreferences.findOne({ userId });

    res.json(prefs || {});
  } catch (error) {
    logger.error('Preferences retrieval error:', error);
    res.status(500).json({ error: 'Failed to retrieve preferences' });
  }
});

// Update user preferences
router.put('/preferences', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const {
      defaultTicker,
      defaultForecastHorizon,
      advancedModeEnabled,
      preferredModel,
      theme,
      learningGoal,
      experienceLevel,
      onboardingComplete,
    } = req.body;

    if ((defaultTicker !== undefined && (typeof defaultTicker !== 'string' || !/^[A-Z]{1,5}$/.test(defaultTicker))) ||
        (defaultForecastHorizon !== undefined && (!Number.isInteger(defaultForecastHorizon) || defaultForecastHorizon < 1 || defaultForecastHorizon > 52)) ||
        (advancedModeEnabled !== undefined && typeof advancedModeEnabled !== 'boolean') ||
        (preferredModel !== undefined && !['auto', 'ARIMA', 'SARIMA', 'SARIMAX', 'HOLT_WINTERS_ADDITIVE', 'HOLT_WINTERS_MULTIPLICATIVE', 'HOLT_WINTERS_DAMPED'].includes(preferredModel)) ||
        (theme !== undefined && !['dark', 'light', 'system', 'black-gold'].includes(theme)) ||
        (learningGoal !== undefined && !['start', 'portfolio', 'quant'].includes(learningGoal)) ||
        (experienceLevel !== undefined && !['new', 'some', 'experienced'].includes(experienceLevel)) ||
        (onboardingComplete !== undefined && typeof onboardingComplete !== 'boolean')) {
      return res.status(400).json({ error: 'Invalid preferences' });
    }

    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries({ defaultTicker, defaultForecastHorizon, advancedModeEnabled, preferredModel, theme, learningGoal, experienceLevel, onboardingComplete })) {
      if (value !== undefined) updates[key] = value;
    }

    const database = await getDb();
    const { userPreferences } = getCollections(database);
    const now = new Date();

    await userPreferences.updateOne(
      { userId },
      {
        $set: {
          ...updates,
          updatedAt: now,
        },
        $setOnInsert: {
          userId,
          createdAt: now,
        },
      },
      { upsert: true }
    );

    const prefs = await userPreferences.findOne({ userId });
    res.json(prefs);
  } catch (error) {
    logger.error('Preferences update error:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

router.get('/data-export', async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDb(), userId = req.user!.id;
    const [user, preferences, priorProgress, currentProgress, mastery, exercises, practice, watchlist, comparisons, forecasts, challenges] = await Promise.all([
      db.collection<any>('users').findOne({ _id: userId }, { projection: { passwordHash: 0, verificationTokenHash: 0, resetTokenHash: 0 } }),
      db.collection('user_preferences').findOne({ userId }),
      db.collection('education_progress').findOne({ userId }),
      db.collection('education_progress_v2').find({ userId }).toArray(),
      db.collection('learning_mastery').find({ userId }).toArray(),
      db.collection('learning_exercises_v3').find({ userId }).toArray(),
      db.collection('practice_sessions').find({ userId }).toArray(),
      db.collection('watchlists').find({ userId }).toArray(),
      db.collection('research_comparisons').find({ userId }).toArray(),
      db.collection('forecasts').find({ $or: [{ userId }, { user_id: userId }] }).toArray(),
      db.collection('challenge_progress').find({ userId }).toArray(),
    ]);
    res.setHeader('Content-Disposition', `attachment; filename="perbillion-data-${new Date().toISOString().slice(0, 10)}.json"`);
    return res.json({ exportedAt: new Date(), user, preferences, learning: { priorProgress, currentProgress, mastery, exercises }, practice, challenges, watchlist, comparisons, forecasts });
  } catch (error) {
    logger.error('Account export failed:', error);
    return res.status(503).json({ error: 'Your data export could not be prepared' });
  }
});

router.delete('/account', async (req: AuthRequest, res: Response) => {
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  try {
    const db = await getDb(), userId = req.user!.id;
    const user: any = await db.collection<any>('users').findOne({ _id: userId });
    if (!user || !await bcrypt.compare(password, user.passwordHash)) return res.status(401).json({ error: 'Enter your password to delete the account' });
    await db.collection('account_deletions').updateOne(
      { userId },
      { $set: { state: 'cancelling-membership', updatedAt: new Date() }, $setOnInsert: { userId, requestedAt: new Date() } },
      { upsert: true },
    );
    await cancelMembershipForDeletion(userId);
    await db.collection('account_deletions').updateOne({ userId }, { $set: { state: 'erasing-data', updatedAt: new Date() } });
    const collections = ['user_preferences', 'education_progress', 'education_progress_v2', 'education_exercises_v2', 'learning_attempts', 'learning_mastery', 'learning_exercises_v3', 'practice_sessions', 'watchlists', 'research_comparisons', 'challenge_progress', 'forecast_requests', 'auth_sessions'];
    await Promise.all(collections.map(name => db.collection(name).deleteMany({ userId })));
    await db.collection('forecasts').deleteMany({ $or: [{ userId }, { user_id: userId }] });
    if (persistUploadsInMongo && user.profilePicture?.startsWith('/uploads/profiles/')) {
      const bucket = new GridFSBucket(db, { bucketName: 'profile_images' });
      const files = await bucket.find({ filename: path.basename(user.profilePicture) }).toArray();
      await Promise.all(files.map(file => bucket.delete(file._id)));
    } else if (user.profilePicture?.startsWith('/uploads/profiles/')) {
      const filename = path.basename(user.profilePicture);
      const uploadPath = path.join(__dirname, '../../uploads/profiles', filename);
      if (fs.existsSync(uploadPath)) fs.unlinkSync(uploadPath);
    }
    await db.collection('funnel_events').updateMany({ userId }, { $set: { userId: null, accountDeleted: true } });
    const userIdHash = createHash('sha256').update(userId).digest('hex');
    await db.collection('account_deletions').updateOne(
      { userId },
      { $set: { userIdHash, state: 'ready-to-delete', updatedAt: new Date() }, $unset: { userId: '' } },
    );
    await db.collection('billing_accounts').deleteOne({ userId });
    await db.collection<any>('users').deleteOne({ _id: userId });
    await db.collection('account_deletions').updateOne({ userIdHash }, { $set: { state: 'complete', completedAt: new Date(), updatedAt: new Date() } });
    res.append('Set-Cookie', `${process.env.NODE_ENV === 'production' ? '__Host-perbillion_session' : 'perbillion_session'}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
    return res.json({ deleted: true, backupRetentionDays: 7 });
  } catch (error) {
    logger.error('Account deletion failed:', error);
    return res.status(503).json({ error: 'The account could not be deleted' });
  }
});

export default router;
