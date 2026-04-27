import Link from "next/link";
import Header from "@/components/Header";
import styles from "./page.module.css";

export default function LandingPage() {
  return (
    <>
      <Header />
      <main className="flex flex-col items-center justify-center min-h-[80vh] px-8">
        <div className={`${styles.landing} text-center`}>
          {/* Ornamental line */}
          <div
            className={`${styles.ornament} w-12 h-px bg-ink-muted mx-auto mb-10`}
          />

          <h1
            className={`${styles.title} font-serif text-7xl font-bold tracking-tight text-ink leading-none mb-6`}
          >
            Vocabify
          </h1>

          <p
            className={`${styles.tagline} text-lg font-light text-ink-light max-w-md mx-auto mb-12 leading-relaxed`}
          >
            A quiet place to collect words,
            <br />
            build meaning, and grow your language.
          </p>

          <Link
            href="/home"
            className={`${styles.cta} inline-block bg-ink text-cream text-sm font-medium tracking-widest uppercase px-10 py-4 no-underline hover:bg-accent`}
          >
            Enter
          </Link>

          {/* Bottom ornament */}
          <div
            className={`${styles.ornament} w-12 h-px bg-ink-muted mx-auto mt-16`}
          />
        </div>
      </main>
    </>
  );
}
