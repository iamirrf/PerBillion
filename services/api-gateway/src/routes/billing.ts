import { Request, Response, Router } from 'express';
import Stripe from 'stripe';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { getDb } from '../utils/db';
import logger from '../utils/logger';
import {
  commercialLaunchEnabled,
  membershipStatus,
  MEMBERSHIP_TRIAL_DAYS,
} from '../utils/membership';
import { recordFunnelEvent } from '../utils/analytics';
import { createHash } from 'crypto';

const router = Router();
const safeReturnTo = (value: unknown) => typeof value === 'string' && /^\/(?!\/)[a-zA-Z0-9/_?=&%+.-]*$/.test(value) ? value : '/app/learn';

function stripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key?.startsWith('sk_test_')) throw new Error('Stripe test mode is not configured');
  return new Stripe(key);
}

function configuredPriceId() {
  const priceId = process.env.STRIPE_MEMBERSHIP_PRICE_ID;
  if (!priceId?.startsWith('price_')) throw new Error('Stripe membership price is not configured');
  return priceId;
}

async function accountByCustomer(customerId: string) {
  return (await getDb()).collection<any>('billing_accounts').findOne({ stripeCustomerId: customerId });
}

async function reconcileSubscription(stripe: Stripe, subscriptionId: string, expectedUserId?: string) {
  const subscription: any = await stripe.subscriptions.retrieve(subscriptionId, { expand: ['items.data.price'] });
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;
  if (!customerId) throw new Error('Subscription has no customer');
  const existing = await accountByCustomer(customerId);
  const userId = expectedUserId || existing?.userId || subscription.metadata?.userId;
  if (!userId || (expectedUserId && existing?.userId && existing.userId !== expectedUserId)) throw new Error('Subscription ownership could not be verified');
  const userIdHash = createHash('sha256').update(userId).digest('hex');
  const deletion = await (await getDb()).collection('account_deletions').findOne({ $or: [{ userId }, { userIdHash }] });
  if (existing?.deletedAt || ['ready-to-delete', 'complete'].includes(String(deletion?.state))) {
    if (subscription.status !== 'canceled') await stripe.subscriptions.cancel(subscription.id, { prorate: false, invoice_now: false }).catch(error => logger.warn('Late deleted-account subscription could not be canceled:', error));
    return { userId, status: 'canceled', previousStatus: existing?.subscriptionStatus || null, deleted: true };
  }
  const priceIds = (subscription.items?.data || []).map((item: any) => item.price?.id);
  if (!priceIds.includes(configuredPriceId())) throw new Error('Subscription does not contain the configured membership price');
  const periodEnd = subscription.current_period_end || subscription.items?.data?.[0]?.current_period_end;
  const now = new Date();
  await (await getDb()).collection<any>('billing_accounts').updateOne(
    { userId },
    {
      $set: {
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        subscriptionStatus: subscription.status,
        trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
        currentPeriodEndsAt: periodEnd ? new Date(periodEnd * 1000) : null,
        cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
        updatedAt: now,
      },
      ...(subscription.trial_end ? { $setOnInsert: { userId, trialUsedAt: now, createdAt: now } } : { $setOnInsert: { userId, createdAt: now } }),
    },
    { upsert: true },
  );
  return { userId, status: String(subscription.status), previousStatus: existing?.subscriptionStatus || null, deleted: false };
}

router.use(authenticateToken);

router.get('/status', async (req: AuthRequest, res: Response) => {
  try {
    res.set('Cache-Control', 'private, no-store');
    return res.json(await membershipStatus(req.user!.id));
  } catch (error) {
    logger.error('Billing status failed:', error);
    return res.status(503).json({ error: 'Membership status is temporarily unavailable' });
  }
});

router.post('/checkout', async (req: AuthRequest, res: Response) => {
  if (!commercialLaunchEnabled()) return res.status(503).json({ code: 'CHECKOUT_DISABLED', error: 'Checkout is not open yet.' });
  try {
    const stripe = stripeClient();
    const priceId = configuredPriceId();
    const db = await getDb();
    await Promise.all([
      db.collection('billing_accounts').createIndex({ userId: 1 }, { unique: true }),
      db.collection('billing_accounts').createIndex({ stripeCustomerId: 1 }, { unique: true, sparse: true }),
    ]);
    const billing = await db.collection<any>('billing_accounts').findOne({ userId: req.user!.id });
    if (['trialing', 'active'].includes(String(billing?.subscriptionStatus))) return res.status(409).json({ code: 'ALREADY_MEMBER', error: 'This account already has an active membership.' });
    const user: any = await db.collection<any>('users').findOne({ _id: req.user!.id }, { projection: { email: 1 } });
    const returnTo = safeReturnTo(req.body?.returnTo);
    const publicOrigin = (process.env.PUBLIC_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
    if (billing?.checkoutSessionId) {
      const prior: any = await stripe.checkout.sessions.retrieve(billing.checkoutSessionId);
      if (prior.status === 'open' && prior.url) return res.json({ url: prior.url, reused: true });
    }
    const customer = billing?.stripeCustomerId || (await stripe.customers.create(
      { email: user?.email || req.user!.email, metadata: { userId: req.user!.id } },
      { idempotencyKey: `customer:${req.user!.id}` },
    )).id;
    await db.collection<any>('billing_accounts').updateOne(
      { userId: req.user!.id },
      { $set: { stripeCustomerId: customer, updatedAt: new Date() }, $setOnInsert: { userId: req.user!.id, createdAt: new Date() } },
      { upsert: true },
    );
    const trialUsed = Boolean(billing?.trialUsedAt);
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer,
      line_items: [{ price: priceId, quantity: 1 }],
      payment_method_collection: 'always',
      client_reference_id: req.user!.id,
      metadata: { userId: req.user!.id, returnTo },
      subscription_data: { metadata: { userId: req.user!.id }, ...(trialUsed ? {} : { trial_period_days: MEMBERSHIP_TRIAL_DAYS }) },
      success_url: `${publicOrigin}/checkout/return?session_id={CHECKOUT_SESSION_ID}&returnTo=${encodeURIComponent(returnTo)}`,
      cancel_url: `${publicOrigin}/pricing?checkout=cancelled&returnTo=${encodeURIComponent(returnTo)}`,
    }, { idempotencyKey: `checkout:${req.user!.id}:${Math.floor(Date.now() / 3_600_000)}` });
    await db.collection('billing_accounts').updateOne(
      { userId: req.user!.id },
      { $set: { checkoutSessionId: session.id, checkoutReturnTo: returnTo, updatedAt: new Date() } },
    );
    void recordFunnelEvent('checkout_started', req.user!.id, {}, `checkout:${session.id}`);
    return res.json({ url: session.url });
  } catch (error) {
    logger.error('Checkout creation failed:', error);
    return res.status(503).json({ error: 'Checkout could not be started' });
  }
});

router.post('/checkout/confirm', async (req: AuthRequest, res: Response) => {
  const sessionId = typeof req.body?.sessionId === 'string' ? req.body.sessionId : '';
  if (!/^cs_test_[a-zA-Z0-9_]+$/.test(sessionId)) return res.status(400).json({ error: 'Invalid checkout session' });
  try {
    const stripe = stripeClient();
    const session: any = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['subscription'] });
    if (session.client_reference_id !== req.user!.id || session.metadata?.userId !== req.user!.id) return res.status(404).json({ error: 'Checkout session not found' });
    const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
    if (!subscriptionId) return res.status(409).json({ error: 'The subscription is not ready yet' });
    await reconcileSubscription(stripe, subscriptionId, req.user!.id);
    return res.json(await membershipStatus(req.user!.id));
  } catch (error) {
    logger.error('Checkout confirmation failed:', error);
    return res.status(503).json({ error: 'Membership confirmation is still pending. Refresh shortly.' });
  }
});

router.post('/portal', async (req: AuthRequest, res: Response) => {
  try {
    const stripe = stripeClient();
    const billing = await (await getDb()).collection<any>('billing_accounts').findOne({ userId: req.user!.id });
    if (!billing?.stripeCustomerId) return res.status(404).json({ error: 'No billing account exists yet' });
    const publicOrigin = (process.env.PUBLIC_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
    const session = await stripe.billingPortal.sessions.create({ customer: billing.stripeCustomerId, return_url: `${publicOrigin}/app/billing` });
    return res.json({ url: session.url });
  } catch (error) {
    logger.error('Billing portal failed:', error);
    return res.status(503).json({ error: 'Billing management is temporarily unavailable' });
  }
});

export async function stripeWebhook(req: Request, res: Response) {
  const signature = req.headers['stripe-signature'];
  if (typeof signature !== 'string' || !process.env.STRIPE_WEBHOOK_SECRET) return res.status(400).send('Webhook signature required');
  let event: Stripe.Event | undefined;
  try {
    const stripe = stripeClient();
    event = stripe.webhooks.constructEvent(req.body, signature, process.env.STRIPE_WEBHOOK_SECRET);
    const db = await getDb();
    await db.collection('billing_webhook_events').createIndex({ eventId: 1 }, { unique: true });
    try {
      await db.collection('billing_webhook_events').insertOne({ eventId: event.id, type: event.type, receivedAt: new Date(), state: 'processing' });
    } catch (error: any) {
      if (error?.code === 11000) {
        const prior: any = await db.collection('billing_webhook_events').findOne({ eventId: event.id });
        if (prior?.state === 'complete') return res.json({ received: true, duplicate: true });
        await db.collection('billing_webhook_events').updateOne(
          { eventId: event.id },
          { $set: { state: 'processing', retriedAt: new Date() }, $inc: { attempts: 1 } },
        );
      } else {
        throw error;
      }
    }
    const object: any = event.data.object;
    const subscriptionId = object.object === 'subscription'
      ? object.id
      : typeof object.subscription === 'string'
        ? object.subscription
        : object.subscription?.id;
    if (subscriptionId) {
      const reconciled = await reconcileSubscription(stripe, subscriptionId);
      if (!reconciled.deleted) {
        if (reconciled.status === 'trialing' && reconciled.previousStatus !== 'trialing') {
          await recordFunnelEvent('trial_started', reconciled.userId, { subscriptionStatus: reconciled.status }, `trial:${subscriptionId}`);
        }
        if (reconciled.status === 'active' && reconciled.previousStatus !== 'active') {
          await recordFunnelEvent('paid_converted', reconciled.userId, { subscriptionStatus: reconciled.status, amountCents: 2900, currency: 'usd' }, `paid:${subscriptionId}`);
        }
        if (object.cancel_at_period_end === true) {
          await recordFunnelEvent('cancellation_requested', reconciled.userId, { subscriptionStatus: reconciled.status }, `cancel-requested:${subscriptionId}`);
        }
        if (reconciled.status === 'canceled') {
          await recordFunnelEvent('membership_ended', reconciled.userId, { subscriptionStatus: reconciled.status }, `ended:${subscriptionId}`);
        }
      }
    }
    await db.collection('billing_webhook_events').updateOne({ eventId: event.id }, { $set: { state: 'complete', completedAt: new Date() } });
    return res.json({ received: true });
  } catch (error) {
    if (event?.id) await (await getDb()).collection('billing_webhook_events').updateOne(
      { eventId: event.id },
      { $set: { state: 'failed', failedAt: new Date() } },
    ).catch(() => undefined);
    logger.error('Stripe webhook failed:', error);
    return res.status(400).send('Webhook could not be processed');
  }
}

export async function cancelMembershipForDeletion(userId: string) {
  const billing = await (await getDb()).collection<any>('billing_accounts').findOne({ userId });
  if (!billing?.stripeSubscriptionId && !billing?.stripeCustomerId) return;
  const stripe = stripeClient();
  if (billing?.stripeSubscriptionId && ['trialing', 'active', 'past_due'].includes(String(billing.subscriptionStatus))) {
    await stripe.subscriptions.cancel(billing.stripeSubscriptionId, { prorate: false, invoice_now: false });
    await reconcileSubscription(stripe, billing.stripeSubscriptionId, userId);
  }
  if (billing?.stripeCustomerId) await stripe.customers.del(billing.stripeCustomerId);
}

export default router;
