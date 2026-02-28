/**
 * 新着レビュー用モックデータ（一覧カード＋記事全文）
 * 画像は public/images/mock/ の mock-1.png ～ mock-4.png
 */

export interface MockReview {
  id: string;
  title: string;
  gear_name: string;
  rating: number;
  excerpt: string;
  bodyMd: string;
  image: string;
  category: string;
  author: string;
}

const MOCK_IMG = (n: number) => `/images/mock/mock-${n}.png`;

export const MOCK_REVIEWS: MockReview[] = [
  {
    id: "mock-1",
    title: "白レリック Jazz Bass を長年使ってみた",
    gear_name: "Jazz Bass (Relic)",
    rating: 5,
    excerpt:
      "ボディのレリック加減がちょうどよく、使い込んだ雰囲気が出ていて気に入っています。ネックの太さもクラシックな感じで、ベースラインがとても弾きやすいです。",
    bodyMd: `白いレリック仕様の Jazz Bass を長年メインで使っています。

## 購入のきっかけ

 vintage っぽい見た目が欲しく、新品のレリックモデルを選びました。塗装の剥げ具合が均一で、使い込んだ雰囲気が出ていて気に入っています。

## 使ってみた感想

- **ネック**: クラシックな太さで、ベースラインがとても弾きやすい
- **ピックアップ**: バランスが良く、指弾き・ピックどちらもきれいに鳴る
- **重量**: やや重めだが、ストラップで長時間でも問題なし

スタジオでもライブでも、この1本でほぼ完結しています。`,
    image: MOCK_IMG(1),
    category: "ベース",
    author: "ベース担当",
  },
  {
    id: "mock-2",
    title: "Mark Vintage Pre と Urban Comp Evo を組み合わせたベース用ボード",
    gear_name: "Mark Vintage Pre / Urban Comp Evo / 4000 pre 他",
    rating: 5,
    excerpt:
      "プレアンプで芯を出して、コンプでまとめる構成。MXR Envelope Filter と EarthQuaker Zlear で表情を足しています。ライブでずっとこの並びで落ち着いています。",
    bodyMd: `ベース用ペダルボードの構成を紹介します。

## シグナルフロー

1. **Mark Vintage Pre** … プレアンプで芯を出す。Drive と Boost の両方使うことが多い
2. **Urban Comp Evo** … コンプでまとめて、ダイナミクスを整える
3. **4000 pre** … サブのブースト用
4. **MXR Envelope Filter** … ワウ系の表情づけ
5. **EarthQuaker Zlear** … 歪み・ファズでソロや盛り上げ用

## ポイント

プレアンプで芯を出して、コンプでまとめる構成にしています。MXR Envelope Filter と Zlear で表情を足して、ライブではずっとこの並びで落ち着いています。`,
    image: MOCK_IMG(2),
    category: "ベース",
    author: "session_player",
  },
  {
    id: "mock-3",
    title: "Peterson StroboStomp HD と SP Gear 中心のペダルボード",
    gear_name: "Peterson StroboStomp HD / Tribal Geyser / Urban Comp Evo 他",
    rating: 5,
    excerpt:
      "チューナーは Peterson でしっかり合わせて、Tribal Geyser と Urban Comp Evo でドライブとコンプ。LimestoneHOME でルーティングを整理してます。スタジオでもライブでもこの一台で完結。",
    bodyMd: `ギター／ベース兼用のペダルボードです。

## 構成

- **Peterson StroboStomp HD** … チューナー。BASS モードでベースも正確に合わせられる
- **Tribal Geyser** … ドライブ／オーバードライブ。Low / Mid / High で細かく調整可能
- **Urban Comp Evo** … コンプ。TONE / COMP / VOL / MIX で自然なまとめ
- **MXR Carbon Copy** … ディレイ
- **LimestoneHOME** … ルーティング・スイッチャー。複数ルートを切り替えて使っています

チューナーは Peterson でしっかり合わせて、Tribal Geyser と Urban Comp Evo でドライブとコンプ。スタジオでもライブでもこの一台で完結しています。`,
    image: MOCK_IMG(3),
    category: "ギター",
    author: "guitar_lab",
  },
  {
    id: "mock-4",
    title: "Jazz Bass のレリック仕様、実店舗で比較してみた",
    gear_name: "Jazz Bass (Black Relic)",
    rating: 4,
    excerpt:
      "店頭に並んでいた黒レリック。複数台見比べたなかで、塗装の剥げ具合やネックのフィールが一番しっくりきた1本です。価格帯も手の届く範囲で良かった。",
    bodyMd: `実店舗で Jazz Bass の黒レリック仕様を複数台比較しました。

## 店頭で見たポイント

- **塗装の剥げ具合** … レリックの加減は台によって違う。自分は剥げが控えめなほうが好みだった
- **ネックのフィール** … 何本か握って、一番しっくりきた1本を選択
- **価格帯** … 手の届く範囲で、初のレリックモデルとしてちょうど良かった

## 購入後

自宅で改めて鳴らすと、バランスの良い Jazz らしい音で満足しています。`,
    image: MOCK_IMG(4),
    category: "ベース",
    author: "bass_otaku",
  },
  {
    id: "mock-5",
    title: "チューナーは Peterson 一択で、SP Gear でまとめた",
    gear_name: "Peterson StroboStomp HD / SP Gear",
    rating: 5,
    excerpt:
      "チューナーは Peterson でしっかり合わせて、Tribal Geyser と Urban Comp Evo でドライブとコンプ。スタジオでもライブでもこの一台で完結。",
    bodyMd: `チューナーは Peterson StroboStomp HD をメインで使っています。SP Gear の Tribal Geyser と Urban Comp Evo でドライブとコンプをまとめて、スタジオでもライブでもこの一台で完結する構成にしました。`,
    image: MOCK_IMG(3),
    category: "ギター",
    author: "guitar_lab",
  },
];

export function getMockReview(id: string): MockReview | null {
  return MOCK_REVIEWS.find((r) => r.id === id) ?? null;
}
