"use client";

import { useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import authService from "@/services/auth";
import styles from "@/app/login/page.module.css";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);
    try {
      const msg = await authService.forgotPassword(email);
      setMessage(msg);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Header />
      <main className="flex flex-col items-center justify-center min-h-[75vh] px-8">
        <div className={`${styles.container} w-full max-w-sm`}>
          <h1 className="font-serif text-4xl font-bold text-ink mb-2 text-center">
            Reset password
          </h1>
          <p className="text-sm text-ink-muted text-center mb-10">
            Enter your email and we&apos;ll send a reset link
          </p>

          {message ? (
            <div className="text-center">
              <p className="text-sm text-ink-light mb-8">{message}</p>
              <Link
                href="/login"
                className="text-sm font-medium tracking-widest uppercase text-accent no-underline hover:text-ink transition-colors duration-200"
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <p className="text-sm text-accent text-center mb-6" role="alert">
                  {error}
                </p>
              )}

              <form onSubmit={handleSubmit} className={styles.formCard}>
                <div className="mb-10">
                  <label className="block text-xs font-medium tracking-widest uppercase text-ink-muted mb-3">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className={`${styles.inputField} w-full bg-transparent text-ink py-3 px-0 text-base`}
                    placeholder="Enter your email address"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className={`${styles.submitBtn} w-full bg-ink text-cream text-sm font-medium tracking-widest uppercase py-4 border-none cursor-pointer hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {submitting ? "Sending..." : "Send Reset Link"}
                </button>
              </form>

              <p className="text-sm text-ink-muted text-center mt-8">
                <Link href="/login" className="text-ink no-underline hover:text-accent transition-colors duration-200">
                  Back to sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </main>
    </>
  );
}
