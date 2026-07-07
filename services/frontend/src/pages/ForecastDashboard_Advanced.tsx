import React, { useState, useMemo } from 'react';
import Plot from 'react-plotly.js';
import api from '../lib/api';

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

const ForecastDashboard: React.FC = () => {
  // Basic state
  const [ticker, setTicker] = useState('');
  const [forecastWeeks, setForecastWeeks] = useState(12);
  const [modelType, setModelType] = useState<string>('auto');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState('');
  const [error, setError] = useState('');
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  
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

  const handleGenerateForecast = async () => {
    if (!ticker) {
      setError('Please enter a stock ticker');
      return;
    }

    setIsLoading(true);
    setError('');
    setForecast(null);
    setLoadingProgress('Submitting request...');

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

      const forecastId = submitResponse.data.forecastId;
      
      if (!forecastId) {
        throw new Error('No forecast ID received');
      }

      // Poll for results
      setLoadingProgress('Running AI models and hyperparameter optimization...');
      let attempts = 0;
      const maxAttempts = 120; // 4 minutes max
      
      const pollInterval = setInterval(async () => {
        attempts++;
        
        try {
          const statusResponse = await api.get(`/forecast/${forecastId}`);
          const data = statusResponse.data;
          
          if (data.status === 'completed' && data.forecastData) {
            clearInterval(pollInterval);
            setLoadingProgress('Processing results...');
            setForecast(data);
            setIsLoading(false);
            setLoadingProgress('');
          } else if (data.status === 'failed') {
            clearInterval(pollInterval);
            setError(data.errorMessage || 'Forecast generation failed');
            setIsLoading(false);
            setLoadingProgress('');
          } else if (attempts >= maxAttempts) {
            clearInterval(pollInterval);
            setError('Forecast generation timed out. Please try again.');
            setIsLoading(false);
            setLoadingProgress('');
          } else if (attempts > 5) {
            setLoadingProgress('Optimizing model parameters...');
          } else if (attempts > 10) {
            setLoadingProgress('Analyzing patterns and seasonality...');
          }
        } catch (err) {
          if (attempts >= maxAttempts) {
            clearInterval(pollInterval);
            setError('Failed to retrieve forecast results');
            setIsLoading(false);
            setLoadingProgress('');
          }
        }
      }, 2000);

    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to generate forecast');
      setIsLoading(false);
      setLoadingProgress('');
    }
  };

  const downloadCSV = () => {
    if (!forecast) return;
    
    const { forecastData } = forecast;
    let csvContent = 'Type,Date,Value,Upper_CI,Lower_CI\n';
    
    // Historical data
    forecastData.historical_data.dates.forEach((date, i) => {
      csvContent += `Historical,${date},${forecastData.historical_data.values[i]},,\n`;
    });
    
    // Forecast data
    forecastData.dates.forEach((date, i) => {
      csvContent += `Forecast,${date},${forecastData.predictions[i]},${forecastData.confidence_intervals.upper[i]},${forecastData.confidence_intervals.lower[i]}\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${ticker}_${forecast.modelType}_forecast_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadJSON = () => {
    if (!forecast) return;
    
    const exportData = {
      metadata: {
        ticker: forecast.ticker,
        model: forecast.modelType,
        forecastWeeks,
        generatedAt: forecast.createdAt,
        completedAt: forecast.completedAt,
      },
      metrics: forecast.metrics,
      parameters: forecast.parameters,
      historical_data: {
        dates: forecast.forecastData.historical_data.dates,
        values: forecast.forecastData.historical_data.values,
      },
      forecast: {
        dates: forecast.forecastData.dates,
        predictions: forecast.forecastData.predictions,
        upper_confidence: forecast.forecastData.confidence_intervals.upper,
        lower_confidence: forecast.forecastData.confidence_intervals.lower,
        confidence_level: forecast.forecastData.confidence_intervals.confidence_level,
      },
      interpretation: forecast.interpretation,
      diagnostics: forecast.diagnostics,
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${ticker}_${forecast.modelType}_forecast_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const sortedForecastData = useMemo(() => {
    if (!forecast) return [];
    
    const combined = forecast.forecastData.dates.map((date, i) => ({
      date,
      prediction: forecast.forecastData.predictions[i],
      lower: forecast.forecastData.confidence_intervals.lower[i],
      upper: forecast.forecastData.confidence_intervals.upper[i],
      range: forecast.forecastData.confidence_intervals.upper[i] - forecast.forecastData.confidence_intervals.lower[i],
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
    if (!forecast) return [];

    const { forecastData } = forecast;

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
  };

  return (
    <div className="max-w-7xl mx-auto px-8 py-12">
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-light text-white mb-3" style={{ fontFamily: 'Georgia, serif' }}>
          PerBillion AI Forecasting
        </h1>
        <p className="text-xl text-blue-300">Enterprise-grade stock price prediction with advanced AI models</p>
      </div>

      {/* Input Section */}
      <div className="bg-gradient-to-br from-slate-800/50 to-gray-900/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700/50 p-8 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div>
            <label className="block text-gray-400 text-xs uppercase tracking-wider mb-3 font-medium">
              Stock Ticker
            </label>
            <input
              type="text"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              placeholder="AAPL"
              disabled={isLoading}
              className="w-full px-4 py-3 bg-black/40 border border-gray-700 rounded-xl text-white text-xl font-light tracking-wider focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all uppercase placeholder-gray-600 disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-xs uppercase tracking-wider mb-3 font-medium">
              Forecast Horizon (weeks)
            </label>
            <input
              type="number"
              value={forecastWeeks}
              onChange={(e) => setForecastWeeks(parseInt(e.target.value) || 12)}
              min="4"
              max="52"
              disabled={isLoading}
              className="w-full px-4 py-3 bg-black/40 border border-gray-700 rounded-xl text-white text-xl font-light focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-xs uppercase tracking-wider mb-3 font-medium">
              Model Type
            </label>
            <select
              value={modelType}
              onChange={(e) => setModelType(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-3 bg-black/40 border border-gray-700 rounded-xl text-white text-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all disabled:opacity-50"
            >
              <option value="auto">Auto-Select</option>
              <option value="ARIMA">ARIMA</option>
              <option value="SARIMA">SARIMA</option>
              <option value="HOLT_WINTERS_ADDITIVE">Holt-Winters (Additive)</option>
              <option value="HOLT_WINTERS_MULTIPLICATIVE">Holt-Winters (Multiplicative)</option>
              <option value="HOLT_WINTERS_DAMPED">Holt-Winters (Damped)</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleGenerateForecast}
              disabled={isLoading || !ticker}
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium rounded-xl transition-all duration-300 shadow-lg hover:shadow-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider text-sm"
            >
              {isLoading ? (
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs">{loadingProgress}</span>
                </div>
              ) : 'Generate Forecast'}
            </button>
          </div>
        </div>

        {/* Advanced Options Toggle */}
        <div className="flex gap-4 mb-4">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="px-4 py-2 bg-gray-700/50 hover:bg-gray-700 text-white rounded-lg transition-all text-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options'}
          </button>
          
          <button
            onClick={() => setShowManualTuning(!showManualTuning)}
            className="px-4 py-2 bg-purple-700/50 hover:bg-purple-700 text-white rounded-lg transition-all text-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            {showManualTuning ? 'Hide Manual Tuning' : 'Manual Hyperparameter Tuning'}
          </button>
        </div>

        {/* Advanced Configuration Panel */}
        {showAdvanced && (
          <div className="bg-black/30 rounded-xl p-6 border border-gray-700/50">
            <h3 className="text-lg font-medium text-white mb-4">Advanced Configuration</h3>
            
            <div className="grid md:grid-cols-2 gap-8">
              {/* Preprocessing Options */}
              <div>
                <h4 className="text-sm font-medium text-blue-400 mb-4 uppercase tracking-wider">Data Preprocessing</h4>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-400 text-xs mb-2">Weekend Data Handling</label>
                    <select
                      value={advancedConfig.preprocessing.handle_weekends}
                      onChange={(e) => setAdvancedConfig({
                        ...advancedConfig,
                        preprocessing: {
                          ...advancedConfig.preprocessing,
                          handle_weekends: e.target.value as any
                        }
                      })}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm"
                    >
                      <option value="business_days">Business Days Only (Recommended)</option>
                      <option value="forward_fill">Forward Fill Weekends</option>
                      <option value="interpolate">Interpolate Weekends</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-400 text-xs mb-2">Outlier Detection</label>
                    <select
                      value={advancedConfig.preprocessing.outlier_method}
                      onChange={(e) => setAdvancedConfig({
                        ...advancedConfig,
                        preprocessing: {
                          ...advancedConfig.preprocessing,
                          outlier_method: e.target.value as any
                        }
                      })}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm"
                    >
                      <option value="zscore">Z-Score (Standard Deviation)</option>
                      <option value="iqr">IQR (Interquartile Range)</option>
                      <option value="none">None</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-400 text-xs mb-2">Outlier Threshold: {advancedConfig.preprocessing.outlier_threshold}</label>
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
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Tuning Options */}
              <div>
                <h4 className="text-sm font-medium text-emerald-400 mb-4 uppercase tracking-wider">Hyperparameter Tuning</h4>
                
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
                            className="w-full px-2 py-1 bg-gray-900 border border-gray-700 rounded text-white text-sm"
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
                            className="w-full px-2 py-1 bg-gray-900 border border-gray-700 rounded text-white text-sm"
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
                            className="w-full px-2 py-1 bg-gray-900 border border-gray-700 rounded text-white text-sm"
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
                            className="w-full px-2 py-1 bg-gray-900 border border-gray-700 rounded text-white text-sm"
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
                            className="w-full px-2 py-1 bg-gray-900 border border-gray-700 rounded text-white text-sm"
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
                            className="w-full px-2 py-1 bg-gray-900 border border-gray-700 rounded text-white text-sm"
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
          <div className="mt-4 bg-purple-900/20 rounded-xl p-6 border border-purple-700/50">
            <h3 className="text-lg font-medium text-white mb-4">Manual Hyperparameter Tuning</h3>
            <p className="text-sm text-purple-300 mb-4">
              Override auto-tuning with your own parameters. Auto-tuning will be disabled when manual parameters are provided.
            </p>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-purple-400 mb-3">ARIMA Order (p, d, q)</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-gray-400 text-xs mb-1">p</label>
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
                      className="w-full px-2 py-2 bg-gray-900 border border-gray-700 rounded text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-xs mb-1">d</label>
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
                      className="w-full px-2 py-2 bg-gray-900 border border-gray-700 rounded text-white"
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
                      className="w-full px-2 py-2 bg-gray-900 border border-gray-700 rounded text-white"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-purple-400 mb-3">Seasonal Order (P, D, Q, s)</h4>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="block text-gray-400 text-xs mb-1">P</label>
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
                      className="w-full px-2 py-2 bg-gray-900 border border-gray-700 rounded text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-xs mb-1">D</label>
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
                      className="w-full px-2 py-2 bg-gray-900 border border-gray-700 rounded text-white"
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
                      className="w-full px-2 py-2 bg-gray-900 border border-gray-700 rounded text-white"
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
                      className="w-full px-2 py-2 bg-gray-900 border border-gray-700 rounded text-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-6 bg-red-900/20 border border-red-500/30 rounded-xl p-4 backdrop-blur-sm">
            <p className="text-red-300 text-sm font-medium">{error}</p>
          </div>
        )}
      </div>

      {/* Results */}
      {forecast && forecast.forecastData && (
        <>
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/20 backdrop-blur-xl rounded-xl p-6 border border-blue-600/30">
              <div className="text-blue-400 text-sm uppercase tracking-wide mb-2">Current Price</div>
              <div className="text-3xl font-bold text-white">${forecast.forecastData.historical_data.values[forecast.forecastData.historical_data.values.length - 1].toFixed(2)}</div>
            </div>
            <div className="bg-gradient-to-br from-emerald-900/30 to-emerald-800/20 backdrop-blur-xl rounded-xl p-6 border border-emerald-600/30">
              <div className="text-emerald-400 text-sm uppercase tracking-wide mb-2">Model</div>
              <div className="text-xl font-bold text-white">{forecast.modelType.replace(/_/g, ' ')}</div>
            </div>
            <div className="bg-gradient-to-br from-purple-900/30 to-purple-800/20 backdrop-blur-xl rounded-xl p-6 border border-purple-600/30">
              <div className="text-purple-400 text-sm uppercase tracking-wide mb-2">MAE</div>
              <div className="text-3xl font-bold text-white">${forecast.metrics.mae.toFixed(2)}</div>
            </div>
            <div className="bg-gradient-to-br from-amber-900/30 to-amber-800/20 backdrop-blur-xl rounded-xl p-6 border border-amber-600/30">
              <div className="text-amber-400 text-sm uppercase tracking-wide mb-2">Stability</div>
              <div className="text-3xl font-bold text-white">{(forecast.metrics.stability_score * 100).toFixed(1)}%</div>
            </div>
          </div>

          {/* Download Buttons */}
          <div className="flex justify-end gap-4 mb-6">
            <button
              onClick={downloadCSV}
              className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium rounded-xl transition-all shadow-lg hover:shadow-emerald-500/30 flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Export CSV</span>
            </button>
            <button
              onClick={downloadJSON}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-medium rounded-xl transition-all shadow-lg hover:shadow-purple-500/30 flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
              </svg>
              <span>Export JSON</span>
            </button>
          </div>

          {/* Main Forecast Chart */}
          <div className="bg-gradient-to-br from-slate-800/50 to-gray-900/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700/50 p-8 mb-8">
            <h3 className="text-2xl font-light text-white mb-6 tracking-wide flex items-center justify-between" style={{ fontFamily: 'Georgia, serif' }}>
              <span>Price Forecast — {ticker}</span>
              <span className="text-sm text-gray-400 font-normal">{forecastWeeks} Week Prediction</span>
            </h3>
            <div className="bg-black/20 rounded-xl p-4">
              <Plot
                data={getForecastPlotData() as any}
                layout={{
                  autosize: true,
                  height: 550,
                  paper_bgcolor: 'rgba(0,0,0,0)',
                  plot_bgcolor: 'rgba(0,0,0,0.3)',
                  font: { color: '#e5e7eb', family: 'system-ui, -apple-system' },
                  xaxis: {
                    title: { text: 'Date' },
                    gridcolor: '#374151',
                    showgrid: true,
                    tickangle: -45,
                  },
                  yaxis: {
                    title: { text: 'Price (USD)' },
                    gridcolor: '#374151',
                    showgrid: true,
                    tickformat: '$,.2f',
                  },
                  legend: {
                    orientation: 'h',
                    y: -0.25,
                    x: 0.5,
                    xanchor: 'center',
                    bgcolor: 'rgba(0,0,0,0.5)',
                    bordercolor: '#4b5563',
                    borderwidth: 1,
                  },
                  hovermode: 'x unified',
                  margin: { l: 80, r: 40, t: 40, b: 100 },
                } as any}
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
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            {/* Model Performance Metrics */}
            <div className="bg-gradient-to-br from-slate-800/50 to-gray-900/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700/50 p-8">
              <h3 className="text-2xl font-light text-white mb-6 tracking-wide" style={{ fontFamily: 'Georgia, serif' }}>
                Model Performance
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-gray-700/50">
                  <span className="text-gray-400 uppercase text-xs tracking-wider">Mean Absolute Error</span>
                  <span className="text-white font-semibold text-lg">${forecast.metrics.mae.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-gray-700/50">
                  <span className="text-gray-400 uppercase text-xs tracking-wider">Root Mean Squared Error</span>
                  <span className="text-white font-semibold text-lg">${forecast.metrics.rmse.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-gray-700/50">
                  <span className="text-gray-400 uppercase text-xs tracking-wider">AIC</span>
                  <span className="text-white font-semibold text-lg">{forecast.metrics.aic.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-gray-700/50">
                  <span className="text-gray-400 uppercase text-xs tracking-wider">BIC</span>
                  <span className="text-white font-semibold text-lg">{forecast.metrics.bic.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 uppercase text-xs tracking-wider">Stability Score</span>
                  <span className="text-emerald-400 font-bold text-lg">{(forecast.metrics.stability_score * 100).toFixed(2)}%</span>
                </div>
              </div>
            </div>

            {/* Model Parameters */}
            <div className="bg-gradient-to-br from-slate-800/50 to-gray-900/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700/50 p-8">
              <h3 className="text-2xl font-light text-white mb-6 tracking-wide" style={{ fontFamily: 'Georgia, serif' }}>
                Model Parameters
              </h3>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {Object.entries(forecast.parameters).map(([key, value]: [string, any]) => (
                  <div key={key} className="flex justify-between items-center pb-3 border-b border-gray-700/50">
                    <span className="text-gray-400 uppercase text-xs tracking-wider">{key.replace(/_/g, ' ')}</span>
                    <span className="text-white font-semibold text-sm">
                      {typeof value === 'number' ? value.toFixed(6) : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Forecast Data Table with Sorting */}
          <div className="bg-gradient-to-br from-slate-800/50 to-gray-900/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700/50 p-8 mb-8">
            <h3 className="text-2xl font-light text-white mb-6 tracking-wide" style={{ fontFamily: 'Georgia, serif' }}>
              Detailed Forecast Data
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-700/50">
                    <th 
                      onClick={() => handleSort('date')}
                      className="px-6 py-4 text-left text-xs text-gray-400 uppercase tracking-wider font-medium cursor-pointer hover:text-white transition-colors"
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
                      className="px-6 py-4 text-right text-xs text-gray-400 uppercase tracking-wider font-medium cursor-pointer hover:text-white transition-colors"
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
                      className="px-6 py-4 text-right text-xs text-gray-400 uppercase tracking-wider font-medium cursor-pointer hover:text-white transition-colors"
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
                      className="px-6 py-4 text-right text-xs text-gray-400 uppercase tracking-wider font-medium cursor-pointer hover:text-white transition-colors"
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
                      className="px-6 py-4 text-right text-xs text-gray-400 uppercase tracking-wider font-medium cursor-pointer hover:text-white transition-colors"
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
                <tbody className="divide-y divide-gray-800/50">
                  {sortedForecastData.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-800/30 transition-all">
                      <td className="px-6 py-4 whitespace-nowrap text-base text-gray-300">
                        {new Date(row.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-base font-semibold text-amber-400">
                        ${row.prediction.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-base text-blue-400">
                        ${row.lower.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-base text-blue-400">
                        ${row.upper.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-base text-gray-400">
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
            <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 backdrop-blur-xl rounded-2xl shadow-2xl border border-indigo-600/30 p-8">
              <div className="flex items-start">
                <div className="w-12 h-12 bg-indigo-600/20 rounded-xl flex items-center justify-center mr-4 flex-shrink-0">
                  <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl text-indigo-200 font-medium mb-3">AI Analysis & Interpretation</h3>
                  <p className="text-gray-300 leading-relaxed whitespace-pre-line">{forecast.interpretation}</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ForecastDashboard;
