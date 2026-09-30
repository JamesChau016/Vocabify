"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import AddWordsForm from "@/components/AddWordsForm";
import EditListForm from "@/components/EditListForm";
import DeleteListControl from "@/components/DeleteListControl";
import StudySession from "@/components/StudySession";
import listService from "@/services/list";
import { useAuth } from "@/context/AuthContext";
import type { List } from "@/types";
import styles from "./page.module.css";

export default function ListDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { currentUser } = useAuth();
  const [list, setList] = useState<List | null>(null);
  const [status, setStatus] = useState<"loading" | "loaded" | "not-found">(
    "loading"
  );

  useEffect(() => {
    setStatus("loading");
    listService
      .getById(id)
      .then((found: List) => {
        setList(found);
        setStatus("loaded");
      })
      .catch(() => {
        setList(null);
        setStatus("not-found");
      });
  }, [id]);

  if (status === "loading") {
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

  if (status === "not-found" || !list) {
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

  const isOwner = Boolean(
    currentUser && list.user && currentUser.username === list.user.username
  );

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
                        {word.definition && (
                          <span className="text-sm text-ink-light ml-6">
                            {word.definition}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Study session — available to ANY user, not owner-only.
                  When the list has no words, suppress the start control and
                  show a "no words yet" message. Otherwise render the
                  StudySession, whose start control presents words one at a
                  time. */}
              {list.list && list.list.length > 0 ? (
                <StudySession words={list.list} />
              ) : (
                <div>
                  <span className="block text-xs font-medium tracking-widest uppercase text-ink-muted mb-1">
                    Study
                  </span>
                  <p className="text-base text-ink-light leading-relaxed">
                    This list has no words yet.
                  </p>
                </div>
              )}

              {/* Owner-only: edit list name and description*/}
              {isOwner && (
                <div>
                  <EditListForm
                    list={list}
                    onUpdated={(updatedList) =>
                      setList((prev) =>
                        prev ? { ...prev, ...updatedList } : updatedList
                      )
                    }
                  />
                </div>
              )}

              {/* Owner-only: add words to this list */}
              {isOwner && (
                <div>
                  <AddWordsForm
                    listId={list.id}
                    onWordsAdded={(updatedList) => setList(updatedList)}
                  />
                </div>
              )}

              {/* Owner-only: delete this list. On success the
                  single-list detail view no longer has a list to show, so we
                  navigate back to /home without a manual reload. */}
              {isOwner && (
                <div>
                  <DeleteListControl
                    listId={list.id}
                    onDeleted={() => router.push("/home")}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
