const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
process.env.JWT_SECRET = 'unit-tests-only-never-use-in-production';
process.env.LOG_LEVEL = 'silent';
const express = require('express');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const progress = require('../dist/utils/educationProgress');
const product = require('../dist/routes/product');
const db = require('../dist/utils/db');
const lesson = { _id: 'lesson-db-id', lessonId: 'beginner-1', level: 'beginner', order: 1, title: 'Markets', quiz: [{ question: 'What?' }] };
let saved = { ...progress.initialProgress('learner'), _id: 'immutable-mongo-id' };
let lastUpdate;
let lastForecast;
let forecastPostCount = 0;
const forecastRequests = new Map();
const collection = {
  createIndex: async () => 'index',
  insertOne: async () => ({ insertedId: 'inserted' }),
  find: () => ({ project: () => ({ toArray: async () => [lesson] }) }),
  findOne: async (query) => query.lessonId ? (query.lessonId === lesson.lessonId ? lesson : null) : saved,
  findOneAndUpdate: async () => saved,
  countDocuments: async () => 1,
  updateOne: async (_query, update) => {
    lastUpdate = update;
    if (update.$set) saved = { ...saved, ...update.$set };
    return { matchedCount: 1 };
  },
};
const forecastRequestCollection = {
  createIndex: async () => 'index',
  insertOne: async doc => {
    const key = `${doc.userId}:${doc.requestId}`;
    if (forecastRequests.has(key)) throw Object.assign(new Error('duplicate'), { code: 11000 });
    forecastRequests.set(key, { ...doc });
    return { insertedId: key };
  },
  findOne: async query => forecastRequests.get(`${query.userId}:${query.requestId}`) || null,
  updateOne: async (query, update) => {
    const key = `${query.userId}:${query.requestId}`;
    forecastRequests.set(key, { ...(forecastRequests.get(key) || query), ...(update.$set || {}) });
    return { matchedCount: 1 };
  },
};
db.getDb = async () => ({ collection: name => name === 'forecast_requests' ? forecastRequestCollection : collection });
axios.default.post = async (_url, body) => { forecastPostCount += 1; lastForecast = body; return { data: { forecastId: 'id', status: 'pending' } }; };
const app = express();
app.use(express.json());
app.use('/education', require('../dist/routes/education').default);
app.use('/forecast', require('../dist/routes/forecast').default);
app.use('/auth', require('../dist/routes/auth').default);
app.use('/user', require('../dist/routes/user').default);
let server;
let origin;
const token = jwt.sign({ userId: 'learner', email: 'learner@example.com', role: 'user' }, process.env.JWT_SECRET);
const headers = { 'content-type': 'application/json', authorization: `Bearer ${token}` };
before(async () => {
  await new Promise(resolve => { server = app.listen(0, '127.0.0.1', resolve); });
  origin = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { await new Promise(resolve => server.close(resolve)); });

const request = (path, body, auth = true, extraHeaders = {}) => fetch(origin + path, {
  method: 'POST', headers: { ...(auth ? headers : { 'content-type': 'application/json' }), ...extraHeaders }, body: JSON.stringify(body),
});

test('lesson reads and progress require an authenticated account', async () => {
  assert.equal((await fetch(origin + '/education/lessons')).status, 401);
  const lessons = await fetch(origin + '/education/lessons', { headers });
  assert.equal(lessons.status, 200);
  assert.equal((await lessons.json()).lessons[0].quizLength, 1);
  assert.equal((await fetch(origin + '/education/progress')).status, 401);
  assert.equal((await request('/education/seed', {})).status, 403);
  assert.equal((await fetch(origin + '/education/lessons?level=invalid', { headers })).status, 400);
});

test('completion rejects malformed data and unknown lessons without corrupting progress', async () => {
  for (const body of [
    { lessonId: { $ne: null }, quizScore: 100 },
    { lessonId: 'beginner-1', quizScore: '100' },
    { lessonId: 'beginner-1', quizScore: 101 },
    { lessonId: 'beginner-1', quizScore: 100, timeSpent: -10 },
    { lessonId: 'beginner-1', quizScore: 100, timeSpent: 1500 },
  ]) assert.equal((await request('/education/progress', body)).status, 400);
  assert.equal((await request('/education/progress', { lessonId: 'missing', quizScore: 80 })).status, 404);
});

test('saving progress excludes immutable Mongo IDs and derives newly earned badges on the server', async () => {
  const response = await request('/education/progress', { lessonId: 'beginner-1', quizScore: 100, timeSpent: 5, existingBadges: ['first-lesson'] });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(lastUpdate.$set._id, undefined);
  assert.equal(body.progress._id, undefined);
  assert.equal(body.progress.streakDays, 1);
  assert.deepEqual(body.progress.newBadges.sort(), ['first-lesson', 'perfect-score']);
  const repeated = await request('/education/progress', { lessonId: 'beginner-1', quizScore: 40 });
  const next = (await repeated.json()).progress;
  assert.equal(next.completedLessons.length, 1);
  assert.equal(next.quizScores['beginner-1'], 100);
  assert.equal(next.streakDays, 1);
});

test('streaks follow completion dates across DST and ignore page access dates', () => {
  let state = progress.completeLesson(progress.initialProgress('user'), 'first', 80, 0, new Date('2026-03-07T22:00:00Z'));
  state.lastAccessedAt = new Date('2026-03-08T12:00:00Z');
  state = progress.completeLesson(state, 'second', 80, 0, new Date('2026-03-08T22:00:00Z'));
  assert.equal(state.streakDays, 2);
  state = progress.completeLesson(state, 'third', 80, 0, new Date('2026-03-08T23:00:00Z'));
  assert.equal(state.streakDays, 2);
  state = progress.completeLesson(state, 'fourth', 80, 0, new Date('2026-03-10T12:00:00Z'));
  assert.equal(state.streakDays, 1);
});

test('practice scenario prices are deterministic and scenario-specific', () => {
  assert.equal(product.priceCents('CORE', 'steady-growth', 12), product.priceCents('CORE', 'steady-growth', 12));
  assert.notEqual(product.priceCents('NOVA', 'steady-growth', 20), product.priceCents('NOVA', 'rate-shock', 20));
  assert.ok(product.priceCents('BOND', 'selloff-recovery', 60) > 0);
});

test('forecast validates horizon, requires auth, and associates account ownership', async () => {
  assert.equal((await request('/forecast/generate', { ticker: ['AAPL'] })).status, 400);
  assert.equal((await request('/forecast/generate', { ticker: 'AAPL', forecastMonths: 53 })).status, 400);
  const response = await request('/forecast/generate', { ticker: 'aapl', forecastMonths: 12, modelType: 'auto' }, true, { 'idempotency-key': 'forecast-test-request' });
  assert.equal(response.status, 200);
  assert.equal(lastForecast.userId, 'learner');
  assert.equal(lastForecast.ticker, 'AAPL');
  const duplicate = await request('/forecast/generate', { ticker: 'aapl', forecastMonths: 12, modelType: 'auto' }, true, { 'idempotency-key': 'forecast-test-request' });
  assert.equal(duplicate.status, 200);
  assert.equal(forecastPostCount, 1);
  const guest = await request('/forecast/generate', { ticker: 'MSFT' }, false);
  assert.equal(guest.status, 401);
  assert.equal((await fetch(origin + '/forecast/history?limit=-1', { headers })).status, 400);
});

test('auth rejects object credentials and invalid signatures without redirecting public content', async () => {
  assert.equal((await request('/auth/register', { email: { $ne: null }, password: 'abcdefgh', fullName: 'Name' }, false)).status, 400);
  const invalid = await fetch(origin + '/education/progress', { headers: { authorization: 'Bearer forged' } });
  assert.equal(invalid.status, 401);
  const malformedCookie = await fetch(origin + '/education/progress', { headers: { cookie: 'perbillion_session=%E0%A4%A' } });
  assert.equal(malformedCookie.status, 401);
});

test('preference updates preserve omitted fields and optional usernames can be cleared', async () => {
  const prefs = await fetch(origin + '/user/preferences', { method: 'PUT', headers, body: JSON.stringify({ defaultTicker: 'AAPL' }) });
  assert.equal(prefs.status, 200);
  assert.equal(lastUpdate.$set.defaultTicker, 'AAPL');
  assert.equal(Object.hasOwn(lastUpdate.$set, 'preferredModel'), false);
  const profile = await fetch(origin + '/user/profile', { method: 'PUT', headers, body: JSON.stringify({ username: null, fullName: 'Investor' }) });
  assert.equal(profile.status, 200);
  assert.deepEqual(lastUpdate.$unset, { username: '' });
});
