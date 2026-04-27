"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Header from "@/components/Header";
import styles from "./page.module.css";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await login({ username, password });
    router.push("/home");
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

            <div className="mb-10">
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

            <button
              type="submit"
              className={`${styles.submitBtn} w-full bg-ink text-cream text-sm font-medium tracking-widest uppercase py-4 border-none cursor-pointer hover:bg-accent`}
            >
              Sign In
            </button>
          </form>
        </div>
      </main>
    </>
  );
}
