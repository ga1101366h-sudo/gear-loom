import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "利用規約",
  description: "Gear-Loom（ギアルーム）の利用規約です。",
};

export default function TermsPage() {
  return (
    <div className="max-w-2xl mx-auto py-8 space-y-8">
      <h1 className="text-2xl font-bold text-white">利用規約</h1>
      <p className="text-sm text-gray-400">
        Gear-Loom（以下「当サービス」といいます）は、本利用規約（以下「本規約」といいます）に基づいて提供されます。ユーザーの皆さまには、本規約に同意したうえで当サービスをご利用いただきます。
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-electric-blue text-lg">第1条（適用範囲）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-gray-300 text-sm">
          <p>
            本規約は、当サービスの提供条件および当サービスの利用に関する当サービス運営者とユーザーとの一切の関係に適用されます。当サービス上で個別に定められたガイドラインやポリシー等も、本規約の一部を構成するものとします。
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-electric-blue text-lg">第2条（利用登録・アカウント）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-gray-300 text-sm">
          <ul className="list-disc list-inside space-y-1">
            <li>ユーザーは、本規約に同意のうえ、当サービス所定の方法により利用登録を行うものとします。</li>
            <li>ログインに用いる外部サービス（Google 等）のアカウント情報管理は、各サービスの利用規約に従うものとします。</li>
            <li>ユーザーは、自己の責任においてアカウント情報を管理・保管し、第三者に利用させてはなりません。</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-electric-blue text-lg">第3条（ユーザー投稿コンテンツ）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-gray-300 text-sm">
          <p>
            本サービスでは、ユーザーは機材レビュー、ブログ記事、エフェクターボードの配線図・写真、プロフィール情報、コメントその他一切のコンテンツ（以下総称して「ユーザーコンテンツ」といいます）を投稿することができます。
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>ユーザーコンテンツの著作権は、原則として当該コンテンツを創作したユーザー本人に帰属します。</li>
            <li>
              ユーザーは、当サービス運営者に対し、当サービスの運営・プロモーション・改善のために必要な範囲で、ユーザーコンテンツを世界的かつ非独占的に利用（複製・翻案・公衆送信・表示等）する権利を、無償で許諾するものとします。
            </li>
            <li>
              ユーザーは、第三者の著作権・肖像権・商標権その他の権利を侵害しない範囲でのみユーザーコンテンツを投稿するものとし、第三者との紛争が生じた場合は、自己の責任と費用においてこれを解決するものとします。
            </li>
            <li>当サービス運営者は、ユーザーコンテンツが本規約に違反すると判断した場合、事前の通知なく当該コンテンツの非表示・編集・削除等の措置を行うことができます。</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-electric-blue text-lg">第4条（禁止事項）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-gray-300 text-sm">
          <p>ユーザーは、当サービスの利用にあたり、以下の行為を行ってはなりません。</p>
          <ul className="list-disc list-inside space-y-1">
            <li>法令または公序良俗に違反する行為</li>
            <li>他者の知的財産権、肖像権、プライバシー権、名誉権その他の権利・利益を侵害する行為</li>
            <li>誹謗中傷、差別的表現、過度に攻撃的な表現、わいせつ・暴力的な表現等を含むコンテンツの投稿</li>
            <li>スパム行為、過度な宣伝行為、アフィリエイトリンクのみを目的とした投稿</li>
            <li>当サービスのサーバーやネットワークに過度な負荷を与える行為、不正アクセス行為</li>
            <li>当サービスの運営を妨害する行為、またはそのおそれのある行為</li>
            <li>その他、当サービス運営者が不適切と判断する行為</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-electric-blue text-lg">第5条（サービスの変更・中断・終了）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-gray-300 text-sm">
          <p>
            当サービス運営者は、事前の通知なく、当サービスの内容の全部または一部を変更・追加・停止・終了することができます。これによりユーザーに生じた損害について、当サービス運営者は一切の責任を負わないものとします。
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-electric-blue text-lg">第6条（免責事項）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-gray-300 text-sm">
          <ul className="list-disc list-inside space-y-1">
            <li>
              当サービスに投稿されたレビュー・エフェクターボードその他のユーザーコンテンツは、ユーザー個人の見解であり、当サービス運営者が内容の真偽・正確性・適合性等を保証するものではありません。
            </li>
            <li>
              当サービスの利用によりユーザー間またはユーザーと第三者との間で生じたトラブルについて、当サービス運営者は直接的・間接的を問わず一切の責任を負いません。
            </li>
            <li>
              当サービス運営者は、システム障害・ネットワーク障害・外部サービスの不具合等により生じたデータ消失や機会損失その他の損害について、一切の責任を負わないものとします。
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-electric-blue text-lg">第7条（利用停止・アカウント削除）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-gray-300 text-sm">
          <p>
            当サービス運営者は、ユーザーが本規約に違反したと判断した場合、事前の通知なく、当該ユーザーに対し、投稿の削除・アカウント停止・アカウント削除その他必要な措置を講じることができます。
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-electric-blue text-lg">第8条（規約の変更）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-gray-300 text-sm">
          <p>
            当サービス運営者は、必要に応じて本規約を変更することができます。重要な変更を行う場合は、当サービス上での掲示その他適切な方法によりユーザーに通知します。変更後にユーザーが当サービスを利用した場合、変更後の規約に同意したものとみなします。
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-electric-blue text-lg">第9条（準拠法・管轄）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-gray-300 text-sm">
          <p>本規約の解釈および適用には、日本法を準拠法とします。</p>
          <p>
            当サービスに起因または関連して生じる一切の紛争については、当サービス運営者の所在地を管轄する日本の裁判所を第一審の専属的合意管轄裁判所とします。
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

