export type VisualKind = 'growth' | 'allocation' | 'risk' | 'market' | 'model' | 'position'
export interface Question {
  question: string
  options: string[]
  answer: number
  explanation: string
}
export interface Lesson {
  id: string
  title: string
  track: string
  duration: number
  description: string
  visual: VisualKind
  takeaway: string
  sections: { title: string; text: string }[]
  quiz: Question[]
}

export const tracks = [
  { id: 'foundations', title: 'The foundations', subtitle: 'Make money make sense.', level: '01', label: 'Beginner' },
  { id: 'portfolio', title: 'Build your portfolio', subtitle: 'Turn knowledge into a plan.', level: '02', label: 'Intermediate' },
  { id: 'trading', title: 'Understand the market', subtitle: 'Learn the mechanics. Manage the risk.', level: '03', label: 'Advanced' },
  { id: 'quant', title: 'Think like a quant', subtitle: 'Use data. Question the model.', level: '04', label: 'Quant & AI' },
]

const q = (question: string, options: string[], answer: number, explanation: string): Question => ({ question, options, answer, explanation })

export const lessons: Lesson[] = [
  {
    id: 'money-to-investing', title: 'Your money, with a future', track: 'foundations', duration: 5, visual: 'growth',
    description: 'What investing is, why it exists, and where to begin.',
    takeaway: 'Investing means accepting uncertainty today in pursuit of a future return.',
    sections: [
      { title: 'Start with ownership', text: 'When you buy a stock, you own a small share of a business. A bond is a loan to a company or government. Investing puts money into assets with the expectation of income, growth, or both. The outcome is never guaranteed.' },
      { title: 'Give each dollar a job', text: 'Money for near-term essentials needs stability and easy access. Money you can leave invested for years can take a different path. Before investing, consider an emergency reserve and the cost of expensive debt.' },
      { title: 'Think in years', text: 'Investing usually starts with a goal and a time horizon. Trading focuses on shorter-term changes in price. Neither approach removes risk. A good first step is understanding the asset before putting money into it.' },
    ],
    quiz: [q('What does owning a stock mean?', ['You own part of a business', 'The company guarantees a return', 'You have made a bank deposit'], 0, 'A share represents ownership. Its value can rise or fall, and dividends are not guaranteed.'), q('Which money usually needs the most stability?', ['Money for retirement in 30 years', 'Money for rent next month', 'Money you can leave untouched for decades'], 1, 'Short-term essential expenses should not depend on unpredictable market prices.')],
  },
  {
    id: 'compound-interest', title: 'The quiet power of compounding', track: 'foundations', duration: 6, visual: 'growth',
    description: 'See how time changes the shape of growth.',
    takeaway: 'Compounding earns returns on prior returns. Time magnifies both growth and losses.',
    sections: [
      { title: 'Growth can build on itself', text: 'Suppose $1,000 earns 5% in a year. It becomes $1,050. If the full amount then earns 5%, the second year adds $52.50. Reinvesting income gives future returns a larger starting point.' },
      { title: 'Time is an input', text: 'With a constant annual rate r over n years, a single investment grows to principal × (1 + r)ⁿ. Real returns vary from year to year; a smooth chart is a mathematical illustration, not a market forecast.' },
      { title: 'The rate is not a promise', text: 'Fees, taxes, inflation, and losses change the result. A 20% loss followed by a 20% gain leaves an investment below where it began. Explore different rates and horizons to understand the sensitivity.' },
    ],
    quiz: [q('What makes returns compound?', ['Withdrawing every gain', 'Reinvesting gains so they can earn returns', 'Checking the price more often'], 1, 'Reinvested returns become part of the amount that can earn future returns.'), q('An investment falls 20%, then gains 20%. Where does it end?', ['At its starting value', 'Above its starting value', 'Below its starting value'], 2, '$100 falls to $80, then rises to $96. Percentage changes apply to different starting amounts.')],
  },
  {
    id: 'inflation-and-value', title: 'Price is not purchasing power', track: 'foundations', duration: 5, visual: 'growth',
    description: 'Separate the number in your account from what it buys.',
    takeaway: 'Real return measures the change in purchasing power after inflation.',
    sections: [
      { title: 'Money has a moving yardstick', text: 'Inflation is a broad increase in prices over time. If an investment earns 4% while prices rise 3%, its purchasing power has grown much less than its account balance suggests.' },
      { title: 'Nominal versus real', text: 'An exact one-period real return is (1 + nominal return) ÷ (1 + inflation) − 1. Subtracting inflation from the nominal return is a useful approximation for small rates.' },
      { title: 'Keep the whole picture', text: 'Taxes and fees further affect what you keep. Compare investments using consistent periods and assumptions, and distinguish an investment return from additional money you contributed.' },
    ],
    quiz: [q('What does a real return account for?', ['Only the investment price', 'Inflation', 'How often you trade'], 1, 'Real return adjusts for changes in purchasing power.'), q('A 4% nominal return with 3% inflation means purchasing power rises by roughly…', ['7%', '4%', '1%'], 2, 'The exact answer is 1.04 ÷ 1.03 − 1, approximately 0.97%.')],
  },
  {
    id: 'stocks-bonds-funds', title: 'Meet the building blocks', track: 'foundations', duration: 7, visual: 'allocation',
    description: 'Stocks, bonds, funds, and the roles they play.',
    takeaway: 'A fund is a container. Understand the assets inside it.',
    sections: [
      { title: 'Ownership and lending', text: 'Stocks give you ownership in a business. Bonds generally pay interest and promise repayment, subject to the issuer’s ability to pay. Both can lose market value. Bond prices are also sensitive to interest rates.' },
      { title: 'Many holdings, one purchase', text: 'A mutual fund or exchange-traded fund holds a collection of assets. An index fund follows a defined index. A fund can be broad and diversified, or highly concentrated in one industry or strategy.' },
      { title: 'Read beneath the label', text: 'Look at holdings, concentration, costs, and how the fund operates. An ETF is a trading structure, not a risk rating. Cash and cash equivalents may help meet short-term needs but still face inflation risk.' },
    ],
    quiz: [q('An ETF is always low-risk. Is that accurate?', ['Yes, because all ETFs hold the same assets', 'No, risk depends on its holdings and structure', 'Yes, because it trades on an exchange'], 1, 'The ETF structure does not make the assets inside it safe.'), q('A stock represents…', ['A share of ownership', 'A guaranteed loan repayment', 'An insured deposit'], 0, 'Stocks represent ownership and have uncertain returns.')],
  },
  {
    id: 'risk-and-return', title: 'The price of possibility', track: 'foundations', duration: 6, visual: 'risk',
    description: 'Understand volatility, loss, and uncertainty.',
    takeaway: 'Higher expected return generally comes with more uncertainty, not a guarantee of reward.',
    sections: [
      { title: 'Risk has several forms', text: 'A price can move sharply, a business can fail, inflation can reduce purchasing power, or an asset can become hard to sell. Volatility describes the size of return fluctuations; it is only one measure of risk.' },
      { title: 'Expected is not earned', text: 'Expected return is an estimate across possible outcomes. An investment may offer a higher expected return precisely because unfavorable outcomes are possible. Taking more risk does not ensure a higher realized return.' },
      { title: 'Capacity before confidence', text: 'Your willingness to tolerate losses and your financial ability to absorb them can differ. Time horizon, income stability, obligations, and emergency savings all affect your capacity to take risk.' },
    ],
    quiz: [q('Does taking more risk guarantee a higher return?', ['Yes, over any period', 'No', 'Only if you invest all your savings'], 1, 'Risk means outcomes are uncertain, including the possibility of losing money.'), q('Which is a risk beyond volatility?', ['An asset being difficult to sell', 'A larger chart font', 'A longer company name'], 0, 'Liquidity risk is the possibility of being unable to sell quickly at a reasonable price.')],
  },
  {
    id: 'first-investment-plan', title: 'Build your first investing plan', track: 'foundations', duration: 5, visual: 'allocation',
    description: 'Connect your goal, horizon, and ability to take risk.',
    takeaway: 'A repeatable plan starts with your situation, not a trending ticker.',
    sections: [
      { title: 'Name the goal', text: 'Write down what the money is for, when you may need it, and how much you can contribute without compromising essentials. Separate short-term spending needs from long-term investment goals.' },
      { title: 'Make the plan concrete', text: 'Choose an asset mix you understand, check its costs, and set a review schedule. Automatic contributions can make the process more consistent, but do not protect against investment losses.' },
      { title: 'Set a rule for changes', text: 'Review your plan when your circumstances change and at planned intervals. A written policy makes it easier to distinguish a necessary adjustment from a reaction to a frightening headline.' },
    ],
    quiz: [q('What should guide an investment plan first?', ['Your goals and circumstances', 'Yesterday’s best performer', 'A confident social media prediction'], 0, 'Your horizon, needs, and financial capacity should guide the plan.'), q('Automatic contributions eliminate market risk.', ['True', 'False'], 1, 'They can support consistent behavior, but investments can still lose value.')],
  },
  {
    id: 'diversification', title: 'One portfolio. Many possibilities.', track: 'portfolio', duration: 7, visual: 'allocation',
    description: 'Why spreading exposure can change the ride.',
    takeaway: 'Diversification reduces concentration risk; it cannot eliminate market-wide losses.',
    sections: [
      { title: 'Count exposures, not tickers', text: 'Owning several companies in the same industry may still leave you exposed to the same economic forces. Diversification considers industries, regions, asset classes, and the drivers behind their returns.' },
      { title: 'Correlation matters', text: 'Correlation describes how returns move together. Combining assets with imperfect correlation can reduce portfolio volatility. Correlations change, and assets that usually move differently may fall together during stress.' },
      { title: 'Read the overlaps', text: 'Two funds can hold many of the same companies. Review underlying holdings before assuming you have diversified. The slider illustrates an asset mix; it does not identify an optimal portfolio for you.' },
    ],
    quiz: [q('Does owning five technology stocks ensure broad diversification?', ['Yes', 'No, they can share major risk drivers'], 1, 'Ticker count alone misses common exposures such as sector concentration.'), q('Diversification can…', ['Prevent every loss', 'Reduce concentration risk', 'Guarantee positive yearly returns'], 1, 'It spreads exposure, while broad market and other risks remain.')],
  },
  {
    id: 'asset-allocation', title: 'Design the mix', track: 'portfolio', duration: 6, visual: 'allocation',
    description: 'Match an asset allocation to the job it must do.',
    takeaway: 'Allocation is the share of your portfolio assigned to each asset class.',
    sections: [
      { title: 'Start at the portfolio level', text: 'Asset allocation divides money among categories such as stocks, bonds, and cash. It shapes how the portfolio responds to changing conditions and should reflect the goal, horizon, and capacity for loss.' },
      { title: 'Tradeoffs have no universal answer', text: 'Stocks offer ownership exposure with substantial uncertainty. Bonds may add income and different risk drivers. Cash provides access and relative stability, while inflation can erode its purchasing power.' },
      { title: 'Avoid false precision', text: 'No allocation is best for every person or every future. Explore several mixes and ask which losses you could withstand while keeping the money available when you need it.' },
    ],
    quiz: [q('What is asset allocation?', ['How often you log in', 'How a portfolio is divided among asset classes', 'A prediction of tomorrow’s stock price'], 1, 'Allocation describes the proportion assigned to each asset class.'), q('The same allocation is best for everyone.', ['True', 'False'], 1, 'Goals, horizons, financial capacity, and preferences vary.')],
  },
  {
    id: 'fees-and-friction', title: 'Keep more of the return', track: 'portfolio', duration: 5, visual: 'growth',
    description: 'See how small recurring costs become meaningful.',
    takeaway: 'Costs are one of the few investment inputs you can examine before committing.',
    sections: [
      { title: 'Small percentages compound', text: 'A recurring annual fee lowers the amount left invested. Over many years, the effect includes both the fees paid and the returns those amounts could have earned. Always compare costs using the same assumptions.' },
      { title: 'Free trades still have costs', text: 'Even without a commission, trading can involve bid–ask spreads, execution differences, taxes, and fund expenses. An expense ratio is an annual fund operating cost, not its entire cost of ownership.' },
      { title: 'Read the documents', text: 'Review fund disclosures and broker fee schedules. Costs matter, but they do not tell you everything about suitability, risk, liquidity, or the quality of execution.' },
    ],
    quiz: [q('Why can an annual fee have a growing impact?', ['Fees are always refunded', 'Money paid in fees cannot compound in the investment', 'Fees raise the investment return'], 1, 'The effect includes the fee and the potential growth lost on that money.'), q('Commission-free trading means there are no costs.', ['True', 'False'], 1, 'Spreads, taxes, fund expenses, and execution differences can still apply.')],
  },
  {
    id: 'rebalancing', title: 'Bring the plan back into balance', track: 'portfolio', duration: 6, visual: 'allocation',
    description: 'Learn when a portfolio drifts and how to respond.',
    takeaway: 'Rebalancing restores a chosen risk mix; it does not predict the next winner.',
    sections: [
      { title: 'Winners change your weights', text: 'If one part of a portfolio rises faster than the rest, its weight increases. A target stock allocation of 60% can drift much higher, changing the portfolio’s risk even without a new purchase.' },
      { title: 'Use a rule', text: 'A calendar schedule or a threshold for allocation drift can prompt a review. Rebalancing may involve selling assets, buying underweight ones, or directing new contributions to underweight categories.' },
      { title: 'Count the consequences', text: 'Trading may incur spreads, fees, and taxes. Account type and personal circumstances matter. Rebalancing is a risk-management process, and it may reduce returns when the assets sold continue rising.' },
    ],
    quiz: [q('What is the purpose of rebalancing?', ['Restore a target mix', 'Guarantee the highest return', 'Buy whatever rose most recently'], 0, 'It brings exposures back toward the risk allocation you chose.'), q('Can new contributions help rebalance?', ['Yes, by adding to underweight assets', 'No, only selling can rebalance'], 0, 'Directing new money to underweight assets can reduce drift without selling.')],
  },
  {
    id: 'drawdown-and-recovery', title: 'Understand the way back', track: 'portfolio', duration: 6, visual: 'risk',
    description: 'Why a loss and its recovery are not symmetrical.',
    takeaway: 'A 50% loss requires a 100% gain to recover.',
    sections: [
      { title: 'Measure from the peak', text: 'Drawdown measures the decline from a previous portfolio peak. Maximum drawdown is the largest peak-to-trough fall observed in a period. It describes the historical path, not the worst possible future.' },
      { title: 'The denominator changes', text: 'A $100 investment that falls to $50 has lost 50%. Returning to $100 requires a $50 gain on the remaining $50: 100%. The required recovery is loss ÷ (1 − loss).' },
      { title: 'Plan before the drop', text: 'Consider how a large decline would affect your goals and behavior. Diversification, appropriate allocation, and liquidity planning can help manage risk, but no mechanism guarantees a loss limit in every market.' },
    ],
    quiz: [q('After a 25% loss, roughly what gain restores the starting value?', ['25%', '33.3%', '50%'], 1, '0.25 ÷ 0.75 = 33.3%. The gain is measured from the reduced balance.'), q('Historical maximum drawdown tells you…', ['The worst future loss', 'The largest observed peak-to-trough decline in that period', 'The guaranteed time to recovery'], 1, 'It summarizes one historical sample and does not bound future losses.')],
  },
  {
    id: 'behavior-and-discipline', title: 'Your behavior is part of the portfolio', track: 'portfolio', duration: 5, visual: 'risk',
    description: 'Recognize the decisions that emotion can distort.',
    takeaway: 'A process is easier to follow when you write it before emotions run high.',
    sections: [
      { title: 'Notice the common traps', text: 'Recency bias gives recent events too much weight. Confirmation bias favors evidence that supports what we already believe. Loss aversion can make losses feel more intense than equal gains.' },
      { title: 'Create a decision buffer', text: 'Write down why you are investing, what would invalidate the idea, and what evidence you need before changing course. Review the same questions for a holding you like and one you dislike.' },
      { title: 'Judge the decision fairly', text: 'A good outcome can follow a weak process, and a loss can follow a reasonable decision under uncertainty. Evaluate whether the decision used the available evidence and respected your risk limits.' },
    ],
    quiz: [q('Searching only for evidence supporting your position is…', ['Confirmation bias', 'Diversification', 'Rebalancing'], 0, 'Confirmation bias filters evidence to support an existing belief.'), q('A profitable trade proves the process was sound.', ['True', 'False'], 1, 'Randomness can produce good outcomes from weak decisions. Process and outcome both need review.')],
  },
  {
    id: 'reading-price', title: 'Read the language of price', track: 'trading', duration: 7, visual: 'market',
    description: 'Translate a chart into prices, periods, and uncertainty.',
    takeaway: 'A chart records past transactions. Its patterns do not guarantee the future.',
    sections: [
      { title: 'Know the frame', text: 'A line chart may connect closing prices. A candlestick shows open, high, low, and close for each interval. Change the interval and the same history can appear very different.' },
      { title: 'Read a candle', text: 'The body spans open to close. The wick shows the interval’s high and low. An upward candle closes above its open; a downward candle closes below it. Color conventions vary by platform.' },
      { title: 'Ask what is missing', text: 'Confirm the dates, whether the scale is linear or logarithmic, and whether prices adjust for splits or dividends. A chart alone does not reveal the full economic value of a business or a reliable prediction.' },
    ],
    quiz: [q('What does a candlestick wick show?', ['The high and low for the interval', 'A guaranteed future range', 'Only the closing price'], 0, 'The wick spans the observed high and low for that interval.'), q('A past price pattern guarantees a future outcome.', ['True', 'False'], 1, 'Price history can inform analysis, but patterns do not guarantee future returns.')],
  },
  {
    id: 'orders-and-execution', title: 'From an idea to an order', track: 'trading', duration: 6, visual: 'market',
    description: 'Market orders, limit orders, spreads, and execution.',
    takeaway: 'A market order prioritizes execution. A limit order specifies a price constraint.',
    sections: [
      { title: 'Two sides of a quote', text: 'The bid is the quoted price a buyer is willing to pay. The ask is the quoted price a seller wants. Their difference is the spread. Available size matters, so a large order may execute at several prices.' },
      { title: 'Choose the tradeoff', text: 'A market order seeks prompt execution but does not guarantee a price. A buy limit sets the maximum price you will pay; a sell limit sets the minimum you will accept. A limit order may never execute.' },
      { title: 'Stops are not guarantees', text: 'A stop order generally becomes a market order when triggered. A gap can produce an execution far beyond the stop price. A stop-limit adds a price constraint but may leave the position unfilled.' },
    ],
    quiz: [q('What does a buy limit order specify?', ['The maximum purchase price', 'A guaranteed fill time', 'A guaranteed profit'], 0, 'A buy limit restricts the purchase price but does not guarantee execution.'), q('Can a stop order execute beyond its stop price?', ['Yes, especially in gaps or fast markets', 'No, the stop price is guaranteed'], 0, 'Once triggered, a stop market order can execute at a different available price.')],
  },
  {
    id: 'position-sizing', title: 'Size the risk before the trade', track: 'trading', duration: 7, visual: 'position',
    description: 'Connect a loss budget to the size of a position.',
    takeaway: 'Position size begins with the amount you can afford to risk, not the return you hope to earn.',
    sections: [
      { title: 'Put a number on the plan', text: 'A simple sizing model divides a planned dollar loss budget by the distance between entry and exit prices. With a $100 budget and $5 per-share planned risk, the model gives 20 shares.' },
      { title: 'The plan has assumptions', text: 'This arithmetic assumes execution at the planned exit and excludes costs. Gaps, slippage, liquidity, and changing conditions can make actual losses larger. A stop is not a loss guarantee.' },
      { title: 'Look across the account', text: 'Several positions may share the same risk drivers. Position-level limits do not automatically limit portfolio loss. Also consider total exposure, leverage, and correlated positions.' },
    ],
    quiz: [q('With a $100 loss budget and $5 planned risk per share, the formula gives…', ['5 shares', '20 shares', '100 shares'], 1, '$100 ÷ $5 = 20 shares before accounting for execution risk and costs.'), q('A planned stop guarantees that losses stay within the budget.', ['True', 'False'], 1, 'Gaps and execution differences can create larger losses.')],
  },
  {
    id: 'expectancy', title: 'Winning often is not the whole story', track: 'trading', duration: 7, visual: 'position',
    description: 'Combine win rate, average gains, losses, and costs.',
    takeaway: 'Expectancy depends on the size and probability of gains and losses, after costs.',
    sections: [
      { title: 'Calculate the average', text: 'A basic expectancy estimate is win probability × average win − loss probability × average loss − average trading costs. Use gains and losses measured consistently per trade or per unit of risk.' },
      { title: 'A high win rate can lose money', text: 'A strategy that wins $1 on 90% of trades and loses $15 on 10% has an expected result of $0.90 − $1.50 = −$0.60 per trade before costs. Rare losses matter.' },
      { title: 'Estimates need context', text: 'Historical win rates and average payoffs are noisy and can change. Look at the number of trades, extreme outcomes, dependence between trades, and how the strategy behaves in different conditions.' },
    ],
    quiz: [q('A 90% win rate guarantees profitability.', ['True', 'False'], 1, 'Large losses on a small share of trades can outweigh frequent small gains.'), q('What belongs in an expectancy calculation?', ['Only winning trades', 'Win/loss probabilities, payoff sizes, and costs', 'Only the best month'], 1, 'Expected results depend on both outcome sizes and probabilities, after costs.')],
  },
  {
    id: 'leverage-and-derivatives', title: 'When exposure exceeds your capital', track: 'trading', duration: 8, visual: 'risk',
    description: 'Understand leverage, margin, and derivative payoffs.',
    takeaway: 'Leverage magnifies exposure and can make losses exceed the cash initially committed.',
    sections: [
      { title: 'Exposure is not account value', text: 'Leverage lets a position’s market exposure exceed the investor’s equity. A 5% move on twice your equity creates roughly a 10% equity change before costs, assuming exposure remains constant.' },
      { title: 'Know the contract', text: 'Options and futures derive value from an underlying asset. Their payoffs, expiration rules, and margin requirements differ. A purchased option can lose its full premium; some short option positions have potentially unlimited losses.' },
      { title: 'Forced exits are real', text: 'Margin requirements can change. A broker may require more collateral or liquidate positions during unfavorable conditions. Learn the full contract and risk mechanics in a simulation before considering complex instruments.' },
    ],
    quiz: [q('What does leverage do?', ['Eliminates losses', 'Magnifies exposure relative to equity', 'Guarantees better diversification'], 1, 'It amplifies the effect of price changes on your equity.'), q('Can a purchased option lose its entire premium?', ['Yes', 'No'], 0, 'An option can expire without value, losing the full premium paid.')],
  },
  {
    id: 'trading-journal', title: 'Build a feedback loop', track: 'trading', duration: 5, visual: 'model',
    description: 'Turn a trading journal into an honest research tool.',
    takeaway: 'A useful journal records the plan before the outcome is known.',
    sections: [
      { title: 'Capture the decision', text: 'Before a simulated trade, record the hypothesis, entry rule, planned exit, size, costs, and what would invalidate the idea. Save timestamps so the original reasoning is not rewritten after the result.' },
      { title: 'Review comparable groups', text: 'Group trades using rules defined in advance. Examine returns after costs, drawdowns, exposure, and missed or failed executions. Keep losses and inactive periods in the record.' },
      { title: 'Change deliberately', text: 'If you change a rule after every loss, you may fit noise. Define a review window, document each change, and test revised rules on data that did not influence the change.' },
    ],
    quiz: [q('When should you record the original trade hypothesis?', ['Before seeing the result', 'Only after a profitable trade', 'After rewriting it to match the outcome'], 0, 'Recording it in advance reduces hindsight bias.'), q('Why keep losing trades in a journal?', ['To make the chart look worse', 'To measure the full process without selection bias', 'They do not matter'], 1, 'Excluding losses distorts the evidence and makes the strategy look stronger than it was.')],
  },
  {
    id: 'quant-hypothesis', title: 'Turn an idea into a testable rule', track: 'quant', duration: 7, visual: 'model',
    description: 'Translate market intuition into explicit research.',
    takeaway: 'A quantitative strategy starts with a falsifiable hypothesis and reproducible rules.',
    sections: [
      { title: 'Make the idea precise', text: '“Buy strong companies” is ambiguous. A research rule needs a defined universe, observable inputs, rebalance timing, position sizing, and exit conditions. Every input must have been available at the decision time.' },
      { title: 'Choose a benchmark', text: 'Compare the strategy with a relevant baseline using consistent dates, costs, and exposure. Ask whether the apparent advantage comes from market exposure, concentration, leverage, or a distinct source of return.' },
      { title: 'Write the failure condition', text: 'Define what evidence would make you reject the hypothesis. A result that cannot change your mind is not a useful test. Track all experiments so failed ideas remain part of the research record.' },
    ],
    quiz: [q('Which rule is more reproducible?', ['Buy when the chart looks exciting', 'Rebalance monthly using precisely defined observable inputs', 'Trade when you feel confident'], 1, 'Explicit timing and inputs let another researcher repeat the test.'), q('Why define a benchmark?', ['To guarantee outperformance', 'To compare results with a relevant baseline', 'To remove the need for costs'], 1, 'A consistent baseline helps distinguish strategy effects from general market exposure.')],
  },
  {
    id: 'clean-data', title: 'Your model is only as honest as its data', track: 'quant', duration: 8, visual: 'market',
    description: 'Spot look-ahead bias, survivorship bias, and data leakage.',
    takeaway: 'Use only information that genuinely existed when each decision would have been made.',
    sections: [
      { title: 'Respect the timeline', text: 'A company’s financial result may describe a prior quarter but become public later. Using it before publication creates look-ahead bias. Record publication timestamps and make inputs point-in-time.' },
      { title: 'Include the missing companies', text: 'Testing today’s surviving stocks over the past excludes firms that disappeared or failed. This survivorship bias can inflate performance. A historical universe should reflect membership at each historical date.' },
      { title: 'Fit transforms on training data', text: 'Scaling, imputing missing values, feature selection, and model tuning can all leak future information. Fit them within each training window, then apply the fitted transform to later validation or test data.' },
    ],
    quiz: [q('Using a report before its publication date creates…', ['Look-ahead bias', 'Diversification', 'A lower spread'], 0, 'The test uses information unavailable at the original decision time.'), q('Should a scaler learn its parameters from the full dataset before splitting?', ['Yes', 'No, fit it on training data only'], 1, 'Full-sample preprocessing can leak information from the future evaluation period.')],
  },
  {
    id: 'backtesting', title: 'A backtest is a question, not a promise', track: 'quant', duration: 8, visual: 'model',
    description: 'Model execution, costs, and the limits of history.',
    takeaway: 'A realistic backtest includes friction, unavailable fills, and every rule that affects results.',
    sections: [
      { title: 'Simulate what could happen', text: 'A backtest applies rules to historical data. It must respect when the signal becomes known and when an order could be executed. Buying at a closing price using that same close as an unknown input can be unrealistic.' },
      { title: 'Charge the strategy', text: 'Include fees, bid–ask spread, slippage, borrow costs where applicable, and plausible liquidity constraints. Results can be sensitive to these assumptions, especially for high-turnover strategies.' },
      { title: 'Inspect the path', text: 'Review drawdown, exposure, turnover, capacity, and performance across periods. A strong historical average can conceal long losses, one lucky event, or a strategy that cannot execute at meaningful size.' },
    ],
    quiz: [q('Should a backtest include trading costs?', ['Yes, with realistic assumptions', 'No, costs do not compound'], 0, 'Ignoring friction can turn an unprofitable strategy into an apparently profitable one.'), q('A high historical return guarantees future success.', ['True', 'False'], 1, 'Historical performance is conditional on the sample, model, and assumptions.')],
  },
  {
    id: 'overfitting-and-validation', title: 'Learn the past. Test the future.', track: 'quant', duration: 9, visual: 'model',
    description: 'Separate learning, tuning, and honest evaluation.',
    takeaway: 'A final test loses independence once you use its results to tune the strategy.',
    sections: [
      { title: 'Noise can look like a signal', text: 'If you try enough settings, some will fit historical noise. Overfitting happens when that fit fails to generalize. Track the number of experiments and prefer a rationale beyond the best-looking chart.' },
      { title: 'Keep time in order', text: 'A common approach trains on earlier data and evaluates on later data. Validation helps choose settings; an untouched test estimates performance after those choices. Random splits can be inappropriate for time-dependent observations.' },
      { title: 'Walk forward', text: 'Walk-forward evaluation repeats training using only past observations and tests on the next period. Keep overlapping labels and related observations from leaking across boundaries. Evaluation still cannot guarantee future performance.' },
    ],
    quiz: [q('What happens if you keep tuning to the final test result?', ['It remains independent', 'It becomes part of the development process', 'It guarantees generalization'], 1, 'Repeatedly using test feedback makes the test another tuning set.'), q('What does walk-forward evaluation preserve?', ['Time order between training and evaluation', 'A guaranteed future profit', 'Access to future labels'], 0, 'Models are fit using earlier observations, then evaluated on later ones.')],
  },
  {
    id: 'ai-and-forecasting', title: 'Work with AI. Keep your judgment.', track: 'quant', duration: 8, visual: 'model',
    description: 'Use models for research without mistaking confidence for truth.',
    takeaway: 'A forecast is a conditional estimate. A fluent explanation is not evidence of predictive skill.',
    sections: [
      { title: 'Give AI a bounded job', text: 'AI can help explain concepts, draft code, summarize a supplied document, or generate hypotheses. Verify source material, inspect generated code, and test every calculation. A model can produce confident but incorrect statements.' },
      { title: 'Read the uncertainty', text: 'Forecast models estimate outcomes conditional on data and assumptions. Prediction intervals express modeled uncertainty; their actual coverage can fail when assumptions break or the environment changes. A narrow interval is not automatically trustworthy.' },
      { title: 'Compare against simple baselines', text: 'Evaluate a forecast on unseen periods against simple alternatives such as the last observed price. Use error metrics suited to the task. Lower forecast error does not necessarily translate into a profitable strategy after costs.' },
    ],
    quiz: [q('What is a sensible AI research workflow?', ['Trust a confident explanation immediately', 'Verify sources, inspect code, and test outputs', 'Trade any generated prediction'], 1, 'Independent verification and controlled testing are essential.'), q('Lower price forecast error guarantees trading profit.', ['True', 'False'], 1, 'Profit also depends on direction, timing, sizing, execution, and costs.')],
  },
  {
    id: 'risk-adjusted-performance', title: 'Measure what the return cost you', track: 'quant', duration: 9, visual: 'model',
    description: 'Read Sharpe, drawdown, uncertainty, and paper results together.',
    takeaway: 'No single metric captures a strategy’s risk or establishes a durable edge.',
    sections: [
      { title: 'Put return beside risk', text: 'The Sharpe ratio compares average excess return with return volatility using consistent periods. Annualization requires assumptions. Non-normal returns, illiquidity, and serial dependence can make a simple Sharpe estimate misleading.' },
      { title: 'Use a dashboard of evidence', text: 'Consider drawdown, tail losses, turnover, exposure, number of trades, and how stable results are across periods and assumptions. A short sample creates substantial estimation uncertainty even when the headline metric is attractive.' },
      { title: 'Close the research loop', text: 'A paper-trading phase can test execution and operational assumptions without real capital. Define monitoring and stop-review rules before launch. Simulated results still differ from real fills, liquidity, and emotional decisions.' },
    ],
    quiz: [q('What does a basic Sharpe ratio compare?', ['Average excess return with return volatility', 'Stock price with company revenue', 'The largest win with the smallest loss'], 0, 'It expresses excess return per unit of volatility for a consistent measurement period.'), q('Why use paper trading after a backtest?', ['To guarantee live profit', 'To examine execution and operational assumptions', 'To remove the need for risk limits'], 1, 'Paper trading can reveal implementation problems, but it does not replicate every live-market condition.')],
  },
]
