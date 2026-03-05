import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { deleteNotebookEntryImagesFromStorage } from "@/lib/firebase/admin";
import { verifyAdminFromRequest } from "../../verify-admin";

/**
 * 管理者によるカスタム手帳エントリ削除。Firestore と Storage の画像を削除する。
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const verified = await verifyAdminFromRequest(_request);
  if (verified instanceof NextResponse) return verified;

  const { id: entryId } = await params;
  if (!entryId?.trim()) {
    return NextResponse.json({ error: "IDが必要です。" }, { status: 400 });
  }

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  try {
    const ref = db.collection("gear_notebook_entries").doc(entryId);
    const snap = await ref.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "該当のカスタム手帳が見つかりません。" }, { status: 404 });
    }
    const user_id = (snap.data()?.user_id as string) ?? "";
    await deleteNotebookEntryImagesFromStorage(user_id, entryId);
    await ref.delete();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[admin notebook-entries DELETE]", err);
    return NextResponse.json({ error: "削除に失敗しました。" }, { status: 500 });
  }
}
