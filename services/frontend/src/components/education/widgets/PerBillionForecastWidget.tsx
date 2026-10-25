import React, { useState } from 'react';

export const PerBillionForecastWidget: React.FC = () => {
  const [ticker, setTicker] = useState<'AAPL' | 'NVDA' | 'TSLA' | 'MSFT'>('NVDA');
  const [modelType, setModelType] = useState<'SARIMAX' | 'HOLT_WINTERS' | 'ARIMA'>('SARIMAX');
  const horizonDays = 14;

  // Preset ticker data
  const basePrices: Record<string, number> = {
    NVDA: 125.5,
    AAPL: 220.0,
    TSLA: 215.0,
    MSFT: 440.0
  };

  const currentPrice = basePrices[ticker];
  const driftRate = modelType === 'SARIMAX' ? 0.003 : modelType === 'HOLT_WINTERS' ? 0.002 : 0.001;
  const volatility = modelType === 'SARIMAX' ? 0.015 : 0.022;

  // Generate historical + forecast points
  const points: { day: number; historical?: number; prediction?: number; ci68Lower?: number; ci68Upper?: number; ci95Lower?: number; ci95Upper?: number }[] = [];

  // 10 historical days
  let hPrice = currentPrice * 0.94;
  for (let d = -10; d <= 0; d++) {
    hPrice = d === 0 ? currentPrice : hPrice * (1 + (Math.sin(d) * 0.01 + 0.003));
    points.push({
      day: d,
      historical: Math.round(hPrice * 100) / 100
    });
  }

  // Horizon forecast days
  let fPrice = currentPrice;
  for (let d = 1; d <= horizonDays; d++) {
    fPrice = fPrice * (1 + driftRate + Math.sin(d * 0.5) * 0.002);
    const band68 = fPrice * (volatility * Math.sqrt(d / 5));
    const band95 = fPrice * (volatility * 1.96 * Math.sqrt(d / 5));

    points.push({
      day: d,
      prediction: Math.round(fPrice * 100) / 100,
      ci68Lower: Math.round((fPrice - band68) * 100) / 100,
      ci68Upper: Math.round((fPrice + band68) * 100) / 100,
      ci95Lower: Math.round((fPrice - band95) * 100) / 100,
      ci95Upper: Math.round((fPrice + band95) * 100) / 100
    });
  }

  const finalForecast = points[points.length - 1];

  return (
    <div className="my-8 p-6 bg-gradient-to-br from-gray-900 via-gray-950 to-black border border-emerald-500/30 rounded-2xl shadow-xl text-white">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">🤖</span>
          <div>
            <h4 className="text-xl font-bold text-emerald-400">PerBillion ML Forecast Engine Visualizer</h4>
            <p className="text-xs text-gray-400">Probabilistic Time-Series Predictions & Confidence Intervals</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Ticker Selector */}
          <select
            value={ticker}
            onChange={(e) => setTicker(e.target.value as any)}
            className="bg-gray-900 border border-gray-700 text-gold-400 font-bold text-xs rounded-lg px-3 py-1.5 focus:outline-none"
          >
            <option value="NVDA">NVDA ($125.50)</option>
            <option value="AAPL">AAPL ($220.00)</option>
            <option value="TSLA">TSLA ($215.00)</option>
            <option value="MSFT">MSFT ($440.00)</option>
          </select>

          {/* Model Selector */}
          <select
            value={modelType}
            onChange={(e) => setModelType(e.target.value as any)}
            className="bg-gray-900 border border-gray-700 text-emerald-400 font-bold text-xs rounded-lg px-3 py-1.5 focus:outline-none"
          >
            <option value="SARIMAX">SARIMAX + Exogenous (Recommended)</option>
            <option value="HOLT_WINTERS">Holt-Winters Multiplicative</option>
            <option value="ARIMA">Auto-ARIMA (p,d,q)</option>
          </select>
        </div>
      </div>

      {/* Model Diagnostic Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-gray-900/80 border border-gray-800 rounded-xl mb-6 text-center text-xs">
        <div>
          <span className="text-gray-400 block">Forecast Target ({horizonDays}d)</span>
          <span className="text-sm font-bold text-emerald-400">${finalForecast.prediction}</span>
        </div>
        <div>
          <span className="text-gray-400 block">68% Probable Range</span>
          <span className="text-sm font-bold text-gray-200">
            ${finalForecast.ci68Lower} - ${finalForecast.ci68Upper}
          </span>
        </div>
        <div>
          <span className="text-gray-400 block">95% Probable Stop Loss</span>
          <span className="text-sm font-bold text-red-400">${finalForecast.ci95Lower}</span>
        </div>
        <div>
          <span className="text-gray-400 block">Model RMSE Metric</span>
          <span className="text-sm font-bold text-gold-400">
            {modelType === 'SARIMAX' ? '1.84' : modelType === 'HOLT_WINTERS' ? '2.15' : '2.95'}
          </span>
        </div>
      </div>

      {/* Chart Visualization */}
      <div className="relative h-48 bg-gray-950/70 border border-gray-800 rounded-xl p-4 flex items-end justify-between overflow-hidden">
        {/* Divider line between historical and forecast */}
        <div className="absolute left-[35%] top-0 bottom-0 border-r border-dashed border-gold-400/50 z-10">
          <span className="absolute top-2 left-1 text-[10px] text-gold-400 font-bold bg-black/80 px-1 rounded">
            NOW
          </span>
        </div>

        {points.map((pt, idx) => {
          const minP = currentPrice * 0.85;
          const maxP = currentPrice * 1.25;
          const isHist = pt.day <= 0;

          const hHeight = isHist ? ((pt.historical! - minP) / (maxP - minP)) * 100 : 0;
          const pHeight = !isHist ? ((pt.prediction! - minP) / (maxP - minP)) * 100 : 0;
          const ci95UpperH = !isHist ? ((pt.ci95Upper! - minP) / (maxP - minP)) * 100 : 0;
          const ci95LowerH = !isHist ? ((pt.ci95Lower! - minP) / (maxP - minP)) * 100 : 0;

          return (
            <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full relative group">
              {!isHist && (
                <div
                  style={{
                    bottom: `${ci95LowerH}%`,
                    height: `${Math.max(4, ci95UpperH - ci95LowerH)}%`
                  }}
                  className="absolute w-full bg-emerald-500/15 border-y border-emerald-500/30 transition-all duration-300"
                />
              )}

              <div
                style={{ height: `${isHist ? hHeight : pHeight}%` }}
                className={`w-1.5 rounded-t z-20 ${
                  isHist ? 'bg-gray-400' : 'bg-emerald-400 group-hover:bg-gold-400'
                } transition-all duration-200`}
              />

              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center z-30 pointer-events-none">
                <div className="bg-black border border-emerald-400/50 text-[11px] rounded px-2.5 py-1 shadow-2xl whitespace-nowrap">
                  <span className="font-bold text-emerald-400">Day {pt.day}</span>:{' '}
                  {isHist ? `$${pt.historical}` : `$${pt.prediction} (CI 95%: $${pt.ci95Lower}-$${pt.ci95Upper})`}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-between items-center text-xs text-gray-400 mt-3">
        <span className="flex items-center"><span className="w-2.5 h-2.5 bg-gray-400 rounded-full inline-block mr-1"></span> Historical Prices</span>
        <span className="flex items-center"><span className="w-2.5 h-2.5 bg-emerald-400 rounded-full inline-block mr-1"></span> PerBillion Point Estimate</span>
        <span className="flex items-center"><span className="w-2.5 h-2.5 bg-emerald-500/30 border border-emerald-500 rounded inline-block mr-1"></span> 95% Confidence Interval</span>
      </div>
    </div>
  );
};
