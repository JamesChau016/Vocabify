"use client";

import { useState } from "react";
import type { DueWord, Grade } from "@/types";
import studyService from "@/services/study";
import styles from "./StudySession.module.css";

interface StudySessionProps {
  words: DueWord[];
}

// SM-2 interval preview — mirrors the backend Sm2Algorithm.Apply logic so the
// user sees projected intervals on the grade buttons before tapping. The
// actual interval is whatever the server returns; this is a UI hint only.
function previewInterval(word: DueWord, grade: Grade): string {
  const ease = word.reviewState?.easeFactor ?? 2.5;
  const interval = word.reviewState?.interval ?? 0;
  const reps = word.reviewState?.repetitions ?? 0;

  if (grade === 0) return "1 day";

  const qMap: Record<Grade, number> = { 0: 1, 1: 3, 2: 4, 3: 5 };
  const q = qMap[grade];
  const newEase = Math.max(1.3, ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));

  let newInterval: number;
  if (reps === 0) newInterval = 1;
  else if (reps === 1) newInterval = 6;
  else newInterval = Math.round(interval * newEase);

  if (newInterval === 1) return "1 day";
  return `${newInterval} days`;
}

const GRADE_CONFIG: { grade: Grade; label: string; color: string }[] = [
  { grade: 0, label: "Again", color: "bg-red-900/20 text-red-300 border-red-800/40 hover:bg-red-900/30" },
  { grade: 1, label: "Hard", color: "bg-amber-900/20 text-amber-300 border-amber-800/40 hover:bg-amber-900/30" },
  { grade: 2, label: "Good", color: "bg-emerald-900/20 text-emerald-300 border-emerald-800/40 hover:bg-emerald-900/30" },
  { grade: 3, label: "Easy", color: "bg-blue-900/20 text-blue-300 border-blue-800/40 hover:bg-blue-900/30" },
];

// Study session state machine:
//   Idle --> Active           : start (words.length >= 1)
//   Active/hidden --> Active/revealed : reveal
//   Active/revealed --> Submitting    : grade button pressed
//   Submitting --> Active/hidden      : next word
//   Submitting --> Complete           : last word graded
//   Complete --> Idle                 : restart / exit
type Phase = "idle" | "active" | "complete";

export default function StudySession({ words }: StudySessionProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const total = words.length;

  const start = () => {
    if (total < 1) return;
    setCurrentIndex(0);
    setRevealed(false);
    setSubmitting(false);
    setPhase("active");
  };

  const reveal = () => setRevealed(true);

  const handleGrade = async (grade: Grade) => {
    const currentWord = words[currentIndex];
    setSubmitting(true);

    try {
      await studyService.submitReview(currentWord.id, grade);
    } catch {
      // Review failed — still advance so the session isn't stuck.
      // The word will reappear as due on the next session.
    }

    // Advance to the next word or complete the session.
    if (currentIndex + 1 >= total) {
      setPhase("complete");
    } else {
      setCurrentIndex((prev) => prev + 1);
      setRevealed(false);
    }
    setSubmitting(false);
  };

  const restart = () => {
    setCurrentIndex(0);
    setRevealed(false);
    setSubmitting(false);
    setPhase("idle");
  };

  // ── Idle ────────────────────────────────────────────────────────
  if (phase === "idle") {
    return (
      <div>
        <span className="block text-xs font-medium tracking-widest uppercase text-ink-muted mb-3">
          Study
        </span>
        <button
          onClick={start}
          className="text-sm font-medium tracking-widest uppercase text-ink-light border border-dashed border-border-dark px-6 py-3 bg-transparent cursor-pointer hover:border-accent hover:text-accent transition-colors duration-200"
        >
          ▶ Start Study Session
        </button>
      </div>
    );
  }

  // ── Complete ────────────────────────────────────────────────────
  if (phase === "complete") {
    return (
      <div
        className={`${styles.card} bg-cream-dark border border-border p-8 w-full flex flex-col items-center text-center`}
      >
        <span className="block text-xs font-medium tracking-widest uppercase text-ink-muted mb-3">
          Study Session Complete
        </span>
        <p className="font-serif text-2xl text-ink mb-8">
          You reviewed all {total} {total === 1 ? "word" : "words"}.
        </p>
        <div className="flex gap-3">
          <button
            onClick={start}
            className={`${styles.primaryBtn} bg-ink text-cream text-sm font-medium tracking-widest uppercase px-6 py-3 border-none cursor-pointer hover:bg-accent`}
          >
            Study Again
          </button>
          <button
            onClick={restart}
            className="text-sm font-medium text-ink-muted bg-transparent border-none cursor-pointer hover:text-ink transition-colors duration-200 px-4 py-3"
          >
            Exit
          </button>
        </div>
      </div>
    );
  }

  // ── Active ──────────────────────────────────────────────────────
  const currentWord = words[currentIndex];

  return (
    <div
      className={`${styles.card} bg-cream-dark border border-border p-8 w-full`}
    >
      {/* Progress bar */}
      <div className="flex items-center justify-between mb-6">
        <span className="text-xs font-medium tracking-widest uppercase text-ink-muted">
          Studying
        </span>
        <span className={`${styles.progress} text-sm font-medium text-ink-light`}>
          {currentIndex + 1} / {total}
        </span>
      </div>

      {/* Current term */}
      <div className="flex flex-col items-center text-center py-6">
        <span className="block text-xs font-medium tracking-widest uppercase text-ink-muted mb-3">
          Term
        </span>
        <p className="font-serif text-4xl font-bold text-ink leading-tight mb-8">
          {currentWord.term}
        </p>

        {/* Definition: hidden until reveal */}
        {revealed ? (
          <div className={`${styles.definition} w-full`}>
            <div className="w-8 h-px bg-border-dark mx-auto mb-6" />
            <span className="block text-xs font-medium tracking-widest uppercase text-ink-muted mb-2">
              Definition
            </span>
            {currentWord.definition ? (
              <p className="text-lg text-ink-light leading-relaxed">
                {currentWord.definition}
              </p>
            ) : (
              <p className="text-base italic text-ink-muted">
                No definition available
              </p>
            )}

            {/* Grade buttons — shown only after reveal */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8 w-full">
              {GRADE_CONFIG.map(({ grade, label, color }) => (
                <button
                  key={grade}
                  onClick={() => handleGrade(grade)}
                  disabled={submitting}
                  className={`${color} border rounded-lg px-3 py-3 min-h-[44px] min-w-[44px] flex flex-col items-center justify-center cursor-pointer transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <span className="text-sm font-semibold tracking-wide">
                    {label}
                  </span>
                  <span className="text-xs opacity-70 mt-0.5">
                    {previewInterval(currentWord, grade)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <button
            onClick={reveal}
            className={`${styles.primaryBtn} bg-ink text-cream text-sm font-medium tracking-widest uppercase px-6 py-3 border-none cursor-pointer hover:bg-accent`}
          >
            Reveal Definition
          </button>
        )}
      </div>

      <div className="flex items-center justify-between mt-6">
        <button
          onClick={restart}
          className="text-sm font-medium text-ink-muted bg-transparent border-none cursor-pointer hover:text-ink transition-colors duration-200"
        >
          Exit
        </button>
        {/* Status indicator when submitting */}
        {submitting && (
          <span className="text-xs text-ink-muted animate-pulse">
            Saving...
          </span>
        )}
      </div>
    </div>
  );
}
