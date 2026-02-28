"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** Firebase のパスワードリセットはメール内のリンク先（Firebase のページ）で完了します。 */
export default function UpdatePasswordPage() {
  return (
    <div className="mx-auto max-w-md py-12">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-electric-blue">パスワードリセット</CardTitle>
          <CardDescription>
            パスワードリセット用のメールを送信しました。メール内のリンクを開き、表示されたページで新しいパスワードを設定してください。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-400">
            メールが届かない場合は迷惑メールフォルダをご確認いただくか、ログイン画面から再度「パスワードを忘れた場合」を試してください。
          </p>
        </CardContent>
      </Card>
      <p className="mt-6 text-center">
        <Link href="/login" className="text-sm text-gray-400 hover:text-electric-blue">
          ← ログインに戻る
        </Link>
      </p>
    </div>
  );
}
