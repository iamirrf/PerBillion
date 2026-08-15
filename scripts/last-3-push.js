const fs = require('fs');
const path = require('path');

const seedFiles = [
  path.join(__dirname, '../database/mongodb/seeds/expert-lessons.js')
];

// Targeted micro-expansions for expert-5, expert-7, expert-8
const last3 = {
  "expert-5": `

---

## Model Selection Audit Checklist for Quants 📋

Before locking in a winning model from the automated tournament:

1. **Verify Parameter Stability**: Check that parameters $(p,d,q)$ do not jump wildly between consecutive daily retraining runs.
2. **Audit Out-of-Sample Residuals**: Ensure out-of-sample prediction residuals carry zero serial correlation.
3. **Compare AICc vs Cross-Validation Rankings**: Confirm that AICc top-ranked models align closely with out-of-sample cross-validation RMSE performance!`,

  "expert-7": `

---

## Non-Gaussian Fat Tails & Extreme Value Risk 🎲

Standard confidence intervals assume underlying asset returns follow a Gaussian normal distribution. In real-world financial markets, asset returns exhibit **Leptokurtosis (Fat Tails)**, meaning extreme price shocks occur far more frequently than Gaussian models predict.

PerBillion's advanced probability engine accounts for fat-tail crash risk by scaling 99% Confidence Bands using **Student's t-distributions** and **Extreme Value Theory (EVT)**—ensuring trade setups remain resilient during market panics!`,

  "expert-8": `

---

## Real-Time Order Flow Imbalance (OBI) Signals ⚡

In high-frequency algorithmic trade routing:

$$\\text{OBI Pulse} = \\frac{\\text{Bid Depth Volume} - \\text{Ask Depth Volume}}{\\text{Total Top-of-Book Depth}}$$

When OBI Pulse exceeds $+0.65$ while VWAP execution is running, child orders are routed as aggressive limit orders on the bid—capturing quick fills without suffering market impact slippage!`
};

seedFiles.forEach((filePath) => {
  let fileContent = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  Object.keys(last3).forEach((lessonId) => {
    if (fileContent.includes(`lessonId: "${lessonId}"`)) {
      const lessonRegex = new RegExp(`(lessonId:\\s*"${lessonId}"[\\s\\S]*?content:\\s*\`[\\s\\S]*?)([\`"],?\\s*quiz:)`, 'g');
      fileContent = fileContent.replace(lessonRegex, (match, p1, p2) => {
        if (!p1.includes("Model Selection Audit Checklist") && !p1.includes("Non-Gaussian Fat Tails & Extreme Value Risk") && !p1.includes("Real-Time Order Flow Imbalance")) {
          modified = true;
          return p1 + last3[lessonId] + p2;
        }
        return match;
      });
    }
  });

  if (modified) {
    fs.writeFileSync(filePath, fileContent, 'utf8');
    console.log(`✨ Successfully applied last 3 micro-expansions in ${path.basename(filePath)}`);
  }
});
