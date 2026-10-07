"use client";

import { useState, useRef, useEffect } from "react";
import listService from "@/services/list";
import { lookupWord, suggestWords } from "@/services/dictionary";
import type { List, Word } from "@/types";
import styles from "./AddWordsForm.module.css";

interface AddWordsFormProps {
  listId: string;
  onWordsAdded: (updatedList: List) => void;
}

interface WordRow {
  term: string;
  definition: string;
  autoFilled: boolean;
}

const MAX_WORDS = 100;
const DEBOUNCE_MS = 400;
const MIN_TERM_LENGTH = 2;

const emptyRow = (): WordRow => ({ term: "", definition: "", autoFilled: false });

export default function AddWordsForm({ listId, onWordsAdded }: AddWordsFormProps) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<WordRow[]>([emptyRow()]);
  const [lookingUp, setLookingUp] = useState<boolean[]>([false]);

  // Suggestion dropdown — only one open at a time
  const [suggestionRowIndex, setSuggestionRowIndex] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Cancel pending requests on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, []);

  const closeDropdown = () => {
    setSuggestionRowIndex(null);
    setSuggestions([]);
    setHighlightedIndex(0);
  };

  const cancelPending = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    abortRef.current?.abort();
    abortRef.current = null;
  };

  const reset = () => {
    cancelPending();
    closeDropdown();
    setRows([emptyRow()]);
    setLookingUp([false]);
    setError(null);
    setSubmitting(false);
  };

  // ── Term field handlers ──────────────────────────────────────────────────

  const handleTermChange = (index: number, value: string) => {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, term: value } : row))
    );

    cancelPending();
    closeDropdown();

    if (value.trim().length < MIN_TERM_LENGTH) return;

    const controller = new AbortController();
    abortRef.current = controller;

    debounceRef.current = setTimeout(async () => {
      const words = await suggestWords(value.trim(), controller.signal);
      if (words.length > 0) {
        setSuggestions(words);
        setSuggestionRowIndex(index);
        setHighlightedIndex(0);
      }
    }, DEBOUNCE_MS);
  };

  const handleTermKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number
  ) => {
    const isOpen = suggestionRowIndex === index && suggestions.length > 0;
    if (!isOpen) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      void selectSuggestion(index, suggestions[highlightedIndex]);
    } else if (e.key === "Escape") {
      closeDropdown();
    }
  };

  // Delay closing so a mousedown on a dropdown item isn't lost to blur
  const handleTermBlur = async (index: number) => {
    setTimeout(() => closeDropdown(), 150);

    // Keep existing onBlur auto-fill: if definition is still empty, look up
    const { term, definition } = rows[index];
    if (!term.trim() || definition.trim()) return;

    setLookingUp((prev) => prev.map((v, i) => (i === index ? true : v)));
    const result = await lookupWord(term);
    setLookingUp((prev) => prev.map((v, i) => (i === index ? false : v)));

    if (result) {
      setRows((prev) =>
        prev.map((row, i) =>
          i === index && !row.definition.trim()
            ? {
                ...row,
                definition: result.partOfSpeech
                  ? `(${result.partOfSpeech}) ${result.definition}`
                  : result.definition,
                autoFilled: true,
              }
            : row
        )
      );
    }
  };

  // ── Suggestion selection ─────────────────────────────────────────────────

  const selectSuggestion = async (rowIndex: number, word: string) => {
    cancelPending();
    closeDropdown();

    // Fill the term immediately
    setRows((prev) =>
      prev.map((row, i) => (i === rowIndex ? { ...row, term: word } : row))
    );

    // Auto-fetch definition for the selected word
    setLookingUp((prev) => prev.map((v, i) => (i === rowIndex ? true : v)));
    const result = await lookupWord(word);
    setLookingUp((prev) => prev.map((v, i) => (i === rowIndex ? false : v)));

    if (result) {
      setRows((prev) =>
        prev.map((row, i) =>
          i === rowIndex && !row.definition.trim()
            ? {
                ...row,
                term: word,
                definition: result.partOfSpeech
                  ? `(${result.partOfSpeech}) ${result.definition}`
                  : result.definition,
                autoFilled: true,
              }
            : { ...row, term: word }
        )
      );
    }
  };

  // ── Definition field handler ─────────────────────────────────────────────

  const handleDefinitionChange = (index: number, value: string) => {
    setRows((prev) =>
      prev.map((row, i) =>
        i === index ? { ...row, definition: value, autoFilled: false } : row
      )
    );
  };

  // ── Row management ───────────────────────────────────────────────────────

  const addRow = () => {
    if (rows.length >= MAX_WORDS) return;
    setRows((prev) => [...prev, emptyRow()]);
    setLookingUp((prev) => [...prev, false]);
  };

  const removeRow = (index: number) => {
    if (rows.length <= 1) return;
    if (suggestionRowIndex === index) closeDropdown();
    setRows((prev) => prev.filter((_, i) => i !== index));
    setLookingUp((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Submit ───────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const invalidIndex = rows.findIndex((row) => row.term.trim() === "");
    if (invalidIndex !== -1) {
      setError(
        `Word ${invalidIndex + 1} is missing a term. Every word needs a term before you can add it.`
      );
      return;
    }

    if (rows.length < 1 || rows.length > MAX_WORDS) {
      setError(`You can add between 1 and ${MAX_WORDS} words at a time.`);
      return;
    }

    const words = rows.map((row) => {
      const trimmedDef = row.definition.trim();
      const word: Pick<Word, "term" | "definition"> = { term: row.term.trim() };
      if (trimmedDef) word.definition = trimmedDef;
      return word;
    });

    setSubmitting(true);
    setError(null);
    try {
      const updated: List = await listService.newWords(listId, words as Word[]);
      onWordsAdded(updated);
      reset();
      setOpen(false);
    } catch {
      setError("Could not add the words. Please try again.");
      setSubmitting(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm font-medium tracking-widest uppercase text-ink-light border border-dashed border-border-dark px-6 py-3 bg-transparent cursor-pointer hover:border-accent hover:text-accent transition-colors duration-200"
      >
        + Add Words
      </button>
    );
  }

  return (
    <div className={`${styles.formCard} bg-cream-dark border border-border p-8 w-full`}>
      <h3 className="font-serif text-xl font-semibold text-ink mb-2">
        Add words to this list
      </h3>
      <p className="text-xs text-ink-muted mb-6">
        Definitions are looked up automatically — you can edit them before adding.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-5">
          {rows.map((row, index) => {
            const dropdownOpen = suggestionRowIndex === index && suggestions.length > 0;
            return (
              <div key={index} className={`${styles.wordRow} flex gap-4 items-end`}>
                <span className="text-xs font-medium text-ink-muted pb-2 w-6 shrink-0">
                  {index + 1}.
                </span>

                {/* Term column */}
                <div className={`${styles.termWrapper} flex-1`}>
                  <label className="block text-xs font-medium tracking-widest uppercase text-ink-muted mb-2">
                    Term
                  </label>
                  <input
                    value={row.term}
                    onChange={(e) => handleTermChange(index, e.target.value)}
                    onKeyDown={(e) => handleTermKeyDown(e, index)}
                    onBlur={() => handleTermBlur(index)}
                    className={`${styles.inputField} w-full bg-transparent text-ink py-2 px-0 text-base`}
                    placeholder="e.g. Ephemeral"
                    aria-autocomplete="list"
                    aria-expanded={dropdownOpen}
                    aria-controls={dropdownOpen ? `suggestions-${index}` : undefined}
                  />

                  {dropdownOpen && (
                    <ul
                      id={`suggestions-${index}`}
                      role="listbox"
                      className={styles.dropdown}
                    >
                      {suggestions.map((word, i) => (
                        <li
                          key={word}
                          role="option"
                          aria-selected={i === highlightedIndex}
                          onMouseDown={() => void selectSuggestion(index, word)}
                          onMouseEnter={() => setHighlightedIndex(i)}
                          className={`${styles.dropdownItem} ${i === highlightedIndex ? styles.dropdownItemActive : ""}`}
                        >
                          <span className={styles.dropdownTerm}>{word}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Definition column */}
                <div className="flex-1">
                  <label className="block text-xs font-medium tracking-widest uppercase text-ink-muted mb-2 flex items-center gap-2">
                    Definition
                    {row.autoFilled && (
                      <span className="text-xs font-normal normal-case tracking-normal text-accent opacity-70">
                        auto
                      </span>
                    )}
                  </label>
                  <input
                    value={lookingUp[index] ? "" : row.definition}
                    onChange={(e) => handleDefinitionChange(index, e.target.value)}
                    disabled={lookingUp[index]}
                    className={`${styles.inputField} w-full bg-transparent text-ink py-2 px-0 text-base disabled:opacity-50`}
                    placeholder={lookingUp[index] ? "Looking up..." : "Optional"}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => removeRow(index)}
                  disabled={rows.length <= 1}
                  aria-label={`Remove word ${index + 1}`}
                  className="text-sm font-medium text-ink-muted bg-transparent border-none cursor-pointer hover:text-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-200 pb-2"
                >
                  &times;
                </button>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={addRow}
          disabled={rows.length >= MAX_WORDS}
          className="mt-5 text-sm font-medium tracking-wide text-ink-light bg-transparent border-none cursor-pointer hover:text-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-200"
        >
          + Add another word
        </button>

        {error && (
          <p className={`${styles.error} text-sm text-accent mt-6`} role="alert">
            {error}
          </p>
        )}

        <div className="flex gap-3 mt-8">
          <button
            type="submit"
            disabled={submitting}
            className={`${styles.submitBtn} bg-ink text-cream text-sm font-medium tracking-widest uppercase px-6 py-3 border-none cursor-pointer hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {submitting ? "Adding..." : "Add Words"}
          </button>
          <button
            type="button"
            onClick={() => { reset(); setOpen(false); }}
            className="text-sm font-medium text-ink-muted bg-transparent border-none cursor-pointer hover:text-ink transition-colors duration-200 px-4 py-3"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
