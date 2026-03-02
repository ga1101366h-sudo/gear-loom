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

/** ユーザー削除時に、そのユーザーに紐づく Storage（アバター・所持機材・ノート画像）を削除する */
export async function deleteUserStorageFiles(uid: string): Promise<void> {
  if (!uid) return;
  await Promise.all([
    deleteStoragePrefix(`avatars/${uid}/`),
    deleteStoragePrefix(`owned-gear-images/${uid}/`),
    deleteStoragePrefix(`notebook-images/${uid}/`),
  ]);
}
