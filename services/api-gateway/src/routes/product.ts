import { Router, Response } from 'express';
import { randomUUID } from 'crypto';
import axios from 'axios';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { getCollections, getDb } from '../utils/db';
import logger from '../utils/logger';
import { requireAcademyAccess } from '../utils/membership';

const router = Router();
router.use(authenticateToken);
const SPRING_URL = process.env.SPRING_ORCHESTRATOR_URL || 'http://spring-orchestrator:8080';
const scenarioIds = ['steady-growth', 'rate-shock', 'selloff-recovery'] as const;
const assets = [
  { id: 'CORE', name: 'Core Market', role: 'Broad equities', base: 10000, drift: .0018, wave: .012 },
  { id: 'NOVA', name: 'Nova Growth', role: 'Growth companies', base: 7200, drift: .0026, wave: .026 },
  { id: 'HAVN', name: 'Haven Goods', role: 'Defensive equities', base: 5400, drift: .0011, wave: .008 },
  { id: 'BOND', name: 'Bond Basket', role: 'Bonds', base: 4300, drift: .0005, wave: .004 },
  { id: 'MTRL', name: 'Material Mix', role: 'Commodities', base: 6100, drift: .0008, wave: .019 },
] as const;
const assetIds = new Set(assets.map(asset => asset.id));
let indexesReady: Promise<void> | null = null;

export function priceCents(assetId: string, scenarioId: string, day: number) {
  const asset = assets.find(item => item.id === assetId)!;
  const cycle = Math.sin(day * .29 + assets.indexOf(asset) * 1.7) * asset.wave;
  let shock = 0;
  if (scenarioId === 'rate-shock' && day >= 12) {
    const exposure = assetId === 'NOVA' ? -.24 : assetId === 'BOND' ? -.13 : assetId === 'MTRL' ? .07 : -.08;
    shock = exposure * Math.min((day - 11) / 8, 1) + (day > 25 ? -exposure * .35 * Math.min((day - 25) / 20, 1) : 0);
  }
  if (scenarioId === 'selloff-recovery' && day >= 10) {
    const depth = assetId === 'BOND' ? -.035 : assetId === 'HAVN' ? -.12 : -.25;
    shock = depth * Math.min((day - 9) / 7, 1) + (day > 21 ? -depth * .82 * Math.min((day - 21) / 28, 1) : 0);
  }
  const trend = asset.drift * day;
  return Math.max(100, Math.round(asset.base * (1 + trend + cycle + shock)));
}

function initial(userId: string, scenarioId: string) {
  const now = new Date();
  return { userId, scenarioId, runId: randomUUID(), engineVersion: 2, day: 0, cashCents: 1_000_000, initialEquityCents: 1_000_000, positions: {}, trades: [], timeline: [{ day: 0, equityCents: 1_000_000, cashCents: 1_000_000, allocations: {}, recordedAt: now }], revision: 0, processedRequestIds: [], highWaterCents: 1_000_000, maxDrawdown: 0, reflection: '', createdAt: now, updatedAt: now };
}

async function collections() {
  const database = await getDb();
  const all = getCollections(database);
  if (!indexesReady) indexesReady = Promise.all([
    all.practiceSessions.createIndex({ userId: 1, scenarioId: 1 }, { unique: true }),
    all.watchlists.createIndex({ userId: 1, ticker: 1 }, { unique: true }),
    all.researchComparisons.createIndex({ userId: 1, createdAt: -1 }),
  ]).then(() => undefined);
  await indexesReady;
  return all;
}

function view(session: any) {
  const prices = Object.fromEntries(assets.map(asset => [asset.id, priceCents(asset.id, session.scenarioId, session.day)]));
  const positions = Object.entries(session.positions || {}).map(([assetId, units]) => {
    const quantity = Number(units);
    return { assetId, quantity, priceCents: prices[assetId], valueCents: quantity * prices[assetId] };
  });
  const equityCents = session.cashCents + positions.reduce((sum, item) => sum + item.valueCents, 0);
  return { ...session, runId: session.runId || `legacy-${session.scenarioId}`, initialEquityCents: session.initialEquityCents || 1_000_000, timeline: Array.isArray(session.timeline) ? session.timeline : [], assets: assets.map(asset => ({ ...asset, priceCents: prices[asset.id] })), positions, equityCents };
}

function timelinePoint(session: any) {
  const current = view(session);
  const allocations = Object.fromEntries(current.positions.map((item: any) => [item.assetId, current.equityCents ? item.valueCents / current.equityCents : 0]));
  return { day: current.day, equityCents: current.equityCents, cashCents: current.cashCents, allocations, recordedAt: new Date() };
}

router.get('/practice', requireAcademyAccess, async (req: AuthRequest, res: Response) => {
  try {
    const scenarioId = String(req.query.scenario || 'steady-growth');
    if (!scenarioIds.includes(scenarioId as any)) return res.status(400).json({ error: 'Choose a valid scenario' });
    const { practiceSessions } = await collections();
    await practiceSessions.updateOne({ userId: req.user!.id, scenarioId }, { $setOnInsert: initial(req.user!.id, scenarioId) }, { upsert: true });
    res.json(view(await practiceSessions.findOne({ userId: req.user!.id, scenarioId })));
  } catch (error) { logger.error('Practice read failed', error); res.status(500).json({ error: 'Practice portfolio is unavailable' }); }
});

router.post('/practice/actions', requireAcademyAccess, async (req: AuthRequest, res: Response) => {
  try {
    const { scenarioId, action, side, assetId, quantity, expectedRevision, requestId } = req.body || {};
    if (!scenarioIds.includes(scenarioId) || !['trade', 'advance', 'reset', 'import'].includes(action) || !Number.isInteger(expectedRevision) || typeof requestId !== 'string' || !/^[a-zA-Z0-9-]{8,80}$/.test(requestId)) return res.status(400).json({ error: 'Invalid practice action' });
    const { practiceSessions } = await collections();
    let session: any = await practiceSessions.findOne({ userId: req.user!.id, scenarioId });
    if (!session) { await practiceSessions.insertOne(initial(req.user!.id, scenarioId)); session = await practiceSessions.findOne({ userId: req.user!.id, scenarioId }); }
    if (session.processedRequestIds?.includes(requestId)) return res.json(view(session));
    if (session.revision !== expectedRevision) return res.status(409).json({ error: 'Portfolio changed on another device', current: view(session) });
    let next = { ...session, runId: session.runId || randomUUID(), initialEquityCents: session.initialEquityCents || view(session).equityCents, positions: { ...(session.positions || {}) }, timeline: [...(session.timeline || [])], processedRequestIds: [...(session.processedRequestIds || []).slice(-39), requestId], revision: session.revision + 1, updatedAt: new Date() };
    if (action === 'reset') next = { ...initial(req.user!.id, scenarioId), revision: session.revision + 1, processedRequestIds: [requestId], createdAt: session.createdAt };
    if (action === 'import') {
      const cashCents = req.body?.cashCents, coreUnits = req.body?.coreUnits;
      if (session.revision !== 0 || session.trades?.length || Object.keys(session.positions || {}).length) return res.status(409).json({ error: 'Import is available only for a fresh scenario' });
      if (!Number.isInteger(cashCents) || cashCents < 0 || cashCents > 100_000_000 || !Number.isInteger(coreUnits) || coreUnits < 0 || coreUnits > 100_000) return res.status(400).json({ error: 'Previous practice data is invalid' });
      next.cashCents = cashCents;
      next.positions = coreUnits ? { CORE: coreUnits } : {};
      next.trades = [];
    }
    if (action === 'advance') {
      if (session.day >= 60) return res.status(400).json({ error: 'This scenario has reached its final day' });
      next.day = session.day + 1;
    }
    if (action === 'trade') {
      if (!['buy', 'sell'].includes(side) || !assetIds.has(assetId) || !Number.isInteger(quantity) || quantity < 1 || quantity > 10000) return res.status(400).json({ error: 'Enter a valid whole-unit order' });
      const price = priceCents(assetId, scenarioId, session.day), total = price * quantity, held = Number(next.positions[assetId] || 0);
      if (side === 'buy' && total > session.cashCents) return res.status(400).json({ error: 'Not enough virtual cash for this order' });
      if (side === 'sell' && quantity > held) return res.status(400).json({ error: 'You cannot sell more units than you hold' });
      next.cashCents += side === 'buy' ? -total : total;
      next.positions[assetId] = held + (side === 'buy' ? quantity : -quantity);
      if (!next.positions[assetId]) delete next.positions[assetId];
      next.trades = [...(session.trades || []).slice(-99), { id: randomUUID(), requestId, day: session.day, side, assetId, quantity, priceCents: price, createdAt: new Date() }];
    }
    const interim = view(next);
    if (action === 'import') next.initialEquityCents = interim.equityCents;
    if (action !== 'reset') {
      next.highWaterCents = Math.max(session.highWaterCents || 1_000_000, interim.equityCents);
      next.maxDrawdown = Math.max(session.maxDrawdown || 0, (next.highWaterCents - interim.equityCents) / next.highWaterCents);
    }
    if (action !== 'reset') {
      const point = timelinePoint(next);
      const prior = next.timeline[next.timeline.length - 1];
      next.timeline = prior?.day === point.day ? [...next.timeline.slice(0, -1), point] : [...next.timeline, point];
      next.timeline = next.timeline.slice(-121);
    }
    const result = await practiceSessions.replaceOne({ _id: session._id, revision: expectedRevision }, next);
    if (!result.modifiedCount) return res.status(409).json({ error: 'Portfolio changed on another device' });
    res.json(view(next));
  } catch (error: any) { if (error?.code === 11000) return res.status(409).json({ error: 'Portfolio changed; reload and try again' }); logger.error('Practice action failed', error); res.status(500).json({ error: 'Practice action could not be saved' }); }
});

router.get('/practice/debrief', requireAcademyAccess, async (req: AuthRequest, res: Response) => {
  const scenarioId = String(req.query.scenario || 'steady-growth');
  if (!scenarioIds.includes(scenarioId as any)) return res.status(400).json({ error: 'Choose a valid scenario' });
  try {
    const { practiceSessions } = await collections();
    const session: any = await practiceSessions.findOne({ userId: req.user!.id, scenarioId });
    if (!session) return res.status(404).json({ error: 'Start this scenario before opening its debrief' });
    const current = view(session);
    const initial = current.initialEquityCents || 1_000_000;
    const largestPosition = current.positions.reduce((max: number, item: any) => Math.max(max, item.valueCents / Math.max(current.equityCents, 1)), 0);
    return res.json({
      runId: current.runId, scenarioId, day: current.day, complete: current.day >= 60,
      initialEquityCents: initial, finalEquityCents: current.equityCents,
      returnPct: (current.equityCents - initial) / Math.max(initial, 1), maxDrawdown: current.maxDrawdown || 0,
      largestPositionPct: largestPosition, cashPct: current.cashCents / Math.max(current.equityCents, 1),
      trades: current.trades || [], timeline: current.timeline || [], reflection: current.reflection || '',
      benchmark: { label: 'Uninvested virtual cash', returnPct: 0 },
    });
  } catch (error) {
    logger.error('Practice debrief read failed', error);
    return res.status(503).json({ error: 'The scenario debrief is unavailable' });
  }
});

router.put('/practice/debrief', requireAcademyAccess, async (req: AuthRequest, res: Response) => {
  const scenarioId = String(req.body?.scenarioId || '');
  const reflection = typeof req.body?.reflection === 'string' ? req.body.reflection.trim() : '';
  const expectedRevision = req.body?.expectedRevision;
  if (!scenarioIds.includes(scenarioId as any) || reflection.length > 1200 || !Number.isInteger(expectedRevision)) return res.status(400).json({ error: 'Provide a valid scenario, revision, and reflection' });
  try {
    const { practiceSessions } = await collections();
    const result = await practiceSessions.updateOne({ userId: req.user!.id, scenarioId, revision: expectedRevision }, { $set: { reflection, updatedAt: new Date() }, $inc: { revision: 1 } });
    if (!result.matchedCount) return res.status(409).json({ error: 'The scenario changed on another device. Reload the debrief.' });
    return res.json({ saved: true, reflection });
  } catch (error) {
    logger.error('Practice reflection save failed', error);
    return res.status(503).json({ error: 'The reflection could not be saved' });
  }
});

router.get('/overview', async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDb();
    const [mastered, sessions, watchlistCount, comparisonCount, forecasts] = await Promise.all([
      db.collection('learning_mastery').countDocuments({ userId: req.user!.id }),
      db.collection('practice_sessions').find({ userId: req.user!.id }).project({ scenarioId: 1, day: 1, updatedAt: 1, cashCents: 1, positions: 1 }).sort({ updatedAt: -1 }).limit(3).toArray(),
      db.collection('watchlists').countDocuments({ userId: req.user!.id }),
      db.collection('research_comparisons').countDocuments({ userId: req.user!.id }),
      db.collection('forecasts').find({ $or: [{ userId: req.user!.id }, { user_id: req.user!.id }] }).project({ ticker: 1, status: 1, createdAt: 1, created_at: 1, completedAt: 1, completed_at: 1 }).sort({ createdAt: -1, created_at: -1 }).limit(3).toArray(),
    ]);
    const practice = sessions.map(view);
    const recentActivity = [
      ...practice.map(item => ({ type: 'practice', label: `${item.scenarioId.replace(/-/g, ' ')} · day ${item.day + 1}`, occurredAt: item.updatedAt })),
      ...forecasts.map((item: any) => ({ type: 'research', label: `${item.ticker || 'Saved'} forecast · ${item.status || 'saved'}`, occurredAt: item.completedAt || item.completed_at || item.createdAt || item.created_at })),
    ].filter(item => item.occurredAt).sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()).slice(0, 5);
    return res.json({ masteredLessons: mastered, practice, recentResearch: forecasts, recentActivity, watchlistCount, comparisonCount });
  } catch (error) {
    logger.error('Overview read failed', error);
    return res.status(503).json({ error: 'Your workspace summary is temporarily unavailable' });
  }
});

router.get('/watchlist', async (req: AuthRequest, res: Response) => {
  try { const { watchlists } = await collections(); res.json({ tickers: (await watchlists.find({ userId: req.user!.id }).sort({ createdAt: 1 }).toArray()).map(item => item.ticker) }); }
  catch (error) { logger.error('Watchlist read failed', error); res.status(500).json({ error: 'Watchlist is unavailable' }); }
});
router.put('/watchlist/:ticker', async (req: AuthRequest, res: Response) => {
  const ticker = (typeof req.params.ticker === 'string' ? req.params.ticker : '').toUpperCase();
  if (!/^[A-Z]{1,5}$/.test(ticker)) return res.status(400).json({ error: 'Enter a valid ticker' });
  try { const { watchlists } = await collections(); if (await watchlists.countDocuments({ userId: req.user!.id }) >= 20 && !(await watchlists.findOne({ userId: req.user!.id, ticker }))) return res.status(400).json({ error: 'Watchlist limit reached' }); await watchlists.updateOne({ userId: req.user!.id, ticker }, { $setOnInsert: { userId: req.user!.id, ticker, createdAt: new Date() } }, { upsert: true }); res.json({ ticker }); }
  catch (error) { logger.error('Watchlist write failed', error); res.status(500).json({ error: 'Ticker could not be saved' }); }
});
router.delete('/watchlist/:ticker', async (req: AuthRequest, res: Response) => {
  try { const { watchlists } = await collections(); const ticker = (typeof req.params.ticker === 'string' ? req.params.ticker : '').toUpperCase(); if (!/^[A-Z]{1,5}$/.test(ticker)) return res.status(400).json({ error: 'Enter a valid ticker' }); await watchlists.deleteOne({ userId: req.user!.id, ticker }); res.json({ removed: true }); }
  catch (error) { logger.error('Watchlist delete failed', error); res.status(500).json({ error: 'Ticker could not be removed' }); }
});

router.get('/comparisons', async (req: AuthRequest, res: Response) => {
  try { const { researchComparisons } = await collections(); res.json({ comparisons: await researchComparisons.find({ userId: req.user!.id }).sort({ createdAt: -1 }).limit(30).toArray() }); }
  catch (error) { logger.error('Comparison read failed', error); res.status(500).json({ error: 'Saved comparisons are unavailable' }); }
});
router.post('/comparisons', async (req: AuthRequest, res: Response) => {
  try {
    const ids = Array.isArray(req.body?.forecastIds) ? [...new Set(req.body.forecastIds)] : [];
    const name = typeof req.body?.name === 'string' ? req.body.name.trim().slice(0, 80) : '';
    if (ids.length !== 2 || ids.some(id => typeof id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(id))) return res.status(400).json({ error: 'Choose two forecasts to compare' });
    const forecasts = await Promise.all(ids.map(id => axios.get(`${SPRING_URL}/api/v1/forecasts/${id}`, { timeout: 10000 }).then(response => response.data)));
    if (forecasts.some(item => item.userId !== req.user!.id)) return res.status(404).json({ error: 'Forecast not found' });
    if (forecasts[0].ticker !== forecasts[1].ticker) return res.status(400).json({ error: 'Comparisons require the same ticker' });
    const firstMeta = forecasts[0].requestMetadata || {}, secondMeta = forecasts[1].requestMetadata || {};
    const firstSource = forecasts[0].historicalData?.sourceSnapshotId, secondSource = forecasts[1].historicalData?.sourceSnapshotId;
    if (!firstSource || !secondSource || firstSource !== secondSource || firstMeta.forecastHorizon !== secondMeta.forecastHorizon) return res.status(400).json({ error: 'Comparisons require the same source snapshot and weekly horizon' });
    const { researchComparisons } = await collections();
    const runs = forecasts.map(item => ({
      forecastId: item.forecastId,
      modelType: item.modelType,
      status: item.status,
      completedAt: item.completedAt,
      forecastData: item.forecastData,
      metrics: item.metrics,
      requestMetadata: item.requestMetadata,
      provenance: {
        sourceCutoff: item.historicalData?.sourceCutoff,
        sourceSnapshotId: item.historicalData?.sourceSnapshotId,
        observationCount: item.historicalData?.observationCount,
      },
    }));
    const document = { userId: req.user!.id, name: name || `${forecasts[0].ticker} model comparison`, ticker: forecasts[0].ticker, forecastIds: ids, runs, createdAt: new Date() };
    const saved = await researchComparisons.insertOne(document); res.status(201).json({ ...document, _id: saved.insertedId });
  } catch (error) { logger.error('Comparison save failed', error); res.status(500).json({ error: 'Comparison could not be saved' }); }
});

export default router;
