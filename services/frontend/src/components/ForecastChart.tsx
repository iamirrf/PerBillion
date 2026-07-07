import { Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { format } from 'date-fns'

interface ForecastChartProps {
  data: {
    historical: { dates: string[]; values: number[] }
    forecast: { dates: string[]; predictions: number[]; lower: number[]; upper: number[] }
  }
  ticker: string
}

export default function ForecastChart({ data, ticker }: ForecastChartProps) {
  // Combine historical and forecast data
  const chartData = [
    ...data.historical.dates.map((date, i) => ({
      date: format(new Date(date), 'MMM d'),
      actual: data.historical.values[i],
      predicted: null,
      lower: null,
      upper: null,
    })),
    ...data.forecast.dates.map((date, i) => ({
      date: format(new Date(date), 'MMM d'),
      actual: null,
      predicted: data.forecast.predictions[i],
      lower: data.forecast.lower[i],
      upper: data.forecast.upper[i],
    })),
  ]

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4">{ticker} Price Forecast</h3>
      
      <ResponsiveContainer width="100%" height={400}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="colorConfidence" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b7af6" stopOpacity={0.1} />
              <stop offset="95%" stopColor="#3b7af6" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12, fill: '#6b7280' }}
            stroke="#d1d5db"
          />
          <YAxis 
            tick={{ fontSize: 12, fill: '#6b7280' }}
            stroke="#d1d5db"
            domain={['auto', 'auto']}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
          />
          <Legend />

          {/* Confidence interval */}
          <Area
            type="monotone"
            dataKey="upper"
            stroke="none"
            fill="url(#colorConfidence)"
            name="Confidence Band"
          />
          <Area
            type="monotone"
            dataKey="lower"
            stroke="none"
            fill="white"
          />

          {/* Historical data */}
          <Line
            type="monotone"
            dataKey="actual"
            stroke="#374151"
            strokeWidth={2}
            dot={false}
            name="Historical"
          />

          {/* Forecast */}
          <Line
            type="monotone"
            dataKey="predicted"
            stroke="#3b7af6"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            name="Forecast"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
