import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { lessons, tracks, type Lesson, type VisualKind } from './curriculum'
import { useLearningStore } from './learningStore'
import './learn.css'

const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)

const readingLinks = {
  basics: { label: 'Investing fundamentals', source: 'Investor.gov', href: 'https://www.investor.gov/introduction-investing' },
  allocation: { label: 'Asset allocation & diversification', source: 'Investor.gov', href: 'https://www.investor.gov/introduction-investing/getting-started/asset-allocation' },
  fees: { label: 'Understanding investment fees', source: 'Investor.gov', href: 'https://www.investor.gov/introduction-investing/getting-started/understanding-fees' },
  orders: { label: 'How order types work', source: 'Investor.gov', href: 'https://www.investor.gov/introduction-investing/investing-basics/how-stock-markets-work/types-orders' },
  margin: { label: 'Understanding margin accounts', source: 'Investor.gov', href: 'https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins-29' },
  options: { label: 'An introduction to options', source: 'Investor.gov', href: 'https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins-63' },
  ai: { label: 'AI & investment information', source: 'FINRA', href: 'https://www.finra.org/investors/insights/artificial-intelligence-and-investment-fraud' },
  validation: { label: 'Time series model evaluation', source: 'scikit-learn', href: 'https://scikit-learn.org/stable/modules/cross_validation.html#cross-validation-of-time-series-data' },
  leakage: { label: 'Avoiding data leakage', source: 'scikit-learn', href: 'https://scikit-learn.org/stable/common_pitfalls.html#data-leakage' },
}

function FurtherReading({ track }: { track?: string }) {
  const selected = track === 'quant' ? ['ai', 'validation', 'leakage'] : track === 'trading' ? ['orders', 'margin', 'options'] : track === 'foundations' || track === 'portfolio' ? ['basics', 'allocation', 'fees'] : ['basics', 'ai', 'validation']
  return <aside className="learn-further-reading" aria-label="Further reading"><span>FURTHER READING</span><div>{selected.map((key) => { const link = readingLinks[key as keyof typeof readingLinks]; return <a key={key} href={link.href} target="_blank" rel="noreferrer noopener"><span>{link.label} <span aria-hidden="true">↗</span></span><small>{link.source}</small><span className="learn-sr-only"> (opens in a new tab)</span></a> })}</div></aside>
}

function Arrow({ back = false }: { back?: boolean }) {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={back ? { transform: 'rotate(180deg)' } : undefined}><path d="M4 12h15m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

function Check() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m5 12 4 4L19 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

function Slider({ label, value, min, max, step = 1, unit, onChange }: { label: string; value: number; min: number; max: number; step?: number; unit: string; onChange: (value: number) => void }) {
  const id = useId()
  return <div className="lesson-slider"><div><label htmlFor={id}>{label}</label><output htmlFor={id}>{unit === '$' ? money(value) : `${value}${unit}`}</output></div><input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} style={{ '--range-fill': `${(value - min) / (max - min) * 100}%` } as React.CSSProperties} /></div>
}

function GrowthVisual() {
  const [years, setYears] = useState(20)
  const [rate, setRate] = useState(6)
  const principal = 10000
  const total = principal * (1 + rate / 100) ** years
  const max = Math.max(12000, total * 1.1)
  const points = Array.from({ length: 41 }, (_, i) => `${48 + i * 12},${190 - principal * (1 + rate / 100) ** (years * i / 40) / max * 150}`).join(' ')
  const area = `M48 190 L${points.replace(/ /g, ' L')} L528 190 Z`
  const gradientId = useId().replace(/:/g, '')
  return <div className="lesson-visual-body"><div className="lesson-visual-chart"><div className="lesson-chart-label"><span>ILLUSTRATIVE GROWTH</span><strong>{money(total)}<small>from {money(principal)}</small></strong></div><svg viewBox="0 0 580 224" role="img" aria-label={`A hypothetical $10,000 investment grows to ${money(total)} over ${years} years at a constant ${rate}% annual return.`}><defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#d6b879" stopOpacity=".22" /><stop offset="100%" stopColor="#d6b879" stopOpacity="0" /></linearGradient></defs>{[50, 95, 140, 190].map((y) => <line key={y} x1="48" y1={y} x2="530" y2={y} stroke="#ffffff0d" />)}<path d={area} fill={`url(#${gradientId})`} /><line x1="48" y1={190 - principal / max * 150} x2="528" y2={190 - principal / max * 150} stroke="#69746c" strokeDasharray="4 5" /><polyline points={points} fill="none" stroke="#d6b879" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /><circle cx="528" cy={190 - total / max * 150} r="4" fill="#d6b879" /><text x="48" y="215" fill="#8e938e" fontSize="10">Today</text><text x="528" y="215" textAnchor="end" fill="#8e938e" fontSize="10">Year {years}</text></svg><div className="lesson-visual-legend"><span><i className="is-gold" /> Compounded balance</span><span><i /> Starting amount</span></div></div><div className="lesson-visual-controls"><div className="lesson-control-heading">Give time a little room.<span>Move the sliders. See what changes.</span></div><Slider label="Time invested" value={years} min={1} max={40} unit=" years" onChange={setYears} /><Slider label="Constant annual return" value={rate} min={0} max={12} unit="%" onChange={setRate} /><p>Mathematical illustration. Excludes contributions, fees, taxes, and inflation. Actual returns vary.</p></div></div>
}

function AllocationVisual() {
  const [stocks, setStocks] = useState(60)
  const bonds = Math.round((100 - stocks) * .75)
  const cash = 100 - stocks - bonds
  const circumference = 2 * Math.PI * 76
  return <div className="lesson-visual-body"><div className="lesson-allocation-chart"><svg viewBox="0 0 260 240" role="img" aria-label={`Illustrative allocation: ${stocks}% stocks, ${bonds}% bonds, ${cash}% cash.`}><circle cx="130" cy="120" r="76" stroke="#28302a" strokeWidth="22" fill="none" /><g transform="rotate(-90 130 120)"><circle cx="130" cy="120" r="76" stroke="#d6b879" strokeWidth="22" fill="none" strokeDasharray={`${circumference * stocks / 100} ${circumference}`} /><circle cx="130" cy="120" r="76" stroke="#7d9a87" strokeWidth="22" fill="none" strokeDasharray={`${circumference * bonds / 100} ${circumference}`} strokeDashoffset={-circumference * stocks / 100} /><circle cx="130" cy="120" r="76" stroke="#444f46" strokeWidth="22" fill="none" strokeDasharray={`${circumference * cash / 100} ${circumference}`} strokeDashoffset={-circumference * (stocks + bonds) / 100} /></g><text x="130" y="118" fill="#efeee8" textAnchor="middle" fontSize="29" fontWeight="500">100%</text><text x="130" y="140" fill="#8e938e" textAnchor="middle" fontSize="10" letterSpacing="1.3">YOUR MIX</text></svg><div className="allocation-legend">{[['Stocks', stocks, '#d6b879'], ['Bonds', bonds, '#7d9a87'], ['Cash', cash, '#444f46']].map(([label, value, color]) => <div key={label}><span><i style={{ background: color as string }} />{label}</span><strong>{value}%</strong></div>)}</div></div><div className="lesson-visual-controls"><div className="lesson-control-heading">Different assets. Different roles.<span>Explore how one weight changes the whole.</span></div><Slider label="Stock allocation" value={stocks} min={0} max={100} step={5} unit="%" onChange={setStocks} /><p>The remainder is split 75% bonds and 25% cash, rounded to whole percentages. This illustrates portfolio weights, not expected returns or a recommended allocation.</p><div className="lesson-mini-note">Diversification can reduce concentration. It cannot prevent every loss.</div></div></div>
}

function RiskVisual() {
  const [loss, setLoss] = useState(25)
  const recovery = loss / (100 - loss) * 100
  const lowY = 65 + loss * 1.4
  return <div className="lesson-visual-body"><div className="lesson-visual-chart"><div className="lesson-chart-label"><span>THE RECOVERY GAP</span><strong>{recovery.toFixed(1)}%<small>gain needed to recover</small></strong></div><svg viewBox="0 0 580 220" role="img" aria-label={`After a ${loss}% loss, a ${recovery.toFixed(1)}% gain is needed to recover.`}>{[65, 110, 155, 200].map((y) => <line key={y} x1="48" y1={y} x2="530" y2={y} stroke="#ffffff0d" />)}<path d={`M48 65 L120 65 L280 ${lowY} L470 65 L530 65`} stroke="#d6b879" strokeWidth="2.5" fill="none" strokeLinejoin="round" /><path d="M48 65H530" stroke="#69746c" strokeDasharray="4 5" /><circle cx="280" cy={lowY} r="5" fill="#d6b879" /><text x="48" y="48" fill="#8e938e" fontSize="11">{money(10000)}</text><text x="280" y={lowY + 23} textAnchor="middle" fill="#d6b879" fontSize="12">{money(10000 * (1 - loss / 100))}</text><text x="48" y="215" fill="#8e938e" fontSize="10">Starting value</text><text x="280" y="215" textAnchor="middle" fill="#8e938e" fontSize="10">After loss</text><text x="530" y="215" textAnchor="end" fill="#8e938e" fontSize="10">Recovered value</text></svg></div><div className="lesson-visual-controls"><div className="lesson-control-heading">Losses change the starting point.<span>Compare the fall with the climb back.</span></div><Slider label="Portfolio decline" value={loss} min={5} max={75} step={5} unit="%" onChange={setLoss} /><div className="lesson-equation">−{loss}% <span>requires</span> +{recovery.toFixed(1)}%</div><p>Arithmetic illustration. The path and time required for any actual recovery are unknown. Some investments never recover.</p></div></div>
}

const candleData = Array.from({ length: 24 }, (_, i) => {
  const base = 92 + i * 1.05 + Math.sin(i * .7) * 5
  const open = base + Math.sin(i * 2.3) * 2
  const close = base + Math.cos(i * 1.7) * 3
  return { open, close, high: Math.max(open, close) + 1.8 + Math.sin(i) ** 2 * 2, low: Math.min(open, close) - 1.8 - Math.cos(i) ** 2 * 2 }
})

function MarketVisual() {
  const [style, setStyle] = useState<'candles' | 'line'>('candles')
  const [selected, setSelected] = useState(12)
  const current = candleData[selected]
  const y = (value: number) => 195 - (value - 82) / 46 * 160
  return <div className="lesson-visual-body"><div className="lesson-visual-chart"><div className="lesson-chart-label"><span>SYNTHETIC PRICE HISTORY</span><div className="lesson-chart-toggle" role="group" aria-label="Chart display">{(['candles', 'line'] as const).map((kind) => <button key={kind} className={style === kind ? 'active' : ''} onClick={() => setStyle(kind)} aria-pressed={style === kind}>{kind === 'candles' ? 'Candles' : 'Line'}</button>)}</div></div><svg viewBox="0 0 580 225" role="img" aria-label={`Synthetic ${style} chart. Selected interval ${selected + 1}, open ${current.open.toFixed(2)}, high ${current.high.toFixed(2)}, low ${current.low.toFixed(2)}, close ${current.close.toFixed(2)}.`}>{[50, 100, 150, 195].map((line) => <line key={line} x1="35" x2="545" y1={line} y2={line} stroke="#ffffff0d" />)}{style === 'line' ? <polyline fill="none" stroke="#d6b879" strokeWidth="2.3" points={candleData.map((c, i) => `${45 + i * 21},${y(c.close)}`).join(' ')} /> : candleData.map((c, i) => <g key={i} opacity={selected === i ? 1 : .6}><line x1={45 + i * 21} x2={45 + i * 21} y1={y(c.high)} y2={y(c.low)} stroke={c.close >= c.open ? '#d6b879' : '#7d9a87'} /><rect x={40 + i * 21} y={Math.min(y(c.open), y(c.close))} width="10" height={Math.max(2, Math.abs(y(c.open) - y(c.close)))} fill={c.close >= c.open ? '#d6b879' : '#7d9a87'} /></g>)}<line x1={45 + selected * 21} x2={45 + selected * 21} y1="25" y2="195" stroke="#d6b879" strokeDasharray="3 4" opacity=".4" /><text x="35" y="220" fill="#8e938e" fontSize="10">Interval 1</text><text x="545" y="220" textAnchor="end" fill="#8e938e" fontSize="10">Interval 24</text></svg><div className="lesson-ohlc">{Object.entries(current).map(([key, value]) => <div key={key}><span>{key}</span><strong>${value.toFixed(2)}</strong></div>)}</div></div><div className="lesson-visual-controls"><div className="lesson-control-heading">Same prices. A different lens.<span>Inspect an interval and switch the view.</span></div><Slider label="Selected interval" value={selected + 1} min={1} max={24} unit="" onChange={(value) => setSelected(value - 1)} /><p>Candles show each interval’s open, high, low, and close. A line connects closing prices. This is invented data for learning, not a current market quote.</p></div></div>
}

function ModelVisual() {
  const [complexity, setComplexity] = useState(4)
  const [costs, setCosts] = useState(true)
  const trainError = 7.6 - complexity * .55
  const testError = 3.2 + (complexity - 4) ** 2 * .16
  const series = useMemo(() => Array.from({ length: 45 }, (_, i) => {
    const value = 105 + i * .8 + Math.sin(i * .52) * 7
    const prediction = i <= 27 ? value + Math.sin(i * 1.8) * trainError : 126 + (i - 27) * .55 + Math.sin(i * .4) * (complexity * .9)
    return { value, prediction: prediction - (costs && i > 27 ? (i - 27) * .3 : 0) }
  }), [complexity, trainError, costs])
  const p = (field: 'value' | 'prediction') => series.map((entry, i) => `${40 + i * 11.2},${200 - (entry[field] - 90) * 2.4}`).join(' ')
  return <div className="lesson-visual-body"><div className="lesson-visual-chart"><div className="lesson-chart-label"><span>ILLUSTRATIVE MODEL FIT</span><div className="lesson-model-errors"><span>Train <b>{trainError.toFixed(1)}</b></span><span>Test <b>{testError.toFixed(1)}</b></span></div></div><svg viewBox="0 0 580 235" role="img" aria-label={`Illustrative model fit with complexity ${complexity}. Training error ${trainError.toFixed(1)}, test error ${testError.toFixed(1)}. These example error scores are educational, not measured results.`}><rect x="342" y="22" width="195" height="174" fill="#d6b87908" />{[50, 100, 150, 195].map((line) => <line key={line} x1="40" x2="537" y1={line} y2={line} stroke="#ffffff0d" />)}<polyline points={p('value')} fill="none" stroke="#708c7a" strokeWidth="2" /><polyline points={p('prediction')} fill="none" stroke="#d6b879" strokeWidth="2" /><line x1="342" y1="22" x2="342" y2="196" stroke="#d6b879" strokeDasharray="4 5" opacity=".6" /><text x="40" y="220" fill="#8e938e" fontSize="10">Training window</text><text x="537" y="220" textAnchor="end" fill="#d6b879" fontSize="10">Unseen test window</text></svg><div className="lesson-visual-legend"><span><i className="is-gold" /> Model</span><span><i /> Observations</span></div></div><div className="lesson-visual-controls"><div className="lesson-control-heading">A closer fit is not always better.<span>Watch training and test error diverge.</span></div><Slider label="Model complexity" value={complexity} min={1} max={10} unit=" / 10" onChange={setComplexity} /><label className="lesson-toggle"><input type="checkbox" checked={costs} onChange={(event) => setCosts(event.target.checked)} /><span>Show illustrative execution drag</span></label><p>Synthetic curves and example error scores explain overfitting. The drag toggle lowers the model path in the test window; it does not alter the example error scores.</p></div></div>
}

function PositionVisual() {
  const [budget, setBudget] = useState(100)
  const [distance, setDistance] = useState(5)
  const shares = Math.floor(budget / distance)
  return <div className="lesson-visual-body"><div className="lesson-position-chart"><span className="lesson-visual-kicker">SIZE FROM THE RISK</span><strong>{shares}<small>shares</small></strong><div className="lesson-position-formula"><span>{money(budget)}<small>planned loss budget</small></span><b>÷</b><span>{money(distance)}<small>planned risk per share</small></span></div><div className="lesson-position-blocks" aria-hidden="true">{Array.from({ length: Math.min(shares, 60) }, (_, i) => <i key={i} />)}</div></div><div className="lesson-visual-controls"><div className="lesson-control-heading">Decide the risk. Then the size.<span>Change either input to see the tradeoff.</span></div><Slider label="Planned dollar loss budget" value={budget} min={20} max={500} step={10} unit="$" onChange={setBudget} /><Slider label="Entry-to-exit distance per share" value={distance} min={1} max={20} unit="$" onChange={setDistance} /><p>Shares are rounded down. This simplified model excludes position value, available capital, fees, gaps, and slippage. Actual losses can exceed the planned budget.</p></div></div>
}

export function LessonVisual({ kind }: { kind: VisualKind }) {
  const components = { growth: GrowthVisual, allocation: AllocationVisual, risk: RiskVisual, market: MarketVisual, model: ModelVisual, position: PositionVisual }
  const Visual = components[kind]
  return <div className="lesson-visual panel"><div className="lesson-visual-top"><span><svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M3 14.5 7.5 10l3 3L17 5.5M12 5.5h5v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg> LEARNING IN MOTION</span><span>Interactive illustration</span></div><Visual /></div>
}

function LessonQuiz({ lesson }: { lesson: Lesson }) {
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [submitted, setSubmitted] = useState(false)
  const completeLesson = useLearningStore((state) => state.completeLesson)
  const completed = useLearningStore((state) => state.completed[lesson.id])
  const resultRef = useRef<HTMLDivElement>(null)
  const score = Math.round(lesson.quiz.filter((question, index) => answers[index] === question.answer).length / lesson.quiz.length * 100)
  const allAnswered = lesson.quiz.every((_, index) => answers[index] !== undefined)
  const nextLesson = lessons[lessons.findIndex((entry) => entry.id === lesson.id) + 1]

  function checkAnswers() {
    setSubmitted(true)
    if (score >= 80) completeLesson(lesson.id, score)
    requestAnimationFrame(() => resultRef.current?.focus())
  }

  return <section className="lesson-quiz panel" aria-labelledby="knowledge-heading"><div className="lesson-quiz-heading"><span className="eyebrow">MAKE IT STICK</span><h2 id="knowledge-heading">A quick check of your understanding.</h2><p className="muted">Two questions. Take your time.</p></div>{lesson.quiz.map((question, index) => <fieldset key={question.question} disabled={submitted}><legend><span>0{index + 1}</span>{question.question}</legend><div className="lesson-answer-list">{question.options.map((option, answerIndex) => <label key={option} className={`lesson-answer ${answers[index] === answerIndex ? 'selected' : ''} ${submitted && answerIndex === question.answer ? 'correct' : ''} ${submitted && answers[index] === answerIndex && answerIndex !== question.answer ? 'incorrect' : ''}`}><input type="radio" name={`${lesson.id}-question-${index}`} value={answerIndex} checked={answers[index] === answerIndex} onChange={() => setAnswers((current) => ({ ...current, [index]: answerIndex }))} /><span className="lesson-answer-marker">{submitted && answerIndex === question.answer ? <Check /> : String.fromCharCode(65 + answerIndex)}</span><span>{option}</span></label>)}</div>{submitted && <p className="lesson-answer-explanation">{question.explanation}</p>}</fieldset>)}{submitted ? <div className={`lesson-quiz-result ${score >= 80 ? 'passed' : ''}`} ref={resultRef} tabIndex={-1} role="status"><div><strong>{score >= 80 ? 'Well understood.' : 'A good moment to revisit.'}</strong><p>{score >= 80 ? 'Lesson complete. Keep building your understanding.' : `You scored ${score}%. Read the explanations, then try again.`}</p></div><div className="lesson-result-actions">{score < 80 && <button className="button button-gold" onClick={() => { setSubmitted(false); setAnswers({}) }}>Try again <Arrow /></button>}{score >= 80 && (nextLesson ? <Link className="button button-gold" to={`/education?lesson=${nextLesson.id}`}>Next lesson <Arrow /></Link> : <Link className="button button-gold" to="/education">Explore your progress <Arrow /></Link>)}</div></div> : <div className="lesson-quiz-footer"><span>{completed ? <><Check /> Previously completed · {completed.score}%</> : 'Answer both questions to complete this lesson.'}</span><button className="button button-gold" disabled={!allAnswered} onClick={checkAnswers}>Check answers <Arrow /></button></div>}</section>
}

function LessonReader({ lesson }: { lesson: Lesson }) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const completed = useLearningStore((state) => state.completed)
  const setLastLesson = useLearningStore((state) => state.setLastLesson)
  const track = tracks.find((entry) => entry.id === lesson.track)!
  const trackLessons = lessons.filter((entry) => entry.track === lesson.track)
  const lessonIndex = lessons.findIndex((entry) => entry.id === lesson.id)
  useEffect(() => {
    setLastLesson(lesson.id)
    headingRef.current?.focus({ preventScroll: true })
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [lesson.id, setLastLesson])

  return <div className="learning-page lesson-reader"><div className="lesson-reader-top"><Link to="/education" className="lesson-back"><Arrow back /> All lessons</Link><span>LESSON {String(lessonIndex + 1).padStart(2, '0')} <span className="muted">/ {lessons.length}</span></span></div><div className="lesson-reader-layout"><aside className="lesson-reader-sidebar"><span className="eyebrow">YOUR LEARNING PATH</span><h2>{track.title}</h2><p className="muted">{trackLessons.filter((entry) => completed[entry.id]).length} of {trackLessons.length} complete</p><nav aria-label="Lessons in this track">{trackLessons.map((entry, index) => <Link key={entry.id} to={`/education?lesson=${entry.id}`} className={entry.id === lesson.id ? 'active' : ''} aria-current={entry.id === lesson.id ? 'page' : undefined}><span>{completed[entry.id] ? <Check /> : String(index + 1).padStart(2, '0')}</span>{entry.title}</Link>)}</nav><div className="lesson-sidebar-note"><span>YOUR PACE. YOUR PATH.</span><p>Every lesson is open. Start anywhere, return anytime.</p></div></aside><article className="lesson-reader-main"><header className="lesson-reader-heading"><div className="lesson-meta"><span className="pill">{track.label}</span><span>{lesson.duration} min read</span>{completed[lesson.id] && <span className="lesson-completed-label"><Check /> Complete</span>}</div><h1 ref={headingRef} tabIndex={-1}>{lesson.title}</h1><p>{lesson.description}</p></header><LessonVisual key={lesson.id} kind={lesson.visual} /><div className="lesson-content">{lesson.sections.map((section, index) => <section key={section.title}><span className="lesson-section-number">0{index + 1}</span><div><h2>{section.title}</h2><p>{section.text}</p></div></section>)}</div><div className="lesson-takeaway"><span className="eyebrow">TAKE THIS WITH YOU</span><p>{lesson.takeaway}</p></div><LessonQuiz key={lesson.id} lesson={lesson} /><FurtherReading track={lesson.track} /><div className="lesson-bottom-nav">{lessonIndex > 0 ? <Link to={`/education?lesson=${lessons[lessonIndex - 1].id}`}><Arrow back /> Previous lesson</Link> : <Link to="/education"><Arrow back /> Learning path</Link>}<span>Learn it. Try it. Make it yours.</span></div></article></div></div>
}

export default function Learn() {
  const [params, setParams] = useSearchParams()
  const syncStatus = useLearningStore((state) => state.syncStatus)
  const accountId = useLearningStore((state) => state.accountId)
  const lessonId = params.get('lesson')
  const selectedLesson = lessons.find((lesson) => lesson.id === lessonId)
  const [activeTrack, setActiveTrack] = useState(tracks.some((entry) => entry.id === params.get('track')) ? params.get('track')! : 'foundations')
  const completed = useLearningStore((state) => state.completed)
  const completedCount = lessons.filter((lesson) => completed[lesson.id]).length
  const nextLesson = lessons.find((lesson) => !completed[lesson.id]) || lessons[0]
  const activeLessons = lessons.filter((lesson) => lesson.track === activeTrack)
  const track = tracks.find((entry) => entry.id === activeTrack) || tracks[0]
  const totalMinutes = lessons.reduce((total, lesson) => total + lesson.duration, 0)

  function selectTrack(id: string) {
    setActiveTrack(id)
    setParams({ track: id }, { replace: true })
  }

  function navigateTracks(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index
    if (event.key === 'ArrowRight') next = (index + 1) % tracks.length
    else if (event.key === 'ArrowLeft') next = (index - 1 + tracks.length) % tracks.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = tracks.length - 1
    else return
    event.preventDefault()
    selectTrack(tracks[next].id)
    document.getElementById(`track-tab-${tracks[next].id}`)?.focus()
  }

  useEffect(() => {
    if (params.get('track') && tracks.some((entry) => entry.id === params.get('track'))) setActiveTrack(params.get('track')!)
  }, [params])

  if (selectedLesson) return <LessonReader key={selectedLesson.id} lesson={selectedLesson} />
  if (lessonId) return <div className="learning-page lesson-not-found panel"><span className="eyebrow">LET’S FIND YOUR NEXT STEP</span><h1>We couldn’t find that lesson.</h1><p className="muted">Explore the complete learning path to continue.</p><Link className="button button-gold" to="/education">View all lessons <Arrow /></Link></div>

  return <div className="learning-page"><header className="learn-page-header"><div><span className="eyebrow">THE PERBILLION ACADEMY</span><h1 className="page-heading">Knowledge is your<br /><span className="gold">first investment.</span></h1><p>From your first dollar to your first model. Learn by doing.</p></div><div className="learn-header-stats"><div><strong>{lessons.length}</strong><span>visual lessons</span></div><div><strong>4</strong><span>learning tracks</span></div><div><strong>100%</strong><span>free to explore</span></div></div></header><section className="learning-progress-bar panel" aria-label="Your learning progress"><div className="learning-progress-label"><span className="learning-progress-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 19V9m5 10V5m5 14v-7m5 7V3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg></span><div><strong>Your learning journey</strong><span>{completedCount === 0 ? 'A fresh start. A world of possibility.' : `${completedCount} concept${completedCount === 1 ? '' : 's'} understood. Keep your momentum.`}</span></div></div><div className="learning-progress-meter"><div><span>{completedCount} <span className="muted">/ {lessons.length} lessons</span></span><strong>{Math.round(completedCount / lessons.length * 100)}%</strong></div><progress max={lessons.length} value={completedCount} aria-label={`${completedCount} of ${lessons.length} lessons complete`} /></div></section><section className="learn-featured panel"><div className="learn-featured-content"><span className="eyebrow">{completedCount === 0 ? 'YOUR FIRST STEP' : completedCount === lessons.length ? 'KEEP YOUR KNOWLEDGE SHARP' : 'PICK UP WHERE YOU LEFT OFF'}</span><h2>{nextLesson.title}</h2><p>{nextLesson.description}</p><Link className="button button-gold" to={`/education?lesson=${nextLesson.id}`}>{completedCount === 0 ? 'Start learning' : completedCount === lessons.length ? 'Revisit the foundations' : 'Continue learning'} <Arrow /></Link><div className="learn-featured-meta"><span>{nextLesson.duration} MIN</span><span>INTERACTIVE LESSON</span><span>NO EXPERIENCE NEEDED</span></div></div><div className="learn-featured-art" aria-hidden="true"><div className="learning-orbit orbit-one" /><div className="learning-orbit orbit-two" /><div className="learning-orbit orbit-three" /><div className="learning-art-center"><svg viewBox="0 0 100 100" fill="none"><path d="M20 73V50m20 23V33m20 40V43m20 30V20" stroke="currentColor" strokeWidth="6" strokeLinecap="round" /><path d="m18 36 23-15 18 7L81 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg></div><span className="learn-art-caption">A LITTLE KNOWLEDGE.<br />AN ENTIRELY NEW PERSPECTIVE.</span></div></section><section className="learn-curriculum" aria-labelledby="learning-path-heading"><div className="learn-section-heading"><div><span className="eyebrow">A CLEAR PATH FORWARD</span><h2 id="learning-path-heading">Start curious. Become confident.</h2></div><span className="muted">{Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m of focused learning</span></div><div className="learn-track-tabs" role="tablist" aria-label="Learning tracks">{tracks.map((entry, trackIndex) => { const count = lessons.filter((lesson) => lesson.track === entry.id && completed[lesson.id]).length; return <button role="tab" type="button" key={entry.id} id={`track-tab-${entry.id}`} aria-controls="track-lessons" aria-selected={entry.id === activeTrack} tabIndex={entry.id === activeTrack ? 0 : -1} onKeyDown={(event) => navigateTracks(event, trackIndex)} className={entry.id === activeTrack ? 'active' : ''} onClick={() => selectTrack(entry.id)}><span className="learn-track-number">{entry.level}</span><span><strong>{entry.title}</strong><small>{entry.label} <span>· {count}/6 complete</span></small></span><Arrow /></button> })}</div><div id="track-lessons" role="tabpanel" aria-labelledby={`track-tab-${track.id}`}><div className="learn-track-description"><span>{track.subtitle}</span><span className="muted">6 lessons · all unlocked</span></div><div className="learn-lesson-grid">{activeLessons.map((lesson, index) => <Link className={`learn-lesson-card panel ${completed[lesson.id] ? 'is-complete' : ''}`} key={lesson.id} to={`/education?lesson=${lesson.id}`}><div className="learn-card-top"><span className="learn-card-number">{String(lessons.findIndex((entry) => entry.id === lesson.id) + 1).padStart(2, '0')}</span>{completed[lesson.id] ? <span className="learn-card-complete"><Check /> Complete</span> : <span>{lesson.duration} MIN</span>}</div><div className={`learn-card-art art-${lesson.visual}`} aria-hidden="true">{lesson.visual === 'growth' ? <svg viewBox="0 0 220 75"><path d={`M5 65 C55 ${65 - index * 2},110 63,145 40 S185 25,215 8`} fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M5 65H215" stroke="currentColor" strokeWidth=".5" strokeDasharray="3 4" opacity=".3" /></svg> : lesson.visual === 'allocation' ? <svg viewBox="0 0 220 75"><ellipse cx="110" cy="38" rx="45" ry="27" fill="none" stroke="currentColor" strokeWidth="12" opacity=".15" /><ellipse cx="110" cy="38" rx="45" ry="27" fill="none" stroke="currentColor" strokeWidth="12" strokeDasharray="115 125" transform={`rotate(${index * 25} 110 38)`} /></svg> : lesson.visual === 'risk' ? <svg viewBox="0 0 220 75"><path d="m5 15 35 3 27 20 25-8 25 36 25-24 27 3 46-35" fill="none" stroke="currentColor" strokeWidth="1.7" /><path d="M5 15H215" stroke="currentColor" strokeWidth=".5" strokeDasharray="3 4" opacity=".3" /></svg> : lesson.visual === 'market' ? <svg viewBox="0 0 220 75">{[40, 50, 35, 28, 40, 30, 20, 27, 15, 10].map((y, i) => <g key={i} opacity={i % 3 ? 1 : .4}><path d={`M${18 + i * 20} ${y - 8}v30`} stroke="currentColor" /><rect x={14 + i * 20} y={y} width="8" height="14" fill="currentColor" /></g>)}</svg> : lesson.visual === 'position' ? <svg viewBox="0 0 220 75">{[18, 30, 43, 55, 66, 43, 30, 18].map((height, i) => <rect key={i} x={22 + i * 24} y={70 - height} width="13" height={height} rx="2" fill="currentColor" opacity={.2 + i * .09} />)}</svg> : <svg viewBox="0 0 220 75"><path d="m5 55 20-7 20 7 20-26 20 10 20-15 20 8 20-10 20 15 20-20 30-7" fill="none" stroke="currentColor" strokeWidth="1.7" /><path d="m5 57 30-4 30-9 30-10 30-6 30-7 30-4 30-6" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" opacity=".4" /></svg>}</div><h3>{lesson.title}</h3><p>{lesson.description}</p><div className="learn-card-footer"><span>{completed[lesson.id] ? 'Revisit lesson' : 'Explore lesson'}</span><Arrow /></div></Link>)}</div></div></section><div className="learn-footer-note"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m12 3 8 4v5c0 5-8 9-8 9s-8-4-8-9V7l8-4Z" stroke="currentColor" strokeWidth="1.5" /><path d="m8.5 12 2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg><p>Education, at your own pace. No paywalls. No real money at risk.<span>{accountId ? syncStatus === 'synced' ? 'Progress is synced to your account.' : syncStatus === 'offline' ? 'Progress is saved here; account sync is pending.' : 'Progress is syncing to your account.' : 'Learning progress is stored on this device.'} Lessons are educational, not personalized investment advice.</span></p></div><FurtherReading /></div>
}
