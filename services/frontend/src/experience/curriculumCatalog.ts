export type VisualKind = 'growth' | 'allocation' | 'risk' | 'market' | 'model' | 'position'
export type TrackId = 'foundations' | 'portfolio' | 'trading' | 'quant'

export interface CatalogLesson {
  id: string
  title: string
  track: TrackId
  duration: number
  description: string
  visual: VisualKind
  preview: boolean
  prerequisites: string[]
}

export interface LessonDetail extends CatalogLesson {
  objective: string
  takeaway: string
  sections: Array<{ title: string; text: string }>
  exercisePrompt: string
  questions: Array<{ id: string; prompt: string; options: string[] }>
}

export const tracks = [
  { id: 'foundations', title: 'The foundations', subtitle: 'Make money make sense.', level: '01', label: 'Beginner' },
  { id: 'portfolio', title: 'Build your portfolio', subtitle: 'Turn knowledge into a plan.', level: '02', label: 'Intermediate' },
  { id: 'trading', title: 'Understand the market', subtitle: 'Learn the mechanics. Manage the risk.', level: '03', label: 'Advanced' },
  { id: 'quant', title: 'Think like a quant', subtitle: 'Use data. Question the model.', level: '04', label: 'Quant & AI' },
] as const

const previewIds = new Set(['money-to-investing', 'compound-interest', 'diversification'])
const rows: Array<[string, string, TrackId, string, VisualKind]> = [
  ['money-to-investing', 'Your money, with a future', 'foundations', 'Separate saving, investing, and trading by goal and time horizon.', 'growth'],
  ['compound-interest', 'The quiet power of compounding', 'foundations', 'Model how time, contributions, and returns change long-term growth.', 'growth'],
  ['inflation-and-value', 'Price is not purchasing power', 'foundations', 'Distinguish nominal balances from inflation-adjusted purchasing power.', 'growth'],
  ['stocks-bonds-funds', 'Meet the building blocks', 'foundations', 'Compare ownership, lending, and pooled investment structures.', 'allocation'],
  ['risk-and-return', 'The price of possibility', 'foundations', 'Recognize volatility, loss, liquidity, and capacity for risk.', 'risk'],
  ['first-investment-plan', 'Build your first investing plan', 'foundations', 'Turn a goal, horizon, and constraints into an explicit plan.', 'allocation'],
  ['diversification', 'One portfolio. Many possibilities.', 'portfolio', 'Identify concentration and shared risk drivers across holdings.', 'allocation'],
  ['asset-allocation', 'Design the mix', 'portfolio', 'Connect portfolio weights with goals, horizon, and risk capacity.', 'allocation'],
  ['fees-and-friction', 'Keep more of the return', 'portfolio', 'Calculate how recurring costs and trading friction compound over time.', 'growth'],
  ['rebalancing', 'Bring the plan back into balance', 'portfolio', 'Compare portfolio drift with target weights and tradeoffs.', 'allocation'],
  ['drawdown-and-recovery', 'Understand the way back', 'portfolio', 'Measure peak-to-trough loss and the asymmetric gain needed to recover.', 'risk'],
  ['behavior-and-discipline', 'Your behavior is part of the portfolio', 'portfolio', 'Separate decision quality from outcome and recognize common biases.', 'risk'],
  ['reading-price', 'Read the language of price', 'trading', 'Interpret price charts without treating patterns as promises.', 'market'],
  ['orders-and-execution', 'From an idea to an order', 'trading', 'Compare market, limit, and stop orders and their execution tradeoffs.', 'market'],
  ['position-sizing', 'Decide the loss before the trade', 'trading', 'Translate a loss budget and exit level into a bounded position size.', 'position'],
  ['expectancy', 'A process across many trades', 'trading', 'Combine win rate and average outcomes to estimate expectancy.', 'growth'],
  ['leverage-and-derivatives', 'When exposure grows faster', 'trading', 'Explain how leverage and derivatives magnify exposure and failure modes.', 'risk'],
  ['trading-journal', 'Make the process visible', 'trading', 'Record a thesis, invalidation point, and review before knowing the outcome.', 'market'],
  ['quant-hypothesis', 'Start with a question', 'quant', 'Turn an investing idea into a falsifiable, bounded research question.', 'model'],
  ['clean-data', 'The result begins with the data', 'quant', 'Inspect source, cutoff, frequency, missing values, and transformations.', 'model'],
  ['backtesting', 'Test the process, not the story', 'quant', 'Design a historical test that respects timing, costs, and unseen data.', 'model'],
  ['overfitting-and-validation', 'What survives outside the sample', 'quant', 'Separate training from evaluation and recognize leakage and overfitting.', 'model'],
  ['ai-and-forecasting', 'Use the model. Question the model.', 'quant', 'Interpret forecasts, intervals, selection, and uncertainty responsibly.', 'model'],
  ['risk-adjusted-performance', 'Return is only half the result', 'quant', 'Evaluate return beside drawdown, volatility, and exposure.', 'model'],
]

export const lessons: CatalogLesson[] = rows.map(([id, title, track, description, visual], index) => ({
  id,
  title,
  track,
  duration: 8,
  description,
  visual,
  preview: previewIds.has(id),
  prerequisites: index % 6 === 0 ? [] : [rows[index - 1][0]],
}))

export const previews = previewIds
