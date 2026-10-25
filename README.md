# PerBillion

PerBillion is a free, account-based investing learning and practice platform built from a React frontend, an Express API gateway, a Spring Boot orchestration service, a Python statsmodels ML engine, MongoDB, and Nginx. The public website explains the product; the signed-in application connects 24 interactive lessons and 48 explained questions with goal-based recommendations, server-authoritative portfolio simulations, and bounded weekly forecast research.

The current codebase includes local and production Compose definitions. See [release and operations](docs/RELEASE_AND_OPERATIONS.md) for deployment inputs, cost assumptions, service verification, and rollback. The release is hosted at `https://perbillion-705825363504.us-central1.run.app/`; the custom domain remains a separate DNS dependency.

## Implemented Forecast Models

The ML engine exposes six selectable model types:

- `ARIMA`
- `SARIMA`
- `SARIMAX`
- `HOLT_WINTERS_ADDITIVE`
- `HOLT_WINTERS_MULTIPLICATIVE`
- `HOLT_WINTERS_DAMPED`

It also supports `auto` model selection with diagnostics, AICc screening, rolling-origin cross-validation, stability checks, and composite scoring.

## Architecture

```text
React/Vite frontend
        |
      Nginx
        |
        +--> Express API Gateway --> MongoDB
        |
        +--> Spring Boot Orchestrator --> Python ML Engine
                         |
                       MongoDB
```

Current runtime storage is MongoDB. A legacy PostgreSQL schema exists in `database/postgres/`, but PostgreSQL is not wired into the current Docker Compose stack or the active auth/user code path.

## Runtime Secrets

Do not commit real credentials. Copy `.env.example` to `.env`, replace all `change_me` values, and keep `.env` ignored.

Required for Docker Compose:

- `MONGO_PASSWORD`
- `JWT_SECRET`
- `ALPHAVANTAGE_API_KEY`

Optional for Atlas:

- `MONGODB_URI`

If `MONGODB_URI` is unset, Docker Compose builds an in-network MongoDB URI using `MONGO_PASSWORD`. For Spring local overrides, use environment variables or a git-ignored `services/spring-orchestrator/src/main/resources/application-local.properties`.

## Quick Start

```bash
cp .env.example .env
# edit .env and replace every change_me value
docker-compose up -d --build
```

Access points:

- Frontend: `http://localhost`
- API gateway through Nginx: `http://localhost/api`
- API gateway health: `http://localhost/api/health`
- Spring Swagger UI: `http://localhost/swagger-ui.html`
- Spring OpenAPI JSON: `http://localhost/api-docs`
- ML engine direct health: `http://localhost:5001/health`

## Local Development

API gateway:

```bash
cd services/api-gateway
npm install
npm run dev
```

Spring orchestrator:

```bash
cd services/spring-orchestrator
# requires Java 21
mvn spring-boot:run
```

ML engine:

```bash
cd services/ml-engine
pip install -r requirements.txt
python app.py
```

Frontend:

```bash
cd services/frontend
npm install
npm run dev
```

## API Surface

API gateway:

- `GET /health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/user/profile`
- `PUT /api/user/profile`
- `POST /api/user/profile-picture`
- `GET /api/user/preferences`
- `PUT /api/user/preferences`
- `POST /api/forecast/generate`
- `POST /api/forecast/:forecastId/rerun`
- `GET /api/forecast/history`
- `GET /api/forecast/:forecastId`
- `GET /api/education/lessons`
- `GET /api/education/lessons/:lessonId`
- `GET /api/education/progress`
- `POST /api/education/progress`
- `GET /api/education/stats`
- `GET /api/education/v2/progress`
- `PUT /api/education/v2/progress/:lessonId`
- `DELETE /api/education/v2/progress`
- `GET /api/product/practice`
- `POST /api/product/practice/actions`
- `GET|PUT|DELETE /api/product/watchlist[/:ticker]`
- `GET|POST /api/product/comparisons`

Spring orchestrator, 6 handlers:

- `POST /api/v1/forecasts`
- `POST /api/v1/forecasts/generate`
- `GET /api/v1/forecasts/{forecastId}`
- `GET /api/v1/forecasts/user/{userId}`
- `GET /api/v1/forecasts/ticker/{ticker}`
- `DELETE /api/v1/forecasts/{forecastId}`

ML engine, 5 handlers:

- `GET /health`
- `POST /api/forecast`
- `POST /api/diagnostics`
- `POST /api/validate`
- `GET /api/models`

## Security Notes

Implemented:

- JWT signing and verification with required `JWT_SECRET`
- bcrypt password hashing for registration/login
- authentication middleware on every product, learning, and forecast route
- owner-scoped forecast history, individual results, practice sessions, watchlists, and comparisons
- atomic practice actions with revision checks and idempotency keys
- global API rate limiting, auth rate limiting, and forecast generation rate limiting
- Helmet, CORS, request size limits, and basic input validation

Current limitations:

- Role helper code exists, but no role-gated route is currently wired.
- CSRF protection is not implemented.
- Production CORS, TLS, logging, backup, and secret-management settings must be reviewed per environment.

## Example Forecast Request

```bash
curl -X POST http://localhost/api/forecast/generate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "ticker": "AAPL",
    "forecastMonths": 12,
    "modelType": "auto"
  }'
```

`forecastMonths` is retained for API compatibility; `12` means 12 **weekly** periods. The accepted range is 1–52 weeks. Requests are subject to capacity limits.

## Project Structure

```text
PerBillion/
├── services/
│   ├── frontend/             React TypeScript frontend
│   ├── api-gateway/          Express API gateway
│   ├── spring-orchestrator/  Spring Boot orchestration service
│   └── ml-engine/            Python statsmodels ML engine
├── database/
│   ├── mongodb/              MongoDB init scripts
│   └── postgres/             Legacy PostgreSQL schema, not wired by Compose
├── nginx/                    Nginx reverse proxy configuration
├── docker-compose.yml
├── .env.example
└── README.md
```

## Production Checklist

- Rotate any credential that has ever been committed or shared.
- Store secrets in provider secret managers or environment variables, never in Git.
- Set a strong `JWT_SECRET`.
- Configure production CORS origins.
- Configure TLS certificates.
- Review Nginx security headers.
- Set up database backups.
- Set up centralized logs, metrics, and alerting.
- Re-run secret scans on the working tree and full Git history after any history rewrite.

## License

Proprietary - All rights reserved.
