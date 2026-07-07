# Quick Testing Guide - PerBillion Advanced Forecasting

## Access the Application

1. **Open Browser**: Navigate to http://localhost:3001 (or http://localhost)
2. **Login** (if prompted): Use your credentials
3. **Navigate**: Go to Forecast page

---

## ✅ Test 1: Basic Forecast (Auto Everything)

### Steps:
1. Enter ticker: **AAPL**
2. Forecast horizon: **12 weeks**
3. Model type: **Auto-Select**
4. Click **Generate Forecast**

### Expected Results:
- ✅ Loading indicator with progress messages
- ✅ Beautiful chart appears with:
  - Blue line: Historical prices
  - Yellow dotted line: Forecast predictions
  - Shaded area: 95% confidence interval
- ✅ 4 Quick stats cards (Current Price, Model, MAE, Stability)
- ✅ Sortable forecast table with all predictions
- ✅ Model performance metrics
- ✅ Model parameters
- ✅ AI interpretation text
- ✅ Export CSV and JSON buttons work

---

## ✅ Test 2: Advanced Preprocessing Options

### Steps:
1. Enter ticker: **NVDA**
2. Click **"Show Advanced Options"**
3. In Preprocessing section:
   - Set Weekend Handling: **Business Days Only**
   - Set Outlier Detection: **Z-Score**
   - Adjust threshold to: **2.5**
4. Click **Generate Forecast**

### Expected Results:
- ✅ Forecast generated successfully
- ✅ Check diagnostics for preprocessing log
- ✅ Should mention "Converted to business days"
- ✅ Should mention outliers detected (if any)

---

## ✅ Test 3: Manual Hyperparameter Tuning

### Steps:
1. Enter ticker: **TSLA**
2. Click **"Manual Hyperparameter Tuning"**
3. Set ARIMA Order:
   - p: **2**
   - d: **1**
   - q: **2**
4. Set Seasonal Order:
   - P: **1**
   - D: **1**
   - Q: **1**
   - s: **52**
5. Click **Generate Forecast**

### Expected Results:
- ✅ Forecast uses exact parameters (2,1,2) and (1,1,1,52)
- ✅ Tuning summary shows "manual_params_used": true
- ✅ No grid search performed (faster generation)

---

## ✅ Test 4: Model Comparison

### Steps:
Run 3 forecasts with different models for **MSFT**:

**Forecast A:**
- Model Type: **ARIMA**
- Generate and note MAE

**Forecast B:**
- Model Type: **SARIMA**
- Generate and note MAE

**Forecast C:**
- Model Type: **Holt-Winters (Additive)**
- Generate and note MAE

### Expected Results:
- ✅ All 3 forecasts complete successfully
- ✅ Different MAE values for each model
- ✅ Different parameters displayed
- ✅ Can compare which model performs best

---

## ✅ Test 5: Table Sorting

### Steps:
1. Generate any forecast
2. Scroll to "Detailed Forecast Data" table
3. Click on **"Predicted Price"** column header
4. Click again to reverse sort
5. Click on **"Range"** column header

### Expected Results:
- ✅ First click: sorts ascending (↑ arrow)
- ✅ Second click: sorts descending (↓ arrow)
- ✅ Table reorders accordingly
- ✅ All columns are sortable

---

## ✅ Test 6: Data Export

### Steps:
1. Generate any forecast
2. Click **"Export CSV"**
3. Open the CSV file
4. Click **"Export JSON"**
5. Open the JSON file

### Expected Results:

**CSV File Contains:**
- ✅ Historical data rows
- ✅ Forecast data rows
- ✅ Date, Value, Upper_CI, Lower_CI columns

**JSON File Contains:**
- ✅ Metadata (ticker, model, dates)
- ✅ Metrics (MAE, RMSE, AIC, BIC)
- ✅ Parameters (model coefficients)
- ✅ Historical data
- ✅ Forecast data
- ✅ Interpretation
- ✅ Diagnostics

---

## ✅ Test 7: Advanced Tuning Controls

### Steps:
1. Enter ticker: **GOOG**
2. Click **"Show Advanced Options"**
3. Enable Auto-Tuning (checkbox)
4. Set custom grid search ranges:
   - Max p: **3**
   - Max d: **1**
   - Max q: **3**
   - Max P: **1**
   - Max D: **1**
   - Max Q: **1**
5. Click **Generate Forecast**

### Expected Results:
- ✅ Grid search limited to smaller space
- ✅ Faster generation (fewer models evaluated)
- ✅ Tuning summary shows reduced search space

---

## ✅ Test 8: Different Weekend Handling Methods

### Steps:
Run 3 forecasts for **AAPL** with different weekend handling:

**Test A - Business Days:**
- Weekend Handling: **Business Days Only**
- Note the number of processed observations

**Test B - Forward Fill:**
- Weekend Handling: **Forward Fill Weekends**
- Note the number of processed observations

**Test C - Interpolate:**
- Weekend Handling: **Interpolate Weekends**
- Note the number of processed observations

### Expected Results:
- ✅ Business Days: ~260 observations (52 weeks × 5 days)
- ✅ Forward Fill: ~365 observations (includes weekends)
- ✅ Interpolate: ~365 observations (includes weekends)
- ✅ Different preprocessing logs for each

---

## ✅ Test 9: Error Handling

### Steps:
1. Enter an invalid ticker: **INVALIDTICKER**
2. Click **Generate Forecast**

### Expected Results:
- ✅ Error message appears
- ✅ No crash
- ✅ User can try again with valid ticker

---

## ✅ Test 10: Visual Elements

### Verify All UI Elements:
- ✅ Header with "PerBillion AI Forecasting"
- ✅ Input controls (ticker, weeks, model selector)
- ✅ "Show Advanced Options" button
- ✅ "Manual Hyperparameter Tuning" button
- ✅ Collapsible panels expand/collapse
- ✅ Chart is interactive (zoom, pan, hover)
- ✅ Quick stats cards have colored gradients
- ✅ Table has hover effects
- ✅ Export buttons have icons
- ✅ Loading spinner appears during generation
- ✅ Progress messages update

---

## 🐛 Troubleshooting

### Issue: "Forecast generation timed out"
**Solution**: 
- Reduce max_p, max_q values in advanced options
- Use manual parameters instead of auto-tuning
- Try a simpler model (ARIMA instead of SARIMA)

### Issue: "No forecast displayed"
**Check**:
- Browser console for JavaScript errors (F12)
- Docker logs: `docker logs perbillion-ml-engine`
- API Gateway logs: `docker logs perbillion-api-gateway`
- Health endpoint: http://localhost:3000/health

### Issue: "Data unsuitable for modeling"
**Reasons**:
- Insufficient data points (need at least 50)
- Too many missing values
- Data quality too low

**Solution**:
- Try a different ticker with more history
- Adjust preprocessing options
- Lower outlier threshold

---

## 📊 Performance Benchmarks

Expected generation times:
- **Simple ARIMA**: 10-30 seconds
- **SARIMA with auto-tuning**: 30-90 seconds
- **Holt-Winters**: 20-60 seconds
- **Manual parameters**: 5-15 seconds (no tuning)

---

## ✨ Success Criteria

All of the following should work:

✅ Forecast displays with beautiful chart
✅ Table shows all forecast data points
✅ Export CSV downloads complete file
✅ Export JSON downloads complete file
✅ Advanced options can be toggled
✅ Manual tuning parameters can be set
✅ Different models can be selected
✅ Table sorting works on all columns
✅ Quick stats show accurate numbers
✅ AI interpretation provides insights
✅ Model metrics displayed correctly
✅ No errors in browser console
✅ No errors in Docker logs

---

## 🎯 Final Validation

Run this comprehensive test sequence:

1. **Basic Auto Forecast**: AAPL with defaults → Success
2. **Advanced Preprocessing**: NVDA with business days → Success
3. **Manual Tuning**: TSLA with manual params → Success
4. **Model Selection**: MSFT with SARIMA → Success
5. **Export Functions**: Download CSV and JSON → Success
6. **Table Sorting**: Sort by all columns → Success
7. **Different Tickers**: Test GOOG, AMZN, META → All succeed

If all tests pass: **System is fully operational!** ✅

---

## 📞 Support

- Frontend: http://localhost:3001
- API: http://localhost:3000
- Health: http://localhost:3000/health
- Logs: `docker-compose logs -f`

**Documentation**: See ADVANCED_FEATURES_COMPLETE.md for full feature list
