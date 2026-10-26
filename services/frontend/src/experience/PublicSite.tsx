import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { Brand, Icon } from "./Icons";
import { CompoundPreview, PricingStory } from "./MembershipShowcase";

const HeroSculpture = lazy(() => import("./HeroSculpture"));
const MiniLine = ({ variant = 0 }: { variant?: number }) => (
  <svg
    className="mini-line"
    viewBox="0 0 520 190"
    role="img"
    aria-label="Illustrative financial chart"
  >
    <path className="grid" d="M10 45h500M10 95h500M10 145h500" />
    <path
      className="band"
      d={
        variant
          ? "M10 135C90 120 145 135 215 91S355 46 510 18V75C370 95 292 110 215 130S90 153 10 155Z"
          : "M10 150C100 142 138 124 210 129S340 78 510 28V87C348 115 280 151 210 156S93 167 10 171Z"
      }
    />
    <path
      className="line"
      d={
        variant
          ? "M10 145C95 134 145 145 215 111S355 67 510 45"
          : "M10 160C100 151 144 137 210 143S340 96 510 56"
      }
    />
  </svg>
);

export function PublicNav() {
  const signedIn = Boolean(useAuthStore((s) => s.user)),
    [open, setOpen] = useState(false),
    trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);
  return (
    <header className={`public-nav ${open ? "menu-open" : ""}`}>
      <Link to="/" aria-label="PerBillion home">
        <Brand />
      </Link>
      <button
        ref={trigger}
        className="public-menu-toggle"
        aria-expanded={open}
        aria-controls="public-menu"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((value) => !value)}
      >
        <span />
        <span />
        <span />
        <span className="sr-only">Menu</span>
      </button>
      <nav id="public-menu" aria-label="Public navigation">
        <Link onClick={() => setOpen(false)} to="/learn">
          Academy
        </Link>
        <Link onClick={() => setOpen(false)} to="/practice">
          Practice
        </Link>
        <Link onClick={() => setOpen(false)} to="/research">
          Research beta
        </Link>
        <Link onClick={() => setOpen(false)} to="/about">
          About
        </Link>
        <Link onClick={() => setOpen(false)} to="/pricing">
          Membership
        </Link>
        <Link
          className="mobile-nav-action"
          onClick={() => setOpen(false)}
          to={signedIn ? "/app" : "/login"}
        >
          {signedIn ? "Open app" : "Sign in"}
        </Link>
        <Link
          className="mobile-nav-action"
          onClick={() => setOpen(false)}
          to={signedIn ? "/app" : "/register"}
        >
          {signedIn ? "Continue learning" : "Create account"}
        </Link>
      </nav>
      <div>
        <Link className="text-button" to="/login">
          Sign in
        </Link>
        <Link className="button primary" to={signedIn ? "/app" : "/register"}>
          {signedIn ? "Open app" : "Start learning"}
          <Icon name="arrow" size={16} />
        </Link>
      </div>
    </header>
  );
}

export default function PublicSite() {
  const signedIn = Boolean(useAuthStore((s) => s.user));
  return (
    <div className="public-site">
      <PublicNav />
      <main>
        <section className="marketing-hero">
          <div className="hero-type">
            <p className="kicker">LEARN · DECIDE · REFLECT</p>
            <h1>
              Build the judgment
              <br />
              <span>behind the decision.</span>
            </h1>
            <p className="lede">
              An investing academy where every concept becomes an experiment,
              every experiment becomes a decision, and every decision becomes
              something you can review.
            </p>
            <div className="hero-actions">
              <Link
                className="button primary large"
                to="/learn/compound-interest"
              >
                Try a complete lesson <Icon name="arrow" />
              </Link>
              <Link to="#pricing" className="button quiet large">
                Explore membership
              </Link>
            </div>
            <div className="hero-proof">
              <span>
                <b>24</b> visual lessons
              </span>
              <span>
                <b>12</b> weekly missions
              </span>
              <span>
                <b>3</b> free previews
              </span>
            </div>
          </div>
          <div className="hero-product">
            <img
              className="hero-sculpture"
              src="/assets/gold-sculpture.webp"
              width="768"
              height="512"
              alt=""
            />
            <Suspense fallback={null}>
              <HeroSculpture />
            </Suspense>
            <div className="demo-top">
              <span className="mark">P</span>
              <span>YOUR LEARNING PATH</span>
              <span>07 / 24</span>
            </div>
            <div className="demo-grid">
              <div>
                <p>Continue learning</p>
                <h2>Design the mix.</h2>
                <span>Asset allocation · 8 min</span>
                <Link to="/learn/diversification">
                  Preview lesson <Icon name="arrow" size={14} />
                </Link>
              </div>
              <div className="demo-chart">
                <span>SIMULATED PORTFOLIO</span>
                <strong>$10,842</strong>
                <MiniLine />
              </div>
            </div>
            <div className="hero-orbit">Clarity compounds.</div>
          </div>
        </section>
        <section className="marketing-section product-story">
          <div className="section-intro">
            <p className="kicker">ONE CONNECTED PRACTICE</p>
            <h2>
              Understanding grows
              <br />
              when you use it.
            </h2>
            <p>
              PerBillion connects the concept, the decision, and the evidence.
              Each part prepares you for the next.
            </p>
          </div>
          <div className="product-steps">
            {[
              [
                "01",
                "book",
                "Learn the idea.",
                "Focused lessons move from first principles to quantitative thinking.",
              ],
              [
                "02",
                "chart",
                "Test the decision.",
                "Use virtual money in fictional markets and repeatable scenarios.",
              ],
              [
                "03",
                "spark",
                "Review the evidence.",
                "Explain your reasoning, inspect the result, and keep uncertainty visible.",
              ],
            ].map(([n, icon, title, copy], i) => (
              <article key={n}>
                <span>{n}</span>
                <Icon name={icon} />
                <h3>{title}</h3>
                <p>{copy}</p>
                {i === 0 ? (
                  <div className="concept-card">
                    <b>Diversification</b>
                    <i />
                    <i />
                    <i />
                    <small>Count risk drivers, not ticker symbols.</small>
                  </div>
                ) : i === 1 ? (
                  <div className="allocation-demo">
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                  </div>
                ) : (
                  <MiniLine variant={1} />
                )}
              </article>
            ))}
          </div>
        </section>
        <CompoundPreview />
        <section className="chapter practice-chapter">
          <div className="portfolio-scene">
            <div className="scene-head">
              <span>SELL-OFF & RECOVERY · DAY 18</span>
              <b>$9,148</b>
            </div>
            {[
              ["Core Market", "52%"],
              ["Bond Basket", "28%"],
              ["Haven Goods", "20%"],
            ].map(([name, pct]) => (
              <div className="asset-row" key={name}>
                <span>{name}</span>
                <i style={{ width: pct }} />
                <b>{pct}</b>
              </div>
            ))}
            <div className="decision-card">
              <span>A useful question</span>
              <b>Has your risk changed—or only the price?</b>
            </div>
          </div>
          <div>
            <p className="kicker">PRACTICE WITHOUT PRETENDING</p>
            <h2>
              Make the decision.
              <br />
              See the consequence.
            </h2>
            <p>
              Use virtual cash across five fictional assets. Trade, rebalance,
              and move through three repeatable market scenarios.
            </p>
            <Link to="/practice" className="chapter-link">
              See how practice works <Icon name="arrow" />
            </Link>
          </div>
        </section>
        <section className="chapter research-chapter">
          <div>
            <p className="kicker">SEPARATE LIMITED BETA</p>
            <h2>
              The future is a range,
              <br />
              not a line.
            </h2>
            <p>
              Build capacity-limited weekly forecasts, keep the data cutoff
              visible, and compare saved model results. Research remains outside
              the paid membership promise.
            </p>
            <Link to="/research" className="chapter-link">
              Explore the research method <Icon name="arrow" />
            </Link>
          </div>
          <div className="research-scene">
            <header>
              <span>AAPL · 12 WEEKS</span>
              <b>Illustrative comparison</b>
            </header>
            <MiniLine variant={1} />
            <footer>
              <span>
                <i />
                Central estimate
              </span>
              <span>
                <i />
                Model interval
              </span>
            </footer>
          </div>
        </section>
        <section className="mission-story">
          <div>
            <p className="kicker">TWELVE WEEKS OF APPLICATION</p>
            <h2>
              A reason to return.
              <br />A record worth keeping.
            </h2>
            <p>
              Each guided mission connects one lesson to an applied decision and
              a private reflection. Finish in order or move at your own pace.
            </p>
          </div>
          <ol>
            {[
              ["01", "Name the job"],
              ["04", "Look inside the label"],
              ["07", "Find the hidden concentration"],
              ["10", "Return to the target"],
              ["12", "Review the decision"],
            ].map(([week, title]) => (
              <li key={week}>
                <span>WEEK {week}</span>
                <b>{title}</b>
                <Icon name="arrow" />
              </li>
            ))}
          </ol>
        </section>
        <PricingStory />
        <section className="faq-section">
          <div>
            <p className="kicker">CLEAR FROM THE START</p>
            <h2>The important questions.</h2>
          </div>
          <div>
            {[
              [
                "What is free?",
                "Three complete lessons—money basics, compounding, and diversification—are available without a membership.",
              ],
              [
                "How does the trial work?",
                "The academy includes a card-required seven-day trial, followed by $29 per month. Cancel before renewal. Checkout remains disabled while the product is in local test mode.",
              ],
              [
                "Does PerBillion trade real money?",
                "No. Practice uses fictional assets, deterministic scenarios, and virtual cash.",
              ],
              [
                "Are forecasts included with membership?",
                "No. Live forecast research is a separate capacity-limited beta and never a recommendation.",
              ],
            ].map(([q, a]) => (
              <details key={q}>
                <summary>
                  {q}
                  <span>+</span>
                </summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="final-cta">
          <p className="kicker">START WITH ONE IDEA</p>
          <h2>
            A clearer decision
            <br />
            begins before the trade.
          </h2>
          <Link
            to={signedIn ? "/app" : "/learn/compound-interest"}
            className="button inverse large"
          >
            {signedIn ? "Open your workspace" : "Try a complete lesson"}
            <Icon name="arrow" />
          </Link>
        </section>
      </main>
      <footer className="public-footer">
        <Brand />
        <p>
          Investing education, simulated decisions, and transparent research for
          curious investors.
        </p>
        <nav>
          <Link to="/about">About</Link>
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
        </nav>
        <span>© {new Date().getFullYear()} PerBillion</span>
      </footer>
    </div>
  );
}
