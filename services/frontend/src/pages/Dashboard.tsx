import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import { format } from 'date-fns'
import Papa from 'papaparse'

export default function Dashboard() {
  const [forecasts, setForecasts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [ticker, setTicker] = useState('')

  const [file, setFile] = useState<File | null>(null)
  const [parseError, setParseError] = useState<string>('')
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [dateColumn, setDateColumn] = useState<string>('')
  const [valueColumn, setValueColumn] = useState<string>('')
  const [forecastHorizon, setForecastHorizon] = useState<number>(12)
  const [modelType, setModelType] = useState<string>('auto')

  useEffect(() => {
    loadForecasts()
  }, [])

  useEffect(() => {
    if (!file) {
      setRows([])
      setColumns([])
      setDateColumn('')
      setValueColumn('')
      setParseError('')
      return
    }

    setParseError('')
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const text = String(reader.result || '')
        const result = Papa.parse<Record<string, unknown>>(text, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: true,
        })

        if (result.errors?.length) {
          setParseError(result.errors[0].message || 'Failed to parse CSV')
          return
        }

        const parsedRows = (result.data || []).filter(Boolean)
        setRows(parsedRows)

        const fieldNames = (result.meta.fields || []).filter(Boolean) as string[]
        setColumns(fieldNames)

        // Heuristics: pick a likely date column then a likely numeric column
        const dateCandidate = fieldNames.find((c) => /date|time|timestamp/i.test(c)) || fieldNames[0] || ''
        setDateColumn((prev) => prev || dateCandidate)

        const numericCandidate = fieldNames.find((c) => c !== dateCandidate && typeof parsedRows[0]?.[c] === 'number')
        const fallbackValue = fieldNames.find((c) => c !== dateCandidate) || ''
        setValueColumn((prev) => prev || numericCandidate || fallbackValue)
      } catch (err: any) {
        setParseError(err?.message || 'Failed to parse CSV')
      }
    }
    reader.onerror = () => setParseError('Failed to read file')
    reader.readAsText(file)
  }, [file])

  const loadForecasts = async () => {
    try {
      const response = await api.get('/forecasts')
      setForecasts(response.data.content || [])
    } catch (error) {
      console.error('Failed to load forecasts:', error)
    } finally {
      setLoading(false)
    }
  }

  const createForecast = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)

    try {
      if (!ticker.trim()) {
        throw new Error('Ticker is required')
      }

      if (!file) {
        throw new Error('Please upload a CSV file')
      }

      if (!dateColumn || !valueColumn) {
        throw new Error('Select a date column and a value column')
      }

      const series = rows
        .map((r) => {
          const rawDate = r[dateColumn]
          const rawValue = r[valueColumn]
          const date = rawDate instanceof Date ? rawDate : new Date(String(rawDate))
          const value = typeof rawValue === 'number' ? rawValue : Number(rawValue)
          if (!Number.isFinite(date.getTime())) return null
          if (!Number.isFinite(value)) return null
          return [date.toISOString(), value]
        })
        .filter(Boolean) as [string, number][]

      series.sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())

      if (series.length < 50) {
        throw new Error(`Not enough valid rows (${series.length}). Need at least 50 data points.`)
      }

      const response = await api.post('/forecasts', {
        ticker: ticker.toUpperCase(),
        data: series,
        forecastHorizon,
        modelType,
      })

      setTicker('')
      setFile(null)
      loadForecasts()

      // Optional: jump straight to the forecast details page
      const forecastId = response.data?.forecastId
      if (forecastId) {
        window.location.href = `/forecast/${forecastId}`
      }
    } catch (error: any) {
      alert(error.response?.data?.error || error.message || 'Failed to create forecast')
    } finally {
      setCreating(false)
    }
  }

  const columnOptions = useMemo(
    () => columns.map((c) => ({ label: c, value: c })),
    [columns]
  )

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-semibold text-gray-900">Dashboard</h1>
      </div>

      {/* Create Forecast Form */}
      <div className="card">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h2 className="text-xl font-semibold">Create Forecast</h2>
            <p className="text-sm text-gray-600 mt-1">
              Upload a CSV, choose your date and value columns, and run a model.
            </p>
          </div>
        </div>

        <form onSubmit={createForecast} className="mt-6 grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ticker</label>
              <input
                type="text"
                placeholder="AAPL"
                className="input"
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                pattern="[A-Z]{1,5}"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">CSV File</label>
              <input
                type="file"
                accept=".csv,text/csv"
                className="input"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              {parseError && (
                <p className="text-sm text-red-600 mt-2">{parseError}</p>
              )}
              {!parseError && file && (
                <p className="text-sm text-gray-500 mt-2">
                  {file.name} • {rows.length} rows
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date column</label>
              <select
                className="input"
                value={dateColumn}
                onChange={(e) => setDateColumn(e.target.value)}
                disabled={columnOptions.length === 0}
              >
                <option value="" disabled>
                  Select a column
                </option>
                {columnOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Value column</label>
              <select
                className="input"
                value={valueColumn}
                onChange={(e) => setValueColumn(e.target.value)}
                disabled={columnOptions.length === 0}
              >
                <option value="" disabled>
                  Select a column
                </option>
                {columnOptions
                  .filter((o) => o.value !== dateColumn)
                  .map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Forecast horizon</label>
              <input
                type="number"
                min={1}
                max={52}
                className="input"
                value={forecastHorizon}
                onChange={(e) => setForecastHorizon(Number(e.target.value))}
              />
              <p className="text-xs text-gray-500 mt-2">1–52 periods (weekly in current engine)</p>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
              <select
                className="input"
                value={modelType}
                onChange={(e) => setModelType(e.target.value)}
              >
                <option value="auto">Auto</option>
                <option value="ARIMA">ARIMA</option>
                <option value="SARIMA">SARIMA</option>
                <option value="SARIMAX">SARIMAX</option>
                <option value="HOLT_WINTERS_ADDITIVE">Holt-Winters (Additive)</option>
                <option value="HOLT_WINTERS_MULTIPLICATIVE">Holt-Winters (Multiplicative)</option>
                <option value="HOLT_WINTERS_DAMPED">Holt-Winters (Damped)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={creating}
              className="btn btn-primary"
            >
              {creating ? 'Creating…' : 'Create forecast'}
            </button>
          </div>
        </form>
      </div>

      {/* Forecasts List */}
      <div>
        <h2 className="section-title">Your Forecasts</h2>
        
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : forecasts.length === 0 ? (
          <div className="card text-center py-12 text-gray-500">
            No forecasts yet. Create your first forecast above.
          </div>
        ) : (
          <div className="grid gap-4">
            {forecasts.map((forecast) => (
              <Link
                key={forecast.forecastId}
                to={`/forecast/${forecast.forecastId}`}
                className="card hover:border-gray-300"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold">{forecast.ticker}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {forecast.modelType} • {forecast.status}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      Created {format(new Date(forecast.createdAt), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    forecast.status === 'completed' ? 'bg-green-100 text-green-700' :
                    forecast.status === 'running' ? 'bg-blue-100 text-blue-700' :
                    forecast.status === 'failed' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {forecast.status}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
