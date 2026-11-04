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
import type { List, Word, DueWord } from "@/types";
import styles from "./page.module.css";

export default function ListDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { currentUser } = useAuth();
  const [list, setList] = useState<List | null>(null);
  const [status, setStatus] = useState<"loading" | "loaded" | "not-found">(
    "loading"
  );
  const [editingWordId, setEditingWordId] = useState<string | null>(null);
  const [editTerm, setEditTerm] = useState("");
  const [editDefinition, setEditDefinition] = useState("");
  const [wordError, setWordError] = useState<string | null>(null);
  const [wordSaving, setWordSaving] = useState(false);

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

  const startEditWord = (word: Word) => {
    setEditingWordId(word.id);
    setEditTerm(word.term);
    setEditDefinition(word.definition ?? "");
    setWordError(null);
  };

  const cancelEditWord = () => {
    setEditingWordId(null);
    setWordError(null);
  };

  const saveEditWord = async (wordId: string) => {
    if (!list) return;
    if (editTerm.trim() === "") {
      setWordError("Term cannot be empty.");
      return;
    }
    setWordSaving(true);
    setWordError(null);
    try {
      const updated: List = await listService.updateWord(list.id, wordId, {
        term: editTerm.trim(),
        definition: editDefinition.trim() || undefined,
      });
      setList(updated);
      setEditingWordId(null);
    } catch {
      setWordError("Could not save. Please try again.");
    } finally {
      setWordSaving(false);
    }
  };

  const handleDeleteWord = async (wordId: string) => {
    if (!list) return;
    try {
      await listService.deleteWord(list.id, wordId);
      setList((prev) =>
        prev ? { ...prev, list: prev.list.filter((w) => w.id !== wordId) } : prev
      );
    } catch {
      // silently ignore — word stays in UI
    }
  };

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

              {/* Words section */}
              {list.list && list.list.length > 0 && (
                <div>
                  <span className="block text-xs font-medium tracking-widest uppercase text-ink-muted mb-3">
                    Words
                  </span>
                  {wordError && editingWordId === null && (
                    <p className="text-sm text-accent mb-3" role="alert">{wordError}</p>
                  )}
                  <div className="flex flex-col gap-0">
                    {list.list.map((word) =>
                      isOwner && editingWordId === word.id ? (
                        <div key={word.id} className="border-b border-border py-3 flex flex-col gap-2">
                          <div className="flex gap-3 items-end">
                            <div className="flex-1">
                              <label className="block text-xs font-medium tracking-widest uppercase text-ink-muted mb-1">Term</label>
                              <input
                                value={editTerm}
                                onChange={(e) => setEditTerm(e.target.value)}
                                className="w-full bg-transparent border-b border-border-dark text-ink py-1 text-base focus:outline-none focus:border-accent"
                                autoFocus
                              />
                            </div>
                            <div className="flex-1">
                              <label className="block text-xs font-medium tracking-widest uppercase text-ink-muted mb-1">Definition</label>
                              <input
                                value={editDefinition}
                                onChange={(e) => setEditDefinition(e.target.value)}
                                className="w-full bg-transparent border-b border-border-dark text-ink py-1 text-base focus:outline-none focus:border-accent"
                                placeholder="Optional"
                              />
                            </div>
                          </div>
                          {wordError && (
                            <p className="text-xs text-accent" role="alert">{wordError}</p>
                          )}
                          <div className="flex gap-3 mt-1">
                            <button
                              onClick={() => saveEditWord(word.id)}
                              disabled={wordSaving}
                              className="text-xs font-medium tracking-widest uppercase text-cream bg-ink px-4 py-1.5 border-none cursor-pointer hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                            >
                              {wordSaving ? "Saving..." : "Save"}
                            </button>
                            <button
                              onClick={cancelEditWord}
                              className="text-xs font-medium text-ink-muted bg-transparent border-none cursor-pointer hover:text-ink transition-colors duration-200"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          key={word.id}
                          className="flex items-baseline justify-between border-b border-border py-3 group"
                        >
                          <span className="font-serif text-lg font-semibold text-ink">
                            {word.term}
                          </span>
                          <div className="flex items-baseline gap-4 ml-6">
                            {word.definition && (
                              <span className="text-sm text-ink-light">
                                {word.definition}
                              </span>
                            )}
                            {isOwner && (
                              <span className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                                <button
                                  onClick={() => startEditWord(word)}
                                  className="text-xs text-ink-muted bg-transparent border-none cursor-pointer hover:text-accent transition-colors duration-200"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteWord(word.id)}
                                  className="text-xs text-ink-muted bg-transparent border-none cursor-pointer hover:text-accent transition-colors duration-200"
                                >
                                  Delete
                                </button>
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Study session — available to ANY user, not owner-only.
                  When the list has no words, suppress the start control and
                  show a "no words yet" message. Otherwise render the
                  StudySession, whose start control presents words one at a
                  time. */}
              {list.list && list.list.length > 0 ? (
                <StudySession
                  words={list.list.map((w): DueWord => ({
                    id: w.id,
                    term: w.term,
                    definition: w.definition,
                    listId: list.id,
                    reviewState: null,
                  }))}
                />
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
