"use client";

import { useState } from "react";
import listService from "@/services/list";
import styles from "./DeleteListControl.module.css";

interface DeleteListControlProps {
  listId: string;
  // Called after the API confirms the deletion (204). The page decides how to
  // reflect the removal (e.g. navigate away from the now-deleted detail view).
  onDeleted: () => void;
}

export default function DeleteListControl({
  listId,
  onDeleted,
}: DeleteListControlProps) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleDelete = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await listService.remove(listId);
      // Success: hand off to the page so it can remove the list from view
      // without a manual reload.
      onDeleted();
    } catch {
      // Failure: keep the list in view and surface an error.
      setError("The deletion did not complete. Please try again.");
      setConfirming(false);
      setSubmitting(false);
    }
  };

  if (!confirming) {
    return (
      <button
        onClick={() => {
          setError(null);
          setConfirming(true);
        }}
        className="text-sm font-medium tracking-widest uppercase text-ink-muted border border-dashed border-border-dark px-6 py-3 bg-transparent cursor-pointer hover:border-accent hover:text-accent transition-colors duration-200"
      >
        Delete List
      </button>
    );
  }

  return (
    <div className={`${styles.confirmCard} flex flex-col gap-4`}>
      <p className="text-sm text-ink-light">
        Delete this list and all of its words? This cannot be undone.
      </p>

      {error && (
        <p className={`${styles.error} text-sm text-accent`} role="alert">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleDelete}
          disabled={submitting}
          className={`${styles.deleteBtn} bg-accent text-cream text-sm font-medium tracking-widest uppercase px-6 py-3 border-none cursor-pointer hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {submitting ? "Deleting..." : "Confirm Delete"}
        </button>
        <button
          type="button"
          onClick={() => {
            setConfirming(false);
            setError(null);
          }}
          disabled={submitting}
          className="text-sm font-medium text-ink-muted bg-transparent border-none cursor-pointer hover:text-ink transition-colors duration-200 px-4 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
