import { Db, MongoClient, ServerApiVersion } from 'mongodb';
import logger from './logger';

let client: MongoClient | null = null;
let db: Db | null = null;
let connection: Promise<MongoClient> | null = null;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} environment variable is required`);
  }
  return value;
}

export async function getMongoClient(): Promise<MongoClient> {
  if (client) return client;
  if (connection) return connection;
  const uri = requireEnv('MONGODB_URI');
  const candidate = new MongoClient(uri, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

  connection = candidate.connect().then(() => {
    client = candidate;
    logger.info('Connected to MongoDB');
    return candidate;
  }).catch(async (error) => {
    await candidate.close().catch(() => undefined);
    throw error;
  }).finally(() => { connection = null; });
  return connection;
}

export async function getDb(): Promise<Db> {
  if (db) return db;
  const databaseName = requireEnv('MONGODB_DATABASE');
  const mongoClient = await getMongoClient();
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
