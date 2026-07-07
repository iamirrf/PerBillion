# PerBillion - Project Context

## Project Overview

**PerBillion** is an institutional-grade stock forecasting platform that combines classical statistical time series models with modern microservices architecture. It provides professional, production-ready forecasting with transparency and statistical rigor.

### Core Features
- **Forecasting Models**: ARIMA, SARIMA, SARIMAX, Holt-Winters ETS, and Hybrid ensemble
- **Automated Hyperparameter Tuning**: Multi-stage optimization with AICc screening and rolling-origin cross-validation
- **Comprehensive Diagnostics**: Stationarity testing (ADF, KPSS), seasonality detection, data quality checks, normality testing
- **Professional UI**: Apple-inspired minimalist design with interactive charts, confidence intervals, and simple/advanced modes
- **Production Infrastructure**: Docker Compose, JWT auth, rate limiting, Swagger/OpenAPI docs

---

## Architecture

### Microservices Stack

| Service | Technology | Port | Purpose |
|---------|------------|------|---------|
| **Frontend** | React + TypeScript + Vite + TailwindCSS + Plotly.js | 5173 | Dashboard UI |
| **API Gateway** | Node.js + Express + TypeScript | 3000 | REST API, auth, routing |
| **Spring Orchestrator** | Spring Boot 3.2 + Java 17 | 8080 | Orchestration, data fetching |
| **ML Engine** | Python + Flask + statsmodels | 5000 | Time series forecasting |
| **MongoDB** | MongoDB 7 | 27017 | Forecast/experiment storage |
| **Nginx** | Nginx Alpine | 80/443 | Reverse proxy, SSL |

### Data Flow
```
User → Nginx (80) → Frontend (5173)
                  → API Gateway (3000) → Spring Orchestrator (8080) → ML Engine (5000)
                                                               → Alpha Vantage API
                                                               → MongoDB
```

---

## Project Structure

```
PerBillion/
├── services/
│   ├── frontend/              # React + TypeScript + Vite
│   │   ├── src/
│   │   │   ├── pages/         # Main page components (ForecastDashboard.tsx)
│   │   │   ├── components/    # Reusable UI components
│   │   │   ├── store/         # Zustand state management
│   │   │   ├── lib/           # API clients, utilities
│   │   │   └── utils/         # Helper functions
│   │   └── package.json
│   │
│   ├── api-gateway/           # Node.js + Express + TypeScript
│   │   ├── src/
│   │   │   ├── routes/        # API route handlers
│   │   │   ├── middleware/    # Auth, rate limiting, error handling
│   │   │   └── utils/         # Utilities
│   │   └── package.json
│   │
│   ├── spring-orchestrator/   # Spring Boot + Java 17
│   │   ├── src/main/java/com/perbillion/orchestrator/
│   │   │   ├── controller/    # REST controllers
│   │   │   ├── service/       # Business logic (data fetch, orchestration)
│   │   │   ├── repository/    # MongoDB repositories
│   │   │   └── model/         # Data models
│   │   └── pom.xml
│   │
│   └── ml-engine/             # Python + Flask
│       ├── forecasting/
│       │   ├── forecast_service.py  # Main forecasting logic
│       │   ├── diagnostics.py       # Stationarity tests
│       │   ├── tuning.py            # Parameter optimization
│       │   └── validation.py        # Cross-validation
│       └── requirements.txt
│
├── database/
│   └── mongodb/               # MongoDB initialization scripts
│
├── nginx/                     # Nginx configuration
│   ├── nginx.conf
│   └── conf.d/
│
├── docker-compose.yml         # Docker orchestration
├── .env.example               # Environment template
├── quickstart.sh              # One-command setup script
└── start.sh                   # Alternative start script
```

---

## Building and Running

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development)
- Python 3.11+ (for local development)
- Java 17+ (for local development)

### Quick Start (Recommended)
```bash
# 1. Copy environment template
cp .env.example .env

# 2. Edit .env and add your Alpha Vantage API key
#    Get free key: https://www.alphavantage.co/support/#api-key

# 3. Run quickstart script
./quickstart.sh
```

### Manual Docker Compose
```bash
docker-compose up -d --build
docker-compose logs -f
```

### Local Development (No Docker)

**Frontend:**
```bash
cd services/frontend
npm install
npm run dev        # Development server with hot reload
npm run build      # Production build
```

**API Gateway:**
```bash
cd services/api-gateway
npm install
npm run dev        # Development with ts-node-dev
npm run build      # TypeScript compilation
npm start          # Production
```

**Spring Orchestrator:**
```bash
cd services/spring-orchestrator
./mvnw spring-boot:run          # Run
./mvnw clean package            # Build
```

**ML Engine:**
```bash
cd services/ml-engine
pip install -r requirements.txt
python app.py
```

### Access URLs
- **Frontend**: http://localhost or http://localhost:5173
- **API Gateway**: http://localhost:3000
- **Spring Orchestrator**: http://localhost:8080
- **Swagger UI**: http://localhost:8080/swagger-ui.html
- **ML Engine**: http://localhost:5000

---

## Key Commands

### Docker Operations
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
docker-compose logs -f <service-name>  # frontend, api-gateway, spring-orchestrator, ml-engine, mongodb

# Stop all services
docker-compose down

# Rebuild specific service
docker-compose build <service-name>
docker-compose up -d <service-name>

# View running containers
docker-compose ps
```

### Testing
```bash
# API Gateway tests
cd services/api-gateway
npm test

# Spring Orchestrator tests
cd services/spring-orchestrator
./mvnw test

# Health checks
curl http://localhost:3000/health              # API Gateway
curl http://localhost:8080/actuator/health     # Spring Orchestrator
curl http://localhost:5000/health              # ML Engine
```

---

## Environment Variables

Key variables in `.env`:

| Variable | Purpose | Default |
|----------|---------|---------|
| `ALPHAVANTAGE_API_KEY` | Stock data API key | required, no default |
| `MONGODB_URI` | MongoDB connection string | Local Docker MongoDB |
| `MONGO_PASSWORD` | MongoDB password | required, no default |
| `JWT_SECRET` | JWT signing secret | required, no default |
| `JWT_EXPIRY` | Token expiration | `7d` |
| `NODE_ENV` | Node environment | `development` |
| `SPRING_PROFILES_ACTIVE` | Spring profile | `dev` |

---

## Development Conventions

### Frontend (React + TypeScript)
- **State Management**: Zustand for global state
- **Styling**: TailwindCSS with custom design tokens
- **Charts**: Plotly.js for interactive visualizations
- **Routing**: React Router DOM
- **Animations**: Framer Motion for transitions
- **Code Style**: ESLint with TypeScript rules

### API Gateway (Node.js + TypeScript)
- **Framework**: Express with TypeScript
- **Authentication**: JWT-based with bcrypt password hashing
- **Validation**: express-validator for input validation
- **Logging**: Winston for structured logging
- **Rate Limiting**: express-rate-limit (100 req/15min default)
- **Security**: Helmet for HTTP headers, CORS policy

### Spring Orchestrator (Java + Spring Boot)
- **Framework**: Spring Boot 3.2 with Java 17
- **Data Access**: Spring Data MongoDB
- **API Docs**: SpringDoc OpenAPI (Swagger)
- **HTTP Client**: Spring WebFlux for async calls
- **Boilerplate**: Lombok for reduced verbosity
- **Monitoring**: Spring Boot Actuator

### ML Engine (Python)
- **Framework**: Flask for API
- **ML Libraries**: statsmodels, pandas, numpy, scipy, scikit-learn
- **Models**: ARIMA, SARIMA, SARIMAX, Holt-Winters ETS
- **Server**: Gunicorn for production
- **Code Style**: PEP 8 conventions

---

## API Endpoints

### Authentication (API Gateway)
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login

### Forecasts
- `POST /api/forecasts` - Create forecast
- `GET /api/forecasts/{forecastId}` - Get forecast by ID
- `GET /api/forecasts` - Get user's forecasts
- `DELETE /api/forecasts/{forecastId}` - Delete forecast

### Models
- `GET /api/models` - List available forecasting models

Full API documentation available at Swagger UI: http://localhost:8080/swagger-ui.html

---

## Database Schema

### MongoDB Collections

**forecasts:**
```javascript
{
  _id: ObjectId,
  ticker: String,
  createdAt: Date,
  models: {
    arima: { accuracy, mape, mae, mse, forecast[], parameters{} },
    sarima: { ... },
    sarimax: { ... },
    holtWinters: { ... },
    hybrid: { ... }
  },
  historicalData: [{ date, value }],
  config: { forecastMonths, seasonalPeriod, trainRatio }
}
```

**experiments:**
```javascript
{
  _id: ObjectId,
  ticker: String,
  experimentDate: Date,
  parameterTests: [{ p, d, q, accuracy, mape }],
  bestParameters: {},
  diagnostics: { stationarity{}, seasonality{} }
}
```

---

## Key Libraries & Dependencies

### Frontend
- React 18.2, TypeScript 5.3, Vite 5.0
- TailwindCSS 3.4, Plotly.js 3.3, Framer Motion 10.18
- Zustand 4.4 (state), Axios 1.6 (HTTP), React Router 6.20

### API Gateway
- Express 4.18, TypeScript 5.3
- JWT 9.0, bcryptjs 2.4 (auth)
- MongoDB driver 6.13
- Helmet 7.1, CORS 2.8, express-rate-limit 7.1 (security)

### Spring Orchestrator
- Spring Boot 3.2, Java 17
- Spring Data MongoDB, Spring WebFlux
- SpringDoc OpenAPI 2.3
- Lombok, Jackson JSR310

### ML Engine
- Flask 3.0, statsmodels 0.14
- pandas 2.0, numpy 1.24, scipy 1.11
- scikit-learn 1.3, Gunicorn 21.2

---

## Troubleshooting

### Common Issues

**Port conflicts:**
```bash
lsof -i :80    # Find process using port
kill -9 <PID>  # Kill process
```

**MongoDB connection failed:**
```bash
docker restart perbillion-mongodb
docker logs perbillion-mongodb
```

**API rate limits (Alpha Vantage):**
- Free tier: 5 calls/min, 500 calls/day
- Wait 1 minute between requests if rate limited

**Frontend not loading:**
```bash
cd services/frontend
npm install
npm run build
# Hard reload browser: Cmd+Shift+R
```

---

## Production Checklist

Before deploying to production:
- [ ] Change all default passwords
- [ ] Update JWT_SECRET to 256-bit key
- [ ] Configure SSL certificates
- [ ] Set up database backups
- [ ] Configure monitoring and alerting
- [ ] Review rate limits
- [ ] Configure CORS for production domain
- [ ] Set up CI/CD pipeline
- [ ] Load test the system
- [ ] Security audit

---

## Documentation Files

- `README.md` - Main project documentation
- `README_NEW.md` - Complete platform documentation
- `ARCHITECTURE.md` - Detailed system architecture
- `GETTING_STARTED.md` - User onboarding guide
- `REDESIGN_SUMMARY.md` - Change summary
- `IMPLEMENTATION_COMPLETE.md` - Implementation details
- `TESTING_GUIDE.md` - Testing instructions
- `QUICK_REFERENCE.md` - Quick reference guide
