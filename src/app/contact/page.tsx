import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "お問い合わせ",
  description: "Gear-Loom（ギアルーム）へのお問い合わせはこちらから。",
};

const TWITTER_URL = "https://x.com/shiki_shou1484";
const CONTACT_EMAIL = "shiki.shouki@gmail.com";

export default function ContactPage() {
  return (
    <div className="max-w-2xl mx-auto py-8 space-y-8">
      <h1 className="text-2xl font-bold text-white">お問い合わせ</h1>
      <p className="text-gray-300 text-sm">
        サービスに関するご質問・ご要望・不具合の報告などは、以下のいずれかからお気軽にどうぞ。
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-electric-blue text-lg">X（Twitter）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-gray-300 text-sm">
            DMまたはリプライでお送りください。
          </p>
          <Button variant="outline" size="sm" asChild>
            <a href={TWITTER_URL} target="_blank" rel="noopener noreferrer">
              @shiki_shou1484 を開く
            </a>
          </Button>
          <p className="text-xs text-gray-500 break-all">
            <a href={TWITTER_URL} target="_blank" rel="noopener noreferrer" className="text-electric-blue hover:underline">
              {TWITTER_URL}
            </a>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-electric-blue text-lg">メール</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-gray-300 text-sm">
            件名に「Gear-Loom」を含めていただけると助かります。
          </p>
          <Button variant="outline" size="sm" asChild>
            <a href={`mailto:${CONTACT_EMAIL}`}>
              メールを送る
            </a>
          </Button>
          <p className="text-xs text-gray-500 break-all">
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-electric-blue hover:underline">
              {CONTACT_EMAIL}
            </a>
          </p>
        </CardContent>
      </Card>

      <p className="text-center flex flex-wrap justify-center gap-4">
        <Link href="/" className="text-sm text-gray-400 hover:text-electric-blue">
          トップに戻る
        </Link>
        <Link href="/privacy" className="text-sm text-gray-400 hover:text-electric-blue">
          プライバシーポリシー
        </Link>
      </p>
    </div>
  );
}
