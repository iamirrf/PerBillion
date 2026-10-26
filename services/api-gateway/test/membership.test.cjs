const { test } = require('node:test');
const assert = require('node:assert/strict');
const { deriveMembershipStatus } = require('../dist/utils/membership');

const now = new Date('2026-10-25T12:00:00Z');
const transitionEnd = new Date('2026-11-08T12:00:00Z');
const transitionCutoff = new Date('2026-10-25T12:00:00Z');
const status = (billing, overrides = {}) => deriveMembershipStatus({
  billing,
  userCreatedAt: '2026-01-01T00:00:00Z',
  enforcementEnabled: true,
  commercialEnabled: true,
  stripeTestConfigured: true,
  transitionEnd: null,
  transitionCutoff: null,
  now,
  ...overrides,
});

test('membership access follows verified provider state', () => {
  assert.equal(status(undefined).state, 'free');
  assert.equal(status(undefined).hasAcademyAccess, false);
  assert.equal(status({ subscriptionStatus: 'trialing' }).hasAcademyAccess, true);
  assert.equal(status({ subscriptionStatus: 'active' }).hasAcademyAccess, true);
  assert.equal(status({ subscriptionStatus: 'past_due' }).hasAcademyAccess, false);
  assert.equal(status({ subscriptionStatus: 'canceled' }).hasAcademyAccess, false);
});

test('enforcement flag and existing-account notice are explicit', () => {
  assert.equal(status(undefined, { enforcementEnabled: false }).state, 'disabled');
  assert.equal(status(undefined, { enforcementEnabled: false }).hasAcademyAccess, true);
  assert.equal(status(undefined, { transitionEnd, transitionCutoff }).state, 'transition');
  assert.equal(status(undefined, { transitionEnd, transitionCutoff, userCreatedAt: '2026-10-26T00:00:00Z' }).state, 'free');
  assert.equal(status(undefined, { transitionEnd: new Date('2026-10-24T00:00:00Z'), transitionCutoff }).state, 'free');
});

test('checkout requires coordinated launch and a test-mode key', () => {
  assert.equal(status(undefined).checkoutEnabled, true);
  assert.equal(status(undefined, { commercialEnabled: false }).checkoutEnabled, false);
  assert.equal(status(undefined, { stripeTestConfigured: false }).checkoutEnabled, false);
});
