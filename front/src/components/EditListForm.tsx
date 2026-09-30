"use client";

import { useState } from "react";
import listService from "@/services/list";
import type { List } from "@/types";
import styles from "./EditListForm.module.css";

interface EditListFormProps {
  list: List;
  onUpdated: (updatedList: List) => void;
}

const MAX_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 500;

export default function EditListForm({ list, onUpdated }: EditListFormProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(list.name);
  const [description, setDescription] = useState(list.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Re-seed the form fields from the current list and open it for editing.
  const startEditing = () => {
    setName(list.name);
    setDescription(list.description ?? "");
    setError(null);
    setSubmitting(false);
    setOpen(true);
  };

  const cancel = () => {
    setName(list.name);
    setDescription(list.description ?? "");
    setError(null);
    setSubmitting(false);
    setOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Client validation mirrors list creation:
    // name is required (non-whitespace, 1-100 chars), description optional (<= 500).
    const trimmedName = name.trim();
    if (trimmedName === "") {
      setError("Name is required. Please enter a name for this list.");
      return;
    }
    if (trimmedName.length > MAX_NAME_LENGTH) {
      setError(`Name must be ${MAX_NAME_LENGTH} characters or fewer.`);
      return;
    }

    const trimmedDescription = description.trim();
    if (trimmedDescription.length > MAX_DESCRIPTION_LENGTH) {
      setError(
        `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer.`
      );
      return;
    }

    const payload: { name: string; description?: string } = {
      name: trimmedName,
    };
    if (trimmedDescription !== "") {
      payload.description = trimmedDescription;
    }

    setSubmitting(true);
    setError(null);
    try {
      const updated: List = await listService.update(list.id, payload);
      // Merge to preserve fields the update response may omit (e.g. words/user).
      onUpdated({ ...list, ...updated });
      setOpen(false);
      setSubmitting(false);
    } catch {
      // Failure: retain original displayed data, surface an error.
      setError("Could not save your changes. Please try again.");
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={startEditing}
        className="text-sm font-medium tracking-widest uppercase text-ink-light border border-dashed border-border-dark px-6 py-3 bg-transparent cursor-pointer hover:border-accent hover:text-accent transition-colors duration-200"
      >
        Edit List
      </button>
    );
  }

  return (
    <div
      className={`${styles.formCard} bg-cream-dark border border-border p-8 w-full`}
    >
      <h3 className="font-serif text-xl font-semibold text-ink mb-6">
        Edit list details
      </h3>

      <form onSubmit={handleSubmit}>
        <div className="mb-6">
          <label className="block text-xs font-medium tracking-widest uppercase text-ink-muted mb-2">
            Name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={MAX_NAME_LENGTH}
            className={`${styles.inputField} w-full bg-transparent text-ink py-2 px-0 text-base`}
            placeholder="e.g. SAT Vocabulary"
          />
        </div>

        <div className="mb-8">
          <label className="block text-xs font-medium tracking-widest uppercase text-ink-muted mb-2">
            Description
          </label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={MAX_DESCRIPTION_LENGTH}
            className={`${styles.inputField} w-full bg-transparent text-ink py-2 px-0 text-base`}
            placeholder="A short description (optional)"
          />
        </div>

        {error && (
          <p className={`${styles.error} text-sm text-accent mb-6`} role="alert">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting}
            className={`${styles.submitBtn} bg-ink text-cream text-sm font-medium tracking-widest uppercase px-6 py-3 border-none cursor-pointer hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {submitting ? "Saving..." : "Save Changes"}
          </button>
          <button
            type="button"
            onClick={cancel}
            className="text-sm font-medium text-ink-muted bg-transparent border-none cursor-pointer hover:text-ink transition-colors duration-200 px-4 py-3"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
