# PerBillion Platform Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                             │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              PerBillion Dashboard UI                        │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐         │  │
│  │  │  Stock     │  │  Forecast  │  │   Chart    │         │  │
│  │  │   Input    │  │   Config   │  │  Display   │         │  │
│  │  └────────────┘  └────────────┘  └────────────┘         │  │
│  │                                                            │  │
│  │  React + TypeScript + TailwindCSS + Recharts             │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
└───────────────────────────┬───────────────────────────────────────┘
                            │ HTTP/WebSocket
                            │ Port 80/443
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                         NGINX (Reverse Proxy)                    │
│  • Load Balancing                                                │
│  • SSL Termination                                               │
│  • Static Asset Serving                                          │
│  • Request Routing                                               │
└───────────────────────────┬───────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│   Frontend   │   │ API Gateway  │   │    Spring    │
│   (Vite)     │   │  (Node.js)   │   │ Orchestrator │
│  Port 5173   │   │  Port 3000   │   │  Port 8080   │
└──────────────┘   └──────┬───────┘   └──────┬───────┘
                          │                   │
                          │                   │
                          └────────┬──────────┘
                                   │
                                   ▼
                          ┌──────────────┐
                          │   Python     │
                          │  ML Engine   │
                          │  Port 5000   │
                          └──────┬───────┘
                                 │
                    ┌────────────┼────────────┐
                    │                         │
                    ▼                         ▼
           ┌────────────────┐       ┌────────────────┐
           │    MongoDB     │       │  Alpha Vantage │
           │   Port 27017   │       │  API (External)│
           │                │       │                │
           │ • Forecasts    │       │ • Stock Data   │
           │ • Historical   │       │ • Real-time    │
           │ • Experiments  │       │ • Historical   │
           └────────────────┘       └────────────────┘
```

---

## Data Flow Diagram

### Forecast Generation Flow

```
┌──────────┐
│   User   │
└────┬─────┘
     │ 1. Enter AAPL + 12 weeks
     ▼
┌──────────────────┐
│  PerBillion UI     │
│  (React)         │
└────┬─────────────┘
     │ 2. POST /api/forecast/generate
     │    { ticker: "AAPL", forecastMonths: 12 }
     ▼
┌──────────────────┐
│  API Gateway     │
│  (Node.js)       │
│  • Validation    │
│  • Rate limiting │
└────┬─────────────┘
     │ 3. Forward request
     ▼
┌──────────────────┐
│  Spring Boot     │
│  Orchestrator    │
│  • Auth check    │────┐
│  • Data fetch    │    │ 4. GET stock data
│  • ML dispatch   │    ▼
└────┬─────────────┘  ┌───────────────┐
     │                 │ Alpha Vantage │
     │                 │     API       │
     │                 └───────────────┘
     │ 5. ML request
     ▼
┌──────────────────┐
│  Python          │
│  ML Engine       │
│  • ARIMA         │
│  • SARIMA        │
│  • SARIMAX       │
│  • Holt-Winters  │
│  • Hybrid        │
└────┬─────────────┘
     │ 6. Store results
     ▼
┌──────────────────┐
│    MongoDB       │
│  {               │
│   _id: "...",    │
│   ticker: "AAPL",│
│   models: {      │
│     arima: {...},│
│     sarima: {...}│
│   },             │
│   createdAt: ... │
│  }               │
└────┬─────────────┘
     │ 7. Return forecast data
     ▼
┌──────────────────┐
│  Spring Boot     │
│  (Orchestrator)  │
└────┬─────────────┘
     │ 8. Format response
     ▼
┌──────────────────┐
│  API Gateway     │
└────┬─────────────┘
     │ 9. JSON response
     ▼
┌──────────────────┐
│  PerBillion UI     │
│  • Parse data    │
│  • Render charts │
│  • Show metrics  │
└────┬─────────────┘
     │ 10. Display
     ▼
┌──────────┐
│   User   │
│  Sees    │
│ Forecast │
└──────────┘
```

---

## Component Architecture

### Frontend Architecture

```
services/frontend/
│
├── src/
│   ├── pages/
│   │   └── ForecastDashboard.tsx ← MAIN COMPONENT
│   │       │
│   │       ├── State Management
│   │       │   ├── ticker
│   │       │   ├── forecastMonths
│   │       │   ├── forecasts (ARIMA, SARIMA, etc.)
│   │       │   ├── activeModel
│   │       │   ├── showAdvanced
│   │       │   └── parameters (p, d, q, etc.)
│   │       │
│   │       ├── UI Sections
│   │       │   ├── Header (gradient blue)
│   │       │   ├── Input Section (stock + config)
│   │       │   ├── Metrics Table (performance)
│   │       │   ├── Model Selector (tabs)
│   │       │   ├── Main Chart (active model)
│   │       │   ├── Comparison Chart (all models)
│   │       │   └── FAQ Section
│   │       │
│   │       └── API Integration
│   │           └── axios.post('/api/forecast/generate')
│   │
│   ├── App.tsx ← Routes to ForecastDashboard
│   ├── main.tsx ← Entry point
│   └── index.css ← Tailwind imports
│
└── package.json
    └── Dependencies:
        ├── react + react-dom
        ├── recharts (charts)
        ├── axios (HTTP)
        └── tailwindcss (styling)
```

### Backend Architecture

```
services/
│
├── api-gateway/ (Node.js + Express)
│   └── src/
│       ├── routes/
│       │   └── forecast.ts ← MAIN ROUTE FILE
│       │       ├── POST /api/forecast/generate
│       │       ├── GET  /api/forecast/history
│       │       └── GET  /api/forecast/:id
│       │
│       ├── middleware/
│       │   ├── rateLimiter.ts
│       │   └── errorHandler.ts
│       │
│       └── server.ts ← Entry point
│
├── spring-orchestrator/ (Java + Spring Boot)
│   └── src/main/java/com/perbillion/orchestrator/
│       ├── controller/
│       │   └── ForecastController.java
│       │       ├── /api/forecasts/generate
│       │       └── /api/forecasts/history
│       │
│       ├── service/
│       │   ├── DataFetchService.java (Alpha Vantage)
│       │   └── ForecastOrchestrationService.java
│       │
│       ├── repository/
│       │   └── ForecastRepository.java (MongoDB)
│       │
│       └── model/
│           └── Forecast.java
│
└── ml-engine/ (Python + Flask)
    ├── app.py ← Flask server
    └── forecasting/
        ├── forecast_service.py (main logic)
        ├── diagnostics.py (stationarity tests)
        ├── tuning.py (parameter optimization)
        └── validation.py (cross-validation)
```

---

## Database Schema

### MongoDB Collection: `forecasts`

```javascript
{
  _id: ObjectId("..."),
  ticker: "AAPL",
  createdAt: ISODate("2025-12-17T12:00:00Z"),
  
  // Model results
  models: {
    arima: {
      accuracy: 87.5,
      mape: 0.0234,
      mae: 2.45,
      mse: 8.92,
      forecast: [
        { date: "2025-12-24", value: 175.23, upper: 180.45, lower: 170.01 },
        { date: "2025-12-31", value: 176.89, upper: 182.11, lower: 171.67 },
        // ...
      ],
      parameters: { p: 5, d: 1, q: 0 }
    },
    
    sarima: {
      accuracy: 89.2,
      mape: 0.0198,
      mae: 2.12,
      mse: 7.34,
      forecast: [ /* ... */ ],
      parameters: { p: 1, d: 1, q: 1, P: 1, D: 1, Q: 1, s: 52 }
    },
    
    sarimax: { /* ... */ },
    holtWinters: { /* ... */ },
    hybrid: { /* ... */ }
  },
  
  // Historical data used
  historicalData: [
    { date: "2024-01-01", value: 150.23 },
    { date: "2024-01-08", value: 152.45 },
    // ...
  ],
  
  // Configuration
  config: {
    forecastMonths: 12,
    seasonalPeriod: 52,
    trainRatio: 0.8
  }
}
```

### MongoDB Collection: `experiments` (optional)

```javascript
{
  _id: ObjectId("..."),
  ticker: "AAPL",
  experimentDate: ISODate("2025-12-17T12:00:00Z"),
  
  // Parameter grid search results
  parameterTests: [
    { p: 1, d: 1, q: 1, accuracy: 85.2, mape: 0.0287 },
    { p: 2, d: 1, q: 0, accuracy: 86.7, mape: 0.0245 },
    // ...
  ],
  
  bestParameters: { p: 5, d: 1, q: 0 },
  
  // Diagnostics
  diagnostics: {
    stationarity: {
      adfTest: { statistic: -3.45, pValue: 0.0089, isStationary: true },
      kpssTest: { statistic: 0.234, pValue: 0.1, isStationary: true }
    },
    seasonality: {
      detected: true,
      period: 52,
      strength: 0.73
    }
  }
}
```

---

## Technology Stack Details

### Frontend Stack
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.2.0 | UI framework |
| TypeScript | 5.3.3 | Type safety |
| Vite | 5.0.10 | Build tool |
| TailwindCSS | 3.4.0 | Styling |
| Recharts | 2.10.3 | Charts |
| Axios | 1.6.2 | HTTP client |

### Backend Stack
| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 18+ | Runtime |
| Express | 4.18.2 | API framework |
| Spring Boot | 3.2.0 | Orchestration |
| Java | 17 | Backend language |
| Python | 3.11 | ML engine |
| Flask | 2.3.0 | Python API |

### Data & ML Stack
| Technology | Version | Purpose |
|------------|---------|---------|
| MongoDB | 7.0 | Database |
| statsmodels | 0.14.0 | Time series models |
| pandas | 2.1.0 | Data manipulation |
| numpy | 1.24.0 | Numerical computing |

### Infrastructure
| Technology | Version | Purpose |
|------------|---------|---------|
| Docker | 24.0+ | Containerization |
| Docker Compose | 2.0+ | Orchestration |
| Nginx | 1.25-alpine | Reverse proxy |

---

## Deployment Architecture

### Development Environment
```
Local Machine (macOS)
├── Docker Desktop
│   ├── perbillion-frontend (React + Vite)
│   ├── perbillion-api-gateway (Node.js)
│   ├── perbillion-spring-orchestrator (Java)
│   ├── perbillion-ml-engine (Python)
│   ├── perbillion-mongodb (MongoDB)
│   └── perbillion-nginx (Nginx)
│
└── Ports:
    ├── 80 → Nginx (public)
    ├── 443 → Nginx SSL (public)
    ├── 3000 → API Gateway (internal)
    ├── 5000 → ML Engine (internal)
    ├── 5173 → Frontend Dev Server (dev only)
    ├── 8080 → Spring Orchestrator (internal)
    └── 27017 → MongoDB (internal)
```

### Production Environment (AWS Example)
```
AWS Cloud
│
├── Route 53 (DNS)
│   └── perbillion.com → ALB
│
├── Application Load Balancer
│   ├── SSL Certificate (ACM)
│   └── Target Groups
│       ├── Frontend (EC2)
│       ├── API Gateway (EC2)
│       └── Spring Orchestrator (EC2)
│
├── EC2 Instances
│   ├── Frontend (t3.small)
│   ├── API Gateway (t3.small)
│   ├── Spring Orchestrator (t3.medium)
│   └── ML Engine (c5.large)
│
├── MongoDB Atlas (Managed)
│   └── M10 Cluster (3 nodes)
│
├── S3 Buckets
│   ├── Static Assets
│   └── Forecast Exports
│
├── CloudWatch
│   ├── Logs
│   └── Metrics
│
└── VPC
    ├── Public Subnet (ALB)
    ├── Private Subnet (App Servers)
    └── Security Groups
        ├── ALB → 80, 443
        ├── App → 3000, 5000, 8080
        └── DB → 27017
```

---

## Security Architecture

```
┌─────────────────────────────────────────────┐
│           Security Layers                    │
├─────────────────────────────────────────────┤
│                                              │
│  1. Network Layer                           │
│     ├── CORS Policy                         │
│     ├── Rate Limiting (100 req/15min)       │
│     └── IP Whitelisting (optional)          │
│                                              │
│  2. Application Layer                       │
│     ├── Input Validation                    │
│     ├── SQL Injection Prevention            │
│     ├── XSS Protection (React)              │
│     └── CSRF Tokens (if auth added)         │
│                                              │
│  3. Data Layer                              │
│     ├── MongoDB Authentication              │
│     ├── Encrypted Connections               │
│     └── Regular Backups                     │
│                                              │
│  4. Infrastructure Layer                    │
│     ├── Docker Container Isolation          │
│     ├── Environment Variables               │
│     ├── SSL/TLS Encryption                  │
│     └── Security Updates                    │
│                                              │
└─────────────────────────────────────────────┘
```

---

## Monitoring & Observability

```
Monitoring Stack (Future Enhancement)

┌──────────────────────────────────────┐
│         Application Metrics          │
│  ├── Request Rate                    │
│  ├── Response Time                   │
│  ├── Error Rate                      │
│  └── Active Users                    │
└────────────┬─────────────────────────┘
             │
             ▼
┌──────────────────────────────────────┐
│         Infrastructure Metrics        │
│  ├── CPU Usage                       │
│  ├── Memory Usage                    │
│  ├── Disk I/O                        │
│  └── Network Traffic                 │
└────────────┬─────────────────────────┘
             │
             ▼
┌──────────────────────────────────────┐
│         Business Metrics              │
│  ├── Forecasts Generated/Day         │
│  ├── Average Forecast Accuracy       │
│  ├── Most Popular Tickers            │
│  └── Model Usage Distribution        │
└────────────┬─────────────────────────┘
             │
             ▼
┌──────────────────────────────────────┐
│      Aggregation & Alerting          │
│  ├── Prometheus (metrics)            │
│  ├── Grafana (dashboards)            │
│  ├── ELK Stack (logs)                │
│  └── PagerDuty (alerts)              │
└──────────────────────────────────────┘
```

---

This architecture is designed for:
- ✅ Scalability (horizontal scaling of ML engines)
- ✅ Reliability (container health checks, auto-restart)
- ✅ Maintainability (modular services, clear separation)
- ✅ Performance (caching, connection pooling)
- ✅ Security (multiple layers of protection)
