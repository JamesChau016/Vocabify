"use client";

import { useState } from "react";
import listService from "@/services/list";
import type { List } from "@/types";
import styles from "./ListForm.module.css";

interface ListFormProps {
  onCreated: (list: List) => void;
}

export default function ListForm({ onCreated }: ListFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [open, setOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const created = await listService.createList({ name, description });
    onCreated(created);
    setName("");
    setDescription("");
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm font-medium tracking-widest uppercase text-ink-light border border-dashed border-border-dark px-6 py-3 bg-transparent cursor-pointer hover:border-accent hover:text-accent transition-colors duration-200"
      >
        + New List
      </button>
    );
  }

  return (
    <div
      className={`${styles.formCard} bg-cream-dark border border-border p-8 w-full max-w-md`}
    >
      <h3 className="font-serif text-xl font-semibold text-ink mb-6">
        Create a new list
      </h3>
      <form onSubmit={handleSubmit}>
        <div className="mb-6">
          <label className="block text-xs font-medium tracking-widest uppercase text-ink-muted mb-2">
            Name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
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
            className={`${styles.inputField} w-full bg-transparent text-ink py-2 px-0 text-base`}
            placeholder="A short description (optional)"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            className={`${styles.submitBtn} bg-ink text-cream text-sm font-medium tracking-widest uppercase px-6 py-3 border-none cursor-pointer hover:bg-accent`}
          >
            Create
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-sm font-medium text-ink-muted bg-transparent border-none cursor-pointer hover:text-ink transition-colors duration-200 px-4 py-3"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
