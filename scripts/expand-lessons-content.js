const fs = require('fs');
const path = require('path');

const seedFiles = [
  path.join(__dirname, '../database/mongodb/seeds/beginner-lessons.js'),
  path.join(__dirname, '../database/mongodb/seeds/intermediate-lessons.js'),
  path.join(__dirname, '../database/mongodb/seeds/expert-lessons.js')
];

// Additional rich deep dive sections to push every lesson over 1,100 words
const expansions2 = {
  "beginner-6": `

---

## The Rule of 72 & The Impact of 2% Higher Returns 🚀

Small differences in annual interest rates produce monumental differences over 30 years:

Imagine investing $\\$25,000$ at age 25:
- **At 6% Return**: $\\$25,000 \\times (1.06)^{40} = \\mathbf{\\$257,142}$ (Doubles every 12 years).
- **At 8% Return**: $\\$25,000 \\times (1.08)^{40} = \\mathbf{\\$543,113}$ (Doubles every 9 years).
- **At 10% Return**: $\\$25,000 \\times (1.10)^{40} = \\mathbf{\\$1,132,482}$ (Doubles every 7.2 years!).

A $4\\%$ increase in annual return resulted in **over $\\$875,000$ of additional final wealth**! This is why minimizing investment fees and capturing maximum equity returns is so critical.

---

## Advanced Compounding Frequency Math 🧮

Interest can compound at different frequencies: Annually ($n=1$), Quarterly ($n=4$), Monthly ($n=12$), or Continuously ($A = P e^{rt}$).

$$\\text{Effective Annual Rate (EAR)} = \\left(1 + \\frac{r}{n}\\right)^n - 1$$

Monthly compounding on a $10\\%$ interest rate yields an Effective Annual Rate of **$10.47\\%$**, compounding your wealth faster than annual interest payouts!`,

  "beginner-8": `

---

## Real-World Asset Allocation Profiles 🏛️

1. **Young Growth Seeker (Age 20-35)**: $85\\%$ Global Equities ('VTI' / 'VXUS'), $15\\%$ Fixed Income ('BND'). Focus on maximum compounding.
2. **Mid-Career Family (Age 35-50)**: $70\\%$ Equities, $25\\%$ Bonds, $5\\%$ Real Estate ('VNQ'). Balanced capital appreciation with income buffer.
3. **Wealth Preservation (Age 55+)**: $40\\%$ Dividend Equities, $50\\%$ Treasuries & Corporate Bonds, $10\\%$ Cash T-Bills. Focus on capital protection and passive cash flow.

---

## The Step-by-Step Rebalancing Rules 🔄

When rebalancing your portfolio annually, follow these 3 practical steps:
- **Step 1**: Calculate the current total dollar value of your entire investment portfolio across all accounts.
- **Step 2**: Multiply total portfolio value by your target asset allocation percentages (e.g. 80% Equities / 20% Bonds).
- **Step 3**: Sell off shares of the asset class that is currently above its target percentage and use the cash proceeds to buy shares of the underperforming asset class!`,

  "beginner-9": `

---

## Overcoming the Psychological Fear of Buying Market Highs 🧘‍♂️

Retail investors often hesitate to start DCA when stock markets sit at all-time highs, fearing an immediate crash.

However, historical data reveals that all-time highs are a normal feature of growing economies! In fact, S&P 500 data from 1950 to 2024 shows that buying on days when the market hit an all-time high delivered average 1-year and 3-year returns that were virtually identical to buying on any random day!

By maintaining a mechanical, automated DCA strategy, you eliminate the emotional stress of timing all-time highs vs dips.`,

  "beginner-10": `

---

## Comprehensive Self-Assessment Checklist for Traders 📋

Ask yourself these 5 questions before executing any investment decision:

1. **Thesis Check**: Am I buying this asset because of audited business fundamentals, or because I saw a viral post on social media?
2. **Horizon Check**: Is this capital earmarked for a short-term goal (< 2 years) or a long-term compound wealth goal (10+ years)?
3. **Risk Sizing Check**: If this single stock drops $30\\%$ tomorrow, will my total portfolio drop less than $2.0\\%$?
4. **Tax Check**: Have I held this position for over 366 days to qualify for lower long-term capital gains tax rates?
5. **Execution Check**: Am I using a Limit Order to control my execution fill price?`,

  "intermediate-1": `

---

## Deep Dive: Multiple Timeframe Trend Confluence 🔍

Professional technical analysts never trade a single timeframe chart in isolation. They use **Multiple Timeframe Analysis**:

1. **Higher Timeframe (Weekly Chart)**: Identifies the primary macro trend direction (Bullish, Bearish, or Side-ways).
2. **Intermediate Timeframe (Daily Chart)**: Pinpoints key Support and Resistance levels, 50-day SMA trends, and RSI oversold/overbought momentum.
3. **Lower Timeframe (1-Hour / 15-Min Chart)**: Finds exact candlestick entry triggers (e.g. Bullish Engulfing pattern) with tight stop-loss placement!

Trading in alignment with the weekly macro trend increases trade win rates by over $25\\%$!`,

  "intermediate-2": `

---

## Understanding Dupont Analysis: Deconstructing ROE 🔬

To evaluate *how* a company generates high Return on Equity (ROE), analysts use **DuPont 3-Factor Decomposition**:

$$\\text{ROE} = \\text{Net Profit Margin} \\times \\text{Asset Turnover} \\times \\text{Financial Leverage}$$

$$\\text{ROE} = \\left(\\frac{\\text{Net Income}}{\\text{Revenue}}\\right) \\times \\left(\\frac{\\text{Revenue}}{\\text{Assets}}\\right) \\times \\left(\\frac{\\text{Assets}}{\\text{Equity}}\\right)$$

DuPont analysis reveals whether high ROE comes from real pricing power (High Profit Margin), operational efficiency (High Asset Turnover), or dangerous financial debt (High Financial Leverage)!`,

  "intermediate-3": `

---

## Detailed Options Pricing Example: Black-Scholes Inputs 🧮

Options pricing models calculate fair value based on 5 key inputs:

1. **Underlying Stock Price ($S$)**: Current market price of the stock.
2. **Strike Price ($K$)**: Contractually agreed trade price.
3. **Time to Expiration ($T$)**: Days remaining until contract expiration date.
4. **Risk-Free Interest Rate ($r$)**: Short-term Treasury yield.
5. **Implied Volatility ($\\sigma$)**: The market's forecast of future price volatility!

When Implied Volatility (IV) surges before earnings, option premiums expand across both Calls and Puts. Selling inflated IV before earnings allows options sellers to capture **IV Crush** profit when volatility collapses post-earnings!`,

  "intermediate-4": `

---

## Futures Tick Value Calculations & Position Sizing 🧮

Every futures contract moves in discrete minimum price increments called **Ticks**:

- **E-mini S&P 500 ('ES')**: Minimum tick size = $0.25$ index points. 1 Tick Value = $\$50 \\times 0.25 = \\mathbf{\\$12.50}$.
- **Micro E-mini S&P ('MES')**: Minimum tick size = $0.25$ index points. 1 Tick Value = $\$5 \\times 0.25 = \\mathbf{\\$1.25}$.
- **Crude Oil ('CL')**: Minimum tick size = $\$0.01$ per barrel. 1 Tick Value = $\$0.01 \\times 1,000 = \\mathbf{\\$10.00}$.

If an 'ES' futures trader enters long at $5,000.00$ with a 10-point stop loss ($4,990.00$), the total dollar risk per contract is $10 \\times \\$50 = \\mathbf{\\$500.00}$!`,

  "intermediate-5": `

---

## Step-by-Step Margin Risk Audit Protocol 📋

To ensure you never face an unexpected forced liquidation:

1. **Calculate Free Margin Cushion**: Maintain at least a $50\\%$ cash equity buffer above your broker's Maintenance Margin Requirement at all times.
2. **Monitor Correlation Across Margin Positions**: Borrowing margin to buy 3 tech stocks increases systemic risk because all 3 stocks will drop simultaneously during a tech sell-off!
3. **Set Hard Stop-Losses Above Margin Call Price**: Place automated stop-loss orders well above your calculated Margin Call threshold to exit losing positions before liquidations trigger.`,

  "intermediate-6": `

---

## Complete Business Cycle Sector Allocation Playbook 🗺️

- **Early Recovery**: Overweight Tech ('XLK'), Consumer Discretionary ('XLY'), Real Estate ('XLRE').
- **Mid Expansion**: Overweight Industrials ('XLI'), Technology ('XLK'), Financials ('XLF').
- **Late Expansion**: Overweight Energy ('XLE'), Materials ('XLB').
- **Recession**: Overweight Consumer Staples ('XLP'), Healthcare ('XLV'), Utilities ('XLU').

By tracking leading economic indicators (ISM Purchasing Managers Index, Yield Curves, Freight Shipping Indices), quantitative macro funds rotate capital into outperforming sectors 3 to 6 months before economic cycle shifts become obvious in mainstream headlines!`,

  "intermediate-7": `

---

## Detailed Fed Rate Decision Playbook 🏦

When the FOMC releases its interest rate policy statement at 2:00 PM ET, institutional traders analyze 3 components:

1. **The Target Rate Change**: Did the Fed hike, cut, or pause interest rates?
2. **The FOMC Statement Wording**: Words like *"further tightening may be required"* signal hawkish policy; *"risks to employment are balanced"* signal dovish policy.
3. **The Fed Dot Plot**: Published quarterly, the Dot Plot reveals individual FOMC member projections for where interest rates will sit over the next 1 to 3 years!`,

  "intermediate-8": `

---

## Mathematical Derivation of the Sharpe Ratio 📐

The Sharpe Ratio evaluates risk-adjusted return by measuring the slope of the Capital Allocation Line:

$$\\text{Sharpe Ratio} = \\frac{E(R_p) - R_f}{\\sigma_p}$$

Suppose Strategy A generates a $+15\\%$ return with a $20\\%$ standard deviation, while Strategy B generates a $+12\\%$ return with an $8\\%$ standard deviation. Assuming $R_f = 4\\%$:

$$\\text{Sharpe}_A = \\frac{15\\% - 4\\%}{20\\%} = \\mathbf{0.55}$$
$$\\text{Sharpe}_B = \\frac{12\\% - 4\\%}{8\\%} = \\mathbf{1.00}$$

Strategy B is **significantly superior** on a risk-adjusted basis! By applying modest leverage to Strategy B, an investor can achieve Strategy A's $+15\\%$ return with far less risk!`,

  "intermediate-9": `

---

## Walk-Forward Optimization & Parameter Stability 🔄

Static backtests often fail because market regimes change over time. Institutional quantitative developers use **Walk-Forward Optimization**:

1. Train strategy parameters on Years 1–3 (In-Sample).
2. Test optimized parameters on Year 4 (Out-of-Sample).
3. Roll the window forward: Train on Years 2–4; Test on Year 5.
4. Repeat across 10 years of data.

If your optimized trading parameters (e.g. 20-day Moving Average vs 50-day Moving Average) remain stable across consecutive walk-forward test periods, your strategy has proven genuine predictive edge resilient to market regime changes!`,

  "intermediate-10": `

---

## Advanced Risk Metrics: Expected Shortfall (CVaR) 📉

While Value at Risk (VaR) estimates the maximum expected loss at a $95\\%$ confidence level, it tells you nothing about how severe losses will be when that $5\\%$ tail risk event occurs!

**Conditional Value at Risk (CVaR)**, also known as **Expected Shortfall**, measures the expected average loss in the worst $5\\%$ tail scenarios:

$$CVaR_{95\\%} = E[L \\mid L > VaR_{95\\%}]$$

Institutional risk managers use CVaR to size positions safely against extreme tail-risk market crashes (Black Swans)!`,

  "expert-1": `

---

## Deep Dive: Feature Engineering & Time-Series Transformations 🔬

Before passing financial data into time-series algorithms, quantitative engineers apply stationary transformations:

$$\\text{Log Return } r_t = \\ln\\left(\\frac{P_t}{P_{t-1}}\\right)$$

$$\\text{Normalized Feature } Z_t = \\frac{X_t - \\mu_{14d}}{\\sigma_{14d}}$$

Log returns transform price series into stationary distributions with zero mean drift, while $Z$-score normalization scales exogenous indicators (RSI, VIX, Yields) into uniform variance inputs—enabling optimal gradient descent convergence during model estimation!`,

  "expert-2": `

---

## Information Criterion Optimization: AICc vs. BIC 🧮

When selecting optimal lag parameters $(p, d, q)$ for SARIMA, automated algorithms compare Information Criteria:

$$AIC = 2k - 2 \\ln(\\hat{L})$$
$$BIC = k \\ln(n) - 2 \\ln(\\hat{L})$$

Where $k$ is the number of parameters and $\\hat{L}$ is maximum likelihood. BIC applies a higher penalty $k \\ln(n)$ for additional parameters, preventing over-parameterized models from memorizing historical noise!`,

  "expert-3": `

---

## Advanced Feature Selection: Variance Inflation Factor (VIF) 🧪

To detect and remove multicollinear exogenous variables before fitting SARIMAX:

$$VIF_j = \\frac{1}{1 - R_j^2}$$

Where $R_j^2$ is the coefficient of determination from regressing feature $X_j$ against all other exogenous features. Features exhibiting $VIF > 5.0$ are automatically pruned from PerBillion's exogenous matrix—ensuring regression coefficient stability!`,

  "expert-4": `

---

## Parameter Optimization via Nelder-Mead Optimization 📐

Holt-Winters smoothing parameters $\\alpha$ (Level), $\\beta$ (Trend), $\\gamma$ (Seasonality), and $\\phi$ (Damping) are estimated by minimizing Sum of Squared Errors (SSE):

$$\\text{Minimize } SSE = \\sum_{t=1}^{N} (Y_t - \\hat{Y}_{t \\mid t-1})^2$$

PerBillion's Python backend uses constrained **Nelder-Mead Simplex Optimization** to find global minimum parameter values while enforcing bounds $0 \\le \\alpha, \\beta, \\gamma, \\phi \\le 1$.`,

  "expert-5": `

---

## Overfitting Penalties & Cross-Validation Bounds 🛡️

In Stage 2 of PerBillion's model tournament, candidate models undergo Out-of-Sample evaluation:

$$\\text{Combined Score} = \\text{RMSE}_{\\text{OOS}} \\times \\left(1 + \\alpha \\cdot |k_{\\text{params}}|\\right)$$

Models that achieve slightly lower training error by adding 10 extra parameters are penalized by parameter cost $\\alpha \\cdot |k|$, ensuring the simplest, most generalizable model wins!`,

  "expert-6": `

---

## Mathematical Residual Diagnostics: Ljung-Box Test 🧪

After fitting a model, we verify that residuals $e_t$ behave like pure White Noise using the **Ljung-Box Test**:

$$Q = n(n+2) \\sum_{k=1}^h \\frac{\\hat{\\rho}_k^2}{n-k}$$

If $p$-value $> 0.05$, we accept the null hypothesis that residuals are independent—confirming the model has extracted all available predictive structure from the time series!`,

  "expert-7": `

---

## Non-Gaussian Fat Tails & Student-t Distributions 🎲

Real financial asset returns exhibit **Fat Tails (Leptokurtosis)**—meaning extreme moves occur far more frequently than predicted by a standard Gaussian normal distribution.

PerBillion's advanced ML models adjust confidence interval bands using **Student's t-distributions** or **Extreme Value Theory (EVT)**, widening 99% probability boundaries during high-volatility market regimes to account for fat-tail crash risk!`,

  "expert-8": `

---

## High-Frequency Microstructure: Level 2 Order Book Imbalance 📖

High-frequency algorithmic execution engines measure real-time **Order Book Imbalance (OBI)**:

$$OBI_t = \\frac{Q_{\\text{bid}, t} - Q_{\\text{ask}, t}}{Q_{\\text{bid}, t} + Q_{\\text{ask}, t}}$$

When $OBI_t > +0.60$, buying pressure resting on the Bid side heavily outweighs selling pressure on the Ask side, allowing execution algorithms to route aggressive child orders with minimal adverse price selection!`,

  "expert-9": `

---

## Fractional Kelly Sizing & Drawdown Reduction 🧮

While Full Kelly ($f^*$) maximizes long-term logarithmic growth rate $E[\\ln(W)]$, it exposes portfolios to severe $50\\%+$ drawdowns.

Institutional quantitative funds implement **Half-Kelly ($0.5 f^*$)**:

$$f_{\\text{Half}} = 0.5 \\times \\frac{p \\cdot b - q}{b}$$

Half-Kelly delivers **75% of Full Kelly's growth rate** while reducing portfolio variance and drawdown risk by **50%**—achieving an optimal balance between growth acceleration and capital preservation!`
};

// Apply expansions to seed files
seedFiles.forEach((filePath) => {
  let fileContent = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  Object.keys(expansions2).forEach((lessonId) => {
    if (fileContent.includes(`lessonId: "${lessonId}"`)) {
      const lessonRegex = new RegExp(`(lessonId:\\s*"${lessonId}"[\\s\\S]*?content:\\s*\`[\\s\\S]*?)([\`"],?\\s*quiz:)`, 'g');
      fileContent = fileContent.replace(lessonRegex, (match, p1, p2) => {
        if (!p1.includes("The Rule of 72 & The Impact") && !p1.includes("Real-World Asset Allocation Profiles") && !p1.includes("Dupont Analysis") && !p1.includes("Deep Dive: Feature Engineering")) {
          modified = true;
          return p1 + expansions2[lessonId] + p2;
        }
        return match;
      });
    }
  });

  if (modified) {
    fs.writeFileSync(filePath, fileContent, 'utf8');
    console.log(`✨ Successfully applied 2nd expansion wave in ${path.basename(filePath)}`);
  }
});
