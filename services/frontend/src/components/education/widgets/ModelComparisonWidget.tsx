import React, { useState } from 'react';

export const ModelComparisonWidget: React.FC = () => {
  const [selectedModel, setSelectedModel] = useState<string>('sarimax');

  const models: Record<string, {
    name: string;
    type: string;
    fullTitle: string;
    description: string;
    formula: string;
    trend: string;
    seasonality: string;
    exogenous: boolean;
    bestUse: string;
    perbillionUsage: string;
  }> = {
    arima: {
      name: 'ARIMA',
      type: 'Auto-Regressive Integrated Moving Average',
      fullTitle: 'ARIMA(p, d, q)',
      description: 'Standard baseline for non-seasonal time series with linear trend dynamics.',
      formula: 'Y_t = c + φ_1 Y_{t-1} + ... + θ_1 ε_{t-1} + ε_t',
      trend: 'Captured via Differencing (d)',
      seasonality: 'Not Supported (requires SARIMA)',
      exogenous: false,
      bestUse: 'Short-term non-seasonal asset price trends (e.g. daily index returns).',
      perbillionUsage: 'Used as fast baseline benchmark model in automated model selection.'
    },
    sarima: {
      name: 'SARIMA',
      type: 'Seasonal ARIMA',
      fullTitle: 'SARIMA(p,d,q) × (P,D,Q)_s',
      description: 'Extends ARIMA with seasonal lags (weekly, monthly, annual cycles).',
      formula: 'Φ_P(B^s) φ_p(B) (1-B^s)^D (1-B)^d Y_t = Θ_Q(B^s) θ_q(B) ε_t',
      trend: 'Supported via non-seasonal differencing (d)',
      seasonality: 'Fully Supported via seasonal parameters (P,D,Q)_s',
      exogenous: false,
      bestUse: 'Stocks with recurring weekly or earnings-cycle seasonality.',
      perbillionUsage: 'Deployed for quarterly earnings cyclicality and weekly volume patterns.'
    },
    sarimax: {
      name: 'SARIMAX',
      type: 'Seasonal ARIMA with Exogenous Regressors',
      fullTitle: 'SARIMAX(p,d,q) × (P,D,Q)_s + X_t',
      description: 'State-of-the-art linear model fusing time series memory with macro features & sentiment.',
      formula: 'Y_t = β_0 + β_1 X_{1,t} + ... + SARIMA_component + ε_t',
      trend: 'Supported',
      seasonality: 'Supported',
      exogenous: true,
      bestUse: 'High-conviction trading strategies driven by interest rates, VIX, and order flow.',
      perbillionUsage: 'Primary workhorse model in PerBillion ML Engine when macroeconomic features are active.'
    },
    holt_winters_add: {
      name: 'Holt-Winters (Add)',
      type: 'Additive Exponential Smoothing',
      fullTitle: 'Triple Exponential Smoothing (Additive)',
      description: 'Models level, linear trend, and additive seasonal fluctuations.',
      formula: 'Y_t = Level_{t-1} + Trend_{t-1} + Seasonal_{t-s}',
      trend: 'Linear Additive Trend (β)',
      seasonality: 'Constant Amplitude Seasonality',
      exogenous: false,
      bestUse: 'Assets where seasonal variations stay constant regardless of stock price scale.',
      perbillionUsage: 'Rapid forecasting for stable large-cap dividend stocks.'
    },
    holt_winters_mult: {
      name: 'Holt-Winters (Mult)',
      type: 'Multiplicative Exponential Smoothing',
      fullTitle: 'Triple Exponential Smoothing (Multiplicative)',
      description: 'Models seasonal oscillations that grow proportionally with asset price.',
      formula: 'Y_t = (Level_{t-1} + Trend_{t-1}) × Seasonal_{t-s}',
      trend: 'Proportional Multiplicative Trend',
      seasonality: 'Proportional Expanding Seasonality',
      exogenous: false,
      bestUse: 'High-growth tech stocks (e.g. NVDA, TSLA) where swings scale with price.',
      perbillionUsage: 'Top choice for exponential growth assets undergoing volatile expansions.'
    }
  };

  const current = models[selectedModel];

  return (
    <div className="my-8 p-6 bg-gradient-to-br from-gray-900 via-gray-950 to-black border border-gold-500/30 rounded-2xl shadow-xl text-white">
      <div className="flex items-center space-x-3 mb-4">
        <span className="text-2xl">⚡</span>
        <h4 className="text-xl font-bold text-gold-400">Time-Series Model Architecture Matrix</h4>
      </div>

      {/* Model Buttons */}
      <div className="flex flex-wrap gap-2 mb-6">
        {Object.keys(models).map((key) => (
          <button
            key={key}
            onClick={() => setSelectedModel(key)}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all duration-200 ${
              selectedModel === key
                ? 'bg-gradient-to-r from-gold-400 to-amber-500 text-black shadow-lg scale-105'
                : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white hover:border-gold-500/40'
            }`}
          >
            {models[key].name}
          </button>
        ))}
      </div>

      {/* Model Spec Sheet */}
      <div className="p-5 bg-gray-900/90 border border-gray-800 rounded-xl space-y-4">
        <div className="flex items-start justify-between border-b border-gray-800 pb-3">
          <div>
            <h5 className="text-lg font-bold text-white">{current.fullTitle}</h5>
            <p className="text-xs text-gold-400">{current.type}</p>
          </div>
          <span className={`px-2.5 py-1 text-[11px] font-bold rounded-full uppercase ${
            current.exogenous ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-gray-800 text-gray-400'
          }`}>
            {current.exogenous ? '⚡ Exogenous Features Supported' : 'Univariate Time Series'}
          </span>
        </div>

        <p className="text-sm text-gray-300 leading-relaxed">{current.description}</p>

        {/* Mathematical Formula Box */}
        <div className="p-3 bg-black/60 border border-gold-400/20 rounded-lg text-xs font-mono text-gold-300 overflow-x-auto">
          {current.formula}
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-2">
          <div className="p-3 bg-gray-950/60 rounded-lg border border-gray-800">
            <span className="text-gray-400 block font-semibold mb-1">📈 Trend Handling</span>
            <span className="text-gray-200">{current.trend}</span>
          </div>

          <div className="p-3 bg-gray-950/60 rounded-lg border border-gray-800">
            <span className="text-gray-400 block font-semibold mb-1">🔁 Seasonality Support</span>
            <span className="text-gray-200">{current.seasonality}</span>
          </div>
        </div>

        {/* Use Cases */}
        <div className="pt-2 border-t border-gray-800 space-y-2 text-xs">
          <div>
            <span className="font-bold text-cyan-400">Optimal Use Case: </span>
            <span className="text-gray-300">{current.bestUse}</span>
          </div>
          <div>
            <span className="font-bold text-emerald-400">PerBillion System Role: </span>
            <span className="text-gray-300">{current.perbillionUsage}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
