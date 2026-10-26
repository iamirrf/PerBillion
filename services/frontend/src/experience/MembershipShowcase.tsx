import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from './Icons'

export function CompoundPreview() {
  const [years, setYears] = useState(20)
  const [monthly, setMonthly] = useState(300)
  const total = useMemo(() => {
    const monthlyRate = .06 / 12
    return monthly * ((1 + monthlyRate) ** (years * 12) - 1) / monthlyRate
  }, [years, monthly])
  return <section className="compound-preview" aria-labelledby="compound-title"><div><p className="kicker">TRY A COMPLETE LESSON</p><h2 id="compound-title">Give time<br/>a little room.</h2><p>Change two assumptions and watch a simple illustration take shape. Every lesson makes the idea visible before asking you to use it.</p><Link className="chapter-link" to="/learn/compound-interest">Open the free compounding lesson <Icon name="arrow"/></Link></div><div className="compound-console"><header><span>ILLUSTRATIVE BALANCE</span><strong>${Math.round(total).toLocaleString()}</strong><small>at a constant 6% annual return</small></header><label>Years <output>{years}</output><input type="range" min="5" max="40" value={years} onChange={event=>setYears(Number(event.target.value))}/></label><label>Monthly contribution <output>${monthly}</output><input type="range" min="50" max="1000" step="50" value={monthly} onChange={event=>setMonthly(Number(event.target.value))}/></label><p>Illustration only. Excludes fees, taxes, inflation, and changing returns.</p></div></section>
}

export function PricingStory() {
  return <section className="pricing-story" id="pricing"><div className="pricing-copy"><p className="kicker">MEMBERSHIP</p><h2>A curriculum that becomes a practice.</h2><p>Move from first principles to applied decisions with a complete learning path, virtual scenarios, weekly missions, and a private decision journal.</p><ul><li>24 visual lessons across four tracks</li><li>12 guided weekly missions</li><li>Fictional portfolio practice and debriefs</li><li>Saved progress, assessments, and reflections</li></ul></div><article className="price-card"><span>PERBILLION ACADEMY</span><div><strong>$29</strong><small>/ month</small></div><p>Seven days to explore the complete academy. A card is required. Cancel before renewal.</p><Link className="button primary large" to="/register?returnTo=%2Fpricing">Start your 7-day trial <Icon name="arrow"/></Link><small>Checkout remains in test mode until commercial capacity is funded.</small></article></section>
}
