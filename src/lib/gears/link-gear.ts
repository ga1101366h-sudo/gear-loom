import type { firestore } from "firebase-admin";
import { isContentOnlyCategorySlug } from "@/data/post-categories";

/**
 * レビューと機材ページ（gears）の紐付けを一箇所にまとめたサーバー側ヘルパー。
 *
 * なぜ必要か（2026-08-03）:
 * - レビュー投稿には経路が2つある。
 *   (1) カタログから機材を選ぶ → /api/reviews/with-gear（gears を作る）
 *   (2) 機材名を手入力する     → クライアントから Firestore へ直接 addDoc（gears を作らない）
 *   実際の投稿15件はすべて (2) を通っており、gears コレクションは存在すらしていなかった。
 *   その結果、機材ページが1枚も無く、sitemap の機材URLも0件だった。
 * - (1) も「毎回 db.collection("gears").doc() で新規作成」していたため、
 *   同じ機材を2人がレビューすると機材ページが2枚できる（＝薄いページの重複）。
 *
 * 方針:
 * - 表示名は「メーカー名 + 半角スペース + 機材名」に統一する（"ODB-3" より "BOSS ODB-3" の方が
 *   ページタイトルとしてもEC検索リンクとしても機能するため）。2026-08-03 のバックフィルと同じ規則。
 *   カタログ経由でも楽天の商品名ではなくこの規則を使う。経路によって名前が変わると名寄せできないため。
 * - 名寄せキー（nameKey）を正規化して保存し、equality クエリで既存を引く。
 *   全件取得して突き合わせる方式は件数が増えると破綻するので使わない。
 * - コンテンツ系カテゴリ（ブログ・イベント・カスタム手帳）と、機材名が空のものは対象外。
 */

/** 表示名（機材ページのタイトルにそのまま出る） */
export function buildGearDisplayName(makerName: string | null | undefined, gearName: string): string {
  const maker = String(makerName ?? "").trim();
  const gear = String(gearName ?? "").trim();
  if (!gear) return "";
  return maker ? `${maker} ${gear}` : gear;
}

/** 名寄せキー。大文字小文字・連続空白の揺れだけを吸収する（表記そのものは変えない） */
export function normalizeGearNameKey(displayName: string): string {
  return String(displayName ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

export type FindOrCreateGearInput = {
  displayName: string;
  /** 機材ページに出す画像。無ければ空文字（捏造しない） */
  imageUrl?: string;
  /** 楽天などの購入リンク。手入力投稿では持たないので空文字 */
  affiliateUrl?: string;
  /** 機材ページの作成日。レビューの作成日を渡す（一覧の並びを実態に合わせるため） */
  createdAt?: Date;
};

/**
 * 機材ページを「あれば再利用・無ければ作成」する。
 * 再利用時は reviewCount を1加算し、**空の項目だけ**を今回の値で埋める（既存の値は上書きしない）。
 */
export async function findOrCreateGear(
  db: firestore.Firestore,
  input: FindOrCreateGearInput
): Promise<{ status: "created" | "reused"; gearId: string }> {
  const displayName = String(input.displayName ?? "").trim();
  const nameKey = normalizeGearNameKey(displayName);

  const existing = await db.collection("gears").where("nameKey", "==", nameKey).limit(1).get();

  if (!existing.empty) {
    const docSnap = existing.docs[0];
    const data = docSnap.data();
    const patch: Record<string, unknown> = {
      reviewCount: (Number(data.reviewCount ?? 0) || 0) + 1,
    };
    if (input.imageUrl && !String(data.imageUrl ?? "").trim()) patch.imageUrl = input.imageUrl;
    if (input.affiliateUrl && !String(data.affiliateUrl ?? "").trim()) {
      patch.affiliateUrl = input.affiliateUrl;
    }
    await docSnap.ref.update(patch);
    return { status: "reused", gearId: docSnap.id };
  }

  const ref = db.collection("gears").doc();
  await ref.set({
    name: displayName,
    nameKey,
    imageUrl: input.imageUrl ?? "",
    affiliateUrl: input.affiliateUrl ?? "",
    reviewCount: 1,
    createdAt: input.createdAt ?? new Date(),
  });
  return { status: "created", gearId: ref.id };
}

export type LinkGearForReviewInput = {
  /** 紐付け先のレビューID */
  reviewId: string;
  categorySlug: string;
  makerName: string | null | undefined;
  gearName: string;
  imageUrl?: string;
  affiliateUrl?: string;
  createdAt?: Date;
};

export type LinkGearResult =
  | { status: "created" | "reused"; gearId: string }
  | { status: "skipped"; reason: string };

/**
 * レビューに対応する機材ページを用意し、そのレビューに gear_id を書き戻す。
 * 呼び出し元（投稿処理）は、これが失敗しても止めない想定。レビュー本体は既に保存済みのため。
 */
export async function findOrCreateGearForReview(
  db: firestore.Firestore,
  input: LinkGearForReviewInput
): Promise<LinkGearResult> {
  if (!input.reviewId?.trim()) return { status: "skipped", reason: "reviewId が空" };
  if (isContentOnlyCategorySlug(input.categorySlug)) {
    return {
      status: "skipped",
      reason: `コンテンツ系カテゴリ（${input.categorySlug}）は機材ページを作らない`,
    };
  }

  const displayName = buildGearDisplayName(input.makerName, input.gearName);
  if (!displayName) return { status: "skipped", reason: "機材名が空" };

  const result = await findOrCreateGear(db, {
    displayName,
    imageUrl: input.imageUrl,
    affiliateUrl: input.affiliateUrl,
    createdAt: input.createdAt,
  });

  await db.collection("reviews").doc(input.reviewId).update({ gear_id: result.gearId });
  return result;
}
