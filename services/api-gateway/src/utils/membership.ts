import { NextFunction, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { getDb } from './db';

export const MEMBERSHIP_PRICE_CENTS = 2_900;
export const MEMBERSHIP_CURRENCY = 'usd';
export const MEMBERSHIP_TRIAL_DAYS = 7;

export type MembershipState = 'disabled' | 'free' | 'transition' | 'trialing' | 'active' | 'past_due' | 'canceled';

const enabled = (name: string) => process.env[name] === 'true';
const validDate = (value?: string) => value && Number.isFinite(Date.parse(value)) ? new Date(value) : null;

export function commercialLaunchEnabled() {
  return enabled('COMMERCIAL_LAUNCH_ENABLED');
}

export function membershipEnforcementEnabled() {
  return enabled('MEMBERSHIP_ENFORCEMENT_ENABLED');
}

export function transitionEndsAt() {
  return validDate(process.env.MEMBERSHIP_TRANSITION_ENDS_AT);
}

export function deriveMembershipStatus({
  billing,
  userCreatedAt,
  enforcementEnabled,
  commercialEnabled,
  stripeTestConfigured,
  transitionEnd,
  transitionCutoff,
  now = new Date(),
}: {
  billing?: any;
  userCreatedAt?: Date | string | null;
  enforcementEnabled: boolean;
  commercialEnabled: boolean;
  stripeTestConfigured: boolean;
  transitionEnd: Date | null;
  transitionCutoff: Date | null;
  now?: Date;
}) {
  const providerStatus = String(billing?.subscriptionStatus || 'free');
  const providerAccess = ['trialing', 'active'].includes(providerStatus);
  const cutoff = transitionCutoff || (transitionEnd ? new Date(transitionEnd.getTime() - 14 * 86_400_000) : null);
  const existingAccountTransition = Boolean(
    enforcementEnabled && transitionEnd && transitionEnd > now && cutoff && userCreatedAt && new Date(userCreatedAt) < cutoff,
  );
  const hasAcademyAccess = !enforcementEnabled || providerAccess || existingAccountTransition;
  const state: MembershipState = !enforcementEnabled
    ? 'disabled'
    : providerAccess
      ? providerStatus as MembershipState
      : existingAccountTransition
        ? 'transition'
        : ['past_due', 'canceled'].includes(providerStatus)
          ? providerStatus as MembershipState
          : 'free';

  return {
    state,
    hasAcademyAccess,
    checkoutEnabled: commercialEnabled && stripeTestConfigured,
    enforcementEnabled,
    price: { amount: MEMBERSHIP_PRICE_CENTS, currency: MEMBERSHIP_CURRENCY, interval: 'month' as const },
    trialDays: MEMBERSHIP_TRIAL_DAYS,
    transitionEndsAt: existingAccountTransition ? transitionEnd?.toISOString() : null,
    trialEndsAt: billing?.trialEndsAt || null,
    currentPeriodEndsAt: billing?.currentPeriodEndsAt || null,
    cancelAtPeriodEnd: Boolean(billing?.cancelAtPeriodEnd),
  };
}

export async function membershipStatus(userId: string) {
  const db = await getDb();
  const [billing, user] = await Promise.all([
    db.collection<any>('billing_accounts').findOne({ userId }),
    db.collection<any>('users').findOne({ _id: userId }, { projection: { createdAt: 1 } }),
  ]);
  return deriveMembershipStatus({
    billing,
    userCreatedAt: user?.createdAt,
    enforcementEnabled: membershipEnforcementEnabled(),
    commercialEnabled: commercialLaunchEnabled(),
    stripeTestConfigured: Boolean(process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_')),
    transitionEnd: transitionEndsAt(),
    transitionCutoff: validDate(process.env.MEMBERSHIP_TRANSITION_CUTOFF_AT),
  });
}

export async function requireAcademyAccess(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const status = await membershipStatus(req.user!.id);
    if (!status.hasAcademyAccess) return res.status(403).json({
      code: 'MEMBERSHIP_REQUIRED',
      error: 'An active PerBillion membership is required for this lesson or practice tool.',
      membership: status,
    });
    res.set('Cache-Control', 'private, no-store');
    return next();
  } catch (error) {
    return next(error);
  }
}
