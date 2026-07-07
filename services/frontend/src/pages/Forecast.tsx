import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import api from '../lib/api'
import ForecastChart from '../components/ForecastChart'

export default function Forecast() {
  const { forecastId } = useParams()
  const [forecast, setForecast] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [advancedMode, setAdvancedMode] = useState(false)

  const downloadCsv = () => {
    if (!forecast?.forecastData) return

    const dates: string[] = forecast.forecastData.dates || []
    const predictions: number[] = forecast.forecastData.predictions || []
    const lower: number[] = forecast.forecastData?.confidence_intervals?.lower || []
    const upper: number[] = forecast.forecastData?.confidence_intervals?.upper || []

    const header = ['date', 'prediction', 'lower', 'upper']
    const lines = [header.join(',')]

    for (let i = 0; i < dates.length; i++) {
      const row = [
        JSON.stringify(dates[i] ?? ''),
        String(predictions[i] ?? ''),
        String(lower[i] ?? ''),
        String(upper[i] ?? ''),
      ]
      lines.push(row.join(','))
    }

    const csv = lines.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${forecast.ticker || 'forecast'}_${forecast.forecastId || 'export'}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  useEffect(() => {
    loadForecast()
    const interval = setInterval(loadForecast, 5000) // Poll every 5 seconds
    return () => clearInterval(interval)
  }, [forecastId])

  const loadForecast = async () => {
    try {
      const response = await api.get(`/forecasts/${forecastId}`)
      setForecast(response.data)
    } catch (error) {
      console.error('Failed to load forecast:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-12">Loading...</div>
  }

  if (!forecast) {
    return <div className="text-center py-12">Forecast not found</div>
  }

  if (forecast.status === 'pending' || forecast.status === 'running') {
    return (
      <div className="card text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold mb-2">Processing Forecast</h2>
        <p className="text-gray-600">
          Running statistical analysis and model tuning for {forecast.ticker}...
        </p>
      </div>
    )
  }

  if (forecast.status === 'failed') {
    return (
      <div className="card text-center py-12">
        <h2 className="text-xl font-semibold mb-2 text-red-600">Forecast Failed</h2>
        <p className="text-gray-600">{forecast.errorMessage}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">{forecast.ticker} Forecast</h1>
          <p className="text-gray-600 mt-1">
            {forecast.modelType} • {forecast.forecastData?.predictions?.length || 0} weeks
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={downloadCsv}
            className="btn btn-secondary"
          >
            Download CSV
          </button>
          <button
            onClick={() => setAdvancedMode(!advancedMode)}
            className="btn btn-secondary"
          >
            {advancedMode ? 'Simple View' : 'Advanced Mode'}
          </button>
        </div>
      </div>

      {/* Chart */}
      {forecast.forecastData && (
        <ForecastChart
          data={{
            historical: {
              dates: forecast.forecastData.historical_data.dates,
              values: forecast.forecastData.historical_data.values,
            },
            forecast: {
              dates: forecast.forecastData.dates,
              predictions: forecast.forecastData.predictions,
              lower: forecast.forecastData.confidence_intervals.lower,
              upper: forecast.forecastData.confidence_intervals.upper,
            },
          }}
          ticker={forecast.ticker}
        />
      )}

      {/* Interpretation */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-3">Forecast Interpretation</h2>
        <p className="text-gray-700 leading-relaxed whitespace-pre-line">
          {forecast.interpretation}
        </p>
      </div>

      {/* Advanced Mode */}
      {advancedMode && (
        <>
          {/* Metrics */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Model Metrics</h2>
            <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {forecast.metrics && Object.entries(forecast.metrics).map(([key, value]: [string, any]) => (
                <div key={key}>
                  <dt className="text-sm text-gray-600 uppercase">{key}</dt>
                  <dd className="text-lg font-semibold mt-1">
                    {typeof value === 'number' ? value.toFixed(4) : value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Parameters */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Model Parameters</h2>
            <pre className="bg-gray-50 p-4 rounded-lg overflow-auto text-sm">
              {JSON.stringify(forecast.parameters, null, 2)}
            </pre>
          </div>

          {/* Diagnostics */}
          {forecast.diagnostics && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Diagnostics</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Data Quality</h3>
                  <p className="text-sm text-gray-600">
                    Quality Score: {forecast.diagnostics.data_quality?.quality_score?.toFixed(1)}%
                  </p>
                  <p className="text-sm text-gray-600">
                    Observations: {forecast.diagnostics.data_quality?.n_observations}
                  </p>
                </div>
                
                {forecast.diagnostics.stationarity && (
                  <div>
                    <h3 className="font-medium mb-2">Stationarity</h3>
                    <p className="text-sm text-gray-600">
                      ADF Test: {forecast.diagnostics.stationarity.adf?.conclusion}
                    </p>
                    <p className="text-sm text-gray-600">
                      KPSS Test: {forecast.diagnostics.stationarity.kpss?.conclusion}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
