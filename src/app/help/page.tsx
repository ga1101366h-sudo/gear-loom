import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function HelpPage() {
  return (
    <div className="max-w-2xl mx-auto py-8 space-y-8">
      <h1 className="text-2xl font-bold text-white">ヘルプ・使い方</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-electric-blue text-lg">Gear-Loom とは</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-gray-300 text-sm">
          <p>
            楽器・機材のレビューを共有し、みんなの音作りを応援する UGC プラットフォームです。
            会員登録するとレビューの投稿・いいね・ライブ予定の登録などができます。
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-electric-blue text-lg">会員登録・ログイン</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-gray-300 text-sm">
          <p>
            トップページの「無料会員登録」からメールアドレスとパスワードで登録できます。
            ユーザーID（@で始まる一意のID）も登録時に設定してください。Google・X（Twitter）でのログインにも対応しています。
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-electric-blue text-lg">レビューを投稿する</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-gray-300 text-sm">
          <p>
            「投稿する」からレビューを書けます。カテゴリは検索付きのドロップダウンで選べます。
            タイトル・機材名・評価（★5段階）・本文（Markdown対応）を入力し、画像も添付できます。
            投稿後はレビュー一覧やトップの「人気機材」「新着レビュー」などに表示されます。
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-electric-blue text-lg">マイページ・プロフィール</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-gray-300 text-sm">
          <p>
            マイページではアカウント情報・お気に入りにした記事・過去の投稿・レビューにもらったいいね・ライブ日程（マイカレンダー）を確認できます。
            「プロフィールを編集」から表示名・アイコン・自己紹介・会場URL付きのライブ予定を追加・編集できます。
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-electric-blue text-lg">みんなのライブ日程</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-gray-300 text-sm">
          <p>
            トップページの「みんなのライブ日程」で、登録されたライブ予定をカレンダーで確認できます。
            日付をクリックするとその日の予定一覧が表示されます。自分の予定はマイページの「マイカレンダー」から追加・編集できます。
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-electric-blue text-lg">ヘッダーのリンク</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-gray-300 text-sm">
          <ul className="list-disc list-inside space-y-1">
            <li><strong>楽器別情報</strong> … メーカー・楽器タイプで検索</li>
            <li><strong>レビュー</strong> … すべてのレビュー一覧</li>
            <li><strong>カスタム手帳</strong> … カスタムカテゴリの記事</li>
            <li><strong>ブログ</strong> … ブログカテゴリの記事</li>
            <li><strong>いいね</strong> … いいね付きコンテンツ</li>
            <li><strong>フォト</strong> … フォトカテゴリの記事</li>
            <li><strong>イベント</strong> … イベントカテゴリの記事</li>
          </ul>
        </CardContent>
      </Card>

      <div className="pt-4">
        <Button variant="ghost" asChild>
          <Link href="/">トップに戻る</Link>
        </Button>
      </div>
    </div>
  );
}
