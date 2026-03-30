"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CategoryIcon } from "@/components/category-icon";
import { MypageBoardList } from "@/components/mypage-board-list";
import { MypageGearList } from "@/components/mypage-gear-list";
import { Edit2, PlusCircle } from "lucide-react";
import { formatCategoryPath } from "@/lib/utils";
import { EMPTY_SECTION_CLASS } from "./mypage-shared";
import type { Profile } from "@/types/database";
import type { UserGearItem } from "@/types/gear";

export type MypageBoardItem = {
  id: string;
  name: string;
  thumbnail: string | null;
  actualPhotoUrl: string | null;
  nodes?: string | null;
  edges?: string | null;
  updatedAt: string;
};

type Props = {
  mypageBoards: MypageBoardItem[];
  swrKey: [string, string] | null;
  profile: Profile | null;
  mypageGears: UserGearItem[];
};

export function MyPageGearTab({ mypageBoards, swrKey, profile, mypageGears }: Props) {
  return (
    <div className="space-y-12">
      {/* マイエフェクターボード */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-electric-blue">マイエフェクターボード</CardTitle>
            <CardDescription>
              保存したエフェクターボードの一覧です。カードをクリックして編集できます。
            </CardDescription>
          </div>
          {mypageBoards.length > 0 && (
            <Link
              href="/board/editor"
              className="inline-flex items-center gap-2 px-4 py-2 bg-transparent border border-cyan-500 text-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.4)] hover:bg-cyan-500/10 hover:shadow-[0_0_12px_rgba(6,182,212,0.55)] transition-all rounded-md text-sm font-medium shrink-0 w-fit"
            >
              <PlusCircle className="w-4 h-4 shrink-0" aria-hidden />
              新規作成
            </Link>
          )}
        </CardHeader>
        <CardContent>
          {mypageBoards.length > 0 ? (
            <MypageBoardList boards={mypageBoards} swrKey={swrKey} />
          ) : (
            <div className={EMPTY_SECTION_CLASS}>
              <p className="text-muted-foreground text-sm">まだ保存されたボードはありません。</p>
              <Button variant="outline" size="sm" asChild>
                <Link href="/board/editor">新規作成</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 所有機材（統計・画像リスト） */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-electric-blue">所有機材</CardTitle>
            <CardDescription>
              現在使っているボード構成や所有機材です。
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" className="shrink-0" asChild>
            <Link href="/mypage/gear" className="inline-flex items-center gap-2">
              <Edit2 className="w-4 h-4 shrink-0" aria-hidden />
              機材を編集
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {mypageGears.length > 0 || (profile?.owned_gear_images && profile.owned_gear_images.length > 0) ? (
            <div className="space-y-4">
              {mypageGears.length > 0 && (
                <MypageGearList gears={mypageGears} swrKey={swrKey} />
              )}
              {profile?.owned_gear_images && profile.owned_gear_images.length > 0 && (
                <div className={mypageGears.length > 0 ? "mt-4" : ""}>
                  <p className="text-sm text-gray-400 mb-2">登録画像</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {profile.owned_gear_images.map((url) => (
                      <div
                        key={url}
                        className="relative aspect-square rounded-xl overflow-hidden border border-white/10 bg-white/[0.03]"
                      >
                        <Image
                          src={url}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 50vw, 25vw"
                          unoptimized
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className={EMPTY_SECTION_CLASS}>
              <p className="text-sm text-muted-foreground">
                まだ所有機材が登録されていません。
                <Link href="/profile" className="text-electric-blue hover:underline ml-1">
                  プロフィール編集
                </Link>
                で追加できます。
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
