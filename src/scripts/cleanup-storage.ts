/* eslint-disable no-console */
"use server";

// スクリプト実行時にも .env / .env.local を読み込んで Firebase Admin などの環境変数を有効にする
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

/**
 * Firebase Storage 内の全ファイルをスキャンし、
 * Prisma のレコードから参照されていない「孤児ファイル」を検出して
 * （オプションで）一括削除する管理者用スクリプト。
 *
 * 想定実行方法（例）:
 *   npx ts-node src/scripts/cleanup-storage.ts        # ドライラン（削除しない）
 *   CONFIRM_DELETE=true npx ts-node src/scripts/cleanup-storage.ts  # 実際に削除
 */

// NOTE:
// スクリプト実行時（ts-node など）にパスエイリアスが解決できない環境でも動作するよう、
// import はプロジェクトルートからの相対パスで記述する。
import { prisma } from "../lib/prisma";
import { getAdminStorage } from "../lib/firebase/admin";

type CleanupOptions = {
  /** true のとき実際に file.delete() を呼ぶ。デフォルト false（ログだけ）。 */
  confirmDelete?: boolean;
};

type UsedUrlSet = Set<string>;

/**
 * Prisma の全テーブルを走査して、Storage ファイルが紐づく可能性のある
 * 全ての URL を Set に詰める。
 */
async function collectUsedImageUrls(): Promise<UsedUrlSet> {
  const urls = new Set<string>();

  // 1. Gear.imageUrl
  const gears = await prisma.gear.findMany({
    select: { imageUrl: true },
  });
  for (const g of gears) {
    const u = g.imageUrl?.trim();
    if (u) urls.add(u);
  }

  // 2. UserGear.customImageUrl
  const userGears = await prisma.userGear.findMany({
    select: { customImageUrl: true },
  });
  for (const ug of userGears) {
    const u = ug.customImageUrl?.trim();
    if (u) urls.add(u);
  }

  // 3. Board.actualPhotoUrl / Board.thumbnail
  const boards = await prisma.board.findMany({
    select: { actualPhotoUrl: true, thumbnail: true },
  });
  for (const b of boards) {
    const photo = b.actualPhotoUrl?.trim();
    const thumb = b.thumbnail?.trim();
    if (photo) urls.add(photo);
    if (thumb) urls.add(thumb);
  }

  // 4. BoardPost.photoUrl / BoardPost.imageUrls(JSON 配列)
  const posts = await prisma.boardPost.findMany({
    select: { photoUrl: true, imageUrls: true },
  });
  for (const p of posts) {
    const photo = p.photoUrl?.trim();
    if (photo) urls.add(photo);
    if (p.imageUrls) {
      try {
        const parsed = JSON.parse(p.imageUrls) as unknown;
        if (Array.isArray(parsed)) {
          for (const raw of parsed) {
            if (typeof raw === "string") {
              const u = raw.trim();
              if (u) urls.add(u);
            }
          }
        }
      } catch {
        // 破損している JSON は無視
      }
    }
  }

  return urls;
}

type StorageFileInfo = {
  bucketName: string;
  objectPath: string;
  publicUrl: string;
  size: number; // bytes
};

/**
 * Storage バケット内の全ファイルを取得。
 * - 明示的なバケット環境変数があればそれを利用
 * - なければデフォルトバケットを利用
 */
async function listAllStorageFiles(): Promise<StorageFileInfo[]> {
  const storage = getAdminStorage();
  if (!storage) {
    console.error("[cleanup-storage] Admin storage is not configured.");
    return [];
  }

  const explicitBucketName =
    process.env.FIREBASE_STORAGE_BUCKET ?? process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const bucket = explicitBucketName ? storage.bucket(explicitBucketName) : storage.bucket();
  const bucketName = bucket.name;

  const [files] = await bucket.getFiles(); // prefix なしで全件
  const result: StorageFileInfo[] = [];

  for (const file of files) {
    const [metadata] = await file.getMetadata();
    const size = typeof metadata.size === "string" ? Number(metadata.size) || 0 : 0;
    const objectPath = file.name;
    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(
      objectPath,
    )}?alt=media`;

    result.push({ bucketName, objectPath, publicUrl, size });
  }

  return result;
}

/**
 * DB から参照されていない Storage ファイルを検出し、ドライラン or 実削除する。
 */
export async function cleanupOrphanedStorageFiles(options: CleanupOptions = {}): Promise<void> {
  const confirmDelete =
    options.confirmDelete || process.env.CONFIRM_DELETE === "true" || process.env.CONFIRM_DELETE === "1";

  console.log("=== Gear-Loom Storage Cleanup ===");
  console.log("Mode:", confirmDelete ? "DELETE (実削除)" : "DRY RUN (削除せずログのみ)");

  console.log("1) Collecting used image URLs from Prisma...");
  const usedUrls = await collectUsedImageUrls();
  console.log("   Collected URL count:", usedUrls.size);

  console.log("2) Listing all files in Firebase Storage bucket...");
  const allFiles = await listAllStorageFiles();
  console.log("   Total files in bucket:", allFiles.length);

  const orphanFiles: StorageFileInfo[] = [];

  for (const file of allFiles) {
    // ダウンロードトークン付き URL 形式 / トークンなし URL 形式の両方でマッチを確認
    const baseUrl = file.publicUrl;
    const anyMatch =
      Array.from(usedUrls).some((u) => {
        // クエリパラメータ（token 等）を無視してパス部分だけ比較するラフマッチ
        try {
          const normalized = new URL(u);
          const normalizedPath = `${normalized.hostname}${normalized.pathname}`;
          const thisPath = `firebasestorage.googleapis.com/v0/b/${file.bucketName}/o/${encodeURIComponent(
            file.objectPath,
          )}`;
          return normalizedPath === thisPath;
        } catch {
          return u === baseUrl;
        }
      }) || usedUrls.has(baseUrl);

    if (!anyMatch) {
      orphanFiles.push(file);
    }
  }

  const totalOrphans = orphanFiles.length;
  const totalBytes = orphanFiles.reduce((sum, f) => sum + f.size, 0);

  console.log("3) Orphan detection result:");
  console.log("   Orphan file count:", totalOrphans);
  console.log("   Orphan total size (bytes):", totalBytes);

  if (totalOrphans === 0) {
    console.log("   No orphan files detected. Nothing to do.");
    return;
  }

  console.log("   Orphan file list:");
  for (const f of orphanFiles) {
    console.log(`   - ${f.bucketName}/${f.objectPath} (${f.size} bytes) -> ${f.publicUrl}`);
  }

  if (!confirmDelete) {
    console.log(
      "DRY RUN 完了: 実際の削除は行っていません。削除を実行するには CONFIRM_DELETE=true を付けて再実行してください。",
    );
    return;
  }

  console.log("4) Deleting orphan files from Storage...");
  const storage = getAdminStorage();
  if (!storage) {
    console.error("[cleanup-storage] Admin storage is not configured (delete phase).");
    return;
  }

  const bucket = storage.bucket(orphanFiles[0].bucketName);
  let deletedCount = 0;
  let deletedBytes = 0;

  for (const f of orphanFiles) {
    try {
      const file = bucket.file(f.objectPath);
      await file.delete();
      deletedCount += 1;
      deletedBytes += f.size;
      console.log("   Deleted:", f.bucketName, f.objectPath);
    } catch (err) {
      console.warn("   Failed to delete:", f.bucketName, f.objectPath, err);
    }
  }

  console.log("=== Cleanup completed ===");
  console.log("   Deleted files:", deletedCount);
  console.log("   Freed storage (bytes):", deletedBytes);
}

// スクリプトとして直接実行された場合のみ動かす
if (require.main === module) {
  cleanupOrphanedStorageFiles().catch((err) => {
    console.error("[cleanup-storage] Unhandled error:", err);
    process.exitCode = 1;
  });
}

