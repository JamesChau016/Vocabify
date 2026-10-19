"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import authService from "@/services/auth";
import styles from "@/app/login/page.module.css";

function ResetPasswordForm() {
  const params = useSearchParams();
  const tokenId = params.get("id");
  const token = params.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!tokenId || !token) setError("Invalid reset link.");
  }, [tokenId, token]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const msg = await authService.resetPassword(tokenId!, token!, newPassword);
      setMessage(msg);
    } catch {
      setError("Invalid or expired reset link. Please request a new one.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-[75vh] px-8">
      <div className={`${styles.container} w-full max-w-sm`}>
          <h1 className="font-serif text-4xl font-bold text-ink mb-2 text-center">
            New password
          </h1>
          <p className="text-sm text-ink-muted text-center mb-10">
            Choose a strong password for your account
          </p>

          {message ? (
            <div className="text-center">
              <p className="text-sm text-ink-light mb-8">{message}</p>
              <Link
                href="/login"
                className="text-sm font-medium tracking-widest uppercase text-accent no-underline hover:text-ink transition-colors duration-200"
              >
                Sign in
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
                <div className="mb-8">
                  <label className="block text-xs font-medium tracking-widest uppercase text-ink-muted mb-3">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={!tokenId || !token}
                    className={`${styles.inputField} w-full bg-transparent text-ink py-3 px-0 text-base disabled:opacity-50`}
                    placeholder="At least 8 characters"
                  />
                </div>

                <div className="mb-10">
                  <label className="block text-xs font-medium tracking-widest uppercase text-ink-muted mb-3">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    disabled={!tokenId || !token}
                    className={`${styles.inputField} w-full bg-transparent text-ink py-3 px-0 text-base disabled:opacity-50`}
                    placeholder="Repeat your password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting || !tokenId || !token}
                  className={`${styles.submitBtn} w-full bg-ink text-cream text-sm font-medium tracking-widest uppercase py-4 border-none cursor-pointer hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {submitting ? "Saving..." : "Set New Password"}
                </button>
              </form>
            </>
          )}
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <>
      <Header />
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </>
  );
}
