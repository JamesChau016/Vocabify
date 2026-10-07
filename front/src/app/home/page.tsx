"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import Header from "@/components/Header";
import ListForm from "@/components/ListForm";
import listService from "@/services/list";
import type { List } from "@/types";
import styles from "./page.module.css";

export default function HomePage() {
  const { currentUser } = useAuth();
  const [lists, setLists] = useState<List[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    listService
      .getAll()
      .then((data) => {
        setLists(data);
        setLoadError(false);
      })
      .catch(() => setLoadError(true));
  }, []);

  const handleListCreated = (newList: List) => {
    setLists((prev) => [...prev, { ...newList, user: currentUser! }]);
  };

  const filtered = search.trim()
    ? lists.filter((l) => {
        const q = search.toLowerCase();
        return (
          l.name.toLowerCase().includes(q) ||
          l.author.toLowerCase().includes(q) ||
          (l.description ?? "").toLowerCase().includes(q)
        );
      })
    : lists;

  if (!currentUser) {
    return (
      <>
        <Header />
        <main className="flex flex-col items-center justify-center min-h-[70vh] px-8">
          <div className={`${styles.container} text-center`}>
            <p className="font-serif text-2xl text-ink-light mb-6">
              Please sign in to view your lists
            </p>
            <Link
              href="/login"
              className="inline-block bg-ink text-cream text-sm font-medium tracking-widest uppercase px-8 py-3 no-underline hover:bg-accent transition-colors duration-200"
            >
              Sign In
            </Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="px-8 py-12">
        {/* Welcome */}
        <div className={styles.welcome}>
          <h1 className="font-serif text-4xl font-bold text-ink mb-1">
            Hello, {currentUser.name}
          </h1>
          <p className="text-sm text-ink-muted mb-10">
            Your vocabulary lists
          </p>
        </div>

        {/* Create form */}
        <div className={`${styles.formSection} mb-12`}>
          <ListForm onCreated={handleListCreated} />
        </div>

        {/* Search */}
        {lists.length > 0 && (
          <div className="mb-8">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search lists..."
              className="w-full bg-transparent border-b border-border-dark text-ink py-2 text-base focus:outline-none focus:border-accent placeholder:text-ink-muted"
            />
          </div>
        )}

        {/* Lists */}
        <div className={styles.listSection}>
          {loadError ? (
            <div className={`${styles.emptyState} text-center py-16`}>
              <p className="text-accent text-sm">Could not load lists</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className={`${styles.emptyState} text-center py-16`}>
              <p className="text-ink-muted text-sm">
                {search.trim() ? "No lists match your search." : "No lists yet. Create your first one above."}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-0">
              {filtered.map((l) => (
                <div
                  key={l.id}
                  className={`${styles.listItem} border-b border-border py-5`}
                >
                  <Link
                    href={`/home/lists/${l.id}`}
                    className={`${styles.listLink} flex items-baseline justify-between no-underline text-ink`}
                  >
                    <span className="font-serif text-xl font-semibold">
                      {l.name}
                    </span>
                    <span className="text-xs text-ink-muted tracking-wide uppercase">
                      {l.author}
                    </span>
                  </Link>
                  {l.description && (
                    <p className="text-sm text-ink-light mt-1">
                      {l.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
