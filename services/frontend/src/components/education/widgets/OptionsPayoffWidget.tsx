import React, { useState } from 'react';

export const OptionsPayoffWidget: React.FC = () => {
  const [optionType, setOptionType] = useState<'call' | 'put' | 'bull_call_spread'>('call');
  const [strike, setStrike] = useState<number>(100);
  const [premium, setPremium] = useState<number>(5);
  const [upperStrike, setUpperStrike] = useState<number>(110);
  const upperPremium = 2;

  // Generate price range from 70% of strike to 130% of strike
  const prices: { price: number; pnl: number }[] = [];
  const minPrice = Math.floor(strike * 0.7);
  const maxPrice = Math.ceil(strike * 1.3);
  const step = Math.max(1, Math.round((maxPrice - minPrice) / 25));

  for (let p = minPrice; p <= maxPrice; p += step) {
    let pnl = 0;
    if (optionType === 'call') {
      pnl = Math.max(0, p - strike) - premium;
    } else if (optionType === 'put') {
      pnl = Math.max(0, strike - p) - premium;
    } else if (optionType === 'bull_call_spread') {
      const netDebit = premium - upperPremium;
      const longValue = Math.max(0, p - strike);
      const shortValue = Math.max(0, p - upperStrike);
      pnl = longValue - shortValue - netDebit;
    }
    prices.push({ price: p, pnl: Math.round(pnl * 100) / 100 });
  }

  const maxLoss = optionType === 'bull_call_spread' 
    ? premium - upperPremium 
    : premium;
  const maxGain = optionType === 'bull_call_spread' 
    ? (upperStrike - strike) - maxLoss 
    : undefined;

  return (
    <div className="my-8 p-6 bg-gradient-to-br from-gray-900 via-gray-950 to-black border border-cyan-500/30 rounded-2xl shadow-xl text-white">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">📊</span>
          <h4 className="text-xl font-bold text-cyan-400">Options Strategy Payoff Simulator</h4>
        </div>
        <div className="flex space-x-2 bg-gray-900 p-1 border border-gray-800 rounded-lg text-xs">
          <button
            onClick={() => setOptionType('call')}
            className={`px-3 py-1 rounded transition-colors ${
              optionType === 'call' ? 'bg-cyan-500 text-black font-bold' : 'text-gray-400 hover:text-white'
            }`}
          >
            Long Call
          </button>
          <button
            onClick={() => setOptionType('put')}
            className={`px-3 py-1 rounded transition-colors ${
              optionType === 'put' ? 'bg-cyan-500 text-black font-bold' : 'text-gray-400 hover:text-white'
            }`}
          >
            Long Put
          </button>
          <button
            onClick={() => setOptionType('bull_call_spread')}
            className={`px-3 py-1 rounded transition-colors ${
              optionType === 'bull_call_spread' ? 'bg-cyan-500 text-black font-bold' : 'text-gray-400 hover:text-white'
            }`}
          >
            Bull Call Spread
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">
            Strike Price (${strike})
          </label>
          <input
            type="range"
            min="50"
            max="200"
            step="5"
            value={strike}
            onChange={(e) => setStrike(Number(e.target.value))}
            className="w-full accent-cyan-400 bg-gray-800 rounded-lg cursor-pointer"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">
            Option Premium (${premium})
          </label>
          <input
            type="range"
            min="1"
            max="20"
            step="0.5"
            value={premium}
            onChange={(e) => setPremium(Number(e.target.value))}
            className="w-full accent-cyan-400 bg-gray-800 rounded-lg cursor-pointer"
          />
        </div>

        {optionType === 'bull_call_spread' && (
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Short Call Strike (${upperStrike})
            </label>
            <input
              type="range"
              min={strike + 5}
              max={strike + 40}
              step="5"
              value={upperStrike}
              onChange={(e) => setUpperStrike(Number(e.target.value))}
              className="w-full accent-cyan-400 bg-gray-800 rounded-lg cursor-pointer"
            />
          </div>
        )}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-4 p-4 bg-gray-900/80 border border-gray-800 rounded-xl mb-6 text-center">
        <div>
          <div className="text-xs text-gray-400 uppercase tracking-wider">Max Risk (Per Contract)</div>
          <div className="text-lg font-bold text-red-400">-${(maxLoss * 100).toLocaleString()}</div>
        </div>
        <div>
          <div className="text-xs text-gray-400 uppercase tracking-wider">Breakeven Price</div>
          <div className="text-lg font-bold text-gray-200">
            ${optionType === 'call' ? strike + premium : optionType === 'put' ? strike - premium : strike + (premium - upperPremium)}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-400 uppercase tracking-wider">Max Profit</div>
          <div className="text-lg font-bold text-emerald-400">
            {maxGain !== undefined ? `$${(maxGain * 100).toLocaleString()}` : 'Unlimited 🚀'}
          </div>
        </div>
      </div>

      {/* Payoff Chart Visualizer */}
      <div className="relative h-44 flex items-center justify-between border-b border-t border-gray-800 py-4">
        {/* Zero baseline */}
        <div className="absolute w-full top-1/2 border-b border-dashed border-gray-700 pointer-events-none" />

        {prices.map((pt, i) => {
          const isProfitable = pt.pnl >= 0;
          const heightPct = Math.min(100, Math.abs(pt.pnl) * 5);
          return (
            <div key={i} className="flex-1 flex flex-col justify-center items-center group relative min-w-[8px]">
              <div
                style={{ height: `${heightPct}%` }}
                className={`w-2 rounded ${
                  isProfitable ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-red-500 hover:bg-red-400'
                } transition-all duration-200`}
              />

              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center z-20 pointer-events-none">
                <div className="bg-black border border-cyan-400/50 text-xs rounded px-2 py-1 shadow-xl whitespace-nowrap">
                  <span className="text-gray-300">Price ${pt.price}</span>: {' '}
                  <span className={pt.pnl >= 0 ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                    {pt.pnl >= 0 ? `+$${pt.pnl * 100}` : `-$${Math.abs(pt.pnl * 100)}`}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-between items-center text-xs text-gray-400 mt-2">
        <span>Stock Price: ${minPrice}</span>
        <span className="font-bold text-cyan-400">Strike ${strike}</span>
        <span>Stock Price: ${maxPrice}</span>
      </div>
    </div>
  );
};
