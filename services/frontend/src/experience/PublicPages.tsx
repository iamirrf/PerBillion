import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../lib/api";
import {
  lessons,
  tracks,
  previews,
  type LessonDetail,
} from "./curriculumCatalog";
import { Brand, Icon } from "./Icons";
import { PublicNav } from "./PublicSite";

function Header() {
  return <PublicNav />;
}

function Footer() {
  return (
    <footer className="public-footer">
      <Brand />
      <p>
        Education, simulated practice, and transparent research for curious
        investors.
      </p>
      <nav>
        <Link to="/about">About</Link>
        <Link to="/privacy">Privacy</Link>
        <Link to="/terms">Terms</Link>
      </nav>
      <span>© {new Date().getFullYear()} PerBillion</span>
    </footer>
  );
}

export function PublicLearn() {
  return (
    <div className="public-site public-inner">
      <Header />
      <main>
        <section className="public-page-hero">
          <p className="kicker">THE PERBILLION ACADEMY</p>
          <h1>
            Build judgment,
            <br />
            <span>one decision at a time.</span>
          </h1>
          <p>
            Twenty-four focused lessons connect financial principles with
            virtual practice and transparent research. Start with three complete
            lessons before creating an account.
          </p>
        </section>
        <section className="public-curriculum">
          {tracks.map((track) => {
            const list = lessons.filter((lesson) => lesson.track === track.id);
            return (
              <article key={track.id}>
                <header>
                  <span>{track.level}</span>
                  <div>
                    <p>{track.label}</p>
                    <h2>{track.title}</h2>
                    <p>{track.subtitle}</p>
                  </div>
                </header>
                <ol>
                  {list.map((lesson, index) => (
                    <li key={lesson.id}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <div>
                        <h3>{lesson.title}</h3>
                        <p>{lesson.description}</p>
                      </div>
                      {previews.has(lesson.id) ? (
                        <Link to={`/learn/${lesson.id}`}>
                          Preview <Icon name="arrow" size={15} />
                        </Link>
                      ) : (
                        <Link
                          to={`/register?returnTo=${encodeURIComponent(`/app/learn/${lesson.id}`)}`}
                        >
                          Membership
                        </Link>
                      )}
                    </li>
                  ))}
                </ol>
              </article>
            );
          })}
        </section>
      </main>
      <Footer />
    </div>
  );
}

type ServerQuestion = { id: string; prompt: string; options: string[] };
type AssessmentResult = {
  score: number;
  passed: boolean;
  results: Array<{
    correct: boolean;
    correctOption: number;
    explanation: string;
  }>;
};

export function PublicLesson() {
  const { lessonId = "" } = useParams();
  const lesson = lessons.find((item) => item.id === lessonId);
  const [detail, setDetail] = useState<LessonDetail | null>(null);
  const [questions, setQuestions] = useState<ServerQuestion[]>([]);
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [error, setError] = useState("");
  const [years, setYears] = useState(20);
  const [rate, setRate] = useState(6);

  useEffect(() => {
    const controller = new AbortController();
    setDetail(null);
    setQuestions([]);
    setAnswers([]);
    setResult(null);
    setError("");
    if (!lesson || !previews.has(lesson.id)) return () => controller.abort();
    api
      .get(`/education/v3/lessons/${lesson.id}`, { signal: controller.signal })
      .then((response) => {
        setDetail(response.data.lesson);
        setQuestions(response.data.lesson.questions || []);
      })
      .catch((failure) => {
        if (!controller.signal.aborted)
          setError(
            failure.response?.data?.error ||
              "The lesson is temporarily unavailable.",
          );
      });
    return () => controller.abort();
  }, [lesson]);

  const total = useMemo(() => 10000 * (1 + rate / 100) ** years, [years, rate]);
  if (!lesson) return <NotFound />;
  if (!previews.has(lesson.id))
    return (
      <div className="public-site public-inner">
        <Header />
        <main className="locked-lesson">
          <p className="kicker">ACADEMY LESSON</p>
          <h1>{lesson.title}</h1>
          <p>{lesson.description}</p>
          <div className="panel">
            <h2>Continue with membership.</h2>
            <p>
              Start a card-required 7-day trial, then continue for $29/month.
              Cancel before renewal.
            </p>
            <Link
              className="button primary"
              to={`/pricing?returnTo=${encodeURIComponent(`/app/learn/${lesson.id}`)}`}
            >
              Start your trial <Icon name="arrow" />
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  if (!detail)
    return (
      <div className="public-site public-inner">
        <Header />
        <main className="locked-lesson">
          <p className="kicker">FREE PREVIEW</p>
          <h1>{lesson.title}</h1>
          <p>{error || "Opening the lesson…"}</p>
        </main>
        <Footer />
      </div>
    );

  async function submit() {
    if (answers.length !== 5 || answers.some((value) => value === undefined)) {
      setError("Answer all five questions first.");
      return;
    }
    setError("");
    try {
      const response = await api.post(
        `/education/v3/lessons/${lessonId}/attempts`,
        { answers, idempotencyKey: crypto.randomUUID() },
      );
      setResult(response.data);
    } catch (failure: any) {
      setError(
        failure.response?.data?.error || "The assessment could not be checked.",
      );
    }
  }

  return (
    <div className="public-site public-inner">
      <Header />
      <main className="preview-reader">
        <nav>
          <Link to="/learn">← All learning paths</Link>
          <span>FREE PREVIEW · {lesson.duration} MIN</span>
        </nav>
        <header>
          <p className="kicker">
            {tracks.find((track) => track.id === lesson.track)?.title}
          </p>
          <h1>{lesson.title}</h1>
          <p>{lesson.description}</p>
        </header>
        <section className="preview-experiment">
          <div>
            <p className="label">WORKED EXPERIMENT</p>
            <h2>
              {lesson.id === "compound-interest"
                ? `$${Math.round(total).toLocaleString()}`
                : detail.takeaway}
            </h2>
            <p>
              {lesson.id === "compound-interest"
                ? "$10,000 with a constant illustrative return. Actual returns vary."
                : "Change an assumption, then explain what the result can and cannot tell you."}
            </p>
          </div>
          {lesson.id === "compound-interest" ? (
            <div className="preview-controls">
              <label>
                Years <strong>{years}</strong>
                <input
                  type="range"
                  min="1"
                  max="40"
                  value={years}
                  onChange={(event) => setYears(Number(event.target.value))}
                />
              </label>
              <label>
                Annual return <strong>{rate}%</strong>
                <input
                  type="range"
                  min="0"
                  max="12"
                  value={rate}
                  onChange={(event) => setRate(Number(event.target.value))}
                />
              </label>
            </div>
          ) : (
            <div className="preview-concept">
              <span />
              <span />
              <span />
              <b>
                {lesson.id === "diversification"
                  ? "Different assets can still share the same risk."
                  : "Goal → horizon → capacity → decision"}
              </b>
            </div>
          )}
        </section>
        <article className="preview-copy">
          {detail.sections.map((section, index) => (
            <section key={section.title}>
              <span>0{index + 1}</span>
              <div>
                <h2>{section.title}</h2>
                <p>{section.text}</p>
              </div>
            </section>
          ))}
          <aside>
            <p className="label">CORE TAKEAWAY</p>
            <p>{detail.takeaway}</p>
          </aside>
        </article>
        <section className="preview-assessment">
          <p className="kicker">CHECK YOUR UNDERSTANDING</p>
          <h2>Reason through the evidence.</h2>
          {questions.map((question, questionIndex) => (
            <fieldset key={question.id} disabled={Boolean(result)}>
              <legend>
                {questionIndex + 1}. {question.prompt}
              </legend>
              {question.options.map((option, optionIndex) => (
                <label key={option}>
                  <input
                    type="radio"
                    name={question.id}
                    checked={answers[questionIndex] === optionIndex}
                    onChange={() =>
                      setAnswers((current) => {
                        const next = [...current];
                        next[questionIndex] = optionIndex;
                        return next;
                      })
                    }
                  />
                  <span>{option}</span>
                </label>
              ))}
              {result && (
                <p className="assessment-explanation">
                  <strong>
                    {result.results[questionIndex]?.correct
                      ? "Correct."
                      : `Best answer: ${String.fromCharCode(65 + (result.results[questionIndex]?.correctOption || 0))}.`}
                  </strong>{" "}
                  {result.results[questionIndex]?.explanation}
                </p>
              )}
            </fieldset>
          ))}
          {error && (
            <p className="status error" role="alert">
              {error}
            </p>
          )}
          {result ? (
            <div
              className={
                result.passed ? "assessment-result passed" : "assessment-result"
              }
            >
              <strong>{result.score}%</strong>
              <div>
                <h3>
                  {result.passed
                    ? "You understand the core idea."
                    : "Review the lesson and try again."}
                </h3>
                <p>
                  Create an account to preserve your preview result and explore
                  membership.
                </p>
                <Link
                  className="button primary"
                  to={`/register?returnTo=${encodeURIComponent(`/app/learn/${lesson.id}`)}`}
                >
                  Save your progress <Icon name="arrow" />
                </Link>
              </div>
            </div>
          ) : (
            questions.length > 0 && (
              <button className="button primary" onClick={submit}>
                Check five answers
              </button>
            )
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}

function Explainer({ kind }: { kind: "practice" | "research" }) {
  const practice = kind === "practice";
  return (
    <div className="public-site public-inner">
      <Header />
      <main>
        <section className="public-page-hero">
          <p className="kicker">
            {practice
              ? "PRACTICE WITHOUT PRETENDING"
              : "RESEARCH WITH HUMILITY"}
          </p>
          <h1>
            {practice ? (
              <>
                Make the decision.
                <br />
                <span>See the consequence.</span>
              </>
            ) : (
              <>
                The future is a range,
                <br />
                <span>not a line.</span>
              </>
            )}
          </h1>
          <p>
            {practice
              ? "Use virtual money across five fictional assets. Move through deterministic market scenarios, then review return, drawdown, concentration, and the reasoning behind each decision."
              : "Build bounded weekly forecasts from historical data. Keep the source cutoff, model assumptions, validation evidence, and uncertainty visible."}
          </p>
          <Link
            className="button primary large"
            to={practice ? "/pricing?returnTo=%2Fapp%2Fpractice%2Fportfolio" : "/register?returnTo=%2Fapp%2Fresearch"}
          >
            {practice ? "Explore membership" : "Create an account for beta"} <Icon name="arrow" />
          </Link>
        </section>
        <section className="public-demo-grid">
          {(practice
            ? [
                [
                  "01",
                  "Choose a scenario",
                  "Steady growth, rate shock, or sell-off and recovery.",
                ],
                [
                  "02",
                  "Record the decision",
                  "Trade fictional assets with explicit assumptions and virtual cash.",
                ],
                [
                  "03",
                  "Review the process",
                  "Inspect the equity path, drawdown, allocation, trades, and reflection.",
                ],
              ]
            : [
                [
                  "01",
                  "Define the question",
                  "Choose a ticker, weekly horizon, and model approach.",
                ],
                [
                  "02",
                  "Inspect the evidence",
                  "Review source cutoff, observations, validation metrics, and intervals.",
                ],
                [
                  "03",
                  "Compare honestly",
                  "Compare models only when they share the same saved data snapshot.",
                ],
              ]
          ).map(([n, title, copy]) => (
            <article key={n}>
              <span>{n}</span>
              <h2>{title}</h2>
              <p>{copy}</p>
            </article>
          ))}
        </section>
        <section className="public-integrity">
          <p className="kicker">DESIGNED TO BE HONEST</p>
          <h2>
            {practice
              ? "Fictional assets. Real decision habits."
              : "A model can be useful and wrong."}
          </h2>
          <p>
            {practice
              ? "No real money, live prices, fees, slippage, or claims about achievable performance. The scenarios are repeatable so the reasoning can be reviewed."
              : "Research is educational, capacity-limited, and never a recommendation. Public examples are saved illustrations and do not consume live forecast capacity."}
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
export function PublicPractice() {
  return <Explainer kind="practice" />;
}
export function PublicResearch() {
  return <Explainer kind="research" />;
}

export function NotFound() {
  return (
    <div className="public-site public-inner">
      <Header />
      <main className="not-found">
        <p className="kicker">404 · OFF THE CHART</p>
        <h1>
          This page moved,
          <br />
          the lesson continues.
        </h1>
        <p>Return to the academy or open your workspace.</p>
        <div>
          <Link className="button primary" to="/learn">
            Explore the academy
          </Link>
          <Link className="button quiet" to="/app">
            Open workspace
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
