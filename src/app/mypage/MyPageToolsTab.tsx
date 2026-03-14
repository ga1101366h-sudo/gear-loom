"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function MyPageToolsTab() {
  return (
    <div className="space-y-12">
      <Card>
        <CardHeader>
          <CardTitle className="text-electric-blue">比較リスト</CardTitle>
          <CardDescription>
            気になるレビューを追加して一覧で比較できます。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" size="sm" asChild>
            <Link href="/reviews/compare">比較リストを開く</Link>
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-electric-blue">カスタム手帳</CardTitle>
          <CardDescription>
            自分だけの記録をカスタム手帳に残せます。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" size="sm" asChild>
            <Link href="/notebook">カスタム手帳を開く</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
