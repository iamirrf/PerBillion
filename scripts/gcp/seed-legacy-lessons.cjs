// Reuse the Compose seed catalog when MongoDB runs directly on the free VM.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { MongoClient } = require('../../services/api-gateway/node_modules/mongodb');

const root = path.resolve(__dirname, '../..');
const uri = process.env.MONGODB_URI || (process.env.MONGODB_PASSWORD_FILE
  ? `mongodb://perbillion:${encodeURIComponent(fs.readFileSync(process.env.MONGODB_PASSWORD_FILE, 'utf8').trim())}@127.0.0.1:27018/perbillion?authSource=admin&directConnection=true`
  : undefined);
if (!uri) throw new Error('MONGODB_URI or MONGODB_PASSWORD_FILE is required');

const indexes = [];
let lessons = [];
const base = {
  getSiblingDB: () => database,
  createCollection: () => undefined,
};
const database = new Proxy(base, {
  get(target, name) {
    if (name in target) return target[name];
    return {
      createIndex: (key, options) => indexes.push([name, key, options]),
      deleteMany: () => undefined,
      insertMany: (documents) => { if (name === 'lessons') lessons = documents; },
    };
  },
});

const initializer = fs.readFileSync(path.join(root, 'database/mongodb/init.js'), 'utf8');
vm.runInNewContext(initializer, { db: database, print: () => undefined }, { timeout: 1000 });
if (lessons.length !== 30) throw new Error(`Expected 30 prior lessons; found ${lessons.length}`);

(async () => {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
  try {
    await client.connect();
    const db = client.db('perbillion');
    for (const [collection, key, options] of indexes) {
      await db.collection(collection).createIndex(key, options);
    }
    await db.collection('lessons').bulkWrite(lessons.map(lesson => ({
      updateOne: {
        filter: { lessonId: lesson.lessonId },
        update: { $set: lesson },
        upsert: true,
      },
    })));
    console.log(`Seeded ${lessons.length} prior-coursework lessons and ${indexes.length} indexes`);
  } finally {
    await client.close();
  }
})().catch(() => {
  console.error('MongoDB seed failed');
  process.exitCode = 1;
});
