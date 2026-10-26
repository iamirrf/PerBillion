export const CURRICULUM_VERSION = '2026.1';
export const PREVIEW_LESSONS = new Set(['money-to-investing', 'compound-interest', 'diversification']);

type Track = 'foundations' | 'portfolio' | 'trading' | 'quant';

export type CurriculumLesson = {
  id: string;
  title: string;
  track: Track;
  duration: number;
  objective: string;
  description: string;
  takeaway: string;
  prerequisites: string[];
  checkpoint?: boolean;
  visual: 'growth' | 'allocation' | 'risk' | 'market' | 'model' | 'position';
  sections: Array<{ title: string; text: string }>;
  exercisePrompt: string;
};

const rows: Array<[string, string, Track, string, string]> = [
  ['money-to-investing', 'Your money, with a future', 'foundations', 'Separate saving, investing, and trading by goal and time horizon.', 'A sound investing decision starts with the purpose and timing of the money.'],
  ['compound-interest', 'The quiet power of compounding', 'foundations', 'Model how time, contributions, and returns change long-term growth.', 'Compounding builds on prior returns, while fees, inflation, and losses change the result.'],
  ['inflation-and-value', 'Price is not purchasing power', 'foundations', 'Distinguish nominal balances from inflation-adjusted purchasing power.', 'Real return measures what remains after inflation changes the value of money.'],
  ['stocks-bonds-funds', 'Meet the building blocks', 'foundations', 'Compare ownership, lending, and pooled investment structures.', 'A fund is a container; its risks come from the assets and structure inside it.'],
  ['risk-and-return', 'The price of possibility', 'foundations', 'Recognize volatility, loss, liquidity, and capacity for risk.', 'Higher expected return comes with more uncertainty, not a guaranteed reward.'],
  ['first-investment-plan', 'Build your first investing plan', 'foundations', 'Turn a goal, horizon, and constraints into an explicit plan.', 'A plan defines purpose and guardrails before market emotion arrives.'],
  ['diversification', 'One portfolio. Many possibilities.', 'portfolio', 'Identify concentration and shared risk drivers across holdings.', 'Diversification reduces concentration risk without preventing every loss.'],
  ['asset-allocation', 'Design the mix', 'portfolio', 'Connect portfolio weights with goals, horizon, and risk capacity.', 'Allocation expresses which risks a portfolio is prepared to carry.'],
  ['fees-and-friction', 'Keep more of the return', 'portfolio', 'Calculate how recurring costs and trading friction compound over time.', 'A small recurring cost can create a large long-term difference.'],
  ['rebalancing', 'Bring the plan back into balance', 'portfolio', 'Compare portfolio drift with target weights and tradeoffs.', 'Rebalancing restores a chosen risk mix; it does not predict the next winner.'],
  ['drawdown-and-recovery', 'Understand the way back', 'portfolio', 'Measure peak-to-trough loss and the asymmetric gain needed to recover.', 'The deeper the drawdown, the larger the percentage gain required to recover.'],
  ['behavior-and-discipline', 'Your behavior is part of the portfolio', 'portfolio', 'Separate decision quality from outcome and recognize common biases.', 'A repeatable process matters because a good outcome can follow a weak decision.'],
  ['reading-price', 'Read the language of price', 'trading', 'Interpret price charts without treating patterns as promises.', 'A chart summarizes a chosen interval; it does not guarantee what follows.'],
  ['orders-and-execution', 'From an idea to an order', 'trading', 'Compare market, limit, and stop orders and their execution tradeoffs.', 'Price control and certainty of execution are different objectives.'],
  ['position-sizing', 'Decide the loss before the trade', 'trading', 'Translate a loss budget and exit level into a bounded position size.', 'Position size connects an uncertain idea to a risk the portfolio can absorb.'],
  ['expectancy', 'A process across many trades', 'trading', 'Combine win rate and average outcomes to estimate expectancy.', 'A strategy is judged across a distribution of outcomes, not one trade.'],
  ['leverage-and-derivatives', 'When exposure grows faster', 'trading', 'Explain how leverage and derivatives magnify exposure and failure modes.', 'Leverage can accelerate losses and create obligations beyond the initial move.'],
  ['trading-journal', 'Make the process visible', 'trading', 'Record a thesis, invalidation point, and review before knowing the outcome.', 'A journal makes the decision process inspectable and easier to improve.'],
  ['quant-hypothesis', 'Start with a question', 'quant', 'Turn an investing idea into a falsifiable, bounded research question.', 'A useful hypothesis states what evidence could prove it wrong.'],
  ['clean-data', 'The result begins with the data', 'quant', 'Inspect source, cutoff, frequency, missing values, and transformations.', 'Model output cannot repair a poorly defined or contaminated dataset.'],
  ['backtesting', 'Test the process, not the story', 'quant', 'Design a historical test that respects timing, costs, and unseen data.', 'A backtest is evidence under assumptions, not a promise of future performance.'],
  ['overfitting-and-validation', 'What survives outside the sample', 'quant', 'Separate training from evaluation and recognize leakage and overfitting.', 'A model earns trust by surviving data it could not use during fitting.'],
  ['ai-and-forecasting', 'Use the model. Question the model.', 'quant', 'Interpret forecasts, intervals, selection, and uncertainty responsibly.', 'A forecast is a conditional statistical estimate, not a recommendation.'],
  ['risk-adjusted-performance', 'Return is only half the result', 'quant', 'Evaluate return beside drawdown, volatility, and exposure.', 'Performance has meaning only in relation to the risk and assumptions used to obtain it.'],
];

const visuals: Record<Track, CurriculumLesson['visual']> = { foundations: 'growth', portfolio: 'allocation', trading: 'market', quant: 'model' };

export const curriculum: CurriculumLesson[] = rows.map(([id, title, track, objective, takeaway], index) => ({
  id,
  title,
  track,
  duration: 8,
  objective,
  description: objective,
  takeaway,
  prerequisites: index % 6 === 0 ? [] : [rows[index - 1][0]],
  checkpoint: index % 6 === 5,
  visual: id === 'position-sizing' ? 'position' : id === 'drawdown-and-recovery' || id === 'risk-and-return' ? 'risk' : visuals[track],
  sections: [
    { title: 'Define the decision', text: objective },
    { title: 'Keep the boundary visible', text: `${takeaway} Apply the idea to a defined example, state the time horizon, and separate evidence from the outcome you hope to see.` },
    { title: 'Review what changed', text: 'Record the assumptions, compare like with like, and identify what new evidence would change the decision. A precise calculation can still depend on uncertain inputs.' },
  ],
  exercisePrompt: `Use a concrete example to show how “${title.toLowerCase()}” changes a decision. State the assumptions, the evidence, and one uncertainty the example cannot remove.`,
}));

export function publicCatalog() {
  return curriculum.map(lesson => ({
    id: lesson.id,
    title: lesson.title,
    description: lesson.description,
    track: lesson.track,
    duration: lesson.duration,
    visual: lesson.visual,
    prerequisites: lesson.prerequisites,
    checkpoint: Boolean(lesson.checkpoint),
    preview: PREVIEW_LESSONS.has(lesson.id),
    questionCount: 5,
  }));
}

export function assessmentFor(lesson: CurriculumLesson) {
  const seed = [...lesson.id].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const source = [
    { id: 'principle', prompt: `Which statement best captures “${lesson.title}”?`, answer: lesson.takeaway, distractors: ['The result is guaranteed when the rule is followed.', 'Recent performance removes uncertainty.'], explanation: lesson.takeaway },
    { id: 'evidence', prompt: `When testing this objective—“${lesson.objective}”—what makes the comparison useful?`, answer: 'Hold assumptions and time periods consistent.', distractors: ['Choose the outcome that looks best.', 'Ignore costs when they are small.'], explanation: 'A controlled comparison changes the decision variable while keeping the other assumptions and measurement period consistent.' },
    { id: 'uncertainty', prompt: `After applying “${lesson.title},” which conclusion is appropriately cautious?`, answer: 'The evidence informs a decision but does not remove uncertainty.', distractors: ['One example proves the rule.', 'A model replaces judgment.'], explanation: 'Investment evidence can improve a decision without turning an uncertain outcome into a promise.' },
    { id: 'application', prompt: `What is the strongest way to apply “${lesson.title}” next?`, answer: 'Use the concept in a defined example and record the assumptions.', distractors: ['Act immediately before the opportunity changes.', 'Choose the most optimistic scenario.'], explanation: 'A defined example with visible assumptions makes the reasoning reproducible and easier to review.' },
    { id: 'review', prompt: `What should a review of this ${lesson.track} decision examine?`, answer: 'The reasoning, evidence, assumptions, and outcome.', distractors: ['Only whether money was made.', 'Only the final price.'], explanation: 'Outcome alone cannot reveal decision quality; review the evidence, assumptions, reasoning, and what actually happened.' },
  ];
  const correct: number[] = [];
  const questions = source.map((question, index) => {
    const answerIndex = (seed + index * 2) % 3;
    const options = [...question.distractors];
    options.splice(answerIndex, 0, question.answer);
    correct.push(answerIndex);
    return { id: question.id, prompt: question.prompt, options, explanation: question.explanation };
  });
  return { questions, correct };
}
