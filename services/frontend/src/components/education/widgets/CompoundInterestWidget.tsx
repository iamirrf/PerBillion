import React, { useState } from 'react';

export const CompoundInterestWidget: React.FC = () => {
  const [initial, setInitial] = useState<number>(1000);
  const [monthly, setMonthly] = useState<number>(200);
  const [rate, setRate] = useState<number>(8);
  const [years, setYears] = useState<number>(20);

  // Calculate annual balances
  const r = rate / 100;
  const balances: { year: number; principal: number; interest: number; total: number }[] = [];
  
  let currentTotal = initial;
  let totalContributed = initial;

  for (let y = 0; y <= years; y++) {
    if (y === 0) {
      balances.push({ year: 0, principal: initial, interest: 0, total: initial });
    } else {
      // Annual calculation with monthly compounding
      for (let m = 0; m < 12; m++) {
        currentTotal = (currentTotal + monthly) * (1 + r / 12);
        totalContributed += monthly;
      }
      const interestEarned = Math.max(0, currentTotal - totalContributed);
      balances.push({
        year: y,
        principal: Math.round(totalContributed),
        interest: Math.round(interestEarned),
        total: Math.round(currentTotal)
      });
    }
  }

  const finalBalance = balances[balances.length - 1];
  const maxTotal = finalBalance.total || 1;

  return (
    <div className="my-8 p-6 bg-gradient-to-br from-gray-900 via-gray-950 to-black border border-gold-500/30 rounded-2xl shadow-xl text-white">
      <div className="flex items-center space-x-3 mb-4">
        <span className="text-2xl">📈</span>
        <h4 className="text-xl font-bold text-gold-400">Interactive Compound Interest Simulator</h4>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">
            Initial Investment (${initial.toLocaleString()})
          </label>
          <input
            type="range"
            min="100"
            max="25000"
            step="100"
            value={initial}
            onChange={(e) => setInitial(Number(e.target.value))}
            className="w-full accent-gold-400 bg-gray-800 rounded-lg cursor-pointer"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">
            Monthly Contribution (${monthly.toLocaleString()})
          </label>
          <input
            type="range"
            min="0"
            max="2000"
            step="50"
            value={monthly}
            onChange={(e) => setMonthly(Number(e.target.value))}
            className="w-full accent-gold-400 bg-gray-800 rounded-lg cursor-pointer"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">
            Annual Return ({rate}%)
          </label>
          <input
            type="range"
            min="1"
            max="15"
            step="0.5"
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
            className="w-full accent-gold-400 bg-gray-800 rounded-lg cursor-pointer"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">
            Time Horizon ({years} years)
          </label>
          <input
            type="range"
            min="1"
            max="40"
            step="1"
            value={years}
            onChange={(e) => setYears(Number(e.target.value))}
            className="w-full accent-gold-400 bg-gray-800 rounded-lg cursor-pointer"
          />
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-3 gap-4 p-4 bg-gray-900/80 border border-gray-800 rounded-xl mb-6 text-center">
        <div>
          <div className="text-xs text-gray-400 uppercase tracking-wider">Total Contributed</div>
          <div className="text-lg font-bold text-gray-200">${finalBalance.principal.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-xs text-gray-400 uppercase tracking-wider">Interest Earned</div>
          <div className="text-lg font-bold text-emerald-400">+${finalBalance.interest.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-xs text-gray-400 uppercase tracking-wider">Final Portfolio Value</div>
          <div className="text-xl font-extrabold text-gold-400">${finalBalance.total.toLocaleString()}</div>
        </div>
      </div>

      {/* Visual Chart */}
      <div className="h-44 flex items-end justify-between space-x-1 pt-4 pb-2 px-2 bg-gray-900/40 rounded-xl border border-gray-800/60 overflow-x-auto">
        {balances.map((b) => {
          const principalPct = (b.principal / maxTotal) * 100;
          const interestPct = (b.interest / maxTotal) * 100;
          return (
            <div key={b.year} className="flex-1 flex flex-col justify-end items-center group relative min-w-[12px]">
              <div className="w-full flex flex-col justify-end rounded-t overflow-hidden transition-all duration-300">
                <div
                  style={{ height: `${interestPct}%` }}
                  className="w-full bg-gradient-to-t from-emerald-600 to-emerald-400 transition-all duration-300"
                />
                <div
                  style={{ height: `${principalPct}%` }}
                  className="w-full bg-gradient-to-t from-gold-600 to-amber-400 transition-all duration-300"
                />
              </div>

              {/* Tooltip on hover */}
              <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center z-20 pointer-events-none">
                <div className="bg-black border border-gold-400/50 text-xs rounded px-2 py-1 shadow-xl whitespace-nowrap">
                  <span className="font-bold text-gold-400">Year {b.year}</span>: ${b.total.toLocaleString()}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between items-center text-xs text-gray-400 mt-2 px-1">
        <span>Year 0</span>
        <div className="flex space-x-4">
          <span className="flex items-center"><span className="w-2.5 h-2.5 bg-amber-400 rounded-full inline-block mr-1"></span> Principal</span>
          <span className="flex items-center"><span className="w-2.5 h-2.5 bg-emerald-400 rounded-full inline-block mr-1"></span> Compound Interest</span>
        </div>
        <span>Year {years}</span>
      </div>
    </div>
  );
};
