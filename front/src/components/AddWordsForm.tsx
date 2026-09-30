"use client";

import { useState } from "react";
import listService from "@/services/list";
import type { List, Word } from "@/types";
import styles from "./AddWordsForm.module.css";

interface AddWordsFormProps {
  listId: string;
  onWordsAdded: (updatedList: List) => void;
}

interface WordRow {
  term: string;
  definition: string;
}

const MAX_WORDS = 100;

const emptyRow = (): WordRow => ({ term: "", definition: "" });

export default function AddWordsForm({
  listId,
  onWordsAdded,
}: AddWordsFormProps) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<WordRow[]>([emptyRow()]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setRows([emptyRow()]);
    setError(null);
    setSubmitting(false);
  };

  const updateRow = (index: number, field: keyof WordRow, value: string) => {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  };

  const addRow = () => {
    setRows((prev) =>
      prev.length >= MAX_WORDS ? prev : [...prev, emptyRow()]
    );
  };

  const removeRow = (index: number) => {
    setRows((prev) =>
      prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Client validation: reject any empty/whitespace-only term and
    // identify the offending word by its row number WITHOUT calling the API.
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
      const trimmedDefinition = row.definition.trim();
      const word: Pick<Word, "term" | "definition"> = {
        term: row.term.trim(),
      };
      if (trimmedDefinition !== "") {
        word.definition = trimmedDefinition;
      }
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
    <div
      className={`${styles.formCard} bg-cream-dark border border-border p-8 w-full`}
    >
      <h3 className="font-serif text-xl font-semibold text-ink mb-6">
        Add words to this list
      </h3>

      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-5">
          {rows.map((row, index) => (
            <div key={index} className={`${styles.wordRow} flex gap-4 items-end`}>
              <span className="text-xs font-medium text-ink-muted pb-2 w-6 shrink-0">
                {index + 1}.
              </span>

              <div className="flex-1">
                <label className="block text-xs font-medium tracking-widest uppercase text-ink-muted mb-2">
                  Term
                </label>
                <input
                  value={row.term}
                  onChange={(e) => updateRow(index, "term", e.target.value)}
                  className={`${styles.inputField} w-full bg-transparent text-ink py-2 px-0 text-base`}
                  placeholder="e.g. Ephemeral"
                />
              </div>

              <div className="flex-1">
                <label className="block text-xs font-medium tracking-widest uppercase text-ink-muted mb-2">
                  Definition
                </label>
                <input
                  value={row.definition}
                  onChange={(e) =>
                    updateRow(index, "definition", e.target.value)
                  }
                  className={`${styles.inputField} w-full bg-transparent text-ink py-2 px-0 text-base`}
                  placeholder="Optional"
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
          ))}
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
            onClick={() => {
              reset();
              setOpen(false);
            }}
            className="text-sm font-medium text-ink-muted bg-transparent border-none cursor-pointer hover:text-ink transition-colors duration-200 px-4 py-3"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
