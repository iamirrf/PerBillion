# PerBillion website transformation plan

## Objective

Transform the entire existing website into a free, premium investing education platform. Help an absolute beginner develop an informed understanding of investing, trading mechanics, AI-assisted research, and quantitative methods through interactive explanations and practice.

The visual identity is black and warm gold: quiet, precise, tactile, and polished. Original generated 3D artwork supports the learning experience. Success means people understand more and know their next step; visual effects serve that purpose.

Professional research methods are a curriculum destination, not a promise that completing lessons makes someone a professional trader or produces investment returns.

## Product principles

- Every lesson and core practice tool is free. Reading and practice require no account or payment card.
- Teach one idea at a time through a visual, an interaction, a short explanation, and a check of understanding.
- Keep interface copy brief. Give learners depth inside lessons and contextual explanations.
- Clearly identify synthetic examples, historical observations, forecasts, and virtual transactions.
- Use motion to explain change and guide attention. Avoid flicker, continuous glow, and distracting background effects.
- Support keyboard navigation, readable contrast, small screens, reduced motion, and optional browser storage.
- Preserve working account and forecasting integrations. Never present a disconnected service as operational.

## 1. Audit the complete experience

Inventory every route, component, service, data dependency, and account state. Trace the experience as a new visitor, a returning guest, and a signed-in learner. Reproduce flicker, layout shifts, authentication redirects, slow charts, empty states, and failed requests.

Deliver a route map, prioritized defect list, integration inventory, and baseline screenshots and performance measurements. Separate problems that can be fixed locally from infrastructure requiring a running database, model service, or market-data provider.

Completion criterion: every existing route and critical interaction has an identified destination in the new experience.

## 2. Establish the design system and original assets

Create reusable color, typography, spacing, border, elevation, chart, form, navigation, and motion rules. Use neutral black surfaces, champagne-gold accents, generous spacing, and clear visual hierarchy. Use restrained editorial typography for major moments and highly legible typography for controls and lesson content.

Generate original gold-cloth sculpture and architectural investing visuals. Optimize assets for delivery, reserve their dimensions to prevent layout movement, and use code-native charts for interactive data. Add subtle pointer interaction where appropriate, with a reduced-motion alternative.

Completion criterion: representative desktop and mobile screens demonstrate one consistent design language, with readable text and no clipped controls or horizontal overflow.

## 3. Rebuild the navigation and every page

| Area | Purpose and principal action |
| --- | --- |
| Overview | Explain the value immediately, demonstrate one interactive idea, and start or resume learning. |
| Learning path | Show the progression, prerequisites, time estimates, and completed lessons. Keep lessons freely accessible. |
| Lesson reader | Teach one concept with a visual experiment, concise explanation, quiz feedback, and a clear next step. |
| Practice lab | Explore compound growth and trading mechanics using explicit assumptions and virtual money. |
| AI & quant | Explore model output, uncertainty, validation, and research discipline. |
| My progress | Show completed concepts, quiz results, and an actionable next lesson. |
| Login and registration | Offer optional accounts with clear benefits, inline errors, and an equally clear guest route. |
| Account and preferences | Manage profile, practice defaults, motion preferences, and learning-data export or reset. |
| Error and recovery states | Handle invalid routes, missing lessons, expired sessions, blocked storage, and unavailable services clearly. |

Add lesson search, responsive navigation, route-specific titles, accessible focus handling, and consistent loading and feedback states.

Completion criterion: all routes use the new design and every visible action works or explains its actual availability.

## 4. Build the learning progression

Organize the curriculum into four stages:

1. Foundations: investing versus saving and trading; stocks, bonds, and funds; compounding; inflation; risk; goals and time horizons.
2. Portfolio construction: diversification, correlation, allocation, fees, rebalancing, benchmarks, and behavior.
3. Trading mechanics: candles, order types, position sizing, drawdowns, execution costs, derivatives, and leverage.
4. AI and quantitative research: testable hypotheses, time-series models, features, leakage, chronological validation, overfitting, backtesting, uncertainty, and regime changes.

Start with 24 complete interactive lessons and 48 explanatory quiz questions. Define additional advanced projects before describing the curriculum as comprehensive: reproduce a benchmark, test a simple signal on unseen data, include transaction costs, and explain why an apparent edge may disappear.

Validate educational claims against authoritative sources. Each stage should teach both the technique and its limitations.

Completion criterion: a beginner can finish a lesson, explain the concept, manipulate its visual, receive useful quiz feedback, save progress, and continue without a dead end.

## 5. Implement meaningful practice and model exploration

Build a growth simulator with starting balance, regular contributions, horizon, and return assumptions. Explain the compounding convention and display contributed capital separately from hypothetical growth.

Build a paper-trading experience with virtual cash, positions, orders, trade history, and a clearly labeled synthetic market. Validate quantities, available cash, and holdings. Specify excluded costs and execution assumptions.

Connect the forecast studio to the existing model API, including valid model choices, weekly horizons, pending-job polling, cancellation, service errors, uncertainty bands, and export. Keep an explicitly labeled illustration available independently of the forecasting service.

Completion criterion: calculations are reproducible, invalid actions cannot corrupt state, and illustrative data cannot be mistaken for current market data or a real order.

## 6. Stabilize the backend and persistence

Preserve the existing React/Vite, Express, MongoDB, Spring, and Python architecture while correcting concrete failures. Validate inputs at API boundaries; distinguish public learning from authenticated user data; protect administrative operations; handle database and model-service failures; preserve best quiz scores; and prevent concurrent progress updates from losing data.

Keep guest learning progress usable locally. Decide explicitly whether the new curriculum will synchronize to accounts; if implemented, define stable lesson IDs, migration from the legacy curriculum, guest-to-account merging, and clear sync status. Until then, label progress as device-local, including for signed-in users.

Completion criterion: appropriate builds and focused tests pass. Account, database, and forecasting integration tests pass against configured services before production readiness is claimed.

## 7. Make the free product sustainable and discoverable

State the value simply: learn investing through interactive visuals, practice safely, and understand quantitative research. Use an immediate free lesson as the main conversion action. Avoid fabricated testimonials, user counts, performance claims, urgency, and promised returns.

Keep lessons and local simulations independent of paid APIs. Cache suitable educational/model responses, bound expensive requests, and handle provider limits. Calculate hosting, database, market-data licensing, and inference costs before committing to unlimited live features. The learner-facing product remains free; operating costs still need a budget.

Add metadata and social previews, an educational content discovery strategy, and privacy-conscious measurement of lesson starts, completions, return visits, and confusing or abandoned steps. Select funding only if it preserves access and editorial independence; avoid incentives tied to how much users trade.

Completion criterion: the free promise matches actual access, operating limits are defined, and primary product metrics measure learning and retention.

## 8. Verify, refine, and launch

Test all routes on desktop and phones, guest and authenticated states, keyboard-only navigation, reduced motion, refresh persistence, corrupt or blocked storage, invalid inputs, and failed network requests. Exercise a complete lesson and quiz, virtual buy and sell, forecast success/pending/failure/cancellation, profile updates, sign-out, export, and reset.

Review visual consistency and contrast, prevent layout shifts, optimize generated images and chart code, and measure actual loading and interaction performance. Document deployment requirements, environment variables, service health, data migration, monitoring, backups, and rollback. Deploy through the existing hosting workflow only when production services and required release checks are ready.

Completion criterion: no known blocking flow defects; no page runtime errors in tested routes; no accidental real-money behavior; working external integrations verified; a clear release record and rollback path.

## Suggested delivery order

| Milestone | Reviewable result |
| --- | --- |
| 1 | Route audit, product structure, and design system. |
| 2 | Shared shell, overview, original assets, and responsive foundations. |
| 3 | Complete learning path, lesson interactions, quizzes, and progress. |
| 4 | Practice tools, AI/quant exploration, accounts, and backend fixes. |
| 5 | Integration verification, accessibility and performance refinement, operating model, and launch. |

## Implementation state

The working tree now contains the redesigned shared shell and every principal page, generated WebP artwork, self-hosted fonts, 24 lessons with 48 explained questions, interactive growth and synthetic paper-trading tools, forecast handling, optional accounts, guest-to-account progress synchronization, and a separate legacy-coursework transcript. These changes remain uncommitted and have not been deployed.

The release and cost model, production Compose definition, deployment checks, and rollback steps are in [RELEASE_AND_OPERATIONS.md](RELEASE_AND_OPERATIONS.md). Browser journeys and frontend/API builds have been exercised locally. Full Docker Compose and licensed market-data integration remain release gates because Docker and a confirmed production host are unavailable in this workspace.
