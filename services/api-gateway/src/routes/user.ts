import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { getDb, getCollections } from '../utils/db';
import logger from '../utils/logger';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

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

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb: any) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed!'));
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
    if (username !== undefined) updateData.username = username;
    if (fullName !== undefined) updateData.fullName = fullName;

    await users.updateOne(
      { _id: userId },
      { $set: updateData }
    );

    const updatedUser = await users.findOne({ _id: userId });

    res.json({
      id: String(updatedUser!._id),
      email: updatedUser!.email,
      fullName: updatedUser!.fullName,
      username: updatedUser!.username,
      profilePicture: updatedUser!.profilePicture,
      role: updatedUser!.role,
    });
  } catch (error) {
    logger.error('Profile update error:', error);
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

    // Get old profile picture to delete it
    const user = await users.findOne({ _id: userId });
    if (user?.profilePicture) {
      const oldPath = path.join(__dirname, '../../uploads/profiles', path.basename(user.profilePicture));
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    // Store relative path
    const profilePicturePath = `/uploads/profiles/${req.file.filename}`;

    await users.updateOne(
      { _id: userId },
      { $set: { profilePicture: profilePicturePath, updatedAt: new Date() } }
    );

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
    } = req.body;

    const database = await getDb();
    const { userPreferences } = getCollections(database);
    const now = new Date();

    await userPreferences.updateOne(
      { userId },
      {
        $set: {
          defaultTicker,
          defaultForecastHorizon,
          advancedModeEnabled,
          preferredModel,
          theme,
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

export default router;
