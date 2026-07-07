# Forecast 400 Error - Root Cause and Fix

## Problem
Users were getting "400 Bad Request from POST http://ml-engine:5000/api/forecast" when trying to generate forecasts.

## Root Cause
The data flow through the system had mismatched expectations:

1. **Frontend** → API Gateway:
   - Sent: `ticker`, `forecastMonths`, `modelType`
   - Missing: Historical price data

2. **API Gateway** → Spring Orchestrator:
   - Sent: `ticker`, `periods`, `models`, `parameters`
   - Wrong field names (expected: `forecastHorizon`, `userId`, `modelType`)
   - Missing: Historical price `data` array

3. **Spring Orchestrator** → ML Engine:
   - Expected to send: `ticker`, `data`, `forecast_horizon`, `model_type`
   - But couldn't because `data` was never provided or fetched

4. **ML Engine** validation:
   - Requires `data` field (historical prices as `[[date, price], ...]`)
   - Returned 400 when `data` was missing

## Solution Applied

### 1. Spring Orchestrator Service (`ForecastOrchestrationService.java`)
**Change**: Auto-fetch historical data if not provided

```java
// Fetch historical data if not provided
List<List<Object>> data = request.getData();
if (data == null || data.isEmpty()) {
    log.info("Fetching historical data for ticker: {}", request.getTicker());
    // Fetch last 2 years of weekly data
    java.time.LocalDate endDate = java.time.LocalDate.now();
    java.time.LocalDate startDate = endDate.minusYears(2);
    data = dataFetchService.fetchHistoricalData(request.getTicker(), startDate, endDate);
    
    if (data == null || data.isEmpty()) {
        throw new RuntimeException("No historical data available for ticker: " + request.getTicker());
    }
}
```

**Why**: The `DataFetchService` was already available but never used. Now it automatically fetches 2 years of weekly stock data from Alpha Vantage.

### 2. Forecast Request DTO (`ForecastRequest.java`)
**Change**: Made `data` field optional

```java
// Before:
@NotEmpty(message = "Historical data is required")
private List<List<Object>> data;

// After:
@Schema(description = "Historical price data as [date, price] pairs (optional - will be fetched automatically if not provided)")
private List<List<Object>> data;
```

**Why**: Since we now auto-fetch data, it doesn't need to be required in the request.

### 3. API Gateway Forecast Route (`forecast.ts`)
**Change**: Send correct field names matching Spring Orchestrator expectations

```typescript
// Before:
{
  ticker: ticker.toUpperCase(),
  periods: forecastMonths || 12,
  models: models || ['arima', 'sarima', 'sarimax', 'holt-winters'],
  parameters: parameters || {}
}

// After:
{
  userId: userId,
  ticker: ticker.toUpperCase(),
  forecastHorizon: forecastMonths || 12,
  modelType: modelType || 'auto',
  advancedConfig: advanced_config  // if provided
}
```

**Why**: Field names now match the DTO in Spring Orchestrator (`ForecastRequest.java`).

## Data Flow (Fixed)

1. **Frontend** sends:
   ```json
   {
     "ticker": "AAPL",
     "forecastMonths": 12,
     "modelType": "auto"
   }
   ```

2. **API Gateway** transforms and forwards:
   ```json
   {
     "userId": "user_123",
     "ticker": "AAPL",
     "forecastHorizon": 12,
     "modelType": "auto"
   }
   ```

3. **Spring Orchestrator**:
   - Receives request without `data`
   - Detects missing data
   - Calls `DataFetchService.fetchHistoricalData("AAPL", 2_years_ago, today)`
   - Gets ~104 weeks of historical data from Alpha Vantage
   - Builds ML request:
   ```json
   {
     "ticker": "AAPL",
     "data": [["2023-12-18", 156.23], ["2023-12-25", 158.45], ...],
     "forecast_horizon": 12,
     "model_type": "auto"
   }
   ```

4. **ML Engine**:
   - Receives complete request with data
   - Validates successfully (no 400 error)
   - Processes forecast
   - Returns results

## Testing
After restart:
```bash
docker-compose restart spring-orchestrator api-gateway
```

Try generating a forecast - should now work without 400 errors.

## Alpha Vantage Configuration
The Spring Orchestrator uses Alpha Vantage API for stock data. Configure your API key in:

**File**: `services/spring-orchestrator/src/main/resources/application.properties`

```properties
alphavantage.api.key=${ALPHAVANTAGE_API_KEY}
```

Set `ALPHAVANTAGE_API_KEY` in your environment. Get a free key at: https://www.alphavantage.co/support/#api-key

## Files Modified
1. `/services/spring-orchestrator/src/main/java/com/perbillion/orchestrator/service/ForecastOrchestrationService.java`
2. `/services/spring-orchestrator/src/main/java/com/perbillion/orchestrator/dto/ForecastRequest.java`
3. `/services/api-gateway/src/routes/forecast.ts`

## What This Fixes
- ✅ 400 Bad Request errors when generating forecasts
- ✅ Missing historical data in ML engine requests
- ✅ Field name mismatches between services
- ✅ Utilizes existing Alpha Vantage integration
- ✅ Automatic data fetching (no manual data input needed)
