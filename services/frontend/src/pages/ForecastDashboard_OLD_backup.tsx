import React, { useState } from 'react';
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
    metrics: ModelMetrics;
    diagnostics: any;
  };
  interpretation: string;
  createdAt: string;
  completedAt: string;
}

const ForecastDashboard: React.FC = () => {
  const [ticker, setTicker] = useState('');
  const [forecastWeeks, setForecastWeeks] = useState(12);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState('');
  const [error, setError] = useState('');
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [showInstructions, setShowInstructions] = useState(true);

  const handleGenerateForecast = async () => {
    if (!ticker) {
      setError('Please enter a stock ticker');
      return;
    }

    setIsLoading(true);
    setError('');
    setForecast(null);
    setShowInstructions(false);
    setLoadingProgress('Submitting request...');

    try {
      // Step 1: Submit forecast request
      setLoadingProgress('Fetching historical data from Yahoo Finance...');
      const submitResponse = await api.post('/forecast/generate', {
        ticker: ticker.toUpperCase(),
        forecastMonths: forecastWeeks,
      });

      const forecastId = submitResponse.data.forecastId;
      
      if (!forecastId) {
        throw new Error('No forecast ID received');
      }

      // Step 2: Poll for results
      setLoadingProgress('Running AI models (ARIMA, SARIMA, Holt-Winters)...');
      let attempts = 0;
      const maxAttempts = 90; // 3 minutes max
      
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
      csvContent += `Historical,${date},${forecastData.historical_data.values[i]},,,\n`;
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
      metrics: forecast.forecastData.metrics,
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
      diagnostics: forecast.forecastData.diagnostics,
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${ticker}_${forecast.modelType}_forecast_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getForecastPlotData = () => {
    if (!forecast) return [];

    const { forecastData } = forecast;
    const allDates = [...forecastData.historical_data.dates, ...forecastData.dates];
    const splitIndex = forecastData.historical_data.dates.length;

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
      // Confidence interval upper
      {
        x: forecastData.dates,
        y: forecastData.confidence_intervals.upper,
        type: 'scatter',
        mode: 'lines',
        name: `${(forecastData.confidence_intervals.confidence_level * 100).toFixed(0)}% CI Upper`,
        line: { width: 0 },
        fillcolor: 'rgba(251, 191, 36, 0.15)',
        fill: 'tonexty',
        showlegend: true,
        hovertemplate: '<b>Upper CI</b><br>Date: %{x}<br>Price: $%{y:.2f}<extra></extra>',
      },
      // Confidence interval lower
      {
        x: forecastData.dates,
        y: forecastData.confidence_intervals.lower,
        type: 'scatter',
        mode: 'lines',
        name: `${(forecastData.confidence_intervals.confidence_level * 100).toFixed(0)}% CI Lower`,
        line: { width: 0 },
        showlegend: true,
        hovertemplate: '<b>Lower CI</b><br>Date: %{x}<br>Price: $%{y:.2f}<extra></extra>',
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

  const getTrainingValidationPlot = () => {
    if (!forecast) return [];

    const { forecastData } = forecast;
    const historicalLength = forecastData.historical_data.values.length;
    const trainSize = Math.floor(historicalLength * 0.8);
    
    const trainDates = forecastData.historical_data.dates.slice(0, trainSize);
    const trainValues = forecastData.historical_data.values.slice(0, trainSize);
    const validationDates = forecastData.historical_data.dates.slice(trainSize);
    const validationValues = forecastData.historical_data.values.slice(trainSize);

    return [
      {
        x: trainDates,
        y: trainValues,
        type: 'scatter',
        mode: 'lines',
        name: 'Training Data (80%)',
        line: { color: '#10b981', width: 2 },
        hovertemplate: '<b>Training</b><br>Date: %{x}<br>Price: $%{y:.2f}<extra></extra>',
      },
      {
        x: validationDates,
        y: validationValues,
        type: 'scatter',
        mode: 'lines',
        name: 'Validation Data (20%)',
        line: { color: '#f59e0b', width: 2 },
        hovertemplate: '<b>Validation</b><br>Date: %{x}<br>Price: $%{y:.2f}<extra></extra>',
      },
    ];
  };

  return (
    <div className="max-w-7xl mx-auto px-8 py-12">
      
      {/* Welcome & Instructions */}
      {showInstructions && !forecast && (
        <div className="bg-gradient-to-br from-blue-900/20 to-indigo-900/20 backdrop-blur-xl rounded-2xl shadow-2xl border border-blue-700/30 p-8 mb-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-3xl font-light text-white mb-2" style={{ fontFamily: 'Georgia, serif' }}>
                Welcome to PerBillion AI Forecasting
              </h2>
              <p className="text-blue-300 text-lg">Enterprise-grade stock price prediction using advanced statistical models</p>
            </div>
            <button
              onClick={() => setShowInstructions(false)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 mb-6">
            <div className="bg-black/20 rounded-xl p-6 border border-blue-500/20">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-xl text-blue-200 font-medium">Real-Time Data</h3>
              </div>
              <p className="text-gray-300 text-sm">Live data from Yahoo Finance with up to 3 years of historical trading data for accurate pattern recognition</p>
            </div>

            <div className="bg-black/20 rounded-xl p-6 border border-emerald-500/20">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-emerald-600/20 rounded-xl flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h3 className="text-xl text-emerald-200 font-medium">AI Models</h3>
              </div>
              <p className="text-gray-300 text-sm">ARIMA, SARIMA, SARIMAX, and Holt-Winters models automatically optimized for best performance</p>
            </div>

            <div className="bg-black/20 rounded-xl p-6 border border-purple-500/20">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-purple-600/20 rounded-xl flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                  </svg>
                </div>
                <h3 className="text-xl text-purple-200 font-medium">Confidence Intervals</h3>
              </div>
              <p className="text-gray-300 text-sm">95% confidence bounds showing prediction uncertainty and risk assessment</p>
            </div>
          </div>

          <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-xl p-4">
            <div className="flex items-start">
              <svg className="w-6 h-6 text-yellow-400 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className="text-yellow-300 font-medium mb-1">Important Disclaimer</h4>
                <p className="text-gray-300 text-sm">
                  This tool provides statistical forecasts based on historical patterns and should not be considered financial advice. Always perform your own due diligence and consult with a financial advisor before making investment decisions.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Input Section */}
      <div className="bg-gradient-to-br from-slate-800/50 to-gray-900/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700/50 p-8 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <label className="block text-gray-400 text-xs uppercase tracking-wider mb-3 font-medium">
              Stock Ticker
            </label>
            <input
              type="text"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              placeholder="e.g., AAPL, NVDA, TSLA"
              disabled={isLoading}
              className="w-full px-6 py-4 bg-black/40 border border-gray-700 rounded-xl text-white text-2xl font-light tracking-wider focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all uppercase placeholder-gray-600 disabled:opacity-50"
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
              className="w-full px-6 py-4 bg-black/40 border border-gray-700 rounded-xl text-white text-2xl font-light focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all disabled:opacity-50"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={handleGenerateForecast}
              disabled={isLoading || !ticker}
              className="w-full px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium rounded-xl transition-all duration-300 shadow-lg hover:shadow-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider text-sm"
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
              <div className="text-2xl font-bold text-white">{forecast.modelType.replace(/_/g, ' ')}</div>
            </div>
            <div className="bg-gradient-to-br from-purple-900/30 to-purple-800/20 backdrop-blur-xl rounded-xl p-6 border border-purple-600/30">
              <div className="text-purple-400 text-sm uppercase tracking-wide mb-2">MAE</div>
              <div className="text-3xl font-bold text-white">${forecast.forecastData.metrics.mae.toFixed(2)}</div>
            </div>
            <div className="bg-gradient-to-br from-amber-900/30 to-amber-800/20 backdrop-blur-xl rounded-xl p-6 border border-amber-600/30">
              <div className="text-amber-400 text-sm uppercase tracking-wide mb-2">Stability</div>
              <div className="text-3xl font-bold text-white">{(forecast.forecastData.metrics.stability_score * 100).toFixed(1)}%</div>
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
                    title: 'Date',
                    gridcolor: '#374151',
                    showgrid: true,
                    tickangle: -45,
                  },
                  yaxis: {
                    title: 'Price (USD)',
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
            </div>
          </div>

          {/* Training/Validation Split Chart */}
          <div className="bg-gradient-to-br from-slate-800/50 to-gray-900/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700/50 p-8 mb-8">
            <h3 className="text-2xl font-light text-white mb-6 tracking-wide" style={{ fontFamily: 'Georgia, serif' }}>
              Training & Validation Data
            </h3>
            <div className="bg-black/20 rounded-xl p-4">
              <Plot
                data={getTrainingValidationPlot() as any}
                layout={{
                  autosize: true,
                  height: 400,
                  paper_bgcolor: 'rgba(0,0,0,0)',
                  plot_bgcolor: 'rgba(0,0,0,0.3)',
                  font: { color: '#e5e7eb', family: 'system-ui, -apple-system' },
                  xaxis: {
                    title: 'Date',
                    gridcolor: '#374151',
                    showgrid: true,
                    tickangle: -45,
                  },
                  yaxis: {
                    title: 'Price (USD)',
                    gridcolor: '#374151',
                    showgrid: true,
                    tickformat: '$,.2f',
                  },
                  legend: {
                    orientation: 'h',
                    y: -0.3,
                    x: 0.5,
                    xanchor: 'center',
                    bgcolor: 'rgba(0,0,0,0.5)',
                    bordercolor: '#4b5563',
                    borderwidth: 1,
                  },
                  margin: { l: 80, r: 40, t: 40, b: 100 },
                }}
                config={{
                  displayModeBar: true,
                  displaylogo: false,
                  modeBarButtonsToRemove: ['lasso2d', 'select2d'],
                }}
                style={{ width: '100%' }}
                useResizeHandler={true}
              />
            </div>
          </div>

          {/* Metrics Tables */}
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            {/* Model Performance Metrics */}
            <div className="bg-gradient-to-br from-slate-800/50 to-gray-900/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700/50 p-8">
              <h3 className="text-2xl font-light text-white mb-6 tracking-wide" style={{ fontFamily: 'Georgia, serif' }}>
                Model Performance
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-gray-700/50">
                  <span className="text-gray-400 uppercase text-xs tracking-wider">Mean Absolute Error</span>
                  <span className="text-white font-semibold text-lg">${forecast.forecastData.metrics.mae.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-gray-700/50">
                  <span className="text-gray-400 uppercase text-xs tracking-wider">Root Mean Squared Error</span>
                  <span className="text-white font-semibold text-lg">${forecast.forecastData.metrics.rmse.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-gray-700/50">
                  <span className="text-gray-400 uppercase text-xs tracking-wider">AIC (Akaike Info Criterion)</span>
                  <span className="text-white font-semibold text-lg">{forecast.forecastData.metrics.aic.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-gray-700/50">
                  <span className="text-gray-400 uppercase text-xs tracking-wider">BIC (Bayesian Info Criterion)</span>
                  <span className="text-white font-semibold text-lg">{forecast.forecastData.metrics.bic.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-gray-700/50">
                  <span className="text-gray-400 uppercase text-xs tracking-wider">Composite Score</span>
                  <span className="text-white font-semibold text-lg">{forecast.forecastData.metrics.composite_score.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 uppercase text-xs tracking-wider">Stability Score</span>
                  <span className="text-emerald-400 font-bold text-lg">{(forecast.forecastData.metrics.stability_score * 100).toFixed(2)}%</span>
                </div>
              </div>
            </div>

            {/* Model Parameters */}
            <div className="bg-gradient-to-br from-slate-800/50 to-gray-900/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700/50 p-8">
              <h3 className="text-2xl font-light text-white mb-6 tracking-wide" style={{ fontFamily: 'Georgia, serif' }}>
                Model Parameters
              </h3>
              <div className="space-y-4">
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

          {/* Forecast Data Table */}
          <div className="bg-gradient-to-br from-slate-800/50 to-gray-900/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700/50 p-8 mb-8">
            <h3 className="text-2xl font-light text-white mb-6 tracking-wide" style={{ fontFamily: 'Georgia, serif' }}>
              Detailed Forecast Data
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-700/50">
                    <th className="px-6 py-4 text-left text-xs text-gray-400 uppercase tracking-wider font-medium">Date</th>
                    <th className="px-6 py-4 text-right text-xs text-gray-400 uppercase tracking-wider font-medium">Predicted Price</th>
                    <th className="px-6 py-4 text-right text-xs text-gray-400 uppercase tracking-wider font-medium">Lower CI (95%)</th>
                    <th className="px-6 py-4 text-right text-xs text-gray-400 uppercase tracking-wider font-medium">Upper CI (95%)</th>
                    <th className="px-6 py-4 text-right text-xs text-gray-400 uppercase tracking-wider font-medium">Range</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {forecast.forecastData.dates.map((date, i) => {
                    const prediction = forecast.forecastData.predictions[i];
                    const lower = forecast.forecastData.confidence_intervals.lower[i];
                    const upper = forecast.forecastData.confidence_intervals.upper[i];
                    const range = upper - lower;
                    
                    return (
                      <tr key={i} className="hover:bg-gray-800/30 transition-all">
                        <td className="px-6 py-4 whitespace-nowrap text-base text-gray-300">
                          {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-base font-semibold text-amber-400">
                          ${prediction.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-base text-blue-400">
                          ${lower.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-base text-blue-400">
                          ${upper.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-base text-gray-400">
                          ±${(range / 2).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
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

      {/* Footer */}
      <div className="border-t border-gray-800 py-8 mt-20">
        <p className="text-center text-gray-500 text-sm tracking-wide">
          © 2025 PerBillion. Institutional-grade forecasting powered by advanced AI. Not financial advice.
        </p>
      </div>
    </div>
  );
};

export default ForecastDashboard;
