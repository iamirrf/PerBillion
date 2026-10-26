import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import api from "../lib/api";
import { Icon } from "./Icons";
import { LineChart } from "./Charts";
import "./research-comparison.css";

type Forecast = {
  forecastId: string;
  userId?: string;
  ticker: string;
  status: string;
  modelType: string;
  createdAt?: string;
  completedAt?: string;
  forecastData?: {
    dates: string[];
    predictions: number[];
    confidence_intervals?: {
      lower: number[];
      upper: number[];
      confidence_level?: number;
    };
  };
  metrics?: Record<string, number>;
  requestMetadata?: { forecastHorizon?: number; frequency?: string };
  historicalData?: {
    sourceCutoff?: string;
    sourceSnapshotId?: string;
    observationCount?: number;
    series?: unknown[];
  };
  errorMessage?: string;
};
type Comparison = {
  _id: string;
  name: string;
  ticker: string;
  forecastIds: string[];
  createdAt: string;
  runs?: Forecast[];
};
type Capacity = {
  limit: number;
  used: number;
  remaining: number;
  resetAt: string;
};
const models = [
  ["auto", "Automatic selection"],
  ["ARIMA", "ARIMA"],
  ["SARIMA", "SARIMA"],
  ["SARIMAX", "SARIMAX"],
  ["HOLT_WINTERS_ADDITIVE", "Holt-Winters additive"],
  ["HOLT_WINTERS_MULTIPLICATIVE", "Holt-Winters multiplicative"],
  ["HOLT_WINTERS_DAMPED", "Holt-Winters damped"],
];
const supportedHorizons = new Set([4, 12, 26, 52]);
const money = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);

export default function Research() {
  const { view = "studio" } = useParams(),
    [query] = useSearchParams(),
    queryHorizon = Number(query.get("horizon")),
    [ticker, setTicker] = useState(
      /^[A-Z]{1,5}$/.test(query.get("ticker") || "")
        ? query.get("ticker")!
        : "AAPL",
    ),
    [horizon, setHorizon] = useState(
      supportedHorizons.has(queryHorizon) ? queryHorizon : 12,
    ),
    [model, setModel] = useState(
      models.some(([id]) => id === query.get("model"))
        ? query.get("model")!
        : "auto",
    ),
    [hypothesis, setHypothesis] = useState(""),
    [result, setResult] = useState<Forecast | null>(null),
    [history, setHistory] = useState<Forecast[]>([]),
    [watchlist, setWatchlist] = useState<string[]>([]),
    [comparisons, setComparisons] = useState<Comparison[]>([]),
    [capacity, setCapacity] = useState<Capacity | null>(null),
    [selected, setSelected] = useState<string[]>([]),
    [filter, setFilter] = useState(""),
    [loading, setLoading] = useState(false),
    [refreshing, setRefreshing] = useState(false),
    [error, setError] = useState(""),
    [historyError, setHistoryError] = useState(""),
    controller = useRef<AbortController | null>(null);
  const filtered = useMemo(
    () =>
      history.filter(
        (item) =>
          !filter ||
          item.ticker.includes(filter.toUpperCase()) ||
          item.modelType.toLowerCase().includes(filter.toLowerCase()),
      ),
    [history, filter],
  );
  async function refresh() {
    setRefreshing(true);
    setHistoryError("");
    const responses = await Promise.allSettled([
      api.get("/forecast/history?limit=100"),
      api.get("/product/watchlist"),
      api.get("/product/comparisons"),
      api.get("/forecast/capacity"),
    ]);
    const [runs, list, saved, budget] = responses;
    if (runs.status === "fulfilled")
      setHistory(runs.value.data.content || runs.value.data.forecasts || []);
    else
      setHistoryError(
        "Saved runs could not be refreshed. Your current result is unchanged.",
      );
    if (list.status === "fulfilled")
      setWatchlist(list.value.data.tickers || []);
    if (saved.status === "fulfilled")
      setComparisons(saved.value.data.comparisons || []);
    if (budget.status === "fulfilled") setCapacity(budget.value.data);
    setRefreshing(false);
  }
  useEffect(() => {
    let active = true;
    api
      .get("/user/preferences")
      .then(({ data }) => {
        if (!active) return;
        if (
          !query.has("ticker") &&
          /^[A-Z]{1,5}$/.test(data.defaultTicker || "")
        )
          setTicker(data.defaultTicker);
        if (
          !query.has("horizon") &&
          supportedHorizons.has(data.defaultForecastHorizon)
        )
          setHorizon(data.defaultForecastHorizon);
        if (
          !query.has("model") &&
          models.some(([id]) => id === data.preferredModel)
        )
          setModel(data.preferredModel);
      })
      .catch(() => {});
    void refresh();
    return () => {
      active = false;
      controller.current?.abort();
    };
  }, [query]);
  async function awaitResult(
    response: { data: Forecast },
    abort: AbortController,
  ) {
    let current = response;
    for (
      let attempt = 0;
      !current.data.forecastData && current.data.forecastId && attempt < 45;
      attempt++
    ) {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, 2000);
        abort.signal.addEventListener(
          "abort",
          () => {
            clearTimeout(timer);
            reject(
              new Error(
                "The page stopped waiting. Server work may still finish and appear in Saved runs.",
              ),
            );
          },
          { once: true },
        );
      });
      current = await api.get(`/forecast/${current.data.forecastId}`, {
        signal: abort.signal,
      });
      if (
        ["failed", "error", "cancelled", "timed_out"].includes(
          current.data.status,
        )
      )
        throw new Error(
          current.data.errorMessage || "The forecast did not complete.",
        );
    }
    if (!current.data.forecastData)
      throw new Error(
        "This forecast is taking longer than expected. Check Saved runs shortly.",
      );
    return current.data;
  }
  async function run() {
    if (!/^[A-Z]{1,5}$/.test(ticker)) {
      setError("Enter a ticker using 1–5 letters.");
      return;
    }
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    setLoading(true);
    setError("");
    try {
      const response = await api.post<Forecast>(
        "/forecast/generate",
        {
          ticker,
          forecastMonths: horizon,
          modelType: model,
          researchQuestion: hypothesis.trim() || undefined,
        },
        { signal: abort.signal, timeout: 135000 },
      );
      setResult(await awaitResult(response, abort));
      await refresh();
    } catch (failure: any) {
      setError(
        failure.response?.data?.message ||
          failure.message ||
          "Research is temporarily unavailable.",
      );
    } finally {
      setLoading(false);
    }
  }
  async function rerunSaved(item: Forecast) {
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    setLoading(true);
    setError("");
    try {
      const response = await api.post<Forecast>(
        `/forecast/${item.forecastId}/rerun`,
        { modelType: model },
        { signal: abort.signal, timeout: 135000 },
      );
      setResult(await awaitResult(response, abort));
      await refresh();
    } catch (failure: any) {
      setError(
        failure.response?.data?.message ||
          failure.message ||
          "The saved snapshot could not be rerun.",
      );
    } finally {
      setLoading(false);
    }
  }
  async function toggleWatch(symbol: string) {
    try {
      if (watchlist.includes(symbol))
        await api.delete(`/product/watchlist/${symbol}`);
      else await api.put(`/product/watchlist/${symbol}`);
      await refresh();
    } catch (failure: any) {
      setError(
        failure.response?.data?.error ||
          "The watchlist change could not be saved.",
      );
    }
  }
  async function saveComparison() {
    try {
      await api.post("/product/comparisons", { forecastIds: selected });
      setSelected([]);
      await refresh();
    } catch (failure: any) {
      setError(
        failure.response?.data?.error ||
          "Choose two runs that share a ticker, source snapshot, and weekly horizon.",
      );
    }
  }
  function exportCSV(forecast: Forecast) {
    const data = forecast.forecastData;
    if (!data) return;
    const rows = [
      "date,prediction,lower,upper",
      ...data.predictions.map(
        (value, index) =>
          `${data.dates[index]},${value},${data.confidence_intervals?.lower[index] ?? ""},${data.confidence_intervals?.upper[index] ?? ""}`,
      ),
    ];
    const url = URL.createObjectURL(
        new Blob([rows.join("\n")], { type: "text/csv" }),
      ),
      anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${forecast.ticker}-${forecast.modelType}-forecast.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="product-page">
      <header className="product-head">
        <div>
          <p className="kicker">RESEARCH</p>
          <h1>Question the model.</h1>
          <p>
            Build weekly forecasts, inspect uncertainty, and preserve the
            evidence.
          </p>
        </div>
        <nav className="subnav">
          <button
            className={view === "studio" ? "active" : ""}
            onClick={() => document.getElementById("research-studio")?.focus()}
          >
            Studio
          </button>
          <a href="#history">Saved runs</a>
          <a href="#comparisons">Comparisons</a>
        </nav>
      </header>
      <div className="research-layout" id="research-studio" tabIndex={-1}>
        <section className="research-controls">
          <p className="label">NEW FORECAST</p>
          <h2>Define the question.</h2>
          <label>
            Research question <span className="muted">optional</span>
            <textarea
              maxLength={240}
              value={hypothesis}
              onChange={(event) => setHypothesis(event.target.value)}
              placeholder="Example: How uncertain is AAPL’s 12-week range under the selected historical model?"
            />
          </label>
          <label>
            Ticker
            <div className="ticker-input">
              <input
                value={ticker}
                maxLength={5}
                onChange={(event) =>
                  setTicker(
                    event.target.value.toUpperCase().replace(/[^A-Z]/g, ""),
                  )
                }
              />
              <button
                aria-label={
                  watchlist.includes(ticker)
                    ? "Remove from watchlist"
                    : "Add to watchlist"
                }
                onClick={() => void toggleWatch(ticker)}
              >
                {watchlist.includes(ticker) ? "★" : "☆"}
              </button>
            </div>
          </label>
          {watchlist.length > 0 && (
            <div className="watchlist">
              {watchlist.map((symbol) => (
                <button key={symbol} onClick={() => setTicker(symbol)}>
                  {symbol}
                </button>
              ))}
            </div>
          )}
          <label>
            Weekly horizon
            <select
              value={horizon}
              onChange={(event) => setHorizon(Number(event.target.value))}
            >
              {[4, 12, 26, 52].map((value) => (
                <option value={value} key={value}>
                  {value} weeks
                </option>
              ))}
            </select>
          </label>
          <details className="advanced-research">
            <summary>Model controls</summary>
            <label>
              Model
              <select
                value={model}
                onChange={(event) => setModel(event.target.value)}
              >
                {models.map(([id, name]) => (
                  <option value={id} key={id}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <p>
              Automatic selection screens candidate models with diagnostics and
              validation. A selected model can still be wrong.
            </p>
          </details>
          <button
            className="button primary"
            disabled={loading || capacity?.remaining === 0}
            onClick={() => void run()}
          >
            {loading ? "Building forecast…" : "Generate forecast"}
            <Icon name="spark" />
          </button>
          {loading && (
            <button
              className="text-button"
              onClick={() => {
                controller.current?.abort();
                setLoading(false);
                setError(
                  "The page stopped waiting. Server work may still finish and appear in Saved runs.",
                );
              }}
            >
              Stop waiting
            </button>
          )}
          {capacity && (
            <p className="capacity-note">
              {capacity.remaining} of {capacity.limit} shared runs remain in the
              current window.
            </p>
          )}
          <p role="alert" className="status error">
            {error}
          </p>
          <aside>
            <Icon name="help" />
            <p>
              Forecasts use historical weekly prices. They are estimates with
              uncertainty, not recommendations.
            </p>
          </aside>
        </section>
        <section className="research-result">
          {result?.forecastData ? (
            <ForecastView
              forecast={result}
              exportCSV={() => exportCSV(result)}
            />
          ) : (
            <div className="research-empty">
              <p className="label">ILLUSTRATIVE OUTPUT</p>
              <h2>The range matters more than the line.</h2>
              <LineChart
                values={[
                  100, 101, 100.8, 103, 104, 105, 107, 108, 110, 111, 113, 114,
                ]}
                lower={[98, 98, 97, 98, 98, 98, 98, 97, 97, 96, 96, 95]}
                upper={[
                  102, 104, 105, 108, 110, 112, 115, 118, 121, 124, 127, 130,
                ]}
                labels={Array.from(
                  { length: 12 },
                  (_, index) => `Week ${index + 1}`,
                )}
                height={300}
                prefix="Index "
              />
              <p>
                This saved illustration does not use live capacity. Generate a
                run to replace it with account-owned model output.
              </p>
            </div>
          )}
        </section>
      </div>
      <section id="history" className="history-section">
        <header>
          <div>
            <p className="label">SAVED RUNS</p>
            <h2>Research history.</h2>
          </div>
          <div className="history-tools">
            <input
              aria-label="Filter saved runs"
              placeholder="Filter ticker or model"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            />
            {selected.length === 2 && (
              <button
                className="button primary"
                onClick={() => void saveComparison()}
              >
                Save comparison
              </button>
            )}
            <button
              className="text-button"
              disabled={refreshing}
              onClick={() => void refresh()}
            >
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </header>
        {historyError && (
          <p className="status error" role="alert">
            {historyError}
          </p>
        )}
        {filtered.length ? (
          <div className="history-list">
            {filtered.map((item) => (
              <article
                key={item.forecastId}
                className={selected.includes(item.forecastId) ? "selected" : ""}
              >
                <label>
                  <input
                    type="checkbox"
                    aria-label={`Select ${item.ticker} ${item.modelType} forecast for comparison`}
                    disabled={
                      !selected.includes(item.forecastId) &&
                      selected.length >= 2
                    }
                    checked={selected.includes(item.forecastId)}
                    onChange={() =>
                      setSelected((current) =>
                        current.includes(item.forecastId)
                          ? current.filter((id) => id !== item.forecastId)
                          : [...current, item.forecastId],
                      )
                    }
                  />
                  <span />
                </label>
                <div>
                  <b>{item.ticker}</b>
                  <small>
                    {item.modelType} ·{" "}
                    {item.createdAt
                      ? new Date(item.createdAt).toLocaleDateString()
                      : "Legacy run"}
                  </small>
                </div>
                <span className={`run-status ${item.status}`}>
                  {item.status}
                </span>
                <span className="run-actions">
                  <button onClick={() => setResult(item)}>Open</button>
                  <button
                    disabled={!item.historicalData?.series || loading}
                    onClick={() => void rerunSaved(item)}
                  >
                    Re-run saved snapshot
                  </button>
                </span>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <Icon name="spark" />
            <h3>
              {filter
                ? "No saved runs match that filter."
                : "Your research history will appear here."}
            </h3>
            <p>
              {filter
                ? "Clear the filter to see every run."
                : "Generate a forecast to preserve its output and provenance."}
            </p>
          </div>
        )}
      </section>
      <section id="comparisons" className="comparison-section">
        <header>
          <p className="label">COMPARISONS</p>
          <h2>Saved questions, side by side.</h2>
        </header>
        {comparisons.length ? (
          <div className="comparison-list">
            {comparisons.map((item) => (
              <ComparisonView key={String(item._id)} item={item} />
            ))}
          </div>
        ) : (
          <p>
            Select two saved runs with the same ticker, horizon, and source
            snapshot.
          </p>
        )}
      </section>
    </div>
  );
}

function ForecastView({
  forecast,
  exportCSV,
}: {
  forecast: Forecast;
  exportCSV: () => void;
}) {
  const data = forecast.forecastData!,
    last = data.predictions[data.predictions.length - 1],
    confidence = data.confidence_intervals?.confidence_level,
    confidenceLabel = Number.isFinite(confidence)
      ? `${Math.round(Number(confidence) * (Number(confidence) <= 1 ? 100 : 1))}% model interval`
      : "Model interval";
  return (
    <>
      <header>
        <div>
          <p className="label">
            {forecast.ticker} · {forecast.modelType}
          </p>
          <span>Statistical estimate</span>
          <h2>{money(last)}</h2>
        </div>
        <button onClick={exportCSV} aria-label="Download CSV">
          <Icon name="download" />
        </button>
      </header>
      <LineChart
        values={data.predictions}
        lower={data.confidence_intervals?.lower}
        upper={data.confidence_intervals?.upper}
        labels={data.dates.map((date) =>
          new Date(date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
        )}
        height={330}
      />
      <div className="research-legend">
        <span>
          <i />
          Central estimate
        </span>
        <span>
          <i />
          {confidenceLabel}
        </span>
      </div>
      <div className="metrics">
        {Object.entries(forecast.metrics || {})
          .filter(([, value]) => Number.isFinite(value))
          .slice(0, 4)
          .map(([key, value]) => (
            <div key={key}>
              <span>{key.split("_").join(" ")}</span>
              <b>{value.toFixed(2)}</b>
              <small>{metricHelp(key)}</small>
            </div>
          ))}
      </div>
      <footer>
        <span>
          Generated{" "}
          {forecast.completedAt
            ? new Date(forecast.completedAt).toLocaleString()
            : "from a legacy run"}
        </span>
        <span>
          Source cutoff{" "}
          {forecast.historicalData?.sourceCutoff ||
            "unavailable for this legacy record"}
        </span>
        <span>
          {forecast.historicalData?.observationCount || "Unknown"} observations
          · {forecast.requestMetadata?.frequency || "weekly"} cadence
        </span>
      </footer>
    </>
  );
}
function metricHelp(key: string) {
  const normalized = key.toLowerCase();
  if (normalized.includes("mape"))
    return "Average percentage error; lower is better.";
  if (normalized.includes("mae"))
    return "Average absolute error in price units.";
  if (normalized.includes("rmse"))
    return "Penalizes larger misses more heavily.";
  if (normalized.includes("aic"))
    return "Balances model fit against complexity.";
  return "Model diagnostic; compare under the same data and horizon.";
}
function ComparisonView({ item }: { item: Comparison }) {
  const runs = item.runs || [];
  return (
    <article className="comparison-card">
      <header>
        <div>
          <b>{item.name}</b>
          <small>
            {item.ticker} · {new Date(item.createdAt).toLocaleDateString()}
          </small>
        </div>
        <span>
          {runs.length === 2 ? "Same saved source" : "Legacy comparison"}
        </span>
      </header>
      {runs.length === 2 ? (
        <div>
          {runs.map((run) => {
            const values = run.forecastData?.predictions || [],
              last = values[values.length - 1];
            return (
              <section key={run.forecastId}>
                <span>{run.modelType}</span>
                <strong>
                  {Number.isFinite(last) ? money(last) : "No result"}
                </strong>
                <small>
                  {run.requestMetadata?.forecastHorizon || "—"} weeks ·{" "}
                  {run.status}
                </small>
                {values.length > 0 && (
                  <LineChart
                    values={values}
                    labels={run.forecastData!.dates}
                    height={130}
                  />
                )}
              </section>
            );
          })}
        </div>
      ) : (
        <p>
          This comparison predates stored output summaries. Its forecast IDs
          remain in your export.
        </p>
      )}
    </article>
  );
}
