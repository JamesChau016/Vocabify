"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import styles from "./Header.module.css";

export default function Header() {
  const router = useRouter();
  const { currentUser, logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <header
      className={`${styles.header} flex items-center justify-between py-6 px-8 border-b border-border`}
    >
      <Link
        href="/"
        className="font-serif text-2xl font-bold tracking-wide text-ink no-underline"
      >
        Vocabify
      </Link>

      <nav className="flex items-center gap-8">
        <Link
          href="/"
          className={`${styles.navLink} text-sm font-medium tracking-widest uppercase text-ink-light no-underline`}
        >
          Home
        </Link>
        <Link
          href="/home"
          className={`${styles.navLink} text-sm font-medium tracking-widest uppercase text-ink-light no-underline`}
        >
          Lists
        </Link>
        {!currentUser ? (
          <Link
            href="/login"
            className="text-sm font-medium tracking-widest uppercase bg-ink text-cream px-5 py-2 rounded-none no-underline hover:bg-accent transition-colors duration-200"
          >
            Login
          </Link>
        ) : (
          <button
            onClick={handleLogout}
            className={`${styles.logoutBtn} text-sm font-medium tracking-widest uppercase bg-transparent text-ink-light border border-border-dark px-5 py-2 rounded-none cursor-pointer`}
          >
            Logout
          </button>
        )}
      </nav>
    </header>
  );
}
