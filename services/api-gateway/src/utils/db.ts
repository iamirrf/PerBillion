import { Db, MongoClient, ServerApiVersion } from 'mongodb';
import logger from './logger';

let client: MongoClient | null = null;
let db: Db | null = null;

function buildMongoUri() {
  const host = process.env.MONGODB_HOST || 'localhost';
  const port = process.env.MONGODB_PORT || '27017';
  const database = process.env.MONGODB_DATABASE || 'perbillion';
  const user = process.env.MONGODB_USER;
  const password = process.env.MONGODB_PASSWORD;

  if (user && password) {
    const u = encodeURIComponent(user);
    const p = encodeURIComponent(password);
    return `mongodb://${u}:${p}@${host}:${port}/${database}?authSource=admin`;
  }

  return `mongodb://${host}:${port}/${database}`;
}

export async function getMongoClient(): Promise<MongoClient> {
  if (client) return client;

  const uri = process.env.MONGODB_URI || buildMongoUri();
  client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

  await client.connect();
  logger.info('Connected to MongoDB');
  return client;
}

export async function getDb(): Promise<Db> {
  if (db) return db;
  const mongoClient = await getMongoClient();
  const databaseName = process.env.MONGODB_DATABASE || 'perbillion';
  db = mongoClient.db(databaseName);
  return db;
}

export async function mongoPing(): Promise<boolean> {
  try {
    const database = await getDb();
    await database.command({ ping: 1 });
    return true;
  } catch (err) {
    logger.error('MongoDB ping failed:', err);
    return false;
  }
}

export type UserRole = 'user' | 'advanced' | 'admin';

export type UserDoc = {
  _id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  username?: string | null;
  profilePicture?: string;
  role: UserRole;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLogin: Date | null;
};

export type UserPreferencesDoc = {
  userId: string;
  defaultTicker?: string;
  defaultForecastHorizon?: number;
  advancedModeEnabled?: boolean;
  preferredModel?: string;
  theme?: string;
  createdAt: Date;
  updatedAt: Date;
};

export function getCollections(database: Db) {
  return {
    users: database.collection<UserDoc>('users'),
    userPreferences: database.collection<UserPreferencesDoc>('user_preferences'),
  };
}

process.on('SIGINT', async () => {
  try {
    if (client) {
      await client.close();
      logger.info('MongoDB connection closed');
    }
  } finally {
    process.exit(0);
  }
});
