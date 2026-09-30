"use client";

import Header from "@/components/Header";
import RegisterForm from "@/components/RegisterForm";
import styles from "./page.module.css";

export default function RegisterPage() {
  return (
    <>
      <Header />
      <main className="flex flex-col items-center justify-center min-h-[75vh] px-8">
        <div className={`${styles.container} w-full max-w-sm`}>
          <h1 className="font-serif text-4xl font-bold text-ink mb-2 text-center">
            Create your account
          </h1>
          <p className="text-sm text-ink-muted text-center mb-10">
            Join Vocabify to build your vocabulary lists
          </p>

          <RegisterForm />
        </div>
      </main>
    </>
  );
}
