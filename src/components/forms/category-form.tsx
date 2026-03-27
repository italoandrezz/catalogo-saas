"use client";

import { useEffect, useState } from "react";
import type { Category, CategoryPayload } from "@/types";

type CategoryFormProps = {
  initialCategory: Category | null;
  isSubmitting: boolean;
  onSubmit: (payload: CategoryPayload) => Promise<void>;
  onCancelEdit: () => void;
};

type CategoryFormState = {
  name: string;
  description: string;
};

function getInitialState(category: Category | null): CategoryFormState {
  return {
    name: category?.name ?? "",
    description: category?.description ?? "",
  };
}

export function CategoryForm({
  initialCategory,
  isSubmitting,
  onSubmit,
  onCancelEdit,
}: CategoryFormProps) {
  const [formState, setFormState] = useState<CategoryFormState>(() => getInitialState(initialCategory));

  useEffect(() => {
    setFormState(getInitialState(initialCategory));
  }, [initialCategory]);

  const isFormValid = formState.name.trim().length > 0;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isFormValid) return;

    const payload: CategoryPayload = {
      name: formState.name.trim(),
      description: formState.description.trim() || undefined,
    };

    await onSubmit(payload);

    if (!initialCategory) {
      setFormState(getInitialState(null));
    }
  }

  const isEditing = Boolean(initialCategory);

  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <h3 className="text-lg font-semibold text-slate-900">
        {isEditing ? "Edit category" : "Create category"}
      </h3>

      <form className="mt-4 grid gap-3" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Name
          <input
            value={formState.name}
            onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
            className="rounded-md border border-slate-300 bg-white px-3 py-2"
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Description
          <textarea
            value={formState.description}
            onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))}
            className="min-h-20 rounded-md border border-slate-300 bg-white px-3 py-2"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={isSubmitting || !isFormValid}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
          >
            {isSubmitting ? "Saving..." : isEditing ? "Update category" : "Create category"}
          </button>

          {isEditing && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100"
            >
              Cancel edit
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
