import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import { lessons, tracks } from "./curriculumCatalog";
import { useLearningStore } from "./learningStore";
import { Icon } from "./Icons";

export default function Progress() {
  const completed = useLearningStore((state) => state.completed),
    exercises = useLearningStore((state) => state.exercises),
    sync = useLearningStore((state) => state.syncStatus),
    [mastery, setMastery] = useState<
      Record<string, { score: number; masteredAt: string }>
    >({}),
    [masteryError, setMasteryError] = useState(false),
    [shareMessage, setShareMessage] = useState("");
  useEffect(() => {
    let active = true;
    api
      .get("/education/v3/progress")
      .then((response) => {
        if (!active) return;
        setMastery(
          Object.fromEntries(
            (response.data.mastery || []).map((item: any) => [
              item.lessonId,
              item,
            ]),
          ),
        );
      })
      .catch(() => {
        if (active) setMasteryError(true);
      });
    return () => {
      active = false;
    };
  }, []);
  const done = lessons.filter((lesson) => completed[lesson.id]),
    mastered = lessons.filter((lesson) => mastery[lesson.id]),
    needsExercise = lessons.find(
      (lesson) => completed[lesson.id] && !exercises[lesson.id],
    ),
    needsAssessment = lessons.find(
      (lesson) => exercises[lesson.id] && !mastery[lesson.id],
    ),
    next =
      needsExercise ||
      needsAssessment ||
      lessons.find((lesson) => !completed[lesson.id]) ||
      lessons[0],
    average = done.length
      ? Math.round(
          done.reduce((sum, lesson) => sum + completed[lesson.id].score, 0) /
            done.length,
        )
      : 0;
  const reason =
    needsExercise?.id === next.id
      ? "Your assessment is recorded; complete the applied challenge to verify mastery."
      : needsAssessment?.id === next.id
        ? "Your applied challenge is saved; pass the five-question assessment to verify mastery."
        : `This is the next unfinished concept in your current path.`;
  async function shareProgress() {
    const text = `I’ve verified ${mastered.length} of ${lessons.length} investing lessons with PerBillion.`;
    const url = `${location.origin}/learn`;
    try {
      if (navigator.share) await navigator.share({ title: "My PerBillion learning progress", text, url });
      else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        setShareMessage("Share summary copied.");
      }
    } catch (error) {
      if ((error as DOMException)?.name !== "AbortError") setShareMessage("Sharing is unavailable on this device.");
    }
  }
  return (
    <div className="product-page progress-page">
      <header className="product-head">
        <div>
          <p className="kicker">PROGRESS</p>
          <h1>See what you understand.</h1>
          <p>Prior completion and verified mastery stay distinct.</p>
        </div>
        <div className="progress-share">
          <span className={`sync-pill ${sync}`}>
            {sync === "synced"
              ? "Synced to account"
              : sync === "offline"
                ? "Saved · sync pending"
                : "Syncing…"}
          </span>
          <button className="button quiet" type="button" onClick={() => void shareProgress()} disabled={!mastered.length}>
            Share summary <Icon name="arrow" size={14} />
          </button>
          <small aria-live="polite">{shareMessage}</small>
        </div>
      </header>
      {masteryError && (
        <p className="status error" role="alert">
          Verified mastery is temporarily unavailable. Prior completions remain
          visible.
        </p>
      )}
      <section className="progress-hero">
        <div>
          <p className="label">RECOMMENDED NEXT</p>
          <h2>{next.title}</h2>
          <p>{reason}</p>
          <Link className="button primary" to={`/app/learn/${next.id}`}>
            Continue learning <Icon name="arrow" />
          </Link>
        </div>
        <div className="progress-number">
          <strong>
            {Math.round((mastered.length / lessons.length) * 100)}%
          </strong>
          <span>
            {mastered.length} of {lessons.length} verified masteries
          </span>
        </div>
        <div>
          <span>Prior completions</span>
          <b>
            {done.length}/{lessons.length}
          </b>
          <span>Average recorded score</span>
          <b>{done.length ? `${average}%` : "—"}</b>
          <span>Applied challenges</span>
          <b>
            {Object.keys(exercises).length}/{lessons.length}
          </b>
        </div>
      </section>
      <section className="track-progress-list">
        <header>
          <p className="label">LEARNING PATH</p>
          <h2>Four tracks. Your pace.</h2>
        </header>
        {tracks.map((track) => {
          const list = lessons.filter((lesson) => lesson.track === track.id),
            count = list.filter((lesson) => mastery[lesson.id]).length;
          return (
            <Link key={track.id} to={`/app/learn?track=${track.id}`}>
              <span>{track.level}</span>
              <div>
                <b>{track.title}</b>
                <small>{track.subtitle} · verified mastery</small>
              </div>
              <i>
                <b style={{ width: `${(count / list.length) * 100}%` }} />
              </i>
              <strong>
                {count}/{list.length}
              </strong>
              <Icon name="arrow" />
            </Link>
          );
        })}
      </section>
      <section className="completed-lessons">
        <header>
          <p className="label">YOUR LEARNING RECORD</p>
          <h2>What is complete—and what needs review.</h2>
        </header>
        {done.length ? (
          done.map((lesson) => (
            <Link key={lesson.id} to={`/app/learn/${lesson.id}`}>
              <Icon name={mastery[lesson.id] ? "check" : "book"} />
              <span>
                <b>{lesson.title}</b>
                <small>
                  {mastery[lesson.id]
                    ? "Verified mastery"
                    : exercises[lesson.id]
                      ? "Challenge complete · assessment needed"
                      : "Prior completion · challenge still open"}{" "}
                  ·{" "}
                  {new Date(
                    completed[lesson.id].completedAt,
                  ).toLocaleDateString()}
                </small>
              </span>
              <strong>
                {mastery[lesson.id]?.score ?? completed[lesson.id].score}%
              </strong>
              <Icon name="chevron" />
            </Link>
          ))
        ) : (
          <div className="empty-state">
            <Icon name="book" />
            <h3>One short lesson is enough to begin.</h3>
            <Link to={`/app/learn/${next.id}`}>Take the first step</Link>
          </div>
        )}
      </section>
    </div>
  );
}
