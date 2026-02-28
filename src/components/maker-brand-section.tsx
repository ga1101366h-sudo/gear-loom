"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { BrandGroup } from "@/data/brands";

interface MakerBrandSectionProps {
  groups: BrandGroup[];
  /** DB から取得したメーカー（group_slug ごとの名前配列） */
  makersByGroup: Record<string, string[]>;
}

export function MakerBrandSection({ groups, makersByGroup }: MakerBrandSectionProps) {
  const [search, setSearch] = useState("");

  const normalizedSearch = search.trim().toLowerCase();

  const filteredGroups = useMemo(() => {
    if (!normalizedSearch) return groups;

    return groups
      .map((group) => {
        const staticMatched = group.brands.filter((b) =>
          b.toLowerCase().includes(normalizedSearch)
        );
        const dbMakers = makersByGroup[group.id] ?? [];
        const dbMatched = dbMakers.filter((m) =>
          m.toLowerCase().includes(normalizedSearch)
        );
        const matched = [...staticMatched, ...dbMatched];
        if (matched.length === 0) return null;
        return { ...group, brands: matched };
      })
      .filter(Boolean) as BrandGroup[];
  }, [groups, makersByGroup, normalizedSearch]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <label htmlFor="maker-search" className="text-sm text-gray-400 shrink-0">
          メーカー・ブランドを検索
        </label>
        <Input
          id="maker-search"
          type="search"
          placeholder="例: Fender, BlackSmoker..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs bg-surface-card border-surface-border"
        />
      </div>

      <div className="space-y-8">
        {filteredGroups.map((group) => {
          const dbMakers = (makersByGroup[group.id] ?? []).filter(
            (m) => !normalizedSearch || m.toLowerCase().includes(normalizedSearch)
          );
          const allBrands = [...group.brands, ...dbMakers];
          return (
            <Card key={group.id} className="card-hover">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-electric-blue">
                  {group.titleJa}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="flex flex-wrap gap-2">
                  {allBrands.map((brand) => (
                    <li key={brand}>
                      <Link
                        href={`/reviews?maker=${encodeURIComponent(brand)}`}
                        className="inline-block rounded-lg border border-surface-border bg-surface-card/50 px-3 py-1.5 text-sm text-gray-300 hover:text-electric-blue hover:border-electric-blue/50 transition-all duration-200 hover:scale-105 hover:shadow-electric-glow/20"
                      >
                        {brand}
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredGroups.length === 0 && (
        <p className="text-gray-500 text-sm">該当するメーカー・ブランドがありません。</p>
      )}
    </div>
  );
}
