"use client";

import { cn } from "@/lib/utils";
import type { Category } from "@/api/pantry";

interface CategoryFilterProps {
  categories: Category[];
  selected: string | null;
  onSelect: (category: string | null) => void;
}

export function CategoryFilter({
  categories,
  selected,
  onSelect,
}: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onSelect(null)}
        className={cn(
          "rounded-full px-3 py-1 text-sm font-medium transition-colors",
          selected === null
            ? "bg-[var(--color-primary)] text-white"
            : "bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        )}
      >
        All
      </button>
      {categories.map((cat) => (
        <button
          key={cat.name}
          onClick={() => onSelect(cat.name === selected ? null : cat.name)}
          className={cn(
            "rounded-full px-3 py-1 text-sm font-medium transition-colors",
            selected === cat.name
              ? "bg-[var(--color-primary)] text-white"
              : "bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          )}
        >
          {cat.name}
          <span className="ml-1 opacity-60">{cat.count}</span>
        </button>
      ))}
    </div>
  );
}
