# PerBillion

PerBillion is a stock forecasting application built from a React frontend, an Express API gateway, a Spring Boot orchestration service, a Python statsmodels ML engine, MongoDB, and Nginx.

The current codebase is set up for local and Docker Compose development. Production deployment still requires rotated secrets, environment-specific hardening, monitoring, backups, and infrastructure review.

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

There are 27 active REST handlers in the current source, excluding static file serving and the unused `forecast_backup.ts` file.

API gateway, 16 handlers:

- `GET /health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/user/profile`
- `PUT /api/user/profile`
- `POST /api/user/profile-picture`
- `GET /api/user/preferences`
- `PUT /api/user/preferences`
- `POST /api/forecast/generate`
- `GET /api/forecast/history`
- `GET /api/forecast/:forecastId`
- `GET /api/education/lessons`
- `GET /api/education/lessons/:lessonId`
- `GET /api/education/progress`
- `POST /api/education/progress`
- `GET /api/education/stats`

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
- authentication middleware on user and education routes
- global API rate limiting, auth rate limiting, and forecast generation rate limiting
- Helmet, CORS, request size limits, and basic input validation

Current limitations:

- Forecast gateway routes currently allow anonymous requests and use `anonymous` as the user ID when no token is present.
- Role helper code exists, but no role-gated route is currently wired.
- CSRF protection is not implemented.
- Production CORS, TLS, logging, backup, and secret-management settings must be reviewed per environment.

## Example Forecast Request

```bash
curl -X POST http://localhost/api/forecast/generate \
  -H "Content-Type: application/json" \
  -d '{
    "ticker": "AAPL",
    "forecastMonths": 12,
    "modelType": "auto"
  }'
```

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
