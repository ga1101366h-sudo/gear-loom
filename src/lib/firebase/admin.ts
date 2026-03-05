import * as admin from "firebase-admin";

let adminApp: admin.app.App | null = null;

function getAdminApp(): admin.app.App | null {
  if (adminApp) return adminApp;
  if (admin.apps.length > 0) {
    adminApp = admin.apps[0] as admin.app.App;
    return adminApp;
  }
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) return null;
  try {
    adminApp = admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });
    return adminApp;
  } catch {
    return null;
  }
}

export function getAdminFirestore(): admin.firestore.Firestore | null {
  const app = getAdminApp();
  return app ? admin.firestore(app) : null;
}

export function getAdminAuth(): admin.auth.Auth | null {
  const app = getAdminApp();
  return app ? admin.auth(app) : null;
}

export function getAdminStorage(): admin.storage.Storage | null {
  const app = getAdminApp();
  return app ? admin.storage(app) : null;
}

const STORAGE_BUCKET =
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? process.env.FIREBASE_STORAGE_BUCKET ?? "";

/** 指定プレフィックス配下の Storage オブジェクトを削除 */
async function deleteStoragePrefix(prefix: string): Promise<void> {
  const storage = getAdminStorage();
  if (!storage || !STORAGE_BUCKET || !prefix) return;
  try {
    const bucket = storage.bucket(STORAGE_BUCKET);
    const [files] = await bucket.getFiles({ prefix });
    await Promise.all(files.map((file) => file.delete()));
  } catch (err) {
    console.warn("[deleteStoragePrefix]", prefix, err);
  }
}

/** 指定レビューに紐づく Storage の画像（review-images/{reviewId}/）を削除する */
export async function deleteReviewImagesFromStorage(reviewId: string): Promise<void> {
  if (!reviewId) return;
  await deleteStoragePrefix(`review-images/${reviewId}/`);
}

/** 指定レビューに紐づく Firestore の関連データ（いいね・役に立った・比較リスト）を削除する */
export async function deleteReviewRelatedFirestore(
  db: admin.firestore.Firestore,
  reviewId: string
): Promise<void> {
  if (!reviewId) return;
  const collections = ["review_likes", "review_helpfuls", "review_compares"] as const;
  for (const coll of collections) {
    try {
      const snap = await db.collection(coll).where("review_id", "==", reviewId).get();
      const batch = db.batch();
      snap.docs.forEach((d) => batch.delete(d.ref));
      if (!snap.empty) await batch.commit();
    } catch (err) {
      console.warn(`[deleteReviewRelatedFirestore] ${coll}`, err);
    }
  }
}

/** 指定カスタム手帳エントリに紐づく Storage 画像（notebook-images/{uid}/{entryId}/）を削除する */
export async function deleteNotebookEntryImagesFromStorage(uid: string, entryId: string): Promise<void> {
  if (!uid || !entryId) return;
  await deleteStoragePrefix(`notebook-images/${uid}/${entryId}/`);
}

/** ユーザー削除時に、そのユーザーに紐づく Storage（アバター・所持機材・ノート画像）を削除する */
export async function deleteUserStorageFiles(uid: string): Promise<void> {
  if (!uid) return;
  await Promise.all([
    deleteStoragePrefix(`avatars/${uid}/`),
    deleteStoragePrefix(`owned-gear-images/${uid}/`),
    deleteStoragePrefix(`notebook-images/${uid}/`),
  ]);
}

/**
 * 管理者によるユーザー削除時：そのユーザーが作成した記事・予定・手帳・フォロー関係を
 * Firestore と Storage からすべて削除する（プロフィール・Auth は呼び出し元で削除）
 */
export async function deleteAllUserDataFromFirestore(db: admin.firestore.Firestore, targetUid: string): Promise<void> {
  if (!targetUid.trim()) return;

  const BATCH_SIZE = 450;

  // 1. そのユーザーが投稿したレビュー：関連データ・Storage 画像・レビュードキュメントを削除
  const reviewsSnap = await db.collection("reviews").where("author_id", "==", targetUid).get();
  const reviewIds = reviewsSnap.docs.map((d) => d.id);
  for (const reviewId of reviewIds) {
    await deleteReviewRelatedFirestore(db, reviewId);
    await deleteReviewImagesFromStorage(reviewId);
  }
  for (let i = 0; i < reviewsSnap.docs.length; i += BATCH_SIZE) {
    const batch = db.batch();
    reviewsSnap.docs.slice(i, i + BATCH_SIZE).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }

  // 2. このユーザーが付けたいいね・役に立った・比較リスト（他者の記事への紐づき）
  for (const coll of ["review_likes", "review_helpfuls", "review_compares"] as const) {
    const snap = await db.collection(coll).where("user_id", "==", targetUid).get();
    for (let i = 0; i < snap.docs.length; i += BATCH_SIZE) {
      const batch = db.batch();
      snap.docs.slice(i, i + BATCH_SIZE).forEach((d) => batch.delete(d.ref));
      if (snap.docs.slice(i, i + BATCH_SIZE).length > 0) await batch.commit();
    }
  }

  // 3. ライブ予定
  const eventsSnap = await db.collection("live_events").where("user_id", "==", targetUid).get();
  for (let i = 0; i < eventsSnap.docs.length; i += BATCH_SIZE) {
    const batch = db.batch();
    eventsSnap.docs.slice(i, i + BATCH_SIZE).forEach((d) => batch.delete(d.ref));
    if (eventsSnap.docs.slice(i, i + BATCH_SIZE).length > 0) await batch.commit();
  }

  // 4. カスタム手帳
  const notebookSnap = await db.collection("gear_notebook_entries").where("user_id", "==", targetUid).get();
  for (let i = 0; i < notebookSnap.docs.length; i += BATCH_SIZE) {
    const batch = db.batch();
    notebookSnap.docs.slice(i, i + BATCH_SIZE).forEach((d) => batch.delete(d.ref));
    if (notebookSnap.docs.slice(i, i + BATCH_SIZE).length > 0) await batch.commit();
  }

  // 5. フォロー関係（フォローしている・されている）
  const followSnap1 = await db.collection("follows").where("follower_id", "==", targetUid).get();
  const followSnap2 = await db.collection("follows").where("following_id", "==", targetUid).get();
  const allFollowDocs = [...followSnap1.docs, ...followSnap2.docs];
  for (let i = 0; i < allFollowDocs.length; i += BATCH_SIZE) {
    const batch = db.batch();
    allFollowDocs.slice(i, i + BATCH_SIZE).forEach((d) => batch.delete(d.ref));
    if (allFollowDocs.slice(i, i + BATCH_SIZE).length > 0) await batch.commit();
  }

  // 6. プロフィール
  const profileRef = db.collection("profiles").doc(targetUid);
  const profileSnap = await profileRef.get();
  if (profileSnap.exists) await profileRef.delete();
}
