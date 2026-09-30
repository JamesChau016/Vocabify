"use client";

import { useState } from "react";
import type { Word } from "@/types";
import styles from "./StudySession.module.css";

interface StudySessionProps {
  words: Word[];
}

// Study session state machine (design.md):
//   Idle --> Showing        : start (words.length >= 1)
//   Showing --> Revealed     : reveal
//   Showing --> Showing      : next (more words remain)
//   Revealed --> Showing     : next (more words remain)
//   Showing/Revealed --> Complete : next (no words remain)
//   Complete --> Idle        : restart / exit
//
// Ephemeral, client-only UI state over the already-fetched words array.
// The presented order is the array order (insertion order). No API calls.
type Phase = "idle" | "active" | "complete";

export default function StudySession({ words }: StudySessionProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const total = words.length;

  const start = () => {
    if (total < 1) return; // Showing only reachable when words.length >= 1
    setCurrentIndex(0);
    setRevealed(false);
    setPhase("active");
  };

  const reveal = () => setRevealed(true);

  const next = () => {
    // Advancing past the last word completes the session.
    if (currentIndex + 1 >= total) {
      setPhase("complete");
      return;
    }
    // Present the next word in order with its definition hidden again.
    setCurrentIndex((prev) => prev + 1);
    setRevealed(false);
  };

  const restart = () => {
    setCurrentIndex(0);
    setRevealed(false);
    setPhase("idle");
  };

  // Idle: offer the control to start a study session.
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

  // Complete: indicate completion and offer restart / exit.
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

  // Active: present the current word.
  const currentWord = words[currentIndex];
  const isLast = currentIndex + 1 >= total;

  return (
    <div
      className={`${styles.card} bg-cream-dark border border-border p-8 w-full`}
    >
      {/* Position of the current word and total word count. */}
      <div className="flex items-center justify-between mb-6">
        <span className="text-xs font-medium tracking-widest uppercase text-ink-muted">
          Studying
        </span>
        <span className={`${styles.progress} text-sm font-medium text-ink-light`}>
          {currentIndex + 1} / {total}
        </span>
      </div>

      {/* Current term is always shown. */}
      <div className="flex flex-col items-center text-center py-6">
        <span className="block text-xs font-medium tracking-widest uppercase text-ink-muted mb-3">
          Term
        </span>
        <p className="font-serif text-4xl font-bold text-ink leading-tight mb-8">
          {currentWord.term}
        </p>

        {/* Definition stays hidden until the reveal action. */}
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
        <button
          onClick={next}
          className={`${styles.primaryBtn} bg-ink text-cream text-sm font-medium tracking-widest uppercase px-6 py-3 border-none cursor-pointer hover:bg-accent`}
        >
          {isLast ? "Finish" : "Next Word →"}
        </button>
      </div>
    </div>
  );
}
