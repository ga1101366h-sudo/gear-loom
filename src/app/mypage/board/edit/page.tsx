"use client";

import Link from "next/link";
import { Construction } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function MyPageBoardEditPage() {
  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <Card className="border-amber-500/30 bg-amber-950/20">
        <CardHeader>
          <div className="flex items-center gap-2 text-amber-400">
            <Construction className="h-6 w-6" aria-hidden />
            <CardTitle>開発中です</CardTitle>
          </div>
          <CardDescription>
            ボード編集機能は現在開発中です。公開までしばらくお待ちください。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild>
            <Link href="/mypage">マイページに戻る</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
