"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { POST_CATEGORY_GROUPS } from "@/data/post-categories";

export type CategoryOption = { slug: string; name_ja: string; groupLabel: string };

const ALL_OPTIONS: CategoryOption[] = POST_CATEGORY_GROUPS.flatMap((g) =>
  g.items.map((i) => ({ slug: i.slug, name_ja: i.name_ja, groupLabel: g.groupLabel }))
);

export function CategoryDropdown({
  value,
  onChange,
  placeholder = "カテゴリを検索・選択",
  required,
  id,
}: {
  value: string;
  onChange: (slug: string, name_ja: string) => void;
  placeholder?: string;
  required?: boolean;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = ALL_OPTIONS.find((o) => o.slug === value);

  const filteredGroups = query.trim()
    ? POST_CATEGORY_GROUPS.map((g) => ({
        ...g,
        items: g.items.filter(
          (i) =>
            i.name_ja.includes(query.trim()) ||
            i.slug.toLowerCase().includes(query.trim().toLowerCase())
        ),
      })).filter((g) => g.items.length > 0)
    : POST_CATEGORY_GROUPS;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <Input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        required={required}
        value={open ? query : (selected?.name_ja ?? "")}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder={placeholder}
        className="w-full"
      />
      {open && (
        <div
          className="absolute z-50 mt-1 max-h-[280px] w-full overflow-auto rounded-lg border border-surface-border bg-surface-dark py-1 shadow-xl"
          role="listbox"
          style={{ backgroundColor: "var(--surface-dark)", opacity: 1 }}
        >
          {filteredGroups.map((g) => (
            <div key={g.groupLabel || g.items[0]?.slug}>
              {g.groupLabel && (
                <div className="px-3 py-1.5 text-xs font-medium text-gray-500 sticky top-0 bg-surface-dark border-b border-surface-border/50">
                  {g.groupLabel}
                </div>
              )}
              {g.items.map((i) => (
                <button
                  key={i.slug}
                  type="button"
                  role="option"
                  aria-selected={value === i.slug}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-electric-blue/15 ${
                    value === i.slug ? "bg-electric-blue/20 text-electric-blue" : "text-gray-200"
                  }`}
                  onClick={() => {
                    onChange(i.slug, i.name_ja);
                    setQuery("");
                    setOpen(false);
                  }}
                >
                  {i.name_ja}
                </button>
              ))}
            </div>
          ))}
          {filteredGroups.every((g) => g.items.length === 0) && (
            <p className="px-3 py-4 text-sm text-gray-500">該当するカテゴリがありません</p>
          )}
        </div>
      )}
    </div>
  );
}
