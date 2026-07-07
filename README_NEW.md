# PerBillion - Modern Stock Forecasting Platform

**Advanced time series forecasting with interactive visualizations**

PerBillion is a production-ready forecasting platform that combines classical statistical methods (ARIMA, SARIMA, SARIMAX, Holt-Winters) with a modern, intuitive user interface. Built for accuracy, transparency, and ease of use.

## 🎯 Features

### **Modern Dashboard Interface**
- **No CSV uploads required** - Just enter a stock ticker and forecast horizon
- **Real-time data fetching** from Alpha Vantage API
- **Interactive visualizations** with Recharts - zoom, pan, tooltips
- **Simple & Advanced modes** - Perfect for both beginners and experts
- **Multiple model comparison** - View all forecasting models side-by-side
- **95% Confidence intervals** - Understand forecast uncertainty
- **Responsive design** - Works on desktop, tablet, and mobile

### **Forecasting Models**
All models implemented and fully functional:
- ✅ **ARIMA** - AutoRegressive Integrated Moving Average
- ✅ **SARIMA** - Seasonal ARIMA with configurable periods
- ✅ **SARIMAX** - SARIMA with exogenous variables
- ✅ **Holt-Winters** - Exponential Smoothing (Additive, Multiplicative, Damped)
- ✅ **Hybrid** - Ensemble combining all models for improved accuracy

### **Performance Metrics**
- **Accuracy Percentage** - How well the model fits historical data
- **MAPE** (Mean Absolute Percentage Error)
- **MAE** (Mean Absolute Error)
- **MSE** (Mean Squared Error)
- **Confidence Intervals** - 95% prediction bands

### **Advanced Configuration**
- Custom ARIMA parameters (p, d, q)
- Configurable seasonal periods (4, 13, 26, 52 weeks)
- Adjustable train/test split ratio
- Model auto-tuning capabilities

---

## 🏗️ Architecture

```
┌──────────────┐
│   Modern     │  React + TypeScript + Recharts
│  Dashboard   │  Tailwind CSS, No Authentication
└──────┬───────┘
       │
┌──────▼───────┐
│    Nginx     │  Reverse Proxy, Port 80
└──────┬───────┘
       │
       ├─────────────────────────┐
       │                         │
┌──────▼──────┐         ┌────────▼────────┐
│   Node.js   │         │  Spring Boot    │
│ API Gateway │◄────────┤  Orchestrator   │
│  Port 3000  │         │   Port 8080     │
└─────────────┘         └────────┬────────┘
                                 │
                        ┌────────▼─────────┐
                        │     Python       │
                        │   ML Engine      │
                        │   Port 5000      │
                        └────────┬─────────┘
                                 │
                        ┌────────▼─────────┐
                        │     MongoDB      │
                        │  Port 27017      │
                        │ (Forecasts &     │
                        │  Historical)     │
                        └──────────────────┘
```

### **Technology Stack**
- **Frontend**: React 18, TypeScript, Vite, TailwindCSS, Recharts
- **API Gateway**: Node.js, Express, TypeScript
- **Orchestrator**: Spring Boot, Java 17
- **ML Engine**: Python 3.11, statsmodels, pandas, numpy
- **Database**: MongoDB 7 (single database, simplified)
- **Infrastructure**: Docker Compose, Nginx

---

## 🚀 Quick Start

### Prerequisites
- Docker Desktop installed
- Alpha Vantage API key (free from https://www.alphavantage.co/support/#api-key)

### 1. Clone and Configure

```bash
git clone <repository-url>
cd PerBillion

# Create environment file
cp .env.example .env

# Edit .env and add your Alpha Vantage API key
nano .env  # or use your favorite editor
```

**Important**: Add your Alpha Vantage API key in `.env`:
```env
ALPHA_VANTAGE_API_KEY=your_actual_api_key_here
```

### 2. Start the Application

```bash
# Make the start script executable
chmod +x start.sh

# Start all services
./start.sh
```

This will:
- Build and start all Docker containers
- Initialize MongoDB
- Start the ML engine
- Launch the Spring orchestrator
- Start the API gateway
- Serve the frontend

### 3. Access the Application

Open your browser and navigate to:
```
http://localhost
```

You'll see the modern PerBillion interface immediately - no login required!

---

## 📊 How to Use

### **Simple Mode (Default)**

1. **Enter a stock ticker** (e.g., AAPL, TSLA, MSFT)
2. **Set forecast horizon** (4-52 weeks)
3. **Click "Generate Forecast"**
4. **View results**:
   - Performance metrics table
   - Interactive forecast chart with confidence intervals
   - Model comparison chart

### **Advanced Mode**

Click "Advanced Mode" to access:
- ARIMA parameters (p, d, q)
- Seasonal period selection
- Training ratio adjustment
- Fine-tune model behavior

### **Understanding Results**

- **Blue/Purple/Green lines**: Different model forecasts
- **Shaded area**: 95% confidence interval
- **Higher accuracy**: Better model performance
- **Lower MAPE/MAE/MSE**: More precise predictions

---

## 🛠️ Development

### Project Structure

```
PerBillion/
├── services/
│   ├── frontend/           # React dashboard
│   │   └── src/
│   │       └── pages/
│   │           └── ForecastDashboard.tsx
│   ├── api-gateway/        # Node.js API (no auth)
│   ├── spring-orchestrator/ # Java orchestration
│   └── ml-engine/          # Python forecasting
├── nginx/                  # Reverse proxy config
├── database/
│   └── mongodb/            # MongoDB initialization
├── docker-compose.yml      # Service orchestration
└── .env.example           # Environment template
```

### Running in Development

```bash
# Frontend only (with hot reload)
cd services/frontend
npm install
npm run dev

# API Gateway only
cd services/api-gateway
npm install
npm run dev

# ML Engine only
cd services/ml-engine
pip install -r requirements.txt
python app.py

# Spring Orchestrator
cd services/spring-orchestrator
./mvnw spring-boot:run
```

### Making Changes

**Frontend**: Edit `services/frontend/src/pages/ForecastDashboard.tsx`
**Styling**: Modify Tailwind classes directly in the component
**API Routes**: Update `services/api-gateway/src/routes/forecast.ts`
**Forecasting Logic**: Modify `services/ml-engine/forecasting/`

---

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ALPHAVANTAGE_API_KEY` | Stock data API key | required, no default |
| `MONGO_PASSWORD` | MongoDB password | required, no default |
| `NODE_ENV` | Environment mode | development |
| `VITE_API_URL` | Frontend API URL | http://localhost:3000 |

### Model Parameters

**ARIMA**:
- `p`: Autoregressive order (0-10)
- `d`: Differencing order (0-3)
- `q`: Moving average order (0-10)

**Seasonal Period**:
- `4`: Quarterly
- `13`: Quarterly extended
- `26`: Semi-annual
- `52`: Annual (weekly data)

---

## 📈 API Endpoints

### Generate Forecast
```bash
POST /api/forecast/generate
Content-Type: application/json

{
  "ticker": "AAPL",
  "forecastMonths": 12,
  "models": ["arima", "sarima", "sarimax", "holt-winters"],
  "parameters": {
    "arima": { "p": 5, "d": 1, "q": 0 },
    "seasonalPeriod": 52,
    "trainRatio": 0.8
  }
}
```

### Get Forecast History
```bash
GET /api/forecast/history?ticker=AAPL&limit=10
```

### Get Specific Forecast
```bash
GET /api/forecast/:forecastId
```

---

## 🎨 Design Philosophy

### **Modern & Clean**
- Gradient backgrounds for visual appeal
- Card-based layout for organization
- Ample whitespace for readability
- Professional color scheme (blues, purples, greens)

### **User-Centric**
- No complex authentication flow
- Immediate access to forecasting
- Clear labeling and tooltips
- Responsive to all screen sizes

### **Data-Driven**
- Real-time API data fetching
- Comprehensive metrics display
- Interactive charts for exploration
- Confidence intervals for transparency

---

## 🐛 Troubleshooting

### Forecast Generation Fails
- **Check Alpha Vantage API key** in `.env`
- **Verify ticker symbol** is valid (max 5 characters)
- **Check API rate limits** (free tier: 5 calls/minute)

### Charts Not Displaying
- **Ensure data is loaded** - check browser console
- **Verify Recharts installation**: `npm list recharts`
- **Clear browser cache** and reload

### MongoDB Connection Issues
```bash
# Restart MongoDB container
docker restart perbillion-mongodb

# Check MongoDB logs
docker logs perbillion-mongodb
```

### Port Conflicts
```bash
# Change ports in docker-compose.yml
# Default ports: 80 (nginx), 3000 (api), 5173 (frontend)
```

---

## 📚 Model Information

### **ARIMA**
Best for: Short-term trends, stationary data
- Captures linear trends
- Handles autocorrelation
- Fast computation

### **SARIMA**
Best for: Seasonal patterns (quarterly, annual)
- Incorporates seasonality
- More complex than ARIMA
- Better for cyclical stocks

### **SARIMAX**
Best for: When external factors matter
- Includes exogenous variables
- Most sophisticated model
- Longer computation time

### **Holt-Winters**
Best for: Strong seasonal trends
- Exponential smoothing
- Adaptive to recent changes
- Good for volatile stocks

### **Hybrid**
Best for: Maximum accuracy
- Combines all models
- Reduces individual model bias
- Recommended for most use cases

---

## 🤝 Contributing

Contributions welcome! Areas for improvement:
- Additional forecasting models (LSTM, Prophet)
- More data sources beyond Alpha Vantage
- Export functionality (CSV, PDF reports)
- Historical forecast comparison
- Portfolio-level forecasting

---

## 📄 License

MIT License - see LICENSE file

---

## 🙏 Acknowledgments

- **statsmodels** - Python time series library
- **Recharts** - React charting library
- **Alpha Vantage** - Stock market data API
- **TailwindCSS** - Utility-first CSS framework

---

## 📞 Support

For issues or questions:
1. Check the FAQ section in the dashboard
2. Review troubleshooting guide above
3. Open an issue on GitHub
4. Check API status: https://www.alphavantage.co/

---

**Built with ❤️ for accurate, transparent stock forecasting**
