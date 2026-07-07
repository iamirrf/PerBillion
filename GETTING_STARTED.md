# 🚀 Getting Started with Your New PerBillion Platform

Congratulations! Your PerBillion platform has been completely redesigned with a modern, Dash-inspired interface. Here's everything you need to know to get started.

---

## 🎯 What Changed?

Your platform now features:

✅ **Modern Dashboard UI** - Beautiful, gradient-based design with interactive charts  
✅ **No Authentication Required** - Direct access to forecasting (simplified UX)  
✅ **No CSV Uploads** - Just enter a stock ticker and get instant predictions  
✅ **MongoDB Only** - PostgreSQL completely removed, simplified architecture  
✅ **Interactive Charts** - Zoom, pan, tooltips with Recharts library  
✅ **Model Comparison** - View all 5 forecasting models side-by-side  
✅ **Simple/Advanced Mode** - Toggle between basic and expert interfaces  
✅ **95% Confidence Intervals** - Understand prediction uncertainty visually  

---

## 📋 Quick Start (3 Steps)

### Step 1: Get Your API Key
1. Visit https://www.alphavantage.co/support/#api-key
2. Enter your email to get a **free** API key
3. Copy the API key (you'll need it in Step 2)

### Step 2: Configure Environment
```bash
cd /Users/amir/Downloads/Business/Code/PerBillion

# Create your environment file
cp .env.example .env

# Edit the .env file
nano .env  # or use: code .env
```

**Add your Alpha Vantage API key** to the `.env` file:
```env
ALPHA_VANTAGE_API_KEY=your_actual_api_key_here
```

Save and exit.

### Step 3: Start the Platform
```bash
# Make the quickstart script executable (already done)
chmod +x quickstart.sh

# Run the setup
./quickstart.sh
```

The script will:
- ✅ Check Docker installation
- ✅ Verify your .env configuration
- ✅ Build all containers
- ✅ Start all services
- ✅ Verify health of each component
- ✅ Display access URLs

---

## 🌐 Accessing Your Dashboard

Once the quickstart script completes:

**Main Dashboard**: http://localhost  
**Direct Frontend**: http://localhost:5173  
**API Gateway**: http://localhost:3000  
**Spring API Docs**: http://localhost:8080/swagger-ui.html  

---

## 📊 How to Use the Dashboard

### Basic Usage (Simple Mode)

1. **Enter Stock Ticker**
   - Type any valid stock symbol (e.g., AAPL, TSLA, MSFT, GOOGL)
   - Ticker must be 1-5 uppercase letters

2. **Set Forecast Horizon**
   - Choose 4-52 weeks (default is 12 weeks)
   - Represents how far into the future you want to predict

3. **Click "Generate Forecast"**
   - Wait 30-60 seconds for processing
   - The ML engine will analyze historical data
   - All 5 models will generate predictions

4. **View Results**
   - **Metrics Table**: Shows accuracy, MAPE, MAE, MSE for each model
   - **Main Chart**: Interactive visualization with confidence intervals
   - **Comparison Chart**: All models overlaid for comparison

### Advanced Usage (Advanced Mode)

Click "Advanced Mode" button to access:

**ARIMA Parameters**:
- `p` (Autoregressive order): 0-10, default 5
- `d` (Differencing order): 0-3, default 1
- `q` (Moving average order): 0-10, default 0

**Seasonal Period**:
- Quarterly (4 weeks)
- Quarterly+ (13 weeks)
- Semi-Annual (26 weeks)
- Annual (52 weeks) ← Most common for stocks

**Train Ratio**:
- 0.5 to 0.95 (default 0.8)
- Percentage of historical data used for training
- Higher = more training data, lower = more validation data

---

## 🎨 Understanding the UI

### Color Coding
- **ARIMA**: Blue (#3b82f6)
- **SARIMA**: Purple (#8b5cf6)
- **SARIMAX**: Pink (#ec4899)
- **Holt-Winters**: Green (#10b981)
- **Hybrid**: Orange (#f59e0b)

### Chart Elements
- **Gray Line**: Historical actual prices
- **Colored Line**: Model forecast
- **Shaded Area**: 95% confidence interval (uncertainty range)
- **Dots**: Individual data points in forecast

### Metrics Explained
- **Accuracy**: Percentage of correctness (higher is better)
- **MAPE**: Mean Absolute Percentage Error (lower is better)
- **MAE**: Mean Absolute Error in dollars (lower is better)
- **MSE**: Mean Squared Error (lower is better)

---

## 🔧 Development Workflow

### Frontend Development (Hot Reload)
```bash
cd services/frontend
npm install
npm run dev
# Access at http://localhost:5173
```

**Edit**: `services/frontend/src/pages/ForecastDashboard.tsx`

### API Gateway Development
```bash
cd services/api-gateway
npm install
npm run dev
# Access at http://localhost:3000
```

**Edit**: `services/api-gateway/src/routes/forecast.ts`

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f frontend
docker-compose logs -f api-gateway
docker-compose logs -f spring-orchestrator
docker-compose logs -f ml-engine
docker-compose logs -f mongodb
```

---

## 🐛 Troubleshooting

### Issue: "Failed to generate forecast"

**Possible Causes**:
1. Invalid ticker symbol
2. Alpha Vantage API rate limit (5 calls/min on free tier)
3. Network connectivity issues

**Solutions**:
```bash
# Check API Gateway logs
docker-compose logs api-gateway

# Verify ticker is valid (max 5 characters, uppercase)
# Wait 1 minute between requests if rate limited
```

### Issue: Charts not displaying

**Possible Causes**:
1. Data not loaded from API
2. Browser cache issue
3. Recharts not installed

**Solutions**:
```bash
# Rebuild frontend
cd services/frontend
npm install
npm run build

# Clear browser cache
# Hard reload: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

# Check browser console for errors
# Right-click → Inspect → Console
```

### Issue: MongoDB connection failed

**Solutions**:
```bash
# Restart MongoDB
docker restart perbillion-mongodb

# Check MongoDB logs
docker logs perbillion-mongodb

# Verify .env has correct credentials
cat .env | grep MONGO
```

### Issue: Port already in use

**Solutions**:
```bash
# Find process using port 80
lsof -i :80

# Kill the process
kill -9 <PID>

# Or change port in docker-compose.yml
# Under nginx service, change "80:80" to "8080:80"
# Then access at http://localhost:8080
```

---

## 📚 Understanding the Models

### When to Use Each Model

**ARIMA** (Default)
- ✅ General-purpose forecasting
- ✅ Short to medium-term predictions
- ✅ Fast computation
- ❌ Doesn't capture complex seasonality

**SARIMA** (Seasonal)
- ✅ Stocks with clear seasonal patterns
- ✅ Quarterly earnings cycles
- ✅ Better for 6+ month forecasts
- ❌ Slower computation

**SARIMAX** (With External Factors)
- ✅ When market factors matter
- ✅ Most sophisticated analysis
- ✅ Best accuracy potential
- ❌ Longest computation time

**Holt-Winters** (Exponential Smoothing)
- ✅ Volatile stocks
- ✅ Recent trend emphasis
- ✅ Strong seasonal patterns
- ❌ Can be unstable with outliers

**Hybrid** (Recommended)
- ✅ Combines all models
- ✅ Reduces individual model bias
- ✅ Most reliable overall
- ✅ Best for most use cases

---

## 🎓 Example Workflows

### Workflow 1: Quick Stock Check
```
1. Enter ticker: AAPL
2. Leave default settings (12 weeks, Simple mode)
3. Click "Generate Forecast"
4. Wait 30 seconds
5. Review Hybrid model forecast
6. Check accuracy metric
```

### Workflow 2: Detailed Analysis
```
1. Enter ticker: TSLA
2. Switch to "Advanced Mode"
3. Set forecast to 26 weeks (6 months)
4. Adjust ARIMA parameters if needed
5. Set seasonal period to 52 (annual)
6. Click "Generate Forecast"
7. Compare all 5 models
8. Look for consensus among models
9. Check confidence intervals
```

### Workflow 3: Model Comparison
```
1. Enter ticker: MSFT
2. Generate forecast
3. Click through model tabs (ARIMA → SARIMA → SARIMAX → etc.)
4. Compare accuracy percentages
5. Look at residuals (how far off predictions were)
6. Choose model with highest accuracy for your use case
```

---

## 📊 Sample Tickers to Try

### Tech Stocks
- AAPL (Apple)
- MSFT (Microsoft)
- GOOGL (Google)
- TSLA (Tesla)
- META (Meta/Facebook)
- NVDA (Nvidia)

### Financial
- JPM (JP Morgan)
- BAC (Bank of America)
- V (Visa)
- MA (Mastercard)

### Consumer
- WMT (Walmart)
- AMZN (Amazon)
- NKE (Nike)
- SBUX (Starbucks)

---

## 🚀 Next Steps

### Phase 1: Testing (Current)
- [x] Platform redesigned
- [x] No authentication required
- [x] Modern UI implemented
- [ ] Test with various tickers
- [ ] Validate model accuracy
- [ ] Gather user feedback

### Phase 2: Enhancements (Optional)
- [ ] Add export to CSV/PDF
- [ ] Implement forecast history
- [ ] Add multiple ticker comparison
- [ ] Create portfolio-level forecasting
- [ ] Add more data sources (Yahoo Finance, etc.)

### Phase 3: Production Deployment
- [ ] Deploy to AWS/Azure/GCP
- [ ] Set up custom domain
- [ ] Configure SSL certificates
- [ ] Enable analytics
- [ ] Set up monitoring

---

## 📖 Documentation Files

- **README_NEW.md**: Complete platform documentation
- **REDESIGN_SUMMARY.md**: Detailed list of all changes
- **IMPLEMENTATION_COMPLETE.md**: Original implementation details
- **quickstart.sh**: Automated setup script

---

## 💡 Pro Tips

1. **Best Results**: Use 26-52 week forecasts for stocks with seasonal patterns
2. **Accuracy**: Hybrid model usually provides best overall accuracy
3. **Confidence**: Wider confidence intervals = more uncertainty
4. **Comparison**: Always compare multiple models before making decisions
5. **Data Quality**: More historical data = better predictions
6. **API Limits**: Free tier = 5 calls/min, 500 calls/day

---

## ✅ Success Checklist

Before considering your setup complete:

- [ ] Docker Desktop running
- [ ] .env file created with Alpha Vantage API key
- [ ] quickstart.sh executed successfully
- [ ] Dashboard accessible at http://localhost
- [ ] Test forecast generated (e.g., AAPL)
- [ ] All 5 models displaying correctly
- [ ] Charts rendering with confidence intervals
- [ ] Metrics table showing accurate data
- [ ] Simple/Advanced mode toggle working
- [ ] No console errors in browser

---

## 🆘 Getting Help

**Issue Priority**:
1. Check this guide's troubleshooting section
2. Review README_NEW.md
3. Check logs: `docker-compose logs -f`
4. Review REDESIGN_SUMMARY.md for technical details

**Common Questions**:
- *"Where's the login?"* → Removed for simplicity. Direct dashboard access.
- *"Can I upload CSV?"* → No longer supported. Use stock tickers instead.
- *"Which model is best?"* → Hybrid model for most cases.
- *"How accurate are predictions?"* → Check the accuracy % in metrics table. 70%+ is good.

---

## 🎉 You're Ready!

Your platform is now a modern, professional forecasting tool. The interface is inspired by the best of Plotly Dash but built with React for maximum performance and flexibility.

**Key Features**:
- ✨ Beautiful, gradient-based UI
- 📊 Interactive, explorable charts
- 🔢 Comprehensive performance metrics
- 🎯 Direct stock ticker input
- ⚡ Fast, responsive design
- 🧠 5 sophisticated ML models
- 📈 Confidence interval visualization

Happy forecasting! 📈🚀
