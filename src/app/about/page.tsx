import { getAboutPageCountsFromFirestore } from "@/lib/firebase/data";
import { AboutCtaSection } from "@/components/about-cta-section";
import { AboutStats } from "@/components/about-stats";
import {
  SlidersHorizontal,
  PenSquare,
  Box,
  CalendarDays,
  Search,
  Users,
} from "lucide-react";
import type { Metadata } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.gear-loom.com";
const DEFAULT_OG_IMAGE = `${SITE_URL}/images/mock/ogp-final.png`;

export const metadata: Metadata = {
  title: "Gear-Loomとは？",
  description:
    "機材への愛とこだわりを記録し、AIを駆使したエフェクターボード構築から共有まで、音楽活動を加速させる次世代プラットフォーム。",
  openGraph: {
    title: "Gear-Loomとは？",
    description:
      "機材への愛とこだわりを記録し、AIを駆使したエフェクターボード構築から共有まで、音楽活動を加速させる次世代プラットフォーム。",
    url: `${SITE_URL}/about`,
    siteName: "Gear-Loom",
    images: [{ url: DEFAULT_OG_IMAGE }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Gear-Loomとは？",
    description:
      "機材への愛とこだわりを記録し、AIを駆使したエフェクターボード構築から共有まで、音楽活動を加速させる次世代プラットフォーム。",
    images: [DEFAULT_OG_IMAGE],
  },
};

const HERO_BG =
  "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=1920&q=80";

const FEATURES = [
  {
    icon: <SlidersHorizontal className="h-6 w-6 text-cyan-400" aria-hidden />,
    title: "理想を形にする、エフェクターボード構築",
    description:
      "音の流れがひと目で分かるインタラクティブな配線図で、Web上で自在にルーティングをシミュレート。AIによる背景透過機能を搭載し、機材を配置して実機写真とセットで「みんなのボード」へ公開できます。",
  },
  {
    icon: <PenSquare className="h-6 w-6 text-cyan-400" aria-hidden />,
    title: "熱量を残す、機材レビュー＆ブログ",
    description:
      "機材の感触やセッティングをレビューで発信。イベント告知やレポートもブログとして自由に投稿でき、深い情報交換に繋がります。",
  },
  {
    icon: <Box className="h-6 w-6 text-cyan-400" aria-hidden />,
    title: "自分の機材を「資産」として一元管理",
    description:
      "マイページはあなた専用の機材庫です。所有機材の登録、お気に入りリストの作成など、デジタル機材手帳として活用できます。",
  },
  {
    icon: <CalendarDays className="h-6 w-6 text-cyan-400" aria-hidden />,
    title: "ライブ日程の告知・スケジュール管理",
    description:
      "ライブ予定を登録して発信。トップページのカレンダーや公開プロフィールで、活動スケジュールをファンや仲間に届けます。",
  },
  {
    icon: <Search className="h-6 w-6 text-cyan-400" aria-hidden />,
    title: "気になる機材をスムーズにディグる",
    description:
      "レビューやエフェクターボードで気になった機材は、ボタン一つでECサイトをチェック。リアルな使用感をすぐに確認できます。",
  },
  {
    icon: <Users className="h-6 w-6 text-cyan-400" aria-hidden />,
    title: "音楽仲間との繋がり・公開プロフィール",
    description:
      "洗練された公開プロフィールで、あなたの愛機やボードを名刺代わりにシェア。フォロー機能でユーザー同士が繋がります。",
  },
];

export default async function AboutPage() {
  const counts = await getAboutPageCountsFromFirestore();

  return (
    <div className="min-h-screen">
      {/* 1. Heroセクション：ラッパーで main をはみ出し、上余白も打ち消して画面いっぱいに */}
      <div
        className="w-screen max-w-[100vw] -mt-4 sm:-mt-6 box-border"
        style={{
          marginLeft: "calc(50% - 50vw)",
          marginRight: "calc(50% - 50vw)",
        }}
      >
        <section
          className="relative flex h-[calc(100vh-4rem)] min-h-[320px] w-full flex-col justify-center overflow-hidden px-4 py-16 sm:py-24 md:py-28 lg:py-32"
          aria-label="想い"
        >
          {/* 縦横ともヒーロー領域いっぱいに表示（縦の空白が出ないよう cover で統一） */}
          <div
            className="pointer-events-none absolute inset-0 -z-10 bg-cover bg-center bg-no-repeat bg-gray-900"
            style={{ backgroundImage: `url(${HERO_BG})` }}
            aria-hidden
          />
          <div
            className="absolute inset-0 -z-10 bg-gradient-to-b from-black/70 via-black/55 to-[var(--surface-dark,#020617)]"
            aria-hidden
          />
          <div className="relative mx-auto w-full max-w-4xl text-center">
          <h1 className="font-display text-4xl font-bold leading-[1.15] tracking-tight text-white drop-shadow-lg sm:text-5xl md:text-6xl lg:text-7xl">
            あなたの愛機が、
            <br className="sm:hidden" />
            誰かの音作りを変える。
          </h1>
          <p className="mt-8 mx-auto max-w-2xl text-base leading-relaxed text-gray-300 sm:text-lg md:text-xl">
            すべての音楽と関わる人たちへ。Gear-Loomは、機材への愛とこだわりを記録し、AIを駆使したエフェクターボード構築から共有まで、音楽活動を加速させる次世代プラットフォームです。
          </p>
        </div>

        {/* スクロールダウン・インジケーター（トップページと同様） */}
          <div
            className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1 text-white/80"
            aria-hidden
          >
            <span className="text-[10px] font-medium tracking-widest uppercase">
              Scroll
            </span>
            <span className="animate-bounce text-lg leading-none" aria-hidden>
              ↓
            </span>
          </div>
        </section>
      </div>

      {/* 2. Numbersセクション（Firestore集計・動的表示） */}
      <section
        className="bg-gray-900 px-4 py-16 sm:py-20 md:py-24"
        aria-label="プラットフォームの規模"
      >
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-12 text-center font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            みんなの「愛機」が、ここに集まる
          </h2>
          <AboutStats initialCounts={counts} />
        </div>
      </section>

      {/* 3. Featuresセクション（音楽ライフのハブ） - 背景交互 */}
      <section
        className="bg-black px-4 py-16 sm:py-20 md:py-24"
        aria-label="Gear-Loomでできること"
      >
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-4 text-center font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            音楽ライフのハブとして
          </h2>
          <p className="mb-12 text-center text-sm text-gray-400 sm:text-base">
            機材の記録から告知まで、あなたの体験を価値に変える
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-surface-border/80 bg-gray-900/80 p-6 shadow-lg shadow-cyan-500/5 transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(34,211,238,0.08)]"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-400">
                    {f.icon}
                  </div>
                  <h3 className="font-display text-lg font-semibold text-white">
                    {f.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-gray-400">
                    {f.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. CTAセクション（ログイン状態で出し分け） */}
      <AboutCtaSection />
    </div>
  );
}
