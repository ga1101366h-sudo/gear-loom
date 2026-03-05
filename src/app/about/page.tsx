import { getAboutPageCountsFromFirestore } from "@/lib/firebase/data";
import { AboutCtaSection } from "@/components/about-cta-section";

export const metadata = {
  title: "Gear-Loomとは？",
  description:
    "機材への愛とこだわりを記録し、共有するプラットフォーム。あなたの愛機が、誰かの音作りを変える。",
};

const HERO_BG =
  "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=1920&q=80";

const FEATURES = [
  {
    icon: "📝",
    title: "熱量を残す、機材レビュー",
    description:
      "使った機材の感想やセッティングをレビューで残す。AI補正機能で執筆サポートも。レビューを投稿すると同時に、自分のプロフィール（所有機材リスト）へワンタップで追加・記録できる。誰かの「欲しい音」の参考に。",
  },
  {
    icon: "📖",
    title: "自分だけの歴史、カスタム手帳",
    description: "画像付きで愛機のカスタム履歴やメモを記録。あなた専用のデジタル機材手帳として、いつでも振り返れる。",
  },
  {
    icon: "📅",
    title: "ライブ日程の告知・管理",
    description: "バンドマン・イベンター向け。ライブ予定を登録して告知。トップページのカレンダーで仲間やファンに届ける。",
  },
  {
    icon: "✏️",
    title: "ブログで自由な発信",
    description: "イベント告知や機材レポート、活動報告をブログ記事で。思いのままに発信し、音楽仲間とつながる。",
  },
  {
    icon: "🔍",
    title: "気になる機材をスムーズに確認",
    description:
      "レビューを読んで気になった1台は、そのままボタン一つでECサイトをチェック。スペックやリアルな市場価格をすぐに確認できます。",
  },
  {
    icon: "❤️",
    title: "音楽仲間との繋がり",
    description:
      "フォロー・フォロワー機能で気になるユーザーとつながり、マイページのタイムラインで最新レビュー・ライブ予定をチェック。いいね・比較リストやプロフィールで保有機材・所属バンドを共有し、ユーザー同士のつながりを強化できます。",
  },
] as const;

function formatCount(n: number): string {
  if (n >= 1000) return `${Math.floor(n / 1000)}K+`;
  if (n > 0) return `${n}+`;
  return "0";
}

const NUMBER_ITEMS = [
  { key: "reviews" as const, unit: "件", label: "投稿されたレビュー" },
  { key: "profiles" as const, unit: "人", label: "登録ユーザー" },
  { key: "notebookEntries" as const, unit: "件", label: "カスタム手帳の記録" },
  { key: "liveEvents" as const, unit: "件", label: "登録されたライブ日程" },
] as const;

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
          <div className="absolute inset-0 -z-10 bg-black/50" aria-hidden />
          <div className="relative mx-auto w-full max-w-4xl text-center">
          <h1 className="font-display text-4xl font-bold leading-[1.15] tracking-tight text-white drop-shadow-lg sm:text-5xl md:text-6xl lg:text-7xl">
            あなたの愛機が、
            <br className="sm:hidden" />
            誰かの音作りを変える。
          </h1>
          <p className="mt-8 mx-auto max-w-2xl text-base leading-relaxed text-gray-300 sm:text-lg md:text-xl">
            すべての音楽と関わる人たちへ。Gear-Loomは、機材への愛とこだわりを記録し、共有し、音楽活動を加速させるプラットフォームです。
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
          <div className="grid gap-6 sm:grid-cols-2">
            {NUMBER_ITEMS.map((item) => {
              const value = counts[item.key];
              const display = value != null ? formatCount(value) : "—";
              return (
                <div
                  key={item.label}
                  className="rounded-2xl border border-surface-border/80 bg-black/50 p-8 text-center shadow-lg backdrop-blur-sm"
                >
                  <p className="font-display text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-cyan-400 via-cyan-500 to-cyan-700 sm:text-6xl md:text-7xl">
                    {display}
                    <span className="text-2xl sm:text-3xl md:text-4xl">{item.unit}</span>
                  </p>
                  <p className="mt-2 text-sm font-medium text-gray-300 sm:text-base">
                    {item.label}
                  </p>
                </div>
              );
            })}
          </div>
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
                <span className="text-3xl" aria-hidden>
                  {f.icon}
                </span>
                <h3 className="mt-3 font-display text-lg font-semibold text-white">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-400">
                  {f.description}
                </p>
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
