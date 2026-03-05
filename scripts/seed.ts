/**
 * Gear-Loom Firestore テスト用ダミーデータ一括登録スクリプト
 *
 * 【インストールコマンド】
 *   npm install firebase-admin
 *   npm install -D @faker-js/faker tsx
 *
 * 【実行コマンド】（プロジェクトルートで実行）
 *   npx tsx scripts/seed.ts
 */

import * as admin from "firebase-admin";
import { faker } from "@faker-js/faker/locale/ja";

// ---------------------------------------------------------------------------
// Firebase Admin 初期化（サービスアカウントキーを require で直接読み込み）
// パス: C:\dev\gear-nexus\gear-loom-firebase-adminsdk-fbsvc-05e27511f0.json
// ---------------------------------------------------------------------------
function loadServiceAccount(): admin.ServiceAccount {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const key = require("C:\\dev\\gear-nexus\\gear-loom-firebase-adminsdk-fbsvc-05e27511f0.json") as admin.ServiceAccount;
  return key;
}

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(loadServiceAccount()) });
}

const db = admin.firestore();
const BATCH_SIZE = 500;

// レビュー用カテゴリ
const REVIEW_CATEGORIES = [
  { slug: "eleki-guitar", name_ja: "エレキギター本体" },
  { slug: "guitar-effector", name_ja: "ギターエフェクター" },
  { slug: "aco-classic-guitar", name_ja: "アコースティック・クラシックギター" },
  { slug: "bass-body", name_ja: "ベース本体" },
  { slug: "amp-body", name_ja: "アンプ本体" },
  { slug: "synth-keyboard", name_ja: "シンセサイザー・キーボード" },
  { slug: "audio-interface", name_ja: "オーディオインターフェース" },
  { slug: "monitor-headphone", name_ja: "モニタースピーカー・ヘッドホン" },
  { slug: "custom", name_ja: "カスタム" },
];

const GEAR_NAMES = [
  "ストラトキャスター型", "レスポール型", "テレキャスター", "チューブアンプ 30W",
  "マルチエフェクター", "オーバードライブ", "コンデンサーマイク", "オーディオインターフェース 2in2out",
  "モニタースピーカー 5インチ", "エレアコ フルアコ", "ベース 4弦", "シンセキーボード 61鍵",
  "DIボックス", "チューナー", "ワイヤレスシステム", "エフェクターボード用電源",
];
const MAKER_NAMES = ["メーカーA", "メーカーB", "Fender", "Gibson", "BOSS", "Yamaha", "Roland", "Shure", null];
const INSTRUMENTS = ["エレキギター", "アコースティックギター", "ベース", "ドラム", "キーボード", "ボーカル"];
const RATINGS = [1, 2, 3, 4, 5] as const;

// ---------------------------------------------------------------------------
// プロフィール 10 件
// ---------------------------------------------------------------------------
function buildProfiles(): { id: string; data: admin.firestore.DocumentData }[] {
  const out: { id: string; data: admin.firestore.DocumentData }[] = [];
  for (let i = 1; i <= 10; i++) {
    const id = `seed-user-${i}`;
    const now = faker.date.past().toISOString();
    out.push({
      id,
      data: {
        display_name: faker.person.fullName(),
        avatar_url: faker.image.url(),
        user_id: `seed${i}`,
        phone: null,
        bio: faker.lorem.paragraphs().slice(0, 500),
        main_instrument: faker.helpers.arrayElement(INSTRUMENTS),
        owned_gear: null,
        owned_gear_images: null,
        band_name: null,
        band_url: null,
        sns_twitter: null,
        sns_instagram: null,
        sns_youtube: null,
        sns_twitch: null,
        contact_email: null,
        created_at: now,
        updated_at: now,
      },
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// レビュー 30 件（author_id は生成したプロフィールの id からランダム取得）
// ---------------------------------------------------------------------------
function buildReviews(
  profileIds: string[],
  profileDisplayNames: Map<string, string>,
  profileUserIds: Map<string, string>
): admin.firestore.DocumentData[] {
  const reviews: admin.firestore.DocumentData[] = [];
  for (let i = 0; i < 30; i++) {
    const authorId = faker.helpers.arrayElement(profileIds);
    const category = faker.helpers.arrayElement(REVIEW_CATEGORIES);
    const gearName = faker.helpers.arrayElement(GEAR_NAMES);
    const makerName = faker.helpers.arrayElement(MAKER_NAMES);
    const pastDate = faker.date.past();
    const now = pastDate.toISOString();
    const bodyMd = [
      `この${gearName}には本当に愛着が湧きます。`,
      faker.lorem.paragraphs(),
      "音作りにこだわり続けた結果、今の自分にぴったりの一本になりました。",
    ].join("\n\n");

    reviews.push({
      author_id: authorId,
      category_id: category.slug,
      category_slug: category.slug,
      category_name_ja: category.name_ja,
      maker_id: null,
      maker_name: makerName,
      gear_id: null,
      gear_name: gearName,
      author_display_name: profileDisplayNames.get(authorId) ?? "シードユーザー",
      author_user_id: profileUserIds.get(authorId) ?? "seed1",
      author_avatar_url: faker.image.url(),
      title: `${gearName}のレビュー：${faker.lorem.paragraphs().slice(0, 50)}`,
      rating: faker.helpers.arrayElement(RATINGS),
      body_md: bodyMd,
      body_html: null,
      youtube_url: null,
      event_url: null,
      situations: null,
      spec_tag_ids: [],
      spec_tag_names: [],
      review_images: [
        { storage_path: `review-images/dummy/${faker.string.uuid()}.jpg`, sort_order: 0 },
      ],
      created_at: now,
      updated_at: now,
    });
  }
  return reviews;
}

// ---------------------------------------------------------------------------
// カスタム手帳 20 件
// ---------------------------------------------------------------------------
function buildNotebookEntries(profileIds: string[]): admin.firestore.DocumentData[] {
  const entries: admin.firestore.DocumentData[] = [];
  for (let i = 0; i < 20; i++) {
    const userId = faker.helpers.arrayElement(profileIds);
    const pastDate = faker.date.past();
    const now = pastDate.toISOString();
    const gearName = faker.helpers.arrayElement(GEAR_NAMES);
    entries.push({
      user_id: userId,
      gear_name: gearName,
      maker_name: faker.helpers.arrayElement(MAKER_NAMES),
      title: `${gearName}のメモ`,
      description: faker.lorem.paragraphs(),
      image_url: faker.image.url(),
      created_at: now,
      updated_at: now,
    });
  }
  return entries;
}

// ---------------------------------------------------------------------------
// バッチ書き込み
// ---------------------------------------------------------------------------
async function run(): Promise<void> {
  console.log("Firestore シード開始...");

  const profiles = buildProfiles();
  const profileIds = profiles.map((p) => p.id);
  const profileDisplayNames = new Map(profiles.map((p) => [p.id, (p.data.display_name as string) ?? ""]));
  const profileUserIds = new Map(profiles.map((p) => [p.id, (p.data.user_id as string) ?? ""]));

  const reviews = buildReviews(profileIds, profileDisplayNames, profileUserIds);
  const notebookEntries = buildNotebookEntries(profileIds);

  const profilesRef = db.collection("profiles");
  let batch = db.batch();
  let count = 0;
  for (const { id, data } of profiles) {
    batch.set(profilesRef.doc(id), data);
    count++;
    if (count >= BATCH_SIZE) {
      await batch.commit();
      batch = db.batch();
      count = 0;
    }
  }
  if (count > 0) await batch.commit();
  console.log(`  profiles: ${profiles.length} 件`);

  const reviewsRef = db.collection("reviews");
  batch = db.batch();
  count = 0;
  for (const data of reviews) {
    batch.set(reviewsRef.doc(), data);
    count++;
    if (count >= BATCH_SIZE) {
      await batch.commit();
      batch = db.batch();
      count = 0;
    }
  }
  if (count > 0) await batch.commit();
  console.log(`  reviews: ${reviews.length} 件`);

  const notebookRef = db.collection("gear_notebook_entries");
  batch = db.batch();
  count = 0;
  for (const data of notebookEntries) {
    batch.set(notebookRef.doc(), data);
    count++;
    if (count >= BATCH_SIZE) {
      await batch.commit();
      batch = db.batch();
      count = 0;
    }
  }
  if (count > 0) await batch.commit();
  console.log(`  gear_notebook_entries: ${notebookEntries.length} 件`);

  console.log("シード完了しました。");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
