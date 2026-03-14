"use server";

import { revalidatePath } from "next/cache";
import { getAdminAuth, deleteStorageFilesByUrls } from "@/lib/firebase/admin";
import { prisma } from "@/lib/prisma";

export type SaveBoardResult = { success: true; id: string } | { success: false; error: string };

export type BoardData = {
  id: string;
  name: string;
  thumbnail: string | null;
  actualPhotoUrl: string | null;
  nodes: unknown[];
  edges: unknown[];
};

/**
 * ID でボードを取得する。nodes と edges は JSON をパースした配列として返す。
 * 存在しない場合は null。
 */
export async function getBoardById(id: string): Promise<BoardData | null> {
  if (!id || typeof id !== "string" || !id.trim()) return null;
  try {
    const board = await prisma.board.findUnique({
      where: { id: id.trim() },
    });
    if (!board) return null;
    let nodes: unknown[] = [];
    let edges: unknown[] = [];
    try {
      if (board.nodes && typeof board.nodes === "string") {
        const parsed = JSON.parse(board.nodes) as unknown;
        nodes = Array.isArray(parsed) ? parsed : [];
      }
    } catch {
      nodes = [];
    }
    try {
      if (board.edges && typeof board.edges === "string") {
        const parsed = JSON.parse(board.edges) as unknown;
        edges = Array.isArray(parsed) ? parsed : [];
      }
    } catch {
      edges = [];
    }
    return {
      id: board.id,
      name: board.name ?? "名称未設定ボード",
      thumbnail: board.thumbnail ?? null,
      actualPhotoUrl: board.actualPhotoUrl ?? null,
      nodes,
      edges,
    };
  } catch (err) {
    console.error("[getBoardById]", err);
    return null;
  }
}

/**
 * エフェクターボードを保存する。
 * クライアントから Firebase ID トークンを渡し、サーバーで検証してユーザーを特定する。
 * thumbnail は Base64 data URL 等の文字列（任意）。キャンバスサムネイル用。
 * actualPhotoUrl は実機写真のURL（任意）。アップロード済み画像のパス。
 */
export async function saveBoard(
  boardId: string | undefined,
  name: string,
  nodes: unknown[],
  edges: unknown[],
  idToken: string,
  thumbnail?: string | null,
  actualPhotoUrl?: string | null
): Promise<SaveBoardResult> {
  const auth = getAdminAuth();
  if (!auth) {
    return { success: false, error: "サーバー設定エラー" };
  }

  let uid: string;
  try {
    const decoded = await auth.verifyIdToken(idToken);
    uid = decoded.uid;
  } catch (err) {
    console.error("[saveBoard] Token verification failed:", err);
    return { success: false, error: "認証に失敗しました。再度ログインしてください。" };
  }

  const nodesJson = JSON.stringify(nodes);
  const edgesJson = JSON.stringify(edges);
  const boardName = (name ?? "").trim() || "名称未設定ボード";

  try {
    const trimmedId = typeof boardId === "string" ? boardId.trim() : "";
    if (trimmedId) {
      const existing = await prisma.board.findFirst({
        where: { id: trimmedId, userId: uid },
      });
      if (!existing) {
        return { success: false, error: "指定されたボードが見つかりません。" };
      }
      await prisma.board.update({
        where: { id: trimmedId },
        data: {
          name: boardName,
          nodes: nodesJson,
          edges: edgesJson,
          thumbnail: thumbnail !== undefined ? thumbnail : undefined,
          actualPhotoUrl: actualPhotoUrl !== undefined ? actualPhotoUrl : undefined,
        },
      });
      revalidatePath("/mypage");
      revalidatePath("/boards");
      // サイト全体のキャッシュも明示的に破棄（トップやレイアウトに反映させるため）
      revalidatePath("/", "layout");
      return { success: true, id: trimmedId };
    } else {
      const board = await prisma.board.create({
        data: {
          userId: uid,
          name: boardName,
          nodes: nodesJson,
          edges: edgesJson,
          thumbnail: thumbnail !== undefined ? thumbnail : undefined,
          actualPhotoUrl: actualPhotoUrl !== undefined ? actualPhotoUrl : undefined,
        },
      });
      revalidatePath("/mypage");
      revalidatePath("/boards");
      // 新規作成時も同様に全体レイアウトを再検証
      revalidatePath("/", "layout");
      return { success: true, id: board.id };
    }
  } catch (err) {
    console.error("[saveBoard] Database error:", err);
    return { success: false, error: "保存に失敗しました。" };
  }
}

export type DeleteBoardResult = { success: true } | { success: false; error: string };

/**
 * エフェクターボードを削除する。本人のボードのみ削除可能。
 * 関連する実機写真・サムネイル画像（Firebase Storage）の削除も試みる。
 */
export async function deleteBoard(boardId: string, idToken: string): Promise<DeleteBoardResult> {
  const auth = getAdminAuth();
  if (!auth) {
    return { success: false, error: "サーバー設定エラー" };
  }

  let uid: string;
  try {
    const decoded = await auth.verifyIdToken(idToken);
    uid = decoded.uid;
  } catch (err) {
    console.error("[deleteBoard] Token verification failed:", err);
    return { success: false, error: "認証に失敗しました。再度ログインしてください。" };
  }

  const trimmedId = (boardId ?? "").trim();
  if (!trimmedId) {
    return { success: false, error: "ボードIDを指定してください。" };
  }

  try {
    // まず対象ボードを取得して、所有者チェックおよび画像URLを取得
    const existing = await prisma.board.findFirst({
      where: { id: trimmedId, userId: uid },
      select: {
        id: true,
        actualPhotoUrl: true,
        thumbnail: true,
      },
    });
    if (!existing) {
      return { success: false, error: "指定されたボードが見つからないか、削除する権限がありません。" };
    }

    // 実機写真・サムネイルの Storage ファイル削除を試みる（失敗してもボード削除は続行）
    const urlsToDelete: string[] = [];
    const actual = existing.actualPhotoUrl?.trim();
    const thumb = existing.thumbnail?.trim();
    if (actual) urlsToDelete.push(actual);
    if (thumb) urlsToDelete.push(thumb);
    if (urlsToDelete.length > 0) {
      try {
        await deleteStorageFilesByUrls(urlsToDelete);
      } catch (err) {
        console.warn("[deleteBoard] deleteStorageFilesByUrls failed (continuing with DB delete)", err);
      }
    }

    await prisma.board.delete({
      where: { id: existing.id },
    });
    revalidatePath("/mypage");
    return { success: true };
  } catch (err) {
    console.error("[deleteBoard] Database error:", err);
    return { success: false, error: "削除に失敗しました。" };
  }
}

export type UpdateBoardOrderResult = { success: true } | { success: false; error: string };

/**
 * ボードの並び順を更新する。boardIds の並び順で sortOrder を 0, 1, 2... に設定する。本人のボードのみ。
 */
export async function updateBoardOrder(
  boardIds: string[],
  idToken: string
): Promise<UpdateBoardOrderResult> {
  const auth = getAdminAuth();
  if (!auth) {
    return { success: false, error: "サーバー設定エラー" };
  }

  let uid: string;
  try {
    const decoded = await auth.verifyIdToken(idToken);
    uid = decoded.uid;
  } catch (err) {
    console.error("[updateBoardOrder] Token verification failed:", err);
    return { success: false, error: "認証に失敗しました。再度ログインしてください。" };
  }

  if (!Array.isArray(boardIds) || boardIds.length === 0) {
    return { success: true };
  }

  const trimmedIds = boardIds.filter((id): id is string => typeof id === "string" && id.trim() !== "").map((id) => id.trim());

  try {
    const owned = await prisma.board.findMany({
      where: { userId: uid, id: { in: trimmedIds } },
      select: { id: true },
    });
    const ownedIds = new Set(owned.map((b) => b.id));
    const entries: [string, number][] = trimmedIds
      .map((id, index) => [id, index] as [string, number])
      .filter(([id]) => ownedIds.has(id));
    const orderMap = new Map(entries);

    await prisma.$transaction(
      Array.from(orderMap.entries()).map(([id, sortOrder]) =>
        prisma.board.update({
          where: { id },
          data: { sortOrder },
        })
      )
    );
    revalidatePath("/mypage");
    return { success: true };
  } catch (err) {
    console.error("[updateBoardOrder] Database error:", err);
    return { success: false, error: "並び順の更新に失敗しました。" };
  }
}
