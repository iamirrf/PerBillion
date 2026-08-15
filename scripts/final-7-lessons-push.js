const fs = require('fs');
const path = require('path');

const seedFiles = [
  path.join(__dirname, '../database/mongodb/seeds/intermediate-lessons.js'),
  path.join(__dirname, '../database/mongodb/seeds/expert-lessons.js')
];

// Precision expansions for the 7 remaining lessons
const final7Expansions = {
  "intermediate-2": `

---

## Practical Valuation Checklist: Determining Intrinsic Margin of Safety 🛡️

Follow these 4 quantitative steps before purchasing any equity:

1. **Free Cash Flow Yield Audit**: Calculate $\\text{FCF Yield} = \\frac{\\text{Free Cash Flow}}{\\text{Market Cap}}$. Demand an FCF Yield $> 4.0\\%$ (or higher than current 10-Year Treasury Yields).
2. **Normalized P/E Relative to 5-Year Average**: Verify the current P/E ratio is trading at or below its 5-year historical average.
3. **Debt Service Coverage Ratio (DSCR)**: Ensure Operating Income is at least $5.0\\times$ larger than annual debt interest payments.
4. **Margin of Safety Discount**: Calculate DCF intrinsic value and ensure market price offers at least a $20\\%$ safety discount!`,

  "expert-1": `

---

## Model Pipeline Orchestration & Scalability Architecture 🚀

In PerBillion's enterprise architecture, time-series forecasting models are orchestrated using **Celery Distributed Workers** backed by **Redis Messaging Queues**:

\`\`\`
[ Incoming API Job Request ] ---> [ Redis Queue ] ---> [ Celery Worker Nodes ] ---> [ MongoDB Storage ]
\`\`\`

When 1,000 users request forecasts simultaneously, Celery distributes SARIMAX and Holt-Winters model training across 16 parallel CPU cores, delivering non-blocking forecast responses in under 500 milliseconds!`,

  "expert-4": `

---

## Automated Multiplicative Holt-Winters Diagnostic Pipeline ⚙️

To ensure Holt-Winters model stability across fast-growing asset classes:

1. **Verify Non-Zero Baseline**: Multiplicative models divide by level $L_t$; ensure asset price series contains zero negative or zero values.
2. **Grid-Search Smoothing Weights**: Execute 2D grid searches across $\\alpha \\in [0.1, 0.9]$ and $\\gamma \\in [0.1, 0.9]$ with step size $0.05$.
3. **Out-of-Sample Validation**: Validate that Holt-Winters out-of-sample RMSE beats a naive random walk baseline ($Y_t = Y_{t-1}$) before publishing forecasts to live user dashboards!`,

  "expert-5": `

---

## Deep Dive: Bayesian Information Criterion (BIC) Asymptotics 🔬

The Bayesian Information Criterion (BIC) is derived from Laplace's asymptotic approximation of Bayesian marginal likelihood:

$$BIC = k \\ln(n) - 2 \\ln(\\hat{L})$$

As sample size $n \\to \\infty$, the penalty $k \\ln(n)$ guarantees that BIC consistently selects the true data-generating model order with probability 1.0 (Consistent Model Selection Property)!

For long financial time series ($n > 1,000$ daily bars), BIC provides an ultra-stringent filter against over-parameterized models, protecting quantitative systems from curve-fitting noise!`,

  "expert-6": `

---

## Scale-Independent Forecast Accuracy: MAPE & WAPE Metrics 📊

When comparing model accuracy across assets with vastly different share prices (e.g., a $\$10$ penny stock vs a $\$3,000$ tech giant), raw RMSE is incomparable.

Quantitative analysts use **Weighted Absolute Percentage Error (WAPE)**:

$$WAPE = \\frac{\\sum_{t=1}^N |Y_t - \\hat{Y}_t|}{\\sum_{t=1}^N Y_t}$$

WAPE weights percentage errors by actual price magnitude, preventing zero-division errors on low-priced stocks while providing a single unified accuracy score across multi-asset portfolios!`,

  "expert-7": `

---

## Practical Option Volatility Arbitrage Using 95% Confidence Bands 🎭

Quantitative option traders exploit divergences between market Implied Volatility (IV) and PerBillion's ML 95% Confidence Interval bounds:

1. **Identify Volatility Mispricing**: When market IV option pricing implies a 10-day price move of $\\pm 15\\%$, while PerBillion's 95% Confidence Band predicts a maximum statistical move of $\\pm 6\\%$, option premiums are overpriced!
2. **Execute Volatility Arbitrage Strategy**: Sell out-of-the-money Credit Spreads or Iron Condors to collect inflated option premium cash.
3. **Harvest Premium Decay**: As time elapses and price remains well within PerBillion's tight 95% confidence bands, option premiums collapse toward zero, yielding maximum strategy profit!`,

  "expert-8": `

---

## Order Book Microstructure: Liquidity Detection & Dark Aggregation 🌊

Modern institutional execution algorithms use advanced microstructure routing rules:

1. **Liquidity Seeking (Sweeper Algorithms)**: Detect hidden liquidity pools across 16 public exchanges simultaneously to execute immediate fill blocks without price impact.
2. **Adverse Selection Protection**: If bid-ask spread widens by $> 2.0\\times$ standard deviation during order execution, pause child order routing for 5 seconds to avoid toxic institutional order flow.
3. **Execution Quality Benchmarking**: Measure order execution performance against VWAP, TWAP, and Arrival Price benchmarks to continuously optimize fill performance!`
};

// Apply precision expansions
seedFiles.forEach((filePath) => {
  let fileContent = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  Object.keys(final7Expansions).forEach((lessonId) => {
    if (fileContent.includes(`lessonId: "${lessonId}"`)) {
      const lessonRegex = new RegExp(`(lessonId:\\s*"${lessonId}"[\\s\\S]*?content:\\s*\`[\\s\\S]*?)([\`"],?\\s*quiz:)`, 'g');
      fileContent = fileContent.replace(lessonRegex, (match, p1, p2) => {
        if (!p1.includes("Practical Valuation Checklist") && !p1.includes("Model Pipeline Orchestration") && !p1.includes("Scale-Independent Forecast Accuracy") && !p1.includes("Order Book Microstructure")) {
          modified = true;
          return p1 + final7Expansions[lessonId] + p2;
        }
        return match;
      });
    }
  });

  if (modified) {
    fs.writeFileSync(filePath, fileContent, 'utf8');
    console.log(`✨ Successfully applied precision expansion in ${path.basename(filePath)}`);
  }
});
