# PerBillion commercial launch runbook

Updated 2026-10-25. The academy membership is implemented for local validation only. Live checkout and membership enforcement must remain disabled until every gate below has an owner and a recorded pass.

## Release controls

| Control | Validation setting | Live setting after approval |
| --- | --- | --- |
| `COMMERCIAL_LAUNCH_ENABLED` | `false` by default; `true` only with Stripe test keys | `true` in a coordinated release |
| `MEMBERSHIP_ENFORCEMENT_ENABLED` | `false` while existing accounts receive notice | `true` only after the notice window |
| `MEMBERSHIP_TRANSITION_CUTOFF_AT` | ISO timestamp when notice begins | Same immutable timestamp |
| `MEMBERSHIP_TRANSITION_ENDS_AT` | At least 14 days after cutoff | Same immutable timestamp |
| Stripe credentials | `sk_test_…`, test webhook secret, test recurring price | Live credentials supplied through the secret store—not Git |

The gateway refuses non-test Stripe secret keys in the current release. Live money cannot be accepted until a separately reviewed change intentionally adds live-key support.

## Go/no-go checklist

1. Fund capacity for the gateway, database, email, support, backups, and forecast beta. Set budget alerts and an incident owner.
2. Verify business name, descriptor, support email, public domain, sending domain, and Stripe account identity.
3. Configure one recurring USD price at **$29/month**, a server-side seven-day trial, card collection, Customer Portal cancellation, and the signed webhook endpoint.
4. Configure tax collection and registrations with qualified tax/legal advice for the jurisdictions being sold into.
5. Publish and review Terms, Privacy, refund/cancellation language, research disclaimers, and customer-support response expectations.
6. Send existing-account notices at least 14 days before enforcement. Record the cutoff and end timestamps; do not silently move them.
7. Pass test-mode journeys for new trial, trial conversion, cancellation at period end, payment failure, duplicate checkout, delayed/reordered webhook, spoofed return, account deletion, and billing outage recovery.
8. Confirm protected lesson bodies and assessment keys are absent from public API responses and built browser assets. Confirm expired members retain billing, account, export, and historical progress access.
9. Run phone/tablet/desktop, keyboard, reduced-motion, WebGL-failure, offline/error, 320 px overflow, build-size, and cross-service smoke checks.
10. Staff support and monitoring, announce the release window, take a database backup, and record the prior healthy revision before changing flags.

## Funnel and commercial scorecard

The first-party `funnel_events` collection records only enumerated product facts: preview views, registrations, activation, checkout starts, verified trial starts, paid conversion, weekly returns, cancellation requests, and membership end. It never accepts lesson answers, journal/reflection text, credentials, or payment details.

- Activation: a passing assessment plus the related saved exercise.
- Trial conversion: verified `active` subscription after `trialing`.
- Retained MRR: active subscriptions at period end × $29, reconciled to Stripe.
- Business target: 3,449 paying members = $100,021 gross MRR before fees, refunds, discounts, and tax.
- Decision gates: interview and support the first 10 paying members; evaluate activation, paid conversion, weekly return, cancellation reasons, and retained MRR for the first 100-member cohort before scaling acquisition.

## Monitoring and rollback

Alert on webhook failures/backlog, checkout errors, membership-status failures, payment failures, unexpected access denials, authentication errors, MongoDB health, 5xx/429 rates, and forecast saturation. Reconcile subscription state from Stripe rather than trusting redirect parameters.

To stop new sales without removing access, set `COMMERCIAL_LAUNCH_ENABLED=false`. To stop enforcement during an access incident, set `MEMBERSHIP_ENFORCEMENT_ENABLED=false`. Roll application traffic back to the recorded healthy revision, keep billing webhook ingestion available, reconcile all events received during the incident, and never restore MongoDB solely for a UI rollback.

Account deletion is resumable: cancellation happens before application data removal; sessions are revoked; a billing tombstone remains so late webhooks cannot recreate access. During a Stripe outage, leave the deletion record pending and retry after provider recovery.
