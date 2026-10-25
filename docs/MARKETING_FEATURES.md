# PerBillion product claims

This file is the source of truth for public-facing capability claims. Marketing copy must describe shipped behavior and must not imply investment advice, live quotes, brokerage execution, guaranteed accuracy, or enterprise availability.

## Positioning

PerBillion helps people progress from curious to capable by connecting three activities:

- **Learn:** 24 focused lessons, 48 explained quiz questions, a concept-specific exercise in every lesson, goal-based ordering, and synced best scores.
- **Practice:** a growth illustration plus $10,000 simulated portfolios across five fictional assets and three deterministic scenarios. Orders use displayed fictional prices, whole units, and no fees or slippage.
- **Research:** bounded weekly statistical forecasts with uncertainty, history, watchlists, provenance, CSV export, saved comparisons, and model reruns against eligible saved snapshots.

## Safe claims

- Free learning, simulated practice, and bounded forecast research.
- Account progress, practice sessions, watchlists, and saved comparisons synchronize through MongoDB.
- Forecasts use historical weekly data and six classical time-series model choices plus automatic selection.
- Results display a central estimate and uncertainty interval.
- Practice assets and scenarios are fictional and deterministic.
- Users can export account data and reset current learning progress separately from the legacy transcript.

## Required qualifications

- Forecasts are statistical estimates, not predictions of guaranteed returns.
- Tickers in watchlists are labels only; the product does not promise streaming or live quotes.
- Practice orders do not involve real assets or money.
- Capacity is limited and another snapshot-model run consumes forecast capacity.
- Older records may show unavailable provenance when it was not captured at creation time.

## Out of scope

Do not claim brokerage connections, real-money trading, streaming prices, conversational AI, paid tiers, horizontal scaling, role-based product access, enterprise security certification, or a custom domain until those capabilities are actually released.
