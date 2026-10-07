"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import Header from "@/components/Header";
import authService from "@/services/auth";
import styles from "./page.module.css";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login({ username, password });
      router.push("/home");
    } catch {
      setError("Wrong username or password.");
      setSubmitting(false);
    }
  };

  const handleOAuth = async (provider: "google" | "github") => {
    try {
      const url = await authService.getOAuthUrl(provider);
      window.location.href = url;
    } catch {
      setError("Could not start sign-in. Please try again.");
    }
  };

  return (
    <>
      <Header />
      <main className="flex flex-col items-center justify-center min-h-[75vh] px-8">
        <div className={`${styles.container} w-full max-w-sm`}>
          <h1 className="font-serif text-4xl font-bold text-ink mb-2 text-center">
            Welcome back
          </h1>
          <p className="text-sm text-ink-muted text-center mb-10">
            Sign in to your account
          </p>

          {error && (
            <p className="text-sm text-accent text-center mb-6" role="alert">
              {error}
            </p>
          )}

          <form onSubmit={handleSubmit} className={styles.formCard}>
            <div className="mb-8">
              <label className="block text-xs font-medium tracking-widest uppercase text-ink-muted mb-3">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={`${styles.inputField} w-full bg-transparent text-ink py-3 px-0 text-base`}
                placeholder="Enter your username"
              />
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium tracking-widest uppercase text-ink-muted mb-3">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${styles.inputField} w-full bg-transparent text-ink py-3 px-0 text-base`}
                placeholder="Enter your password"
              />
            </div>

            <div className="mb-10 text-right">
              <Link
                href="/forgot-password"
                className="text-xs text-ink-muted no-underline hover:text-accent transition-colors duration-200"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className={`${styles.submitBtn} w-full bg-ink text-cream text-sm font-medium tracking-widest uppercase py-4 border-none cursor-pointer hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {submitting ? "Signing in..." : "Sign In"}
            </button>
          </form>

          {/* OAuth */}
          <div className="mt-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-ink-muted tracking-widest uppercase">or continue with</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => handleOAuth("google")}
                className="w-full border border-border text-ink text-sm font-medium tracking-wide py-3 bg-transparent cursor-pointer hover:border-accent hover:text-accent transition-colors duration-200"
              >
                Google
              </button>
              <button
                onClick={() => handleOAuth("github")}
                className="w-full border border-border text-ink text-sm font-medium tracking-wide py-3 bg-transparent cursor-pointer hover:border-accent hover:text-accent transition-colors duration-200"
              >
                GitHub
              </button>
            </div>
          </div>

          <p className="text-sm text-ink-muted text-center mt-8">
            No account?{" "}
            <Link href="/register" className="text-ink no-underline hover:text-accent transition-colors duration-200">
              Create one
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}
