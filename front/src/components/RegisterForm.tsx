"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import styles from "@/app/register/page.module.css";

export default function RegisterForm() {
  const router = useRouter();
  const { register } = useAuth();
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    try {
      await register({ username, name, password });
      router.push("/login");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ?? "Registration failed. Please try again.";
      setError(message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.formCard}>
      {error && (
        <p className="text-sm text-accent mb-6 text-center" role="alert">
          {error}
        </p>
      )}

      <div className="mb-8">
        <label className="block text-xs font-medium tracking-widest uppercase text-ink-muted mb-3">
          Username
        </label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className={`${styles.inputField} w-full bg-transparent text-ink py-3 px-0 text-base`}
          placeholder="Choose a username"
        />
      </div>

      <div className="mb-8">
        <label className="block text-xs font-medium tracking-widest uppercase text-ink-muted mb-3">
          Display Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={`${styles.inputField} w-full bg-transparent text-ink py-3 px-0 text-base`}
          placeholder="Enter your display name"
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
          placeholder="Choose a password"
        />
      </div>

      <button
        type="submit"
        className={`${styles.submitBtn} w-full bg-ink text-cream text-sm font-medium tracking-widest uppercase py-4 border-none cursor-pointer hover:bg-accent`}
      >
        Create Account
      </button>
    </form>
  );
}
