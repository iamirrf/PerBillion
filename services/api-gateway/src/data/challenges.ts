export const CHALLENGE_PACK_VERSION = '2026.1';

export const challenges = [
  ['week-01', 'Name the job', 'money-to-investing', 'Separate money for a near-term need from money that could stay invested for a decade. Explain why the jobs require different treatment.'],
  ['week-02', 'Let time do the work', 'compound-interest', 'Compare the same starting amount over 10 and 30 years. Record the assumption that drives the largest difference.'],
  ['week-03', 'Protect purchasing power', 'inflation-and-value', 'Compare a nominal return with inflation and explain the resulting change in purchasing power.'],
  ['week-04', 'Look inside the label', 'stocks-bonds-funds', 'Choose a fictional fund label and list what you would inspect before deciding what risk it contains.'],
  ['week-05', 'Define the loss', 'risk-and-return', 'Describe one loss you could financially absorb and one that would interrupt the goal.'],
  ['week-06', 'Write the plan first', 'first-investment-plan', 'Create a one-paragraph plan with a goal, horizon, contribution, review schedule, and rule for change.'],
  ['week-07', 'Find the hidden concentration', 'diversification', 'Build a three-holding example and identify one risk driver shared by all three.'],
  ['week-08', 'Design the mix', 'asset-allocation', 'Create a fictional allocation and explain how its weights connect to a goal and time horizon.'],
  ['week-09', 'Count every cost', 'fees-and-friction', 'Compare two cost assumptions over the same horizon and explain the compounding effect.'],
  ['week-10', 'Return to the target', 'rebalancing', 'Describe a portfolio drift and choose a rebalancing rule, including one tradeoff.'],
  ['week-11', 'Measure the way back', 'drawdown-and-recovery', 'Calculate the gain required after a 25% decline and explain the asymmetry.'],
  ['week-12', 'Review the decision', 'behavior-and-discipline', 'Review a fictional decision using its evidence, assumptions, process, and outcome as separate facts.'],
].map(([id, title, lessonId, prompt], index) => ({ id, title, lessonId, prompt, week: index + 1 }));
