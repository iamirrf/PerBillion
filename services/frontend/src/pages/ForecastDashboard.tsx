import React, { useState, useMemo, lazy, Suspense } from 'react';
import api from '../lib/api';
import LoadingQuote from '../components/LoadingQuote';

const Plot = lazy(() => import('react-plotly.js'));

interface ModelMetrics {
  mae: number;
  rmse: number;
  aic: number;
  aicc: number;
  bic: number;
  composite_score: number;
  stability_score: number;
}

interface ForecastData {
  forecastId: string;
  ticker: string;
  status: string;
  modelType: string;
  parameters: any;
  forecastData: {
    dates: string[];
    predictions: number[];
    confidence_intervals: {
      upper: number[];
      lower: number[];
      confidence_level: number;
    };
    historical_data: {
      dates: string[];
      values: number[];
    };
  };
  metrics: ModelMetrics;
  diagnostics: any;
  interpretation: string;
  createdAt: string;
  completedAt: string;
}

interface AdvancedConfig {
  preprocessing: {
    handle_weekends: 'business_days' | 'forward_fill' | 'interpolate';
    outlier_method: 'zscore' | 'iqr' | 'none';
    outlier_threshold: number;
    smooth_data: boolean;
  };
  tuning: {
    max_p: number;
    max_q: number;
    max_d: number;
    max_P: number;
    max_Q: number;
    max_D: number;
    enable_auto_tuning: boolean;
  };
}

interface ManualParams {
  arima_order?: [number, number, number];
  seasonal_order?: [number, number, number, number];
  smoothing_level?: number;
  smoothing_trend?: number;
  smoothing_seasonal?: number;
}

const POPULAR_STOCKS = [
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'MSFT', name: 'Microsoft Corporation' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.' },
  { symbol: 'TSLA', name: 'Tesla Inc.' },
  { symbol: 'META', name: 'Meta Platforms Inc.' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation' },
  { symbol: 'BRK.B', name: 'Berkshire Hathaway' },
  { symbol: 'JPM', name: 'JPMorgan Chase' },
  { symbol: 'V', name: 'Visa Inc.' },
  { symbol: 'WMT', name: 'Walmart Inc.' },
  { symbol: 'DIS', name: 'Walt Disney Company' },
];

const ForecastDashboard: React.FC = () => {
  // Basic state
  const [ticker, setTicker] = useState('');
  const [customTicker, setCustomTicker] = useState('');
  const [tickerError, setTickerError] = useState('');
  const [forecastWeeks, setForecastWeeks] = useState(12);
  const [modelType, setModelType] = useState<string>('auto');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState('');
  const [error, setError] = useState('');
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [renderError, setRenderError] = useState<string>('');
  const [newsArticles, setNewsArticles] = useState<any[]>([]);
  const [pollIntervalRef, setPollIntervalRef] = useState<NodeJS.Timeout | null>(null);
  
  // UI state
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showManualTuning, setShowManualTuning] = useState(false);
  const [sortColumn, setSortColumn] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Advanced config
  const [advancedConfig, setAdvancedConfig] = useState<AdvancedConfig>({
    preprocessing: {
      handle_weekends: 'business_days',
      outlier_method: 'zscore',
      outlier_threshold: 3.0,
      smooth_data: false,
    },
    tuning: {
      max_p: 5,
      max_q: 5,
      max_d: 2,
      max_P: 2,
      max_Q: 2,
      max_D: 1,
      enable_auto_tuning: true,
    }
  });
  
  // Manual parameters
  const [manualParams, setManualParams] = useState<ManualParams>({
    arima_order: [1, 1, 1],
    seasonal_order: [1, 1, 1, 52],
  });

  const fetchNews = async (stockTicker: string) => {
    try {
      // Using News API (you'll need to add VITE_NEWS_API_KEY to your .env file)
      const apiKey = import.meta.env.VITE_NEWS_API_KEY;
      
      if (!apiKey) {
        console.warn('News API key not configured, skipping news fetch');
        setNewsArticles([]);
        return;
      }

      const response = await fetch(
        `https://newsapi.org/v2/everything?q=${stockTicker}&sortBy=publishedAt&language=en&pageSize=3&apiKey=${apiKey}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch news');
      }

      const data = await response.json();
      
      if (data.articles && data.articles.length > 0) {
        // Summarize and format articles
        const formattedArticles = data.articles.map((article: any) => ({
          title: article.title || 'No Title',
          description: article.description || article.content?.substring(0, 200) + '...' || 'No description available',
          source: article.source?.name || 'Unknown Source',
          publishedAt: article.publishedAt,
          url: article.url || '#'
        }));
        
        setNewsArticles(formattedArticles);
      } else {
        setNewsArticles([]);
      }
    } catch (err) {
      console.error('Error fetching news:', err);
      setNewsArticles([]);
    }
  };

  const handleGenerateForecast = async () => {
    if (!ticker) {
      setError('Please enter a stock ticker');
      return;
    }

    // Prevent multiple rapid clicks
    if (isLoading) {
      return;
    }

    // Clear any existing polling interval
    if (pollIntervalRef) {
      clearInterval(pollIntervalRef);
      setPollIntervalRef(null);
    }

    setIsLoading(true);
    setError('');
    setForecast(null);
    setLoadingProgress('Submitting request...');
    
    // Fetch news for the ticker
    fetchNews(ticker);

    try {
      // Prepare request payload
      const payload: any = {
        ticker: ticker.toUpperCase(),
        forecastMonths: forecastWeeks,
        modelType: modelType === 'auto' ? undefined : modelType,
      };

      // Add advanced config if enabled
      if (showAdvanced && advancedConfig.tuning.enable_auto_tuning) {
        payload.advanced_config = advancedConfig;
      }

      // Add manual params if manual tuning is enabled
      if (showManualTuning && !advancedConfig.tuning.enable_auto_tuning) {
        payload.manual_params = manualParams;
        payload.advanced_config = {
          preprocessing: advancedConfig.preprocessing
        };
      }

      setLoadingProgress('Fetching historical data from Yahoo Finance...');
      const submitResponse = await api.post('/forecast/generate', payload);

      console.log('Forecast generation response:', submitResponse.data);

      const forecastId = submitResponse.data.forecastId;
      
      if (!forecastId) {
        console.error('No forecastId in response:', submitResponse.data);
        throw new Error('No forecast ID received from server. Please try again.');
      }

      // Poll for results
      setLoadingProgress('Running AI models and hyperparameter optimization...');
      let attempts = 0;
      const maxAttempts = 60; // 2 minutes max (reduced from 4)
      let rateLimitedUntil = 0;
      let rateLimitHits = 0;
      
      const pollInterval = setInterval(async () => {
        // If we're rate limited, don't hammer the server.
        if (Date.now() < rateLimitedUntil) return;

        try {
          attempts++;
          const statusResponse = await api.get(`/forecast/${forecastId}`);
          const data = statusResponse.data;
          
          console.log(`Poll attempt ${attempts}: Status = ${data.status}`, data);
          
          if (data.status === 'completed' && data.forecastData) {
            clearInterval(pollInterval);
            setPollIntervalRef(null);
            setLoadingProgress('Processing results...');
            setForecast(data);
            setIsLoading(false);
            setLoadingProgress('');
          } else if (data.status === 'failed') {
            clearInterval(pollInterval);
            setPollIntervalRef(null);
            setError(data.errorMessage || 'Forecast generation failed');
            setIsLoading(false);
            setLoadingProgress('');
          } else if (attempts >= maxAttempts) {
            clearInterval(pollInterval);
            setPollIntervalRef(null);
            setError('Forecast generation timed out. The backend may be processing. Please check back in a moment.');
            setIsLoading(false);
            setLoadingProgress('');
          } else if (data.status === 'processing') {
            // Update progress based on attempt count
            if (attempts > 5 && attempts <= 10) {
              setLoadingProgress('Optimizing model parameters');
            } else if (attempts > 10 && attempts <= 20) {
              setLoadingProgress('Analyzing patterns and seasonality');
            } else if (attempts > 20 && attempts <= 40) {
              setLoadingProgress('Performing statistical validation');
            } else if (attempts > 40) {
              setLoadingProgress('Finalizing forecast calculations');
            }
          }
        } catch (err: any) {
          // Handle rate limiting or other errors
          if (err.response?.status === 429) {
            // Respect Retry-After if available, otherwise exponential backoff.
            const retryAfterHeader = err.response?.headers?.['retry-after'];
            const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : NaN;
            const baseDelayMs = Number.isFinite(retryAfterSeconds) ? retryAfterSeconds * 1000 : 3000;

            rateLimitHits = Math.min(8, rateLimitHits + 1);
            const delayMs = Math.min(60000, baseDelayMs * Math.pow(2, rateLimitHits - 1));
            rateLimitedUntil = Date.now() + delayMs;
            // Don't spam the console.
            return;
          }
          
          if (attempts >= maxAttempts) {
            clearInterval(pollInterval);
            setPollIntervalRef(null);
            setError('Failed to retrieve forecast results. Please try again.');
            setIsLoading(false);
            setLoadingProgress('');
          }
        }
      }, 2000);
      
      // Store the interval ref for cancellation
      setPollIntervalRef(pollInterval);

    } catch (err: any) {
      // Handle rate limiting with a user-friendly message
      if (err.response?.status === 429) {
        setError('Too many requests. Please wait a moment before generating another forecast.');
      } else if (err.response?.status === 503 || err.code === 'ECONNREFUSED') {
        setError('Forecast service is currently unavailable. Please ensure all backend services are running and try again.');
      } else if (err.response?.status === 500) {
        const errorMsg = err.response?.data?.message || 'Internal server error';
        setError(`Server error: ${errorMsg}. Please check that Spring orchestrator and ML engine services are running.`);
      } else {
        setError(err.response?.data?.message || 'Failed to generate forecast. Please try again.');
      }
      setIsLoading(false);
      setLoadingProgress('');
    }
  };

  const handleCancelForecast = () => {
    if (pollIntervalRef) {
      clearInterval(pollIntervalRef);
      setPollIntervalRef(null);
    }
    setIsLoading(false);
    setLoadingProgress('');
    setError('Forecast generation cancelled by user.');
  };

  const downloadCSV = () => {
    if (!forecast || !forecast.forecastData) return;
    
    try {
      const { forecastData } = forecast;
      if (!forecastData.historical_data?.dates || !forecastData.dates) {
        console.error('Missing forecast data for CSV export');
        return;
      }
      
      let csvContent = 'Type,Date,Value,Upper_CI,Lower_CI\n';
      
      // Historical data
      forecastData.historical_data.dates.forEach((date, i) => {
        const value = forecastData.historical_data.values[i];
        csvContent += `Historical,${date},${value ?? ''},,\n`;
      });
      
      // Forecast data
      forecastData.dates.forEach((date, i) => {
        const pred = forecastData.predictions?.[i] ?? '';
        const upper = forecastData.confidence_intervals?.upper?.[i] ?? '';
        const lower = forecastData.confidence_intervals?.lower?.[i] ?? '';
        csvContent += `Forecast,${date},${pred},${upper},${lower}\n`;
      });
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${ticker}_${forecast.modelType ?? 'model'}_forecast_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting CSV:', err);
      setRenderError('Failed to export CSV data');
    }
  };

  const downloadJSON = () => {
    if (!forecast || !forecast.forecastData) return;
    
    try {
      const exportData = {
        metadata: {
          ticker: forecast.ticker ?? ticker,
          model: forecast.modelType ?? 'unknown',
          forecastWeeks,
          generatedAt: forecast.createdAt ?? new Date().toISOString(),
          completedAt: forecast.completedAt ?? new Date().toISOString(),
        },
        metrics: forecast.metrics ?? {},
        parameters: forecast.parameters ?? {},
        historical_data: {
          dates: forecast.forecastData.historical_data?.dates ?? [],
          values: forecast.forecastData.historical_data?.values ?? [],
        },
        forecast: {
          dates: forecast.forecastData.dates ?? [],
          predictions: forecast.forecastData.predictions ?? [],
          upper_confidence: forecast.forecastData.confidence_intervals?.upper ?? [],
          lower_confidence: forecast.forecastData.confidence_intervals?.lower ?? [],
          confidence_level: forecast.forecastData.confidence_intervals?.confidence_level ?? 0.95,
        },
        interpretation: forecast.interpretation ?? '',
        diagnostics: forecast.diagnostics ?? {},
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${ticker}_${forecast.modelType ?? 'model'}_forecast_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting JSON:', err);
      setRenderError('Failed to export JSON data');
    }
  };

  const sortedForecastData = useMemo(() => {
    try {
      if (!forecast?.forecastData?.dates || !forecast?.forecastData?.predictions) return [];
      
      const combined = forecast.forecastData.dates.map((date, i) => ({
        date,
        prediction: forecast.forecastData.predictions[i],
        lower: forecast.forecastData.confidence_intervals?.lower?.[i] || 0,
        upper: forecast.forecastData.confidence_intervals?.upper?.[i] || 0,
        range: (forecast.forecastData.confidence_intervals?.upper?.[i] || 0) - (forecast.forecastData.confidence_intervals?.lower?.[i] || 0),
      }));
      
      return combined.sort((a, b) => {
        let aVal: any = a[sortColumn as keyof typeof a];
        let bVal: any = b[sortColumn as keyof typeof b];
        
        if (sortColumn === 'date') {
          aVal = new Date(aVal).getTime();
          bVal = new Date(bVal).getTime();
        }
        
        if (sortDirection === 'asc') {
          return aVal > bVal ? 1 : -1;
        } else {
          return aVal < bVal ? 1 : -1;
        }
      });
    } catch (err) {
      console.error('Error sorting forecast data:', err);
      return [];
    }
  }, [forecast, sortColumn, sortDirection]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getForecastPlotData = () => {
    try {
      if (!forecast || !forecast.forecastData) return [];

      const { forecastData } = forecast;
      
      // Safety checks
      if (!forecastData.historical_data?.dates || !forecastData.historical_data?.values ||
          !forecastData.dates || !forecastData.predictions ||
          !forecastData.confidence_intervals?.upper || !forecastData.confidence_intervals?.lower) {
        console.error('Missing forecast data structure');
        return [];
      }

      return [
        // Historical data
        {
          x: forecastData.historical_data.dates,
          y: forecastData.historical_data.values,
          type: 'scatter',
          mode: 'lines',
          name: 'Historical Data',
          line: { color: '#60a5fa', width: 2.5 },
          hovertemplate: '<b>Historical</b><br>Date: %{x}<br>Price: $%{y:.2f}<extra></extra>',
        },
        // Confidence interval fill
        {
          x: [...forecastData.dates, ...forecastData.dates.slice().reverse()],
          y: [...forecastData.confidence_intervals.upper, ...forecastData.confidence_intervals.lower.slice().reverse()],
          fill: 'toself',
          fillcolor: 'rgba(251, 191, 36, 0.2)',
          line: { color: 'transparent' },
          name: '95% Confidence Interval',
          showlegend: true,
          hoverinfo: 'skip',
        },
        // Forecast predictions
        {
          x: forecastData.dates,
          y: forecastData.predictions,
          type: 'scatter',
          mode: 'lines+markers',
          name: 'Forecast',
          line: { color: '#fbbf24', width: 3, dash: 'dot' },
          marker: { 
            size: 8, 
            color: '#fbbf24',
            symbol: 'diamond',
            line: { width: 2, color: '#1f2937' }
          },
          hovertemplate: '<b>Forecast</b><br>Date: %{x}<br>Price: $%{y:.2f}<extra></extra>',
        },
      ];
    } catch (err) {
      console.error('Error generating plot data:', err);
      setRenderError('Error generating chart data');
      return [];
    }
  };

  // Render error display
  if (renderError) {
    return (
      <div className="max-w-7xl mx-auto px-8 py-12">
        <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-8">
          <h2 className="text-2xl text-red-300 mb-4">Rendering Error</h2>
          <p className="text-red-200 mb-4">{renderError}</p>
          <button
            onClick={() => {
              setRenderError('');
              setForecast(null);
            }}
            className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg"
          >
            Reset and Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      
      {/* Loading Quote Overlay */}
      {isLoading && <LoadingQuote message={loadingProgress || 'Analyzing market data'} onCancel={handleCancelForecast} />}
      
      {/* Header */}
      {/* Input Section */}
      <div className="bg-gradient-to-br from-gray-900/80 to-black/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-gold-500/30 p-8 mb-8 animate-slide-up">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
          <div>
            <label className="block text-gold-400 text-xs uppercase tracking-wider mb-3 font-semibold">
              Select Stock
            </label>
            <select
              value={ticker}
              onChange={(e) => {
                setTicker(e.target.value);
                setCustomTicker('');
                setTickerError('');
              }}
              disabled={isLoading}
              className="fancy-select text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Choose from popular stocks</option>
              {POPULAR_STOCKS.map(stock => (
                <option key={stock.symbol} value={stock.symbol}>
                  {stock.symbol} - {stock.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gold-400 text-xs uppercase tracking-wider mb-3 font-semibold">
              Forecast Days
            </label>
            <input
              type="number"
              value={forecastWeeks}
              onChange={(e) => setForecastWeeks(parseInt(e.target.value) || 12)}
              min="4"
              max="52"
              disabled={isLoading}
              className="input text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-gold-400 text-xs uppercase tracking-wider mb-3 font-semibold">
              Model Type
            </label>
            <select
              value={modelType}
              onChange={(e) => setModelType(e.target.value)}
              disabled={isLoading}
              className="fancy-select text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="auto">Auto-Select Best Model</option>
              <option value="ARIMA">ARIMA</option>
              <option value="SARIMA">SARIMA</option>
              <option value="HOLT_WINTERS_ADDITIVE">Holt-Winters (Additive)</option>
              <option value="HOLT_WINTERS_MULTIPLICATIVE">Holt-Winters (Multiplicative)</option>
              <option value="HOLT_WINTERS_DAMPED">Holt-Winters (Damped)</option>
            </select>
          </div>
        </div>

        {/* Custom Ticker, Advanced Options, Manual Tuning Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
          <div>
            <label className="block text-gold-400 text-xs uppercase tracking-wider mb-3 font-semibold">
              Or Enter Custom Ticker
            </label>
            <input
              type="text"
              value={customTicker}
              onChange={(e) => {
                const value = e.target.value.toUpperCase();
                setCustomTicker(value);
                setTicker('');
                // Validate ticker format (1-5 letters)
                if (value && !/^[A-Z]{1,5}$/.test(value)) {
                  setTickerError('Ticker must be 1-5 letters');
                } else {
                  setTickerError('');
                  if (value) setTicker(value);
                }
              }}
              placeholder="e.g., AAPL"
              disabled={isLoading}
              maxLength={5}
              className="input text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {tickerError && (
              <p className="text-red-400 text-xs mt-1">{tickerError}</p>
            )}
          </div>

          <div>
            <label className="block text-gold-400 text-xs uppercase tracking-wider mb-3 font-semibold">
              Configuration
            </label>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              disabled={isLoading}
              className="w-full input text-base font-semibold flex items-center justify-center gap-2 cursor-pointer hover:border-gold-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {showAdvanced ? 'Hide Advanced' : 'Advanced Options'}
            </button>
          </div>
          
          <div>
            <label className="block text-gold-400 text-xs uppercase tracking-wider mb-3 font-semibold">
              Manual Tuning
            </label>
            <button
              onClick={() => setShowManualTuning(!showManualTuning)}
              disabled={isLoading}
              className="w-full input text-base font-semibold flex items-center justify-center gap-2 cursor-pointer hover:border-gold-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              {showManualTuning ? 'Hide Manual' : 'Manual Tuning'}
            </button>
          </div>
        </div>

        {/* Advanced Configuration Panel */}
        {showAdvanced && (
          <div className="bg-black/50 rounded-xl p-6 border border-gold-500/30 backdrop-blur-sm animate-slide-up">
            <h3 className="text-lg font-semibold text-gold-400 mb-4">Advanced Configuration</h3>
            
            <div className="grid md:grid-cols-2 gap-8">
              {/* Preprocessing Options */}
              <div>
                <h4 className="text-sm font-semibold text-gold-300 mb-4 uppercase tracking-wider">Data Preprocessing</h4>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-gold-400 text-xs mb-2">Weekend Data Handling</label>
                    <select
                      value={advancedConfig.preprocessing.handle_weekends}
                      onChange={(e) => setAdvancedConfig({
                        ...advancedConfig,
                        preprocessing: {
                          ...advancedConfig.preprocessing,
                          handle_weekends: e.target.value as any
                        }
                      })}
                      className="fancy-select text-sm"
                    >
                      <option value="business_days">Business Days Only (Recommended)</option>
                      <option value="forward_fill">Forward Fill Weekends</option>
                      <option value="interpolate">Interpolate Weekends</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gold-400 text-xs mb-2">Outlier Detection</label>
                    <select
                      value={advancedConfig.preprocessing.outlier_method}
                      onChange={(e) => setAdvancedConfig({
                        ...advancedConfig,
                        preprocessing: {
                          ...advancedConfig.preprocessing,
                          outlier_method: e.target.value as any
                        }
                      })}
                      className="fancy-select text-sm"
                    >
                      <option value="zscore">Z-Score (Standard Deviation)</option>
                      <option value="iqr">IQR (Interquartile Range)</option>
                      <option value="none">None</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gold-400 text-xs mb-2">Outlier Threshold: {advancedConfig.preprocessing.outlier_threshold}</label>
                    <input
                      type="range"
                      min="1.5"
                      max="5"
                      step="0.5"
                      value={advancedConfig.preprocessing.outlier_threshold}
                      onChange={(e) => setAdvancedConfig({
                        ...advancedConfig,
                        preprocessing: {
                          ...advancedConfig.preprocessing,
                          outlier_threshold: parseFloat(e.target.value)
                        }
                      })}
                      className="w-full accent-gold-500"
                    />
                  </div>
                </div>
              </div>

              {/* Tuning Options */}
              <div>
                <h4 className="text-sm font-semibold text-gold-300 mb-4 uppercase tracking-wider">Hyperparameter Tuning</h4>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={advancedConfig.tuning.enable_auto_tuning}
                      onChange={(e) => setAdvancedConfig({
                        ...advancedConfig,
                        tuning: {
                          ...advancedConfig.tuning,
                          enable_auto_tuning: e.target.checked
                        }
                      })}
                      className="w-4 h-4"
                    />
                    <label className="text-sm text-gray-300">Enable Auto-Tuning (Grid Search)</label>
                  </div>

                  {advancedConfig.tuning.enable_auto_tuning && (
                    <>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-gray-400 text-xs mb-1">Max p</label>
                          <input
                            type="number"
                            value={advancedConfig.tuning.max_p}
                            onChange={(e) => setAdvancedConfig({
                              ...advancedConfig,
                              tuning: {
                                ...advancedConfig.tuning,
                                max_p: parseInt(e.target.value) || 5
                              }
                            })}
                            min="1"
                            max="10"
                            className="w-full px-2 py-1 input text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-400 text-xs mb-1">Max d</label>
                          <input
                            type="number"
                            value={advancedConfig.tuning.max_d}
                            onChange={(e) => setAdvancedConfig({
                              ...advancedConfig,
                              tuning: {
                                ...advancedConfig.tuning,
                                max_d: parseInt(e.target.value) || 2
                              }
                            })}
                            min="0"
                            max="3"
                            className="w-full px-2 py-1 input text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-400 text-xs mb-1">Max q</label>
                          <input
                            type="number"
                            value={advancedConfig.tuning.max_q}
                            onChange={(e) => setAdvancedConfig({
                              ...advancedConfig,
                              tuning: {
                                ...advancedConfig.tuning,
                                max_q: parseInt(e.target.value) || 5
                              }
                            })}
                            min="1"
                            max="10"
                            className="w-full px-2 py-1 input text-sm"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-gray-400 text-xs mb-1">Max P (seasonal)</label>
                          <input
                            type="number"
                            value={advancedConfig.tuning.max_P}
                            onChange={(e) => setAdvancedConfig({
                              ...advancedConfig,
                              tuning: {
                                ...advancedConfig.tuning,
                                max_P: parseInt(e.target.value) || 2
                              }
                            })}
                            min="0"
                            max="5"
                            className="w-full px-2 py-1 input text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-400 text-xs mb-1">Max D (seasonal)</label>
                          <input
                            type="number"
                            value={advancedConfig.tuning.max_D}
                            onChange={(e) => setAdvancedConfig({
                              ...advancedConfig,
                              tuning: {
                                ...advancedConfig.tuning,
                                max_D: parseInt(e.target.value) || 1
                              }
                            })}
                            min="0"
                            max="2"
                            className="w-full px-2 py-1 input text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-400 text-xs mb-1">Max Q (seasonal)</label>
                          <input
                            type="number"
                            value={advancedConfig.tuning.max_Q}
                            onChange={(e) => setAdvancedConfig({
                              ...advancedConfig,
                              tuning: {
                                ...advancedConfig.tuning,
                                max_Q: parseInt(e.target.value) || 2
                              }
                            })}
                            min="0"
                            max="5"
                            className="w-full px-2 py-1 input text-sm"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Manual Tuning Panel */}
        {showManualTuning && (
          <div className="mt-4 bg-black/50 rounded-xl p-6 border border-gold-500/30 backdrop-blur-sm animate-slide-up">
            <h3 className="text-lg font-semibold text-gold-400 mb-4">Manual Hyperparameter Tuning</h3>
            <p className="text-sm text-gold-300 mb-4">
              Override auto-tuning with your own parameters. Auto-tuning will be disabled when manual parameters are provided.
            </p>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-semibold text-gold-300 mb-3">ARIMA Order (p, d, q)</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-gold-400 text-xs mb-1">p</label>
                    <input
                      type="number"
                      value={manualParams.arima_order?.[0] || 1}
                      onChange={(e) => setManualParams({
                        ...manualParams,
                        arima_order: [
                          parseInt(e.target.value) || 1,
                          manualParams.arima_order?.[1] || 1,
                          manualParams.arima_order?.[2] || 1
                        ]
                      })}
                      min="0"
                      max="10"
                      className="w-full px-2 py-2 input"
                    />
                  </div>
                  <div>
                    <label className="block text-gold-400 text-xs mb-1">d</label>
                    <input
                      type="number"
                      value={manualParams.arima_order?.[1] || 1}
                      onChange={(e) => setManualParams({
                        ...manualParams,
                        arima_order: [
                          manualParams.arima_order?.[0] || 1,
                          parseInt(e.target.value) || 1,
                          manualParams.arima_order?.[2] || 1
                        ]
                      })}
                      min="0"
                      max="3"
                      className="w-full px-2 py-2 input"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-xs mb-1">q</label>
                    <input
                      type="number"
                      value={manualParams.arima_order?.[2] || 1}
                      onChange={(e) => setManualParams({
                        ...manualParams,
                        arima_order: [
                          manualParams.arima_order?.[0] || 1,
                          manualParams.arima_order?.[1] || 1,
                          parseInt(e.target.value) || 1
                        ]
                      })}
                      min="0"
                      max="10"
                      className="w-full px-2 py-2 input"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gold-300 mb-3">Seasonal Order (P, D, Q, s)</h4>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="block text-gold-400 text-xs mb-1">P</label>
                    <input
                      type="number"
                      value={manualParams.seasonal_order?.[0] || 1}
                      onChange={(e) => setManualParams({
                        ...manualParams,
                        seasonal_order: [
                          parseInt(e.target.value) || 1,
                          manualParams.seasonal_order?.[1] || 1,
                          manualParams.seasonal_order?.[2] || 1,
                          manualParams.seasonal_order?.[3] || 52
                        ]
                      })}
                      min="0"
                      max="5"
                      className="w-full px-2 py-2 input"
                    />
                  </div>
                  <div>
                    <label className="block text-gold-400 text-xs mb-1">D</label>
                    <input
                      type="number"
                      value={manualParams.seasonal_order?.[1] || 1}
                      onChange={(e) => setManualParams({
                        ...manualParams,
                        seasonal_order: [
                          manualParams.seasonal_order?.[0] || 1,
                          parseInt(e.target.value) || 1,
                          manualParams.seasonal_order?.[2] || 1,
                          manualParams.seasonal_order?.[3] || 52
                        ]
                      })}
                      min="0"
                      max="2"
                      className="w-full px-2 py-2 input"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-xs mb-1">Q</label>
                    <input
                      type="number"
                      value={manualParams.seasonal_order?.[2] || 1}
                      onChange={(e) => setManualParams({
                        ...manualParams,
                        seasonal_order: [
                          manualParams.seasonal_order?.[0] || 1,
                          manualParams.seasonal_order?.[1] || 1,
                          parseInt(e.target.value) || 1,
                          manualParams.seasonal_order?.[3] || 52
                        ]
                      })}
                      min="0"
                      max="5"
                      className="w-full px-2 py-2 input"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-xs mb-1">s</label>
                    <input
                      type="number"
                      value={manualParams.seasonal_order?.[3] || 52}
                      onChange={(e) => setManualParams({
                        ...manualParams,
                        seasonal_order: [
                          manualParams.seasonal_order?.[0] || 1,
                          manualParams.seasonal_order?.[1] || 1,
                          manualParams.seasonal_order?.[2] || 1,
                          parseInt(e.target.value) || 52
                        ]
                      })}
                      min="2"
                      max="52"
                      className="w-full px-2 py-2 input"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-6 bg-red-900/30 border border-red-500/50 rounded-xl p-4 backdrop-blur-sm animate-fade-in">
            <p className="text-red-300 text-sm font-semibold">{error}</p>
          </div>
        )}

        {/* Generate Forecast Button */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={handleGenerateForecast}
            disabled={isLoading || !ticker || !!tickerError}
            className="uiverse"
          >
            <div className="wrapper">
              <span>{isLoading ? 'Processing' : 'Forecast'}</span>
              <div className="circle circle-12"></div>
              <div className="circle circle-11"></div>
              <div className="circle circle-10"></div>
              <div className="circle circle-9"></div>
              <div className="circle circle-8"></div>
              <div className="circle circle-7"></div>
              <div className="circle circle-6"></div>
              <div className="circle circle-5"></div>
              <div className="circle circle-4"></div>
              <div className="circle circle-3"></div>
              <div className="circle circle-2"></div>
              <div className="circle circle-1"></div>
            </div>
          </button>
        </div>
      </div>

      {/* Results */}
      {forecast && forecast.forecastData && (
        <>
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8 animate-bounce-in">
            <div className="bg-gradient-to-br from-gold-900/40 to-black/80 backdrop-blur-xl rounded-xl p-6 border border-gold-500/40 hover:scale-105 transition-transform hover:shadow-lg hover:shadow-gold-500/20">
              <div className="text-gold-400 text-xs uppercase tracking-wider mb-2 font-semibold">Current Price</div>
              <div className="text-3xl font-bold text-gold-300">
                ${forecast.forecastData?.historical_data?.values?.[forecast.forecastData.historical_data.values.length - 1]?.toFixed(2) ?? 'N/A'}
              </div>
            </div>
            <div className="bg-gradient-to-br from-gold-900/40 to-black/80 backdrop-blur-xl rounded-xl p-6 border border-gold-500/40 hover:scale-105 transition-transform hover:shadow-lg hover:shadow-gold-500/20">
              <div className="text-gold-400 text-xs uppercase tracking-wider mb-2 font-semibold">Model</div>
              <div className="text-xl font-bold text-gold-300">{forecast.modelType?.replace(/_/g, ' ') ?? 'N/A'}</div>
            </div>
            <div className="bg-gradient-to-br from-gold-900/40 to-black/80 backdrop-blur-xl rounded-xl p-6 border border-gold-500/40 hover:scale-105 transition-transform hover:shadow-lg hover:shadow-gold-500/20">
              <div className="text-gold-400 text-xs uppercase tracking-wider mb-2 font-semibold">MAE</div>
              <div className="text-3xl font-bold text-gold-300">
                {forecast.metrics?.mae !== undefined && forecast.metrics?.mae !== null
                  ? `$${forecast.metrics.mae.toFixed(2)}`
                  : '—'}
              </div>
            </div>
            <div className="bg-gradient-to-br from-gold-900/40 to-black/80 backdrop-blur-xl rounded-xl p-6 border border-gold-500/40 hover:scale-105 transition-transform hover:shadow-lg hover:shadow-gold-500/20">
              <div className="text-gold-400 text-xs uppercase tracking-wider mb-2 font-semibold">Stability</div>
              <div className="text-3xl font-bold text-gold-300">
                {forecast.metrics?.stability_score !== undefined && forecast.metrics?.stability_score !== null
                  ? `${(forecast.metrics.stability_score * 100).toFixed(1)}%`
                  : '—'}
              </div>
            </div>
          </div>

          {/* Main Forecast Chart */}
          <div className="bg-gradient-to-br from-gray-900/80 to-black/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-gold-500/30 p-8 mb-8 animate-bounce-in">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gold-400 tracking-wide flex items-center">
                <span>Price Forecast — {ticker}</span>
                <span className="ml-4 text-sm text-gold-500 font-semibold">{forecastWeeks} Day Forecast</span>
              </h3>
              
              {/* Export buttons inside chart */}
              <div className="flex gap-3">
                <button
                  onClick={downloadCSV}
                  className="px-4 py-2 bg-gradient-to-r from-gold-600 to-gold-700 text-black text-sm font-semibold rounded-lg hover:from-gold-500 hover:to-gold-600 transition-all transform hover:scale-105 shadow-lg hover:shadow-gold-500/50 flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>CSV</span>
                </button>
                <button
                  onClick={downloadJSON}
                  className="px-4 py-2 bg-gray-800 text-gold-400 text-sm border border-gold-500/30 font-semibold rounded-lg hover:bg-gray-700 hover:border-gold-500 transition-all transform hover:scale-105 flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                  </svg>
                  <span>JSON</span>
                </button>
              </div>
            </div>
            <div className="bg-black/40 rounded-xl p-4 border border-gold-500/20">
              {getForecastPlotData().length > 0 ? (
                <Suspense fallback={
                  <div className="flex items-center justify-center h-96 text-gold-400">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-400"></div>
                  </div>
                }>
                  <Plot
                    data={getForecastPlotData() as any}
                    layout={{
                      autosize: true,
                      height: 550,
                      paper_bgcolor: 'rgba(0,0,0,0)',
                      plot_bgcolor: 'rgba(0,0,0,0.6)',
                      font: { color: '#fbbf24', family: 'system-ui, -apple-system' },
                    xaxis: {
                      title: { text: 'Date', font: { color: '#fbbf24' } },
                      gridcolor: '#404040',
                      showgrid: true,
                      tickangle: -45,
                      tickfont: { color: '#d4af37' },
                    },
                    yaxis: {
                      title: { text: 'Price (USD)', font: { color: '#fbbf24' } },
                      gridcolor: '#404040',
                      showgrid: true,
                      tickformat: '$,.2f',
                      tickfont: { color: '#d4af37' },
                    },
                    legend: {
                      orientation: 'h',
                      y: -0.25,
                      x: 0.5,
                      xanchor: 'center',
                      bgcolor: 'rgba(0,0,0,0.8)',
                      bordercolor: '#fbbf24',
                      borderwidth: 1,
                      font: { color: '#fbbf24' },
                    },
                    hovermode: 'x unified',
                    margin: { l: 80, r: 40, t: 40, b: 100 },
                  }}
                  config={{
                    displayModeBar: true,
                    displaylogo: false,
                    modeBarButtonsToRemove: ['lasso2d', 'select2d'],
                    toImageButtonOptions: {
                      format: 'png',
                      filename: `${ticker}_forecast_${new Date().toISOString().split('T')[0]}`,
                      height: 1000,
                      width: 1600,
                      scale: 2
                    }
                  }}
                  style={{ width: '100%' }}
                  useResizeHandler={true}
                />
                </Suspense>
              ) : (
                <div className="flex items-center justify-center h-96 text-gold-500">
                  <p>Unable to load chart data. Please check the forecast results.</p>
                </div>
              )}
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid md:grid-cols-2 gap-6 mb-8 animate-fade-in">
            {/* Model Performance Metrics */}
            <div className="bg-gradient-to-br from-gray-900/80 to-black/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-gold-500/30 p-8 hover:border-gold-500/50 transition-all">
              <h3 className="text-2xl font-bold text-gold-400 mb-6 tracking-wide">
                Model Performance
              </h3>
              <div className="space-y-4">
                {(() => {
                  const metrics = forecast.metrics;
                  
                  if (!metrics) {
                    return (
                      <div className="text-gold-500 text-sm italic">
                        No metrics available
                      </div>
                    );
                  }
                  
                  return (
                    <>
                      <div className="flex justify-between items-center pb-3 border-b border-gold-500/20">
                        <span className="text-gold-400 uppercase text-xs tracking-wider">Mean Absolute Error</span>
                        <span className="text-gold-300 font-semibold text-lg">
                          {metrics.mae !== undefined && metrics.mae !== null
                            ? `$${metrics.mae.toFixed(2)}`
                            : '—'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pb-3 border-b border-gold-500/20">
                        <span className="text-gold-400 uppercase text-xs tracking-wider">Root Mean Squared Error</span>
                        <span className="text-gold-300 font-semibold text-lg">
                          {metrics.rmse !== undefined && metrics.rmse !== null
                            ? `$${metrics.rmse.toFixed(2)}`
                            : '—'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pb-3 border-b border-gold-500/20">
                        <span className="text-gold-400 uppercase text-xs tracking-wider">AIC</span>
                        <span className="text-gold-300 font-semibold text-lg">
                          {metrics.aic !== undefined && metrics.aic !== null
                            ? metrics.aic.toFixed(2)
                            : '—'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pb-3 border-b border-gold-500/20">
                        <span className="text-gold-400 uppercase text-xs tracking-wider">BIC</span>
                        <span className="text-gold-300 font-semibold text-lg">
                          {metrics.bic !== undefined && metrics.bic !== null
                            ? metrics.bic.toFixed(2)
                            : '—'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gold-400 uppercase text-xs tracking-wider">Stability Score</span>
                        <span className="text-gold-500 font-bold text-lg">
                          {metrics.stability_score !== undefined && metrics.stability_score !== null
                            ? `${(metrics.stability_score * 100).toFixed(2)}%`
                            : '—'}
                        </span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Model Parameters */}
            <div className="bg-gradient-to-br from-gray-900/80 to-black/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-gold-500/30 p-8 hover:border-gold-500/50 transition-all">
              <h3 className="text-2xl font-bold text-gold-400 mb-6 tracking-wide">
                Model Parameters
              </h3>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {(() => {
                  const params = forecast.parameters;
                  
                  if (!params || Object.keys(params).length === 0) {
                    return (
                      <div className="text-gold-500 text-sm italic">
                        No parameters available
                      </div>
                    );
                  }
                  
                  return Object.entries(params).map(([key, value]: [string, any]) => (
                    <div key={key} className="flex justify-between items-center pb-3 border-b border-gold-500/20">
                      <span className="text-gold-400 uppercase text-xs tracking-wider">{key.replace(/_/g, ' ')}</span>
                      <span className="text-gold-300 font-semibold text-sm">
                        {typeof value === 'number' ? value.toFixed(6) : String(value)}
                      </span>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>

          {/* Forecast Data Table with Sorting */}
          <div className="bg-gradient-to-br from-gray-900/80 to-black/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-gold-500/30 p-8 mb-8 animate-slide-up">
            <h3 className="text-2xl font-bold text-gold-400 mb-6 tracking-wide">
              Detailed Forecast Data
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gold-500/30">
                    <th 
                      onClick={() => handleSort('date')}
                      className="px-6 py-4 text-left text-xs text-gold-400 uppercase tracking-wider font-semibold cursor-pointer hover:text-gold-300 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        Date
                        {sortColumn === 'date' && (
                          <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('prediction')}
                      className="px-6 py-4 text-right text-xs text-gold-400 uppercase tracking-wider font-semibold cursor-pointer hover:text-gold-300 transition-colors"
                    >
                      <div className="flex items-center justify-end gap-2">
                        Predicted Price
                        {sortColumn === 'prediction' && (
                          <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('lower')}
                      className="px-6 py-4 text-right text-xs text-gold-400 uppercase tracking-wider font-semibold cursor-pointer hover:text-gold-300 transition-colors"
                    >
                      <div className="flex items-center justify-end gap-2">
                        Lower CI (95%)
                        {sortColumn === 'lower' && (
                          <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('upper')}
                      className="px-6 py-4 text-right text-xs text-gold-400 uppercase tracking-wider font-semibold cursor-pointer hover:text-gold-300 transition-colors"
                    >
                      <div className="flex items-center justify-end gap-2">
                        Upper CI (95%)
                        {sortColumn === 'upper' && (
                          <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('range')}
                      className="px-6 py-4 text-right text-xs text-gold-400 uppercase tracking-wider font-semibold cursor-pointer hover:text-gold-300 transition-colors"
                    >
                      <div className="flex items-center justify-end gap-2">
                        Range
                        {sortColumn === 'range' && (
                          <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gold-500/20">
                  {sortedForecastData.map((row, i) => (
                    <tr key={i} className="hover:bg-gold-900/10 transition-all">
                      <td className="px-6 py-4 whitespace-nowrap text-base text-gold-300">
                        {new Date(row.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-base font-bold text-gold-400">
                        ${row.prediction.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-base text-gold-500">
                        ${row.lower.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-base text-gold-500">
                        ${row.upper.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-base text-gold-600">
                        ±${(row.range / 2).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* AI Interpretation */}
          {forecast.interpretation && (
            <div className="bg-gradient-to-br from-gold-900/20 to-black/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-gold-500/30 p-8 mb-8 animate-fade-in">
              <div className="flex items-start">
                <div className="w-12 h-12 bg-gold-600/20 rounded-xl flex items-center justify-center mr-4 flex-shrink-0">
                  <svg className="w-6 h-6 text-gold-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl text-gold-400 font-semibold mb-3">AI Analysis & Interpretation</h3>
                  <p className="text-gold-200 leading-relaxed whitespace-pre-line">{forecast.interpretation}</p>
                </div>
              </div>
            </div>
          )}

          {/* Latest News */}
          {newsArticles.length > 0 && (
            <div className="bg-gradient-to-br from-gray-900/80 to-black/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-gold-500/30 p-8 animate-slide-up">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-gold-600/20 rounded-xl flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-gold-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gold-400 tracking-wide">
                  Latest News — {ticker}
                </h3>
              </div>
              <div className="space-y-4">
                {newsArticles.map((article, idx) => (
                  <a 
                    key={idx}
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-black/30 rounded-xl p-5 border border-gold-500/20 hover:border-gold-500/50 transition-all hover:shadow-lg hover:shadow-gold-500/10 cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-lg font-semibold text-gold-300 pr-4 hover:text-gold-200">{article.title}</h4>
                      <span className="text-xs text-gold-600 whitespace-nowrap">
                        {new Date(article.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-gold-400 text-sm mb-3 leading-relaxed">{article.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gold-500 uppercase tracking-wide">{article.source}</span>
                      <span className="text-xs text-gold-600">
                        {new Date(article.publishedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ForecastDashboard;
