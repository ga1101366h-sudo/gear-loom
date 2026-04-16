import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "プライバシーポリシー",
  description:
    "Gear-Loom（ギアルーム）のプライバシーポリシーです。収集する情報、利用目的、第三者提供、広告・Cookie・解析ツールの利用について説明します。",
};

export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto py-8 space-y-8">
      <h1 className="text-2xl font-bold text-white">プライバシーポリシー</h1>
      <p className="text-xs text-gray-500">制定日：2024年1月1日　最終更新日：2026年4月16日</p>
      <p className="text-sm text-gray-400">
        Gear-Loom（以下「当サービス」）は、ユーザーの個人情報の保護を大切にしています。本ポリシーは、当サービスが収集・利用する情報とその取り扱いについて定めます。
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-electric-blue text-lg">1. 収集する情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-gray-300 text-sm">
          <p>当サービスでは、以下の情報を収集する場合があります。</p>
          <ul className="list-disc list-inside space-y-1">
            <li>アカウント登録時のメールアドレス・パスワード（暗号化して保管）</li>
            <li>表示名・ユーザーID・プロフィール画像・自己紹介・SNSリンク等、ユーザーが任意で入力するプロフィール情報</li>
            <li>レビュー・いいね・ライブ予定など、サービス利用に伴うコンテンツと紐づく識別子</li>
            <li>アクセスログ・Cookie 等の技術情報（サービスの改善・不正利用防止のため）</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-electric-blue text-lg">2. 利用目的</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-gray-300 text-sm">
          <ul className="list-disc list-inside space-y-1">
            <li>会員認証・アカウント管理</li>
            <li>レビュー・プロフィール・ライブ予定の表示・検索・比較機能の提供</li>
            <li>お問い合わせへの対応</li>
            <li>サービス改善・新機能開発・収益化に伴う分析（匿名化して利用する場合があります）</li>
            <li>利用規約違反・不正利用の防止と対応</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-electric-blue text-lg">3. 第三者提供</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-gray-300 text-sm">
          <p>
            法令に基づく場合を除き、ユーザーの同意なく個人を特定できる情報を第三者に提供することはありません。
            認証・ホスティング・分析等で外部サービス（Google、Firebase 等）を利用する場合、各サービスのプライバシーポリシーに従って取り扱います。
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-electric-blue text-lg">4. 広告の配信・アフィリエイトプログラムについて</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-gray-300 text-sm">
          <p>
            当サービスでは、Google LLC が提供する <strong className="text-white">Google AdSense</strong> を利用して広告を配信しています。Google AdSense では、ユーザーの興味・関心に合った広告を表示するために Cookie および広告識別子（DoubleClick DART Cookie を含む）を使用します。
          </p>
          <p>
            Google によるデータ使用については、
            <a
              href="https://policies.google.com/technologies/ads"
              target="_blank"
              rel="noopener noreferrer"
              className="text-electric-blue hover:underline"
            >
              Google の広告に関するポリシー
            </a>
            をご確認ください。
          </p>
          <p>
            パーソナライズ広告を無効にしたい場合は、
            <a
              href="https://www.google.com/settings/ads"
              target="_blank"
              rel="noopener noreferrer"
              className="text-electric-blue hover:underline"
            >
              Google 広告設定
            </a>
            または
            <a
              href="https://optout.networkadvertising.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-electric-blue hover:underline"
            >
              Network Advertising Initiative のオプトアウトページ
            </a>
            からオプトアウトできます。
          </p>
          <p>
            また、当サービスは <strong className="text-white">Amazon アソシエイト・プログラム</strong>および<strong className="text-white">楽天アフィリエイト</strong>の参加者であり、適格販売により収入を得ている場合があります。
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-electric-blue text-lg">5. Cookieについて</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-gray-300 text-sm">
          <p>
            当サービスでは、以下の目的で Cookie を使用しています。
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>ログイン状態の維持・セッション管理（ファーストパーティ Cookie）</li>
            <li>サービスの利用状況分析（Google アナリティクス）</li>
            <li>ユーザーの興味に合わせたパーソナライズ広告の配信（Google AdSense）</li>
          </ul>
          <p>
            ブラウザの設定から Cookie を無効にすることができますが、一部機能（ログイン等）が正常に動作しなくなる場合があります。
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-electric-blue text-lg">6. アクセス解析ツールについて</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-gray-300 text-sm">
          <p>
            当サービスでは、Google LLC が提供する <strong className="text-white">Google アナリティクス</strong>を利用し、トラフィックデータの収集のために Cookie を使用しています。収集されるデータは匿名であり、個人を特定するものではありません。利用目的はサービスの改善・利用状況の把握です。Google アナリティクスの利用規約については
            <a
              href="https://marketingplatform.google.com/about/analytics/terms/jp/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-electric-blue hover:underline"
            >
              こちら
            </a>
            をご確認ください。
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-electric-blue text-lg">7. 個人情報の開示・訂正・削除</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-gray-300 text-sm">
          <p>
            ご自身の個人情報の開示や訂正、データ削除（退会手続き）を希望される場合は、マイページから手続きを行うか、
            <Link href="/contact" className="text-electric-blue hover:underline">
              お問い合わせページ
            </Link>
            からご連絡ください。適切に対応いたします。
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-electric-blue text-lg">8. お問い合わせ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-gray-300 text-sm">
          <p>
            個人情報の取り扱いに関するお問い合わせは、
            <Link href="/contact" className="text-electric-blue hover:underline">
              お問い合わせページ
            </Link>
            からご連絡ください。
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-electric-blue text-lg">9. 改定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-gray-300 text-sm">
          <p>
            本ポリシーは必要に応じて改定することがあります。重要な変更がある場合は、サービス上でお知らせします。改定後のポリシーは本ページに掲載した時点で効力を生じるものとします。
          </p>
        </CardContent>
      </Card>

      <p className="text-center">
        <Link href="/" className="text-sm text-gray-400 hover:text-electric-blue">
          トップに戻る
        </Link>
      </p>
    </div>
  );
}
