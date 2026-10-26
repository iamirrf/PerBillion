import { getDb } from './db';
import logger from './logger';

export type FunnelEvent =
  | 'preview_viewed'
  | 'registration_completed'
  | 'activation_completed'
  | 'checkout_started'
  | 'trial_started'
  | 'paid_converted'
  | 'weekly_returned'
  | 'cancellation_requested'
  | 'membership_ended';

type FunnelProperties = {
  lessonId?: string;
  challengePack?: string;
  subscriptionStatus?: string;
  amountCents?: number;
  currency?: string;
};

/**
 * Records only enumerated product facts. Free-form answers, reflections,
 * credentials, and payment data are deliberately not accepted by this API.
 */
export async function recordFunnelEvent(
  event: FunnelEvent,
  userId: string | null,
  properties: FunnelProperties = {},
  dedupeKey?: string,
) {
  try {
    const events = (await getDb()).collection('funnel_events');
    if (dedupeKey) {
      await events.createIndex({ dedupeKey: 1 }, { unique: true, sparse: true });
      await events.updateOne(
        { dedupeKey },
        { $setOnInsert: { event, userId, properties, dedupeKey, occurredAt: new Date() } },
        { upsert: true },
      );
      return;
    }
    await events.insertOne({ event, userId, properties, occurredAt: new Date() });
  } catch (error: any) {
    if (error?.code !== 11000) logger.warn('Funnel event could not be recorded:', error);
  }
}

export function utcWeekKey(date = new Date()) {
  const value = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = value.getUTCDay() || 7;
  value.setUTCDate(value.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(value.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((value.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7);
  return `${value.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}
