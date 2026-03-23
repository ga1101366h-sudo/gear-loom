"use server";

import { revalidatePath } from "next/cache";
import { getAdminAuth, deleteStorageFilesByUrls } from "@/lib/firebase/admin";
import { prisma } from "@/lib/prisma";

export type PublishBoardPostResult =
  | { success: true; postId: string }
  | { success: false; error: string };

/**
 * エフェクターボードを「みんなのボード」用の記事（BoardPost）として公開する。
 * クライアントから Firebase ID トークンを渡し、サーバーで検証してユーザーを特定する。
 */
export async function publishBoardPost(
  boardId: string,
  title: string,
  content: string,
  photoUrl: string | null,
  postToX: boolean,
  idToken: string
): Promise<PublishBoardPostResult> {
  const auth = getAdminAuth();
  if (!auth) {
    return { success: false, error: "サーバー設定エラー" };
  }

  let uid: string;
  try {
    const decoded = await auth.verifyIdToken(idToken);
    uid = decoded.uid;
  } catch (err) {
    console.error("[publishBoardPost] Token verification failed:", err);
    return { success: false, error: "認証に失敗しました。再度ログインしてください。" };
  }

  const trimmedBoardId = typeof boardId === "string" ? boardId.trim() : "";
  if (!trimmedBoardId) {
    return { success: false, error: "ボードIDを指定してください。" };
  }

  const board = await prisma.board.findFirst({
    where: { id: trimmedBoardId, userId: uid },
  });
  if (!board) {
    return { success: false, error: "指定されたボードが見つからないか、投稿する権限がありません。" };
  }

  const trimmedTitle = (title ?? "").trim();
  if (!trimmedTitle) {
    return { success: false, error: "記事タイトルを入力してください。" };
  }

  if (postToX) {
    // X (Twitter) 連携はプレースホルダー。実際の API 呼び出しは未実装
    console.log("[publishBoardPost] postToX=true (placeholder): boardId=%s title=%s", trimmedBoardId, trimmedTitle);
  }

  try {
    // BoardPost に userId はない。投稿者は Board.userId（board の所有者）で一覧・詳細で board.user から取得する。
    const galleryImageUrls: string[] = [];
    const trimmedPhotoUrl = photoUrl?.trim() || "";
    if (trimmedPhotoUrl) {
      galleryImageUrls.push(trimmedPhotoUrl);
    }
    const trimmedThumbnail = board.thumbnail?.trim() || "";
    if (trimmedThumbnail) {
      galleryImageUrls.push(trimmedThumbnail);
    }
    const post = await prisma.boardPost.create({
      data: {
        boardId: trimmedBoardId,
        title: trimmedTitle,
        content: (content ?? "").trim() || null,
        photoUrl: trimmedPhotoUrl || null,
        imageUrls:
          galleryImageUrls.length > 0 ? JSON.stringify(galleryImageUrls) : null,
        isPublic: true,
      },
    });
    revalidatePath("/mypage");
    revalidatePath("/boards");
    // トップの新着エフェクターボード（ISR）に即反映
    revalidatePath("/", "layout");
    revalidatePath("/");
    return { success: true, postId: post.id };
  } catch (err) {
    console.error("[publishBoardPost] Database error:", err);
    return { success: false, error: "投稿の保存に失敗しました。" };
  }
}

export type UpdateBoardPostResult =
  | { success: true }
  | { success: false; error: string };

/**
 * 投稿済み BoardPost のタイトル・本文・ギャラリー画像を更新する。本人の投稿のみ更新可能。
 */
export async function updateBoardPost(
  postId: string,
  title: string,
  content: string,
  idToken: string,
  imageUrls?: string[]
): Promise<UpdateBoardPostResult> {
  const auth = getAdminAuth();
  if (!auth) {
    return { success: false, error: "サーバー設定エラー" };
  }

  let uid: string;
  try {
    const decoded = await auth.verifyIdToken(idToken);
    uid = decoded.uid;
  } catch (err) {
    console.error("[updateBoardPost] Token verification failed:", err);
    return { success: false, error: "認証に失敗しました。再度ログインしてください。" };
  }

  const trimmedPostId = typeof postId === "string" ? postId.trim() : "";
  if (!trimmedPostId) {
    return { success: false, error: "投稿IDを指定してください。" };
  }

  const trimmedTitle = (title ?? "").trim();
  if (!trimmedTitle) {
    return { success: false, error: "タイトルを入力してください。" };
  }

  const sanitizedImageUrls =
    Array.isArray(imageUrls) && imageUrls.length > 0
      ? imageUrls
          .map((u) => (typeof u === "string" ? u.trim() : ""))
          .filter((u) => u.length > 0)
      : [];

  const existing = await prisma.boardPost.findFirst({
    where: { id: trimmedPostId },
    include: { board: true },
  });
  if (!existing || existing.board.userId !== uid) {
    return { success: false, error: "指定された投稿が見つからないか、編集する権限がありません。" };
  }

  try {
    // 既存のギャラリー画像のうち、新しい配列から外れたものを Storage から削除する
    let removedUrls: string[] = [];
    if (existing.imageUrls) {
      try {
        const parsed = JSON.parse(existing.imageUrls) as unknown;
        if (Array.isArray(parsed)) {
          const prevUrls = parsed
            .map((u) => (typeof u === "string" ? u.trim() : ""))
            .filter((u) => u.length > 0);
          const nextSet = new Set(sanitizedImageUrls);
          removedUrls = prevUrls.filter((u) => !nextSet.has(u));
        }
      } catch {
        removedUrls = [];
      }
    }
    if (removedUrls.length > 0) {
      try {
        await deleteStorageFilesByUrls(removedUrls);
      } catch (err) {
        console.warn("[updateBoardPost] deleteStorageFilesByUrls failed (continuing with DB update)", err);
      }
    }

    await prisma.boardPost.update({
      where: { id: trimmedPostId },
      data: {
        title: trimmedTitle,
        content: (content ?? "").trim() || null,
        imageUrls:
          sanitizedImageUrls.length > 0 ? JSON.stringify(sanitizedImageUrls) : null,
      },
    });
    revalidatePath("/mypage");
    revalidatePath("/boards");
    revalidatePath(`/boards/post/${trimmedPostId}`);
    revalidatePath("/", "layout");
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    console.error("[updateBoardPost] Database error:", err);
    return { success: false, error: "更新に失敗しました。" };
  }
}

export type DeleteBoardPostResult =
  | { success: true }
  | { success: false; error: string };

/**
 * BoardPost を削除（公開取り下げ）する。本人の投稿のみ削除可能。
 */
export async function deleteBoardPost(
  postId: string,
  idToken: string
): Promise<DeleteBoardPostResult> {
  const auth = getAdminAuth();
  if (!auth) {
    return { success: false, error: "サーバー設定エラー" };
  }

  let uid: string;
  try {
    const decoded = await auth.verifyIdToken(idToken);
    uid = decoded.uid;
  } catch (err) {
    console.error("[deleteBoardPost] Token verification failed:", err);
    return { success: false, error: "認証に失敗しました。再度ログインしてください。" };
  }

  const trimmedPostId = typeof postId === "string" ? postId.trim() : "";
  if (!trimmedPostId) {
    return { success: false, error: "投稿IDを指定してください。" };
  }

  const existing = await prisma.boardPost.findFirst({
    where: { id: trimmedPostId },
    include: { board: true },
  });
  if (!existing || existing.board.userId !== uid) {
    return { success: false, error: "指定された投稿が見つからないか、削除する権限がありません。" };
  }

  // 投稿に紐づくギャラリー画像の URL 一覧を取得（あれば Storage 上から削除を試みる）
  let imageUrls: string[] = [];
  if (existing.imageUrls) {
    try {
      const parsed = JSON.parse(existing.imageUrls) as unknown;
      if (Array.isArray(parsed)) {
        imageUrls = parsed
          .map((u) => (typeof u === "string" ? u.trim() : ""))
          .filter((u) => u.length > 0);
      }
    } catch {
      imageUrls = [];
    }
  }

  try {
    if (imageUrls.length > 0) {
      await deleteStorageFilesByUrls(imageUrls);
    }

    await prisma.boardPost.delete({
      where: { id: trimmedPostId },
    });
    revalidatePath("/mypage");
    revalidatePath("/boards");
    revalidatePath("/", "layout");
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    console.error("[deleteBoardPost] Database error:", err);
    return { success: false, error: "削除に失敗しました。" };
  }
}
