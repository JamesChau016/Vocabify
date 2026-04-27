"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import listService from "@/services/list";
import type { List } from "@/types";
import styles from "./page.module.css";

export default function ListDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [list, setList] = useState<List | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listService.getAll().then((lists: List[]) => {
      const found = lists.find((l) => l.id === id) ?? null;
      setList(found);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <>
        <Header />
        <main className="flex items-center justify-center min-h-[60vh]">
          <p className="text-sm text-ink-muted tracking-widest uppercase animate-pulse">
            Loading...
          </p>
        </main>
      </>
    );
  }

  if (!list) {
    return (
      <>
        <Header />
        <main className={`${styles.notFound} flex flex-col items-center justify-center min-h-[60vh] px-8`}>
          <p className="font-serif text-2xl text-ink-light mb-6">
            List not found
          </p>
          <Link
            href="/home"
            className="text-sm font-medium tracking-widest uppercase text-accent no-underline hover:text-ink transition-colors duration-200"
          >
            &larr; Back to lists
          </Link>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="px-8 py-12">
        <div className={styles.container}>
          {/* Back link */}
          <Link
            href="/home"
            className={`${styles.backLink} inline-flex items-center gap-2 text-sm text-ink-muted no-underline mb-8 tracking-wide uppercase`}
          >
            &larr; All lists
          </Link>

          {/* Detail card */}
          <div className={styles.detailCard}>
            <h1 className="font-serif text-5xl font-bold text-ink leading-tight mb-2">
              {list.name}
            </h1>
            <p className="text-sm text-ink-muted mb-8">
              by{" "}
              <span className="text-ink-light font-medium">{list.author}</span>
            </p>

            <div className={`${styles.meta} flex flex-col gap-6`}>
              {/* Divider */}
              <div className="w-8 h-px bg-border-dark" />

              {list.description && (
                <div>
                  <span className="block text-xs font-medium tracking-widest uppercase text-ink-muted mb-1">
                    Description
                  </span>
                  <p className="text-base text-ink-light leading-relaxed">
                    {list.description}
                  </p>
                </div>
              )}

              <div>
                <span className="block text-xs font-medium tracking-widest uppercase text-ink-muted mb-1">
                  Created
                </span>
                <p className="text-base text-ink-light">{list.dateCreated}</p>
              </div>

              {/* Words section placeholder */}
              {list.list && list.list.length > 0 && (
                <div>
                  <span className="block text-xs font-medium tracking-widest uppercase text-ink-muted mb-3">
                    Words
                  </span>
                  <div className="flex flex-col gap-0">
                    {list.list.map((word) => (
                      <div
                        key={word.id}
                        className="flex items-baseline justify-between border-b border-border py-3"
                      >
                        <span className="font-serif text-lg font-semibold text-ink">
                          {word.term}
                        </span>
                        <span className="text-sm text-ink-light ml-6">
                          {word.definition}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
