# 🎯 PerBillion Quick Reference Card

## 🚀 Quick Start
```bash
# Start the system
cd /Users/amir/Downloads/Business/Code/PerBillion
docker-compose up -d

# Check health
curl http://localhost:3000/health | jq '.'

# Access app
open http://localhost:3001
```

## 📊 Generate Forecast (Basic)
1. Enter ticker: **AAPL**
2. Set weeks: **12**
3. Click: **Generate Forecast**
4. Wait: 30-90 seconds
5. View: Charts, tables, metrics
6. Export: CSV or JSON

## ⚙️ Advanced Options

### Preprocessing
- **Weekend Handling**: Business Days (recommended)
- **Outlier Detection**: Z-Score (threshold: 3.0)
- **Smoothing**: Optional

### Auto-Tuning
- **max_p, max_q**: 5 (default)
- **max_d**: 2 (default)
- **Seasonal**: max_P, max_Q: 2, max_D: 1

### Manual Tuning
- **ARIMA**: (p, d, q) = (1, 1, 1) good start
- **SARIMA**: (P, D, Q, s) = (1, 1, 1, 52) for weekly
- **Disable auto-tuning** when using manual params

## 📈 Model Selection Guide

| Stock Type | Recommended Model | Why |
|-----------|------------------|-----|
| Tech (AAPL, NVDA) | Auto-Select or SARIMA | Seasonal patterns |
| Stable (KO, PG) | ARIMA or Holt-Winters | Predictable trends |
| Volatile (TSLA) | SARIMA with low outlier threshold | Handles spikes |
| Index (SPY) | Holt-Winters Additive | Smooth seasonality |

## 🔧 Troubleshooting

| Issue | Solution |
|-------|----------|
| Timeout | Reduce max_p, max_q or use manual params |
| No chart | Check browser console (F12) |
| Bad predictions | Try different model or preprocessing |
| "Data unsuitable" | Need 50+ data points, check ticker |

## 📁 Export Files

### CSV Format
```
Type,Date,Value,Upper_CI,Lower_CI
Historical,2024-01-01,150.00,,
Forecast,2025-01-01,155.00,160.00,150.00
```

### JSON Structure
```json
{
  "metadata": { "ticker", "model", "dates" },
  "metrics": { "mae", "rmse", "aic", "bic" },
  "forecast": { "dates", "predictions", "confidence" },
  "diagnostics": { "preprocessing", "quality" }
}
```

## 🎯 Best Practices

✅ Use "Business Days Only" for weekends  
✅ Enable outlier detection (Z-score, 3.0)  
✅ Let auto-tuning select model  
✅ Set 4-12 week horizon  
✅ Compare multiple models  
✅ Export results for analysis  

## 📊 Understanding Metrics

| Metric | Good Value | Interpretation |
|--------|-----------|----------------|
| MAE | < 5% of price | Average error |
| RMSE | < 10% of price | Error with penalty |
| Stability | > 0.9 | Model reliability |
| AIC/BIC | Lower is better | Model quality |

## 🐛 Common Errors

```
"Insufficient data" → Need 50+ observations
"Seasonal required" → Use ARIMA instead of SARIMA
"Timeout" → Reduce grid search parameters
"Invalid ticker" → Check symbol spelling
```

## 🔍 Debug Commands

```bash
# Check logs
docker logs perbillion-ml-engine --tail 50

# Restart ML engine
docker-compose restart ml-engine

# Check health
curl http://localhost:3000/health | jq '.checks'

# Full restart
docker-compose down && docker-compose up -d
```

## 🌟 Feature Checklist

Before each forecast, decide:

- [ ] Which model? (Auto / specific)
- [ ] Weekend handling? (Business days / fill / interpolate)
- [ ] Outlier detection? (Yes / No)
- [ ] Auto-tuning? (Yes / Manual params)
- [ ] Forecast horizon? (4-52 weeks)

## 📞 Quick Links

- **App**: http://localhost:3001
- **Health**: http://localhost:3000/health
- **Docs**: ADVANCED_FEATURES_COMPLETE.md
- **Tests**: TESTING_GUIDE.md

## ⚡ Keyboard Shortcuts

- **F12**: Open browser console
- **Ctrl/Cmd + K**: Clear console
- **Ctrl/Cmd + R**: Reload page
- **Esc**: Close modals/panels

## 💾 Save This!

Bookmark this card for quick reference during forecasting sessions!

---

**Version**: 2.0 Advanced  
**Last Updated**: Dec 18, 2025  
**Status**: Production Ready ✅
