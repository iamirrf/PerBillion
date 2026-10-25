const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
process.env.JWT_SECRET = 'unit-tests-only-never-use-in-production';
process.env.LOG_LEVEL = 'silent';
const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../dist/utils/db');
const catalog = require('../dist/data/curriculum-v2-ids.json');
const rows = new Map();
let indexCalls = 0;
const collection = {
  createIndex: async (_key, options) => { assert.equal(options.unique, true); indexCalls++; return 'userId_1_lessonId_1'; },
  find: query => ({ toArray: async () => [...rows.values()].filter(row => row.userId === query.userId) }),
  findOneAndUpdate: async (query, update) => {
    const key = `${query.userId}:${query.lessonId}`;
    const previous = rows.get(key);
    const next = previous ? { ...previous, score: Math.max(previous.score, update.$max.score) } : {
      ...update.$setOnInsert, score: update.$max.score,
    };
    rows.set(key, next);
    return next;
  },
  deleteMany: async query => {
    for (const [key, row] of rows) if (row.userId === query.userId) rows.delete(key);
    return { deletedCount: 1 };
  },
};
db.getDb = async () => ({ collection: () => collection });
const app = express();
app.use(express.json());
app.use('/education', require('../dist/routes/education').default);
const token = jwt.sign({ userId: 'one', email: 'one@example.com', role: 'user' }, process.env.JWT_SECRET);
const other = jwt.sign({ userId: 'two', email: 'two@example.com', role: 'user' }, process.env.JWT_SECRET);
let server, origin;
before(async () => {
  await new Promise(resolve => { server = app.listen(0, '127.0.0.1', resolve); });
  origin = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { await new Promise(resolve => server.close(resolve)); });
const request = (method, route, auth = token, body) => fetch(origin + '/education' + route, {
  method, headers: { ...(auth ? { authorization: `Bearer ${auth}` } : {}), 'content-type': 'application/json' },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});

test('the API catalog exactly matches the 24 lessons shipped to the frontend', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../../frontend/src/experience/curriculum.ts'), 'utf8');
  const current = source.split('export const lessons: Lesson[] = [', 2)[1];
  const ids = [...current.matchAll(/\bid: '([^']+)'/g)].map(match => match[1]);
  assert.equal(ids.length, 24);
  assert.deepEqual(catalog, ids);
});

test('account progress requires auth and rejects unknown lessons and malformed scores', async () => {
  assert.equal((await request('GET', '/v2/progress', null)).status, 401);
  assert.equal((await request('PUT', `/v2/progress/${catalog[0]}`, null, { score: 100 })).status, 401);
  assert.equal((await request('DELETE', '/v2/progress', null)).status, 401);
  for (const [id, score] of [['not-a-lesson', 100], [catalog[0], '100'], [catalog[0], -1], [catalog[0], 101]]) {
    assert.equal((await request('PUT', `/v2/progress/${id}`, token, { score })).status, 400);
  }
  assert.equal(rows.size, 0);
});

test('progress keeps the highest score, first completion, and account isolation', async () => {
  const first = await request('PUT', `/v2/progress/${catalog[0]}`, token, { score: 80 });
  assert.equal(first.status, 200);
  const firstDate = (await first.json()).completion.completedAt;
  await request('PUT', `/v2/progress/${catalog[0]}`, token, { score: 60 });
  const better = await request('PUT', `/v2/progress/${catalog[0]}`, token, { score: 100 });
  assert.deepEqual((await better.json()).completion, { score: 100, completedAt: firstDate });
  assert.equal((await (await request('GET', '/v2/progress')).json()).completed[catalog[0]].score, 100);
  assert.deepEqual((await (await request('GET', '/v2/progress', other)).json()).completed, {});
  assert.equal(indexCalls, 1);
});

test('reset clears only the selected account current curriculum', async () => {
  await request('PUT', `/v2/progress/${catalog[1]}`, other, { score: 95 });
  assert.equal((await request('DELETE', '/v2/progress')).status, 200);
  assert.deepEqual((await (await request('GET', '/v2/progress')).json()).completed, {});
  assert.equal((await (await request('GET', '/v2/progress', other)).json()).completed[catalog[1]].score, 95);
});
